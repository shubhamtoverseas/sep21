import i18n from "i18next";
import en from "../../../public/locales/en/translation.json";
import { ownerPreview, recipientLabel, targetFromRow } from "../../Views/Pages/insurance/ownership/ownershipConfig";

/* Change CS Owner preview (rules.ownerTransferPreview), the rule M14 re-checks at commit */

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

const recipient = { id: 7, name: "Ann", title: "Officer", branches: [{ id: 1, name: "Central" }], ownershipBranchIds: [1, 2], accessBranchIds: [1] };
const target = { ref: "IN-HKH000001", worker: "Alia", owner: { id: 5, name: "Bo" }, branch: { id: 1, code: "HKH", name: "Central" }, contract: null };

describe("change CS owner preview", () => {
    it("keeps the Branch, and names why a record cannot update", () => {
        expect(ownerPreview(target, recipient, true)).toEqual({ ok: true, why: "Branch kept" });
        expect(ownerPreview(target, recipient, false).why).toBe("You can see this record in the list but cannot open it.");
        expect(ownerPreview({ ...target, contract: { id: 3, number: "C-1" } }, recipient, true).why).toBe("Follows the governing Contract");
        expect(ownerPreview({ ...target, owner: { id: 7 } }, recipient, true).why).toBe("Already the owner");
        expect(ownerPreview({ ...target, branch: { id: 3, code: "SO" } }, recipient, true).why).toBe("No ownership scope for SO");
        expect(ownerPreview({ ...target, branch: { id: 2, code: "CBO" } }, recipient, true).why).toBe("No access to Branch CBO");
        expect(ownerPreview({ ...target, branch: { id: 2, code: "CBO" } }, { ...recipient, accessBranchIds: null }, true).ok).toBe(true);
    });

    it("labels recipients and dashboard rows", () => {
        expect(recipientLabel(recipient)).toBe("Ann · Officer · Central");
        expect(recipientLabel({ ...recipient, title: null, branches: [] })).toBe("Ann · no Branch scope");
        expect(targetFromRow({ ref: "IN-1", worker: { name: "W" }, owner: null, branch: null, contract: null })).toEqual({ ref: "IN-1", worker: "W", owner: null, branch: null, contract: null });
    });
});
