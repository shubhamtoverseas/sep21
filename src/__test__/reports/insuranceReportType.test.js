import fs from "fs";
import path from "path";
import i18n from "i18next";
import en from "../../../public/locales/en/translation.json";
import zhHK from "../../../public/locales/zh_HK/translation.json";
import configData from "../../components/ReusableComponents/app-configs";
import { InsuranceReportTableColumns } from "../../Views/Pages/reports/insurance-report/InsuranceReportTableColumns";

/* PROMPT 8 row 5 (U-0064; owner, 11 Nov 2026: Q8-1 (a)): the HRMS Insurance report's Type is the kind of the record's
   applicable period, sent by hrms as new_policy / renewal / legacy_review and shown as "New policy" / "Renewal" /
   "Legacy - to review" in the table, the Excel export and the Type filter. The legacy values new / renew are gone.
   Fails before: the table and the export showed the raw value, the filter offered new / renew. */

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

describe("HRMS Insurance report Type (PROMPT 8 row 5)", () => {
    it("offers the three hrms codes with their labels; the legacy new / renew mapping is gone", () => {
        expect(configData.insuranceReportTypes.map((t) => t.id)).toEqual(["new_policy", "renewal", "legacy_review"]);
        expect(configData.insuranceReportTypes.map((t) => i18n.t(t.translationKey))).toEqual(["New policy", "Renewal", "Legacy - to review"]);
        expect(configData.invoiceTypeMapping).toBeUndefined();
    });

    it("the table and the Excel export show the code's label; an empty Type shows '-'", () => {
        const typeColumn = InsuranceReportTableColumns().find((c) => c.sortKey === "type");
        expect(typeColumn.render({ type: "new_policy" }).props.children).toBe("New policy");
        expect(typeColumn.render({ type: "legacy_review" }).props.children).toBe("Legacy - to review");
        expect(typeColumn.render({ type: null }).props.children).toBe("-");
        const rows = configData.exportInsuranceReport([{ type: "new_policy" }, { type: "renewal" }, { type: "legacy_review" }, { type: null }]);
        expect(rows.map((r) => r.Type)).toEqual(["New policy", "Renewal", "Legacy - to review", "-"]);
    });

    it("the Type filter offers and restores the codes", () => {
        const src = fs.readFileSync(path.join(__dirname, "../../Views/Pages/reports/insurance-report/InsuranceReportFilter.js"), "utf8");
        expect(src).toMatch(/configData\.insuranceReportTypes\.map\(/);
        expect(src).toMatch(/configData\.insuranceReportTypes\.find\(/);
        expect(src).not.toMatch(/invoiceTypeMapping/);
    });

    it("the labels exist in en and zh_HK (the new one shows the English until it is reviewed)", () => {
        for (const key of ["key_ins_req_new", "key_ins_req_renew", "key_ins_report_type_legacy_review"]) {
            expect(en[key]).toBeTruthy();
            expect(zhHK[key]).toBeTruthy();
        }
        expect(zhHK.key_ins_report_type_legacy_review).toBe("Legacy - to review");
    });

    const HRMS = path.join(process.env.HRMS_API_DIR || path.resolve(__dirname, "../../../../maidmatch-hrms-api"), "src/repository/contract.insurance.repository.ts");
    (fs.existsSync(HRMS) ? it : it.skip)("the codes are hrms's INSURANCE_REPORT_TYPES (hrms checked out next to this repo, or HRMS_API_DIR)", () => {
        const src = fs.readFileSync(HRMS, "utf8");
        const list = /INSURANCE_REPORT_TYPES = \[([^\]]*)\]/.exec(src)[1].match(/"([a-z_]+)"/g).map((s) => s.replace(/"/g, ""));
        expect(configData.insuranceReportTypes.map((t) => t.id)).toEqual(list);
    });
});
