"use strict";

let image = new google.maps.MarkerImage('images/twitter-bird.png', null, null, null, new google.maps.Size(15, 15));

let map, heatmap;
let myLatlng;
let heatMapDataPoints = [];
function initialize(lat,lon) {
    let myLatlng = new google.maps.LatLng(0.000000, 0.000000);
    let mapOptions = {
        zoom: 1,
        center: myLatlng,
        mapTypeId: google.maps.MapTypeId.SATELLITE,
        tilt: 45
    };

    map = new google.maps.Map(document.getElementById('map'), mapOptions); //Store it on the global scope

}

google.maps.event.addDomListener(window, 'load', initialize);
let socket = io.connect();

socket.on('welcome', function(data) {
    let text = document.createTextNode("Welcome!");

    document.getElementById("LiveTweetStream").appendChild(text);

    // Respond with a message including this clients' id sent from the server
    socket.emit('i am client', {data: 'foo!', id: data.id});
});

var marker;
socket.on('livetweet', function(livetweet) {
    if (livetweet.tweet.latLong != null) {
        // let message = "TweetID: " + data.tweet.tweet_id + " , User: " + data.tweet.user_id + " , Name: " + data.tweet.twitterHandle + " , Geo: " + data.tweet.latLong + " , Text: " + data.tweet.text;
        // console.log(message);
        // let icon = data.tweet.user_profile_img_url;
        displayLiveTweet(livetweet.tweet);

        let myLatlng = new google.maps.LatLng(livetweet.tweet.latLong[1], livetweet.tweet.latLong[0]); //Twitter provides longitude first and then latitude
        
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
        let myLatlng = new google.maps.LatLng(dbtweet.tweet.latLong[1], dbtweet.tweet.latLong[0]); //Twitter provides long first and then lat

        //Add the latlong to heatmap data and rerender the heatmap layer.
        heatMapDataPoints.push(myLatlng);
    }
});

socket.on('error', console.error.bind(console));
socket.on('message', console.log.bind(console));

function displayLiveTweet(tweet) {
    //TODO: Modify to look like a tweet. Apply CSS.
    // console.log("Message: " + message);
   
    let tweetStream = document.getElementById('LiveTweetStream');

    let len = tweetStream.getElementsByTagName('div').length;
    if (len > 20) {
        tweetStream.removeChild(tweetStream.lastChild);
    }
    
    let el = document.createElement('div');
    el.style.borderBottom = "thin solid lightgray";
    el.style.padding = "5px";

    let imageAndName = document.createElement('div');
    imageAndName.style.padding = "4px";
    if (tweet.user_profile_img_url != null) {
        var img = document.createElement('img');
        img.src = tweet.user_profile_img_url;
        img.width = "35";
        img.height = "35";
        // img.style.float = "left";
        imageAndName.appendChild(img);
    }

    let username = document.createElement('span');
    username.innerHTML = "@" + tweet.twitterHandle;
    username.style.fontWeight = "bold";
    username.style.color = "#51A6E6";
    username.style.marginLeft = "7px";
    imageAndName.appendChild(username);

    el.appendChild(imageAndName);

    let text = document.createTextNode(tweet.text);
    el.appendChild(text);

    el.appendChild(document.createElement('br'));
    
    let date = document.createElement('span');
    date.innerHTML = tweet.created_at;
    date.style.fontSize = "xx-small";
    el.appendChild(date);    

    tweetStream.insertBefore(el, tweetStream.firstChild);
}