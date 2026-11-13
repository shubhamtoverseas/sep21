/**
 * Saved Invoice Details · Standalone (27 Oct package, INV-G5, shared with INV-C5; R-F1): the Standalone detail screen takes
 * the same frozen record, with no route note and no pricing code, and a worker party shows no employer card (#28).
 */
import React from "react";
import fs from "fs";
import path from "path";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import SavedInvoiceLines from "../../Views/Pages/Invoice/add-contract-invoice/SavedInvoiceLines";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));

const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8").replace(/\r+\n/g, "\n");

const STANDALONE = {
    route: "standalone", pricing_code: null, price_list_version_id: 41,
    summary: { charges: 1500, discounts: 0, invoiceTotal: 1500, creditApplied: 0, amountDue: 1500 },
    confirmed_at: null, collected_at: null,
    lines: [
        { key: "item:3", role: "item", item_type: "Document Fee", description: "Contract documentation", detail: null, original: 500, discount: 0, net: 500, removed: false, steps: [] },
        { key: "item:4", role: "item", item_type: "Insurance Policy", description: "Domestic helper insurance", detail: null, original: 1000, discount: 0, net: 1000, removed: false, steps: [] },
    ],
};

test("a Standalone record renders as saved, with the rule note only and no pricing code", () => {
    const { container } = render(<SavedInvoiceLines record={ STANDALONE } />);
    expect([...container.querySelectorAll("tbody tr[data-line]")].map((r) => r.getAttribute("data-line"))).toEqual(["item:3", "item:4"]);
    expect(container.querySelector("[data-total]").textContent).toContain("1,500");
    expect(container.querySelector("[data-pricing-code]")).toBeNull();
    expect(container.querySelector("[data-price-version]").textContent).toContain("41");
    expect([...container.querySelectorAll(".saved-lines-note")].map((n) => n.textContent)).toEqual(["key_inv_never_repriced"]);
});

test("the Standalone detail screen takes the record and keeps its five tabs; an older invoice keeps its item table", () => {
    const src = read("Views/Pages/Invoice/general/PaymentTypeInvoice.js");
    expect(src).toMatch(/savedRecord \? <SavedInvoiceLines record=\{ savedRecord \} \/>/);
    expect(src).toMatch(/savedSummary \? <SavedFinancialRows summary=\{ savedSummary \} \/>/);
    expect(src).toMatch(/const savedSummary = invoiceDetails\?\.status === 6 \? null : savedRecord\?\.summary;/);
    expect(src).toMatch(/<table className="items-mini">/);
    for (const id of ["summary", "records", "activity", "related", "remarks"]) expect(src).toContain(`{ id: '${ id }', label:`);
});

test("a worker party shows no employer card: the card needs an employer on the invoice (#28)", () => {
    const src = read("Views/Pages/Invoice/general/PaymentTypeInvoice.js");
    expect(src).toMatch(/showEmployer=\{ invoiceDetails\?\.employer_id > 0 && Boolean\(invoiceDetails\?\.employer_name\) \}/);
});
