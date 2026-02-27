const MY_ID = "877502759404974110";

// Default hardcoded scam IDs
const DEFAULT_SCAM_IDS = [
    "1476688857930924105",
    "1476688858375782701",
    "1476688858774110268",
    "1476688859076104313",
];

// Persistent storage for user-added IDs
const storage = window.vendetta.storage.wrapSync(
    window.vendetta.storage.createStorage(
        window.vendetta.storage.createMMKVBackend("AutoBanScammer")
    )
);

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

function getAllScamIds(): Set<string> {
    const extra: string[] = storage.customIds ?? [];
    return new Set([...DEFAULT_SCAM_IDS, ...extra]);
}

function isScamMessage(message: any): boolean {
    const scamIds = getAllScamIds();

    for (const a of (message.attachments ?? [])) {
        if (scamIds.has(extractAttachmentId(a.url) ?? "")) return true;
        if (scamIds.has(extractAttachmentId(a.proxy_url) ?? "")) return true;
    }
    for (const e of (message.embeds ?? [])) {
        for (const u of [e.image?.url, e.image?.proxy_url, e.thumbnail?.url, e.thumbnail?.proxy_url]) {
            if (scamIds.has(extractAttachmentId(u) ?? "")) return true;
        }
    }
    const content: string = message.content ?? "";
    if (content.includes("cdn.discordapp.com/attachments/") || content.includes("media.discordapp.net/attachments/")) {
        for (const token of content.split(/\s+/)) {
            if (scamIds.has(extractAttachmentId(token) ?? "")) return true;
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

function Settings() {
    const React = window.vendetta.metro.common.React;
    const { Forms } = window.vendetta.ui.components;
    const { FormRow, FormSection, FormInput, FormDivider } = Forms;

    const [inputUrl, setInputUrl] = React.useState("");
    const [customIds, setCustomIds] = React.useState([...(storage.customIds ?? [])]);

    function refresh() {
        setCustomIds([...(storage.customIds ?? [])]);
    }

    function addUrl() {
        const trimmed = inputUrl.trim();
        const id = extractAttachmentId(trimmed);
        if (!id) {
            window.vendetta.ui.toasts.showToast("Invalid Discord CDN URL!");
            return;
        }
        if (DEFAULT_SCAM_IDS.includes(id) || (storage.customIds ?? []).includes(id)) {
            window.vendetta.ui.toasts.showToast("That ID is already in the list!");
            return;
        }
        storage.customIds = [...(storage.customIds ?? []), id];
        setInputUrl("");
        refresh();
        window.vendetta.ui.toasts.showToast("Added!");
    }

    function removeId(id: string) {
        storage.customIds = (storage.customIds ?? []).filter((i: string) => i !== id);
        refresh();
    }

    return React.createElement(React.Fragment, null,
        React.createElement(FormSection, { title: "Add Scam URL" },
            React.createElement(FormInput, {
                placeholder: "Paste Discord CDN URL here",
                value: inputUrl,
                onChange: setInputUrl,
                returnKeyType: "done",
                onSubmitEditing: addUrl,
            }),
            React.createElement(FormRow, {
                label: "Add URL",
                onPress: addUrl,
            }),
        ),
        React.createElement(FormSection, { title: "Default IDs (built-in, cannot remove)" },
            DEFAULT_SCAM_IDS.map((id, i) =>
                React.createElement(React.Fragment, { key: id },
                    React.createElement(FormRow, { label: id }),
                    i < DEFAULT_SCAM_IDS.length - 1 ? React.createElement(FormDivider, null) : null,
                )
            )
        ),
        customIds.length > 0
            ? React.createElement(FormSection, { title: "Custom IDs (tap to remove)" },
                customIds.map((id: string, i: number) =>
                    React.createElement(React.Fragment, { key: id },
                        React.createElement(FormRow, {
                            label: id,
                            onPress: () => window.vendetta.ui.alerts.showConfirmationAlert({
                                title: "Remove ID",
                                content: `Remove ${id} from the ban list?`,
                                confirmText: "Remove",
                                onConfirm: () => removeId(id),
                                cancelText: "Cancel",
                            }),
                        }),
                        i < customIds.length - 1 ? React.createElement(FormDivider, null) : null,
                    )
                )
            )
            : null,
    );
}

export default {
    onLoad() {
        window.vendetta.metro.common.FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
    },
    onUnload() {
        window.vendetta.metro.common.FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
    },
    settings: Settings,
};
