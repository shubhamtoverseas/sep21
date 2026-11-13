import fs from "fs";
import path from "path";

/* Unused translation keys that carried retired terms or old rules are gone (Payment Method Rules v4 C-2, B-4, B-11, B-13;
   CLAUDE.md §5; Step 8 F5), and the zh-HK QR hint no longer says "time code" (English until LCC translates it).
   Conflicts sheet U-0235 (27 Oct 2026): there is no Partial Payment, so its create-flow keys are gone too. The printout
   key of a stored partial invoice (key_partial_payment_paid) stays: those invoices still print. */

const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
const ZH_HK = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/zh_HK/translation.json"), "utf8"));

test("the retired keys are gone in both languages", () => {
    for (const key of ["key_please_upload_a_file_smaller_than_50_mb", "key_reference_within_48_hours_for_verification", "key_swipe_card_terminal_instruction",
        "key_transaction_time_code", "key_bank_in_remarks", "key_unionpay_number_last_4_digits", "key_partial_pay", "key_partial_payment",
        "key_partial_payment_amount_should_be_less_than_total_amount",
        // U-0235: the Partial Payment create flow and the exchange screen's Reservation Fee checks (ruling C7)
        "key_partial_payment_due_now", "key_please_enter_partial_payment_amount_first", "key_please_select_future_date_time",
        "key_please_select_reservation_date_first", "key_please_select_reservation_time_first", "key_please_select_payment_type"]) {
        expect([key, EN[key], ZH_HK[key]]).toEqual([key, undefined, undefined]);
    }
    // the printouts of stored partial invoices still read it
    expect(EN.key_partial_payment_paid).toBeTruthy();
});

test("the QR hint says approval code in both languages", () => {
    const key = "key_QR_receipts_show_a_transaction_reference_only_no_HH_MM_SS_time_code";
    expect(EN[key]).toBe("QR receipts show a transaction reference only — no HH:MM:SS approval code");
    expect(ZH_HK[key]).toBe(EN[key]);
});
