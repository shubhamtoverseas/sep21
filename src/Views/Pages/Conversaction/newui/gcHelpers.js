import routesConfig from "../../routes/routesConfig/index";
import { getCurrentUser, hasPermission } from "../../../../services/commonService";
import { workerDetailsPath } from "../../WorkerPage/workerModuleConstants";
import { GC_CHANNEL_META, GC_STAKE_TYPES, GC_WA_CLOSING_THRESHOLD_MS } from "./gcConstants";
export { GC_CHANNEL_META, GC_STAKE_TYPES };

export const gcStakeClass = (friendType) => (GC_STAKE_TYPES[friendType] || GC_STAKE_TYPES.user).cls;
export const gcStakeAvatar = (friendType) => (GC_STAKE_TYPES[friendType] || GC_STAKE_TYPES.user).avatar;

export const gcRowStakeType = (row) => (
    row?.friend_type === "user" && row?.staff_type === "partner" ? "partner" : row?.friend_type
);

export const gcGroupKey = (row) =>
    row?.friend_type === "group_team"
        ? `group:${ row?.conversation_sid }`
        : `${ gcRowStakeType(row) }:${ row?.user_id }`;

const lastMessageTime = (row) => {
    const t = row?.last_message_ceated_at || row?.created_at;
    const ms = t ? new Date(t).getTime() : 0;
    return Number.isNaN(ms) ? 0 : ms;
};

/**
 * Groups the per-platform conversation rows into one conversation per
 * stakeholder. Each group keeps every underlying row (per channel), the most
 * recent row (drives preview/time/last channel) and the aggregate unread count.
 */
export const groupConversations = (rows) => {
    const map = new Map();
    (rows || []).forEach((row) => {
        if (!row) return;
        const key = gcGroupKey(row);
        let group = map.get(key);
        if (!group) {
            group = { key, friendType: gcRowStakeType(row), rows: [], byPlatform: {}, unread: 0, latestRow: row };
            map.set(key, group);
        }
        group.rows.push(row);
        if (!group.byPlatform[row.platform] || lastMessageTime(row) > lastMessageTime(group.byPlatform[row.platform])) {
            group.byPlatform[row.platform] = row;
        }
        group.unread += Number(row.unread_message) || 0;
        if (lastMessageTime(row) > lastMessageTime(group.latestRow)) group.latestRow = row;
    });
    return [...map.values()].sort((a, b) => lastMessageTime(b.latestRow) - lastMessageTime(a.latestRow));
};

export const gcGroupParts = (row) => {
    if (row?.friend_type !== "group_team" || !row?.employer_name) return null;
    return { employer: row.employer_name, zh: row.employer_chinese_name || "", worker: row.worker_name || "" };
};

export const gcGroupName = (group) => {
    const row = group?.latestRow;
    if (!row) return "";
    if (row.friend_type !== "group_team") return String(row.name || "").replace(/\s*\(partner\)\s*$/i, "");
    const parts = gcGroupParts(row);
    if (!parts) return row.friendly_name;
    return `${ parts.employer }${ parts.zh ? ` · ${ parts.zh }` : "" }${ parts.worker ? ` x ${ parts.worker }` : "" }`;
};

const GC_MEMBER_KEY = { employer: "key_employer", worker: "key_worker", cs: "key_cs", interpreter: "key_interpreter" };
export const gcGroupMemberKeys = (row) => (
    Array.isArray(row?.members) ? row.members.map((m) => GC_MEMBER_KEY[String(m).toLowerCase()]).filter(Boolean) : []
);

/* Translations follow the staff member's app language (top bar), not a chat-only setting:
 * app language → the message's content_<lang> field key (LANG_FIELD) and the saved chat language. */
const GC_APP_TO_CHAT_LANGUAGE = { en: "en", zh_HK: "zh_tw", zh_TW: "zh_tw", zh_CN: "zh_cn", in: "id", id: "id" };
export const gcChatLanguage = (appLanguage) =>
    GC_APP_TO_CHAT_LANGUAGE[String(appLanguage || "en").replace("-", "_")] || "en";

const GC_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const gcListTime = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
        const h = d.getHours();
        const m = d.getMinutes();
        return `${ h < 10 ? "0" + h : h }:${ m < 10 ? "0" + m : m }`;
    }
    return `${ d.getDate() } ${ GC_MONTHS[d.getMonth()] }`;
};

/* "FRIDAY 22 AUG" — day separator label (IST, consistent with message times). */
const GC_DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const IST_OFFSET = 5.5 * 60 * 60 * 1000;
export const gcDayLabel = (dateString) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "";
    const ist = new Date(d.getTime() + IST_OFFSET);
    return `${ GC_DAYS[ist.getUTCDay()] } ${ ist.getUTCDate() } ${ GC_MONTHS[ist.getUTCMonth()].toUpperCase() }`;
};

export const gcLinkify = (text) => {
    const value = String(text || "");
    if (!value) return value;
    if (/<a\s/i.test(value)) {
        /* existing anchors (template bodies) must also open in a new tab */
        return value.replace(/<a\s(?![^>]*target=)/gi, '<a target="_blank" rel="noopener noreferrer" ');
    }
    return value.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
};

export const gcSnippet = (str = "") => String(str || "").replace(/<[^>]*>/g, "");

/* Thread search (prototype Gap 14b): a message matches on its original text, its translation or its sender name. */
export const gcMessageMatches = (msg, term, langField) => (
    `${ gcSnippet(msg?.body) } ${ gcSnippet(langField ? msg?.[langField] : "") } ${ msg?.full_name || "" }`
        .toLowerCase()
        .includes(term)
);

/* Wraps each case-insensitive match of `term` in <mark class="gc-th-hit">, in text only: tags and entities stay intact. */
export const gcHighlightHtml = (html, term) => {
    const value = String(html ?? "");
    if (!term) return value;
    const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    return value
        .split(/(<[^>]*>|&[#\w]+;)/)
        .map((part) => (part.startsWith("<") || /^&[#\w]+;$/.test(part)
            ? part
            : part.replace(rx, (match) => `<mark class="gc-th-hit">${ match }</mark>`)))
        .join("");
};

export const gcInitials = (name = "") =>
    String(name)
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

export const gcBlockCheck = (text) => {
    const scrub = String(text || "")
        .replace(/JO-\d{4}-\d{3,6}/gi, " ")
        .replace(/E-(HK|TW)-\d{4,8}/gi, " ")
        .replace(/\b[A-Z]{3}\d{6}(-[A-Z0-9]+)?\b/g, " ")
        .replace(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/g, " ")
        .replace(/\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b/g, " ")
        .replace(/\b\d{1,2}\s?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s?\d{0,4}\b/gi, " ")
        .replace(/\b\d{1,2}[:.]\d{2}\s?(AM|PM)?\b/gi, " ");
    let match;
    if ((match = scrub.match(/\+?\d[\d\s-]{6,}\d/))) return { reasonKey: "key_group_blocked_phone", snippet: match[0].trim() };
    if ((match = scrub.match(/[\w.+-]+@[\w-]+\.[\w.-]+/))) return { reasonKey: "key_group_blocked_email", snippet: match[0] };
    if ((match = scrub.match(/whats?app|wa\.me|line id|wechat|telegram|signal|私下|加我/i))) return { reasonKey: "key_group_blocked_contact", snippet: match[0] };
    if ((match = scrub.match(/meet (outside|offline)/i))) return { reasonKey: "key_group_blocked_meeting", snippet: match[0] };
    return null;
};

export const gcCanOpenDetails = (kind, permissionList) => {
    const isPartnerStaff = getCurrentUser()?.data?.staff?.staff_type === "partner";
    if (kind === "worker") {
        return isPartnerStaff
            ? hasPermission(permissionList?.data, "partner_worker", "partner_worker_access")
            : hasPermission(permissionList?.data, "worker", "worker_access");
    }
    return hasPermission(permissionList?.data, "employer", "employer_access");
};

export const GC_HANDOFF_PARAM = "from";
export const GC_HANDOFF_VALUE = "global-chat";

export const gcDetailsPath = (kind, id, params) => {
    if (!id) return null;
    const handoff = { ...(params || {}), [GC_HANDOFF_PARAM]: GC_HANDOFF_VALUE };
    /* Worker Details: the Worker module's one path builder */
    if (kind === "worker") return workerDetailsPath(id, handoff);
    const base = routesConfig.employerDetails.split("/:")[0];
    const query = Object.entries(handoff)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${ encodeURIComponent(k) }=${ encodeURIComponent(v) }`)
        .join("&");
    return `${ base }/${ id }${ query ? `?${ query }` : "" }`;
};

/**
 * WhatsApp 24h window. `wa_window_expires_at` (null until the contact's
 * first reply) drives the countdown; when absent the boolean-era fields
 * (isActiveSeason + receiver_lastMessage) decide the state without a label.
 * States: open | warn (under GC_WA_CLOSING_THRESHOLD_MS left, still sendable) | expired | unverified.
 */
export const gcWaWindow = (userDetailInfo) => {
    const raw = userDetailInfo?.wa_window_expires_at;
    const expiresAt = raw ? new Date(raw).getTime() : NaN;
    if (!Number.isNaN(expiresAt)) {
        const remaining = expiresAt - Date.now();
        if (remaining > 0) {
            const mins = Math.floor(remaining / 60000);
            const label = `${ Math.floor(mins / 60) }h ${ mins % 60 }m`;
            return { state: remaining < GC_WA_CLOSING_THRESHOLD_MS ? "warn" : "open", label };
        }
        return { state: "expired", label: null };
    }
    if (userDetailInfo?.isActiveSeason) return { state: "open", label: null };
    return { state: userDetailInfo?.receiver_lastMessage ? "expired" : "unverified", label: null };
};

/* Lock-state view of the window (warn still allows free text). */
export const gcWaWindowState = (userDetailInfo) => {
    const { state } = gcWaWindow(userDetailInfo);
    return state === "warn" ? "open" : state;
};

/* Share-link messages/drafts are a single anchor pointing at the worker or
 * job view. Parsed for the applicant-link card rendering (bubble + composer). */
const APPLINK_RE = /^\s*<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>\s*$/i;

const APPLINK_TAIL_RE = /^([\s\S]*?)(?:<br\s*\/?>|\n)?\s*<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>\s*$/i;
export const gcParseShareMessage = (body) => {
    const match = APPLINK_TAIL_RE.exec(String(body || ""));
    if (!match) return null;
    const href = match[2];
    const isWorker = href.includes("worker_id=");
    const isJob = !isWorker && href.includes("job_id=");
    if (!isWorker && !isJob) return null;
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (/</.test(match[1].replace(/<br\s*\/?>/gi, ""))) return null;
    return { href, text, label: match[3].trim(), titleKey: isWorker ? "key_jo_applicant_details" : "key_job_offer" };
};

export const gcParseShareLink = (body) => {
    const match = APPLINK_RE.exec(String(body || ""));
    if (!match) return null;
    const href = match[1];
    const isWorker = href.includes("worker_id=");
    const isJob = !isWorker && href.includes("job_id=");
    if (!isWorker && !isJob) return null;
    return { href, label: match[2].trim(), titleKey: isWorker ? "key_jo_applicant_details" : "key_job_offer" };
};

/* Editor HTML (template bodies) → plain text for the editable textarea:
 * block breaks become newlines, anchors keep their URL, entities decode. */
const HTML_ENTITIES = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'", "&apos;": "'" };
export const gcHtmlToText = (html) => {
    if (!html) return "";
    const text = String(html)
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
        .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (m, href, label) => {
            const t = label.replace(/<[^>]+>/g, "").trim();
            return t && t !== href ? `${ t } (${ href })` : href;
        })
        .replace(/<[^>]+>/g, "")
        .replace(/&(nbsp|amp|lt|gt|quot|#39|apos);/g, (m) => HTML_ENTITIES[m] ?? m);
    return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
};

/* true only when the clipboard really took the text */
export const gcCopyText = (text) => new Promise((resolve) => {
    try {
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(() => resolve(true), () => resolve(false));
            return;
        }
    } catch { /* clipboard unavailable */ }
    resolve(false);
});

