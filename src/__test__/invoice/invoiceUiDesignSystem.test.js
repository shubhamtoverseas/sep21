import React from "react";
import fs from "fs";
import path from "path";
import { render } from "@testing-library/react";
import InvoiceStatusTag from "../../components/Invoice/InvoiceStatusTag";
import constData from "../../components/ReusableComponents/constants";
import configData from "../../components/ReusableComponents/app-configs";

/* UI Step 1 — design system (UI verification 14 Oct, rows H-01 … H-19): the invoice screens take the prototype's base
   type, button states, record-code links, field labels and page grid (Invoice_Detail.html / Invoice_Dashboard.html).
   UI only, scoped to the invoice pages: the create flows, the shared Btn and the app shell are not touched. */

const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");
const DETAIL = read("Views/Pages/Invoice/InvoiceDetail.css");
const LIST = read("Views/Pages/Invoice/InvoiceList.module.css");
/* the declarations of the first rule whose selector list is exactly `selector` */
const rule = (css, selector) => {
    const at = css.indexOf(`${ selector } {`);
    return at < 0 ? null : css.slice(at, css.indexOf("}", at) + 1);
};

const DETAIL_SCREENS = [
    "Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js", "Views/Pages/Invoice/general/PaymentTypeInvoice.js",
    "Views/Pages/Invoice/add-contract-invoice/ExchangePaymentInvoice.js",
    "Views/Pages/Invoice/add-contract-invoice/exchangePaymentReview.js", "Views/Pages/Invoice/general/exchangePaymentReview.js",
    "Views/Pages/Invoice/add-contract-invoice/RefundInvoice.js", "Views/Pages/Invoice/general/RefundInvoice.js",
];

describe("UI Step 1 · base type, buttons, record codes, fields and page grid", () => {
    test("H-01, H-02, H-12: the detail page root takes the reference body type and main.detail-page's 64px bottom padding", () => {
        const root = rule(DETAIL, ".invd:has(> .detail-header)");
        expect(root).toMatch(/font-size: 14px;/);
        expect(root).toMatch(/line-height: 1\.5;/);
        expect(root).toMatch(/color: var\(--text-1\);/);
        expect(root).toMatch(/padding-bottom: 64px;/);
        // the unused .detail-page rule and the commented-out padding are gone
        expect(DETAIL).not.toMatch(/\.invd \.detail-page|\/\* \.invd \{ padding/);
        // the root rule reaches every detail screen: .detail-header is the first element inside its .invd root
        for (const file of DETAIL_SCREENS) {
            const src = read(file);
            const inside = src.slice(src.indexOf('<div className="invd">') + 1);
            expect([file, inside.match(/<div className="([^"]+)"/)[1]]).toEqual([file, "detail-header"]);
        }
    });

    test("H-03, H-06, H-17: every detail screen loads the shared primitives sheet itself (badge, label reset, smoothing)", () => {
        for (const file of DETAIL_SCREENS) {
            expect([file, /import ['"]\.\.\/new-ui-shared\.css['"];/.test(read(file))]).toEqual([file, true]);
        }
        expect(rule(DETAIL, ".invd .field > label")).toMatch(/margin: 0;/);
    });

    test("H-04: the title, section and modal headings use the reference line-height 1.5 (not Bootstrap's 1.2)", () => {
        for (const selector of [".invd .detail-title-row h1", ".invd .detail-section > .head h2", ".invd .modal-card .head h2"]) {
            expect([selector, /line-height: 1\.5;/.test(rule(DETAIL, selector))]).toEqual([selector, true]);
        }
    });

    test("H-05: invoice buttons drop Bootstrap's focus glow and pressed colours; a pressed button keeps its hover look", () => {
        expect(DETAIL).toMatch(/\.invd \.btn:focus,\s+\.invd \.btn:not\(:disabled\):not\(\.disabled\):active:focus \{\s+box-shadow: none;/);
        expect(rule(DETAIL, ".invd .btn-primary:not(:disabled):not(.disabled):active")).toMatch(/background: var\(--accent-hover\);/);
        expect(rule(DETAIL, ".invd .btn-secondary:not(:disabled):not(.disabled):active")).toMatch(/background: var\(--bg-hover\); border-color: var\(--line-strong\); color: var\(--text-1\);/);
        expect(rule(DETAIL, ".invd .btn-danger:not(:disabled):not(.disabled):active")).toMatch(/background: var\(--st-danger\);/);
        // the keyboard ring stays
        expect(rule(DETAIL, ".invd .btn:focus-visible")).toMatch(/outline: 2px solid var\(--accent-ring\)/);
    });

    test("H-09, H-10, H-11: record codes that open are #1d4ed8 mono 12px / 400 / 18px, never underlined, with the focus ring", () => {
        const tokens = rule(DETAIL, ".invd");
        expect(tokens).toMatch(/--mc-link: #1d4ed8;/);
        expect(tokens).toMatch(/--mc-focus: #2f6fec;/);
        expect(tokens).toMatch(/--mc-focus-bg: #edf2ff;/);
        const ref = rule(DETAIL, ".invd .related-row .info .ref");
        expect(ref).toMatch(/font-size: 12px;\s+font-weight: 400;\s+line-height: 18px;\s+color: var\(--mc-link\);/);
        expect(DETAIL).not.toMatch(/\.invd \.related-row \.info \.ref:hover \{\s+text-decoration: underline/);
        expect(DETAIL).toMatch(/\.invd \.context-card \.code-link,\s+\.invd \.context-card \.code-text \{\s+width: fit-content;\s+font-family: var\(--mono\);\s+font-size: 12px;\s+font-weight: 400;\s+line-height: 18px;/);
        expect(DETAIL).toMatch(/\.invd \.context-card \.code-link:hover \{\s+color: var\(--mc-link\);\s+text-decoration: none;/);
        expect(DETAIL).toMatch(/\.ref:not\(\.neutral\):focus-visible \{\s+outline: 2px solid var\(--mc-focus\);\s+outline-offset: 2px;\s+border-radius: 2px;\s+background: var\(--mc-focus-bg\);/);
        // a code this user may not open stays neutral (the reference code colour, UI Step 3 C-36)
        expect(DETAIL).toMatch(/\.ref\.neutral,[^{]*\{\s+color: var\(--mc-text-code\);/);
    });

    test("H-18: field labels in the detail action modals are 10.5px / 600 / .08em / text-4, 12px below the field", () => {
        expect(rule(DETAIL, ".invd .action-modal-card .field")).toMatch(/margin-bottom: 12px;/);
        const label = rule(DETAIL, ".invd .action-modal-card .field > label");
        expect(label).toMatch(/font-size: 10\.5px;\s+font-weight: 600;\s+color: var\(--text-4\);\s+letter-spacing: 0\.08em;/);
    });

    test("H-19: reduced motion also stops the elements' own transitions, on the detail screens and the list", () => {
        expect(read("Views/Pages/Invoice/new-ui-shared.css")).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s+\.invd \*,\s+\.invd \*::before,\s+\.invd \*::after \{/);
        expect(LIST).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s+\.invoiceList \*,\s+\.invoiceList \*::before,\s+\.invoiceList \*::after \{\s+animation-duration: 0\.001ms !important;\s+transition-duration: 0\.001ms !important;/);
    });

    test("H-13, H-14: the list runs 28px side gutters (24px shell + 4px) and an 11px cell inset", () => {
        // the list sheet is shared by the other listings: the invoice list's values sit under its root class
        expect(LIST).toContain(".invoiceList { padding: 0 4px; }");
        expect(LIST).toContain(".invoiceList .tableCard thead th { padding: 0 11px !important;");
        expect(LIST).toContain(".invoiceList .tableCard tbody td { padding: 8px 11px !important; }");
        expect(rule(LIST, ".pageWrap")).not.toMatch(/padding: 0 4px;/);
        expect(rule(LIST, ".tableCard thead th")).toMatch(/padding: 0 12px !important;/);
        expect(read("components/Layout/AppShell.module.css")).toMatch(/\.content \{\s+flex: 1;\s+padding: var\(--space-4\) 24px 56px;/);
    });

    test("H-15: the list selection-bar buttons are already the default 28px button (no Btn change)", () => {
        expect(rule(LIST, ".selectionActions button")).toMatch(/height: 28px;\s+padding: 0 10px;/);
        expect(read("Views/Pages/Invoice/Invoice.js")).toMatch(/<div className=\{styles\.selectionActions\}>/);
    });
});

/* the prototype's INVOICE_STATUS_TAG (Invoice_Detail.html:39633-39638, Invoice_Dashboard.html:38168-38170): status → [tone, treatment] */
const PROTOTYPE_TAGS = {
    1: ["green", "filled"],         // Paid
    2: ["orange", "filled"],        // Pending Paid
    4: ["blue-1", "filled"],        // Reservation Fee
    5: ["severe-red", "solid"],     // Unsettled
    6: ["neutral", "filled"],       // Void
    7: ["dark", "solid"],           // Bad Debt
    8: ["orange", "filled"],        // Refunded / Unapproved
    9: ["neutral", "filled"],       // Refunded
    10: ["orange", "filled"],       // Exchange / Unapproved
    11: ["purple", "filled"],       // Exchanged
};

describe("UI Step 1 · one invoice status tag (H-07, H-08; B-10 … B-15, C-39, A-70, A-71)", () => {
    test("every status takes the prototype's tone and treatment; an unknown one reads neutral", () => {
        for (const [status, [tone, treatment]] of Object.entries(PROTOTYPE_TAGS)) {
            const { container, unmount } = render(<InvoiceStatusTag status={ Number(status) } label="x" />);
            const tag = container.firstChild;
            expect([status, tag.getAttribute("data-tone"), tag.getAttribute("data-treatment")]).toEqual([status, tone, treatment]);
            unmount();
        }
        const { container } = render(<InvoiceStatusTag status={ 99 } label="x" />);
        expect([container.firstChild.getAttribute("data-tone"), container.firstChild.getAttribute("data-treatment")]).toEqual(["neutral", "filled"]);
    });

    test("the label is the one given, else the status label", () => {
        const { getByText, unmount } = render(<InvoiceStatusTag status={ 1 } label="Paid · today" />);
        expect(getByText("Paid · today")).toBeTruthy();
        unmount();
        const { container } = render(<InvoiceStatusTag status={ 6 } />);
        // (i18n is not loaded under Jest: the mapping label may be undefined, and the tag then renders nothing)
        expect(container.firstChild.textContent).toBe(configData.invoiceStatusIdMapping[6]?.label ?? "");
    });

    test("the gallery metrics: 20px, 11px / 650 / 16px, padding 1px 7px 1px 6px, 6px dot; solid fills and hides the dot", () => {
        // one definition, in the shared listing sheet (the Insurance, Processing and Settings pills read it too)
        expect(read("components/Invoice/InvoiceStatusTag.js")).toContain("import styles from \"../../Views/Pages/Invoice/InvoiceList.module.css\";");
        const css = read("Views/Pages/Invoice/InvoiceList.module.css");
        const base = rule(css, ".statusTag");
        for (const decl of ["height: 20px;", "padding: 1px 7px 1px 6px;", "border-radius: 4px;", "font-size: 11px;", "font-weight: 650;", "line-height: 16px;"]) {
            expect([decl, base.includes(decl)]).toEqual([decl, true]);
        }
        expect(rule(css, ".statusTag::before")).toMatch(/width: 6px;\s+height: 6px;/);
        expect(rule(css, '.statusTag[data-treatment="solid"]')).toMatch(/background: var\(--tag-fg\);\s+color: #fff;/);
        expect(css).toMatch(/\.statusTag\[data-treatment="solid"\]::before \{ display: none; \}/);
        // one definition: the shared listing sheet; no component sheet carries a copy
        expect(fs.existsSync(path.join(SRC, "components/Invoice/InvoiceStatusTag.module.css"))).toBe(false);
    });

    test("the list, the detail state strip, Related Invoices and the brief popup render it; the intent map is gone", () => {
        expect(read("Views/Pages/Invoice/InvoiceListTableColumns.js")).toMatch(/render: \(row\) => <InvoiceStatusTag status=\{ row\.status \} \/>,/);
        for (const file of DETAIL_SCREENS) {
            const src = read(file);
            expect([file, /<InvoiceStatusTag status=\{ (invoiceDetails\?\.status|invoiceStatus) \} label=\{ statusLabel \} \/>/.test(src)]).toEqual([file, true]);
            expect([file, /<InvoiceStatusTag status=\{ p\.status \} \/>/.test(src)]).toEqual([file, true]);
            expect([file, /STATUS_VARIANT|statusIntent/.test(src)]).toEqual([file, false]);
        }
        const brief = read("components/Layout/popups/invoice-popups/RelatedInvoiceBriefModal.js");
        expect(brief).toMatch(/<InvoiceStatusTag status=\{ brief\.status \} label=\{ brief\.statusLabel \} \/>/);
        expect(brief).not.toMatch(/STATUS_VARIANT|statusVariant|<Badge/);
        expect(constData.STATUS_VARIANT).toBeUndefined();
    });
});
