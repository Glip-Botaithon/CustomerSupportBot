"use strict";

require('dotenv').config();

const GlipClient = require('glip-client');
let request = require('request');
let watson = require('watson-developer-cloud');

const gc = new GlipClient({
    server: process.env.SERVER,
    appKey: process.env.APP_KEY,
    appSecret: process.env.APP_SECRET,
    appName: 'My Glip Client',
    appVersion: '1.0.0'
});

let workspace_id = "*****";

let conversation = watson.conversation({
    username: '****',
    password: '****',
    version: 'v1',
    version_date: '2017-02-03'
});

let context = {};

gc.authorize({
    username: process.env.PHONE,
    extension: process.env.EXTENSION,
    password: process.env.PASSWORD
}).then((authResp) => {
    console.log('logged in');
    gc.persons().get({ personId: '~' }).then((resp) => {
        console.log('Get person id successfully.');
        let myId = resp.id;

        gc.posts().subscribe((message) => {

            let groupId = message.groupId;
            let creatorId = message.creatorId;
            let msgText = message.text;

            if (myId != creatorId && message.type === 'TextMessage' && msgText.length > 0) {

                conversation.message({
                    workspace_id: workspace_id,
                    input: {text: msgText},
                    context: context
                },  function(err, response) {
                    if (err) {

                        sendMsgToGlip(groupId, "Sorry, We could not solve your problem right now. Please try later.");

                    } else {

                        context = response.context;
                        let outputTexts = response.output.text;
                        let action = response.output.action;

                        let msg = "Sorry, I don't get your point.";

                        if ('search' === action) {

                            searchOnGoogle(msgText).then((results) => {
                                sendMsgToGlip(groupId, results);
                            }, (errMsg) => {
                                sendMsgToGlip(groupId, errMsg);
                            });

                        } else {
                            if (outputTexts && outputTexts.length > 0) {
                                msg = outputTexts[0];
                            }
                            sendMsgToGlip(groupId, msg);
                        }

                    }
                });

            }

        });
    });
});

function highlight(text, keyword) {
    return text.replace(new RegExp(keyword.split(/\s/).join('|'), 'gi'), ($0) => {
        if ($0.length > 1) {
            return '**' + $0 + '**';
        }
        return $0;
    });
}

function sendMsgToGlip(gId, msg) {
    return gc.posts().post({
        groupId: gId,
        text: msg
    });
}

function searchOnGoogle(q) {
    return new Promise((resolve, reject) => {

        let keyword = encodeURIComponent(q).replace(/%20/g,'+');
        let url = `https://www.googleapis.com/***/***?key=******&cx=*****:***&q=${keyword}&num=3&start=1`;


        request({url, headers: {
            referer: `https://****`
        }}, (error, response, body)  => {
            if (error) {
                reject("Error occurs.");
            } else {
                let items =  JSON.parse(body).items || [];
                let msg = '';

                if (items.length) {
                    msg =  'Are you expecting to see:\r\n';
                    msg += items.map((item, idx) => {
                        let title = item.title;
                        let itemLink = item.link;
                        title = highlight(title, q);
                        return `${idx+1}. [${title}](${itemLink})`;
                    }).join("\r\n");
                }
                resolve(msg);
            }
        });

    });
}



