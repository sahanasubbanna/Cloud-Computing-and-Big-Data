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
const jade = require('jade');

let app = express();

app.set('port', process.env.PORT || 4000);

let dbURL = process.env.dbURL || database.url; 

//Setting up middleware services
app.use(express.static('public'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
// app.set('view engine', 'jade');

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

//Connect to DB
app.get('/', function(req, res){
	res.sendFile(path.join(__dirname, './views', 'index.html'));
	// res.render('index', { title: 'TweetsGeoMap' });
});


// Emit welcome message on connection
io.on('connection', function(socket) {
    // Use socket to communicate with this particular client only, sending it it's own id
    socket.emit('welcome', { message: 'Welcome!', id: socket.id });

    socket.on('i am client', console.log);
});


 //For the first time, Get the data from the database and populate it on the map.
io.on('connection', function(socket) {
    //Get the data from the database

    tweetModel.tweetCollection.scan().limit(3000).exec((err, tweets, lastKey) => {
    	for( let index = 0; index < tweets.length; index++ ) {
    		// console.log(index, tweets[index].twitterHandle);
			socket.emit('dbtweet', { tweet: tweets[index] });			
    	}


    	//Start the streaming
    	stream.on('tweet', function(tweet) {
		  	// console.log(tweet);
		  	if (tweet.coordinates != null) {
		  		let tweetObject = { 
			  		tweet_id: tweet.id_str, 
			  		twitterHandle: tweet.user.screen_name, 
			  		user_id: tweet.user.id_str,
			  		user_profile_img_url: tweet.user.profile_image_url,
			  		user_verified: tweet.user.verified, 
			  		text: tweet.text,
			  		latLong: tweet.coordinates.coordinates,
					tags: tweet.entities.hashtags,
					favorite_count: tweet.favorite_count,
					retweet_count: tweet.retweet_count,
					created_at: tweet.created_at,
					timestamp: tweet.timestamp_ms
				};

			  	let newTweet = new tweetModel.tweetCollection(tweetObject);

				newTweet.save(function (err) {
			  		if(err) { 
			  			return console.log(err); 
			  		}
			  		console.log('Ta-da! Saved to DB');
				});

		    	socket.emit('livetweet', { tweet: tweetObject});
	    	}
    	});
    });
});
