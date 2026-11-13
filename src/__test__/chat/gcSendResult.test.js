/* eslint-env jest */
import { gcSendOutcome } from "../../Views/Pages/Conversaction/newui/gcSendResult";

/* CH-11: a fulfilled send thunk is not proof of delivery — the service answers 200 with success:false */
describe("gcSendOutcome", () => {
    it("treats a fulfilled thunk with success:true as sent", () => {
        expect(gcSendOutcome({ payload: { success: true, message: "Message sent" } })).toEqual({ failed: false, message: "Message sent" });
    });

    it("treats a fulfilled thunk with success:false as failed and keeps the server message", () => {
        expect(gcSendOutcome({ payload: { success: false, data: [], message: "Friend identity required" } }))
            .toEqual({ failed: true, message: "Friend identity required" });
    });

    it("treats a rejected thunk as failed and reads the message from the error response", () => {
        const rejected = { error: { message: "Rejected" }, payload: { data: { data: { message: "Token expired" } } } };
        expect(gcSendOutcome(rejected)).toEqual({ failed: true, message: "Token expired" });
    });

    it("returns an empty message when the server sent none", () => {
        expect(gcSendOutcome({ error: {}, payload: { data: "An error occurred" } })).toEqual({ failed: true, message: "" });
    });

    it("does not treat a missing success flag as failure (older responses)", () => {
        expect(gcSendOutcome({ payload: { message: "ok" } }).failed).toBe(false);
    });
});
