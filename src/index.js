import { FluxDispatcher } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";

const MY_ID = "877502759404974110";

const SCAM_IDS = new Set([
    "1476688857930924105",
    "1476688858375782701",
    "1476688858774110268",
    "1476688859076104313",
]);

const SCAM_HM = new Set([
    "d75ba302ba17fab02ad7a1de76e7282af8c86d6c7a17b0bfb5762dd67f7b9462",
    "21711a1fd5242d05e2ee36263b3b98e45423047a45e34ea7daecafed581ec76d",
    "6425e2a23c039ff644c62025b31716a3a5969621d7ee837fb39d4412dfd3dc77",
    "26aec64263f89c79d71455f6e8c47ffe6d2180c6d006bfb7b9cba260699fbcab",
]);

function extractAttachmentId(url) {
    if (typeof url !== "string") return null;
    var parts = url.split("/");
    var idx = parts.indexOf("attachments");
    if (idx === -1) return null;
    var id = parts[idx + 2];
    if (!id) return null;
    return id.split("?")[0];
}

function extractHm(url) {
    if (typeof url !== "string") return null;
    var idx = url.indexOf("hm=");
    if (idx === -1) return null;
    var val = url.substring(idx + 3);
    var end = val.indexOf("&");
    return end === -1 ? val : val.substring(0, end);
}

function isScamUrl(url) {
    return SCAM_IDS.has(extractAttachmentId(url)) || SCAM_HM.has(extractHm(url));
}

function isScamMessage(message) {
    var i, a, e, urls;
    var attachments = message.attachments || [];
    for (i = 0; i < attachments.length; i++) {
        a = attachments[i];
        if (isScamUrl(a.url) || isScamUrl(a.proxy_url)) return true;
    }
    var embeds = message.embeds || [];
    for (i = 0; i < embeds.length; i++) {
        e = embeds[i];
        urls = [
            e.image ? e.image.url : null,
            e.image ? e.image.proxy_url : null,
            e.thumbnail ? e.thumbnail.url : null,
            e.thumbnail ? e.thumbnail.proxy_url : null,
        ];
        for (var j = 0; j < urls.length; j++) {
            if (isScamUrl(urls[j])) return true;
        }
    }
    return false;
}

function onMessage(event) {
    try {
        var message = event && event.message;
        if (!message) return;
        var authorId = message.author && message.author.id;
        var channelId = event.channelId || message.channel_id;
        if (!authorId || !channelId || authorId === MY_ID) return;
        if (!isScamMessage(message)) return;
        var MessageModule = findByProps("sendMessage", "editMessage");
        MessageModule.sendMessage(channelId, { content: "?ban " + authorId });
    } catch (err) {
        console.error("[AutoBanScammer]", err);
    }
}

export default {
    onLoad: function() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
    },
    onUnload: function() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
    },
};
