/* eslint-env jest */
import fs from "fs";
import path from "path";
import { SESSION_HISTORY_USERS_QUERY } from "../../Views/Pages/reports/reportConstants";

const src = fs.readFileSync(path.join(__dirname, "../../Views/Pages/reports/session-history-report/SessionHistoryReportPage.js"), "utf8");

/* Shubham 4 Nov: a User filter next to the duration chip; Priyanka 4 Nov: user_id array on the report, users-list module session_history_report */
describe("Session History Report · User filter (CH 507)", () => {
    test("the dropdown comes from the report's own users-list module", () => {
        expect(SESSION_HISTORY_USERS_QUERY).toEqual({ module: "session_history_report" });
        expect(src).toMatch(/getBranchUsers\(SESSION_HISTORY_USERS_QUERY\)/);
        expect(src).toMatch(/\{ value: u\.user_id, label: u\.name \}/);
    });
    test("the chip sits after the duration chip and user_id travels with every report call", () => {
        expect(src.indexOf("<ReportDateChip")).toBeLessThan(src.indexOf('<ReportChip id="session-history-user"'));
        expect(src).toMatch(/<ReportChip id="session-history-user"[^>]*multiple/);
        expect(src).toMatch(/user_id: userSelect\.map\(\(option\) => option\.value\)/);
        expect((src.match(/\.\.\.filterParams,/g) || []).length).toBeGreaterThanOrEqual(4);
        expect(src).not.toMatch(/dateParams/);
    });
});
