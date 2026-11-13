import en from "../../../public/locales/en/translation.json";
import { contractEntryBlockingRef, contractEntryStepNoticeKey } from "../../Views/Pages/insurance/shared/insuranceFormsConfig";

/* Contract entry starts only from Not Ready (INS register #29; verification 15 Oct FN-065), as the server refuses */

describe("Contract entry is blocked only by a record in use (UI verification W17)", () => {
    it("names a record with a pending request or a live period", () => {
        expect(contractEntryBlockingRef({ ref: "IN-HKH000011", inUse: true })).toBe("IN-HKH000011");
    });

    it("lets a Contract whose record has nothing in use (first request withdrawn) start again", () => {
        expect(contractEntryBlockingRef({ ref: "IN-HKH000011", inUse: false })).toBeNull();
        expect(contractEntryBlockingRef(null)).toBeNull();
    });
});

describe("Contract entry step notice", () => {
    it("lets Not Ready (or no step yet) through", () => {
        expect(contractEntryStepNoticeKey("not_ready", false)).toBeNull();
        expect(contractEntryStepNoticeKey(null, false)).toBeNull();
        expect(contractEntryStepNoticeKey(undefined, false)).toBeNull();
    });

    it("stops Request Submitted and Policy Confirmed with the Not Ready notice", () => {
        expect(contractEntryStepNoticeKey("submit_policy_request", false)).toBe("key_ins_contract_step_must_be_not_ready");
        expect(contractEntryStepNoticeKey("ready", false)).toBe("key_ins_contract_step_must_be_not_ready");
        expect(en.key_ins_contract_step_must_be_not_ready).toBe("The Contract Insurance step must be Not Ready.");
    });

    it("always stops Not Required; a new policy after terminal cover is not held to Not Ready", () => {
        expect(contractEntryStepNoticeKey("not_required", false)).toBe("key_ins_contract_step_not_required");
        expect(contractEntryStepNoticeKey("not_required", true)).toBe("key_ins_contract_step_not_required");
        expect(contractEntryStepNoticeKey("ready", true)).toBeNull();
    });
});
