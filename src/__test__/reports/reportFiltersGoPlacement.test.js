/* eslint-env jest */
import fs from "fs";
import path from "path";

/* Shubham 4 Nov (Session History Report): Go sits next to the filter chips, not pushed to the far right of the bar */
test("the report filter actions follow the chips instead of floating to the end of the row", () => {
    const css = fs.readFileSync(path.join(__dirname, "../../Views/Pages/reports/reports-page.css"), "utf8");
    const actions = css.match(/\.rpt-actions \{([^}]*)\}/)[1];
    expect(actions).not.toMatch(/margin-left: auto/);
    expect(actions).toMatch(/display: flex/);
    const shell = fs.readFileSync(path.join(__dirname, "../../Views/Pages/reports/ReportShell.js"), "utf8");
    expect(shell).toMatch(/\{children\}\s*<div className="rpt-actions">/);
});
