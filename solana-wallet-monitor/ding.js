const axios = require('axios');

async function ding(text) {
    try {
        const webhook = process.env.DING_WEBHOOK;
        if (!webhook) {
            console.error('Missing DING_WEBHOOK environment variable');
            return;
        }
        console.log(webhook);
        const res = await axios.post(webhook, {
            msgtype: "text",
            text: {
                content: `other_${text}`,
            }
        });
        console.log(res);
    } catch (error) {
        console.error('Error sending DingTalk notification:', error);
    }
}

module.exports = { ding };

ding('test');