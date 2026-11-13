/* eslint-env jest */
import fs from "fs";
import path from "path";
const src = fs.readFileSync(path.join(__dirname, "../../Views/Pages/WorkerPage/dashboard/WorkerDashboard.js"), "utf8");

/* backend 181: branch/mapping-list?module_key=worker rows carry `checked_in` + `is_macau`; the drawer tiles read them */
describe("Check-in locations read the settings API keys", () => {
    test("checked_in feeds the 'N in' count and is_macau the grouping", () => {
        expect(src).toMatch(/checkinCount: b\.checked_in \?\? b\.checkin_count/);
        expect(src).toMatch(/isMacau: b\.isMacauFlag \?\? \(b\.countryId === MACAU_LOCATION_ID\)/);
    });
});
