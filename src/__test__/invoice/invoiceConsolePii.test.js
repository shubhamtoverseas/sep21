import fs from "fs";
import path from "path";

/* SEC-27 (performance & security track, approved 22 Oct): the Invoice screens logged employer records — HKID and contact
   details among them — and the review page's invoice data to the browser console. Those logs are gone, and no console call
   in the Invoice or Insurance screens prints an employer, worker or invoice record. */

const PAGES = path.resolve(__dirname, "../../Views/Pages");
const read = (rel) => fs.readFileSync(path.join(PAGES, rel), "utf8");
const filesUnder = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(full);
    return /\.jsx?$/.test(entry.name) ? [full] : [];
});

test("the three logs of employer and invoice data are gone", () => {
    expect(read("Invoice/Invoice.js")).not.toMatch(/console\.log\('res\?\.payload\?\.data'/);
    // the Standalone Invoice uses the Contract Invoice employer form since INV-G2
    expect(read("Invoice/add-contract-invoice/AddEmployerDetailsOfInvoice.js")).not.toMatch(/console\.log\(key, currentEmployer\[key\]\)/);
    // the Standalone Invoice uses the Contract Invoice review since INV-G4
    expect(read("Invoice/add-contract-invoice/InvoiceReview.js")).not.toMatch(/console\.log\("Invoice data in review page:"/);
});

test("no console call in the Invoice or Insurance screens prints an employer, worker or invoice record", () => {
    const record = /console\.(log|info|debug|warn)\([^;\n]*\b(currentEmployer|currentWorker|employerDetail|workerDetail|invoiceData|invoiceDetails|payload\?\.data)\b/;
    const hits = [...filesUnder(path.join(PAGES, "Invoice")), ...filesUnder(path.join(PAGES, "insurance"))]
        .flatMap((file) => fs.readFileSync(file, "utf8").split(/\r?\n/)
            .map((line, i) => (record.test(line) ? `${ path.relative(PAGES, file) }:${ i + 1 }` : null))
            .filter(Boolean));
    expect(hits).toEqual([]);
});
