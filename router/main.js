require('dotenv').config();


const HttpRequest = require('../utils/HttpRequest.js');

const express = require('express');

//비밀번호, 토큰 생성
const generateToken = require('../utils/TokenGenerator.js');

//DB
const pg = require('pg');
const client = require('../dbconn.js');

//라우터
const router = express.Router();



//메인
router.get('/', (req, res) => {
    res.send("<html><body><h2>Hello!</h2><h3>This is a RestAPI server for Home-in-Hand App.</h3></body></html>")
});



//다이렉트 로그인
router.post('/login', async (req, res) => {
    console.log("REQUEST URL: /login, METHOD: POST");
    client.connect(async (err) => {
        client.query(`SELECT * FROM users WHERE id=$1`, [req.body.id],
            async (e, r) => {
                if (e) {
                    await res.send(`{"response": "QUERY-FAILED", "data": "쿼리 실패"}`);
                } else {
                    if (typeof r.rows[0] === 'undefined') {
                        await res.send(`{"response": "FAILED-ID", "data": "아이디가 존재하지 않음"}`);
                    } else if (req.body.password != r.rows[0].password) {
                        await res.send(`{"response": "FAILED-PW", "data": "비밀번호가 일치하지 않음"}`);
                    } else { //성공
                        //토큰 저장
                        const id = r.rows[0].id;
                        const nickname = r.rows[0].nickname;
                        const email = r.rows[0].email;
                        const token = generateToken();
                        console.log(`token: ${token}`);
                        await client.query(`INSERT INTO tokens(user_id, device_info, token) VALUES($1, $2, $3)`,
                            [req.body.id, req.body.deviceInfo, token],
                            async (e, r) => {
                                if (e) {
                                    //토큰 저장 실패시
                                    await res.send(`{"response": "FAILED-TOKEN", "data": "토큰 생성 실패"}`);
                                } else {
                                    //성공 메시지 전송
                                    await res.send(`{"response": "OK", "data": {"id": "${id}", "nickname": "${nickname}", "email": "${email}", "token": "${token}"}}`);
                                }
                            });
                    }
                }
            });
    });
});

//구글 로그인
router.post('/login/google', async (req, res) => {
    console.log("REQUEST URL: /login/google, METHOD: POST");
    client.connect(async (err) => {
        //토큰 저장
        const id = req.body.id;
        const nickname = req.body.nickname;
        const email = req.body.email;
        const token = generateToken();
        console.log(`token: ${token}`);
        await client.query(`INSERT INTO tokens(user_id, device_info, token, provider) VALUES($1, $2, $3, $4)`,
            [req.body.id, req.body.deviceInfo, token, req.body.provider],
            async (e, r) => {
                if (e) {
                    //토큰 저장 실패시
                    await res.send(`{"response" : "FAILED-TOKEN", "data": "토큰 생성 실패"}`);
                } else {
                    //성공 메시지 전송
                    client.query(`SELECT * FROM users WHERE id=$1`, [req.body.id],
                        async (e, r) => {
                            if (e) {
                                await res.send(`{"response": "QUERY-FAILED", "data": "쿼리 실패"}`);
                            } else {
                                if (typeof r.rows[0] === 'undefined') {
                                    //계정을 등록하고 로그인 완료 처리
                                    await client.query(`INSERT INTO users(id, nickname, password, email, provider) VALUES($1, $2, $3, $4, $5)`,
                                    [id, nickname, generateToken(20), email, req.body.provider],
                                    async (e, r) => {
                                        if(e) {
                                            console.log(e);
                                            await res.send(`{"response": "FAILED-JOIN", "data": "계정 등록 실패"}`);
                                        } else {
                                            await res.send(`{"response": "OK", "data": {"id": "${id}", "nickname": "${nickname}", "email": "${email}", "token": "${token}"}}`);
                                        }
                                    });
                                } else {
                                    //바로 로그인 완료 처리
                                    await res.send(`{"response": "OK", "data": {"id": "${id}", "nickname": "${nickname}", "email": "${email}", "token": "${token}"}}`);
                                }
                            }
                    });
                }
         });
        
    });
});

//네이버 로그인
router.post('/login/naver', async (req, res) => {
    console.log("REQUEST URL: /login/naver, METHOD: POST");
    const resMain = res;
    const request = require('request');
    const accessURL = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${process.env.NAVER_LOGIN_CLIENT_ID}&client_secret=${process.env.NAVER_LOGIN_CLIENT_SECRET}&redirect_uri=${process.env.NAVER_LOGIN_TOKEN_REDIRECTION}&code=${req.body.code}&state='RANDOM_STATE'`;
    const options = {
        url: accessURL,
        headers: {'X-Naver-Client-Id':process.env.NAVER_LOGIN_CLIENT_ID, 'X-Naver-Client-Secret': process.env.NAVER_LOGIN_CLIENT_SECRET}
     };
    //네이버 토큰 받아오기
    request.get(options, async (err, res, body) => {
        console.log(body);
        const token = JSON.parse(body).access_token;

        //토큰을 받아올 수 없는 상황(비정상적인 접속 등으로 발생)
        if(typeof token === 'undefined') {
            await resMain.send(`{"response": "FAILED-NAVER-TOKEN", "data": "네이버 토큰 생성 실패"}`);
        }

        const userInfoRequest = require('request');
        const userInfoURL = 'https://openapi.naver.com/v1/nid/me';
        const userInfoOptions = {
            url: userInfoURL,
            headers: { 'Authorization': `Bearer ${token}`}
        };
        //토큰을 이용하여 계정 정보 받아오기
        userInfoRequest.get(userInfoOptions, async (err, res, body) => {
            console.log(body);
            //유효 요청인지 확인
            console.log(JSON.parse(body).resultcode);
            if(JSON.parse(body).resultcode !== "00") {
                await resMain.send(`{"response": "FAILED-AUTH", "data": "네이버 토큰 인증 실패"}`);
                return;
            }

            //토큰 생성 및 저장
            const userInfo = JSON.parse(body).response;
            const id = userInfo.id;
            const nickname = userInfo.nickname;
            const email = userInfo.email;
            const token = generateToken();
            client.connect(async (err) => {
                client.query(`INSERT INTO tokens(user_id, device_info, token, provider) VALUES($1, $2, $3, $4)`,
                [id, req.body.deviceInfo, token, 'naver'],
                async (e, r) => {
                    
                    if(e) {
                        console.log(e);
                        await resMain.send(`{"response": "FAILED-TOKEN", "data": "토큰 생성 실패"}`);
                    } else {
                        //이미 저장된 아이디인지 검사
                        client.query(`SELECT id FROM users WHERE id=$1 AND provider=$2`, [id, 'naver'],
                        async (e, r) => {
                            if(e) {
                                console.log(e);
                                await resMain.send(`{"response": "FAILED-ACCOUNT", "data": "계정 조회 실패"}`);
                            } else {
                                if(typeof r.rows[0] === 'undefined') {
                                    //계정 등록
                                    client.query(`INSERT INTO users(id, password, nickname, email, provider) VALUES($1, $2, $3, $4, $5)`,
                                    [id, generateToken(20), nickname, email, 'naver'],
                                    async (e, r) => {
                                        if(e) {
                                            console.log(e);
                                            await resMain.send(`{"response": "FAILED-JOIN", "data": "계정 생성 실패"}`);
                                        } else {
                                            await resMain.send(`{"response": "OK", "data": {"id": "${id}", "nickname": "${nickname}", "email": "${email}", "token": "${token}"}}`);
                                        }
                                    });
                                } else {
                                    //로그인 처리를 위한 정보 발송
                                    await resMain.send(`{"response": "OK", "data": {"id": "${id}", "nickname": "${nickname}", "email": "${email}", "token": "${token}"}}`);
                                }
                            }
                        });
                    }
                    

                });
            });
        });
    });
});


//로그인 유효성 검사(토큰 체크)
router.post('/login_valid_check', async (req, res) => {
    console.log("REQUEST URL: /login_valid_check, METHOD: POST");
    client.connect(async (err) => {
        client.query('SELECT token FROM tokens WHERE user_id=$1 AND device_info=$2 AND provider=$3 ORDER BY no DESC LIMIT 1', [req.body.id, req.body.deviceInfo, req.body.provider],
            async (e, r) => {
                if (e) {
                    await res.send(`{"response": "QUERY-FAILED", "data": "쿼리 실패"}`);
                } else {
                    if (typeof r.rows[0] == 'undefined') {
                        await res.send(`{"response": "NO-TOKEN", "data": "토큰이 존재하지 않음"}`);
                        console.log("토큰X");
                    } else {
                        if (r.rows[0].token == req.body.token) {
                            await res.send(`{"response": "OK", "data": "정상적인 토큰"}`);
                            console.log("토큰O");
                        } else {
                            await res.send(`{"response": "INVALID-TOKEN", "data" : "유효하지 않은 토큰"}`);
                            console.log("토큰X");
                        }
                    }
                }
            });
    });
});




//회원가입 아이디 중복 체크
router.post('/join/id_dup_chk', async (req, res) => {
    console.log("REQUEST URL: /join/id_dup_chk, METHOD: POST");
    client.connect(async (err) => {
        client.query('SELECT id FROM users WHERE id=$1', [req.body.id],
            async (e, r) => {
                if (e) {
                    await res.send(`{"response": "QUERY-FAILED", "data": "쿼리 실패"}`);
                } else {
                    if (typeof r.rows[0] == 'undefined') {
                        await res.send(`{"response": "OK", "data": "중복되지 않은 아이디"}`);
                    } else {
                        await res.send(`{"response": "DUP", "data": "중복된 아이디"}`);
                    }
                }
            });
    });
});


//회원가입 이메일 중복 체크
router.post('/join/email_dup_chk', async (req, res) => {
    console.log("REQUEST URL: /join/email_dup_chk, METHOD: POST");
    client.connect(async (err) => {
        client.query('SELECT email FROM users WHERE email=$1', [req.body.email],
            async (e, r) => {
                if (e) {
                    await res.send(`{"response": "QUERY-FAILED", "data": "쿼리 실패"}`);
                } else {
                    if (typeof r.rows[0] == 'undefined') {
                        await res.send(`{"response": "OK", "data": "중복되지 않은 이메일"}`);
                    } else {
                        await res.send(`{"response": "DUP", "data": "중복된 이메일"}`);
                    }
                }
            });
    });
});


//회원가입 완료
router.post('/join/confirm', async (req, res) => {
    console.log("REQUEST URL: /join/confirm, METHOD: POST");
    client.connect(async (err) => {
        client.query('INSERT INTO users(id, nickname, password, email) VALUES($1, $2, $3, $4)',
            [req.body.id, req.body.nickname, req.body.password, req.body.email],
            async (e, r) => {
                if (e) {
                    console.log(e);
                    await res.send(`{"response": "ERROR", "data": "회원정보 저장에 실패함"}`);
                } else {
                    const token = generateToken();
                    client.query('INSERT INTO tokens(user_id, device_info, token) VALUES($1, $2, $3)',
                        [req.body.id, req.body.deviceInfo, token], async (e, r) => {
                            if (e) {
                                await res.send(`{"response": "FAILED-TOKEN", "data": "토큰 생성 실패"}`);
                            } else {
                                await res.send(`{"response": "OK", "data": {"id": "${req.body.id}", "nickname": "${req.body.nickname}", "email": "${req.body.email}", "token": "${token}"}}`);
                            }
                        });
                }
            });
    });
});



//test
router.get('/hello', async (req, res) => {
    console.log("REQUEST URL: /hello, METHOD: POST");
    client.connect((err) => {
        client.query(`SELECT * FROM fruits`, async (e, r) => {
            if (e) {
                console.log(e.stack);
            } else {
                await res.json(r.rows);
            }
        });
    });
});

module.exports = router;