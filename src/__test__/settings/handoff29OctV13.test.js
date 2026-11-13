/* eslint-env jest */
import fs from "fs";
import path from "path";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

import { getReporteesTimeRequestColumns } from "../../Views/Pages/SettingsPage/newui/hrms/reportees/reporteesTimeRequestColumns";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

describe("handoff 29 Oct §J · Reports Clear reloads the list at page 1", () => {
    test.each([
        "Views/Pages/reports/feedback-report/FeedbackReportPage.js",
        "Views/Pages/reports/contract-report/ContractReportPage.js",
        "Views/Pages/reports/insurance-report/InsuranceReportPage.js",
        "Views/Pages/reports/consolidated-ledger-report/ConsolidatedLedgerReportPage.js",
        "Views/Pages/reports/interview-report/InterviewReportPage.js",
        "Views/Pages/reports/job-offer-report/JobOfferReportPage.js",
    ])("%s", (rel) => {
        const src = read(rel);
        expect(src).toMatch(/const clearFilters = useCallback\(\(\) => \{\s*const filters = resetFilters\(\);\s*fetchData\(\{ \.\.\.filters, page: 1 \}\);/);
    });
});

describe("handoff 29 Oct §L · Shift Codes row registers dot names so useWatch fires", () => {
    test("no bracket field names remain", () => {
        const src = read("Views/Pages/SettingsPage/newui/shift-codes/ShiftCodeFormPage.js");
        expect(src).not.toMatch(/shift_code_data\[\$\{index\}\]/);
        expect(src).toMatch(/register\(`shift_code_data\.\$\{index\}\.shift_code`\)/);
        expect(src).toMatch(/name=\{`shift_code_data\.\$\{index\}\.shift_start_time`\}/);
    });
});

describe("handoff 29 Oct §N · Approve Time Request Branch header does not sort", () => {
    test("branch column has no sortKey; the others keep theirs", () => {
        const cols = getReporteesTimeRequestColumns({ onView: () => {}, onAction: () => {} });
        const branch = cols.find((c) => c.key === "branch");
        expect(branch).toBeDefined();
        expect(branch.sortKey).toBeUndefined();
        expect(cols.find((c) => c.key === "request_number").sortKey).toBe("request_number");
    });
});
