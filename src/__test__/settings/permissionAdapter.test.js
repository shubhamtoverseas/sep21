/* eslint-env jest */
import { buildRows, grantsToTemplate, ownershipFromGrants, templateToGrants } from "../../Views/Pages/SettingsPage/newui/users/permissions/permissionAdapter";

jest.mock("../../utils/translation", () => ({ __esModule: true, default: (key) => key }));

const cat = (id, selected_value, extra = {}) => ({ id, name: id.toUpperCase(), selected_value, ...extra });
const template = () => ({
    data: [
        { module: "worker", category: [
            cat("worker_access", "y"), cat("worker_global_list", "n"), cat("worker_access_type", "restricted"), cat("worker_send_link", "y"),
            cat("worker_global_onboarding", "owner"), cat("worker_record_access_non_owner", "restricted"),
            /* backend 269: the enable key is served deprecated with a derived value and must never be sent back */
            cat("worker_access_interpreter_onboarding_non_owner", "y", { deprecated: true, replaced_by: "worker_record_access_non_owner" }),
            cat("worker_global_type", "local,legacy_token", { values: [{ id: "local", name: "Local" }, { id: "overseas", name: "Overseas" }] }),
            cat("worker_checkin_branch", "7", { values: [{ id: 7, branch_name: "Central" }, { id: 9, branch_name: "Shatin" }] }),
            cat("worker_interpreter_owner_worker_contact_details", "view"), cat("worker_interpreter_owner_worker_biodata", "view,edit"),
        ] },
        { module: "settings", category: [cat("settings_access", "y"), cat("view_template", "n"), cat("add_template", "n"), cat("edit_template", "n"), cat("delete_template", "n")] },
    ],
});
const lists = { branches: [{ id: 7, branch_name: "Central" }, { id: 9, branch_name: "Shatin" }], languages: [{ id: 1, name: "Cantonese" }, { id: 2, name: "English" }], nationalities: [{ id: 3, name: "Filipino" }], onboarding2Nationalities: [{ id: 3, name: "Filipino" }] };
const user = { cs_assign_type: "both", cs_branches: "7", cs_employer_language: [1, 2], cs_priority_assign: "2", interpreter_assign_type: "manual", interpreter_worker_type: "1,2", interpreter_worker_nationality: "3" };

describe("permission adapter (API template ⇄ grants)", () => {
    const tpl = template();
    const { rows, bindingOf } = buildRows(tpl, lists, "internal");
    const grants = templateToGrants({ template: tpl, rows, bindingOf, audience: "internal", user, form: { prepared_groups: [1, 3], ready_groups: [] } });

    test("reads booleans, levels, radios, csv tokens and API-provided option lists", () => {
        expect(grants["worker.access|single"]).toBe(true);
        expect(grants["worker.navigation|single"]).toBe(false);
        expect(grants["worker.search|single"]).toBe("Restricted");
        expect(grants["worker.filter_onboarding_owner|single"]).toBe(true);
        expect(grants["worker.filter_onboarding_all_staff|single"]).toBe(false);
        expect(grants["worker.record_level|nonowner"]).toBe("Restricted");
        expect(grants["worker.contact_view|interpreter"]).toBe(true);
        expect(grants["worker.contact_edit|interpreter"]).toBe(false);
        expect(grants["worker.biodata_edit|interpreter"]).toBe(true);
        /* option groups come from the category values, not the specification's sample names */
        expect(rows.some((r) => r.id === "worker.worker_global_type#local")).toBe(true);
        expect(rows.some((r) => r.id === "worker.filter_type_local")).toBe(false);
        expect(rows.some((r) => r.id === "worker.filter_profile_available")).toBe(true);   /* no values in this template → specification rows stay */
        expect(grants["worker.worker_global_type#local|single"]).toBe(true);
        expect(grants["worker.worker_global_type#overseas|single"]).toBe(false);
        expect(grants["worker.worker_checkin_branch#7|single"]).toBe(true);
    });

    test("reads ownership eligibility from the staff record and the Prepared / Ready form fields", () => {
        expect(grants["assignment.cs_manual|single"]).toBe(true);
        expect(grants["assignment.cs_round_robin|single"]).toBe(true);
        expect(grants["assignment.cs_branches#7|single"]).toBe(true);
        expect(grants["assignment.cs_branches#9|single"]).toBe(false);
        expect(grants["assignment.cs_priority_assign#2|single"]).toBe(true);
        expect(grants["assignment.cs_employer_language#1|single"]).toBe(true);
        expect(grants["assignment.interpreter_type_local|single"]).toBe(true);
        expect(grants["assignment.prepared_group_1|single"]).toBe(true);
        expect(grants["assignment.prepared_group_2|single"]).toBe(false);
    });

    test("writes back into the same categories, keeps unknown tokens and fans out collapsed controls", () => {
        const next = {
            ...grants,
            "worker.access|single": false, "worker.search|single": "Full", "worker.filter_onboarding_all_staff|single": true, "worker.record_level|nonowner": "Off",
            "worker.contact_edit|interpreter": true, "worker.worker_global_type#overseas|single": true, "worker.worker_global_type#local|single": false, "settings.send_templates|single": true,
        };
        const out = grantsToTemplate({ template: tpl, grants: next, rows, bindingOf, audience: "internal" });
        const by = Object.fromEntries(out.data.flatMap((m) => m.category.map((c) => [c.id, c.selected_value])));
        expect(by.worker_access).toBe("n");
        expect(by.worker_access_type).toBe("full_access");
        expect(by.worker_global_onboarding).toBe("owner,all");   /* backend 273: two grants as a CSV, All ⊇ Owner */
        expect(by.worker_record_access_non_owner).toBe("off");   /* "No access" is `off`, never "" (backend 269) */
        expect("worker_access_interpreter_onboarding_non_owner" in by).toBe(false);
        expect(by.worker_interpreter_owner_worker_contact_details).toBe("view,edit");
        expect(by.worker_global_type).toBe("legacy_token,overseas");
        expect(by.view_template).toBe("y"); expect(by.add_template).toBe("y"); expect(by.edit_template).toBe("y"); expect(by.delete_template).toBe("y");
        /* the input template is untouched */
        expect(tpl.data[0].category.find((c) => c.id === "worker_access").selected_value).toBe("y");
    });

    test("derives the ownership payload the user endpoints expect", () => {
        const payload = ownershipFromGrants({ grants, rows, bindingOf, audience: "internal" });
        expect(payload.is_cs).toBe(1);
        expect(payload.cs_assign_type).toBe("both");
        expect(payload.cs_branches).toEqual([7]);
        expect(payload.cs_employer_language).toEqual([1, 2]);
        expect(payload.cs_priority_assign).toEqual([2]);   /* backend 264: an array, even for one language (SQL 15 applied 26 Oct) */
        expect(payload.interpreter_assign_type).toBe("manual");
        expect(payload.interpreter_worker_type).toEqual([1, 2]);
        expect(payload.is_onboarding1).toBe(0);
        expect(payload.prepared_groups).toEqual([1, 3]);
        expect(payload.ready_groups).toEqual([]);
    });
});
