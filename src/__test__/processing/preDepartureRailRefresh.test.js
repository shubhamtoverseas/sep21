/* eslint-env jest */
import fs from "fs";
import path from "path";
const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

/* Mubin 29 Oct: a Pre-Departure sub-stage status change must refresh the record row behind the stage rail at once */
describe("Pre-Departure status change refreshes the stage rail", () => {
    test("the tab receives the record refresh and calls it after a change", () => {
        expect(read("Views/Pages/ProcessingPage/processing-detail/ProcessingDetail.js")).toMatch(/<ProcessingPreDepartureTab [^>]*reloadGlobalActivityList=\{ reloadGlobalActivityList \}/);
        const tab = read("Views/Pages/ProcessingPage/processing-detail/pre-departure-tab/ProcessingPreDepartureTab.js");
        expect(tab).toMatch(/const refresh = useCallback\(\(\) => \{[^}]*reloadGlobalActivityList\?\.\(\);/);
    });
});
