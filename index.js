const app = require('express')();
const bodyParser = require('body-parser');

require('dotenv').config();

client = require('./dbconn.js');

app.use(require('cors')());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}))
app.use('/', require('./router/main.js'));

app.listen(process.env.DEV_PORT, () => {
    console.log(`Server is listening on port ${process.env.DEV_PORT}\nhttp://13.124.29.106:${process.env.DEV_PORT}/`)
});
