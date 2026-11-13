/* eslint-env jest */
import fs from "fs";
import path from "path";

/* QA-SYS Invoice (4 Nov 2026): the Invoice screens against the packs (qa-system-doc/QA_SYS_INVOICE_REPORT.md). Source checks for
   what is done; `test.todo` names each open screen defect by its QA-SYS id until it is fixed. */
const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
const ROUTES_SRC = read("Views/Pages/routes/invoiceRoutes.js");
const ROUTES = [...ROUTES_SRC.matchAll(/\{\s*path:\s*routes\.(\w+),\s*component:\s*\w+([^}]*)\}/g)].map(([, name, rest]) => ({ name, key: (rest.match(/permissionKey:\s*"(\w+)"/) || [])[1] }));

describe("QA-SYS Invoice screens", () => {
    test("the routes file was read (26 Invoice routes)", () => {
        expect(ROUTES.length).toBe(26);
    });

    test("every Invoice route opens on invoice_access; without it the user lands on the dashboard (DONE)", () => {
        expect(ROUTES.filter((r) => r.key !== "invoice_access").map((r) => r.name)).toEqual([]);
    });

    test("an unknown or out-of-reach invoice shows \"This record is not available.\" from the record gate (INV-2, DONE)", () => {
        expect(read("Views/Pages/Invoice/InvoiceRecordGate.js")).toMatch(/error\?\.status === 404/);
    });

    test.todo("QA-SYS-INVOICE-015: the two PDF-generator routes open without the invoice they print and crash to \"Something went wrong\" (Object.keys of undefined)");
    test.todo("QA-SYS-INVOICE-016: when the view and its fallback reads fail, Invoice Detail shows its error state with Retry, not a blank page (sheet row 1, OP-ST3-06)");
    test.todo("QA-SYS-INVOICE-017: Upload Deposit Receipt, Customer Printout and Remark show only to a user holding their keys (REG #82; the upload API refuses with 401)");
    test.todo("QA-SYS-INVOICE-018: at 1440 px the list's empty-state message is readable, not cut to \"No invoices m\"");
});
