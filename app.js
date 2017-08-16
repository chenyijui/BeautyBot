var config = require('config');
var express = require('express');
var request = require('request');
var bodyparser = require('body-parser');

var app = express();

app.use(bodyparser.json());

const PAGE_ACCESS_TOKEN = config.get('devConfig.pageAccessToken');
const VERIFY_TOKEN = config.get('devConfig.verifyToken');

app.get('/webhook', function(req, res) {
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === VERIFY_TOKEN) {
            console.log("Validating webhook");
            res.status(200).send(req.query['hub.challenge']);
        } else {
        console.error("Failed validation. Make sure the validation tokens match.");
        res.sendStatus(403);
        }
});

app.post('/webhook', function (req, res) {
    var data = req.body;

    // Make sure this is a page subscription
    if (data.object === 'page') {
    // Iterate over each entry - there may be multiple if batched
        data.entry.forEach(function(entry) {
            var pageID = entry.id;
            var timeOfEvent = entry.time;
        // Iterate over each messaging event
            entry.messaging.forEach(function(event) {
                if (event.message) {
                    receivedMessage(event);
                } else {
                    console.log("Webhook received unknown event: ", event);
                }
            });
        });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
        res.sendStatus(200);
    }
});

function receivedMessage (event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    console.log("Received message for user %d and page %d at %d with message:",
      senderID, recipientID, timeOfMessage);
    console.log(JSON.stringify(message));

    var messageId = message.mid;

    var messageText = message.text;
    var messageAttachments = message.attachments;

    if (messageText) {
      // If we receive a text message, check to see if it matches a keyword
      // and send back the example. Otherwise, just echo the text we received.
        switch (messageText) {
            case 'hi':
                sendTextMessage(senderID, '您好，請說給我美圖，我就會送給您一張美美的圖喔！');
                break;
            case '您好':
                sendTextMessage(senderID, '您好，請說給我美圖，我就會送給您一張美美的圖喔！');
                break;
            case '給我美圖':
                sendImageMessage(senderID);
                sendTextMessage(senderID, '美圖來了！請稍後！');
                break;
        default:
                sendTextMessage(senderID, '你說啥？');
        }
    } else if (messageAttachments) {
        sendTextMessage(senderID, "Message with attachment received");
        }
}

function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    };

    callSendAPI(messageData);
}

function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: messageData

    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;
    } else {
        console.error("Unable to send message.");
        console.error(response);
        console.error(error);
        }
    });
}


app.listen(3000, function() {
    console.log('listening 3000');
})
