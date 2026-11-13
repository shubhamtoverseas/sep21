import fs from "fs";
import path from "path";

/* Proof and refund documentation copy on the exchange review and refund screens (Payment Method Rules v4 B-5, C-6, B-13;
   Step 8 F2). The exchange review screens said Cheque and Bank Transfer had 48 hours to upload before the invoice turned
   Unsettled — Cheque has 72 h (C-6) and Bank Transfer is recorded with its proof (30-day approval). They now show the
   detail proof card's copy and the deadline the Invoice API stored. The refund screens reused those payment hints for the
   refund document; they now say what the company-cheque route needs (prototype refund documentation). */

const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
const ZH_HK = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/zh_HK/translation.json"), "utf8"));

jest.mock("../../services/invoices", () => ({ getPaymentMethodCatalogueAPI: jest.fn() }));
const { missingDocumentHintKey, missingDocumentRuleKey } = require("../../Views/Pages/Invoice/general/PaymentDocumentCard");

const EXCHANGE_REVIEWS = ["Views/Pages/Invoice/add-contract-invoice/exchangePaymentReview.js", "Views/Pages/Invoice/general/exchangePaymentReview.js"];
const REFUND_SCREENS = ["Views/Pages/Invoice/add-contract-invoice/RefundInvoice.js", "Views/Pages/Invoice/general/RefundInvoice.js"];

describe("exchange review screens: the payment's real deadline", () => {
    test("the hint is the detail proof card's (Cash 48 h; none for methods recorded with their proof, Cheque too — U-0233)", () => {
        expect(missingDocumentHintKey("cash")).toBe("key_upload_scanned_image_deposit_receipt");
        for (const method of ["cheque", "bank_transfer", "bank_in", "fps", "fps_direct", "payme", "credit_card"]) expect([method, missingDocumentHintKey(method)]).toEqual([method, ""]);
        // the side card's missing state shows the short rule of the same deadline (UI Step 4, D-22: reference ProofSide)
        expect(missingDocumentRuleKey("cash")).toBe("key_deposit_receipt_deadline_48h");
        for (const method of ["cheque", "bank_transfer", "bank_in", "fps", "fps_direct", "payme", "credit_card"]) expect([method, missingDocumentRuleKey(method)]).toEqual([method, ""]);
        for (const file of EXCHANGE_REVIEWS) {
            const src = read(file);
            expect(src).toMatch(/\{ missingDocumentRuleKey\(invoiceDetails\?\.payment_method\) && \(/);
            expect(src).toMatch(/<PaymentDeadlineCard deadline=\{ invoiceDetails\?\.paymentDeadline \|\| null \} \/>/);
            expect(src).not.toMatch(/key_upload_scanned_image_cheque'|key_upload_scanned_image_bank_in_reference/);
        }
    });
});

describe("refund screens: the refund document's own copy", () => {
    test("the company-cheque route asks for the cheque copy, required before approval (prototype)", () => {
        expect(EN.key_cheque_copy_missing).toBe("Cheque copy missing");
        expect(EN.key_required_before_approval).toBe("Required before approval");
        for (const file of REFUND_SCREENS) {
            const src = read(file);
            expect(src).not.toMatch(/uploadAlertKey|key_upload_scanned_image_/);
            expect(src).toMatch(/\{ t\('key_cheque_copy_missing'\) \}/);
            expect(src).toMatch(/\{ t\('key_required_before_approval'\) \}/);
            // the panel shows only on the company-cheque route
            expect(src).toMatch(/const uploadRequired = invoiceDetails\?\.refundRoute === "cheque";/);
        }
    });
});

test("the 48-hour payment hints and their 銀行入帳 wording are gone", () => {
    for (const key of ["key_upload_scanned_image_cheque", "key_upload_scanned_image_bank_in_reference", "key_upload_scanned_image_fps_direct"]) {
        expect([key, EN[key], ZH_HK[key]]).toEqual([key, undefined, undefined]);
    }
});
