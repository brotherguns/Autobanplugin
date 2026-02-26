(function () {
    "use strict";

    var MY_ID = "877502759404974110";

    var SCAM_IDS = new Set([
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
        var parts = url.split("/");
        var idx = parts.indexOf("attachments");
        if (idx === -1) return null;
        var id = parts[idx + 2];
        if (!id || !/^\d{17,20}$/.test(id)) return null;
        return id;
    }

    function isScamMessage(message) {
        var i, id;
        var attachments = message.attachments || [];
        for (i = 0; i < attachments.length; i++) {
            id = extractAttachmentId(attachments[i].url);
            if (id && SCAM_IDS.has(id)) return true;
            id = extractAttachmentId(attachments[i].proxy_url);
            if (id && SCAM_IDS.has(id)) return true;
        }
        var embeds = message.embeds || [];
        for (i = 0; i < embeds.length; i++) {
            var e = embeds[i];
            var urls = [
                e.image && e.image.url,
                e.image && e.image.proxy_url,
                e.thumbnail && e.thumbnail.url,
                e.thumbnail && e.thumbnail.proxy_url,
            ];
            for (var j = 0; j < urls.length; j++) {
                id = extractAttachmentId(urls[j]);
                if (id && SCAM_IDS.has(id)) return true;
            }
        }
        var content = message.content || "";
        if (content.includes("cdn.discordapp.com/attachments/") || content.includes("media.discordapp.net/attachments/")) {
            var tokens = content.split(/\s+/);
            for (i = 0; i < tokens.length; i++) {
                id = extractAttachmentId(tokens[i]);
                if (id && SCAM_IDS.has(id)) return true;
            }
        }
        return false;
    }

    var messageHandler = null;

    function getMetro() {
        if (window.vendetta && window.vendetta.metro) return window.vendetta.metro;
        if (window.bunny && window.bunny.metro) return window.bunny.metro;
        return null;
    }

    var plugin = {
        onLoad: function () {
            var metro = getMetro();
            if (!metro) { console.error("[AutoBanScammer] No metro found"); return; }
            var FluxDispatcher = metro.findByProps("subscribe", "dispatch");
            var MessageModule = metro.findByProps("sendMessage", "editMessage");
            if (!FluxDispatcher || !MessageModule) { console.error("[AutoBanScammer] Missing modules"); return; }

            messageHandler = function (event) {
                try {
                    var message = event && event.message;
                    if (!message) return;
                    var authorId = message.author && message.author.id;
                    var channelId = message.channel_id;
                    if (!authorId || !channelId || authorId === MY_ID) return;
                    if (!isScamMessage(message)) return;
                    MessageModule.sendMessage(channelId, { content: "?ban " + authorId });
                } catch (err) {
                    console.error("[AutoBanScammer]", err);
                }
            };

            FluxDispatcher.subscribe("MESSAGE_CREATE", messageHandler);
        },

        onUnload: function () {
            var metro = getMetro();
            if (metro && messageHandler) {
                var FluxDispatcher = metro.findByProps("subscribe", "dispatch");
                if (FluxDispatcher) FluxDispatcher.unsubscribe("MESSAGE_CREATE", messageHandler);
                messageHandler = null;
            }
        },
    };

    if (typeof module !== "undefined") module.exports = plugin;
    else window.__vendetta_plugin = plugin;
})();
