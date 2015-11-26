"use strict";

//Node Server for Sentiment Processing

var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var logger = require('morgan');
var keys = require('./config/access');
var path = require('path');
var AWS = require('aws-sdk');

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


//Process the SQS queue contents
server.route({
    method: 'POST',
    path: '/hi',
    handler: function (request, reply) {
        var awsRegion = 'us-east-1';
        AWS.config.update({
            accessKeyId: (process.env.awsAccessKey || keys.awsKeys.accessKey),
            secretAccessKey: (process.env.awsAccessKeySecret || keys.awsKeys.accessKeySecret),
            region: awsRegion
        });
        sqs = new AWS.SQS();
     
        server.log('response: ', request.payload.name);
        server.log('Starting receive message.', '...a 200 response should be received.');
     
        reply();
    }
});



//modify this
"use strict";
var appConf = require('./config/appConf');
var AWS = require('aws-sdk');
AWS.config.loadFromPath('./config/aws_config.json');
var delay = 20 * 1000;
var sqs = new AWS.SQS();
var exec = require('child_process').exec;
function readMessage() {
  sqs.receiveMessage({
    "QueueUrl": appConf.sqs_distribution_url,
    "MaxNumberOfMessages": 1,
    "VisibilityTimeout": 30,
    "WaitTimeSeconds": 20
  }, function (err, data) {
    var sqs_message_body;
    if (data.Messages) 
      && (typeof data.Messages[0] !== 'undefined' && typeof data.Messages[0].Body !== 'undefined')) {
        //sqs msg body
        sqs_message_body = JSON.parse(data.Messages[0].Body);
        //make call to nodejs handler in codeigniter
        exec('php '+ appConf.CI_FC_PATH +'/index.php nodejs_handler make_contentq_call "'+ sqs_message_body.contentq_cat_id+'" "'+sqs_message_body.cnhq_cat_id+'" "'+sqs_message_body.network_id+'"',
          function (error, stdout, stderr) {
            if (error) {
              // error handling 
            }
            if(stdout == 'Success'){
              //delete message from queue
              sqs.deleteMessage({
                "QueueUrl" : appConf.sqs_distribution_url,
                "ReceiptHandle" :data.Messages[0].ReceiptHandle
              }, function(err, data){                
              });
            }
            readMessage();                
          });
      }          
    }        
    readMessage();        
  });
}
readMessage();