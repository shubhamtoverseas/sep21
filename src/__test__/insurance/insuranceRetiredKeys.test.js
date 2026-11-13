import fs from "fs";
import path from "path";

/* Conflicts sheet U-0062 / U-0071 (B13) and ruling C10 (27 Oct 2026): translation keys nothing reads any more are gone —
   Add Insurance Invoice, the endorsement leftovers, New General Invoice and the 19 key_insurance_perm_* labels (the
   permission editor names insurance grants from its own catalogue). Kept: key_endorsement (activity and status tags) and
   key_ins_req_endorsement, which the dashboard builds from the request type ("Endorsement" is still a request type). */

const locale = (lang) => JSON.parse(fs.readFileSync(path.resolve(__dirname, `../../../public/locales/${ lang }/translation.json`), "utf8"));
const EN = locale("en");
const ZH_HK = locale("zh_HK");
const PERM = ["add_coverage", "bulk_change_cs", "cancel_policy", "change_branch", "change_cs", "change_governing_contract", "close_issue",
    "confirm_change", "contract_entry", "correct_record", "create_worker", "details_view", "invoice_reuse_override", "policy_number_override",
    "record_cancellation_result", "reject_request", "renew", "request_change", "withdraw_request"];

test("the orphaned insurance and invoice keys are gone in both languages", () => {
    const keys = ["key_add_insurance_invoice", "key_confirm_endorsement", "key_endorsement_type", "key_please_select_endorsement_type",
        "key_submit_endorsement_request", "key_new_general_invoice", ...PERM.map((p) => `key_insurance_perm_${ p }`)];
    expect(PERM).toHaveLength(19);
    for (const key of keys) expect([key, EN[key], ZH_HK[key]]).toEqual([key, undefined, undefined]);
    expect(Object.keys(EN).filter((k) => k.startsWith("key_insurance_perm_"))).toEqual([]);
});

test("the endorsement keys still read are kept", () => {
    expect(EN.key_endorsement).toBe("Endorsement");
    expect(EN.key_ins_req_endorsement).toBe("Change policy");
    const config = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/insurance/dashboard/insuranceDashboardConfig.js"), "utf8");
    expect(config).toMatch(/translation\(`key_ins_req_\$\{String\(type\)\.toLowerCase\(\)\}`\)/);
});
