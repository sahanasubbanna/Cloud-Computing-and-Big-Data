"use strict";

//Node Server for Twitter data streaming.

var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var twit = require('twit');
var keys = require('./config/access');
var database = require('./config/database');
var tweetModel = require('./model/tweetSchema');
var twitterStreamRoutes = require('./routes/twitterStreamRoutes');
var path = require('path');

var app = express();

app.set('port', process.env.PORT || 4000);

var dbURL = process.env.dbURL || database.url; 

//Setting up middleware services
app.use(express.static('public'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

//app.use('/tweetsgeomap', twitterStreamRoutes);

var server = http.createServer(app).listen(app.get('port'), function() {
	console.log("Tweet Server started on port: " + app.get('port')); 
});

//Twitter
var T = new twit({
  consumer_key: (process.env.twitterConsumerKey || keys.twitterKeys.consumerKey),
  consumer_secret: (process.env.twitterConsumerSecret || keys.twitterKeys.consumerSecret),
  access_token: (process.env.twitterAccessToken || keys.twitterKeys.accessToken),
  access_token_secret: (process.env.twitterAccessTokenSecret || keys.twitterKeys.accessTokenSecret)
})

//Socket.io
var io = require('socket.io').listen(server);
var stream = T.stream('statuses/sample');


app.post('/search', function(req, res) {
	// console.log("Request object: " + req.body);
	var searchString = req.body.searchString;
	// console.log("searchString: " + searchString);
	T.get('search/tweets', { q: searchString, count: 300 }, function(err, data, response) {
  		return res.send(data);
  	});
});

//Render the page
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

    tweetModel.tweetCollection.scan().limit(1000).exec(function(err, tweets, lastKey) {
    	if (tweets != undefined) {
	    	for( var index = 0; index < tweets.length; index++ ) {
	    		// console.log(index, tweets[index].twitterHandle);
				socket.emit('dbtweet', { tweet: tweets[index] });			
	    	}


	    	//Start the streaming
	    	stream.on('tweet', function(tweet) {
			  	// console.log(tweet);
			  	if (tweet.coordinates != null) {
			  		var tweetObject = { 
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

				  	var newTweet = new tweetModel.tweetCollection(tweetObject);

					newTweet.save(function (err) {
				  		if(err) { 
				  			return console.log(err); 
				  		}
				  		console.log('Ta-da! Saved to DB');
					});

			    	socket.emit('livetweet', { tweet: tweetObject});
		    	}
	    	});
	    }
	});
});
