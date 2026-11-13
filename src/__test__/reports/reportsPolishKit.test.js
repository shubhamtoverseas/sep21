/* eslint-env jest */
import React from "react";
import fs from "fs";
import path from "path";
import { render, screen } from "@testing-library/react";
import { ReportClamp, ReportDateCell, ReportTag } from "../../Views/Pages/reports/ReportShell";

/* the shell imports the legacy date-range picker, whose node_modules CSS jest cannot parse */
jest.mock("../../components/date-range-picker/DateRangePicker", () => () => null);

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");
const REPORTS = path.join(__dirname, "../../Views/Pages/reports");
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".js") ? [path.join(dir, e.name)] : []));

/* Reports polish (user, 2 Nov): no legacy `btn chip` buttons, no bootstrap tooltips, the ledger search keeps its text */
describe("Reports · kit cells", () => {
    test("no report file carries a legacy chip button or a react-bootstrap tooltip", () => {
        walk(REPORTS).forEach((file) => {
            const src = fs.readFileSync(file, "utf8");
            expect({ file, hit: /className="btn chip|<OverlayTrigger|from ['"]react-bootstrap|mw20ch/.test(src) }).toEqual({ file, hit: false });
        });
    });
    test("ReportTag is the neutral list tag; ReportDateCell pairs a date with it", () => {
        const { container } = render(<ReportDateCell><span>2026-11-02</span><ReportTag>09:30 AM</ReportTag></ReportDateCell>);
        const tag = screen.getByText("09:30 AM");
        expect(tag.getAttribute("data-tone")).toBe("neutral");
        expect(container.querySelector(".rpt-date-cell")).toContainElement(tag);
    });
    test("ReportClamp clips and exposes the full value as the native title", () => {
        render(<ReportClamp title="a long feedback comment">a long feedback comment</ReportClamp>);
        const cell = screen.getByText("a long feedback comment");
        expect(cell.className).toBe("rpt-clamp");
        expect(cell.getAttribute("title")).toBe("a long feedback comment");
        render(<ReportClamp title="">-</ReportClamp>);
        expect(screen.getByText("-").hasAttribute("title")).toBe(false);
    });
    test("Time Entry uses the tag pair; Leave History has no dead chip comments", () => {
        const te = read("Views/Pages/reports/time-entry-report/TimeEntryReportTableColumns.js");
        expect((te.match(/<ReportTag>/g) || []).length).toBe(2);
        expect(te).toMatch(/<ReportDateCell>/);
        expect(read("Views/Pages/reports/leave-history-report/LeaveHistoryReportTableColumns.js")).not.toMatch(/\{\/\*|convertToDayType/);
    });
    test("the Consolidated Ledger search field is controlled by local state and stays unwired", () => {
        const src = read("Views/Pages/reports/consolidated-ledger-report/ConsolidatedLedgerReportPage.js");
        expect(src).toMatch(/const \[searchText, setSearchText\] = useState\(""\)/);
        expect(src).toMatch(/<ReportSearchField id="consolidated-ledger-search" value=\{searchText\}/);
        expect(src).not.toMatch(/console\.log\('Search input changed/);
        expect(src).not.toMatch(/search_text|searchText\s*\}\)/);
    });
});
