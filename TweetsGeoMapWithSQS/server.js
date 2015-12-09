"use strict";

//Node Server for Twitter data streaming.

var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var twit = require('twit');
var keys = require('./config/access');
var tweetModel = require('./model/tweetSchema');
var path = require('path');
var request = require('request');
var AWS = require('aws-sdk');
var awsRegion = 'us-west-2';//'us-east-1';

AWS.config.update({
    accessKeyId: (process.env.awsAccessKey || keys.awsKeys.accessKey),
    secretAccessKey: (process.env.awsAccessKeySecret || keys.awsKeys.accessKeySecret),
    region: (process.env.awsRegion || 'us-west-2')
});

var app = express();

app.set('port', process.env.PORT || 4000);

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


app.use(function(req, res, next) {
    req.io = io;
    next();
});


//Render the page
app.get('/', function(req, res) {
    createSNSTopicAndSubscribe(req, res);
    res.sendFile(path.join(__dirname, './views', 'index.html'));
    // res.render('index', { title: 'TweetsGeoMap' });
});


var sns = new AWS.SNS();
var topicName = "sentiment_analysis";
var topicArn = null;
var subscriptionToken = null;
var sentimentAnalysisSubscriptionArn = null;

function createSNSTopicAndSubscribe(req, res) {
    var endpoint = req.protocol + '://' + req.get('host') + '/sentiment_analysis';
    console.log("endpoint: " + endpoint);
    var topicParams = {
      Name: topicName /* required */
    };

    sns.createTopic(topicParams, function(err, data) {
        if (err) {
            console.log(err, err.stack); // an error occurred
        }

        console.log(data);           // successful response
        topicArn = data.TopicArn;

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
            console.log("Subscribe req no error: ");
            console.log(data);
            //If a subscription urn was created without requiring confirmation, store that
            if (data.SubscriptionArn != "pending confirmation") {
                sentimentAnalysisSubscriptionArn = data.SubscriptionArn;
            }
          }
        });
    });
}


app.post('/sentiment_analysis', function(req, res) {
    console.log("\n\n------------ POST Called ------------");
    // console.log(req.headers);

    var amazonMsgType = req.headers['x-amz-sns-message-type'];

    if (amazonMsgType === "SubscriptionConfirmation") {
        console.log('=========SubscriptionConfirmation===========');
        console.log("MessageType: " + amazonMsgType);
        var bodyarr = [];
        req.on('data', function(chunk){
            bodyarr.push(chunk);
        });  
        req.on('end', function(){
            console.log(bodyarr);
            var subscription = bodyarr.join('');
            console.log('=========Req.end=========');
            // console.log(subscription);
            var subscriptionJSON = JSON.parse(subscription);
            // console.log(subscriptionJSON.Token);
            subscriptionToken = subscriptionJSON.Token;
            console.log("Subscription Token: " + subscriptionToken);

            var snsConfirmSubscriptionParams = {
                Token: subscriptionToken, /* required */
                TopicArn: topicArn, /* required */
            };

            sns.confirmSubscription(snsConfirmSubscriptionParams, function(err, data) {
                if (err) console.log(err, err.stack); // an error occurred
                else {
                    // console.log(data);           // successful response
                    sentimentAnalysisSubscriptionArn = data.SubscriptionArn;
                    console.log("SubscriptionArn: " + sentimentAnalysisSubscriptionArn);
                }
            }); 
        });
        return res.send("Done");
    }

    if (amazonMsgType === "Notification") {
        console.log('=========Notification=========');
        console.log("MessageType: " + amazonMsgType);
        var bodyarray = [];
        req.on('data', function(chunk){
            bodyarray.push(chunk);
        });  
        req.on('end', function(){
            var notificationMsg = bodyarray.join('');
            var notificationJSON = JSON.parse(notificationMsg);
            var tweet = JSON.parse(notificationJSON.Message);
            // console.log(tweet);

            //Save the tweet received in a DB
            var newTweet = new tweetModel.tweetCollection(tweet);
            newTweet.save(function(err) {
                if (err) {
                    return console.log(err);
                }
                console.log('Ta-da! Saved to DB');
            });


            var io = req.io; //io object stored on the req object

            io.emit('livetweet', {
                tweet: tweet
            });
        });
    }
});


var allSockets = [];

io.sockets.on('connection', function(socket) {

    //Add the open socket to the list of sockets currently open
    allSockets.push(socket);

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
    });


    socket.on('startStream', function() {
        //Start the streaming
        stream.on('tweet', function(tweet) {
            // console.log(tweet);
            if (tweet.coordinates != null) {
                var sentimentType = "NA";

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
                    sentiment: sentimentType,
                    created_at: tweet.created_at,
                    timestamp: tweet.timestamp_ms
                };

                //Earlier DB save was here

                //Send the tweet text to SQS for sentiment analysis
                setTimeout(sendSqsMessage(tweetObject), 2000);
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



function sendSqsMessage(tweet) {
  var sqs = new AWS.SQS();
 
  //Convert the object into string to send to queue
  var tweetString = JSON.stringify(tweet);
  var params = {
    MessageBody: tweetString,
    QueueUrl: keys.sqsQueue.url,
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



// var topicArn = 'arn:aws:sns:us-west-2:039251014680:sentiment_analysis';
// var endpoint = 'http://tweetsgeomapwithsqs.elasticbeanstalk.com/sentiment_analysis';
// var endpoint = "http://b7c09395.ngrok.io/sentiment_analysis";

//Save to DB
// var newTweet = new tweetModel.tweetCollection(tweetObject);
// newTweet.save(function(err) {
//     if (err) {
//         return console.log(err);
//     }
//     console.log('Ta-da! Saved to DB');
// });
