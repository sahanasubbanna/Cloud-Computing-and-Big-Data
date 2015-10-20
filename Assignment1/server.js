"use strict";

//Node Server for Twitter data streaming.

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const autoincrement = require('mongoose-auto-increment');
const twit = require('twit');
const twitterAccess = require('./config/access');
const database = require('./config/database');
const tweetModel = require('./model/tweetSchema');
const twitterStreamRoutes = require('./routes/twitterStreamRoutes');


let app = express();

app.set('port', process.env.PORT || 4000);

let dbURL = process.env.dbURL || database.url; 

//Setting up middleware services
app.use(logger('Tweets!!!'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));


//Connect to DB

app.use('/tweetsgeomap', twitterStreamRoutes);

var server = http.createServer(app).listen(app.get('port'), () => {
	console.log(`Tweet Server started on port: ${app.get('port')}`); 
});


