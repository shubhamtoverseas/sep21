/* eslint-env jest */
import fs from "fs";
import path from "path";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");
const block = (css, selector) => css.match(new RegExp(`\\${ selector }\\s*\\{([^}]*)\\}`))[1];

/* 4 Nov: the search-help popover (Employer + Job Offer dashboards) anchors to the search box's left edge, never past the card */
describe("search help popover anchor (CH 504)", () => {
    const css = read("Views/Pages/Employer/newui/EmployerDashboard.module.css");
    test("the wrap spans the search box and lets the mouse through; the button, bridge and popover take it", () => {
        const wrap = block(css, ".searchHelpWrap");
        expect(wrap).toMatch(/inset: 0;/);
        expect(wrap).toMatch(/pointer-events: none;/);
        expect(wrap).toMatch(/justify-content: flex-end;/);
        expect(block(css, ".searchHelpBtn")).toMatch(/pointer-events: auto;/);
        expect(css).toMatch(/\.searchHelpWrap::before \{[^}]*pointer-events: auto;/);
    });
    test("the popover is left-anchored, at least as wide as the box, never wider than the viewport", () => {
        const pop = block(css, ".searchHelpPop");
        expect(pop).toMatch(/left: 0;/);
        expect(pop).toMatch(/right: auto;/);
        expect(pop).toMatch(/min-width: 100%;/);
        expect(pop).toMatch(/max-width: calc\(100vw - 32px\);/);
        expect(pop).not.toMatch(/right: -6px/);
        expect(pop).toMatch(/pointer-events: auto;/);
    });
    test("both dashboards still render the popover inside the wrap", () => {
        ["Views/Pages/Employer/newui/EmployerDashboardFilters.js", "Views/Pages/JobOfferPage/newui/dashboard/JobOfferDashboardFilters.js"].forEach((f) => {
            const src = read(f);
            expect(src).toMatch(/searchHelpWrap/);
            expect(src).toMatch(/searchHelpPop/);
        });
    });
});

/* 4 Nov: one jest timeout for every suite (CH 505) */
test("craco jest config carries the 15 s test timeout", () => {
    expect(fs.readFileSync(path.join(__dirname, "../../../craco.config.js"), "utf8")).toMatch(/jest:\s*\{\s*configure:\s*\{\s*testTimeout: 15000,/);
});
