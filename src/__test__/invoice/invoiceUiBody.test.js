import fs from "fs";
import path from "path";
import { formatHK, formatHKMinus, paymentLogRecordType } from "../../utils/utils";
import constData from "../../components/ReusableComponents/constants";

/* UI Step 3 — detail page body (UI verification 14 Oct, rows C-01 … C-49): Financial Summary, line items, Payment Records,
   Activity Timeline, Related Invoices and Remarks follow the prototype (Invoice_Detail.html: FinancialSummary,
   recordVisuals, ActivityTimeline, RelatedInvoices, Remarks). UI only: the figures, what is shown when, and admin-only
   UI are unchanged. */

const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");
const DETAIL = read("Views/Pages/Invoice/InvoiceDetail.css");
const EN = JSON.parse(fs.readFileSync(path.resolve(SRC, "../public/locales/en/translation.json"), "utf8"));

const CONTRACT = "Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js";
const STANDALONE = "Views/Pages/Invoice/general/PaymentTypeInvoice.js";
const EXCHANGED = "Views/Pages/Invoice/add-contract-invoice/ExchangePaymentInvoice.js";
const REVIEWS = ["Views/Pages/Invoice/add-contract-invoice/exchangePaymentReview.js", "Views/Pages/Invoice/general/exchangePaymentReview.js"];
const REFUNDS = ["Views/Pages/Invoice/add-contract-invoice/RefundInvoice.js", "Views/Pages/Invoice/general/RefundInvoice.js"];
const DETAIL_SCREENS = [CONTRACT, STANDALONE, EXCHANGED, ...REVIEWS, ...REFUNDS];
const TIP = {
    paid: "helpIco('Payment amount currently recorded. Pending Paid invoices show their recorded amount here.')",
    refunded: "helpIco('Approved refund value across non-voided refund children.')",
    adjust: "helpIco('Signed correction. Write-offs are represented as negative adjustment impact.')",
};
const CAPTION = "Unsettled and Bad Debt are classifications of unresolved amounts — not additional charges on top of the same Balance Due.";

describe("UI Step 3 · Financial Summary", () => {
    test("C-25: the detail body signs a negative with a leading minus; formatHK keeps its parentheses for Related Invoices", () => {
        expect([formatHKMinus(-500), formatHKMinus(500), formatHKMinus(-1234.5), formatHKMinus(0), formatHKMinus(null)])
            .toEqual(["-HK$500", "HK$500", "-HK$1,234.50", "HK$0", "HK$0"]);
        expect(formatHK(-500)).toBe("(HK$500)");
    });

    test("C-04: every help icon shows the reference tooltip bubble, not the browser title", () => {
        for (const file of DETAIL_SCREENS) {
            const src = read(file);
            expect([file, /const helpIco = \(tip\) => \(<span className="help-ico tt"><Icon name="info" size=\{ ?11 ?\} \/><span className="tt-bubble" role="tooltip">\{ tip \}<\/span><\/span>\);/.test(src)]).toEqual([file, true]);
            expect([file, /className="help-ico" title=/.test(src)]).toEqual([file, false]);
        }
        expect(DETAIL).toMatch(/\.invd \.fs-row \.label \.help-ico\.tt \.tt-bubble \{\s+left: -8px;\s+transform: none;/);
        expect(read("Views/Pages/Invoice/new-ui-shared.css")).toMatch(/\.invd \.tt:hover \.tt-bubble \{\s+opacity: 1; transition-delay: 200ms;/);
    });

    test("C-02, C-05, C-06: rows read Total … Paid, Balance Due, Unsettled, Bad Debt, Refunded, Adjustment — with the reference tips", () => {
        for (const file of [CONTRACT, STANDALONE, EXCHANGED, ...REVIEWS]) {
            const src = read(file);
            const at = (s) => src.indexOf(s);
            const order = [TIP.paid, "<div className={ 'fs-row prominent ' + balanceIntent }>", "{ fsClassified.unsettled > 0 && (",
                "{ fsClassified.badDebt > 0 && (", TIP.refunded, TIP.adjust].map(at);
            expect([file, order.every((i) => i > 0), order.every((i, n) => n === 0 || i > order[n - 1])]).toEqual([file, true, true]);
            expect([file, (src.match(/\{ fsAdjust !== 0 && \(/g) || []).length]).toEqual([file, 1]);
            expect([file, src.includes("{ fsAdjust > 0 ? '+' : '' }{ formatHKMinus(fsAdjust) }")]).toEqual([file, true]);
        }
    });

    test("C-07, C-12, C-13: the Unsettled / Bad Debt caption ends 'on top of the same Balance Due', on every non-refund screen", () => {
        for (const file of [CONTRACT, STANDALONE, EXCHANGED, ...REVIEWS]) {
            const src = read(file);
            expect([file, src.includes(CAPTION), src.includes("not additional charges.\n"), src.includes("not additional charges.\r\n")]).toEqual([file, true, false, false]);
        }
        // the exchange reviews read the same figures as the other screens
        for (const file of REVIEWS) {
            expect(read(file)).toMatch(/const fsRefunded = Number\(invoiceDetails\?\.refund_amount \|\| 0\);\s+const fsAdjust = \(invoiceDetails\?\.adjusted_amouts \|\| \[\]\)\.reduce/);
        }
    });

    test("C-14, C-15: the refund child's Total is in the default colour, with the reference Total / Paid tips", () => {
        for (const file of REFUNDS) {
            const src = read(file);
            expect([file, src.includes("helpIco('The invoice amount.')"), src.includes(TIP.paid), src.includes('<div className="v">-{ formatHK(totalAmount) }</div>')])
                .toEqual([file, true, true, true]);
            expect([file, /shown as a negative invoice total|carry no customer payment/.test(src)]).toEqual([file, false]);
        }
    });

    test("C-16: a same-cost exchange's outcome reads 'Same-cost exchange · fully settled by credit'", () => {
        expect(EN.key_outcome_credit_fully_applied).toBe("Same-cost exchange · fully settled by credit");
        for (const file of REVIEWS) expect(read(file)).not.toMatch(/'Credit Fully Applied'/);
    });
});

describe("UI Step 3 · line items, Payment Records, Activity Timeline, Related Invoices", () => {
    test("C-27: each Invoice API record title gets the reference recordVisuals glyph and intent", () => {
        const visual = (title) => {
            const type = paymentLogRecordType(title);
            const cfg = constData.RECORD_VISUALS[type] || { intent: "", icon: "info" };
            return [type, cfg.intent, cfg.icon];
        };
        expect([
            "Invoice voided", "Exchange voided", "Refund child voided", "Marked Unsettled", "Refund child marked Unsettled",
            "Marked Bad Debt", "Reverted", "Payment approved", "Remark added", "Reservation Fee expired",
            "Remaining Credit refund selected", "Remaining Credit written off", "Remaining Credit saved as credit",
        ].map(visual)).toEqual([
            ["void", "danger", "x"], ["void", "danger", "x"], ["refund_voided", "danger", "x"], ["marked_unsettled", "danger", "alert"],
            ["marked_unsettled", "danger", "alert"], ["marked_bad_debt", "danger", "alert"], ["revert", "success", "check"],
            ["payment_approved", "success", "check"], ["remark_added", "", "msg"], ["rf_expired", "danger", "calendar"],
            ["surplus_refund", "info", "refresh"], ["surplus_write_off", "warning", "edit"], ["surplus_credit", "info", "plus"],
        ]);
        // the titles that already mapped keep their visuals
        expect(["Invoice created", "Payment recorded", "Payment confirmed", "Adjustment recorded", "Write-Off recorded",
            "Refund child created", "Refund approved", "Exchange invoice created", "Underpayment child created", "Payment proof uploaded"]
            .map((title) => paymentLogRecordType(title)))
            .toEqual(["invoice_created", "payment_recorded", "payment_confirmed", "adjustment", "write_off", "refund_initiated",
                "refund_approved", "exchange_initiated", "underpayment_created", "proof_uploaded"]);
    });

    test("C-25: record amounts sign a negative with a leading minus; C-24: refund line amounts too, in the default colour", () => {
        const records = read("components/Invoice/InvoicePaymentRecords.js");
        expect(records).toMatch(/\{ !r\.amt \? '—' : formatHKMinus\(r\.amt\) \}/);
        for (const file of REFUNDS) {
            const src = read(file);
            expect([file, src.includes('<td className="right">{ formatHKMinus(it.amount) }</td>'), /style=\{ Number\(it\.amount\) < 0/.test(src)]).toEqual([file, true, false]);
        }
    });

    test("C-32, C-33: the separation note follows the last event inside the list, above the pager; info is the fallback glyph", () => {
        const src = read("components/Invoice/InvoiceActivityTimeline.js");
        expect(src).toMatch(/\}\) \}\s+<div className="audit-note">[\s\S]*?<\/div>\s+<\/div>\s+\{ invoiceActivityLogHasMore && \(/);
        expect((src.match(/className="audit-note"/g) || []).length).toBe(1);
        expect(src).toMatch(/\|\| \{ intent: "info", icon: "info" \};/);
    });

    test("C-21: the line-items helper reads '1 item' / 'n items'; C-23: the Exchanged screen's columns are 32% / auto / 120px", () => {
        for (const file of DETAIL_SCREENS) {
            expect([file, read(file).includes("{ (lineItems.length === 1 ? (t('key_item') || 'item') : (t('key_items') || 'items')).toLowerCase() }")]).toEqual([file, true]);
        }
        expect(read(EXCHANGED)).toMatch(/<th style=\{\{ width: '32%' \}\}>\{ t\('key_item_type'\) \}<\/th>\s+<th>\{ t\('key_description'\) \}<\/th>\s+<th className="right" style=\{\{ width: 120 \}\}>/);
    });

    test("C-36: a related reference that does not open is the neutral code colour; C-40: a refund child's parent row reads 'Parent invoice'", () => {
        expect(DETAIL).toMatch(/\.invd \.related-row \.info \.ref\.neutral,\s+\.invd \.related-row \.info \.ref\.neutral:hover \{\s+color: var\(--mc-text-code\);/);
        for (const file of REFUNDS) {
            const src = read(file);
            expect([file, src.includes("<div className=\"label\">{ p.invoice_type === 'underpayment' ? t('key_parent_underpayment_invoice') : (t('key_parent_invoice') || 'Parent invoice') }</div>"), src.includes("isExchangeParent")]).toEqual([file, true, false]);
        }
        expect(EN.key_parent_invoice).toBe("Parent invoice");
    });
});

describe("UI Step 3 · Remarks tab", () => {
    test("C-43: the invoice remarks list grows with its remarks (no 200px cap or inner scroll)", () => {
        expect(read("components/remarks/remarks.css")).toMatch(/\.remarks-list\{\s+overflow-y: auto;\s+overflow-x: hidden;\s+max-height: 200px;/);
        expect(DETAIL).toMatch(/\.invd \.remarks-host \.remarks-wrapper \.remarks-list \{\s+display: flex;\s+flex-direction: column;\s+gap: 10px;\s+max-height: none;\s+overflow: visible;/);
    });

    test("C-45, C-46, C-47: author 11.5px / 500, card radius 6px, text line-height 1.5 with no letter-spacing", () => {
        expect(DETAIL).toMatch(/\.invd \.remarks-host \.remarks-block \{\s+padding: 10px 12px;\s+background: var\(--bg-subtle\);\s+border: 1px solid var\(--line-2\);\s+border-radius: 6px;/);
        expect(DETAIL).toMatch(/\.invd \.remarks-host \.remarks-block h6 \{\s+font-size: 11\.5px;\s+font-weight: 500;/);
        expect(DETAIL).toMatch(/\.invd \.remarks-host \.remarks-block p\.grey \{\s+font-size: 12\.5px !important;\s+color: var\(--text-2\) !important;\s+line-height: 1\.5;\s+letter-spacing: 0;/);
    });
});
