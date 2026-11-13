/* eslint-env jest */
import fs from "fs";
import path from "path";
const css = fs.readFileSync(path.join(__dirname, "../../components/Processing/newui/stage-panels.css"), "utf8");

/* Mubin 30 Oct: the inline Application type select must not sit flush against the "Needs review" chip */
describe("Immigration Application type row", () => {
    test("the inline purpose select carries the prototype's 10px chip gap", () => {
        expect(css).toMatch(/\.mcdt-embed \.g1-cell-auto > select\.g1-in \{ margin-left:10px; \}/);
    });
});
