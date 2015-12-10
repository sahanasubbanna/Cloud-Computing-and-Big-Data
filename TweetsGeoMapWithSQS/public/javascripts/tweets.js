"use strict";

var socket = io.connect();

var positiveTweets = 0;
var neutralTweets = 0;
var negativeTweets = 0;
var totalTweets = 0;

var centerLatlng = new google.maps.LatLng(0.000000, 0.000000);

var mapOptions = {
    zoom: 1,
    center: centerLatlng,
    mapTypeId: google.maps.MapTypeId.SATELLITE,
    tilt: 45
};

var tweetBirdDefaultImage = new google.maps.MarkerImage('images/twitter-bird.png', null, null, null, new google.maps.Size(15, 15));
var tweetBirdPositiveImage = new google.maps.MarkerImage('images/twitter-bird-positive.png', null, null, null, new google.maps.Size(15, 15));
var tweetBirdNegativeImage = new google.maps.MarkerImage('images/twitter-bird-negative.png', null, null, null, new google.maps.Size(15, 15));
var tweetBirdNeutralImage = new google.maps.MarkerImage('images/twitter-bird-neutral.png', null, null, null, new google.maps.Size(15, 15));

//Event handler for when keywords are pressed
var searchString;
$('.keyword').click(function(event) {
    event.preventDefault();
    // $('#searchResults').append("<p>Clicked</p>");
    searchString = $(this).text();
    var newSearchString = $(this).text();
    switch (searchString) {
        case "Taylor Swift Tweets this month":
            {
                var date = new Date();
                newSearchString = "Taylor Swift since:" + date.getFullYear() + "-" + date.getMonth() + "-" + '01';
                break;
            }
    }
    socket.emit('search', {
        searchString: newSearchString,
        origSearchString: searchString
    });
});




//Search results returned are displayed.
socket.on('searchResults', function(results) {
    $('#searchQuery').empty();
    $('#searchResults').empty();
    $('#searchContainer').css("display", "block");
    $('#searchMap').css("display", "block");

    if (!results.data || results.data.statuses.length == 0) {
        $('#searchQuery').append("<p style=\"font-weight: bold;\">Keyword Search Results</p>");
        $('#searchQuery').append("No results found!");
    } else {
        $('#searchQuery').css({
            "position": "relative",
            "padding-left": "10px"
        });
        $('#searchQuery').html("<br /><span style=\"font-weight: bold; color: orange;\">Keyword Search Results</span>");
        $('#searchQuery').append("<button type=\"submit\" style=\"position: absolute; right: 20px; top: 20px; height: 20px; color: white; background-color: #51A6E6;\" onclick=\"hideSearchResults();\">Close</button> <br /><br />");
        $('#searchQuery').append("<p style=\"color: green; font-weight: bold; font-size: 16px;\">" + results.origSearchString + "</p>");
        var tweetsWithGeo = 0;
        var cLatlng = new google.maps.LatLng(0.000000, 0.000000);
        var searchMapOptions = {
            zoom: 1,
            center: cLatlng,
            mapTypeId: google.maps.MapTypeId.SATELLITE,
            tilt: 45
        };

        var searchMap = new google.maps.Map(document.getElementById('searchMap'), searchMapOptions); //Store it on the global scope
        var searchHeatMapDataPoints = [];
        var searchHeatMap = new google.maps.visualization.HeatmapLayer({
            data: searchHeatMapDataPoints,
            map: searchMap
        });
        // google.maps.event.trigger(searchMap, 'resize');

        // console.log("Statuses: " + results.data.statuses.length);
        //Got back the search results. Populate the map and the keyword search results div
        for (var i = 0; i < results.data.statuses.length; i++) {
            // console.log(results.data.statuses[i]);

            var tweet = {
                user_profile_img_url: results.data.statuses[i].user.profile_image_url,
                twitterHandle: results.data.statuses[i].user.screen_name,
                text: results.data.statuses[i].text,
                sentiment: "NA",
                created_at: results.data.statuses[i].created_at
            }

            displayTweet(tweet, 'searchResults');

            if (results.data.statuses[i].coordinates) {
                tweetsWithGeo += 1;
                tweet.latLong = results.data.statuses[i].coordinates.coordinates;
                // console.log("Latlong: " + tweet.latLong);
                var searchLatlng = new google.maps.LatLng(tweet.latLong[1], tweet.latLong[0]); //Twitter provides longitude first and then latitude

                //Add the latlong to heatmap data. It automatically updates the heatmap
                searchHeatMapDataPoints.push(searchLatlng);
                // console.log(searchHeatMapDataPoints);

                if (marker != undefined) {
                    marker.setMap(null);
                }

                var markerIcon = tweetBirdDefaultImage;

                switch(tweet.sentiment) {
                    case "positive": markerIcon = tweetBirdPositiveImage; break;
                    case "negative": markerIcon = tweetBirdNegativeImage; break;
                    case "neutral": markerIcon = tweetBirdNeutralImage; break;
                }

                marker = new google.maps.Marker({
                    position: myLatlng,
                    map: searchMap,
                    animation: google.maps.Animation.DROP,
                    icon: markerIcon,
                    title: tweet.twitterHandle
                });
            }

            if (tweetsWithGeo === 0) {
                var labelText = "No location information found from search";

                var myOptions = {
                    content: labelText,
                    boxStyle: {
                        border: "1px solid white",
                        backgroundColor: "white",
                        opacity: "0.7",
                        textAlign: "center",
                        fontSize: "10pt"
                    },
                    disableAutoPan: true,
                    pixelOffset: new google.maps.Size(-25, 0),
                    position: new google.maps.LatLng(0, -40),
                    closeBoxURL: "",
                    isHidden: false,
                    pane: "mapPane",
                    enableEventPropagation: true
                };

                var ibLabel = new InfoBox(myOptions);
                ibLabel.open(searchMap);
            }
        }
    }
});



function hideSearchResults() {
    var el = document.getElementById('searchContainer');
    el.style.display = "none";

    var el2 = document.getElementById('searchMap');
    el2.style.display = "none";
}



var map, heatmap;
var myLatlng;
var heatMapDataPoints = [];

function initialize(lat, lon) {
    map = new google.maps.Map(document.getElementById('map'), mapOptions); //Store it on the global scope
}
google.maps.event.addDomListener(window, 'load', initialize);


socket.on('welcome', function(data) {
    var text = document.createTextNode("Welcome!");

    document.getElementById("LiveTweetStream").appendChild(text);

    // Respond with a message including this clients' id sent from the server
    socket.emit('i am client', {
        data: 'Client!',
        id: data.id
    });
});



var marker;
socket.on('livetweet', function(livetweet) {
    if (livetweet.tweet.latLong != null) {

        displayTweet(livetweet.tweet, 'LiveTweetStream');

        if (!livetweet.tweet.sentiment) {
            livetweet.tweet.sentiment = "NA";
        }

        var myLatlng = new google.maps.LatLng(livetweet.tweet.latLong[1], livetweet.tweet.latLong[0]); //Twitter provides longitude first and then latitude

        //Add the latlong to heatmap data. It automatically updates the heatmap
        heatMapDataPoints.push(myLatlng);

        // console.log("heatMapDataPoints Length: " + heatMapDataPoints.length);

        if (heatmap == undefined) {
            heatmap = new google.maps.visualization.HeatmapLayer({
                data: heatMapDataPoints,
                map: map
            });
        }

        if (marker != undefined) {
            marker.setMap(null);
        }

        var markerIcon = tweetBirdDefaultImage;

        switch(livetweet.tweet.sentiment) {
            case "positive": markerIcon = tweetBirdPositiveImage; break;
            case "negative": markerIcon = tweetBirdNegativeImage; break;
            case "neutral": markerIcon = tweetBirdNeutralImage; break;
        }

        marker = new google.maps.Marker({
            position: myLatlng,
            map: map,
            animation: google.maps.Animation.DROP,
            icon: markerIcon,
            title: livetweet.tweet.twitterHandle
        });


        updateSentimentResult(livetweet.tweet.sentiment);

    }
});


socket.on('dbtweet', function(dbtweet) {
    if (dbtweet.tweet.latLong != null) {
        var myLatlng = new google.maps.LatLng(dbtweet.tweet.latLong[1], dbtweet.tweet.latLong[0]); //Twitter provides long first and then lat

        //Add the latlong to heatmap data and rerender the heatmap layer.
        heatMapDataPoints.push(myLatlng);
    }

    if (!dbtweet.tweet.sentiment) {
        dbtweet.tweet.sentiment = "NA";
    }

    updateSentimentResult(dbtweet.tweet.sentiment);
});

socket.on('error', console.error.bind(console));
socket.on('message', console.log.bind(console));

function displayTweet(tweet, divClass) {
    //TODO: Modify to look like a tweet. Apply CSS.
    // console.log("Message: " + message);

    var tweetStream = document.getElementById(divClass);

    var len = tweetStream.getElementsByClassName('tweet').length;
    if (len > 20) {
        tweetStream.removeChild(tweetStream.lastChild);
    }

    var el = document.createElement('div');
    el.classList.add("tweet");
    el.style.borderBottom = "thin solid lightgray";
    el.style.padding = "5px";

    var imageAndName = document.createElement('div');
    imageAndName.style.padding = "4px";
    if (tweet.user_profile_img_url != null) {
        var img = document.createElement('img');
        img.src = tweet.user_profile_img_url;
        img.width = "35";
        img.height = "35";
        // img.style.float = "left";
        imageAndName.appendChild(img);
    }

    var username = document.createElement('span');
    username.innerHTML = "@" + tweet.twitterHandle;
    username.style.fontWeight = "bold";
    username.style.color = "#51A6E6";
    username.style.marginLeft = "7px";
    imageAndName.appendChild(username);


    var sentiment = document.createElement('span');
    sentiment.innerHTML = "  " + tweet.sentiment + "  ";
    sentiment.style.backgroundColor = "black";
    sentiment.style.fontWeight = "bold";
    sentiment.style.color = getSentimentColor(tweet.sentiment);
    sentiment.style.marginLeft = "7px";
    imageAndName.appendChild(sentiment);


    el.appendChild(imageAndName);

    var text = document.createTextNode(tweet.text);
    el.appendChild(text);

    el.appendChild(document.createElement('br'));

    var date = document.createElement('span');
    date.innerHTML = tweet.created_at;
    date.style.fontSize = "xx-small";
    el.appendChild(date);

    tweetStream.insertBefore(el, tweetStream.firstChild);
}


function updateSentimentResult(sentiment) {
    switch (sentiment) {
        case "positive":
            {
                positiveTweets += 1;
                break;
            }
        case "neutral":
            {
                neutralTweets += 1;
                break;
            }
        case "negative":
            {
                negativeTweets += 1;
                break;
            }
    }

    totalTweets = positiveTweets + neutralTweets + negativeTweets;
    var el = document.getElementById('positive');
    var percent = parseInt(positiveTweets / totalTweets * 100, 10);
    el.firstChild.nodeValue = percent;

    var el2 = document.getElementById('neutral');
    var percent2 = parseInt(neutralTweets / totalTweets * 100, 10);
    el2.firstChild.nodeValue = percent2;

    var el3 = document.getElementById('negative');
    var percent3 = parseInt(negativeTweets / totalTweets * 100, 10);
    el3.firstChild.nodeValue = percent3;


    console.log('-----------------Sentiments-------------');
    console.log("Positive: " + positiveTweets + " Neutral: " + neutralTweets + "  Negative: " + negativeTweets);
}


function getSentimentColor(sentiment) {
    switch (sentiment) {
        case "positive":
            return "#82FF82";
        case "neutral":
            return "#FFFF82";
        case "negative":
            return "#FF6666";
        case "NA":
            return "#FFFFFF";
    }
}
