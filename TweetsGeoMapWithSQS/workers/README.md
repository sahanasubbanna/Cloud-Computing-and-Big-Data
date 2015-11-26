Sahana Subbanna
ss4737

#Tweet Map
Assignment Objectives:
------------------------
1. Use the Amazon SQS service to create a processing queue for the Tweets that are delivered by the Twitter Streaming API
2. Use Amazon SNS service to update the status processing on each tweet so the UI can refresh.
3. Integrate a third party cloud service API into the Tweet processing flow.

Develop an application that:
----------------------------
1. Reads a stream of tweets from the Twitter Live API (Code provided). Note: you might follow a specific topic on the API or get the complete stream
2. Records the tweet ID, time, and other relevant elements into a DB (SQL or NoSQL) (2)
3. After the tweet is recorded in the DB send a message to the Queue for Asynchronous processing on the text of the tweet (3)
4. Presents the Tweet in a map that is being updated in Near Real Time (Consider evaluating WebSockets, or Server Side Events for your implementation)
5. The map clusters tweets as to show where is people tweeting the most, according to the sample tweets you get from the streaming API.
6. Define a worker pool that will pick up messages from the queue to process. These workers should each run on a separate pool thread.
7. Make a call to the sentiment API off your preference (e.g. Alchemy). This can return a positive or negative sentiment evaluation for the text of the submitted Tweet. (4)
8. As soon as the tweet is processed send a notification -using SNS- to an HTTP endpoint that will update the UI with the new information about the Tweet. (5)
9. Using this information your application should display the Tweet clusters and the overall sentiment. (6)

TwittTrend: Alright - so far you have got sentiment. You can get top trending Twitts by Trends/Places API from Twitter: https://dev.twitter.com/rest/reference/get/trends/place. If you can show what is trending at a given area/WOEID on your UI, you get additional 20 points. 

 
Architecture Diagram:
Below you will find attached an Architecture diagram that shows the main differences between Assignment 1 and Assignment 2. We will use this diagram to explain the modifications that you will introduce into your application (in bold on the steps above). 

Extra Credit (20): Some form of TwitTrend using the Trend/Place API or any other method you could implement.
