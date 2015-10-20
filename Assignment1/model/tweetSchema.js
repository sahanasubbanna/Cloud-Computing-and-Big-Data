"use strict";

const mongoose = require('mongoose');
const twit = require('twit');

let tweetSchema = new mongoose.Schema({
	internal_id: { type: Number, unique: true, required: true}, //autoincremented
	tweet_id: {type: Number, unique: true, required: true},
	twitterHandle: { type: String, unique: true, required: true}, 
	latLong: {type: Number, required: true},
	tags: [String]
});

let tweetCollection = mongoose.model('tweets', tweetSchema);

module.exports = { tweetSchema, tweetCollection };