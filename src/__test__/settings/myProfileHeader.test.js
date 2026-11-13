/* eslint-env jest */
import fs from "fs";
import path from "path";

/* U-0434 (5 Nov, supersedes backend 340): Branch and Agency are real staff attributes — the cells STAY and surface
   the API gap as the em-dash empty treatment until GET /hrms/profile returns branch_name / agency_name */
describe("My Profile header — Branch and Agency cells with the em-dash empty treatment (U-0434)", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../Views/Pages/SettingsPage/newui/hrms/profile/MyProfilePage.js"), "utf8");
    test("Branch / Agency cells present with em-dash fallback; Role and Joined Company remain", () => {
        expect(src).toMatch(/key_branch/);
        expect(src).toMatch(/key_agency/);
        expect(src).toMatch(/branch_name \|\| "—"/);
        expect(src).toMatch(/agency_name \|\| "—"/);
        expect(src).toMatch(/key_role/);
        expect(src).toMatch(/key_joined_company/);
        expect((src.match(/styles\.profileStat\}/g) || []).length).toBe(4);
    });
});
