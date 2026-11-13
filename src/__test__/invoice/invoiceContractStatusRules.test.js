import fs from "fs";
import path from "path";
import {
    CONTRACT_SECTION_FIELDS, contractDateWindow, contractStatusErrors, fieldsAskedFor, isYmd, serverFieldErrors, withoutFieldsNotAsked,
} from "../../Views/Pages/Invoice/add-contract-invoice/contractStatusRules";

/* Contract Status rules sheet (MaidMatch_Local_Contract_Status_Date_Rules 22 Oct 2026.xlsx) on the Create Contract Invoice
   → Update worker step: one block per rule row (pass + fail), the −14 / +1095 day boundaries (same day, one day before /
   after), Early Release vs Visa (same day / before / after), a first entry (create) and a stored worker (edit), the
   server's field errors, and the form wiring. The existence checks (status / reason are active options) are the API's —
   see maidmatch-admin-api-nodejs src/worker/contract-status-rules.spec.ts. */

const TODAY = "2026-10-22";
const t = (key, params) => (params ? `${ key }|${ params.min }|${ params.max }` : key);
const day = (n) => { const d = new Date(`${ TODAY }T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const errorsOf = (values) => contractStatusErrors(values, TODAY, t);
const FINISHED = { contract_status: "1", visa_expiry_date: day(30), expect_released_early: "0" };
const TERMINATED = (status) => ({ contract_status: String(status), contract_end_date: day(-3) });

describe("Contract Status — always required for a Local worker", () => {
    test("fails when missing", () => expect(errorsOf({})).toEqual({ contract_status: "key_contract_status_is_required" }));
    test("passes when chosen", () => expect(errorsOf(FINISHED)).toEqual({}));
});

describe("Finished Contract / About to Finish", () => {
    test("Visa Expiry Date required", () => {
        expect(errorsOf({ ...FINISHED, visa_expiry_date: "" })).toEqual({ visa_expiry_date: "key_visa_expiry_date_is_required" });
        expect(errorsOf(FINISHED)).toEqual({});
    });
    test("Early Release Applicable ? required — No must be chosen explicitly", () => {
        expect(errorsOf({ ...FINISHED, expect_released_early: "" })).toEqual({ expect_released_early: "key_early_release_applicable_is_required" });
        expect(errorsOf({ ...FINISHED, expect_released_early: "0" })).toEqual({});
    });
    test("Early Release Date required only when Yes", () => {
        expect(errorsOf({ ...FINISHED, expect_released_early: "1" })).toEqual({ early_release_date: "key_early_release_date_is_required" });
        expect(errorsOf({ ...FINISHED, expect_released_early: "0", early_release_date: "" })).toEqual({});
    });
    test("Early Release Date strictly earlier than Visa Expiry Date: one day before passes, same day / one day after fail", () => {
        const at = (n) => errorsOf({ ...FINISHED, expect_released_early: "1", early_release_date: day(n) });
        expect(at(29)).toEqual({});
        expect(at(30)).toEqual({ early_release_date: "key_early_release_date_must_be_earlier_than_visa_expiry_date" });
        expect(at(31)).toEqual({ early_release_date: "key_early_release_date_must_be_earlier_than_visa_expiry_date" });
    });
    test("Contract End Date and the reason are not asked", () =>
        expect(errorsOf({ ...FINISHED, contract_end_date: "nonsense", terminated_reason: "" })).toEqual({}));
});

describe.each([2, 3, 4])("Terminated due to employer (status %i)", (status) => {
    test("Contract End Date required", () => {
        expect(errorsOf({ contract_status: String(status) })).toEqual({ contract_end_date: "key_contract_end_date_is_required" });
        expect(errorsOf(TERMINATED(status))).toEqual({});
    });
    test("Visa Expiry Date / Early Release / reason not asked", () =>
        expect(errorsOf({ ...TERMINATED(status), visa_expiry_date: "", expect_released_early: "", early_release_date: "x" })).toEqual({}));
});

describe("Terminated for Other Reason", () => {
    test("Contract End Date and Please select reason required", () => {
        expect(errorsOf({ contract_status: "5" })).toEqual({
            contract_end_date: "key_contract_end_date_is_required", terminated_reason: "key_reason_is_required",
        });
        expect(errorsOf({ ...TERMINATED(5), terminated_reason: "3" })).toEqual({});
    });
});

describe("date window — today −14 days to +1095 days, both ends included", () => {
    test("window", () => expect(contractDateWindow(TODAY)).toEqual({ min: day(-14), max: day(1095) }));
    describe.each([
        ["visa_expiry_date", FINISHED, "key_visa_expiry_date_must_be_between"],
        ["contract_end_date", TERMINATED(2), "key_contract_end_date_must_be_between"],
    ])("%s", (field, base, key) => {
        const at = (n) => errorsOf({ ...base, [field]: day(n) });
        const out = { [field]: `${ key }|08/10/2026|21/10/2029` };
        test("same day passes", () => expect(at(0)).toEqual({}));
        test("−14 passes, −15 fails", () => { expect(at(-14)).toEqual({}); expect(at(-15)).toEqual(out); });
        test("+1095 passes, +1096 fails", () => { expect(at(1095)).toEqual({}); expect(at(1096)).toEqual(out); });
    });
    test("a stored value that is not a date is reported as invalid", () =>
        expect(errorsOf({ contract_status: "2", contract_end_date: "15/10/2026" })).toEqual({ contract_end_date: "key_contract_end_date_is_invalid" }));
});

describe("create (first entry) and edit (stored worker)", () => {
    test("create: picking a status with nothing entered names every missing field", () =>
        expect(errorsOf({ contract_status: "1", expect_released_early: "1" })).toEqual({
            visa_expiry_date: "key_visa_expiry_date_is_required", early_release_date: "key_early_release_date_is_required",
        }));
    test("edit: a stored Finished worker switched to Terminated (Relocation) — only the new field counts", () =>
        expect(errorsOf({ ...FINISHED, contract_status: "2", contract_end_date: day(-1) })).toEqual({}));
    test("the request leaves out the fields the status does not ask for", () => {
        expect(withoutFieldsNotAsked({ ...FINISHED, contract_status: "2", contract_end_date: day(-1), terminated_reason: "3", name: "A" }))
            .toEqual({ contract_status: "2", contract_end_date: day(-1), name: "A" });
        expect(withoutFieldsNotAsked({ ...FINISHED, early_release_date: day(5) })).toEqual(FINISHED);
    });
    test("fieldsAskedFor", () => {
        expect(fieldsAskedFor("1", "1")).toEqual(["visa_expiry_date", "expect_released_early", "early_release_date"]);
        expect(fieldsAskedFor("5")).toEqual(["contract_end_date", "terminated_reason"]);
        expect(fieldsAskedFor("")).toEqual([]);
        expect(CONTRACT_SECTION_FIELDS).toHaveLength(5);
        expect(isYmd("2027-02-29")).toBe(false);
    });
});

describe("server refusals map to their fields", () => {
    test("the API's errors map (incl. the existence checks) is kept per field; anything else is a toast", () => {
        expect(serverFieldErrors({ message: "x", errors: { contract_status: "The provided contract status is invalid.", terminated_reason: "The provided reason is invalid.", name: "n" } }))
            .toEqual({ contract_status: "The provided contract status is invalid.", terminated_reason: "The provided reason is invalid." });
        expect(serverFieldErrors({ message: "x" })).toEqual({});
    });
});

describe("Update worker form wiring", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/Invoice/add-contract-invoice/AddWorkerDetailsOfInvoice.js"), "utf8");
    test("Next waits for the rule table; each field shows its own message", () => {
        expect(src).toMatch(/type="submit" className="btn btn-primary md" disabled=\{ sectionInvalid \|\| saving \}/);
        ["contract_status", "contract_end_date", "visa_expiry_date", "expect_released_early", "early_release_date", "terminated_reason"]
            .forEach((field) => expect(src).toContain(`fieldError('${ field }')`));
    });
    test("the status decides the fields; the dates pick inside the window; the reason list is the Worker module's", () => {
        expect(src).toMatch(/disabled=\{ workerDetailTabInfo\?\.type !== 1 \|\| !askedFields\.includes\('contract_end_date'\) \}/);
        expect(src).toMatch(/disabled=\{ workerDetailTabInfo\?\.type !== 1 \|\| !askedFields\.includes\('visa_expiry_date'\) \}/);
        expect(src.match(/min=\{ dateWindow\.min \} max=\{ dateWindow\.max \}/g)).toHaveLength(2);
        expect(src).toContain("askedFields.includes('terminated_reason') && (");
        expect(src).toContain("dispatch(fetchTerminationReason())");
    });
    test("the retired status-7 branch and the old clear-on-invalid date check are gone", () => {
        expect(src).not.toMatch(/=== 7/);
        expect(src).not.toContain("key_early_release_date_less_than_visa_expiry_date");
        expect(src).not.toContain("setContractStatusId");
    });
    test("a refused save shows the API's message under its field", () =>
        expect(src).toContain("serverFieldErrors(res?.payload)"));
    test("disabled inputs on invoice pages read as greyed out", () => {
        const css = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/Invoice/new-ui-shared.css"), "utf8");
        expect(css).toMatch(/\.invd \.input:disabled \{[^}]*background: var\(--bg-sunken\);[^}]*cursor: not-allowed;/);
    });
});
