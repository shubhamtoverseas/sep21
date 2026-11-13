/* eslint-env jest */
import { applyMessageStatus } from "../../Views/Pages/Conversaction/hooks/useChatMessages";

/* CH-2: the chat service emits receive_message_status { id, message_id, read_status, at } as a WhatsApp message moves
   sent → delivered → read, or fails; the bubble follows without a reload */
describe("WhatsApp delivery status on the timeline", () => {
    const list = [
        { id: 7, body: "earlier", read_status: "read" },
        { id: 9, body: "template", read_status: "unread" },
        { id: "", body: "still sending", status: "sending" },
    ];

    it("moves the matching message to the new status", () => {
        const next = applyMessageStatus(list, { id: 9, message_id: 9, read_status: "delivered", at: "2026-10-26T08:38:30.000Z" });
        expect(next[1]).toEqual({ id: 9, body: "template", read_status: "delivered" });
        expect(next[0]).toBe(list[0]);
        expect(next[2]).toBe(list[2]);
    });

    it("marks a failed WhatsApp message Failed", () => {
        expect(applyMessageStatus(list, { id: 9, read_status: "failed" })[1]).toEqual({ id: 9, body: "template", read_status: "failed", status: "failed" });
    });

    it("ignores a status without a message id", () => {
        expect(applyMessageStatus(list, { read_status: "delivered" })).toBe(list);
        expect(applyMessageStatus(list, undefined)).toBe(list);
    });
});
