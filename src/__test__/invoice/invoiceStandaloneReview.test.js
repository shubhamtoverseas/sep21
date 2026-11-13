/* eslint-env jest */
import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";
import { DAY, PARTIES, engineRows, hasContract, priceStandalone } from "./invoiceStandaloneEngine";

/* Standalone Invoice · Invoice Review and submission (INV-G4; register #28, #80; R-P1, R-P2; the INV-G1 server path). The
   Contract Invoice review in its Standalone mode: the same read-only table and summary boxes; saved credit (applied on
   Invoice items, package :544; read-only here, :546) for an employer party only (OP-27-69); the payment block below the table with Full Payment only — the Reservation Fee is not rendered at
   all; the zero-payable path reused; "Invoice reference: not issued yet"; submission to POST /invoices/add with
   pricing.route "standalone" (the party in pricing, no contract fields, the creator the CS Owner on the server); success
   opens the Standalone detail. */

jest.mock("../../services/invoices", () => ({
    priceContractInvoiceAPI: jest.fn(), setContractInvoice: jest.fn(), getReservationFee: jest.fn(() => new Promise(() => {})),
    getEmployerCreditList: jest.fn(() => new Promise(() => {})), getPaymentMethodCatalogueAPI: jest.fn(() => new Promise(() => {})),
}));
/* the payment component: what it is given, and a submit as it makes one (the method's fields left to its own tests) */
jest.mock("../../Views/Pages/Invoice/payment-method-selector/PaymentMethodSelector", () => {
    const mockSeen = require("./invoiceStandaloneReview.seen");
    const { useDispatch } = require("react-redux");
    return (props) => {
        mockSeen.props = props;
        const dispatch = useDispatch();
        const pay = async () => {
            const res = await dispatch(props.submitAction({ ...props.invoiceData, invoice_items: [], itemData: [], payment_method: "cash", payment_options: "cash" }));
            const id = res?.payload?.data?.invoice?.id;
            if (id) props.onSuccess(id, res);
        };
        return <div data-testid="pms"><button type="button" onClick={ pay }>stand-in pay</button></div>;
    };
});
/* eslint-disable import/first */
import { getEmployerCreditList, getPaymentMethodCatalogueAPI, getReservationFee, priceContractInvoiceAPI, setContractInvoice } from "../../services/invoices";
import invoices from "../../redux/Slices/invoices/InvoicesSlice";
import employer from "../../redux/Slices/employer/EmployerSlice";
import worker from "../../redux/Slices/worker/WorkerSlice";
import { STANDALONE, hk } from "../../Views/Pages/Invoice/add-contract-invoice/contractSetup";
import ContractInvoiceItems from "../../Views/Pages/Invoice/add-contract-invoice/ContractInvoiceItems";
import InvoiceReview from "../../Views/Pages/Invoice/add-contract-invoice/InvoiceReview";
import seen from "./invoiceStandaloneReview.seen";
/* eslint-enable import/first */

jest.setTimeout(60000);
const SLOW = { timeout: 15000 };

beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
/* the reads the screens make that these tests leave pending (the jest config resets mock implementations per test) */
beforeEach(() => {
    [getReservationFee, getEmployerCreditList, getPaymentMethodCatalogueAPI].forEach((read) => read.mockImplementation(() => new Promise(() => {})));
});
afterEach(() => { jest.clearAllMocks(); seen.props = null; });

const SETUP = { route: "standalone", party: { type: "employer", id: 40 }, date: "2026-10-23", branch: 5 };
const FORM = {
    party_type: "employer", currentInvoiceEmployerDetail: { employer_id: 40, name: "Chan Tai Man", reference_id: "E-1001" }, currentInvoiceWorkerDetail: null,
    invoice_date: "2026-10-23", branchId: 5, branch_name: "Tsim Sha Tsui", csId: 7, cs_name: "Lee Ka Yan",
};
const WORKER_FORM = { ...FORM, party_type: "worker", currentInvoiceEmployerDetail: null, currentInvoiceWorkerDetail: { id: 502, name: "Marites Villanueva", reference_id: "BGS000417-A" } };
const WORKER_SETUP = { ...SETUP, party: { type: "worker", id: 502 } };
const CHOICES = { removed: [], add: [204], custom: [], deductions: {}, experience: null, skills: [] };
const doc = { id: "item:204", kind: "item", itemType: "Document Fee", label: "Contract documentation", original: 500, discount: 0, net: 500, steps: [], refusedSteps: [], add: "manual", item: 204, amountSource: "catalogue" };
const answer = (over = {}) => ({
    ok: true, route: "standalone", party: { type: "employer", id: 40 }, record_key: "rk-s1", problems: [], notes: [],
    lines: [doc], total: { original: 500, discount: 0, net: 500 }, removed: [], restorable: [], credits: [],
    summary: { charges: 500, discounts: 0, invoiceTotal: 500, creditApplied: 0, amountDue: 500 },
    reservationFee: { allowed: false, why: "Not available for Standalone" }, ...over,
});
const reply = (data) => Promise.resolve({ data: { status: true, data } });

const Detail = () => <div data-testid="detail">{ useParams().id }</div>;
const makeStore = (over = {}) => configureStore({
    reducer: { invoices, employer, worker, users: () => ({ permissionList: { data: [] } }) },
    preloadedState: {
        invoices: { ...invoices(undefined, { type: "@init" }), invoiceContractItemsList: over.draft || { choices: CHOICES } },
        ...(over.jobInfo ? { employer: { ...employer(undefined, { type: "@init" }), invoiceCurrentJobInfo: over.jobInfo } } : {}),
    },
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
});
const mount = ({ form = FORM, setup = SETUP, ...over } = {}) => {
    const store = makeStore(over);
    render(
        <Provider store={ store }>
            <MemoryRouter initialEntries={ [{ pathname: "/invoices/general/invoice-review", state: { contractFormInfo: form, setupInput: setup } }] }>
                <Routes>
                    <Route path="/invoices/general/invoice-review" element={ <InvoiceReview mode={ STANDALONE } /> } />
                    <Route path="/invoices/general/payment-type-invoice/:id" element={ <Detail /> } />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
    return store;
};
const ready = () => waitFor(() => expect(screen.getByTestId("pms")).toBeInTheDocument(), SLOW);

describe("the Standalone review", () => {
    it("the same read-only table and summary boxes; Standalone wording and its party; reference not issued yet; priced with route standalone", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply(answer()));
        mount();
        await ready();
        expect(priceContractInvoiceAPI).toHaveBeenCalledWith({ ...SETUP, removed: [], add: [204], custom: [], deductions: {}, skills: [], employer_id: 40, credits: [] });
        expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(en.key_add_general_invoice);
        expect(document.querySelector(".review-breadcrumb .step.done")).toHaveTextContent(en.key_invoice_setup);
        expect(document.querySelector("[data-party]")).toHaveTextContent(`${ en.key_employer }Chan Tai Man E-1001`);
        expect(document.querySelectorAll(".inv-lines .ibtn")).toHaveLength(0);
        expect([...document.querySelectorAll(".fin-summary .fs-box")].map((b) => b.textContent))
            .toEqual(["ChargesHK$500", "DiscountsHK$0", "Invoice totalHK$500", "Amount due nowHK$500"]);
        expect(document.querySelector("[data-reference]").textContent).toBe(en.key_inv_not_issued_yet);
        expect(`${ en.key_inv_invoice_reference }: ${ en.key_inv_not_issued_yet }`).toBe("Invoice reference: not issued yet");
    });

    it("Full Payment only: the Reservation Fee is not rendered at all (not even disabled) and its amount is not read; payment below the table", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply(answer()));
        mount();
        await ready();
        expect([...document.querySelectorAll(".path-card")].map((b) => b.textContent)).toEqual([`${ en.key_full_payment }HK$500`]);
        expect(screen.queryByText(en.key_reservation_fee)).toBeNull();
        expect(screen.queryByText("Not available for Standalone")).toBeNull();
        expect(getReservationFee).not.toHaveBeenCalled();
        const order = [...document.querySelectorAll(".review-stage > section")].map((s) => s.className);
        expect(order.indexOf("review-card items-card")).toBeLessThan(order.findIndex((c) => c.includes("pay-block")));
    });

    it("employer party: no credit picker here (applied on Invoice items, :544; Review read-only, :546); the payment component gets the priced input with the party and no contract fields", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply(answer()));
        mount();
        await ready();
        expect(document.querySelector("[data-credit-picker]")).toBeNull();
        expect(seen.props.selectionType).toBe("standalone");
        const data = seen.props.invoiceData;
        expect(data).toMatchObject({
            invoices_date: "2026-10-23", branch_id: 5, total_amount: 500, total_discount: 0, final_amount: 500, payment_type: "full", paid_amount: 500,
            remaining_balance: 0, apply_credits: [], record_key: "rk-s1", pricing: { ...SETUP, removed: [], add: [204], custom: [], deductions: {}, skills: [] },
        });
        // #28 / #80: one party, in pricing; the CS Owner is the creator, set on the server
        expect(["employer_id", "worker_id", "contract_type", "staff_id", "is_auto_cancel_interviews", "due_date"].filter((k) => k in data)).toEqual([]);
    });

    it("worker party: no saved credit (an employer's, OP-27-69): none priced, even one left in the draft", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply(answer({ party: { type: "worker", id: 502 } })));
        const left = { id: 31, amount: 200, available: 900, employer_id: 40, credit_type: "exchange_surplus", remainder: "keep", _reference: "I-HKH000432(E)" };
        mount({ form: WORKER_FORM, setup: WORKER_SETUP, draft: { choices: CHOICES, appliedCredits: [left] } });
        await ready();
        expect(document.querySelector("[data-credit-picker]")).toBeNull();
        expect(document.querySelector("tr.credit-row")).toBeNull();
        expect(document.querySelector("[data-party]")).toHaveTextContent(`${ en.key_worker }Marites Villanueva BGS000417-A`);
        expect(priceContractInvoiceAPI).toHaveBeenLastCalledWith(expect.objectContaining({ party: { type: "worker", id: 502 }, credits: [] }));
    });

    it("a Job Offer left from an earlier Contract Invoice draft is not used: no interviews card", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply(answer()));
        mount({ jobInfo: { job_id: 9, reference_id: "J-0009" } });
        await ready();
        expect(document.querySelector(".interviews-card")).toBeNull();
        expect("cancel_pending_upcoming_interviews" in seen.props.invoiceData).toBe(false);
    });

    it("R-P2 reused: Amount due now HK$0 — No payment required; created without a payment; opens the Standalone detail", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply(answer({ summary: { charges: 500, discounts: 500, invoiceTotal: 0, creditApplied: 0, amountDue: 0 } })));
        mount();
        await waitFor(() => expect(document.querySelector("[data-no-payment]")).toBeTruthy(), SLOW);
        expect(screen.queryByTestId("pms")).toBeNull();
        setContractInvoice.mockImplementation(() => Promise.resolve({ data: { status: true, message: "Invoice created", data: { invoice: { id: 77, status: 2, payment_method: null } } } }));
        fireEvent.click(screen.getByRole("button", { name: en.key_inv_create_no_payment_required }));
        expect((await screen.findByTestId("detail", {}, SLOW)).textContent).toBe("77");
        const sent = setContractInvoice.mock.calls[0][0];
        expect(sent).toMatchObject({ payment_type: "full", paid_amount: 0, record_key: "rk-s1", pricing: expect.objectContaining({ route: "standalone", party: SETUP.party }) });
        expect(["payment_method", "employer_id", "worker_id", "staff_id", "contract_type", "cancel_pending_upcoming_interviews", "job_id"].filter((k) => k in sent)).toEqual([]);
    });

    it("a paid Standalone Invoice: the confirmation names it Standalone and opens its detail", async () => {
        priceContractInvoiceAPI.mockImplementation(() => reply(answer()));
        mount();
        await ready();
        setContractInvoice.mockImplementation(() => Promise.resolve({ data: { status: true, message: "Invoice created",
            data: { invoice: { id: 91, invoice_number: "I-TST000091", status: 2, payment_type: "full", payment_method: "cash" } } } }));
        fireEvent.click(screen.getByRole("button", { name: "stand-in pay" }));
        const reframe = await waitFor(() => { const r = document.querySelector(".reframe"); expect(r).not.toBeNull(); return r; }, SLOW);
        expect(reframe.textContent).toContain("I-TST000091");
        expect(reframe.textContent).toContain(en.key_standalone);
        fireEvent.click(screen.getByRole("button", { name: new RegExp(en.key_open_invoice_detail) }));
        expect((await screen.findByTestId("detail", {}, SLOW)).textContent).toBe("91");
    });
});

/* ---------------- one walk per party: Items → Review → submission, priced and saved by the engine ---------------- */

const rows = () => [...document.querySelectorAll("tbody tr[data-line]")];
const rowWith = (label) => rows().find((tr) => tr.querySelector("td.de").firstChild.textContent === label);
const tableLines = () => rows().map((tr) => {
    const cells = tr.querySelectorAll("td");
    const de = cells[1].cloneNode(true);
    de.querySelectorAll(".dt").forEach((n) => n.remove());
    const steps = [...cells[3].querySelectorAll(".inv-step")].map((s) => {
        const label = s.querySelector(".sl").cloneNode(true);
        label.querySelectorAll(".lk").forEach((n) => n.remove());
        return `${ label.textContent } ${ s.querySelector(".sv").textContent.replace("−", "") }`;
    });
    return `${ cells[0].textContent } · ${ de.textContent } · ${ cells[2].textContent }${ steps.length ? ` − [${ steps.join("; ") }]` : "" } → ${ cells[4].textContent }`;
});
/* the Add Item / Add Custom Item rows (ITEMS-ROW-1) */
const draftRow = (kind) => [...document.querySelectorAll(`tbody tr[data-draft=${ kind }]`)].pop();
const choose = (row, label, text) => {
    fireEvent.keyDown(within(row).getByLabelText(label), { key: "ArrowDown" });
    fireEvent.click([...row.querySelectorAll(".mc-select__option")].find((o) => o.firstChild.firstChild.textContent === text));
};
const addItem = async (itemType, label) => {
    fireEvent.click(screen.getByRole("button", { name: en.key_add_item }));
    const row = draftRow("item");
    choose(row, en.key_item_type, itemType);
    choose(row, en.key_description, label);
    await waitFor(() => expect(draftRow("item")).toBeUndefined(), SLOW);
    await waitFor(() => expect(rowWith(label)).toBeDefined(), SLOW);
};
const addCustom = async (description, amount) => {
    fireEvent.click(screen.getByRole("button", { name: en.key_add_custom_item }));
    const row = draftRow("custom");
    fireEvent.change(within(row).getByLabelText(en.key_description), { target: { value: description } });
    fireEvent.change(within(row).getByLabelText(en.key_amount), { target: { value: String(amount) } });
    fireEvent.blur(within(row).getByLabelText(en.key_amount));
    await waitFor(() => expect(rowWith(description)).toBeDefined(), SLOW);
};

const WALKS = {
    employer: async () => {
        await addItem("Document Fee", "Contract documentation");
        await addCustom("Document courier", 320);
    },
    worker: async () => {
        await addItem("Medical Check", "Pre-employment medical");
        await addItem("Insurance Policy", "Domestic helper insurance");
    },
};

(hasContract ? describe : describe.skip)("one walk per party: the saved record is the engine's answer the review showed", () => {
    let saved;
    beforeEach(() => {
        saved = [];
        priceContractInvoiceAPI.mockImplementation((body) => reply(priceStandalone(body)));
        /* POST /invoices/add as the INV-G1 path answers it: priced again on the server for the party in pricing, the
           record shown or nothing; the frozen record is the engine's answer */
        setContractInvoice.mockImplementation((body) => {
            const priced = priceStandalone({ ...body.pricing, date: body.invoices_date, branch: body.branch_id });
            if (!priced.ok || priced.record_key !== body.record_key) {
                return Promise.reject({ response: { status: 400, data: { status: false, message: "Prices changed since Invoice Review." } } });
            }
            saved.push({ body, snapshot: { party: priced.party, lines: priced.lines, total: priced.total, summary: priced.summary } });
            return Promise.resolve({ data: { status: true, message: "Invoice created", data: { invoice: { id: 900 + saved.length, invoice_number: "I-TST000901", status: 2, payment_type: "full", payment_method: "cash" } } } });
        });
    });

    for (const type of ["employer", "worker"]) {
        it(`${ type } party: Items → Review → submitted; the saved snapshot equals the engine output shown`, async () => {
            const p = PARTIES[type];
            const setupInput = { route: "standalone", party: p.party, date: DAY.date, branch: DAY.branch };
            const contractFormInfo = { ...FORM, party_type: type, branch_name: DAY.branchName, invoice_date: DAY.date, branchId: DAY.branch,
                currentInvoiceEmployerDetail: type === "employer" ? p.record : null, currentInvoiceWorkerDetail: type === "worker" ? p.record : null };
            const store = makeStore({ draft: [] });
            render(
                <Provider store={ store }>
                    <MemoryRouter initialEntries={ [{ pathname: "/invoices/general/form", state: { contractFormInfo, setupInput } }] }>
                        <Routes>
                            <Route path="/invoices/general/form" element={ <ContractInvoiceItems mode={ STANDALONE } /> } />
                            <Route path="/invoices/general/invoice-review" element={ <InvoiceReview mode={ STANDALONE } /> } />
                            <Route path="/invoices/general/payment-type-invoice/:id" element={ <Detail /> } />
                        </Routes>
                    </MemoryRouter>
                </Provider>,
            );
            await screen.findByText(en.key_inv_no_items_yet, {}, SLOW);
            await WALKS[type]();
            // saved credit is applied on Invoice items, for an employer party only (:544; OP-27-69)
            expect(Boolean(document.querySelector("[data-credit-picker]"))).toBe(type === "employer");
            fireEvent.click(screen.getByRole("button", { name: en.key_inv_continue_to_review }));
            await ready();
            // what the review shows is the engine's answer for its request
            const shown = priceStandalone(priceContractInvoiceAPI.mock.calls.at(-1)[0]);
            expect(shown.ok).toBe(true);
            expect(tableLines()).toEqual(engineRows(shown.lines, hk));
            expect(document.querySelector("[data-due-now]").textContent).toBe(hk(shown.summary.amountDue));
            expect(document.querySelector("[data-credit-picker]")).toBeNull();
            fireEvent.click(screen.getByRole("button", { name: "stand-in pay" }));
            await waitFor(() => expect(saved).toHaveLength(1), SLOW);
            const { body, snapshot } = saved[0];
            // the saved snapshot is the engine output the review showed: the same lines, totals and summary, for this party
            expect(snapshot).toEqual({ party: p.party, lines: shown.lines, total: shown.total, summary: shown.summary });
            expect(body.record_key).toBe(shown.record_key);
            expect(body.pricing).toMatchObject({ route: "standalone", party: p.party });
            expect(["employer_id", "worker_id", "staff_id", "contract_type"].filter((k) => k in body)).toEqual([]);
            const reframe = await waitFor(() => { const r = document.querySelector(".reframe"); expect(r).not.toBeNull(); return r; }, SLOW);
            expect(reframe.textContent).toContain(en.key_standalone);
            await act(async () => { fireEvent.click(screen.getByRole("button", { name: new RegExp(en.key_open_invoice_detail) })); });
            expect((await screen.findByTestId("detail", {}, SLOW)).textContent).toBe("901");
        });
    }
});

it("/invoices/general/invoice-review is the Contract Invoice review in Standalone mode; the old review and its submit are gone", () => {
    const src = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
    expect(src("Views/Pages/routes/invoiceRoutes.js")).toMatch(/const InvoiceReviewGeneral = withInvoiceCreateGate\(standalone\(\(\) => import\("\.\.\/Invoice\/add-contract-invoice\/InvoiceReview"\)\), STANDALONE_CREATE_KEYS\);/);
    const general = path.resolve(__dirname, "../../Views/Pages/Invoice/general");
    expect(["InvoiceReview.js", "CancelContractPopup.js"].filter((f) => fs.existsSync(path.join(general, f)))).toEqual([]);
    expect(src("redux/Slices/invoices/InvoicesSlice.js")).not.toMatch(/addGeneralInvoice|saveGeneralInvoice|invoiceItemsList|setInvoiceItemsList|clearInvoiceItemsList/);
    expect(src("services/invoices.js")).not.toMatch(/saveGeneralInvoice/);
    expect(src("services/apiPath.js")).not.toMatch(/add-individual/);
    expect(src("redux/invoiceDraftSession.js")).not.toMatch(/generalItems|invoiceItemsList/);
});
