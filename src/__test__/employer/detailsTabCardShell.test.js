/* eslint-env jest */
import fs from "fs";
import path from "path";
const src = fs.readFileSync(path.join(__dirname, "../../Views/Pages/Employer/newui/details/tabs/EmployerDetailsTab.js"), "utf8");

/* 30 Oct: the Employer Details cards rendered inside a second white card (the sub-tab shell) with an 18x20 inset, unlike the
   Worker details sub-tabs; the read-cards wrapper must sit inside each sub-tab pane so the shell drops its chrome */
describe("Employer Details tab card shell", () => {
    test("the outer wrapper is not the read-cards wrapper", () => {
        expect(src).toMatch(/<div className="emd-details">/);
        expect(src).not.toMatch(/det-body wkd-read-cards emd-details/);
    });
    test("both sub-tab panes carry det-body wkd-read-cards", () => {
        expect((src.match(/content: \(\s*<div className="det-body wkd-read-cards">/g) || []).length).toBe(2);
    });
});
