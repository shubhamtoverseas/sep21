/* eslint-env jest */
import fs from "fs";
import path from "path";

/* QA-SYS Insurance (4 Nov 2026): the Insurance screens against the packs (qa-system-doc/QA_SYS_INSURANCE_REPORT.md). Source checks
   for what is done; `test.todo` names each open screen defect by its QA-SYS id until it is fixed. */
const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
const ROUTES = [...read("Views/Pages/routes/insuranceRoutes.js").matchAll(/\{\s*path:\s*routes\.(\w+),\s*component:\s*\w+[^}]*permissionKey:\s*"(\w+)"/g)].map(([, name, key]) => ({ name, key }));

describe("QA-SYS Insurance screens", () => {
    test("the dashboard, New Insurance, a record and the legacy link open on insurance_access (INS-R-A03, DONE)", () => {
        expect(ROUTES).toEqual([
            { name: "insurance", key: "insurance_access" },
            { name: "insuranceNew", key: "insurance_access" },
            { name: "insuranceRecord", key: "insurance_access" },
            { name: "insuranceDetails", key: "insurance_access" },
        ]);
    });

    test("a legacy numeric link resolves to the record's reference route (DONE)", () => {
        expect(read("Views/Pages/routes/routesConfig/insuranceRoutes.js")).toMatch(/insuranceDetails:\s*"\/insurances\/:insurance_id"/);
        expect(read("Views/Pages/routes/insuranceRoutes.js")).toMatch(/InsuranceLegacyLinkResolver/);
    });

    test.todo("QA-SYS-INSURANCE-006: when the dashboard search fails, the cards and the two work chips show no count (—), not 0");
});
