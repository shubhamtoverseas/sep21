import fs from "fs";
import path from "path";
import dayjs from "dayjs";
import { formatRelativeTime } from "../../utils/utils";

/* UI Step 4 — detail side panel (UI verification 14 Oct, rows D-01 … D-47): the action card's groups, rows and emphasis,
   and the deadline / Reservation Fee / proof cards follow the prototype (Invoice_Detail.html: ActionMenu, DeadlineSide,
   ReservationSide, ProofSide). UI only: every action keeps its handler, its availability and its blocked reason. */

const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");
const EN = JSON.parse(fs.readFileSync(path.resolve(SRC, "../public/locales/en/translation.json"), "utf8"));

const CONTRACT = "Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js";
const STANDALONE = "Views/Pages/Invoice/general/PaymentTypeInvoice.js";
const EXCHANGED = "Views/Pages/Invoice/add-contract-invoice/ExchangePaymentInvoice.js";
const REVIEWS = ["Views/Pages/Invoice/add-contract-invoice/exchangePaymentReview.js", "Views/Pages/Invoice/general/exchangePaymentReview.js"];
const REFUNDS = ["Views/Pages/Invoice/add-contract-invoice/RefundInvoice.js", "Views/Pages/Invoice/general/RefundInvoice.js"];
const DETAIL_SCREENS = [CONTRACT, STANDALONE, EXCHANGED, ...REVIEWS, ...REFUNDS];
/* the side panel of a screen */
const aside = (src) => src.slice(src.indexOf('<aside className="side-stack">'), src.indexOf("</aside>"));

describe("UI Step 4 · the action card", () => {
    test("D-02, D-03: the Exchanged screen uses the reference groups with per-action icons and emphasis", () => {
        const src = read(EXCHANGED);
        const panel = aside(src);
        const order = ["key_payment_actions", "key_financial_corrections", "key_lifecycle", "key_output", "key_admin_context"].map((k) => panel.indexOf(`t('${ k }')`));
        expect([order.every((i) => i > 0), order.every((i, n) => n === 0 || i > order[n - 1])]).toEqual([true, true]);
        expect(panel).not.toMatch(/key_action'/);
        expect(src).toMatch(/const GROUPED_ACTION_KEYS = \['mark_unsettled', 'adjust', 'write_off', 'revert', 'mark_bad_debt', 'void'\];/);
        // every listed action keeps its handler and blocked reason; a blocked row drops primary
        expect(src).toMatch(/const actionRow = \(action, \{ icon, label, tone = '' \}\) => \{[\s\S]*?const blocked = isBlocked\(action\);[\s\S]*?const emphasis = tone && !\(blocked && tone === 'primary'\) \? ' ' \+ tone : '';[\s\S]*?onClick=\{ \(\) => !blocked && handleActionStatusModel\(action\) \}[\s\S]*?\{ blocked && <span className="blocked">\{ action\.reason \}<\/span> \}/);
        expect(src).toMatch(/const listedActions = invoiceDetails\?\.status !== 6 \? \(actionStatusCustomList \|\| \[\]\) : \[\];/);
        // an action no group names stays in Payment actions
        expect(src).toMatch(/const otherPayment = listedActions\.filter\(\(a\) => !\[\.\.\.APPROVE_PAYMENT_KEYS, \.\.\.GROUPED_ACTION_KEYS\]\.includes\(a\.key\)\);/);
        for (const row of [
            "actionRow(approveAction, { icon: 'check', label: t('key_approve_payment'), tone: 'primary' })",
            "actionRow(rejectAction, { icon: 'x', label: t('key_reject_mark_unsettled') || 'Reject / Mark Unsettled', tone: 'destructive' })",
            "actionRow(findAction(listedActions, 'adjust'), { icon: 'edit' })",
            "actionRow(findAction(listedActions, 'write_off'), { icon: 'edit', label: t('key_write_off') || 'Write-Off' })",
            "actionRow(findAction(listedActions, 'mark_bad_debt'), { icon: 'alert', tone: 'destructive' })",
            "actionRow(findAction(listedActions, 'void'), { icon: 'trash', tone: 'destructive' })",
        ]) expect([row, src.includes(row)]).toEqual([row, true]);
    });

    test("D-04, D-05, D-07, D-08: Lifecycle reads Refund (plain), Exchange, Void; one printout row; Upload Proof in Payment actions", () => {
        const panel = aside(read(EXCHANGED));
        const lifecycle = panel.slice(panel.indexOf("t('key_lifecycle')"), panel.indexOf("t('key_output')"));
        const at = (s) => lifecycle.indexOf(s);
        expect([at("t('key_refund')") > 0, at("t('key_refund')") < at("t('key_exchange')"), at("t('key_exchange')") < at("{ voidRow }")]).toEqual([true, true, true]);
        expect(lifecycle).not.toMatch(/action-btn destructive' \+ \(refundBlockedReason/);
        const output = panel.slice(panel.indexOf("t('key_output')"), panel.indexOf("t('key_admin_context')"));
        expect(output).toMatch(/onClick=\{ \(\) => setShowPrintoutModal\(true\) \}>/);
        expect(output).toMatch(/key_print_download_customer_printout/);
        expect(output).not.toMatch(/key_download_pdf|handlePrint/);
        // PK-01 P1-19: Upload for a holder of its keys (usePaymentDocument's canUpload: missing document, Pending Paid, keys)
        expect(panel).toMatch(/\{ doc\.canUpload && \(\s+<button type="button" className="action-btn primary" onClick=\{ doc\.openUpload \}>/);
    });

    test("D-10: with a document uploaded, Payment actions lists View / Replace / Delete Proof (the proof card's own handlers)", () => {
        expect(read("Views/Pages/Invoice/general/PaymentDocumentCard.js")).toMatch(/view: \(\) => \{ if \(url\) setShowView\(true\); \},/);
        for (const file of [CONTRACT, STANDALONE, EXCHANGED]) {
            const src = read(file);
            expect([file, /\{ doc\.proof\.url && \(\s+<button type="button" className="action-btn" onClick=\{ doc\.view \}>/.test(src)]).toEqual([file, true]);
            // PK-01 P1-19: Replace and Delete each for a holder of its keys (usePaymentDocument's canReplace / canDelete)
            expect([file, /\{ doc\.canReplace && \(\s+<button type="button" className="action-btn" onClick=\{ doc\.openReplace \}>[\s\S]*?key_replace_proof[\s\S]*?\{ doc\.canDelete && \(\s+<button type="button" className=\{ 'action-btn destructive' \+ \(doc\.deleting \? ' disabled' : ''\) \} disabled=\{ doc\.deleting \} onClick=\{ doc\.openDelete \}>/.test(src)]).toEqual([file, true]);
            expect([file, src.includes("const has = payRemaining || doc.canUpload || doc.proof.url || ")]).toEqual([file, true]);
        }
    });

    test("D-11, D-47: a blocked Approve is a plain disabled row; Approve Refund / Exchange are primary when allowed; D-09: 'Approve Payment'", () => {
        for (const file of [CONTRACT, STANDALONE]) {
            const src = read(file);
            expect([file, src.includes("className={ 'action-btn' + (isBlocked(approveAction) ? ' disabled with-reason' : ' primary') }")]).toEqual([file, true]);
            expect([file, src.includes("<button key={ i } type=\"button\" className={ 'action-btn' + (isBlocked(action) ? ' disabled with-reason' : ' primary') }")]).toEqual([file, true]);
        }
        for (const file of REVIEWS) {
            const src = read(file);
            expect([file, src.includes("className={ 'action-btn' + (isBlocked(approvePaymentAction) ? ' disabled with-reason' : ' primary') }"), src.includes("<span className=\"label\">{ t('key_approve_payment') }</span>"), src.includes("approvePaymentAction.name")]).toEqual([file, true, true, false]);
        }
        for (const file of REFUNDS) {
            expect([file, read(file).includes("className={ 'action-btn' + (approveBlocked ? ' disabled with-reason' : ' primary') }")]).toEqual([file, true]);
        }
        for (const file of DETAIL_SCREENS) expect([file, /'action-btn primary' \+ \(/.test(read(file))]).toEqual([file, false]);
    });

    test("D-12: on a Void invoice Change Invoice CS reads disabled with 'Blocked — invoice is Void'; D-46: the busy printout row reads disabled", () => {
        expect(EN.key_blocked_invoice_is_void).toBe("Blocked — invoice is Void");
        for (const file of DETAIL_SCREENS) {
            const src = read(file);
            expect([file, src.includes("className={ 'action-btn' + (invoiceDetails?.status === 6 ? ' disabled with-reason' : '') } onClick={ () => setIsChangeCsPopup(true) }"),
                src.includes("{ invoiceDetails?.status === 6 && <span className=\"blocked\">{ t('key_blocked_invoice_is_void') }</span> }")]).toEqual([file, true, true]);
            expect([file, src.includes('className="action-btn" disabled={ isGenerateInvoice }')]).toEqual([file, false]);
        }
    });

    test("D-19: on a refund child Revert / Mark Bad Debt / Mark Unsettled sit in Financial corrections with their icons", () => {
        for (const file of REFUNDS) {
            const src = read(file);
            expect([file, src.includes("const REFUND_CORRECTION_KEYS = ['revert', 'mark_bad_debt', 'mark_unsettled'];"),
                src.includes("!REFUND_CORRECTION_KEYS.includes(a.key)"),
                src.includes("const corrections = REFUND_CORRECTION_KEYS.map((key) => findAction(actionStatusList, key)).filter(Boolean);"),
                src.includes("const look = action.key === 'revert' ? { icon: 'check', tone: '' } : { icon: 'alert', tone: ' destructive' };")]).toEqual([file, true, true, true, true]);
            const panel = aside(src);
            expect([file, panel.indexOf("t('key_financial_corrections')") > panel.indexOf("t('key_payment_actions')"), panel.indexOf("corrections.map(") > panel.indexOf("t('key_financial_corrections')")]).toEqual([file, true, true]);
        }
    });
});

describe("UI Step 4 · the side cards", () => {
    test("D-35: relative time switches to months at 30 days (reference formatRelative)", () => {
        const at = (days) => formatRelativeTime(dayjs().add(days, "day").add(1, "minute"));
        expect([at(10), at(29), at(31), at(45), formatRelativeTime(dayjs().subtract(60, "day"))]).toEqual(["in 10d", "in 29d", "in 1mo", "in 2mo", "2mo ago"]);
    });

    test("D-30, D-31: the pay-remaining deadline card turns danger once overdue and always shows its relative line", () => {
        for (const file of [CONTRACT, STANDALONE, EXCHANGED]) {
            const src = read(file);
            expect([file, src.includes("<div className={ 'deadline-side ' + (dayjs(invoiceDetails.due_date).isBefore(dayjs()) ? 'danger' : 'warning') }>"),
                src.includes("<div className=\"relative\">{ dayjs(invoiceDetails.due_date).isBefore(dayjs()) ? (t('key_overdue') || 'Overdue') : formatRelativeTime(dayjs(invoiceDetails.due_date)) }</div>"),
                src.includes('<div className="deadline-side warning">')]).toEqual([file, true, true, false]);
        }
    });

    test("D-36: an active Reservation Fee reads info (blue), an expired one danger", () => {
        expect(read(CONTRACT)).toContain("<Badge variant={ reservationExpired ? 'danger' : 'info' }");
    });

    test("D-25, D-26, D-28: the proof card reads View / Replace / Delete, 'Deposit receipt', and a paperclip for a PDF", () => {
        const card = read("Views/Pages/Invoice/general/PaymentDocumentCard.js");
        expect(card).toMatch(/const IMAGE_FILE = \/\\\.\(jpe\?g\|png\|gif\|webp\)\$\/i;/);
        expect(card).toContain("<Icon name={ IMAGE_FILE.test(doc.proof.fileName || '') ? 'filetext' : 'paperclip' } size={ 14 } />");
        for (const key of ["key_view", "key_replace", "key_delete"]) expect([key, card.includes(`{ t('${ key }') }</button>`)]).toEqual([key, true]);
        expect(card).not.toMatch(/\{ t\('key_(view|replace|delete)_proof'\) \}<\/button>/);
        expect([EN.key_view, EN.key_replace, EN.key_delete, EN.key_deposit_receipt]).toEqual(["View", "Replace", "Delete", "Deposit receipt"]);
        for (const file of [...REVIEWS, ...REFUNDS]) expect([file, read(file).includes("onClick={ handleDownloadFile }><Icon name=\"eye\" size={ 12 } />{ t('key_view') }</button>")]).toEqual([file, true]);
    });

    test("D-22: an exchange review's missing document reads like the proof card — red title, the deadline rule, a primary sm upload button", () => {
        for (const file of REVIEWS) {
            const src = read(file);
            expect([file, src.includes("{ isPaymentByCash ? t('key_deposit_receipt_missing') : t('key_payment_proof_missing') }"),
                src.includes("{ t(missingDocumentRuleKey(invoiceDetails?.payment_method)) }"),
                src.includes("<input ref={ proofInputRef } type=\"file\" accept={ PROOF_FILE_ACCEPT } onChange={ handleFileUpload } hidden />"),
                src.includes("<button type=\"button\" className=\"btn btn-primary sm\" onClick={ () => proofInputRef.current?.click() } disabled={ uploadedPhotoLoading }>"),
                /UploadFile/.test(src)]).toEqual([file, true, true, true, true, false]);
        }
    });
});
