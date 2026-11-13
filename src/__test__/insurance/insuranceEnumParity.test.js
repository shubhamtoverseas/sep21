import fs from "fs";
import path from "path";
import i18n from "i18next";
import {
    COVERAGE_LABELS, DATE_PRESET_KEYS, DEFAULT_SORT, REQUEST_TONE, REQUEST_TYPES,
} from "../../Views/Pages/insurance/dashboard/insuranceDashboardConfig";
import { getInsuranceColumns } from "../../Views/Pages/insurance/dashboard/insuranceDashboardColumns";
import { CANCELLATION_REASON_KEYS, CONFIRM_LABEL_KEYS, changeTypeLabel } from "../../Views/Pages/insurance/record/insuranceRecordConfig";

/* Enum parity (audit 33, I-5 4.3): the admin keeps its own copies of lists the insurance-api serves.
   This compares them with the server source. Needs the maidmatch-insurance-api checkout next to this
   repo (or INSURANCE_API_DIR); without it the suite is skipped. */

const apiDir = process.env.INSURANCE_API_DIR || path.resolve(__dirname, "../../../../maidmatch-insurance-api");
const hasApi = fs.existsSync(path.join(apiDir, "src/domain/insurance/rules.ts"));
const source = (rel) => fs.readFileSync(path.join(apiDir, rel), "utf8");

/* string values of `export const NAME = [ ... ]` */
const serverList = (rel, name) => {
    const m = source(rel).match(new RegExp(`export const ${name}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
    if (!m) throw new Error(`${name} not found in ${rel}`);
    return [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
};

/* keys of `const NAME: Record<…> = { key: …, }` */
const serverKeys = (rel, name) => {
    const m = source(rel).match(new RegExp(`const ${name}[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`));
    if (!m) throw new Error(`${name} not found in ${rel}`);
    return [...m[1].matchAll(/^\s*(\w+):/gm)].map((x) => x[1]);
};

/* `{ id: "address", … }` ids of CHANGE_TYPES */
const serverChangeTypes = () => {
    const m = source("src/domain/insurance/rules.ts").match(/export const CHANGE_TYPES\s*=\s*\[([\s\S]*?)\]\s*as const/);
    return [...m[1].matchAll(/id:\s*"([^"]+)"/g)].map((x) => x[1]);
};

(hasApi ? describe : describe.skip)("Insurance enum parity with insurance-api", () => {
    /* no copy loaded: a mapped value renders as its key name, an unmapped one as itself / "" */
    beforeAll(async () => {
        await i18n.init({ lng: "en", resources: { en: { translation: {} } } });
    });

    it("coverage labels and request types match R1", () => {
        expect(COVERAGE_LABELS).toEqual(serverList("src/services/insurance.records.services.ts", "COVERAGE_LABELS"));
        expect(REQUEST_TYPES).toEqual(serverList("src/services/insurance.records.services.ts", "REQUEST_TYPES"));
    });

    it("every sortable column and the default sort are R1 sort keys", () => {
        const server = serverKeys("src/services/insurance.records.services.ts", "SORT_EXPR");
        const all = ["workerName", "insuranceRef", "employerName", "activity", "policyPeriod", "coverageStatus", "openRequests",
            "csOwner", "branch", "expiry", "qbePolicyNumber", "contract", "submittedBy"];
        const fe = getInsuranceColumns(all).map((c) => c.sortKey).filter(Boolean);
        expect(fe.length).toBeGreaterThan(0);
        fe.forEach((k) => expect(server).toContain(k));
        expect(server).toContain(DEFAULT_SORT.key);
    });

    it("Next Step is retired on both sides; every request type has its result label and tag tone (INS02, 9 Nov)", () => {
        expect(source("src/domain/insurance/terms.ts")).not.toMatch(/export const NEXT_STEPS/);
        expect(Object.keys(CONFIRM_LABEL_KEYS)).toEqual(REQUEST_TYPES);
        expect(Object.keys(REQUEST_TONE)).toEqual(REQUEST_TYPES);
    });

    it("date presets match the server windows", () => {
        expect(Object.keys(DATE_PRESET_KEYS)).toEqual(serverList("src/domain/insurance/activity.ts", "DATE_PRESETS"));
    });

    it("cancellation reasons match M9", () => {
        expect(Object.keys(CANCELLATION_REASON_KEYS)).toEqual(serverList("src/domain/insurance/rules.ts", "CANCELLATION_REASONS"));
    });

    it("every change type has a label", () => {
        const ids = serverChangeTypes();
        expect(ids.length).toBe(6);
        ids.forEach((id) => expect(changeTypeLabel(id)).toMatch(/^key_ins_change_type_/));
    });
});
