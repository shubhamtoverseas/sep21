/* eslint-env jest */
import { buildRows, grantsToTemplate, templateToGrants } from "../../Views/Pages/SettingsPage/newui/users/permissions/permissionAdapter";
import catalogue from "../../Views/Pages/SettingsPage/newui/users/permissions/permissionCatalogue.json";

jest.mock("../../utils/translation", () => ({ __esModule: true, default: (key) => key }));

const cat = (id, selected_value) => ({ id, name: id.toUpperCase(), selected_value });
const template = () => ({
    data: [{ module: "employer", category: [
        cat("employer_access", "y"), cat("employer_details_tab", "y"),
        cat("employer_contact_details", "view"), cat("employer_basic_details", "view,edit"), cat("employer_family_details", "y"),
    ] }],
});

describe("Employer *_details keys are token keys (frontend 390, work order 27 Oct)", () => {
    test("the catalogue binds every employer View tick as a `view` token, like Worker / Contracts", () => {
        ["employer.contact_view|single", "employer.basic_view|single", "employer.family_view|single"].forEach((k) => {
            expect(catalogue.bindings[k]).toMatchObject({ model: "SUB", value: "view" });
        });
        expect(catalogue.bindings["employer.details_tab|single"].model).toBe("BOOL");
        /* no key mixes models any more */
        const byKey = new Map();
        Object.values(catalogue.bindings).forEach((b) => {
            if (!b.apiKey || !["BOOL", "SUB", "CSV"].includes(b.model)) return;
            const set = byKey.get(b.apiKey) || new Set();
            set.add(b.model === "BOOL" ? "BOOL" : "TOKEN");
            byKey.set(b.apiKey, set);
        });
        const mixed = [...byKey.entries()].filter(([, set]) => set.size > 1).map(([k]) => k);
        expect(mixed).toEqual([]);
    });

    test("reads the tokens and writes them back; a legacy y is read as not-view until SQL 19 rewrites it", () => {
        const tpl = template();
        const { rows, bindingOf } = buildRows(tpl, {}, "internal");
        const grants = templateToGrants({ template: tpl, rows, bindingOf, audience: "internal" });
        expect(grants["employer.contact_view|single"]).toBe(true);
        expect(grants["employer.contact_edit|single"]).toBe(false);
        expect(grants["employer.basic_view|single"]).toBe(true);
        expect(grants["employer.basic_edit|single"]).toBe(true);
        expect(grants["employer.family_view|single"]).toBe(false);

        const next = grantsToTemplate({ template: tpl, grants: { ...grants, "employer.family_view|single": true, "employer.basic_view|single": false }, rows, bindingOf, audience: "internal" });
        const by = Object.fromEntries(next.data[0].category.map((c) => [c.id, c.selected_value]));
        expect(by.employer_contact_details).toBe("view");
        expect(by.employer_basic_details).toBe("edit");
        expect(by.employer_family_details).toBe("y,view");   /* unknown tokens are carried, never deleted; SQL 19 clears the y */
        expect(by.employer_details_tab).toBe("y");
    });

    test("a key that mixes a BOOL and a token binding is written as tokens and named in dev", () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        const rows = [
            { id: "x.view", module: "x", group: "g", label: "View", type: "boolean", contexts_by_audience: { internal: ["single"] } },
            { id: "x.edit", module: "x", group: "g", label: "Edit", type: "boolean", contexts_by_audience: { internal: ["single"] } },
        ];
        const bindingOf = (id) => (id === "x.view" ? { model: "BOOL", apiKey: "x_key" } : { model: "SUB", apiKey: "x_key", value: "edit" });
        const tpl = { data: [{ module: "x", category: [cat("x_key", "n")] }] };
        const next = grantsToTemplate({ template: tpl, grants: { "x.view|single": true, "x.edit|single": true }, rows, bindingOf, audience: "internal" });
        expect(next.data[0].category[0].selected_value).toBe("n,edit");
        expect(warn).toHaveBeenCalledWith(expect.stringContaining("x_key mixes BOOL and SUB"));
        warn.mockRestore();
    });
});
