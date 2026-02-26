'use strict';

const FluxDispatcher = window.vendetta.metro.common.FluxDispatcher;
const findByProps = window.vendetta.metro.findByProps;
const MY_ID = "877502759404974110";
const SCAM_IDS = new Set([
    "1476688857930924105",
    "1476688858375782701",
    "1476688858774110268",
    "1476688859076104313"
]);
const SCAM_HM = new Set([
    "d75ba302ba17fab02ad7a1de76e7282af8c86d6c7a17b0bfb5762dd67f7b9462",
    "21711a1fd5242d05e2ee36263b3b98e45423047a45e34ea7daecafed581ec76d",
    "6425e2a23c039ff644c62025b31716a3a5969621d7ee837fb39d4412dfd3dc77",
    "26aec64263f89c79d71455f6e8c47ffe6d2180c6d006bfb7b9cba260699fbcab"
]);
function extractAttachmentId(url) {
    if (typeof url !== "string") return null;
    const parts = url.split("/");
    const idx = parts.indexOf("attachments");
    if (idx === -1) return null;
    const id = parts[idx + 2];
    if (!id) return null;
    return id.split("?")[0];
}
function extractHm(url) {
    if (typeof url !== "string") return null;
    const match = url.match(/[?&]hm=([a-f0-9]+)/);
    return match ? match[1] : null;
}
function isScamUrl(url) {
    return SCAM_IDS.has(extractAttachmentId(url)) || SCAM_HM.has(extractHm(url));
}
function isScamMessage(message) {
    for (const a of message.attachments || []){
        if (isScamUrl(a.url) || isScamUrl(a.proxy_url)) return true;
    }
    for (const e of message.embeds || []){
        for (const url of [
            e.image?.url,
            e.image?.proxy_url,
            e.thumbnail?.url,
            e.thumbnail?.proxy_url
        ]){
            if (isScamUrl(url)) return true;
        }
    }
    return false;
}
function onMessage(event) {
    try {
        const message = event.message;
        if (!message) return;
        const authorId = message.author?.id;
        const channelId = event.channelId ?? message.channel_id;
        if (!authorId || !channelId || authorId === MY_ID) return;
        if (!isScamMessage(message)) return;
        const MessageModule = findByProps("sendMessage", "editMessage");
        MessageModule.sendMessage(channelId, {
            content: "?ban " + authorId
        });
    } catch (err) {
        console.error("[AutoBanScammer]", err);
    }
}
var index = {
    onLoad: async ()=>{
        FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
    },
    onUnload: async ()=>{
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
    }
};

module.exports = index;
