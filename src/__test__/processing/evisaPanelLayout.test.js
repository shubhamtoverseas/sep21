/* eslint-env jest */
import fs from "fs";
import path from "path";

const src = fs.readFileSync(path.join(__dirname, "../../Views/Pages/ProcessingPage/processing-detail/visa-tab/e-visa/EVisaTab.js"), "utf8");

/* 30 Oct audit of the 26 Oct backend work orders against the HTML: the E-Visa panel follows the prototype evisaPanel */
describe("E-Visa panel layout follows the prototype", () => {
    test("the head keeps the Upload button beside the Visa folder", () => {
        expect(src).toMatch(/<FolderButton folder="visa"[^\n]*\n[^\n]*\n[^\n]*<UploadButton folder="visa" \/>/);
    });
    test("the E-Visa Document block sits below the two field rows (record · expiries · document)", () => {
        const record = src.indexOf('<FormGrid layout="evisa">');
        const expiries = src.indexOf('<FormGrid layout="evisa-expiry">');
        const doc = src.indexOf('className="g1-fileblock"');
        expect(record).toBeGreaterThan(0);
        expect(expiries).toBeGreaterThan(record);
        expect(doc).toBeGreaterThan(expiries);
    });
});
