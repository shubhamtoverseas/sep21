/* eslint-env jest */
import { gcRefusalBlockedHit } from "../../Views/Pages/Conversaction/newui/gcRefusal";
import { GC_REFUSAL_CODES } from "../../Views/Pages/Conversaction/newui/gcConstants";
import { findRefusedMessage } from "../../Views/Pages/Conversaction/hooks/useChatMessages";

/* CH-1: the chat service refuses a group send with CONTACT_SHARING_BLOCKED; the timeline drops the refused message,
   gives its text back to the composer and shows the blocked banner */
describe("server refusal of a group send", () => {
    it("uses the code the chat service sends", () => {
        expect(GC_REFUSAL_CODES.CONTACT_SHARING_BLOCKED).toBe("CONTACT_SHARING_BLOCKED");
    });

    it("maps CONTACT_SHARING_BLOCKED to the blocked banner with the server's reason and snippet", () => {
        const refusal = { status: false, code: "CONTACT_SHARING_BLOCKED", message: "…", data: { conversation_sid: 9, reason: "phone", snippet: "9123 4567" } };
        expect(gcRefusalBlockedHit(refusal)).toEqual({ reasonKey: "key_group_blocked_phone", snippet: "9123 4567" });
    });

    it("shows the banner without a reason line when the reason is unknown", () => {
        expect(gcRefusalBlockedHit({ code: "CONTACT_SHARING_BLOCKED", data: { reason: "other" } })).toEqual({ reasonKey: "", snippet: "" });
    });

    it("leaves other refusals to the existing failed handling", () => {
        expect(gcRefusalBlockedHit({ status: false, message: "Token is not valid." })).toBeNull();
        expect(gcRefusalBlockedHit({ status: false, code: "SOMETHING_ELSE" })).toBeNull();
        expect(gcRefusalBlockedHit(undefined)).toBeNull();
    });

    it("finds the latest text message still waiting for the server", () => {
        const sent = { id: 41, body: "earlier", media_type: "text" };
        const failed = { id: "", body: "failed one", media_type: "text", status: "failed" };
        const file = { id: "", body: "scan.pdf", media_type: "file", status: "sending" };
        const pending = { id: "", body: "call me 9123 4567", media_type: "text", status: "sending" };
        expect(findRefusedMessage([sent, pending, failed, file])).toBe(pending);
        expect(findRefusedMessage([sent, failed, file])).toBeNull();
        expect(findRefusedMessage(undefined)).toBeNull();
    });
});
