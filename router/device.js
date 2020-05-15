require('dotenv').config();

const express = require('express');
const router = express.Router();

//DB
const pg = require('pg');
const client = require('../dbconn.js');


//메인
router.get('/info/:raspSerial', (req, res) => {
    
    req.params.raspSerial
});







module.exports = router;