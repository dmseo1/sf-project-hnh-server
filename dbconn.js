const pg = require('pg');
require('dotenv').config();

console.log("DB 연결을 시도합니다.");

const client = new pg.Client({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PW,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT
});

module.exports = client;