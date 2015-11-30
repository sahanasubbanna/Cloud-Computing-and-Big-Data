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
var request = require('request');
var AWS = require('aws-sdk');

AWS.config.update({
    accessKeyId: (process.env.awsAccessKey || keys.awsKeys.accessKey),
    secretAccessKey: (process.env.awsAccessKeySecret || keys.awsKeys.accessKeySecret),
    region: (process.env.awsRegion || 'us-east-1')
});

var app = express();

app.set('port', process.env.PORT || 4000);

var dbURL = process.env.dbURL || database.url;

//Setting up middleware services
app.use(express.static('public'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

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
var globalSocket;

//Render the page
app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, './views', 'index.html'));
    // res.render('index', { title: 'TweetsGeoMap' });
});

var subscriptionToken;
app.post('/sentiment_analysis', function(err, data) {
    var bodyarr = [];
    req.on('data', function(chunk){
      bodyarr.push(chunk);
    });  
    req.on('end', function(){
      var subscription = bodyarr.join('');
      var subscriptionJSON = JSON.parse(subscription);
      // console.log(subscriptionJSON.Token);
      subscriptionToken = subscriptionJSON.Token;
    });  
    return res.send('Done');
});

var sockets = [];


io.sockets.on('connection', function(socket) {

    //Add the open socket to the list of sockets currently open
    sockets.push(socket);

    // Use socket to communicate with this particular client only, sending it it's own id
    socket.emit('welcome', {
        message: 'Welcome!',
        id: socket.id
    });

    socket.on('i am client', function(data) {
        console.log(data);
        //Get the data from the database
        tweetModel.tweetCollection.scan().limit(1000).exec(function(err, tweets, lastKey) {
            if (tweets != undefined) {
                for (var index = 0; index < tweets.length; index++) {
                    //Emit the db tweets to all the clients.
                    io.emit('dbtweet', {
                        tweet: tweets[index]
                    });
                }
            }
        });

        socket.emit('dbDone', {});
    });


    socket.on('startStream', function() {
        //Start the streaming
        stream.on('tweet', function(tweet) {
            // console.log(tweet);
            if (tweet.coordinates != null) {
                // Check the sentiment of the text and update the type of sentiment
                // request.post('http://gateway-a.watsonplatform.net/calls/text/TextGetTextSentiment', {
                //     headers: {
                //         'Content-Type': 'application/x-www-form-urlencoded'
                //     },
                //     form: {
                //         apikey: (process.env.alchemySentimentAnalysisKey || keys.alchemyKeys.sentimentAnalysisKey),
                //         text: encodeURIComponent(tweet.text),
                //         outputMode: "json"
                //     },
                //     json: true
                // }, function(err, res, resultBody) {
                // 	var body = JSON.parse(JSON.stringify(resultBody));
                //     // console.log("--------### BEGIN ###--------\n");
                //     // console.log(body.docSentiment + " " + body.language);
                //     // console.log("--------Body:--------\n " + body);
                //     if (body && body!=null && body.docSentiment) {
                //     	// console.log("Type from body: " + body.docSentiment.type);
                //         var sentimentType = body.docSentiment.type;
                //         // console.log("sentiment type from body: " + sentimentType);
                //     } else {
                //         var sentimentType = "NA";
                //     }

                    //Send the tweet text to SQS for sentiment analysis
                    sendSqsMessage(tweet.text);


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
                        // sentiment: sentimentType,
                        created_at: tweet.created_at,
                        timestamp: tweet.timestamp_ms
                    };

                    socket.emit('livetweet', {
                        tweet: tweetObject
                    });

                    // console.log("Tweet sentiment: " + tweetObject.sentiment);

                    var newTweet = new tweetModel.tweetCollection(tweetObject);
                    newTweet.save(function(err) {
                        if (err) {
                            return console.log(err);
                        }
                        console.log('Ta-da! Saved to DB');
                    });

                    //https: //gateway-a.watsonplatform.net/calls/text/TextGetTextSentiment
            }
        });
    });


    socket.on('search', function(query) {
        var searchString = query.searchString;
        var origSearchString = query.origSearchString;
        T.get('search/tweets', {
            q: searchString,
            count: 100
        }, function(err, data, response) {
            // console.log("============= SearchData Length: " + data.statuses.length);
            socket.emit('searchResults', {
                searchString: searchString,
                origSearchString: origSearchString,
                data: data
            });
        });
    });



});



function sendSqsMessage(TweetTextForSentimentAnalysis) {
  'use strict';
 
  var awsRegion = 'us-east-1';
  AWS.config.update({
    accessKeyId: (process.env.awsAccessKey || keys.awsKeys.accessKey),
    secretAccessKey: (process.env.awsAccessKeySecret || keys.awsKeys.accessKeySecret),
    region: awsRegion
  });
  var sqs = new AWS.SQS();
 
  var params = {
    MessageBody: TweetTextForSentimentAnalysis,
    QueueUrl: keys.snsQueue.url,
    DelaySeconds: 0
  };
 
  sqs.sendMessage(params, function (err, data) {
    if (err) {
      console.log(err, err.stack);
    } // an error occurred
    else {
      console.log("Victory, message sent!");
    };
  });
}




var sentimentAnalysisSubscriptionArn = null;
var sns = new AWS.SNS();
var topicArn = 'arn:aws:sns:us-east-1:039251014680:sentiment_analysis';
var endpoint = 'http://tweetsgeomapwithsqs.elasticbeanstalk.com/sentiment_analysis';

//Subscribe to the SNS topic for tweetSentiments
var snsSubscribeParams = {
  Protocol: 'http', /* required */
  TopicArn: topicArn, /* required */
  Endpoint: endpoint
};

sns.subscribe(snsSubscribeParams, function(err, data) {
  if (err) {
    console.log("Subscribe");
    console.log(err, err.stack); // an error occurred
  }
  else {
    console.log(data);
    //If a subscription urn was created without requiring confirmation, store that
    if (data.SubscriptionArn != 'pending confirmation') {
        sentimentAnalysisSubscriptionArn = data.SubscriptionArn;
    }
  } 
});

var snsConfirmSubscriptionParams = {
  Token: subscriptionToken, /* required */
  TopicArn: topicArn, /* required */
};
sns.confirmSubscription(snsConfirmSubscriptionParams, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     console.log(data);           // successful response
});



