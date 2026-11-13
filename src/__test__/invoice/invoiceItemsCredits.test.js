/* eslint-env jest */
import React from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* Contract Invoice · Invoice items · Apply Credit (package requirements :434, :436, :544; product 3 Nov 2026: inline, no
   popup, OP-27-140). In the shared items stage: the two saved-credit dropdowns in the action row after + Add Item and
   + Add Custom Item, greyed with their "No …" text when empty, disabled while the invoice is blocked, hidden on an Exchange
   and on a worker-billed Standalone invoice. A chosen credit is a row after the invoice total ("Credit · <type>",
   "From <source>", the amount at the engine's cap, Keep / Write off, the cross), priced by the engine after every line
   (Amount due now). A credit the invoice no longer takes in full blocks Continue, naming it and what it can take now —
   never re-capped silently. Invoice Review shows the credit read-only (invoiceReviewStage). */

jest.mock("../../services/invoices", () => ({ priceContractInvoiceAPI: jest.fn(), getEmployerCreditList: jest.fn() }));
/* eslint-disable import/first */
import { getEmployerCreditList, priceContractInvoiceAPI } from "../../services/invoices";
import invoices from "../../redux/Slices/invoices/InvoicesSlice";
import employer from "../../redux/Slices/employer/EmployerSlice";
import { interpolate } from "../../i18n/interpolate";
import { EXCHANGE, STANDALONE } from "../../Views/Pages/Invoice/add-contract-invoice/contractSetup";
import ContractInvoiceItems from "../../Views/Pages/Invoice/add-contract-invoice/ContractInvoiceItems";
import useContractPricing from "../../Views/Pages/Invoice/add-contract-invoice/useContractPricing";
/* eslint-enable import/first */

jest.setTimeout(60000);
const SLOW = { timeout: 15000 };

beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

const SETUP = { worker_id: 501, employer_id: 40, route: "local", category: null, type: "new", driver: false, date: "2026-11-03", branch: 5 };
const INFO = {
    currentInvoiceEmployerDetail: { employer_id: 40, name: "Chan Tai Man", reference_id: "E-1001" }, currentInvoiceWorkerDetail: { id: 501, name: "Maria Lourdes Santos", reference_id: "LPF902190" },
    invoice_date: "2026-11-03", branchId: 5, branch_name: "Tsim Sha Tsui", csId: 9, cs_name: "Lee",
};
const line = (over) => ({ kind: "item", discount: 0, steps: [], refusedSteps: [], treatment: null, amountSource: "catalogue", ...over });
const BASE = line({ id: "base", kind: "base", itemType: "Local", label: "Filipino · Local Finished · New", add: "required", original: 10000, net: 10000, item: null });
const DOC = line({ id: "item:208", item: 208, itemType: "Document Fee", label: "Contract documentation", add: "required", original: 500, net: 500 });
const INSURANCE = line({ id: "item:205", item: 205, itemType: "Insurance Policy", label: "Domestic helper insurance", add: "removable", original: 1000, net: 1000 });
/* the employer's usable saved credits: two Exchange credits, no expired Reservation Fee */
const LISTS = {
    exchange_surplus: [
        { id: 31, invoice_number: "I-HKH000432(E)", amount: "3000.00", available_amount: 3000 },
        { id: 32, invoice_number: "I-HKH000433(E)", amount: "20000.00", available_amount: 20000 },
    ],
    reservation_fee_expired: [],
};

/** the stand-in engine: the lines the choices make; any credits after every line, never more than is owed */
let blocked = false;
const priced = (body) => {
    const lines = [BASE, DOC, ...(body.removed.includes(205) ? [] : [INSURANCE])];
    const net = lines.reduce((t, l) => t + l.net, 0);
    if (blocked) return { ok: false, route: body.route, problems: [{ scope: "invoice", text: "No Standard fee is entered for this route." }], notes: [], refused: [], clash: [], promotions: [], offerSkills: [], lines, total: null, summary: null, available: [], restorable: [] };
    let room = net;
    const credits = (body.credits || []).map((c) => { const applied = Math.min(c.amount, room); room -= applied; return { source: `I-HKH0004${ c.id === 31 ? 32 : 33 }(E)`, requested: c.amount, available: 0, applied, remainder: 0 }; });
    const creditApplied = credits.reduce((t, c) => t + c.applied, 0);
    return {
        ok: true, route: body.route, problems: [], notes: [], refused: [], clash: [], promotions: [], offerSkills: [],
        lines, total: { original: net, discount: 0, net }, record_key: "rk", credits,
        summary: { charges: net, discounts: 0, invoiceTotal: net, creditApplied, amountDue: net - creditApplied },
        available: [], restorable: body.removed.includes(205) ? [{ item: 205, condition: 4, amount: 1000, itemType: "Insurance Policy", label: "Domestic helper insurance" }] : [],
    };
};
const reply = (data) => Promise.resolve({ data: { status: true, data } });
beforeEach(() => {
    blocked = false;
    priceContractInvoiceAPI.mockReset();
    priceContractInvoiceAPI.mockImplementation((body) => reply(priced(body)));
    getEmployerCreditList.mockReset();
    getEmployerCreditList.mockImplementation(({ credit_type }) => Promise.resolve({ data: { data: LISTS[credit_type] } }));
});

const mount = ({ mode, info = INFO, setup = SETUP } = {}) => {
    const store = configureStore({ reducer: { invoices, employer, users: () => ({ permissionList: { data: [] } }) }, middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }) });
    render(
        <Provider store={ store }>
            <MemoryRouter initialEntries={ [{ pathname: "/items", state: { contractFormInfo: info, setupInput: setup } }] }>
                <Routes>
                    <Route path="/items" element={ <ContractInvoiceItems mode={ mode } /> } />
                    <Route path="*" element={ <div data-testid="elsewhere" /> } />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
    return store;
};
const ready = () => waitFor(() => expect(document.querySelector("[data-total]").textContent).toMatch(/HK\$/), SLOW);
const picker = (type) => document.querySelector(`[data-credit-picker=${ type }]`);
const pickersReady = () => waitFor(() => expect(picker("exchange_surplus")).toBeEnabled(), SLOW);
const choose = (id) => fireEvent.change(picker("exchange_surplus"), { target: { value: String(id) } });
const creditRow = (id) => document.querySelector(`tr[data-credit-row="exchange_surplus:${ id }"]`);
const creditCalls = () => priceContractInvoiceAPI.mock.calls.map((c) => c[0]).filter((b) => b.credits);
const continueButton = () => screen.getByRole("button", { name: en.key_inv_continue_to_review });

describe("the two credit dropdowns in the action row (:544; the 21 Sept footer)", () => {
    it("after + Add Item and + Add Custom Item; greyed with its No … text when the employer has none; fetched for the invoice's employer", async () => {
        mount();
        await ready();
        await pickersReady();
        const row = document.querySelector(".items-card .add-actions");
        expect([...row.querySelectorAll("button, select")].map((n) => (n.tagName === "BUTTON" ? n.textContent : n.getAttribute("data-credit-picker"))))
            .toEqual([en.key_add_item, en.key_add_custom_item, "reservation_fee_expired", "exchange_surplus"]);
        expect(picker("reservation_fee_expired")).toBeDisabled();
        expect(picker("reservation_fee_expired").options[0].textContent).toBe(en.key_no_expired_reservation_fees);
        expect(picker("exchange_surplus").options[0].textContent).toBe(`${ en.key_apply_saved_exchange_credit }…`);
        expect([...picker("exchange_surplus").options].slice(1).map((o) => o.textContent)).toEqual(["I-HKH000432(E) · HK$3,000", "I-HKH000433(E) · HK$20,000"]);
        expect(getEmployerCreditList).toHaveBeenCalledWith({ credit_type: "exchange_surplus", employer_id: 40 });
    });

    it("disabled while the invoice cannot be created", async () => {
        blocked = true;
        mount();
        await waitFor(() => expect(screen.getByText("No Standard fee is entered for this route.")).toBeInTheDocument(), SLOW);
        await waitFor(() => expect(getEmployerCreditList).toHaveBeenCalledTimes(2), SLOW);
        expect(picker("exchange_surplus")).toBeDisabled();
        expect(picker("reservation_fee_expired")).toBeDisabled();
    });

    it.each([
        ["an Exchange (:434, :595; OP-27-108)", EXCHANGE, { ...INFO, currentInvoiceExchange: { id: 100, invoice_number: "I-MO000100" } }, { ...SETUP, route: "exchange", exchange: { invoice_id: 100, service_route: "local" } }],
        ["a worker-billed Standalone invoice (OP-27-69)", STANDALONE, { ...INFO, party_type: "worker", currentInvoiceEmployerDetail: null }, { route: "standalone", party: { type: "worker", id: 501 }, date: "2026-11-03", branch: 5 }],
    ])("hidden on %s", async (_label, mode, info, setup) => {
        mount({ mode, info, setup });
        await ready();
        expect(picker("exchange_surplus")).toBeNull();
        expect(picker("reservation_fee_expired")).toBeNull();
        expect(getEmployerCreditList).not.toHaveBeenCalled();
    });

    it("shown on an employer-billed Standalone invoice", async () => {
        mount({ mode: STANDALONE, info: { ...INFO, party_type: "employer" }, setup: { route: "standalone", party: { type: "employer", id: 40 }, date: "2026-11-03", branch: 5 } });
        await ready();
        await pickersReady();
        expect(picker("reservation_fee_expired")).toBeInTheDocument();
    });
});

describe("an applied credit is a row after the invoice total, priced by the engine (:436)", () => {
    it("Credit · <type>, From <source>, the amount at the engine's cap, the cross; then the engine's Amount due now; kept with the draft", async () => {
        const store = mount();
        await ready();
        await pickersReady();
        choose(31);
        await waitFor(() => expect(creditRow(31)).not.toBeNull(), SLOW);
        const cells = creditRow(31).querySelectorAll("td");
        expect(cells[0].textContent).toBe(`${ en.key_credit } · ${ en.key_saved_exchange_credit_badge }`);
        expect(cells[1].querySelector(".ds").textContent).toBe("From I-HKH000432(E)");
        expect([cells[2].textContent, cells[3].textContent]).toEqual(["—", "—"]);
        expect(within(creditRow(31)).getByRole("spinbutton").value).toBe("3000");
        expect(within(creditRow(31)).getByRole("button", { name: "Remove credit" })).toBeInTheDocument();
        // the row follows the invoice total; the engine prices it after every line and gives Amount due now
        expect(creditRow(31).closest("tfoot")).not.toBeNull();
        await waitFor(() => expect(document.querySelector("[data-due]").textContent).toBe("HK$8,500"), SLOW);
        expect(creditCalls().at(-1)).toMatchObject({ employer_id: 40, credits: [{ id: 31, amount: 3000 }] });
        expect(document.querySelector("[data-total]").textContent).toBe("HK$11,500");
        // the draft keeps the credit and one request key for Invoice Review
        const draft = store.getState().invoices.invoiceContractItemsList;
        expect(draft.appliedCredits).toEqual([expect.objectContaining({ id: 31, amount: 3000, credit_type: "exchange_surplus", remainder: "keep" })]);
        expect(typeof draft.creditRequestKey).toBe("string");
        expect(continueButton()).toBeEnabled();
    });

    it("a credit with more than the invoice owes defaults to the engine's cap (the total after deductions, less credits before it)", async () => {
        mount();
        await ready();
        await pickersReady();
        choose(31);
        await waitFor(() => expect(creditRow(31)).not.toBeNull(), SLOW);
        choose(32);
        await waitFor(() => expect(creditRow(32)).not.toBeNull(), SLOW);
        expect(within(creditRow(32)).getByRole("spinbutton").value).toBe("8500");
        await waitFor(() => expect(document.querySelector("[data-due]").textContent).toBe("HK$0"), SLOW);
    });

    it("Edit amount re-prices; the remainder is kept by default; the cross removes the credit", async () => {
        mount();
        await ready();
        await pickersReady();
        choose(31);
        await waitFor(() => expect(creditRow(31)).not.toBeNull(), SLOW);
        fireEvent.change(within(creditRow(31)).getByRole("spinbutton"), { target: { value: "2000" } });
        await waitFor(() => expect(creditCalls().at(-1)).toMatchObject({ credits: [{ id: 31, amount: 2000 }] }), SLOW);
        await waitFor(() => expect(document.querySelector("[data-due]").textContent).toBe("HK$9,500"), SLOW);
        expect(screen.getByRole("radio", { name: /Keep for future invoices/ })).toBeChecked();
        fireEvent.click(within(creditRow(31)).getByRole("button", { name: "Remove credit" }));
        await waitFor(() => expect(creditRow(31)).toBeNull(), SLOW);
        expect(document.querySelector("[data-due]")).toBeNull();
        expect(continueButton()).toBeEnabled();
    });
});

describe("a credit the invoice no longer takes in full blocks Continue (row 4; never re-capped silently)", () => {
    it("removing a line below the applied credit names the credit and what it can take now; lowering it clears the block", async () => {
        mount();
        await ready();
        await pickersReady();
        choose(32);
        await waitFor(() => expect(creditRow(32)).not.toBeNull(), SLOW);
        expect(within(creditRow(32)).getByRole("spinbutton").value).toBe("11500");
        await waitFor(() => expect(continueButton()).toBeEnabled(), SLOW);
        const pricedWithCredit = creditCalls().length;
        // the removable insurance line goes: the total drops to HK$10,500, below the HK$11,500 credit
        fireEvent.click(screen.getByRole("button", { name: `${ en.key_remove } Insurance Policy Domestic helper insurance` }));
        const block = interpolate(en.key_inv_credit_over_cap, "I-HKH000433(E)", "HK$10,500");
        await waitFor(() => expect(document.querySelector("[data-credit-block]").textContent).toBe(block), SLOW);
        expect(document.querySelector(".review-foot .why").textContent).toBe(block);
        expect(continueButton()).toBeDisabled();
        // never re-capped: the amount staff gave stays, and it is not sent to the engine above what the invoice owes
        expect(within(creditRow(32)).getByRole("spinbutton").value).toBe("11500");
        expect(creditCalls()).toHaveLength(pricedWithCredit);
        expect(document.querySelector("[data-due]").textContent).toBe("—");
        fireEvent.change(within(creditRow(32)).getByRole("spinbutton"), { target: { value: "10500" } });
        await waitFor(() => expect(document.querySelector("[data-credit-block]")).toBeNull(), SLOW);
        await waitFor(() => expect(document.querySelector("[data-due]").textContent).toBe("HK$0"), SLOW);
        expect(continueButton()).toBeEnabled();
    });

    it("the message names the credit and its new maximum", () => {
        expect(interpolate(en.key_inv_credit_over_cap, "I-HKH000433(E)", "HK$10,500"))
            .toBe("I-HKH000433(E): this invoice now takes at most HK$10,500 of the credit. Lower it or remove it to continue.");
    });
});

describe("the cap waits for the answer to the current choices", () => {
    it("in the render where the input changes the last answer still reads ready, but not current", async () => {
        const { result, rerender } = renderHook(({ input }) => useContractPricing(input), { initialProps: { input: { ...SETUP, removed: [], add: [], custom: [], deductions: {}, skills: [] } } });
        await waitFor(() => expect(result.current.current).toBe(true));
        const seen = [];
        rerender({ input: { ...SETUP, removed: [205], add: [], custom: [], deductions: {}, skills: [] } });
        seen.push([result.current.status, result.current.current]);
        await act(async () => {});
        await waitFor(() => expect(result.current.current).toBe(true));
        // the first render after the change: stale ready, not current; then the new answer is current
        expect(seen[0]).toEqual([expect.stringMatching(/ready|loading/), false]);
        expect(result.current.result.total.net).toBe(10500);
    });
});
