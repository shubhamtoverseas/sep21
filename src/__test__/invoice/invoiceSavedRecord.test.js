/**
 * Saved Invoice Details · the frozen pricing record (27 Oct package, INV-C5; R-F1): the screen renders the record as saved,
 * never recomputed; a later price list edit changes nothing because the only input is the record itself.
 */
import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import SavedInvoiceLines, { SavedFinancialRows, savedCreditsOf, savedResultOf } from "../../Views/Pages/Invoice/add-contract-invoice/SavedInvoiceLines";
import InvoiceHeaderContext from "../../components/Invoice/InvoiceHeaderContext";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));

const RECORD = {
    route: "local", pricing_code: "LPF", price_list_version_id: 41,
    summary: { charges: 11500, discounts: 785, invoiceTotal: 10715, creditApplied: 500, amountDue: 10215 },
    confirmed_at: null, collected_at: "2026-10-30T09:00:00.000Z",
    lines: [
        { key: "base", role: "base", item_type: "Local", description: "Filipino · Local Finished · New", detail: null, original: 10000, discount: 785, net: 9215, removed: false,
            steps: [{ kind: "flat", label: "Manual discount", value: 300, amount: 300, locked: false }, { kind: "promotion", label: "October promotion 5%", value: 5, amount: 485, locked: false }] },
        { key: "custom:1", role: "custom", item_type: "Custom Item", description: "Document courier", detail: "Staff-entered line", original: 320, discount: 0, net: 320, removed: false, steps: [] },
        { key: "removed:item:7", role: "item", item_type: "Insurance Policy", description: "Domestic helper insurance", detail: "Removed by staff · can be added again", original: 1000, discount: 0, net: 0, removed: true, steps: [] },
        { key: "credit:22", role: "credit", item_type: "Credit · Saved Exchange Credit", description: "From I-C0038", detail: null, original: null, discount: 0, net: -500, removed: false, steps: [] },
    ],
};

const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8").replace(/\r+\n/g, "\n");

describe("INV-C5 the frozen line table", () => {
    test("the five columns, each line with its ordered steps, in the saved order", () => {
        const { container } = render(<SavedInvoiceLines record={ RECORD } />);
        expect([...container.querySelectorAll("thead th")].map((th) => th.textContent)).toEqual(["key_item_type", "key_description", "key_amount", "key_inv_discount_promo", "key_total"]);
        const rows = container.querySelectorAll("tbody tr[data-line]");
        expect([...rows].map((r) => r.getAttribute("data-line"))).toEqual(["base", "custom:1"]);
        const steps = within(rows[0]).getAllByText(/Manual discount|October promotion 5%/).map((n) => n.textContent);
        expect(steps).toEqual(["Manual discount", "October promotion 5%"]);
        expect(rows[1].textContent).toContain("Staff-entered line");
    });

    test("a removed line follows, struck, not charged and not restorable from here", () => {
        const { container } = render(<SavedInvoiceLines record={ RECORD } />);
        const removed = container.querySelector("tr.rm-row");
        expect(removed.textContent).toContain("Domestic helper insurance");
        expect(removed.textContent).toContain("key_inv_removed_by_staff_review");
        expect(removed.textContent).toContain("key_inv_not_charged");
        expect(container.querySelector("button")).toBeNull();
    });

    test("totals and the credit are the record's figures, counted once, then the amount due", () => {
        const { container } = render(<SavedInvoiceLines record={ RECORD } />);
        expect(container.querySelector("[data-total]").textContent).toContain("10,715");
        expect(container.querySelector("[data-credit='credit:22']").textContent).toContain("From I-C0038");
        expect(container.querySelector("[data-due]").textContent).toContain("10,215");
        expect(savedResultOf(RECORD).lines.some((l) => l.kind === "credit")).toBe(false);
        expect(savedCreditsOf(RECORD)).toEqual([{ key: "credit:22", itemType: "Credit · Saved Exchange Credit", description: "From I-C0038", applied: 500 }]);
    });

    test("the helper counts items and credits, not the removed line", () => {
        const { container } = render(<SavedInvoiceLines record={ RECORD } />);
        expect(container.querySelector(".head .helper").textContent).toBe("2 key_items · 1 key_credit");
    });

    test("the pricing code and the price list version are small text on the card", () => {
        const { container } = render(<SavedInvoiceLines record={ RECORD } />);
        expect(container.querySelector("[data-pricing-code]").textContent).toContain("LPF");
        expect(container.querySelector("[data-price-version]").textContent).toContain("41");
        const standalone = render(<SavedInvoiceLines record={ { ...RECORD, route: "standalone", pricing_code: null } } />);
        expect(standalone.container.querySelector("[data-pricing-code]")).toBeNull();
    });

    test("the rule note is always there; the route notes follow the record", () => {
        const notes = (route, rf) => {
            const { container, unmount } = render(<SavedInvoiceLines record={ { ...RECORD, route } } isReservationFee={ rf } />);
            const out = [...container.querySelectorAll(".saved-lines-note")].map((n) => n.textContent);
            unmount();
            return out;
        };
        expect(notes("local", false)).toEqual(["key_inv_never_repriced"]);
        expect(notes("overseas", false)).toEqual(["key_inv_never_repriced"]);
        expect(notes("local", true)).toEqual(["key_inv_never_repriced", "key_inv_saved_rf_note"]);
        for (const route of ["direct_hire", "local_transfer", "renewal"]) expect(notes(route, false)).toEqual(["key_inv_never_repriced", "key_inv_no_rf_on_route"]);
        expect(notes("standalone", false)).toEqual(["key_inv_never_repriced"]);
    });

    test("the same record renders the same screen: nothing but the record is read", () => {
        const first = render(<SavedInvoiceLines record={ RECORD } />).container.innerHTML;
        const second = render(<SavedInvoiceLines record={ JSON.parse(JSON.stringify(RECORD)) } />).container.innerHTML;
        expect(second).toBe(first);
        const src = read("Views/Pages/Invoice/add-contract-invoice/SavedInvoiceLines.js");
        expect(src).not.toMatch(/useDispatch|useSelector|useContractPricing|fetch|axios/);
    });
});

describe("INV-C5 the Financial Summary and the header facts", () => {
    test("the summary rows read the record; zero rows stay out", () => {
        const { container, rerender } = render(<SavedFinancialRows summary={ RECORD.summary } />);
        expect(container.querySelector("[data-saved='charges']").textContent).toContain("11,500");
        expect(container.querySelector("[data-saved='discounts']").textContent).toContain("785");
        expect(container.querySelector("[data-saved='total']").textContent).toContain("10,715");
        expect(container.querySelector("[data-saved='credit']").textContent).toContain("500");
        rerender(<SavedFinancialRows summary={ { charges: 100, discounts: 0, invoiceTotal: 100, creditApplied: 0, amountDue: 100 } } />);
        expect(container.querySelector("[data-saved='discounts']")).toBeNull();
        expect(container.querySelector("[data-saved='credit']")).toBeNull();
    });

    test("Confirmed and Collected show on a frozen invoice, a dash when nothing happened, and not on an older invoice", () => {
        const { container, rerender } = render(<InvoiceHeaderContext invoice={ { branch_name: "B", pricing_record: RECORD } } />);
        expect(container.querySelector("[data-confirmed]").textContent).toBe("—");
        expect(container.querySelector("[data-collected]").textContent).toBe("30/10/2026");
        rerender(<InvoiceHeaderContext invoice={ { branch_name: "B", pricing_record: null } } />);
        expect(container.querySelector("[data-confirmed]")).toBeNull();
        expect(screen.queryByText(/key_collected/)).toBeNull();
    });

    test("the Contract detail screen takes the record and keeps its five tabs; an older invoice keeps its item table", () => {
        const src = read("Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js");
        expect(src).toMatch(/savedRecord \? <SavedInvoiceLines record=\{ savedRecord \}/);
        expect(src).toMatch(/savedSummary \? <SavedFinancialRows summary=\{ savedSummary \} \/>/);
        expect(src).toMatch(/const savedSummary = invoiceDetails\?\.status === 6 \? null : savedRecord\?\.summary;/);
        expect(src).toMatch(/<table className="items-mini">/);
        for (const id of ["summary", "records", "activity", "related", "remarks"]) expect(src).toContain(`{ id: '${ id }', label:`);
    });
});
