/* eslint-env jest */
import fs from "fs";
import path from "path";
import { CONTRACT_REPORT_STATUS_VARIANT } from "../../Views/Pages/reports/reportConstants";

/* QA-SYS HRMS / PDF / Mobile (4 Nov 2026): the Reports module against PERM.md §11 and §16 and the interlink rows L12.1 / L12.7
   (qa-system-doc/QA_SYS_HRMS_PDF_MOBILE_REPORT.md). Source checks for what is done; `test.todo` names each open defect. */
const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");

describe("QA-SYS Reports", () => {
    test("the module and each PERM.md §11.2 report keep their own permission key (DONE)", () => {
        const routes = read("Views/Pages/routes/reportRoutes.js");
        for (const [route, key] of [["reports", "report_access"], ["jobOfferReport", "jo_report"], ["feedbackReport", "feedback_report"], ["interviewReport", "interview_report"], ["insuranceReport", "insurance_report"], ["contractReport", "contract_report"]])
            expect(routes).toMatch(new RegExp(`path: routes\\.${route}, component: \\w+,\\s+moduleKey: "reports", permissionKey: "${key}"`));
    });

    test("QA-SYS-HPM-012: the five PERM.md §16 HRMS reports carry their keys on the route (B-108; PK-01 P1-18, DONE)", () => {
        const routes = read("Views/Pages/routes/reportRoutes.js");
        for (const [route, key] of [["sessionHistoryReport", "session_history_report"], ["scheduleComplianceReport", "schedule_compliance_report"], ["timeRequestReport", "time_request_report"], ["leaveHistoryReport", "applied_leave_history_report"], ["timeEntryReport", "time_credit_report"]])
            expect(routes).toMatch(new RegExp(`path: routes\\.${route}, component: \\w+, moduleKey: "hrms_report", permissionKey: "${key}"`));
    });

    test.todo("QA-SYS-HPM-013: a Complete contract (contract_invoices_statuses id 4 'Complete') gets the completed chip on the Contract Report (L12.1) — the variant map knows only 'completed' (and a 'withdrawn' status no contract has), so it falls back to the neutral chip");

    test("the variant map still has no entry for the stored status name 'complete' (L12.1, measured)", () => {
        expect(CONTRACT_REPORT_STATUS_VARIANT.complete).toBeUndefined();
        expect(CONTRACT_REPORT_STATUS_VARIANT.completed).toBe("info");
    });
});
