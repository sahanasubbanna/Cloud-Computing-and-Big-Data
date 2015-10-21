"use strict";

//Node Server for Twitter data streaming.

const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const mongoose = require('mongoose');
const autoincrement = require('mongoose-auto-increment');
const twit = require('twit');
const keys = require('./config/access');
const database = require('./config/database');
const tweetModel = require('./model/tweetSchema');
const twitterStreamRoutes = require('./routes/twitterStreamRoutes');
const path = require('path');

let app = express();

app.set('port', process.env.PORT || 4000);

let dbURL = process.env.dbURL || database.url; 

//Setting up middleware services
app.use(logger('Tweets!!!'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//app.use('/tweetsgeomap', twitterStreamRoutes);

var server = http.createServer(app).listen(app.get('port'), () => {
	console.log(`Tweet Server started on port: ${app.get('port')}`); 
});

//Twitter
var T = new twit({
  consumer_key: keys.twitterKeys.consumerKey,
  consumer_secret: keys.twitterKeys.consumerSecret,
  access_token: keys.twitterKeys.accessToken,
  access_token_secret: keys.twitterKeys.accessTokenSecret
})

//Socket.io
var io = require('socket.io').listen(server);
var stream = T.stream('statuses/sample');

io.on('connection', function (socket) {
  stream.on('tweet', function(tweet) {
  	// console.log(tweet);
    socket.emit('info', { tweet: tweet});
  });
});



//Connect to DB
app.get('/', function(req, res){
	res.sendFile(path.join(__dirname, './views', 'index.html'));
});

// // Send current time to all connected clients
// function sendTime() {
//     io.emit('time', { time: new Date().toJSON() });
// }

// Send current time every 10 secs
// setInterval(sendTime, 10000);

// Emit welcome message on connection
io.on('connection', function(socket) {
    // Use socket to communicate with this particular client only, sending it it's own id
    socket.emit('welcome', { message: 'Welcome!', id: socket.id });

    socket.on('i am client', console.log);
});
