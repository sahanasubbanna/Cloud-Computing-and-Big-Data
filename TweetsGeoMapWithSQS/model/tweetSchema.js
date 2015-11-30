"use strict";

//Using dynamoose for AWS dynamoDB
var dynamoose = require('dynamoose');
var keys = require('./../config/access');


dynamoose.AWS.config.update({
  accessKeyId: (process.env.awsAccessKey || keys.awsKeys.accessKey),
  secretAccessKey: (process.env.awsAccessKeySecret || keys.awsKeys.accessKeySecret),
  region: (process.env.awsRegion || 'us-east-1')
});


var tweetSchema = new dynamoose.Schema({
	tweet_id: { type: String, unique: true, required: true, hashKey: true },
	twitterHandle: { type: String, required: true}, 
	user_id: { type: String },
	user_profile_img_url: { type: String },
	user_verified: { type: Boolean },
	text: { type: String },
	latLong: { type: [Number], required: true },
	tags: [Object],
	favorite_count: { type: Number },
	retweet_count: { type: Number },
	sentiment: { type: String },
	created_at: { type: String },
	timestamp: { type: String }
});

var tweetSentimentSchema = new dynamoose.Schema({
	tweet_id: { type: String, unique: true, required: true, hashKey: true },
	sentiment: { type: String, required: true }
});


var options = {
  create: true, // Create table in DB, if it does not exist
  waitForActive: true, // Wait for table to be created before trying to use it
  waitForActiveTimeout: 180000 // wait 3 minutes for table to activate
}

var tweetCollection = dynamoose.model('tweetsDB', tweetSchema, options);
var tweetSentimentCollection = dynamoose.model('tweetSentimentDB', tweetSentimentSchema, options);

module.exports = { tweetCollection: tweetCollection, tweetSchema: tweetSchema, tweetSentimentCollection: tweetSentimentCollection };



//------------------------------------------------------------------------------------------
//Using Mongoose
// const mongoose = require('mongoose');
// const twit = require('twit');

// let tweetSchema = new mongoose.Schema({
// 	internal_id: { type: Number, unique: true, required: true}, //autoincremented
// 	tweet_id: {type: Number, unique: true, required: true},
// 	twitterHandle: { type: String, unique: true, required: true}, 
// 	latLong: {type: Number, required: true},
// 	tags: [String]
// });

// let tweetCollection = mongoose.model('tweets', tweetSchema);

// module.exports = { tweetSchema, tweetCollection };
//-----------------------------------------------------------------------------------------
