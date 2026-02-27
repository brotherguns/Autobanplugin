// No imports - use window.vendetta directly (Kettu evals plugins inside a function body)

// ─── Default known scam attachment IDs ───────────────────────────────────────
// Add the raw numeric ID from the CDN URL:
// https://cdn.discordapp.com/attachments/CHANNEL_ID/**ATTACHMENT_ID**/image.png
const DEFAULT_SCAM_IDS: string[] = [
  "1476688857930924105",
  "1476688858375782701",
  "1476688858774110268",
  "1476688859076104313",
];

// ─── Session dedup (don't ?ban the same person twice per session) ─────────────
const bannedThisSession = new Set<string>();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScamIds(): string[] {
  try {
    const custom: string[] = (window as any).vendetta.storage.customIds ?? [];
    return [...DEFAULT_SCAM_IDS, ...custom];
  } catch {
    return [...DEFAULT_SCAM_IDS];
  }
}

// Pull all attachment IDs out of a plain-text message body.
// Scammers paste raw CDN links instead of uploading files, so
// message.attachments is [] but message.content has the URL.
function extractIdsFromContent(content: string): string[] {
  const ids: string[] = [];
  const re = /cdn\.discordapp\.com\/attachments\/\d+\/(\d+)\//g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) ids.push(m[1]);
  return ids;
}

// Core check: does this message contain a known scam image?
function checkAndBan(message: any, guildId: string | undefined, channelId: string): void {
  // Skip bots, skip DMs (no guildId = DM)
  if (!message?.author || message.author.bot) return;
  if (!guildId) return;

  const scamIds = getScamIds();
  let found = false;

  // 1. Check proper attachment objects (in case they come through normally)
  if (message.attachments?.length) {
    for (const att of message.attachments) {
      // att.id is the attachment snowflake; fall back to parsing the URL
      const attId: string =
        att.id ?? att.url?.match(/\/attachments\/\d+\/(\d+)\//)?.[1] ?? "";
      if (attId && scamIds.includes(attId)) {
        found = true;
        break;
      }
    }
  }

  // 2. Check plain-text content for CDN links (THIS is what was missing before)
  if (!found && message.content) {
    for (const id of extractIdsFromContent(message.content)) {
      if (scamIds.includes(id)) {
        found = true;
        break;
      }
    }
  }

  if (!found) return;
  if (bannedThisSession.has(message.author.id)) return;

  bannedThisSession.add(message.author.id);

  try {
    const sendMessage = (window as any).vendetta.metro.findByProps("sendMessage");
    sendMessage.sendMessage(channelId, { content: `?ban ${message.author.id}` });
  } catch (e) {
    console.error("[AutoBan] Failed to send ban command:", e);
  }
}

// ─── Flux handler ─────────────────────────────────────────────────────────────

function onMessageCreate(event: any): void {
  checkAndBan(event.message, event.guildId, event.channelId);
}

// ─── Settings page ────────────────────────────────────────────────────────────

function SettingsPage(): any {
  const React = (window as any).vendetta.metro.common.React;
  const { FormSection, FormRow, FormInput, FormDivider } =
    (window as any).vendetta.ui.components.Forms;
  const storage = (window as any).vendetta.storage;

  const [inputValue, setInputValue] = React.useState("");
  const [customIds, setCustomIds] = React.useState<string[]>(
    storage.customIds ?? []
  );

  function addId(): void {
    const raw: string = inputValue.trim();
    if (!raw) return;

    // Accept either a full CDN URL or a bare numeric ID
    const match = raw.match(/\/attachments\/\d+\/(\d+)\//);
    const id = match ? match[1] : raw;

    if (!id.match(/^\d+$/)) {
      // Not a valid snowflake
      return;
    }
    if (customIds.includes(id) || DEFAULT_SCAM_IDS.includes(id)) {
      setInputValue("");
      return;
    }

    const updated = [...customIds, id];
    storage.customIds = updated;
    setCustomIds(updated);
    setInputValue("");
  }

  function removeId(id: string): void {
    const updated = customIds.filter((x: string) => x !== id);
    storage.customIds = updated;
    setCustomIds(updated);
  }

  return React.createElement(
    React.Fragment,
    null,

    // ── Default IDs (read-only) ──
    React.createElement(
      FormSection,
      { title: "Default Scam IDs (built-in)" },
      ...DEFAULT_SCAM_IDS.map((id: string) =>
        React.createElement(FormRow, {
          key: id,
          label: id,
          subLabel: "Built-in — cannot be removed",
        })
      )
    ),

    // ── Add new ID ──
    React.createElement(
      FormSection,
      { title: "Add a Scam ID" },
      React.createElement(FormInput, {
        placeholder: "Paste CDN URL or numeric attachment ID",
        value: inputValue,
        onChange: (v: string) => setInputValue(v),
        returnKeyType: "done",
        onSubmitEditing: addId,
      }),
      React.createElement(FormRow, {
        label: "Add ID",
        onPress: addId,
      })
    ),

    // ── Custom IDs (removable) ──
    customIds.length > 0 &&
      React.createElement(
        FormSection,
        { title: "Custom Scam IDs" },
        ...customIds.map((id: string) =>
          React.createElement(FormRow, {
            key: id,
            label: id,
            subLabel: "Tap to remove",
            onPress: () => removeId(id),
          })
        )
      )
  );
}

// ─── Plugin lifecycle ─────────────────────────────────────────────────────────

export default {
  onLoad() {
    const { FluxDispatcher } = (window as any).vendetta.metro.common;
    FluxDispatcher.subscribe("MESSAGE_CREATE", onMessageCreate);

    // Register settings page
    (window as any).vendetta.ui.settings.registerSettings(
      "AutoBanScammer",
      SettingsPage
    );
  },

  onUnload() {
    const { FluxDispatcher } = (window as any).vendetta.metro.common;
    FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessageCreate);
    bannedThisSession.clear();
  },
};
