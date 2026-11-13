/* eslint-env jest */
import fs from "fs";
import path from "path";

/* QA-SYS Contract / Processing (4 Nov 2026): the Contract screens against the packs (qa-system-doc/QA_SYS_CONTRACT_REPORT.md). Source
   checks for what is done; `test.todo` names each open screen defect by its QA-SYS id until it is fixed. */
const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
const keys = (file) => [...read(file).matchAll(/\{\s*path:\s*routes\.(\w+),\s*component:\s*\w+[^}]*permissionKey:\s*"(\w+)"/g)].map(([, name, key]) => ({ name, key }));

describe("QA-SYS Contract screens", () => {
    test("the Contracts list opens on contract_global_list; a record and its Extend Visa case on contract_processing_access (U-0267, DONE)", () => {
        expect(keys("Views/Pages/routes/contractRoutes.js")).toEqual([
            { name: "contracts", key: "contract_global_list" },
            { name: "contractDetails", key: "contract_processing_access" },
            { name: "extendVisaCase", key: "contract_processing_access" },
        ]);
    });

    test("the retired Processing addresses only redirect into Contracts, under the same keys (DONE)", () => {
        expect(keys("Views/Pages/routes/processingRoutes.js").map((r) => r.key)).toEqual(["contract_global_list", "contract_processing_access", "contract_processing_access"]);
        expect(read("Views/Pages/routes/processingRoutes.js")).toMatch(/ProcessingRedirect/);
    });

    test("an Extend Visa case is routed by its opaque case id under the contract id (EXTEND §2.2, DONE)", () => {
        expect(read("Views/Pages/routes/routesConfig/contractRoutes.js")).toMatch(/"\/contracts\/details\/:contract_id\/extend-visa\/:extend_visa_case_id"/);
    });

    test.todo("QA-SYS-CONTRACT-016: when the Extend Visa case read fails, the page shows an error with Retry, not \"Not available · You do not have access to this record.\"");
    // QA-SYS-CONTRACT-006 (the Activity tab shows the contract-level events) is DONE server-side, no admin change: PK-03 P3-08,
    // admin-api 665ef7e — processing-activity-log-list now lists contract_logs with processing_logs (its tests are in admin-api).
});
