/* eslint-env jest */
import fs from "fs";
import path from "path";
import { CR_PREP_READY } from "../../Views/Pages/Contract/contractConstants";
import { apiPath } from "../../services/apiPath";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

/* Priyanka v22 §X (backend 378): the Extend Visa case assigns / reassigns its Prepared and Ready owners — never clears (EXTEND §11.3, DF-11) */
describe("Extend Visa case · owner assignment (backend 378)", () => {
    test("endpoint and the already-assigned code", () => {
        expect(apiPath.extendVisaOwner).toBe("/processing/global/extend-visa/owner");
        expect(CR_PREP_READY.ALREADY_ASSIGNED_CODE).toBe("PREP_READY_OWNER_ALREADY_ASSIGNED");
        expect(read("services/processings.js")).toMatch(/export const extendVisaOwnerAPI = \(caseRef, body\) => processingAPI\.post\(apiPath\.extendVisaOwner, extendVisaMutationBody\(caseRef, body\)\)/);
    });
    test("the case page offers Assign / Change on can.change_owner only, through the shared picker", () => {
        const page = read("Views/Pages/Contract/extend-visa/ExtendVisaCase.js");
        expect(page).toMatch(/const canChangeOwner = Boolean\(c\.can\?\.change_owner\) && !terminal/);
        expect(page).toMatch(/translation\(o\?\.name \? "key_change" : "key_assign"\)/);
        expect(page).toMatch(/<PrepReadyReassignDialog role=\{ reassignOwner\.role \}[^\n]*holder=\{ holderOf\(reassignOwner\.o\) \} submit=\{ submitOwner \}/);
    });
    test("the picker in case mode has no Unassigned entry and no reason", () => {
        const dlg = read("Views/Pages/Contract/details/PrepReadyReassignDialog.js");
        expect(dlg).toMatch(/if \(!forCase\) out\.push\(\{ id: CD_OWNER_UNASSIGNED/);
        expect(dlg).toMatch(/\{ !forCase && \(\s*<Field label=\{ translation\("key_bulk_reason_label"\)/);
        expect(dlg).toMatch(/res\?\.status === 409 && res\?\.code !== CR_PREP_READY\.ALREADY_ASSIGNED_CODE/);
    });
});
