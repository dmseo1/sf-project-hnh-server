const express = require('express');
const crypto = require('crypto');
const pg = require('pg');

const router = express.Router();
const client = require('../dbconn.js');

const publishToken = () => {
    return crypto.randomBytes(32).toString('hex'); 
}

//메인
router.get('/', (req, res) => {
    res.send("<html><body><h2>Hello!</h2><h3>This is a RestAPI server for Home-in-Hand App.</h3></body></html>")
});



//로그인
router.post('/login', async (req, res) => {
    console.log("REQUEST URL: /login, METHOD: POST");
    client.connect(async (err) => {
    client.query(`SELECT * FROM users WHERE id=$1`, [req.body.id],
        async (e, r) => {
            if(e) {
                await res.send(`{"response": "QUERY-FAILED", "data": "쿼리 실패"}`);
            } else {
                if(typeof r.rows[0] == 'undefined') {
                    await res.send(`{"response": "FAILED-ID", "data": "아이디가 존재하지 않음"}`);
                } else if(req.body.password != r.rows[0].password) {
                    await res.send(`{"response": "FAILED-PW", "data": "비밀번호가 일치하지 않음"}`);
                } else {
                   
                    await res.send(`{"response": "OK", "data": {"id": "${r.rows[0].id}", "nickname": "${r.rows[0].nickname}", "email": "${r.rows[0].email}"}}`);
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
                if(e) {
                    await res.send(`{"response": "QUERY-FAILED", "data": "쿼리 실패"}`);
                } else {
                    if(typeof r.rows[0] == 'undefined') {
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
                if(e) {
                    await res.send(`{"response": "QUERY-FAILED", "data": "쿼리 실패"}`);
                } else {
                    if(typeof r.rows[0] == 'undefined') {
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
    console.log("REQUEST URL: /join, METHOD: POST");
    client.connect(async (err) => {
    client.query('INSERT INTO users(id, nickname, password, email) VALUES($1, $2, $3, $4)',
        [req.body.id, req.body.nickname, req.body.password, req.body.email], 
        async (e, r) => {
            if(e) {
                console.log(e);
                await res.send(`{"response": "ERROR", "data": "회원정보 저장에 실패함"}`);
            } else {
                await res.send(`{"response": "OK", "data": {"id": "${req.body.id}", "nickname": "${req.body.nickname}", "email": "${req.body.email}"}}`);
            }
        });
    });
});



//test
router.get('/hello', async (req, res) => {
    console.log("REQUEST URL: /hello, METHOD: POST");
    client.connect((err) => {
        client.query(`SELECT * FROM fruits`, async (e, r) => {
            if(e) {
                console.log(e.stack);
            } else {
               await res.json(r.rows);
            }
        });
    });
});

module.exports = router;