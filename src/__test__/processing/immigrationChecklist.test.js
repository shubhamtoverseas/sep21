/* eslint-env jest */
import {
    buildImmigrationRequirementGroups, buildImmigrationRequirementOptions, countsTowardReady, flattenImmigrationRequirementRows, immigrationChecklistRows, immigrationMarksPayload,
} from "../../Views/Pages/ProcessingPage/processing-documents/immigrationRequirementOptions";
import { IMMIGRATION_GROUP } from "../../Views/Pages/ProcessingPage/processingConstants";

jest.mock("../../utils/translation", () => {
    const t = (key) => key;
    return { __esModule: true, default: t, translation: t };
});

/* contract 22 Oct 2026 (C15): the admin API's `immigration_checklist` for contract 27 (Entry), trimmed */
const row = (key, treatment = "show", section = null, blocking = true, physical = false) => ({ key, treatment, section, blocking, physical, upload: !physical });
const details = {
    immigration_checklist: {
        purpose: "entry", resolved: true,
        rows: [
            row("notarized_contract_original"), row("employer_id_988b"), row("employer_hkid_copy"), row("employer_id_407e", "case_only", null, false),
            row("helper_id_988a"), row("helper_hkid_copy", "conditional", "helper_hkid"), row("id_522_copy", "case_only", null, false),
            row("id_934a", "conditional", "driving_duties"),
            row("letter_of_financial_support", "conditional", "financial_support"), row("supporters_marriage_certificate_copy", "conditional", "financial_support", false),
            row("tenancy_agreement", "conditional", "public_rental"),
            row("helper_passport_original", "conditional", "helper_passport_inspection", true, true),
            row("additional_supporting_letter", "optional", null, false), row("speed_up_letter", "optional", null, false),
        ],
        sections: ["helper_hkid", "driving_duties", "financial_support", "public_rental"],
        case_only: ["id_522_copy", "employer_id_407e"],
    },
    immigration_applicability: { driving_duties: { assessment: "does_not_apply" }, financial_support: { assessment: "applies" } },
    employer_id_988b_uploaded: 1, employer_id_988b_prepared: "1", employer_id_988b_ready: true,
    helper_id_988a_uploaded: 0, id_522_copy_uploaded: 1,
};

describe("immigrationChecklistRows", () => {
    const rows = immigrationChecklistRows(details);
    it("one row per server row, in the server's order, on the stable key", () => {
        expect(rows.map((r) => r.requirementKey)).toEqual(details.immigration_checklist.rows.map((r) => r.key));
    });
    it("labels from the registry, system-form keys only for the ImmD forms", () => {
        expect(rows.find((r) => r.requirementKey === "employer_hkid_copy").label).toBe("key_employers_hkid_copy");
        expect(rows.find((r) => r.requirementKey === "employer_id_988b")).toMatchObject({ label: "ID 988B", key: "ID988B" });
        expect(rows.find((r) => r.requirementKey === "speed_up_letter").key).toBe("VISA_SPEED_UP_LETTER_TO_IMMIGRATION");
        expect(rows.find((r) => r.requirementKey === "tenancy_agreement").key).toBeNull();
    });
    it("marks read as 1 / \"1\" / true; Uploaded derived; a physical original has no Uploaded", () => {
        expect(rows.find((r) => r.requirementKey === "employer_id_988b")).toMatchObject({ prepared: true, ready: true, uploaded: "Yes", isDoc: true });
        expect(rows.find((r) => r.requirementKey === "helper_id_988a")).toMatchObject({ prepared: false, uploaded: "No" });
        expect(rows.find((r) => r.requirementKey === "helper_passport_original")).toMatchObject({ physical: true, uploaded: null, upload: false });
    });
    it("treatment → case-only / optional flags; blocking follows the server", () => {
        expect(rows.find((r) => r.requirementKey === "id_522_copy")).toMatchObject({ caseOnly: true, blocking: false, group: IMMIGRATION_GROUP.HELPER });
        expect(rows.find((r) => r.requirementKey === "additional_supporting_letter")).toMatchObject({ optional: true, group: IMMIGRATION_GROUP.OPTIONAL });
        expect(rows.find((r) => r.requirementKey === "supporters_marriage_certificate_copy")).toMatchObject({ blocking: false, sub: "key_only_if_relationship_relied_on" });
        expect(rows.filter(countsTowardReady).map((r) => r.requirementKey)).toEqual([
            "notarized_contract_original", "employer_id_988b", "employer_hkid_copy", "helper_id_988a", "helper_hkid_copy", "id_934a", "letter_of_financial_support", "tenancy_agreement", "helper_passport_original",
        ]);
    });
    it("a key outside the registry still renders (fallback label, group by prefix)", () => {
        const [r] = immigrationChecklistRows({ immigration_checklist: { rows: [row("employer_new_thing")] } });
        expect(r).toMatchObject({ label: "key_employer_new_thing", group: IMMIGRATION_GROUP.EMPLOYER });
    });
    it("no checklist → no rows (never the old category datasets)", () => {
        expect(immigrationChecklistRows({ employer_id_988b_prepared: 1 })).toEqual([]);
    });
});

describe("buildImmigrationRequirementGroups", () => {
    it("Contracts → Employer → Helper → sections in force (server order, unlisted sections after) → Optional", () => {
        const groups = buildImmigrationRequirementGroups(details);
        expect(groups.map((g) => g.key)).toEqual(["contract", "employer", "helper", "helper_hkid", "driving_duties", "financial_support", "public_rental", "helper_passport_inspection", "optional"]);
        expect(groups.find((g) => g.key === "helper").rows.map((r) => r.requirementKey)).toEqual(["helper_id_988a", "id_522_copy"]);
        expect(groups.find((g) => g.key === "driving_duties")).toMatchObject({ section: true, applicability: "does_not_apply", label: "key_driving_duties" });
    });
    it("hideNotApplicable drops an assessed does_not_apply section and keeps an unassessed one", () => {
        const keys = buildImmigrationRequirementGroups(details, { hideNotApplicable: true }).map((g) => g.key);
        expect(keys).not.toContain("driving_duties");
        expect(keys).toContain("public_rental");
    });
    it("link options: every uploadable row once, the physical original excluded", () => {
        const options = buildImmigrationRequirementOptions(details).map((o) => o.value);
        expect(options).not.toContain("helper_passport_original");
        expect(options).toContain("id_522_copy");
        expect(new Set(options).size).toBe(options.length);
    });
    it("repeated labels carry the group suffix", () => {
        const d = { immigration_checklist: { rows: [row("letter_of_financial_support", "conditional", "financial_support"), row("letter_of_financial_support_company", "conditional", "company_support")], sections: ["financial_support", "company_support"] } };
        const flat = flattenImmigrationRequirementRows(buildImmigrationRequirementGroups(d));
        expect(flat.map((r) => r.optionLabel)).toEqual(["key_letter_of_financial_support — key_financial_support", "key_letter_of_financial_support — key_if_company_support"]);
    });
});

describe("immigrationMarksPayload", () => {
    it("Prepared / Ready as 0 / 1 on the stable key, nothing else", () => {
        const payload = immigrationMarksPayload(immigrationChecklistRows(details));
        expect(payload).toMatchObject({ employer_id_988b_prepared: 1, employer_id_988b_ready: 1, helper_id_988a_prepared: 0, helper_id_988a_ready: 0, id_522_copy_prepared: 0 });
        expect(Object.keys(payload).some((k) => k.endsWith("_uploaded"))).toBe(false);
        expect(Object.keys(payload)).toHaveLength(details.immigration_checklist.rows.length * 2);
    });
});
