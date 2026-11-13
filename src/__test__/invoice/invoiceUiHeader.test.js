import React from "react";
import fs from "fs";
import path from "path";
import { render, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useParams } from "react-router-dom";
import InvoiceHeaderContext from "../../components/Invoice/InvoiceHeaderContext";
import InvoiceRecordNotAvailable from "../../components/Invoice/InvoiceRecordNotAvailable";

/* UI Step 2 — detail page header (UI verification 14 Oct, rows B-01 … B-59): title row and actions, state strip, context
   cards, page frame and record states follow the prototype (Invoice_Detail.html: DetailView header, HeaderContext,
   RecordUnavailable / RecordDenied). UI only: what each screen shows, and when, is unchanged; admin-only UI is kept. */

const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");
const DETAIL = read("Views/Pages/Invoice/InvoiceDetail.css");
const EN = JSON.parse(fs.readFileSync(path.resolve(SRC, "../public/locales/en/translation.json"), "utf8"));

const DETAIL_SCREENS = [
    "Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js", "Views/Pages/Invoice/general/PaymentTypeInvoice.js",
    "Views/Pages/Invoice/add-contract-invoice/ExchangePaymentInvoice.js",
    "Views/Pages/Invoice/add-contract-invoice/exchangePaymentReview.js", "Views/Pages/Invoice/general/exchangePaymentReview.js",
    "Views/Pages/Invoice/add-contract-invoice/RefundInvoice.js", "Views/Pages/Invoice/general/RefundInvoice.js",
];
const EXCHANGED = "Views/Pages/Invoice/add-contract-invoice/ExchangePaymentInvoice.js";
/* the title row of a screen: from <h1> to the state strip */
const titleRow = (src) => src.slice(src.indexOf('<div className="detail-title-row">'), src.indexOf('<div className="state-strip">'));

describe("UI Step 2 · title row and header actions", () => {
    test("B-07, B-08: the copy button is named and the Invoices crumb is a focusable link to the list", () => {
        for (const file of DETAIL_SCREENS) {
            const src = read(file);
            expect([file, /<button className="copy" title="Copy reference" aria-label="Copy reference" /.test(src)]).toEqual([file, true]);
            expect([file, /<a href="\/invoices" onClick=\{ \(e\) => \{ e\.preventDefault\(\); handleGotoDashboard\(\); \} \}>/.test(src)]).toEqual([file, true]);
            expect([file, /<a onClick=\{ handleGotoDashboard \}>/.test(src)]).toEqual([file, false]);
        }
    });

    test("B-18: the payment-confirmed tick is named on every screen that shows it", () => {
        for (const file of DETAIL_SCREENS.filter((f) => !f.includes("RefundInvoice"))) {
            const src = read(file);
            expect([file, /fontWeight: 600 \}? ?\} aria-label="Payment confirmed">✓<\/span>/.test(src)]).toEqual([file, true]);
            expect([file, /fontWeight: 600 \}? ?\}>✓<\/span>/.test(src)]).toEqual([file, false]);
        }
    });

    test("B-03: the Exchanged screen's header actions are Follow Up · Customer Printout · Remark, as on the other screens", () => {
        const src = read(EXCHANGED);
        const row = titleRow(src);
        // PK-01 P1-19: each for a holder of its key (Print Customer Printout, Remarks)
        expect(row).toMatch(/<InvoiceFollowUp invoice=\{ invoiceDetails \} \/>\s+(\{\/\*[\s\S]*?\*\/\}\s+)?\{ invoiceActions\.canPrintCustomerPrintout && <button className="btn btn-secondary md" disabled=\{ isGenerateInvoice \} onClick=\{ \(\) => setShowPrintoutModal\(true\) \}><Icon name="download" size=\{13\} \/>\{ t\('key_customer_printout'\) \|\| 'Customer Printout' \}<\/button> \}\s+\{ invoiceActions\.canRemark && <button className="btn btn-secondary md" onClick=\{ \(\) => setShowAddRemark\(true\) \}><Icon name="msg" size=\{13\} \/>\{ t\('key_remark'\) \|\| 'Remark' \}<\/button> \}/);
        expect(row).not.toMatch(/key_download_pdf|key_print'/);
        // the preview keeps the exchange PDF / print output
        expect(src).toMatch(/const PrintoutPreviewModal = lazy\(\(\) => import\("\.\.\/general\/PrintoutPreviewModal"\)\);/);
        expect(src).toMatch(/<PrintoutPreviewModal invoiceDetails=\{ invoiceDetails \} totalAmount=\{ totalAmount \} onClose=\{ \(\) => setShowPrintoutModal\(false\) \} onDownloadPDF=\{ handleDownloadPDF \} onPrint=\{ handlePrint \} \/>/);
        // the Add Remark modal and its save, the same as the other detail screens
        expect(src).toMatch(/import \{ addInvoiceRemarks, fetchInvoiceRemarks \} from "\.\.\/\.\.\/\.\.\/\.\.\/redux\/Slices\/remarks\/RemarkSlice";/);
        expect(src).toMatch(/dispatch\(addInvoiceRemarks\(\{ remarks: remarkText, contract_invoices_id: invoice_id \}\)\)/);
        const modal = (s) => s.slice(s.indexOf("{/* Add Remark modal */}"), s.indexOf("{/* Add Remark modal */}") + 2600).replace(/\s+/g, " ").replace(/\{ ?(\w+) ?\}/g, "{$1}");
        const reference = modal(read("Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js"));
        const exchanged = modal(src);
        for (const part of ["key_add_remark", "key_remarks_context_note", "maxLength={500}", "key_remark_placeholder", "handleSaveRemark", "key_save_remark"]) {
            expect([part, reference.includes(part), exchanged.includes(part)]).toEqual([part, true, true]);
        }
    });

    test("B-06: the Follow Up count sits 6px after its label in the invoice header", () => {
        expect(DETAIL).toMatch(/\.invd \.detail-title-row \.actions \.fu-count \{\s+margin-left: 6px;/);
    });

    test("B-20: the deposit-receipt reminder has its missing space", () => {
        expect(EN.key_upload_scanned_image_deposit_receipt).toMatch(/verification\. If the scan/);
    });
});

const INVOICE = {
    employer_id: 41, employer_name: "Chan Tai Man", chinese_name: "陳大文", worker_id: 77, worker_name: "Siti Aminah",
    worker_reference_id: "W-20931", contract_number: "C-100523", branch_name: "Mong Kok", staff_name: "linda wong",
    created_at: "2026-08-15T09:00:00Z", updated_at: "2026-10-02T09:00:00Z",
    links: { employer: { code: "E-30117", can_open: true }, worker: { code: "W-20931", can_open: true }, contract: { code: "C-100523", can_open: false } },
};
const ContractPage = () => <div>contract page { useParams().contract_id }</div>;
const renderCards = (props) => render(
    <MemoryRouter initialEntries={ ["/invoices/1"] }>
        <Routes>
            <Route path="/invoices/1" element={ <InvoiceHeaderContext { ...props } /> } />
            <Route path="/employers/details/:id" element={ <div>employer page</div> } />
            <Route path="/workers/details/:id" element={ <div>worker page</div> } />
            <Route path="/contracts/details/:contract_id" element={ <ContractPage /> } />
        </Routes>
    </MemoryRouter>
);
const card = (container, key) => [...container.querySelectorAll(".context-card")].find((c) => c.querySelector(".k").textContent.includes(key));

describe("UI Step 2 · the header context cards (one component on every detail screen)", () => {
    test("B-29, B-30, B-31: the employer name is plain text, 中文 muted, and the code under it opens Employer Details", () => {
        const { container, getByText } = renderCards({ invoice: INVOICE });
        const employer = card(container, "key_employer");
        const name = employer.querySelector(".id2 .employer-name-line");
        expect(name.textContent).toBe("Chan Tai Man · 陳大文");
        expect(name.querySelector(".zh").textContent).toBe(" · 陳大文");
        expect(name.getAttribute("role")).toBeNull();
        const code = employer.querySelector(".id2 .code-link");
        expect([code.textContent, code.getAttribute("role"), code.getAttribute("tabindex")]).toEqual(["E-30117", "link", "0"]);
        fireEvent.click(code);
        expect(getByText("employer page")).toBeTruthy();
    });

    test("B-32, B-33: the worker name has no trailing dot and is plain text; only the code opens Worker Details (Enter too)", () => {
        const { container, getByText } = renderCards({ invoice: INVOICE });
        const worker = card(container, "key_worker");
        const name = worker.querySelector(".worker-name-line");
        expect([name.textContent, name.getAttribute("role")]).toEqual(["Siti Aminah", null]);
        fireEvent.keyDown(worker.querySelector(".code-link"), { key: "Enter" });
        expect(getByText("worker page")).toBeTruthy();
    });

    test("sheet row 8: a code the API does not open is neutral code text", () => {
        const invoice = { ...INVOICE, links: { employer: { code: "E-30117", can_open: false }, worker: { code: "W-20931", can_open: false } } };
        const { container } = renderCards({ invoice });
        expect(container.querySelectorAll(".code-link")).toHaveLength(0);
        expect([...container.querySelectorAll(".code-text")].map((n) => n.textContent)).toEqual(["E-30117", "W-20931", "C-100523"]);
    });

    test("SR-05: the Contract Number opens Contract Details only when this user may open that contract", () => {
        const opens = { ...INVOICE, links: { ...INVOICE.links, contract: { code: "C-100523", can_open: true, id: 523 } } };
        const { container, getByText } = renderCards({ invoice: opens });
        const code = card(container, "key_contract").querySelector(".v .code-link");
        expect([code.textContent, code.getAttribute("role"), code.getAttribute("tabindex")]).toEqual(["C-100523", "link", "0"]);
        fireEvent.keyDown(code, { key: "Enter" });
        expect(getByText("contract page 523")).toBeTruthy();
        // not allowed, or no record to open: neutral code text
        for (const contract of [{ code: "C-100523", can_open: false, id: null }, { code: "C-100523", can_open: true, id: null }]) {
            const { container: neutral, unmount } = renderCards({ invoice: { ...INVOICE, links: { ...INVOICE.links, contract } } });
            expect(card(neutral, "key_contract").querySelector(".code-link")).toBeNull();
            expect(card(neutral, "key_contract").querySelector(".v .code-text").textContent).toBe("C-100523");
            unmount();
        }
        // the destination is the Contract record route
        expect(read("Views/Pages/routes/routesConfig/contractRoutes.js")).toMatch(/contractDetails: "\/contracts\/details\/:contract_id"/);
    });

    test("B-36, B-38 … B-44: contract code, staff avatar + name as stored, Created / Updated as DD/MM/YYYY", () => {
        const { container } = renderCards({ invoice: INVOICE });
        expect(card(container, "key_contract").querySelector(".v .code-text").textContent).toBe("C-100523");
        const staff = card(container, "key_handling_staff").querySelector(".v.with-avatar");
        expect([staff.querySelector(".avatar").textContent, staff.textContent.endsWith("linda wong")]).toEqual(["LW", true]);
        expect([...card(container, "key_dates").querySelectorAll(".date-v")].map((n) => n.textContent)).toEqual(["15/08/2026", "02/10/2026"]);
    });

    test("each screen still decides which party cards it shows", () => {
        const { container } = renderCards({ invoice: INVOICE, showEmployer: false, showWorker: false, showContract: false });
        expect([...container.querySelectorAll(".context-card .k")].map((k) => k.textContent)).toEqual(["key_branch", "key_handling_staff", "key_dates"]);
        const conditions = {
            "Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js": "<InvoiceHeaderContext invoice={ invoiceDetails } showContract={ Boolean(invoiceDetails?.contract_number) && !isReservationFee } />",
            "Views/Pages/Invoice/general/PaymentTypeInvoice.js": "<InvoiceHeaderContext invoice={ invoiceDetails } showEmployer={ invoiceDetails?.employer_id > 0 && Boolean(invoiceDetails?.employer_name) }",
            "Views/Pages/Invoice/add-contract-invoice/ExchangePaymentInvoice.js": "<InvoiceHeaderContext invoice={ invoiceDetails } />",
            "Views/Pages/Invoice/add-contract-invoice/exchangePaymentReview.js": "<InvoiceHeaderContext invoice={ invoiceDetails } />",
            "Views/Pages/Invoice/general/exchangePaymentReview.js": "<InvoiceHeaderContext invoice={ invoiceDetails } />",
            "Views/Pages/Invoice/add-contract-invoice/RefundInvoice.js": "<InvoiceHeaderContext invoice={ invoiceDetails } showWorker={ invoiceDetails?.worker_id > 0 && Boolean(invoiceDetails?.worker_name) } />",
            "Views/Pages/Invoice/general/RefundInvoice.js": "<InvoiceHeaderContext invoice={ invoiceDetails } showWorker={ invoiceDetails?.worker_id > 0 && Boolean(invoiceDetails?.worker_name) } />",
        };
        for (const [file, usage] of Object.entries(conditions)) {
            const src = read(file);
            expect([file, src.includes(usage), src.includes('<div className="header-context">')]).toEqual([file, true, false]);
            expect([file, /entity-link|worker-code-line|className="mono"/.test(src)]).toEqual([file, false]);
        }
        expect(read("Views/Pages/Invoice/general/PaymentTypeInvoice.js")).toMatch(/showWorker=\{ invoiceDetails\?\.worker_id > 0 && Boolean\(invoiceDetails\?\.worker_name\) \} \/>/);
    });

    test("B-38, B-39, B-41, B-42: the avatar is the reference neutral 20px with sans 10.5px initials; no capitalising or offset", () => {
        expect(DETAIL).toMatch(/\.invd \.avatar \{[^}]*width: 20px; height: 20px;[^}]*background: oklch\(0\.96 0\.008 250\); color: oklch\(0\.46 0\.022 250\); border: 1px solid oklch\(0\.89 0\.012 250\);[^}]*font-family: var\(--sans\); font-size: 10\.5px; font-weight: 600;/);
        expect(DETAIL).toMatch(/\.invd \.context-card \.v\.with-avatar \{\s+display: inline-flex;\s+align-items: center;\s+gap: 8px;\s+\}/);
        expect(DETAIL).not.toMatch(/text-transform: capitalize|\.entity-link|\.worker-code-line/);
        expect(DETAIL).toMatch(/\.invd \.context-card \.v \.id2 \.zh \{\s+color: var\(--text-3\); font-weight: 500;/);
        expect(DETAIL).toMatch(/\.invd \.context-card \.v\.dates \.date-v \{\s+font-family: var\(--mono\); color: var\(--text-1\);/);
        expect(DETAIL).toMatch(/--mc-text-code: #3b3b41;/);
    });
});

describe("UI Step 2 · page frame and record states", () => {
    const renderState = (props) => render(<MemoryRouter><InvoiceRecordNotAvailable { ...props } /></MemoryRouter>);

    test("B-55, B-56: not available sits in the detail frame — crumb 'Invoices / —', the title, the neutral message card", () => {
        const { container, getByRole } = renderState({});
        const root = container.firstChild;
        expect([root.className, root.firstChild.className]).toEqual(["invd", "detail-header"]);
        const crumb = root.querySelector(".crumb-row");
        expect([crumb.querySelector("a").getAttribute("href"), crumb.querySelector(".sep").textContent, crumb.querySelector(".here").textContent])
            .toEqual(["/invoices", "/", "—"]);
        expect(root.querySelector(".detail-title-row h1").textContent).toBe("key_not_available");
        const status = getByRole("status");
        expect([status.className, status.textContent, status.closest(".detail-section").classList.contains("record-unavailable")])
            .toEqual(["remark-empty unavailable", "key_record_not_available", true]);
    });

    test("B-53: a screen that failed to load shows the same state with the API's message, not a red alert", () => {
        const { getByRole } = renderState({ message: "Request failed" });
        expect(getByRole("status").textContent).toBe("Request failed");
        for (const file of DETAIL_SCREENS) {
            const src = read(file);
            expect([file, src.includes("{ errorMessageResponse?.trim() && <InvoiceRecordNotAvailable message={ errorMessageResponse } /> }")]).toEqual([file, true]);
            expect([file, /detail-error|alert-message text-danger/.test(src)]).toEqual([file, false]);
        }
        expect(DETAIL).not.toMatch(/\.detail-error/);
        expect(DETAIL).toMatch(/\.invd \.detail-section\.record-unavailable \{\s+margin: 16px 28px 0;/);
        expect(DETAIL).toMatch(/\.invd \.remark-empty\.unavailable \{\s+padding: 18px 16px;\s+font-size: 13px;\s+color: var\(--mc-text-4\);/);
    });

    test("B-54: the refund child and the standalone exchange review keep the failure and show the state (no blank page, no stale invoice)", () => {
        for (const file of ["Views/Pages/Invoice/add-contract-invoice/RefundInvoice.js", "Views/Pages/Invoice/general/RefundInvoice.js",
            "Views/Pages/Invoice/general/exchangePaymentReview.js"]) {
            const src = read(file);
            expect([file, /dispatch\(fetchInvoiceDetails\(\{ invoice_id \}\)\)\.then\(\(response\) => \{\s+if \(response\?\.error\?\.code === "ERR_BAD_REQUEST"\) setErrorMessageResponse\(response\?\.error\?\.message\);\s+else setErrorMessageResponse\(""\);/.test(src)]).toEqual([file, true]);
            expect([file, /(invoiceLoaded|hasInvoiceDetails) =\s+errorMessageResponse === "" && /.test(src)]).toEqual([file, true]);
        }
    });

    test("B-52: the standalone exchange review runs edge-to-edge like the other detail screens (no padded card)", () => {
        expect(read("Views/Pages/Invoice/general/exchangePaymentReview.js")).not.toMatch(/CommonContentContainer/);
    });
});
