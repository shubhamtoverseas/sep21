/* eslint-env jest */
import fs from "fs";
import path from "path";
const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

/* Shubham 1 Nov: the Settings-style breadcrumb (Reports > <report>) on every report page, not on the Reports home */
describe("report pages breadcrumb", () => {
    test("ReportPage renders the Reports crumb unless it is the home", () => {
        const shell = read("Views/Pages/reports/ReportShell.js");
        expect(shell).toMatch(/\{!home && \(\s*<nav className=\{shared\.breadcrumb\}/);
        expect(shell).toMatch(/<Link to=\{absoluteRoute\(routes\.reports\)\}>/);
        expect(shell).toMatch(/<span className=\{shared\.breadcrumbCurrent\}>\{headingCase\(title\)\}<\/span>/);
    });
    test("only the Reports home opts out", () => {
        expect(read("Views/Pages/reports/ReportsPage.js")).toMatch(/<ReportPage title=\{translation\('key_reports'\)\} home>/);
        const dir = path.join(__dirname, "../../Views/Pages/reports");
        const pages = fs.readdirSync(dir, { withFileTypes: true })
            .filter((d) => d.isDirectory())
            .map((d) => fs.readdirSync(path.join(dir, d.name)).filter((f) => f.endsWith("ReportPage.js")).map((f) => path.join(d.name, f)))
            .flat();
        expect(pages.length).toBeGreaterThan(5);
        pages.forEach((p) => expect(read(path.join("Views/Pages/reports", p))).not.toMatch(/<ReportPage[^>]* home[ >]/));
    });
});
