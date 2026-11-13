/* eslint-env jest */
import fs from "fs";
import path from "path";
import { CONTRACT_REPORT_STATUS_VARIANT, INTERVIEW_STATUS_VARIANT, TIME_REQUEST_STATUS_VARIANT, statusKeyOf } from "../../Views/Pages/reports/reportConstants";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

/* user 1 Nov: report status chips look like the Invoice list chips (kit Badge), not the legacy button chips */
describe("report status chips", () => {
    test.each([
        "Views/Pages/reports/time-request-report/TimeRequestReportTableColumns.js",
        "Views/Pages/reports/leave-history-report/LeaveHistoryReportTableColumns.js",
        "Views/Pages/reports/contract-report/ContractReportTableColumns.js",
        "Views/Pages/reports/interview-report/InterviewReportTableColumns.js",
    ])("%s renders ReportStatusChip and no legacy status button", (rel) => {
        const src = read(rel);
        expect(src).toMatch(/<ReportStatusChip variant=/);
        expect(src).not.toMatch(/btn (chip |compact chip |)small \$\{|btn compact chip \$\{/);
    });
    test("the shell chip is the kit Badge", () => {
        expect(read("Views/Pages/reports/ReportShell.js")).toMatch(/export const ReportStatusChip = \(\{ variant, children \}\) => <Badge variant=\{variant\}>\{children\}<\/Badge>/);
    });
    test("legacy class names map to variants", () => {
        expect(statusKeyOf("chip approved")).toBe("approved");
        expect(TIME_REQUEST_STATUS_VARIANT[statusKeyOf("chip rejected")]).toBe("danger");
        expect(CONTRACT_REPORT_STATUS_VARIANT.active).toBe("success");
        expect(INTERVIEW_STATUS_VARIANT.completed).toBe("success");
    });
});
