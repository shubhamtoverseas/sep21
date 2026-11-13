/* eslint-env jest */
import React, { Suspense } from "react";
import i18n from "i18next";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* PROMPT 4 Part B (owner answers 10 Nov 2026):
   1. Settings › Permissions: Insurance Record branch scope is one No access / Restricted / Full level per branch, stored as
      insurance_access_branch (every branch with access) + insurance_access_branch_restricted (the Restricted ones, Q-07);
      Insurance Remarks (insurance_remarks, Q-05) is a yes / no row under Open Details.
   2. The Insurance remarks panel follows the server's Insurance Remarks grant for every account: the shared panel's admin
      shortcut does not apply to Insurance (user 1 holds no insurance_remarks). Other modules keep their rule.
   Both fail on 803865412 (no level, no Remarks row; the admin saw Add / Edit / Delete). */

jest.mock("../../services/remarks", () => ({ getInsuranceRemarks: jest.fn(), getInvoiceRemarks: jest.fn(), addEditInsuranceRemarks: jest.fn(), removeInsuranceRemarks: jest.fn() }));
jest.mock("../../services/commonService", () => ({
    ...jest.requireActual("../../services/commonService"),
    getCurrentUser: () => ({ data: { id: 1 } }),
    isAdminUser: () => true,
    hasAnyModulePermission: () => false,
}));
// eslint-disable-next-line import/first
import remarksReducer from "../../redux/Slices/remarks/RemarkSlice";
// eslint-disable-next-line import/first
import InsuranceRemarks from "../../Views/Pages/insurance/record/InsuranceRemarks";
// eslint-disable-next-line import/first
import { buildRows, grantsToTemplate, templateToGrants } from "../../Views/Pages/SettingsPage/newui/users/permissions/permissionAdapter";
// eslint-disable-next-line import/first
import { PERMISSION_CATALOGUE, bindingFor } from "../../Views/Pages/SettingsPage/newui/users/permissions/permissionCatalogue";
// eslint-disable-next-line import/first
import { keyIndex, labelForKey } from "../../Views/Pages/SettingsPage/newui/users/permissions/permissionHistory";

const BRANCHES = [{ id: 1, branch_name: "Central" }, { id: 2, branch_name: "Causeway Bay" }, { id: 3, branch_name: "Mong Kok" }];
const cat = (id, selected_value, extra = {}) => ({ id, name: id.toUpperCase(), selected_value, ...extra });
const insuranceTemplate = (withRestricted = true) => ({
    data: [{
        module: "insurance",
        category: [
            cat("insurance_access", "y"), cat("insurance_details_view", "y"), cat("insurance_remarks", ""),
            cat("insurance_access_branch", "1,2,99", { values: BRANCHES }),
            ...(withRestricted ? [cat("insurance_access_branch_restricted", "2", { values: BRANCHES })] : []),
        ],
    }],
});
const categoryOf = (tpl, id) => tpl.data[0].category.find((c) => c.id === id);

describe("Settings › Permissions: Insurance Record branch scope level and Insurance Remarks", () => {
    test("each branch reads No access / Restricted / Full from the two keys", () => {
        const tpl = insuranceTemplate();
        const { rows, bindingOf } = buildRows(tpl, {}, "internal");
        const branchRows = rows.filter((r) => r.id.startsWith("insurance.insurance_access_branch#"));
        expect(branchRows.map((r) => [r.label, r.type])).toEqual([["Central", "level"], ["Causeway Bay", "level"], ["Mong Kok", "level"]]);
        const grants = templateToGrants({ template: tpl, rows, bindingOf, audience: "internal" });
        expect(grants["insurance.insurance_access_branch#1|single"]).toBe("Full");
        expect(grants["insurance.insurance_access_branch#2|single"]).toBe("Restricted");
        expect(grants["insurance.insurance_access_branch#3|single"]).toBe("Off");
    });

    test("a save writes both keys; ids the screen does not show are kept", () => {
        const tpl = insuranceTemplate();
        const { rows, bindingOf } = buildRows(tpl, {}, "internal");
        const grants = templateToGrants({ template: tpl, rows, bindingOf, audience: "internal" });
        const next = grantsToTemplate({
            template: tpl, rows, bindingOf, audience: "internal",
            grants: { ...grants, "insurance.insurance_access_branch#1|single": "Restricted", "insurance.insurance_access_branch#2|single": "Full", "insurance.insurance_access_branch#3|single": "Restricted" },
        });
        expect(categoryOf(next, "insurance_access_branch").selected_value).toBe("99,1,2,3");
        expect(categoryOf(next, "insurance_access_branch_restricted").selected_value).toBe("1,3");
        const cleared = grantsToTemplate({
            template: tpl, rows, bindingOf, audience: "internal",
            grants: { ...grants, "insurance.insurance_access_branch#1|single": "Off", "insurance.insurance_access_branch#2|single": "Off" },
        });
        expect(categoryOf(cleared, "insurance_access_branch").selected_value).toBe("99");
        expect(categoryOf(cleared, "insurance_access_branch_restricted").selected_value).toBe("");
    });

    test("against an API without the Restricted key the branch stays a tick, so Restricted is never saved as Full", () => {
        const tpl = insuranceTemplate(false);
        const { rows, bindingOf } = buildRows(tpl, {}, "internal");
        const central = rows.find((r) => r.id === "insurance.insurance_access_branch#1");
        expect(central.type).toBe("boolean");
        const grants = templateToGrants({ template: tpl, rows, bindingOf, audience: "internal" });
        expect(grants["insurance.insurance_access_branch#2|single"]).toBe(true);
    });

    test("Insurance Remarks is its own yes / no row under Open Details, bound to insurance_remarks", () => {
        const row = PERMISSION_CATALOGUE.rows.find((r) => r.id === "insurance.remarks");
        expect(row).toMatchObject({ module: "insurance", group: "Record actions", label: "Insurance Remarks", type: "boolean", parents: ["insurance.access", "insurance.details"] });
        expect(bindingFor("insurance.remarks", "single", "internal")).toEqual({ model: "BOOL", apiKey: "insurance_remarks" });
        const tpl = insuranceTemplate();
        const { rows, bindingOf } = buildRows(tpl, {}, "internal");
        const grants = templateToGrants({ template: tpl, rows, bindingOf, audience: "internal" });
        expect(grants["insurance.remarks|single"]).toBe(false);
        const next = grantsToTemplate({ template: tpl, rows, bindingOf, audience: "internal", grants: { ...grants, "insurance.remarks|single": true } });
        expect(categoryOf(next, "insurance_remarks").selected_value).toBe("y");
    });

    test("the history names the Restricted key by its control, not by the raw key", () => {
        const tpl = insuranceTemplate();
        const { rows, bindingOf } = buildRows(tpl, {}, "internal");
        const index = keyIndex(rows, bindingOf, "internal");
        expect(labelForKey("insurance_access_branch_restricted", index)).toBe(labelForKey("insurance_access_branch", index));
        expect(labelForKey("insurance_access_branch_restricted", index)).not.toBe("insurance_access_branch_restricted");
    });
});

/* the body of the Context rail's Remarks drawer (since PROMPT 7 its own component, InsuranceRemarks: Insurance.html remarks.js) */
describe("Insurance remarks panel follows the server's Insurance Remarks grant", () => {
    beforeAll(async () => {
        await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
    });
    const own = { id: 3, remarks: "Called the employer", remarks_by: 1, remarks_by_name: "Admin", created_at: new Date().toISOString(), version: 0, deleted: false, history: [] };
    const wrap = (ui) => render(
        <MemoryRouter>
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <Provider store={configureStore({ reducer: { remarks: remarksReducer, users: (s = { permissionList: { data: [] } }) => s } })}>
                    <Suspense fallback={null}>{ui}</Suspense>
                </Provider>
            </QueryClientProvider>
        </MemoryRouter>,
    );
    const record = { id: 1, ref: "IN-HKH000001" };

    test("an admin without Insurance Remarks sees the remarks but no Add, Edit or Delete", async () => {
        const { container } = wrap(<InsuranceRemarks record={record} remarks={[own]} canWrite={false} onChanged={() => {}} />);
        expect(await screen.findByText("Called the employer")).toBeTruthy();
        expect(container.querySelector('[data-action="add-remark"]')).toBeNull();
        expect(container.querySelector('[data-action="edit-remark"]')).toBeNull();
        expect(container.querySelector('[data-action="delete-remark"]')).toBeNull();
    });

    test("with Insurance Remarks the author gets Add, Edit and Delete", async () => {
        const { container } = wrap(<InsuranceRemarks record={record} remarks={[own]} canWrite onChanged={() => {}} />);
        expect(await screen.findByText("Called the employer")).toBeTruthy();
        expect(container.querySelector('[data-action="add-remark"]')).toBeTruthy();
        expect(container.querySelector('[data-action="edit-remark"]')).toBeTruthy();
        expect(container.querySelector('[data-action="delete-remark"]')).toBeTruthy();
    });
});
