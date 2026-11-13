/* eslint-env jest */
import fs from "fs";
import path from "path";
const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

/* Mubin 30 Oct: Contract stage Ready → Not Ready left the panel tag and the status menu on "Ready", so "Ready" could not be
   picked again until a page reload — the tab must re-read its own details after the shared status save */
describe("Contract stage panel after a status change", () => {
    test("the shared status save returns its promise", () => {
        expect(read("Views/Pages/ProcessingPage/processing-detail/ProcessingDetail.js")).toMatch(/const onClickChangeStatus = useCallback\(\(id\) => \(\s*dispatch\(updateProcessingStatus/);
    });
    test("the Contract tab re-reads its details once the save succeeds and hands that handler to the footer", () => {
        const tab = read("Views/Pages/ProcessingPage/processing-detail/contract-tab/ProcessingContractTab.js");
        expect(tab).toMatch(/Promise\.resolve\(handleOnChangeStatus\?\.\(id, name, enable\)\)\.then\(\(res\) => \{ if \(!res\?\.error\) loadDetails\(\); return res; \}\)/);
        expect(tab).toMatch(/onChangeStatus=\{ onChangeStatus \}/);
        expect(tab).not.toMatch(/onChangeStatus=\{ handleOnChangeStatus \}/);
    });
});
