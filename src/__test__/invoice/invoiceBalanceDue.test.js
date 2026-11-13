/* eslint-env jest */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { balanceDueOf, classifiedOf } from "../../Views/Pages/Invoice/invoiceBalance";

/* QA-27-040 (register #61 / #62): Balance Due on Unsettled / Bad Debt. The contract's domain machine (decide) moves the
   unrecognised amount out of Paid, into its bucket and into balance_due; every admin screen reads Balance Due through
   balanceDueOf, never the legacy remaining_balance (which no classification updates). The invoice rows below are what the
   machine writes: the contract repo's own src/domain/invoice, run as it is. Needs the maidmatch-contract checkout next to
   this repo (or CONTRACT_API_DIR); without it the machine-driven part is skipped. */

const contractDir = process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract");
const hasContract = fs.existsSync(path.join(contractDir, "src/domain/invoice/machine.ts"));

const PROVIDER = `
const { decide, figuresFromCache, InvoiceStatus: S } = require("./src/domain/invoice");
const ADMIN = { isAdmin: true, keys: new Set() };
/* one action on a stored invoice row: the row as the server stores it afterwards (its cache columns and status) */
const act = (row, action, input = {}, pending = 0) => {
    const f = { status: row.status, previousStatus: row.previous_status, type: "contract", paymentMethod: "fps", supportPresent: true, paymentPresent: true, figures: figuresFromCache(row, pending) };
    const t = decide(action, f, ADMIN, { reason: "QA-27-040", ...input });
    return { ...row, ...t.cache, status: t.toStatus };
};
const base = (over) => ({ invoice_type: "contract", final_amount: 11500, amount_due: 11500, paid_amount: 11500, balance_due: 0, unsettled_amount: 0, bad_debt_amount: 0, remaining_balance: null, previous_status: null, ...over });
/* a payment of HK$11,500 recorded and under review (Pending Paid): its proof deleted, then reverted */
const pendingPaid = base({ status: S.PENDING_PAID });
const proofDeleted = act(pendingPaid, "delete_proof", {}, 11500);
const reverted = act(proofDeleted, "revert", { restorePaid: 11500 });
/* Mark Unsettled on the whole of it, then Bad Debt */
const unsettled = act(pendingPaid, "mark_unsettled", {}, 11500);
const badDebt = act(unsettled, "mark_bad_debt");
/* partial: a Reservation Fee of HK$3,000 paid on HK$11,500; HK$2,000 of the HK$8,500 still due marked Unsettled */
const reservation = base({ status: S.RESERVATION_FEE, paid_amount: 3000, balance_due: 8500 });
const partial = act(reservation, "mark_unsettled", { amount: 2000 });
process.stdout.write("@@DATA@@" + JSON.stringify({ S, rows: { pendingPaid, proofDeleted, reverted, unsettled, badDebt, reservation, partial } }));
process.exit(0);`;

const DATA = hasContract
    ? JSON.parse(execFileSync(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", PROVIDER], { cwd: contractDir, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).split("@@DATA@@")[1])
    : null;
/* what every screen read before QA-27-040 */
const legacyRead = (row) => Number(row.remaining_balance || 0);

(hasContract ? describe : describe.skip)("Balance Due follows the domain machine (#61 / #62)", () => {
    it("Paid → Unsettled (the proof deleted): the amount leaves Paid and is the Balance Due and the Unsettled bucket", () => {
        const r = DATA.rows.proofDeleted;
        expect([r.status, Number(r.paid_amount)]).toEqual([DATA.S.UNSETTLED, 0]);
        expect(balanceDueOf(r)).toBe(11500);
        expect(classifiedOf(r)).toEqual({ unsettled: 11500, badDebt: 0 });
        expect(legacyRead(r)).toBe(0);
    });
    it("Revert: Paid restored, Balance Due HK$0, no bucket", () => {
        const r = DATA.rows.reverted;
        expect([r.status, Number(r.paid_amount)]).toEqual([DATA.S.PENDING_PAID, 11500]);
        expect(balanceDueOf(r)).toBe(0);
        expect(classifiedOf(r)).toEqual({ unsettled: 0, badDebt: 0 });
    });
    it("Mark Unsettled, then Bad Debt: Balance Due stays the amount; the bucket moves from Unsettled to Bad Debt", () => {
        expect([balanceDueOf(DATA.rows.unsettled), classifiedOf(DATA.rows.unsettled)]).toEqual([11500, { unsettled: 11500, badDebt: 0 }]);
        expect([DATA.rows.badDebt.status, balanceDueOf(DATA.rows.badDebt), classifiedOf(DATA.rows.badDebt)]).toEqual([DATA.S.BAD_DEBT, 11500, { unsettled: 0, badDebt: 11500 }]);
    });
    it("partial Unsettled: Balance Due is Amount Due − Paid (HK$8,500); the Unsettled row is the part classified (HK$2,000)", () => {
        const r = DATA.rows.partial;
        expect([r.status, Number(r.paid_amount)]).toEqual([DATA.S.UNSETTLED, 3000]);
        expect(balanceDueOf(r)).toBe(8500);
        expect(classifiedOf(r)).toEqual({ unsettled: 2000, badDebt: 0 });
    });
});

describe("balanceDueOf", () => {
    it("reads balance_due, never remaining_balance; HK$0 on a void invoice; floored at HK$0; a row without it: Amount Due − Paid", () => {
        expect(balanceDueOf({ status: 5, balance_due: "11500.00", remaining_balance: null })).toBe(11500);
        expect(balanceDueOf({ status: 1, balance_due: 0, remaining_balance: 999 })).toBe(0);
        expect(balanceDueOf({ status: 6, balance_due: 500 })).toBe(0);
        expect(balanceDueOf({ status: 1, balance_due: -5 })).toBe(0);
        expect(balanceDueOf({ status: 2, final_amount: "1000.00", paid_amount: "400.00" })).toBe(600);
        expect(balanceDueOf({ status: 1, final_amount: 400, paid_amount: 1000 })).toBe(0);
        expect(balanceDueOf(null)).toBe(0);
        expect(classifiedOf({ status: 6, unsettled_amount: 10 })).toEqual({ unsettled: 0, badDebt: 0 });
    });
});

it("every screen that shows Balance Due reads it through balanceDueOf (list, KPI cell, contract tab, worker listing, detail summaries, popups, preview, printout)", () => {
    const src = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
    const READERS = [
        "Views/Pages/Invoice/InvoiceListTableColumns.js", "Views/Pages/Invoice/Invoice.js", "Views/Pages/Contract/details/InvoiceTab.js",
        "Views/Pages/WorkerPage/worker-detail/newui/listing/WorkerInvoiceListing.js",
        "Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js", "Views/Pages/Invoice/general/PaymentTypeInvoice.js",
        "Views/Pages/Invoice/add-contract-invoice/ExchangePaymentInvoice.js", "Views/Pages/Invoice/add-contract-invoice/exchangePaymentReview.js",
        "Views/Pages/Invoice/general/exchangePaymentReview.js", "Views/Pages/Invoice/add-contract-invoice/AdjustAmountPopup.js",
        "Views/Pages/Invoice/general/AdjustAmountPopup.js", "components/Layout/popups/invoice-popups/MarkStatusModal.js",
        "components/Layout/popups/invoice-popups/InitiateExchangePopup.js", "Views/Pages/Invoice/general/PaymentDocumentCard.js",
        "Views/Pages/Invoice/general/PrintoutPreviewModal.js", "Views/Pages/Invoice/general/SavedPrintoutRows.js",
    ];
    for (const rel of READERS) {
        const s = src(rel);
        expect([rel, /import \{[^}]*balanceDueOf[^}]*\} from "[./]+(Views\/Pages\/Invoice\/|Invoice\/)?invoiceBalance";/.test(s) || /from "\.\/invoiceBalance"/.test(s)]).toEqual([rel, true]);
        expect([rel, /remaining_balance\s*(\|\||\?\?|\))/.test(s)]).toEqual([rel, false]);
    }
    // the classified rows show their bucket, not the whole Balance Due
    for (const rel of READERS.slice(4, 9)) expect([rel, src(rel).includes("formatHK(fsClassified.unsettled)") && src(rel).includes("formatHK(fsClassified.badDebt)")]).toEqual([rel, true]);
    // the list sorts Balance Due by the read-model column
    expect(src("components/ReusableComponents/constants.js")).toContain("balance_due: 'balance_due', branch: 'branch_name'");
});
