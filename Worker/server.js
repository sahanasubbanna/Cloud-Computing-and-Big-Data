"use strict";

//Node Server for Sentiment Processing
var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var keys = require('./config/access');
var path = require('path');
var AWS = require('aws-sdk');
var SQSConsumer = require('sqs-consumer');
var async = require('async');
var request = require('request');

var app = express();

app.set('port', process.env.PORT || 4001);

//Setting up middleware services
app.use(express.static('public'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

AWS.config.update({
    accessKeyId: (process.env.awsAccessKey || keys.awsKeys.accessKey),
    secretAccessKey: (process.env.awsAccessKeySecret || keys.awsKeys.accessKeySecret),
    region: (process.env.awsRegion || 'us-west-2')
});

var server = http.createServer(app).listen(app.get('port'), function() {
    console.log("Worker started on port: " + app.get('port'));
});

var globalTweetObject = null;
function getTweetFromQueue() {
    var consumer = SQSConsumer.create({
        queueUrl: keys.sqsQueue.url,
        handleMessage: function(message, done) {
            var msgBody = JSON.parse(message.Body);

            setTimeout(getTweetSentiment(msgBody), 2000);

            done();
        }
    });

    consumer.start();
}


function getTweetSentiment(tweet) {
    // Check the sentiment of the text and update the type of sentiment

    globalTweetObject = tweet;
    // console.log(globalTweetObject);

    var form = {
        apikey: (process.env.alchemySentimentAnalysisKey || keys.alchemyKeys.sentimentAnalysisKey),
        text: encodeURIComponent(tweet.text),
        outputMode: "json"
    };
    var headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    request.post('http://gateway-a.watsonplatform.net/calls/text/TextGetTextSentiment', {
        headers: headers,
        form: form,
        json: true
    }, function(err, res, resultBody) {
        var body = JSON.parse(JSON.stringify(resultBody));
        if (body && body!=null && body.docSentiment) {
            var sentimentType = body.docSentiment.type;
        } else {
            var sentimentType = "NA";
        }

        // console.log(sentimentType);

        globalTweetObject.sentiment = sentimentType;

        console.log("Publishing to SNS:" );
        // console.log(globalTweetObject);
        console.log("-----------------------\n\n");

        publishToSNS(globalTweetObject);
    });
}

var topicArn = "arn:aws:sns:us-west-2:039251014680:sentiment_analysis";
function publishToSNS(tweet) {
    console.log("=====Inside publishToSNS=====");
    // console.log(tweet);

    var tweetAsString = JSON.stringify(tweet);

    var sns = new AWS.SNS();
    sns.publish({
        Message: tweetAsString,
        TopicArn: topicArn
    }, 
    function(err,data) {
        if (err){
            console.log("Error sending a message "+err);
        } else {
           console.log("Sent message: "+data.MessageId);
        }
    });
}


getTweetFromQueue();











 
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





// "use strict";

// //Node Server for Twitter data streaming.

// var http = require('http');
// var express = require('express');
// var bodyParser = require('body-parser');
// var logger = require('morgan');
// var path = require('path');
// var app = express();
// var xmlparser = require('express-xml-bodyparser');

// app.set('port', process.env.PORT || 5000);


// var xml2jsDefaults = {
//     explicitArray: false,
//     normalize: false,
//     normalizeTags: false,
//     trim: true
// }

// //Setting up middleware services
// app.use(express.static('public'));
// app.use(logger('dev'));
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({
//     extended: false
// }));
// app.use(xmlparser(xml2jsDefaults));


// app.get('/', function (req, res) {
//     return res.send('Evvvvil');
// });

// app.post('/ohcrap', function(req, res) {
//     var bodyarr = [];
//     req.on('data', function(chunk){
//       bodyarr.push(chunk);
//     });  
//     req.on('end', function(){
//       var subscription = bodyarr.join('');
//       var subscriptionJSON = JSON.parse(subscription);
//       // console.log(subscriptionJSON.Token);
//       subscriptionToken = subscriptionJSON.Token;
//     });  
//     return res.send('Done');
// });

// var server = http.createServer(app).listen(app.get('port'), function() {
//     console.log("Tweet Server started on port: " + app.get('port'));
// });