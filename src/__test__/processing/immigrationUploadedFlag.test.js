/* eslint-env jest */
import fs from "fs";
import path from "path";
import { uploadedFlagPayload } from "../../Views/Pages/Contract/details/contractRecordUtils";

const src = fs.readFileSync(path.join(__dirname, "../../Views/Pages/Contract/details/ContractDocuments.js"), "utf8");

/* Priyanka v21 §W (backend 377): an Immigration row's Uploaded is a Yes / No the user sets, one changed row per save */
describe("Documents → Immigration · Uploaded Yes / No (backend 377)", () => {
    test("the payload names only the changed row", () => {
        expect(uploadedFlagPayload("immigration", 34, "id_988b", "Yes")).toEqual({ type: "immigration", contract_id: 34, id_988b_uploaded: 1 });
        expect(uploadedFlagPayload("immigration", 34, "id_988b", "No")).toEqual({ type: "immigration", contract_id: 34, id_988b_uploaded: 0 });
    });
    test("the Immigration branch saves through the same Yes / No path as the Contract folder and re-reads the checklist", () => {
        expect(src).toMatch(/f === CR_DOC_FOLDER\.IMMIGRATION\) \{\s*\/\*[\s\S]*?payload = uploadedFlagPayload\(f, contractId, changed\.key, changed\.value\)/);
        expect(src).toMatch(/if \(res\.error \|\| f === CR_DOC_FOLDER\.IMMIGRATION\) loadDetails\(f\)/);
        expect(src).toMatch(/const rowEditable = declEditable && \(!isImmigration \|\| \(!physical && !immigrationSubmitted\)\)/);
        expect(src).toMatch(/saveUploaded\(active, groups, \{ key: id, value \}\)/);
        expect(src).not.toMatch(/isImmigration \? \(\s*<span className=\{ `g1-ro/);
    });
});
