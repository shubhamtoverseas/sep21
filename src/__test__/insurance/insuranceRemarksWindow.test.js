/* eslint-env jest */
import fs from "fs";
import path from "path";
import en from "../../../public/locales/en/translation.json";

/* 10 Nov package (remarks F1 / WDAC-C01, supersedes C15 §2.3/§6.1 and CHT #40): there is NO edit/delete time
   window on own remarks — the window mechanism, its countdown UI and its copy are gone. */
describe("remark edit window is removed (F1 / WDAC-C01)", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../components/remarks/Remarks.js"), "utf-8");

    it("the window module no longer exists", () => {
        expect(fs.existsSync(path.join(__dirname, "../../components/remarks/remarkWindow.js"))).toBe(false);
    });

    it("Remarks renders no window state or countdown", () => {
        expect(src).not.toMatch(/remarkEditState|remarkTimeLeftText|REMARK_EDIT_WINDOW|data-remark-window/);
    });

    it("the countdown copy left the locale", () => {
        expect(en.key_remark_editable_for).toBeUndefined();
        expect(en.key_remark_edit_window_closed).toBeUndefined();
    });
});
