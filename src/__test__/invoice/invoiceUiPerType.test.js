import fs from "fs";
import path from "path";
import { getInvoiceDetailPath } from "../../services/commonService";

/* UI Step 7 — per type (UI verification 14 Oct, rows G-16 … G-40): the refund child, the exchanged A1 and the exchange chain
   follow the prototype (Invoice_Detail.html fixtures INV-06R … INV-14R, INV-12S, INV-08 … INV-14). UI only. */

const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");
const EN = JSON.parse(fs.readFileSync(path.resolve(SRC, "../public/locales/en/translation.json"), "utf8"));

const INV = "Views/Pages/Invoice/";
const REFUNDS = [INV + "add-contract-invoice/RefundInvoice.js", INV + "general/RefundInvoice.js"];
const CONTRACT = INV + "add-contract-invoice/PaymentTypeInvoice.js";
const EXCHANGED = INV + "add-contract-invoice/ExchangePaymentInvoice.js";

describe("UI Step 7 · refund child and exchanged A1", () => {
    test("G-16: the refund documentation card uploads through the proof card's primary button (no legacy drop box)", () => {
        expect(EN.key_refund_proof).toBe("Refund documentation");
        for (const file of REFUNDS) {
            const s = read(file);
            expect([file, s.includes("UploadFile"), s.includes("const refundDocInputRef = useRef(null);")]).toEqual([file, false, true]);
            // PK-01 P1-19: the upload is offered to a holder of Pay Remaining Balance (the route's key)
            expect([file, /<input ref=\{ refundDocInputRef \} type="file" accept=\{ PROOF_FILE_ACCEPT \} onChange=\{ handleFileUpload \} hidden \/>\s+\{ invoiceActions\.canPayRemainingBalance && \(\s+<button type="button" className="btn btn-primary sm" onClick=\{ \(\) => refundDocInputRef\.current\?\.click\(\) \} disabled=\{ uploadedPhotoLoading \}>\s+<Icon name="upload" size=\{ 12 \} \/>\{ t\('key_upload_document'\) \}/.test(s)])
                .toEqual([file, true]);
        }
    });

    test("G-31: the Contract screen shows the A1 already-exchanged banner while an Exchange child is live", () => {
        const s = read(CONTRACT);
        const at = s.indexOf("invoiceDetails?.status !== 6 && (invoiceDetails?.childInvoices || []).some((c) => c.invoice_type === 'exchange' && [10, 11].includes(Number(c.status))) && (");
        expect(at).toBeGreaterThan(0);
        const banner = s.slice(at, s.indexOf(")}", at));
        expect(banner).toContain("<div className=\"admin-warning attention\">");
        expect(banner).toContain("{ t('key_a1_already_exchanged') || 'A1 — already exchanged' }");
        expect(banner).toContain("{ t('key_a1_already_exchanged_desc') }");
        // above the header context cards, as the other banners
        expect(at).toBeLessThan(s.indexOf("<InvoiceHeaderContext invoice={ invoiceDetails } showContract="));
    });

    test("G-33: on the Exchanged screen an exchanged A1 lists Refund and Exchange, blocked with the reason", () => {
        const s = read(EXCHANGED);
        expect(s).toContain("const a1Blocked = isA1PostExchange ? `Blocked — this A1 has already been exchanged${ a1Ref ? ` to ${ a1Ref }` : '' }` : null;");
        expect(s).toContain("const showRefund = (lifecycleOpen || invoiceDetails?.status === 3 || isA1PostExchange) && (IsInvoiceRefundPermission === 'y' || isAdmin);");
        expect(s).toContain("const showExchange = (lifecycleOpen || isA1PostExchange) && invoiceDetails?.contract_number && (IsInvoiceExchangePermission === 'y' || isAdmin);");
        expect(s).toContain("disabled={ !!refundReason } onClick={ () => !refundReason && setOnRefundPopup(true) }");
        expect(s).toContain("disabled={ !!a1Blocked } onClick={ () => !a1Blocked && setIsInitiateExchangePopup(true) }><Icon name=\"refresh\" size={14} className=\"ico\" /><span className=\"label\">{ t('key_exchange') }</span>{ a1Blocked && <span className=\"blocked\">{ a1Blocked }</span> }");
    });
});

describe("UI Step 7 · exchange chain links", () => {
    const LINKED = [CONTRACT, INV + "general/PaymentTypeInvoice.js", EXCHANGED, INV + "add-contract-invoice/exchangePaymentReview.js", INV + "general/exchangePaymentReview.js"];

    test("G-35: every in-screen invoice link opens the record on its own type screen (the list's routing)", () => {
        for (const file of LINKED) {
            const s = read(file);
            const def = s.slice(s.indexOf("const handleRedirect = "), s.indexOf("\n", s.indexOf("const handleRedirect = ")));
            expect([file, /navigate\(getInvoiceDetailPath\(invoice\)\)/.test(def), /import \{ getInvoiceDetailPath, [^}]*\} from "\.\.\/\.\.\/\.\.\/\.\.\/services\/commonService";/.test(s)])
                .toEqual([file, true, true]);
            expect([file, /handleRedirect\([^)]*, '(original|exchanged)'\)/.test(s), /navigate\(`\/invoices\/[a-z-]+\/(payment-type-invoice|exchange-payment-review|exchange-payment-type-invoice)\/` \+ action\.id\)/.test(s)])
                .toEqual([file, false, false]);
        }
        // an approved A2 / exchanged A1 opens the Exchanged screen, an A2 in review its review screen, a refund child its refund screen
        expect(getInvoiceDetailPath({ id: 7, status: 11, invoice_type: "contract" })).toBe("/invoices/add-contract-invoice/exchange-payment-type-invoice/7");
        expect(getInvoiceDetailPath({ id: 8, status: 10, invoice_type: "exchange" })).toBe("/invoices/add-contract-invoice/exchange-payment-review/8");
        expect(getInvoiceDetailPath({ id: 9, status: 8, invoice_type: "general_refund" })).toBe("/invoices/general/refund-invoice/9");
        expect(getInvoiceDetailPath({ id: 10, status: 1, invoice_type: "general" })).toBe("/invoices/general/payment-type-invoice/10");
    });
});

describe("UI Step 7 · refund child parent", () => {
    test("G-22: a refund child names its parent 'Parent invoice', or 'Parent Underpayment invoice' under an Underpayment Invoice", () => {
        for (const file of REFUNDS) {
            expect([file, read(file).includes("{ p.invoice_type === 'underpayment' ? t('key_parent_underpayment_invoice') : (t('key_parent_invoice') || 'Parent invoice') }")]).toEqual([file, true]);
        }
        expect([EN.key_parent_invoice, EN.key_parent_underpayment_invoice]).toEqual(["Parent invoice", "Parent Underpayment invoice"]);
    });
});

describe("UI Step 7 · Standalone refund child corrections", () => {
    test("G-23: the Standalone refund child lists Adjust Amount and Write-Off in Financial corrections, wired as on the Contract refund screen", () => {
        const [contract, standalone] = REFUNDS.map(read);
        for (const s of [contract, standalone]) {
            expect(s).toContain("const adjustAction = findAction(actionStatusList, 'adjust');");
            expect(s).toContain("const writeOffAction = findAction(actionStatusList, 'write_off');");
            expect(s).toContain("if (!adjustAction && !writeOffAction && corrections.length === 0) return null;");
            expect(s).toMatch(/<span className="label">\{ t\('key_write_off'\) \|\| 'Write-Off' \}<\/span>/);
            expect(s).toMatch(/setIsAdjustAmountActionType\(key === "write_off" \? "write_off" : "adjust_amount"\);\s+setIsAdjustAmount\(true\);/);
            expect(s).toMatch(/dispatch\(saveUpdateAdjustPaymentInvoice\(\{ invoice_id, \.\.\.payload \}\)\)/);
            expect(s).toMatch(/<AdjustAmountPopup\s+onClose=\{ \(\) => setIsAdjustAmount\(false\) \}\s+invoiceDetails=\{ invoiceDetails \}\s+handleUpdateInvoice=\{ handleUpdateInvoice \}\s+isAdjustAmountActionType=\{ isAdjustAmountActionType \}\s+totalAmount=\{ totalAmount \}/);
        }
        expect(standalone).toContain("const AdjustAmountPopup = lazy(() => import(\"./AdjustAmountPopup\"));");
    });
});
