"use strict";

//Node Server for Sentiment Processing

var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var keys = require('./config/access');
var tweetModel = require('./model/tweetSchema');
var path = require('path');
var AWS = require('aws-sdk');
var SQSConsumer = require('sqs-consumer');
var async = require('async');

var app = express();

app.set('port', process.env.PORT || 4001);

//Setting up middleware services
app.use(express.static('public'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

var server = http.createServer(app).listen(app.get('port'), function() {
    console.log("Worker started on port: " + app.get('port'));
});


function getTweetFromQueue() {
    var app = Consumer.create({
        queueUrl: keys.snsQueue.url,
        region: awsRegion,
        batchSize: 10,
        handleMessage: function(message, done) {
            var temp = JSON.stringify(message.Body);
            var msgBody = JSON.parse(temp);
            console.log('removed: ', msgBody);
            return msgBody;
        }
    });
}


function pushToDatabase(tweet, sentiment) {
    //Push the tweetID and sentiment into another table in dynamo DB
    var tweetSentimentObj = {
        tweet_id: tweet.tweet_id,
        sentiment: sentiment
    };

    var newTweetSentiment = new tweetModel.tweetSentimentCollection(tweetSentimentObj);
    newTweetSentiment.save(function(err) {
        if (err) {
            return console.log(err);
        }
        console.log('Sentiment saved to DB');
    });
}


function getTweetSentiment(tweet) {
    // Check the sentiment of the text and update the type of sentiment
    request.post('http://gateway-a.watsonplatform.net/calls/text/TextGetTextSentiment', {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        form: {
            apikey: (process.env.alchemySentimentAnalysisKey || keys.alchemyKeys.sentimentAnalysisKey),
            text: encodeURIComponent(tweet.text),
            outputMode: "json"
        },
        json: true
    }, function(err, res, resultBody) {
     var body = JSON.parse(JSON.stringify(resultBody));
        console.log("--------### BEGIN ###--------\n");
        console.log(body.docSentiment + " " + body.language);
        // console.log("--------Body:--------\n " + body);
        if (body && body!=null && body.docSentiment) {
         // console.log("Type from body: " + body.docSentiment.type);
            var sentimentType = body.docSentiment.type;
            // console.log("sentiment type from body: " + sentimentType);
        } else {
            var sentimentType = "NA";
        }
}

var topicArn = 'arn:aws:sns:us-east-1:039251014680:sentiment_analysis';
function publishToSNS(tweet) {
    var sns = AWS.SNS();
    sns.publish({
        TopicArn: topicArn,
        Message: JSON.stringify(tweet), 
    }, 
    function(err,data) {
        if (err){
            console.log("Error sending a message "+err);
        } else {
           console.log("Sent message: "+data.MessageId);
        }
    });
}

function processTweetTextForSentiment() {
    var tweet = getTweetFromQueue();

    var sentiment = "NA";
    sentiment = getTweetSentiment(tweet);

    pushToDatabase(tweet, sentiment);

    //Add the sentiment to the tweet and publish the tweet to the SNS topic
    tweet.sentiment = sentiment;

    publishToSNS(tweet);
}












 
// //Process the SQS queue contents
// server.route({
//     method: 'POST',
//     path: '/hi',
//     handler: function (request, reply) {
//         var awsRegion = 'us-east-1';
//         AWS.config.update({
//             accessKeyId: (process.env.awsAccessKey || keys.awsKeys.accessKey),
//             secretAccessKey: (process.env.awsAccessKeySecret || keys.awsKeys.accessKeySecret),
//             region: awsRegion
//         });
//         sqs = new AWS.SQS();
     
//         server.log('response: ', request.payload.name);
//         server.log('Starting receive message.', '...a 200 response should be received.');
     
//         reply();
//     }
// });



//modify this
// "use strict";
// var appConf = require('./config/appConf');
// var AWS = require('aws-sdk');
// AWS.config.loadFromPath('./config/aws_config.json');
// var delay = 20 * 1000;
// var sqs = new AWS.SQS();
// var exec = require('child_process').exec;
// function readMessage() {
//   sqs.receiveMessage({
//     "QueueUrl": keys.snsQueue.url,
//     "MaxNumberOfMessages": 1,
//     "VisibilityTimeout": 30,
//     "WaitTimeSeconds": 20
//   }, function (err, data) {
//     var sqs_message_body;
//     if (data.Messages) 
//       && (typeof data.Messages[0] !== 'undefined' && typeof data.Messages[0].Body !== 'undefined')) {
//         //sqs msg body
//         sqs_message_body = JSON.parse(data.Messages[0].Body);
//         console.log(-------------------------------------------------------------------------------)
//         console.log(sqs_message_body);

//         //make call to nodejs handler in codeigniter
//         exec('php '+ appConf.CI_FC_PATH +'/index.php nodejs_handler make_contentq_call "'+ sqs_message_body.contentq_cat_id+'" "'+sqs_message_body.cnhq_cat_id+'" "'+sqs_message_body.network_id+'"',
//           function (error, stdout, stderr) {
//             if (error) {
//               // error handling 
//             }
//             if(stdout == 'Success'){
//               //delete message from queue
//               sqs.deleteMessage({
//                 "QueueUrl" : appConf.sqs_distribution_url,
//                 "ReceiptHandle" :data.Messages[0].ReceiptHandle
//               }, function(err, data){                
//               });
//             }
//             readMessage();                
//           });
//       }          
//     }        
//     readMessage();        
//   });
// }
// readMessage();


//Sample
