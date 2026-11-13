/* eslint-env jest */
import fs from "fs";
import path from "path";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

/* 3 Nov: the Notifications Category control is the kit filter popover, like the Employer / Worker toolbars; no blue ring on the Worker triggers */
describe("filter dropdowns on the kit", () => {
    test("Notifications Category uses FilterSelect, not a browser select", () => {
        const page = read("Views/Pages/Notifications/newui/NotificationsPage.js");
        expect(page).toMatch(/import FilterSelect from "\.\.\/\.\.\/\.\.\/\.\.\/components\/ui\/FilterSelect"/);
        expect(page).toMatch(/<FilterSelect id="nf-category"/);
        expect(page).not.toMatch(/<select/);
        expect(read("Views/Pages/Notifications/newui/notifications.css")).not.toMatch(/\.nf-cat select/);
    });
    test("Calendar Staff / Show / Status use FilterSelect", () => {
        const page = read("Views/Pages/Calendar/newui/CalendarFilters.js");
        expect(page.match(/<FilterSelect id="cal-filter-/g)).toHaveLength(3);
        expect(page).not.toMatch(/<select/);
        expect(read("Views/Pages/Calendar/newui/calendar.css")).not.toMatch(/\.cal-select select/);
    });
    test("the Worker dashboard filter trigger shows no focus ring", () => {
        expect(read("Views/Pages/WorkerPage/dashboard/worker-dashboard.css")).not.toMatch(/\.fctl:focus-within/);
    });
});
