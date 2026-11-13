/* eslint-env jest */
import React from "react";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* Contract Invoice · Invoice items, walked through the screen (27 Oct package, INV-C3; pack appendix C, the nine flows).
   The pricing endpoint is stood in for by the contract repo's own engine (src/domain/invoicePricing/engine.ts, transpiled
   as it is: it imports nothing) on the appendix A Price List snapshot its tests build, with the worker facts the server
   reads (the flows' work history included, as INV-C1b will read it). Each flow's staff actions are made with the screen's
   controls (the cross, the Add Item and Add Custom Item rows — ITEMS-ROW-1 —, Discount / Promo, Adjust supplement) and the
   table must end on the flow's final lines, removed lines and total. Needs the maidmatch-contract checkout next to this
   repo (or CONTRACT_API_DIR); without it the suite is skipped. */

const contractDir = process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract");
const hasContract = fs.existsSync(path.join(contractDir, "src/domain/invoicePricing/engine.ts"));

const PROVIDER = `
for (const [k, v] of Object.entries({ PHILIPPINES_NATIONALITY_ID: "71", INDONESIAN_NATIONALITY_ID: "95", THAI_NATIONALITY_ID: "198",
    BANGLADESHI_NATIONALITY_ID: "18", PHILIPPINES_COUNTRY_ID: "141", INDONESIAN_COUNTRY_ID: "77", THAI_COUNTRY_ID: "170",
    BANGLADESHI_COUNTRY_ID: "14", CONTRACT_CATEGORY_LOCAL_FINISHED: "2", CONTRACT_CATEGORY_LOCAL_TERMINATED: "3",
    CONTRACT_CATEGORY_LOCAL_TERMINATED_TR: "4" })) process.env[k] ||= v;
process.env.IS_REDIS_ENABLED = "false";
const fs = require("fs");
const ts = require("typescript");
const local = require("./src/services/v1/price.list.services");
const snapshot = require("./src/services/v1/price.list.snapshot.services");
const { modelsStore } = require("./src/models/models");
const { appendixDb } = require("./tests/price.list.appendix");
const F = JSON.parse(fs.readFileSync("tests/fixtures/invoice.pricing.appendix.bc.json", "utf8"));
const COUNTRY = Object.fromEntries(local.localNationalityIds().map((id, i) => [id, [141, 77, 170, 14][i]]));
const env = appendixDb({ nationalityIds: local.localNationalityIds(), categoryIds: local.localCategoryIds(), countryOf: (id) => COUNTRY[id] });
const rows = env.db.countriesModel.rows;
F.countries.filter((n) => !rows.some((r) => r.name_en === n)).forEach((n, i) => rows.push({ id: 2000 + i, name_en: n, status: 1 }));
modelsStore.run(env.db, () => snapshot.buildPriceListSnapshot()).then((pl) => {
    const engine = ts.transpileModule(fs.readFileSync("src/domain/invoicePricing/engine.ts", "utf8"),
        { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 } }).outputText;
    process.stdout.write("@@DATA@@" + JSON.stringify({ pl, engine, F }));
    process.exit(0);
});`;

const DATA = hasContract
    ? JSON.parse(execFileSync(process.execPath, ["-r", "ts-node/register/transpile-only", "-e", PROVIDER], { cwd: contractDir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("@@DATA@@")[1])
    : null;
const ENGINE = {};
// eslint-disable-next-line no-new-func
if (DATA) new Function("exports", "require", DATA.engine)(ENGINE, () => { throw new Error("the engine imports nothing"); });

jest.mock("../../services/invoices", () => ({ priceContractInvoiceAPI: jest.fn() }));
/* eslint-disable import/first */
import { priceContractInvoiceAPI } from "../../services/invoices";
import invoices from "../../redux/Slices/invoices/InvoicesSlice";
import employer from "../../redux/Slices/employer/EmployerSlice";
import ContractInvoiceItems from "../../Views/Pages/Invoice/add-contract-invoice/ContractInvoiceItems";
import { offeredTypes } from "../../Views/Pages/Invoice/add-contract-invoice/invoiceItems";
/* eslint-enable import/first */

jest.setTimeout(60000);

beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

/* ---------------- the stand-in server: the worker's facts, then the engine ---------------- */

const named = (list, name) => list.find((x) => x.name === name).id;
const WORKERS = DATA && (() => {
    const { pl, F } = DATA;
    const h = (position, country, status, start, end) => ({ position, country: named(pl.countries, country), status, start, end, reviewed: true });
    const courseId = (name) => pl.skills.find((k) => F.courses[k.key] === name).profile_value_id;
    return {
        501: { name: "Maria Lourdes Santos", reference_id: "LPF902190", facts: { nationality: named(pl.nationalities, "Filipino"), category: pl.local.categories[0].id }, worker: { id: 501, type: "local", partner: null } },
        502: {
            name: "Marites Villanueva", reference_id: "BGS000417-A",
            facts: {
                agency: "BGS", review: { outcome: "overseas" },
                history: [h("we1", "Hong Kong", "Finished Contract", "2023-08", "2025-02"), h("earlier", "Singapore", "Finished Contract", "2019-03", "2021-09")],
                profile: { specialCourses: [courseId("Caregiver Course"), courseId("Bachelor of Nursing")] },
            },
            worker: { id: 502, type: "overseas", partner: { id: 1, code: "BGS", name: "BGS" } },
        },
    };
})();
const serve = (body) => {
    const { worker_id: workerId, employer_id: _employer, origin_contract_id: _origin, adding, ...rest } = body;
    const w = WORKERS[workerId];
    const r = ENGINE.priceInvoice({ ...rest, ...w.facts }, DATA.pl, DATA.F.now, { adding: adding === true });
    return { worker: w.worker, ...(rest.route === "renewal" ? { predecessor: { id: 3, ref: "C-2024-0152", status: "active", end: "2027-03-31" } } : {}), ...r };
};

/* ---------------- the flows' applications (setup's input) and the staff actions, in appendix C's order ---------------- */

const SETUP = DATA && {
    "Local · New": { worker: 501, route: "local", type: "new", driver: false },
    "Local · Replacement": { worker: 501, route: "local", type: "rep", driver: false },
    "Local · Driver": { worker: 501, route: "local", type: "rep", driver: true },
    "Local Transfer": { worker: 501, route: "local_transfer", type: null, driver: false },
    Renewal: { worker: 501, route: "renewal", type: null, driver: false },
    "Overseas · New": { worker: 502, route: "overseas", type: "new", driver: null },
    "Overseas · Replacement": { worker: 502, route: "overseas", type: "rep", driver: null },
    "Direct Hire": { worker: 502, route: "direct_hire", type: null, driver: null },
    "Blocked draft": { worker: 501, route: "local", type: "new", driver: null },
};
const promo = (id) => DATA.F.promotions[id];

const ReviewProbe = () => {
    const { state } = useLocation();
    return <div data-testid="review">{ `${ state.setupInput.route } · driver ${ state.setupInput.driver } · ${ state.contractFormInfo.currentInvoiceWorkerDetail.name }` }</div>;
};

const mount = (flow) => {
    const s = SETUP[flow];
    const w = WORKERS[s.worker];
    const setupInput = { worker_id: s.worker, employer_id: 40, route: s.route, category: null, type: s.type, driver: s.driver, date: DATA.F.context.date, branch: named(DATA.pl.branches, DATA.F.context.branch) };
    const contractFormInfo = {
        currentInvoiceEmployerDetail: { employer_id: 40, name: "Chan Tai Man", reference_id: "E-1001" },
        currentInvoiceWorkerDetail: { id: s.worker, name: w.name, reference_id: w.reference_id },
        invoice_date: DATA.F.context.date, branchId: setupInput.branch, csId: 9, branch_name: DATA.F.context.branch, cs_name: "Lee",
    };
    const store = configureStore({ reducer: { invoices, employer } });
    render(
        <Provider store={ store }>
            <MemoryRouter initialEntries={ [{ pathname: "/items", state: { contractFormInfo, setupInput } }] }>
                <Routes>
                    <Route path="/items" element={ <ContractInvoiceItems /> } />
                    <Route path="/invoices/add-contract-invoice/invoice-review" element={ <ReviewProbe /> } />
                </Routes>
            </MemoryRouter>
        </Provider>,
    );
};

/* the table as the pack's notation: "Item Type · Description · Amount − [step; …] → Total" */
const tableLines = () => [...document.querySelectorAll("tbody tr[data-line]")].map((tr) => {
    const cells = tr.querySelectorAll("td");
    const de = cells[1].cloneNode(true);
    de.querySelectorAll(".dt").forEach((n) => n.remove());
    const steps = [...cells[3].querySelectorAll(".inv-step")].map((s) => {
        const label = s.querySelector(".sl").cloneNode(true);
        const locked = Boolean(label.querySelector(".lk"));
        label.querySelectorAll(".lk").forEach((n) => n.remove());
        return `${ label.textContent } ${ s.querySelector(".sv").textContent.replace("−", "") }${ locked ? " (locked)" : "" }`;
    });
    return `${ cells[0].textContent } · ${ de.textContent } · ${ cells[2].textContent }${ steps.length ? ` − [${ steps.join("; ") }]` : "" } → ${ cells[4].textContent }`;
});
const struck = () => [...document.querySelectorAll("tbody tr.rm-row td.de")].map((td) => td.firstChild.textContent);
const total = () => document.querySelector("[data-total]").textContent;
/* the panels' previews are debounced and asked of the engine; under a full parallel run that can take longer than the default 1 s */
const SLOW = { timeout: 15000 };
const settled = async () => {
    await waitFor(() => expect(document.querySelector("tbody tr[data-line]")).not.toBeNull(), SLOW);
    await act(() => new Promise((r) => setTimeout(r, 30)));
};
const rowWith = (label) => [...document.querySelectorAll("tbody tr[data-line]")].find((tr) => tr.querySelector("td.de").firstChild.textContent === label);

const removeLine = async (label) => {
    fireEvent.click(rowWith(label).querySelector(".ibtn"));
    await waitFor(() => expect(rowWith(label)).toBeUndefined(), SLOW);
};
/* the Add Item / Add Custom Item rows (ITEMS-ROW-1): the last empty row of a kind; a row select's menu and its options */
const draftRow = (kind) => [...document.querySelectorAll(`tbody tr[data-draft=${ kind }]`)].pop();
const openMenu = (row, label) => fireEvent.keyDown(within(row).getByLabelText(label), { key: "ArrowDown" });
const menuOptions = (row) => [...row.querySelectorAll(".mc-select__option")].map((o) => o.textContent);
const choose = (row, label, text) => {
    openMenu(row, label);
    fireEvent.click([...row.querySelectorAll(".mc-select__option")].find((o) => o.firstChild.firstChild.textContent === text));
};
const addItem = async (itemType, label) => {
    fireEvent.click(screen.getByRole("button", { name: "Add Item" }));
    const row = draftRow("item");
    choose(row, "Item Type", itemType);
    choose(row, "Description", label);
    await waitFor(() => expect(draftRow("item")).toBeUndefined(), SLOW);
    await waitFor(() => expect(rowWith(label)).toBeDefined(), SLOW);
};
const addCustom = async (description, amount) => {
    fireEvent.click(screen.getByRole("button", { name: "Add Custom Item" }));
    const row = draftRow("custom");
    fireEvent.change(within(row).getByLabelText("Description"), { target: { value: description } });
    fireEvent.change(within(row).getByLabelText("Amount"), { target: { value: String(amount) } });
    fireEvent.blur(within(row).getByLabelText("Amount"));
    await waitFor(() => expect(rowWith(description)).toBeDefined(), SLOW);
    expect(draftRow("custom")).toBeUndefined();
};
const discounts = async (label, steps) => {
    fireEvent.click(within(rowWith(label)).getByRole("button", { name: "Discount / Promo" }));
    const dialog = await screen.findByRole("dialog", { name: "Discount / Promo" }, SLOW);
    for (const step of steps) {
        if (step.promo) fireEvent.click(within(dialog).getByRole("checkbox", { name: (name) => name.startsWith(step.promo) }));
        else {
            fireEvent.click(within(dialog).getByRole("checkbox", { name: "Manual discount" }));
            fireEvent.change(within(dialog).getByLabelText(/^Amount/), { target: { value: String(step.flat) } });
            fireEvent.change(within(dialog).getByLabelText(/^Reason/), { target: { value: step.reason } });
        }
    }
    const apply = within(dialog).getByRole("button", { name: "Apply" });
    await waitFor(() => expect(apply).toBeEnabled(), SLOW);
    fireEvent.click(apply);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), SLOW);
    await settled();
};
const adjust = async (label, decision, reason) => {
    fireEvent.click(within(rowWith(label)).getByRole("button", { name: "Adjust supplement" }));
    const dialog = await screen.findByRole("dialog", { name: "Adjust supplement" }, SLOW);
    fireEvent.click(within(dialog).getByRole("radio", { name: decision }));
    fireEvent.change(within(dialog).getByLabelText(/^Reason/), { target: { value: reason } });
    const apply = within(dialog).getByRole("button", { name: "Apply" });
    await waitFor(() => expect(apply).toBeEnabled(), SLOW);
    fireEvent.click(apply);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), SLOW);
    await settled();
};

const ACTIONS = {
    "Local · New": async () => {
        await removeLine("Domestic helper insurance");
        await addItem("Admin Fee", "Re-issue of employment documents");
        await addCustom("Document courier to Manila · attestation set", 320);
        await discounts("Filipino · Local Finished · New", [{ flat: 300, reason: "Returning employer" }, { promo: promo("p1") }]);
    },
    "Local · Replacement": async () => discounts("Filipino · Local Finished · Replacement", [{ promo: promo("p1") }]),
    "Local · Driver": async () => {},
    "Local Transfer": async () => discounts("Filipino · Local Transfer", [{ promo: promo("p3") }]),
    Renewal: async () => {
        // Hospital cover top-up is offered by configuration for Renewal but has no amount: its type is shown (OP-27-134) and
        // the item is listed, not choosable, "no amount set, so it cannot be added"; the row is removed by its cross
        const answer = serve(priceContractInvoiceAPI.mock.calls.at(-1)[0]);
        const hospital = answer.available.find((a) => a.label === "Hospital cover top-up");
        expect(hospital.amount).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "Add Item" }));
        const row = draftRow("item");
        openMenu(row, "Item Type");
        expect(menuOptions(row)).toContain(hospital.itemType);
        expect(menuOptions(row)).toEqual(offeredTypes(answer));
        choose(row, "Item Type", hospital.itemType);
        openMenu(row, "Description");
        const option = [...row.querySelectorAll(".mc-select__option")].find((o) => o.firstChild.firstChild.textContent === "Hospital cover top-up");
        expect([option.textContent, option.getAttribute("aria-disabled")]).toEqual(["Hospital cover top-upno amount set, so it cannot be added", "true"]);
        fireEvent.click(option);
        expect(draftRow("item")).toBeDefined();
        fireEvent.click(within(row).getByRole("button", { name: "Remove this line" }));
        expect(draftRow("item")).toBeUndefined();
    },
    "Overseas · New": async () => addItem("Skills", "Nursing"),
    "Overseas · Replacement": async () => {
        await addItem("Conditional item", "Caregiving");
        await addItem("Conditional item", "Nursing");
        await adjust("Caregiving", "Waive", "Included in the agreed price");
        await discounts("Filipino · BGS · Replacement", [{ promo: promo("p1") }]);
    },
    "Direct Hire": async () => {
        await addItem("Medical Check", "Pre-employment medical");
        await addItem("Insurance Policy", "Philippine worker insurance");
    },
    "Blocked draft": async () => {},
};

beforeEach(() => {
    priceContractInvoiceAPI.mockReset();
    priceContractInvoiceAPI.mockImplementation((body) => Promise.resolve({ data: { status: true, data: serve(body) } }));
});

(hasContract ? describe : describe.skip)("appendix C, walked through Invoice items with the engine", () => {
    for (const flow of (DATA ? DATA.F.flows : [])) {
        it(`${ flow.name }: ${ flow.before.startsWith("BLOCKED") ? "blocked" : `${ flow.before } → ${ flow.after }` }`, async () => {
            mount(flow.name);
            await settled();
            expect(total()).toBe(flow.before.startsWith("BLOCKED") ? "—" : flow.before);
            await ACTIONS[flow.name]();
            await settled();
            expect(tableLines()).toEqual(flow.finalLines);
            expect(struck().join(", ") || null).toBe(flow.removed);
            const continueButton = screen.getByRole("button", { name: "Continue to Invoice Review" });
            if (flow.after.startsWith("BLOCKED")) {
                expect(total()).toBe("—");
                expect(screen.getByRole("alert")).toHaveTextContent(flow.after.replace("BLOCKED — ", ""));
                expect(continueButton).toBeDisabled();
                expect(document.querySelector(".review-foot .why").textContent).toBe("Choose Process as driver");
                expect(screen.getByRole("button", { name: "Back to Contract setup" })).toBeInTheDocument();
            } else {
                expect(total()).toBe(flow.after);
                expect(continueButton).toBeEnabled();
            }
        });
    }
});

(hasContract ? describe : describe.skip)("the stage's own rules", () => {
    it("the rule notes the package words for this stage", async () => {
        mount("Local · Driver");
        await settled();
        const notes = screen.getAllByRole("note").map((n) => n.textContent);
        expect(notes).toEqual([
            "The table is the same five columns on every route. Item Type, Description, Amount, Discount / Promo, Total — full width, amounts read-only. Add Item adds a row: choose the Item Type, then the Description from the Fixed items list; the amount follows the Price List. Add Custom Item adds a row with its own description and amount.",
            "“Conditional item” is a type name, not a trigger. Adjust supplement belongs only to the genuine experience and skill lines. Other lines that happen to carry the Conditional item type are not adjustable.",
        ]);
        expect(screen.queryByRole("button", { name: /Apply Credit/ })).toBeNull();
    });

    it("Continue hands the application to Invoice Review, which prices it again (INV-C4): no line rows travel", async () => {
        mount("Local · Driver");
        await settled();
        fireEvent.click(screen.getByRole("button", { name: "Continue to Invoice Review" }));
        expect((await screen.findByTestId("review")).textContent).toBe("local · driver true · Maria Lourdes Santos");
    });

    it("the cross is rechecked at click: an item now automatic and required stays, with the reference page's note; a failed read changes nothing", async () => {
        mount("Local · New");
        await settled();
        priceContractInvoiceAPI.mockImplementationOnce((body) => {
            const r = serve(body);
            return Promise.resolve({ data: { status: true, data: { ...r, refused: [...r.refused, { item: body.removed[0], reason: "required" }] } } });
        });
        fireEvent.click(rowWith("Domestic helper insurance").querySelector(".ibtn"));
        expect(await screen.findByText("Domestic helper insurance was not removed")).toBeInTheDocument();
        expect(screen.getByText("It is now automatic and required for this invoice, so it stays on it.")).toBeInTheDocument();
        expect(rowWith("Domestic helper insurance")).toBeDefined();
        priceContractInvoiceAPI.mockImplementationOnce(() => Promise.reject(new Error("down")));
        fireEvent.click(rowWith("Domestic helper insurance").querySelector(".ibtn"));
        expect(await screen.findByText("Nothing was removed")).toBeInTheDocument();
        expect(rowWith("Domestic helper insurance")).toBeDefined();
    });

    it("a discount the engine refuses is shown refused and cannot be applied (PV-03); cancelling creates nothing", async () => {
        mount("Local · New");
        await settled();
        fireEvent.click(within(rowWith("Contract documentation")).getByRole("button", { name: "Discount / Promo" }));
        const dialog = await screen.findByRole("dialog", { name: "Discount / Promo" }, SLOW);
        fireEvent.click(within(dialog).getByRole("checkbox", { name: "Manual discount" }));
        fireEvent.change(within(dialog).getByLabelText(/^Amount/), { target: { value: "800" } });
        fireEvent.change(within(dialog).getByLabelText(/^Reason/), { target: { value: "Goodwill" } });
        await waitFor(() => expect(within(dialog).getByText(/more than the HK\$500 remaining, refused/)).toBeInTheDocument());
        expect(within(dialog).getByRole("button", { name: "Apply" })).toBeDisabled();
        fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), SLOW);
        expect(tableLines()).toContain("Document Fee · Contract documentation · HK$500 → HK$500");
    });

    it("an Add Item row rechecks at click: an item the Price List no longer has an amount for is refused as the warning note, the row back to incomplete, nothing added", async () => {
        mount("Local · New");
        await settled();
        priceContractInvoiceAPI.mockImplementation((body) => {
            const r = serve(body);
            return Promise.resolve({ data: { status: true, data: body.adding ? { ...r, refused: [{ item: body.add[body.add.length - 1], reason: "missing" }] } : r } });
        });
        fireEvent.click(screen.getByRole("button", { name: "Add Item" }));
        const row = draftRow("item");
        choose(row, "Item Type", "Admin Fee");
        choose(row, "Description", "Re-issue of employment documents");
        const note = await waitFor(() => { const n = document.querySelector("[data-note]"); expect(n).not.toBeNull(); return n; }, SLOW);
        expect(note.textContent).toBe("Admin Fee · Re-issue of employment documentsThis item has no amount yet, so it can’t be added.");
        expect(screen.queryByRole("dialog")).toBeNull();
        expect(rowWith("Re-issue of employment documents")).toBeUndefined();
        await waitFor(() => expect(within(draftRow("item")).getByLabelText("Description")).toBeEnabled());
        expect(draftRow("item").querySelector(".mc-select__single-value")?.textContent).toBe("Admin Fee");
        expect(document.querySelector(".review-foot .why").textContent).toBe("Finish or remove the empty item row.");
        expect(screen.getByRole("button", { name: "Continue to Invoice Review" })).toBeDisabled();
    });
});
