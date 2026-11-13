/* eslint-env jest */
import fs from "fs";
import path from "path";
const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

/* v17 §S (backend 372): the Contract Report sends `group: [1..4]`; defaults and Clear carry an empty array */
describe("Contract Report · Group filter", () => {
    test("the chip is first in the bar, built on the processing group options, and feeds `group`", () => {
        const src = read("Views/Pages/reports/contract-report/ContractReportFilter.js");
        expect(src).toMatch(/<ReportFilters onGo=\{handleGoClick\} onClear=\{handleClearFilter\}>\s*<ReportChip id="contract-report-group"/);
        expect(src).toMatch(/constData\.processingGroupOptions\(\)\.map/);
        expect(src).toMatch(/filters\.group = Array\.isArray\(currentGroupSelect\)/);
        expect(src).toMatch(/setGroupSelect\(\[\]\);/);
    });
    test("every default filter set carries group: []", () => {
        expect(read("components/ReusableComponents/constants.js")).toMatch(/const contractReportFilters = \{[^}]*group: \[\],/);
        expect(read("redux/Slices/reports/reportSlice.js")).toMatch(/contractReportFiltersData: \{[^}]*group: \[\],/);
        expect(read("Views/Pages/reports/contract-report/ContractReportPage.js")).toMatch(/const emptyFilters = \{[^}]*group: \[\],/);
    });
});
