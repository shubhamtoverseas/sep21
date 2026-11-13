import { CHAT_DRAFT_STORAGE_PREFIX } from "./chatConstants";

const draftKey = (sid, platform) => `${ CHAT_DRAFT_STORAGE_PREFIX }:${ sid }:${ platform || "app" }`;

export const loadChatDraft = (sid, platform) => {
    try { return sessionStorage.getItem(draftKey(sid, platform)) || ""; } catch { return ""; }
};

export const saveChatDraft = (sid, platform, text) => {
    try {
        if (text) sessionStorage.setItem(draftKey(sid, platform), text);
        else sessionStorage.removeItem(draftKey(sid, platform));
    } catch { /* storage unavailable */ }
};
