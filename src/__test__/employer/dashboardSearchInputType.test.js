/* eslint-env jest */
import fs from "fs";
import path from "path";
const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

/* Mubin 30 Oct: a type="search" input draws the browser's own clear (x) on top of the help (?) button; the prototype
   Employer / Job Offer dashboards use a plain text input, as the Worker dashboard already does */
describe("dashboard search inputs", () => {
    test.each([
        ["Views/Pages/Employer/newui/EmployerDashboardFilters.js", "employer-search"],
        ["Views/Pages/JobOfferPage/newui/dashboard/JobOfferDashboardFilters.js", "jo-search"],
        ["Views/Pages/WorkerPage/dashboard/DashboardFilterBar.js", "f-search"],
    ])("%s is a text input", (rel, id) => {
        const src = read(rel);
        expect(src).toMatch(new RegExp('id="' + id + '"[^>]*type="text"'));
        expect(src).not.toMatch(/type="search"/);
    });
});
