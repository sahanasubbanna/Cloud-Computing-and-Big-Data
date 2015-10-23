var socket = io.connect();
socket.on('welcome', function(data) {
    addMessage(data.message);

    // Respond with a message including this clients' id sent from the server
    socket.emit('i am client', {data: 'foo!', id: data.id});
});

socket.on('info', function(data) {
    if (data.tweet.coordinates != null) {
        addMessage("TweetID: " + data.tweet.id + " , User: " + data.tweet.user.id + " , Name: " + data.tweet.user.name + " , Geo: " + data.tweet.coordinates.coordinates + " , Text: " + data.tweet.text);
    }
});

socket.on('error', console.error.bind(console));
socket.on('message', console.log.bind(console));

function addMessage(message) {
    var text = document.createTextNode(message),
        el = document.createElement('li'),
        content = document.getElementById('content');

    el.appendChild(text);
    content.appendChild(el);
}
