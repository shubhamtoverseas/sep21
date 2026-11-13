/* eslint-env jest */
import { createPermissionEngine } from "../../Views/Pages/SettingsPage/newui/users/permissions/permissionEngine";
import { PERMISSION_CATALOGUE } from "../../Views/Pages/SettingsPage/newui/users/permissions/permissionCatalogue";

jest.mock("../../utils/translation", () => ({ __esModule: true, default: (key) => key }));

const engine = createPermissionEngine(PERMISSION_CATALOGUE.rows);
const INTERNAL = "internal";

describe("permission engine (client rules)", () => {
    test("module access gates its children; the child's selection is retained, not cleared", () => {
        const grants = { "worker.send_link|single": true };
        expect(engine.effective(grants, "worker.send_link", "single", INTERNAL)).toBe(false);
        expect(engine.blocking(grants, engine.index["worker.send_link"], "single", INTERNAL)).toBe("worker.access");
        expect(engine.raw(grants, "worker.send_link", "single")).toBe(true);
        expect(engine.effective({ ...grants, "worker.access|single": true }, "worker.send_link", "single", INTERNAL)).toBe(true);
    });

    test("Worker Record access keeps a Restricted floor for the owner contexts, not for Non-Owner", () => {
        const grants = { "worker.access|single": true };
        expect(engine.effective(grants, "worker.record_level", "interpreter", INTERNAL)).toBe("Restricted");
        expect(engine.effective(grants, "worker.record_level", "nonowner", INTERNAL)).toBe("Off");
        expect(engine.floor(engine.index["worker.record_level"], "interpreter")).toBe(true);
        expect(engine.floor(engine.index["worker.record_level"], "nonowner")).toBe(false);
    });

    test("Non-Owner Record access = No access blocks the section's record permissions", () => {
        const grants = { "jo.access|single": true, "jo.record_level|nonowner": "Off", "jo.details|nonowner": true, "jo.edit|nonowner": true };
        expect(engine.effective(grants, "jo.details", "nonowner", INTERNAL)).toBe(false);
        expect(engine.effective(grants, "jo.edit", "nonowner", INTERNAL)).toBe(false);
        expect(engine.effective({ ...grants, "jo.record_level|nonowner": "Restricted" }, "jo.edit", "nonowner", INTERNAL)).toBe(true);
    });

    test("Job Offer Details is locked on for the CS Owner", () => {
        expect(engine.locked(engine.index["jo.details"], "owner")).toBe(true);
        /* the CS Owner select may be No access (backend 269: the package floors Worker only), so the locked row needs its Record access */
        expect(engine.effective({ "jo.access|single": true }, "jo.details", "owner", INTERNAL)).toBe(false);
        expect(engine.effective({ "jo.access|single": true, "jo.record_level|owner": "Restricted" }, "jo.details", "owner", INTERNAL)).toBe(true);
    });

    test("Calendar access is available through an effective Follow Up permission", () => {
        /* Worker Follow Up needs Open Worker Details, which needs Worker access + the (floored) Record access */
        const grants = { "worker.access|single": true, "worker.details_view|interpreter": true, "worker.followup|interpreter": true };
        expect(engine.effective(grants, "worker.followup", "interpreter", INTERNAL)).toBe(true);
        expect(engine.raw(grants, "calendar.access", "single")).toBe(false);
        expect(engine.effective(grants, "calendar.access", "single", INTERNAL)).toBe(true);
    });

    test("diff reports stored changes and knock-on availability", () => {
        const before = { "worker.access|single": true, "worker.send_link|single": true };
        const after = { "worker.send_link|single": true };
        const changes = engine.diff(before, after, INTERNAL);
        const access = changes.find((d) => d.id === "worker.access");
        const sendLink = changes.find((d) => d.id === "worker.send_link");
        expect(access.before).toBe(true); expect(access.after).toBe(false);
        expect(sendLink.before).toBe(sendLink.after); expect(sendLink.effectiveBefore).toBe(true); expect(sendLink.effectiveAfter).toBe(false);
    });

    test("copy never carries ownership eligibility, branch scope or the two management authorities", () => {
        const target = { "users.permissions|single": false, "users.eligibility|single": true };
        const source = { "worker.access|single": true, "assignment.cs_manual|single": true, "jo.branch_central|single": "Full", "users.permissions|single": true, "users.eligibility|single": false };
        const { grants, excluded } = engine.copy(target, source, INTERNAL);
        expect(grants["worker.access|single"]).toBe(true);
        expect(grants["users.permissions|single"]).toBe(false);
        expect(grants["users.eligibility|single"]).toBe(true);
        expect(grants["assignment.cs_manual|single"]).toBeUndefined();
        expect(excluded).toEqual(expect.arrayContaining(["assignment.cs_manual|single", "jo.branch_central|single", "users.permissions|single"]));
    });

    test("partner audience sees only General and Assigned worker contexts", () => {
        const contexts = new Set(PERMISSION_CATALOGUE.rows.flatMap((r) => engine.contexts(r, "partner")));
        expect([...contexts].sort()).toEqual(["partner", "single"]);
        expect(engine.supported(engine.index["jo.access"], "partner")).toBe(false);
    });
});
