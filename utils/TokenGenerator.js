//토큰 생성 유틸

const randomString = require('crypto-random-string');

const generateToken = (length = 64) => {
    return randomString({length : length, type : 'base64'});
}

module.exports = generateToken;