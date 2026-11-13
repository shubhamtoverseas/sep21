/* eslint-env jest */
import fs from "fs";
import path from "path";
const SRC = path.join(__dirname, "../../");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");

const walk = (dir, out = []) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
        const p = path.join(dir, d.name);
        if (d.isDirectory()) { if (d.name !== "__test__") walk(p, out); } else if (/\.jsx?$/.test(d.name)) out.push(p);
    });
    return out;
};

/* ClickUp 14ykpqtuxfh: no spinner on phone / OTP / amount inputs; only true quantity fields opt in with mc-spin */
describe("numeric input spinners", () => {
    test("the global rule hides the spinner on every number input that does not opt in", () => {
        const css = read("assets/css/custom.css");
        expect(css).toMatch(/input\[type="number"\]:not\(\.mc-spin\)::-webkit-inner-spin-button/);
        expect(css).toMatch(/input\[type="number"\]:not\(\.mc-spin\) \{\s*-moz-appearance: textfield;/);
    });
    test("only the leave-policy counts and the manual leave count opt in", () => {
        const optedIn = walk(SRC).filter((p) => fs.readFileSync(p, "utf8").includes('className="mc-spin"')).map((p) => path.relative(SRC, p).replace(/\\/g, "/")).sort();
        expect(optedIn).toEqual([
            "Views/Pages/SettingsPage/newui/leave-policy/LeaveTypeForm.js",
            "Views/Pages/SettingsPage/newui/manual-update-leaves/ManualUpdateLeavePage.js",
        ]);
        expect((read("Views/Pages/SettingsPage/newui/leave-policy/LeaveTypeForm.js").match(/className="mc-spin"/g) || []).length).toBe(3);
    });
});
