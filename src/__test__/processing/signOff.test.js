/* eslint-env jest */
import { signOffColumnTitles, signOffHint, signOffOf, signOffRefusalCode } from "../../Views/Pages/ProcessingPage/processing-detail/signOff";

jest.mock("../../utils/translation", () => ({ __esModule: true, default: (key) => key }));

/* Prepared / Ready marks are the register owner's act (admin API CHANGE_HISTORY 252) */
describe("signOffOf", () => {
    it("reads the per-register gates and blockers from sign_off", () => {
        const so = signOffOf({ sign_off: { can_mark_prepared: true, can_mark_ready: false, prepared_blocker: null, ready_blocker: "not_holder" } }, true);
        expect(so).toEqual({ canPrepared: true, canReady: false, preparedBlocker: null, readyBlocker: "not_holder" });
    });

    it("ignores Edit when sign_off is present", () => {
        const so = signOffOf({ sign_off: { can_mark_prepared: false, can_mark_ready: false, prepared_blocker: "unassigned", ready_blocker: "unassigned" } }, true);
        expect(so.canPrepared).toBe(false);
        expect(so.canReady).toBe(false);
    });

    it("falls back to the legacy Edit rule when the response carries no sign_off", () => {
        expect(signOffOf({}, true)).toEqual({ canPrepared: true, canReady: true, preparedBlocker: null, readyBlocker: null });
        expect(signOffOf(null, false)).toEqual({ canPrepared: false, canReady: false, preparedBlocker: "no_edit", readyBlocker: "no_edit" });
    });
});

describe("signOffHint / signOffColumnTitles", () => {
    it("names the holder on not_holder and stays silent on no_edit", () => {
        expect(signOffHint("prepared", "unassigned")).toBe("key_cr_signoff_prepared_unassigned");
        expect(signOffHint("ready", "not_holder", "Linda W.")).toBe("key_cr_signoff_ready_not_holder (Linda W.)");
        expect(signOffHint("prepared", "no_edit")).toBe("");
    });

    it("gives a tooltip only to a blocked column", () => {
        const titles = signOffColumnTitles({ canPrepared: true, canReady: false, preparedBlocker: null, readyBlocker: "unassigned" });
        expect(titles).toEqual({ prepared: undefined, ready: "key_cr_signoff_ready_unassigned" });
    });
});

describe("signOffRefusalCode", () => {
    const rejected = (code) => ({ error: {}, payload: { data: { data: { code, message: "refused" } } } });
    it("recognises the four 403 codes and nothing else", () => {
        ["NOT_PREPARED_OWNER", "NOT_READY_OWNER", "PREPARED_OWNER_UNASSIGNED", "READY_OWNER_UNASSIGNED"].forEach((code) => expect(signOffRefusalCode(rejected(code))).toBe(code));
        expect(signOffRefusalCode(rejected("STALE_VERSION"))).toBeNull();
        expect(signOffRefusalCode({ error: {}, payload: { data: "An error occurred" } })).toBeNull();
        expect(signOffRefusalCode({ payload: { status: true } })).toBeNull();
    });
});
