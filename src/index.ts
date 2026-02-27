const MY_ID = "877502759404974110";

const SCAM_IDS = new Set([
    "1476688857930924105",
    "1476688858375782701",
    "1476688858774110268",
    "1476688859076104313",
]);

function extractAttachmentId(url: string | undefined): string | null {
    if (typeof url !== "string") return null;
    if (
        !url.includes("cdn.discordapp.com/attachments/") &&
        !url.includes("media.discordapp.net/attachments/")
    ) return null;
    const parts = url.split("/");
    const idx = parts.indexOf("attachments");
    if (idx === -1) return null;
    const id = parts[idx + 2];
    if (!id) return null;
    return id.split("?")[0];
}

function isScamMessage(message: any): boolean {
    for (const a of (message.attachments ?? [])) {
        if (SCAM_IDS.has(extractAttachmentId(a.url) ?? "")) return true;
        if (SCAM_IDS.has(extractAttachmentId(a.proxy_url) ?? "")) return true;
    }
    for (const e of (message.embeds ?? [])) {
        for (const u of [e.image?.url, e.image?.proxy_url, e.thumbnail?.url, e.thumbnail?.proxy_url]) {
            if (SCAM_IDS.has(extractAttachmentId(u) ?? "")) return true;
        }
    }
    const content: string = message.content ?? "";
    if (content.includes("cdn.discordapp.com/attachments/") || content.includes("media.discordapp.net/attachments/")) {
        for (const token of content.split(/\s+/)) {
            if (SCAM_IDS.has(extractAttachmentId(token) ?? "")) return true;
        }
    }
    return false;
}

function onMessage(event: any) {
    try {
        const message = event.message;
        if (!message) return;
        const authorId: string = message.author?.id;
        const channelId: string = message.channel_id ?? event.channelId;
        if (!authorId || !channelId || authorId === MY_ID) return;
        if (!isScamMessage(message)) return;
        const MessageModule = window.vendetta.metro.findByProps("sendMessage", "editMessage");
        if (!MessageModule) return;
        MessageModule.sendMessage(channelId, { content: `?ban ${authorId}` });
    } catch (e) {
        console.error("[AutoBanScammer]", e);
    }
}

export default {
    onLoad() {
        window.vendetta.metro.common.FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
    },
    onUnload() {
        window.vendetta.metro.common.FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
    },
};
