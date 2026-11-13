import { GC_BLOCK_REASON_KEYS, GC_REFUSAL_CODES } from "./gcConstants";

/* CH-1: a group send the chat service refused with CONTACT_SHARING_BLOCKED → the blocked banner's hit
   ({ reasonKey, snippet }, the shape gcBlockCheck returns); null for any other refusal */
export const gcRefusalBlockedHit = (refusal) => {
    if (refusal?.code !== GC_REFUSAL_CODES.CONTACT_SHARING_BLOCKED) return null;
    return {
        reasonKey: GC_BLOCK_REASON_KEYS[refusal?.data?.reason] || "",
        snippet: refusal?.data?.snippet || "",
    };
};
