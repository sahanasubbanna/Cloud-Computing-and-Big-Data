var sqsQueue = {
	// url: "https://sqs.us-east-1.amazonaws.com/039251014680/Tweets"
	url: "https://sqs.us-east-1.amazonaws.com/039251014680/Tweets"
};

//Keys for kirk/kirk123
var awsKeys = {
	accessKey: "AKIAJDFFUPB4XZFEA6EA",
	accessKeySecret: "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",
	awsRegion : 'us-east-1'
};

var alchemyKeys = {
	sentimentAnalysisKey: "472cf213e882977a3ce2fe83acc8b4d1b678bbe7"
	// sentimentAnalysisKey: "7389c7391c3ab05f316cec9e8b352ae7c11754e4"
	// sentimentAnalysisKey: "eea89fb4a23c5dc86245cfb58c7fe57378e846b0"
	//alchemySentimentAnalysisKey in env
}

module.exports = { sqsQueue: sqsQueue, awsKeys: awsKeys, alchemyKeys: alchemyKeys};