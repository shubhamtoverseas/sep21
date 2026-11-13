import fs from "fs";
import path from "path";

/* Bank Transfer (C-4, conflicts sheet U-0231, 27 Oct): Bank Name is required and comes first, then the Bank Transfer
   Reference, labelled as the spec names it (the printouts already use key_bank_in_reference, "Bank Transfer Reference").
   The Invoice API requires the same two fields in the same order. */

const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const EN = JSON.parse(fs.readFileSync(path.resolve(SRC, "../public/locales/en/translation.json"), "utf8"));
const contractDir = process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract");
const hasContract = fs.existsSync(path.join(contractDir, "src/domain/invoice/paymentMethods.ts"));

describe("Bank Transfer fields", () => {
    test("the form asks Bank Name first, then the Bank Transfer Reference", () => {
        const src = read("Views/Pages/Invoice/payment-method-selector/PaymentFields.js");
        const block = src.slice(src.indexOf('resolvedMethod.value === "bank_transfer"'), src.indexOf('resolvedMethod.value === "cheque"'));
        const bank = block.indexOf('t("key_bank_name")');
        const reference = block.indexOf('t("key_bank_in_reference")');
        expect(bank).toBeGreaterThan(0);
        expect(reference).toBeGreaterThan(bank);
        expect(block).not.toMatch(/key_transfer_reference"/);
    });

    test("the footer's Required list and the messages use the same label", () => {
        expect(read("Views/Pages/Invoice/payment-method-selector/PaymentEntry.js")).toMatch(/transfer_reference: "key_bank_in_reference",/);
        expect(EN.key_bank_in_reference).toBe("Bank Transfer Reference");
        expect(EN.key_transfer_reference_is_required).toBe("Bank Transfer Reference is required");
    });

    (hasContract ? test : test.skip)("the Invoice API requires Bank Name and the reference, in that order", () => {
        const catalogue = fs.readFileSync(path.join(contractDir, "src/domain/invoice/paymentMethods.ts"), "utf8");
        expect(catalogue).toMatch(/code: "bank_transfer"[\s\S]*?requiredFields: \["bank", "transfer_reference", "proof"\]/);
        const api = JSON.parse(fs.readFileSync(path.join(contractDir, "src/locales/en.json"), "utf8"));
        expect(api.PAYMENT_TRANSFER_REFERENCE_REQUIRED).toBe(EN.key_transfer_reference_is_required);
    });
});
