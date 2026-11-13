import fs from "fs";
import path from "path";
import { APPROVE_PAYMENT_KEYS, batchActions, findAction, isBlocked } from "../../Views/Pages/Invoice/invoiceActionList";

/* Decision AA-06 (13 Oct): the Invoice API decides what a status offers and why an offered action is blocked; the screens
   render its action list — { id, name, key, allowed, reason } — and match entries by key, never by the translated name. */

const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));

/* GET get-action-list for a fully paid contract invoice, in Chinese (zh-HK): the names are the API's translations */
const LIST = [
    { id: 0, name: "調整金額", key: "adjust", allowed: true, reason: null },
    { id: 0, name: "撇帳", key: "write_off", allowed: false, reason: "No outstanding balance" },
    { id: 6, name: "作廢", key: "void", allowed: false, reason: "Blocked — cannot Void an A1 that has been exchanged" },
];

describe("the action list helpers", () => {
    test("entries are found by key, whatever the language of the name", () => {
        expect(findAction(LIST, "write_off")).toBe(LIST[1]);
        expect(findAction(LIST, "adjust")).toBe(LIST[0]);
        expect(findAction(LIST, "mark_bad_debt")).toBeNull();
        expect(findAction(null, "void")).toBeNull();
        const cash = [{ id: 1, name: "Mark as Paid", key: "verify_deposit_receipt", allowed: false, reason: "r" }];
        expect(findAction(cash, APPROVE_PAYMENT_KEYS)).toBe(cash[0]);
    });

    test("an entry with allowed: false is blocked; a missing entry is not", () => {
        expect(isBlocked(LIST[1])).toBe(true);
        expect(isBlocked(LIST[0])).toBe(false);
        expect(isBlocked(null)).toBe(false);
        expect(isBlocked({ id: 6, name: "Void" })).toBe(false); // an older API without the flag
    });

    test("a batch never offers a blocked status change, nor Adjust / Write-Off", () => {
        expect(batchActions(LIST)).toEqual([]);
        const pendingPaid = [{ id: 1, key: "approve_payment", allowed: false, reason: "r" }, { id: 5, key: "mark_unsettled", allowed: true }];
        expect(batchActions(pendingPaid)).toEqual([pendingPaid[1]]);
    });

    test("P1b #229: no batch Void when a Contract or Exchange invoice is selected; Standalone and refund children keep it", () => {
        const withVoid = [{ id: 5, key: "mark_unsettled", allowed: true }, { id: 6, key: "void", allowed: true }];
        const ids = (list) => list.map((action) => action.id);
        expect(ids(batchActions(withVoid, [{ id: 1, invoice_type: "contract" }]))).toEqual([5]);
        expect(ids(batchActions(withVoid, [{ id: 2, invoice_type: "exchange" }]))).toEqual([5]);
        expect(ids(batchActions(withVoid, [{ id: 3, invoice_type: "general" }, { id: 1, invoice_type: "contract" }]))).toEqual([5]);
        expect(ids(batchActions(withVoid, [{ id: 3, invoice_type: "general" }]))).toEqual([5, 6]);
        expect(ids(batchActions(withVoid, [{ id: 4, invoice_type: "contract_refund" }, { id: 5, invoice_type: "general_refund" }]))).toEqual([5, 6]);
        expect(ids(batchActions(withVoid))).toEqual([5, 6]);
    });
});

const DETAIL_SCREENS = [
    "Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js", "Views/Pages/Invoice/general/PaymentTypeInvoice.js",
    "Views/Pages/Invoice/add-contract-invoice/ExchangePaymentInvoice.js",
    "Views/Pages/Invoice/add-contract-invoice/exchangePaymentReview.js", "Views/Pages/Invoice/general/exchangePaymentReview.js",
    "Views/Pages/Invoice/add-contract-invoice/RefundInvoice.js", "Views/Pages/Invoice/general/RefundInvoice.js",
];

describe("the detail screens render the API's list", () => {
    test("no screen matches an action by its English name, nor keeps a reason copy of its own", () => {
        for (const file of DETAIL_SCREENS) {
            const src = read(file);
            expect(src).not.toMatch(/name === "(Approve Refund|Adjust Amount|Write Off)"/);
            expect(src).not.toMatch(/key_write_off_blocked_reason|key_blocked_reservation_fee_expired|key_please_upload_scanned_image_payment/);
        }
        for (const key of ["key_write_off_blocked_reason", "key_blocked_reservation_fee_expired", "key_please_upload_scanned_image_payment"]) {
            expect(EN[key]).toBeUndefined();
        }
    });

    test("Write-Off shows only when the API lists it, disabled with the API's reason when blocked", () => {
        for (const file of DETAIL_SCREENS.filter((f) => !f.includes("ExchangePaymentInvoice") && !f.includes("general/RefundInvoice"))) {
            const src = read(file);
            expect(src).not.toMatch(/canWriteOff/);
            expect(src).toMatch(/const writeOffAction = findAction\(actionStatus(Custom)?List, 'write_off'\);/);
            expect(src).toMatch(/\{ isBlocked\(writeOffAction\) && <span className="blocked">\{ writeOffAction\.reason \}<\/span> \}/);
        }
    });

    test("Adjust and Void are disabled with the API's reason when blocked (expired Reservation Fee, exchanged A1)", () => {
        for (const file of DETAIL_SCREENS.filter((f) => !f.includes("ExchangePaymentInvoice"))) {
            const src = read(file);
            expect(src).toMatch(/\{ isBlocked\(voidAction\) && <span className="blocked">\{ voidAction\.reason \}<\/span> \}/);
            if (!file.includes("general/RefundInvoice")) {
                expect(src).toMatch(/\{ isBlocked\(adjustAction\) && <span className="blocked">\{ adjustAction\.reason \}<\/span> \}/);
            }
        }
        // the exchange payment screen renders the whole list in one loop
        expect(read("Views/Pages/Invoice/add-contract-invoice/ExchangePaymentInvoice.js")).toMatch(/const blocked = isBlocked\(action\);/);
    });

    test("an exchange invoice offers no Refund (a status that never allows an action hides it)", () => {
        for (const file of ["Views/Pages/Invoice/add-contract-invoice/exchangePaymentReview.js", "Views/Pages/Invoice/general/exchangePaymentReview.js"]) {
            const src = read(file);
            expect(src).toMatch(/const showBlockedRefund = mayRefund && \(IsInvoiceRefundPermission === 'y' \|\| isAdmin\);/);
            expect(src).not.toMatch(/isExchangeInvoice \|\| mayRefund/);
        }
    });

    test("the contract refund screen lists its actions again once the cheque copy is uploaded", () => {
        expect(read("Views/Pages/Invoice/add-contract-invoice/RefundInvoice.js"))
            .toMatch(/dispatch\(fetchInvoiceDetails\(\{ invoice_id \}\)\);\s+\/\/[^\n]*\s+if \(invoiceStatus && invoiceId\) dispatch\(fetchActionStatusList\(/);
    });

    test("the listing's batch bar and batch popup offer only allowed status changes, for the selected invoices' rows", () => {
        const list = read("Views/Pages/Invoice/Invoice.js");
        expect(list).toMatch(/batchActions\(actionStatusList, selectedInvoiceRows\)\.map\(item =>/);
        expect(list).toMatch(/<ActionStatusPopup [^\n]*?selectedInvoices=\{ selectedInvoiceRows \}/);
        // the table hands back id and status only: the rows come from the listed invoices
        expect(list).toMatch(/const selectedInvoiceRows = useMemo\(\(\) => invoices\.filter\(\(inv\) => isSelectedItems\.some\(\(item\) => item\?\.id === inv\?\.id\)\)/);
        expect(read("components/Layout/popups/invoice-popups/ActionStatusPopup.js")).toMatch(/useState\(batchActions\(actionStatusList, selectedInvoices\)\)/);
    });
});
describe("the detail screens ask for the action list", () => {
    const SCREENS = [
        "Views/Pages/Invoice/general/PaymentTypeInvoice.js",
        "Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js",
        "Views/Pages/Invoice/add-contract-invoice/ExchangePaymentInvoice.js",
        "Views/Pages/Invoice/general/exchangePaymentReview.js",
        "Views/Pages/Invoice/general/RefundInvoice.js",
    ];
    test.each(SCREENS)("%s: never asked before the invoice has loaded, nor for the previous invoice", (rel) => {
        const src = read(rel);
        const at = src.indexOf("dispatch(fetchActionStatusList(");
        const effect = src.slice(src.lastIndexOf("useEffect(() => {", at), src.indexOf("]);", at) + 3);
        expect(effect).toContain("if (!invoiceDetails?.status || Number(invoiceDetails.id) !== Number(invoice_id)) return;");
        expect(effect).toContain("[dispatch, invoiceDetails, invoice_id]");
        expect(src.split("dispatch(fetchActionStatusList(").length).toBe(2);
    });
});
