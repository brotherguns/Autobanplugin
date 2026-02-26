// AutoBanScammer - Kettu/Bunny/Vendetta Plugin
// Pre-compiled — no build step needed.
// Drop index.js + manifest.json into a GitHub repo, enable Pages, paste URL into Kettu.

(function () {
    "use strict";

    // ── Your Discord user ID (never ban yourself) ───────────────────────────
    var MY_ID = "877502759404974110";

    // ── The 4 exact attachment snowflake IDs to watch for ──────────────────
    // These are extracted from the attachment path of the 4 CDN URLs you provided.
    // ONLY these 4 IDs will ever trigger a ban. No other attachment can match.
    var SCAM_IDS = new Set([
        "1476688857930924105",
        "1476688858375782701",
        "1476688858774110268",
        "1476688859076104313",
    ]);

    // ── Extract the attachment snowflake ID from a Discord CDN URL ──────────
    // Returns null if the URL isn't a valid Discord CDN attachment URL.
    // The snowflake is the 18-digit number in position /attachments/<ch>/<id>/<file>
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
        // Must look like a Discord snowflake (17-20 digit number)
        if (!id || !/^\d{17,20}$/.test(id)) return null;
        return id;
    }

    // ── Check every URL-like field in a message for one of our 4 scam IDs ──
    // Returns true ONLY if an exact scam attachment ID is found.
    // Will never fire on a normal image.png or any other attachment.
    function isScamMessage(message) {
        var i, id, url;

        // 1. Structured attachments (most reliable — Discord always sends these)
        var attachments = message.attachments || [];
        for (i = 0; i < attachments.length; i++) {
            id = extractAttachmentId(attachments[i].url);
            if (id && SCAM_IDS.has(id)) return true;
            id = extractAttachmentId(attachments[i].proxy_url);
            if (id && SCAM_IDS.has(id)) return true;
        }

        // 2. Embeds (image / thumbnail fields)
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

        // 3. Raw message text (some bots paste the raw CDN link in content)
        // We still parse out the attachment ID so we never false-positive.
        var content = message.content || "";
        if (
            content.includes("cdn.discordapp.com/attachments/") ||
            content.includes("media.discordapp.net/attachments/")
        ) {
            var tokens = content.split(/\s+/);
            for (i = 0; i < tokens.length; i++) {
                id = extractAttachmentId(tokens[i]);
                if (id && SCAM_IDS.has(id)) return true;
            }
        }

        return false;
    }

    // ── Handler reference stored so we can cleanly unsubscribe ──────────────
    var messageHandler = null;

    // ── Resolve Kettu/Bunny/Vendetta globals safely ──────────────────────────
    // Kettu exposes its metro API on window.vendetta (Vendetta compat) and/or
    // window.bunny. We try both so the plugin works across loader versions.
    function getMetro() {
        if (window.vendetta && window.vendetta.metro) return window.vendetta.metro;
        if (window.bunny && window.bunny.metro) return window.bunny.metro;
        return null;
    }

    function getFlux() {
        var metro = getMetro();
        if (!metro) return null;
        // FluxDispatcher is a well-known common module
        return metro.findByProps("subscribe", "dispatch", "unsubscribe");
    }

    function getMessageModule() {
        var metro = getMetro();
        if (!metro) return null;
        return metro.findByProps("sendMessage", "editMessage");
    }

    // ── Plugin lifecycle ─────────────────────────────────────────────────────
    module.exports = {
        onLoad: function () {
            var FluxDispatcher = getFlux();
            var MessageModule = getMessageModule();

            if (!FluxDispatcher) {
                console.error("[AutoBanScammer] Could not find FluxDispatcher — plugin will not work.");
                return;
            }
            if (!MessageModule) {
                console.error("[AutoBanScammer] Could not find MessageModule — plugin will not work.");
                return;
            }

            messageHandler = function (event) {
                try {
                    var message = event && event.message;
                    if (!message) return;

                    var authorId = message.author && message.author.id;
                    var channelId = message.channel_id;

                    // Never ban yourself
                    if (authorId === MY_ID) return;

                    // Bail if fields are missing
                    if (!authorId || !channelId) return;

                    // Only act on the exact 4 scam attachment IDs
                    if (!isScamMessage(message)) return;

                    // Send ban command in the same channel
                    MessageModule.sendMessage(channelId, {
                        content: "?ban " + authorId,
                    });

                    console.log("[AutoBanScammer] Banned " + authorId + " in channel " + channelId);
                } catch (err) {
                    console.error("[AutoBanScammer] Error in MESSAGE_CREATE handler:", err);
                }
            };

            FluxDispatcher.subscribe("MESSAGE_CREATE", messageHandler);
            console.log("[AutoBanScammer] Loaded and listening.");
        },

        onUnload: function () {
            var FluxDispatcher = getFlux();
            if (FluxDispatcher && messageHandler) {
                FluxDispatcher.unsubscribe("MESSAGE_CREATE", messageHandler);
                messageHandler = null;
            }
            console.log("[AutoBanScammer] Unloaded.");
        },
    };
})();
