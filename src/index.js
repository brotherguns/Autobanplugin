import { FluxDispatcher } from "@vendetta/metro/common";
import { findByProps } from "@vendetta/metro";

const MY_ID = "877502759404974110";

const SCAM_IDS = new Set([
    "1476688857930924105",
    "1476688858375782701",
    "1476688858774110268",
    "1476688859076104313",
]);

function extractAttachmentId(url) {
    if (typeof url !== "string") return null;
    if (
        !url.includes("cdn.discordapp.com/attachments/") &&
        !url.includes("media.discordapp.net/attachments/")
    ) return null;
    const parts = url.split("/");
    const idx = parts.indexOf("attachments");
    if (idx === -1) return null;
    const id = parts[idx + 2];
    if (!id || !/^\d{17,20}$/.test(id)) return null;
    return id;
}

function isScamMessage(message) {
    const attachments = message.attachments || [];
    for (const a of attachments) {
        if (SCAM_IDS.has(extractAttachmentId(a.url))) return true;
        if (SCAM_IDS.has(extractAttachmentId(a.proxy_url))) return true;
    }
    const embeds = message.embeds || [];
    for (const e of embeds) {
        for (const url of [e.image?.url, e.image?.proxy_url, e.thumbnail?.url, e.thumbnail?.proxy_url]) {
            if (SCAM_IDS.has(extractAttachmentId(url))) return true;
        }
    }
    const content = message.content || "";
    if (
        content.includes("cdn.discordapp.com/attachments/") ||
        content.includes("media.discordapp.net/attachments/")
    ) {
        for (const token of content.split(/\s+/)) {
            if (SCAM_IDS.has(extractAttachmentId(token))) return true;
        }
    }
    return false;
}

function onMessage(event) {
    try {
        const message = event.message;
        if (!message) return;
        const authorId = message.author?.id;
        const channelId = event.channelId;
        if (!authorId || !channelId || authorId === MY_ID) return;
        if (!isScamMessage(message)) return;
        const MessageModule = findByProps("sendMessage", "editMessage");
        MessageModule.sendMessage(channelId, { content: "?ban " + authorId });
    } catch (err) {
        console.error("[AutoBanScammer]", err);
    }
}

export default {
    onLoad: async () => {
        FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
    },
    onUnload: async () => {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
    },
};
