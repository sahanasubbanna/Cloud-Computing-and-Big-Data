"use strict";

//Using dynamoose for AWS dynamoDB
let dynamoose = require('dynamoose');
let keys = require('./../config/access');


dynamoose.AWS.config.update({
  accessKeyId: keys.awsKeys.accessKey,
  secretAccessKey: keys.awsKeys.accessKeySecret,
  region: 'us-east-1'
});


let tweetSchema = new dynamoose.Schema({
	// internal_id: { 
	// 	type: Number, 
	// 	unique: true, 
	// 	required: true, 
	// 	validate: function(v) { return v > 0; },
 //    	hashKey: true
 //    }, //autoincremented
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
	created_at: { type: String },
	timestamp: { type: String }
});


let options = {
  create: true, // Create table in DB, if it does not exist
  waitForActive: true, // Wait for table to be created before trying to use it
  waitForActiveTimeout: 180000 // wait 3 minutes for table to activate
}

let tweetCollection = dynamoose.model('tweets', tweetSchema, options);

module.exports = { tweetCollection, tweetSchema };



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