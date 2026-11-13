/* eslint-env jest */
import fs from "fs";
import path from "path";
import { correctionLabelKey, isDateCorrection, issuanceActorName, issuanceCaseRef, issuanceValues, latestIssuance } from "../../Views/Pages/Contract/details/visaHistoryUtils";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

/* open point 18: the issuance History lives on Details → Visa (prototype visaHistToggle), not on the Processing E-Visa panel */
describe("Visa History on Details → Visa", () => {
    test("the Details tab carries the History toggle and the inline list; the editor no longer has a History window", () => {
        const details = read("Views/Pages/Contract/details/DetailsTab.js");
        expect(details).toMatch(/useVisaHistory\(contractId/);
        expect(details).toMatch(/data-fid="visa-hist"/);
        expect(details).toMatch(/<VisaHistoryList /);
        const editor = read("components/visa-expiry/VisaExpiryEditor.js");
        expect(editor).not.toMatch(/key_history|loadVisaExpiryHistory|loadVisaIssuanceHistory|historyList/);
    });

    test("issuance values read effective, then base, then the row; Release derives from the payment date", () => {
        const v = { version: 2, base: { visa_reference_no: "A1", e_visa_payment_date: "2026-01-02", visa_expiry_date: "2028-01-01" }, effective: { visa_reference_no: "A2" } };
        expect(issuanceValues(v, "effective")).toEqual({ ref: "A2", pay: "2026-01-02", release: "2026-01-02", expiry: "2028-01-01", entry: "" });
        expect(issuanceValues(v, "base").ref).toBe("A1");
        expect(issuanceValues({ visa_reference_no: "flat", visa_release_date: "2026-02-02" }).release).toBe("2026-02-02");
    });

    test("actor, case reference and latest version", () => {
        expect(issuanceActorName({ provenance: "legacy_unknown", confirmed_by_name: "x" })).toBe("");
        expect(issuanceActorName({ confirmed_by_name: "Mubin Shaha" })).toBe("Mubin Shaha");
        expect(issuanceActorName({ confirmed_by: { name: "Shubham" } })).toBe("Shubham");
        expect(issuanceCaseRef({ ordinal: 2, extend_visa_case_id: 9 })).toBe(2);
        expect(issuanceCaseRef({ originating_case_id: 9 })).toBe(9);
        expect(latestIssuance([{ version: 1 }, { version: 3 }, { version: 2 }]).version).toBe(3);
        expect(latestIssuance([])).toBeNull();
    });

    test("correction fields map to their labels and date-ness by API key or prototype code", () => {
        expect(correctionLabelKey("visa_reference_no")).toBe("key_visa_reference_no");
        expect(correctionLabelKey("ref")).toBe("key_visa_reference_no");
        expect(correctionLabelKey("e_visa_payment_date")).toBe("key_e_visa_payment_date");
        expect(correctionLabelKey("expiry")).toBe("key_visa_expiry");
        expect(correctionLabelKey("unknown")).toBeNull();
        expect(isDateCorrection("visa_reference_no")).toBe(false);
        expect(isDateCorrection("ref")).toBe(false);
        expect(isDateCorrection("e_visa_payment_date")).toBe(true);
        expect(isDateCorrection("expiry")).toBe(true);
    });
});
