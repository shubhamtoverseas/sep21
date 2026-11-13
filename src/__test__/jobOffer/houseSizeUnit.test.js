/* eslint-env jest */
import fs from "fs";
import path from "path";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

/* 3 Nov: Size of house — the sq ft unit sits inside the bordered mono box (prototype .ctl.mono.typein) */
test("the house-size box carries the border and the unit is inside it", () => {
    const css = read("Views/Pages/JobOfferPage/newui/editor/job-offer-editor.css");
    expect(css).toMatch(/\.joe-typein \{[^}]*border: 1px solid #d5dbe3;[^}]*font-family: var\(--mono\)/);
    expect(css).toMatch(/\.joe-typein input \{[^}]*border: 0;/);
    expect(css).toMatch(/\.joe-typein \.sfx \{[^}]*margin-left: auto;/);
    expect(read("Views/Pages/JobOfferPage/newui/editor/JobOfferForm.js")).toMatch(/className=\{ `joe-typein\$\{ errors\?\.employer_house_size \? ' is-invalid' : '' \}` \}/);
});
