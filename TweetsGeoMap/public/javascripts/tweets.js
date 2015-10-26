"use strict";

var searchString; 
$('.keyword').click(function(event){
    event.preventDefault();
    // $('#searchResults').append("<p>Clicked</p>");
    searchString = $(this).text();

    switch(searchString) {
        case "Taylor Swift Tweets this month": 
            { 
                var date = new Date();
                searchString = "Taylor Swift since:" + date.getFullYear() + "-" + date.getMonth() + "-" + '01';
                // console.log("strng: " + searchString);
                break;
            }
    }

    $.ajax({
        method: "POST",
        url: "/search",
        dataType: "json",
        data: JSON.stringify({ searchString: searchString }),
        contentType: "application/json"
    })
    .done(function( data ) {
        $('#searchQuery').empty()
        $('#searchResults').empty();
        // console.log("Search Data: " + JSON.stringify(data.statuses[0].user));
        if(!data || data.statuses.length == 0) {
            $('#searchQuery').append("<p style=\"font-weight: bold;\">Keyword Search Results</p>");
            $('#searchQuery').append("No results found!");
        }
        else {
            $('#searchQuery').html("<p style=\"font-weight: bold;\">Keyword Search Results</p>");
            $('#searchQuery').append("<p style=\"color: green; font-weight: bold; font-size: 16px;\">" + searchString + "</p>");

            //Got back the search results. Populate the map and the keyword search results div
            for (var i = 0; i < data.statuses.length; i++) {
                // console.log("URL: " + data.statuses[i].user.profile_image_url);

                var tweet = {
                    user_profile_img_url: data.statuses[i].user.profile_image_url,
                    twitterHandle: data.statuses[i].user.screen_name,
                    text: data.statuses[i].text,
                    created_at: data.statuses[i].created_at,

                }

                displayTweet(tweet, 'searchResults');


                if (data.statuses[i].coordinates != null) {
                    tweet.latLong = data.statuses[i].coordinates.coordinates;
                
                    var myLatlng = new google.maps.LatLng(tweet.latLong[1], tweet.latLong[0]); //Twitter provides longitude first and then latitude
            
                    //Add the latlong to heatmap data. It automatically updates the heatmap
                    heatMapDataPoints.push(myLatlng);

                    // console.log("heatMapDataPoints Length: " + heatMapDataPoints.length);

                    if (heatmap == undefined) {
                        heatmap = new google.maps.visualization.HeatmapLayer({
                            data: heatMapDataPoints,
                            map: map
                        });
                    }
                }
            }
        }
    });
});


var image = new google.maps.MarkerImage('images/twitter-bird.png', null, null, null, new google.maps.Size(15, 15));

var map, heatmap;
var myLatlng;
var heatMapDataPoints = [];
function initialize(lat,lon) {
    var myLatlng = new google.maps.LatLng(0.000000, 0.000000);
    var mapOptions = {
        zoom: 1,
        center: myLatlng,
        mapTypeId: google.maps.MapTypeId.SATELLITE,
        tilt: 45
    };

    map = new google.maps.Map(document.getElementById('map'), mapOptions); //Store it on the global scope

}

google.maps.event.addDomListener(window, 'load', initialize);
var socket = io.connect();

socket.on('welcome', function(data) {
    var text = document.createTextNode("Welcome!");

    document.getElementById("LiveTweetStream").appendChild(text);

    // Respond with a message including this clients' id sent from the server
    socket.emit('i am client', {data: 'foo!', id: data.id});
});

var marker;
socket.on('livetweet', function(livetweet) {
    if (livetweet.tweet.latLong != null) {

        displayTweet(livetweet.tweet, 'LiveTweetStream');

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

        if(marker != undefined) {
            marker.setMap(null);
        }

        marker = new google.maps.Marker({
            position: myLatlng,
            map: map,
            animation: google.maps.Animation.DROP,
            icon: image,
            title: livetweet.tweet.twitterHandle
        });
    }
});


socket.on('dbtweet', function(dbtweet) {
    if (dbtweet.tweet.latLong != null) {
        var myLatlng = new google.maps.LatLng(dbtweet.tweet.latLong[1], dbtweet.tweet.latLong[0]); //Twitter provides long first and then lat

        //Add the latlong to heatmap data and rerender the heatmap layer.
        heatMapDataPoints.push(myLatlng);
    }
});

socket.on('error', console.error.bind(console));
socket.on('message', console.log.bind(console));

function displayTweet(tweet, divClass) {
    //TODO: Modify to look like a tweet. Apply CSS.
    // console.log("Message: " + message);
   
    var tweetStream = document.getElementById(divClass);

    var len = tweetStream.getElementsByTagName('div').length;
    if (len > 20) {
        tweetStream.removeChild(tweetStream.lastChild);
    }
    
    var el = document.createElement('div');
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