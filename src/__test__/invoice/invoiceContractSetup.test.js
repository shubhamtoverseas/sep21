/* eslint-env jest */
import React from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* Contract Invoice · Contract setup (27 Oct package, INV-C2; requirements "Setup and context"; the reference page's three
   cards). The screen never prices: the worker, the employer and the application's choices go to POST /invoices/price on
   every change, and the cards show what the engine found. Choices appear only where the route has them; Process as driver
   has no default and is never taken from the profile (R-B2); a profile holding Local Transfer or Renewal names the route,
   read-only, and the Local category is then chosen here (OP-27-40); a Renewal shows its predecessor Contract (OP-27-41). */

jest.mock("../../services/invoices", () => ({ priceContractInvoiceAPI: jest.fn() }));
/* eslint-disable import/first */
import { priceContractInvoiceAPI } from "../../services/invoices";
import {
    asksCategory, asksDriver, asksType, hk, initialChoices, pricingInput, routeOf, setupWhy,
} from "../../Views/Pages/Invoice/add-contract-invoice/contractSetup";
import ContractSetupService from "../../Views/Pages/Invoice/add-contract-invoice/ContractSetupService";
import ContractSetupFacts from "../../Views/Pages/Invoice/add-contract-invoice/ContractSetupFacts";
import useContractPricing from "../../Views/Pages/Invoice/add-contract-invoice/useContractPricing";
/* eslint-enable import/first */

beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
afterEach(() => jest.resetAllMocks());

const LOCAL = { id: 501, type: 1, name: "Maria" };
const OVERSEAS = { id: 502, type: 2, name: "Marites" };
const answer = (data) => Promise.resolve({ data: { status: true, data } });

describe("the setup rules", () => {
    it("routes: Local, Local Transfer (a choice, or the profile's route), Renewal (the profile's route), Overseas and Direct Hire; New / Replacement and Process as driver only where the route has them", () => {
        expect(routeOf(LOCAL, "Local Finished", { local_transfer: "no" })).toBe("local");
        expect(routeOf(LOCAL, "Local Finished", { local_transfer: "yes" })).toBe("local_transfer");
        expect(routeOf(LOCAL, "Local Transfer", { local_transfer: "no" })).toBe("local_transfer");
        expect(routeOf(LOCAL, "Renew", { local_transfer: "yes" })).toBe("renewal");
        expect(routeOf(OVERSEAS, "Overseas", { direct_hire: "no" })).toBe("overseas");
        expect(routeOf(OVERSEAS, "Overseas", { direct_hire: "yes" })).toBe("direct_hire");
        expect(["local", "local_transfer", "renewal", "overseas", "direct_hire"].map((r) => [asksType(r), asksDriver(r)])).toEqual([
            [true, true], [false, true], [false, true], [true, false], [false, false],
        ]);
    });

    it("OP-27-40: the Contract category is asked only where a Local worker's profile holds a route (Local Transfer, Renewal)", () => {
        expect(["Local Transfer", "Renewal", "Renew", "Local Finished", "Local Terminated", "Local Terminated (TR)"].map((c) => asksCategory(LOCAL, c)))
            .toEqual([true, true, true, false, false, false]);
        expect(asksCategory(OVERSEAS, "Local Transfer")).toBe(false);
    });

    it("a worker starts with its route from the profile, no Contract category and no Process as driver choice (R-B2)", () => {
        expect(initialChoices(LOCAL, "Local Transfer")).toEqual({ local_transfer: "yes", direct_hire: "no", contract_category: "", process_as_driver: "" });
        expect(initialChoices(LOCAL, "Local Finished")).toEqual({ local_transfer: "no", direct_hire: "no", contract_category: "", process_as_driver: "" });
        expect(initialChoices(OVERSEAS, "Direct Hire")).toEqual({ local_transfer: "no", direct_hire: "yes", contract_category: "", process_as_driver: "" });
        // a profile that mentions driving chooses nothing
        expect(initialChoices({ ...LOCAL, worker_role: "Driver", skills: ["Driving"] }, "Local Finished").process_as_driver).toBe("");
    });

    it("Continue waits for the Contract category where it is asked, then Process as driver on every Local route; Overseas and Direct Hire never ask them", () => {
        expect(setupWhy("local", { process_as_driver: "" })).toBe("driver");
        expect(setupWhy("renewal", {})).toBe("driver");
        expect(setupWhy("renewal", { process_as_driver: "no" }, true)).toBe("category");
        expect(setupWhy("local_transfer", { process_as_driver: "", contract_category: "4" }, true)).toBe("driver");
        expect(setupWhy("local_transfer", { process_as_driver: "no", contract_category: "4" }, true)).toBe("");
        expect(setupWhy("local_transfer", { process_as_driver: "no" })).toBe("");
        expect(setupWhy("overseas", {})).toBe("");
        expect(setupWhy("direct_hire", {})).toBe("");
    });

    it("the engine's input: worker and employer by id, the route, the choices the route has (null otherwise), the date and branch; nothing until both are set", () => {
        const base = { worker: LOCAL, employerId: "40", categoryName: "Local Finished", invoiceDate: "2026-10-23", branchId: "5" };
        expect(pricingInput({ ...base, choices: { local_transfer: "no", contract_type_internal: "replacement", process_as_driver: "yes" } }))
            .toEqual({ worker_id: 501, employer_id: 40, route: "local", category: null, type: "rep", driver: true, date: "2026-10-23", branch: 5 });
        expect(pricingInput({ ...base, choices: { local_transfer: "yes", contract_type_internal: "replacement", process_as_driver: "no" } }))
            .toEqual({ worker_id: 501, employer_id: 40, route: "local_transfer", category: null, type: null, driver: false, date: "2026-10-23", branch: 5 });
        expect(pricingInput({ ...base, choices: { local_transfer: "no", contract_type_internal: "new", process_as_driver: "" } }).driver).toBeNull();
        expect(pricingInput({ ...base, worker: OVERSEAS, categoryName: "Direct Hire", choices: { direct_hire: "yes", contract_type_internal: "replacement", contract_category: "4" } }))
            .toEqual({ worker_id: 502, employer_id: 40, route: "direct_hire", category: null, type: null, driver: null, date: "2026-10-23", branch: 5 });
        expect(pricingInput({ ...base, branchId: "", choices: {} })).toBeNull();
        expect(pricingInput({ ...base, invoiceDate: "", choices: {} })).toBeNull();
        expect([hk(11500), hk(8969.37), hk(0)]).toEqual(["HK$11,500", "HK$8,969.37", "HK$0"]);
    });

    it("OP-27-40 / 41: the chosen Contract category is sent only where it is asked (a profile Local category is never overridden); the origin Contract when it names one", () => {
        const base = { worker: LOCAL, employerId: 40, invoiceDate: "2026-10-23", branchId: 5 };
        expect(pricingInput({ ...base, categoryName: "Local Transfer", choices: { contract_category: "4", process_as_driver: "no" } }))
            .toEqual({ worker_id: 501, employer_id: 40, route: "local_transfer", category: 4, type: null, driver: false, date: "2026-10-23", branch: 5 });
        expect(pricingInput({ ...base, categoryName: "Renew", choices: { contract_category: "2" }, originContractId: "77" }))
            .toEqual({ worker_id: 501, employer_id: 40, route: "renewal", category: 2, type: null, driver: null, date: "2026-10-23", branch: 5, origin_contract_id: 77 });
        expect(pricingInput({ ...base, categoryName: "Local Finished", choices: { contract_category: "4", local_transfer: "no" } }).category).toBeNull();
    });
});

const pricingOf = (result, extra = {}) => ({ status: "ready", result, error: "", retry: jest.fn(), ...extra });
const renderCard = (props) => render(
    <div className="invd"><ContractSetupService route="local" pricing={ { status: "idle", result: null, error: "", retry: jest.fn() } } onChoose={ jest.fn() } { ...props } /></div>,
);
const groups = () => screen.queryAllByRole("radiogroup").map((g) => g.getAttribute("aria-label"));
const radioValues = (group) => within(screen.getByRole("radiogroup", { name: group })).getAllByRole("radio").map((r) => [r.value, r.checked]);

describe("the Service card", () => {
    it("Local worker: Local Transfer, Type (Internal) and Process as driver with nothing chosen; a choice goes to the page; the driver rule note as the package words it", () => {
        const onChoose = jest.fn();
        renderCard({ worker: LOCAL, categoryName: "Local Finished", route: "local", choices: { local_transfer: "no", contract_type_internal: "new", process_as_driver: "" }, onChoose });
        expect(groups()).toEqual(["Local Transfer", "Type(Internal)", "Process as driver"]);
        expect(radioValues("Process as driver")).toEqual([["yes", false], ["no", false]]);
        fireEvent.click(within(screen.getByRole("radiogroup", { name: "Process as driver" })).getByLabelText("Yes"));
        expect(onChoose).toHaveBeenCalledWith({ process_as_driver: "yes" });
        expect(screen.getByRole("note")).toHaveTextContent("Process as driver follows the application through. It is retained in the invoice, the reservation and the resulting Contract or Processing record, and a new Exchange application needs its own choice. “Driver” appears in the Local line description only when selected.");
        expect(screen.queryByLabelText("Contract category")).toBeNull();
    });

    it("OP-27-40: a profile holding Local Transfer shows Local Transfer = Yes read-only and asks the Contract category (required, no default), never Type (Internal)", () => {
        const onChoose = jest.fn();
        const options = [{ id: 2, name: "Local Finished" }, { id: 3, name: "Local Terminated" }, { id: 4, name: "Local Terminated (TR)" }];
        renderCard({
            worker: LOCAL, categoryName: "Local Transfer", route: "local_transfer", categoryAsked: true, onChoose,
            choices: { local_transfer: "yes", contract_category: "", process_as_driver: "" },
            pricing: pricingOf({ ok: false, problems: [{ scope: "category", text: "Choose the contract category to price this invoice." }], lines: [], worker: { id: 501 }, category: { source: "chosen", id: null, options } }),
        });
        expect(groups()).toEqual(["Process as driver"]);
        expect(screen.getByText("Local Transfer").closest("div").parentElement).toHaveTextContent("Local TransferYes");
        const select = screen.getByLabelText(/Contract category/);
        expect([...select.options].map((o) => [o.value, o.textContent])).toEqual([["", "Please Select"], ["2", "Local Finished"], ["3", "Local Terminated"], ["4", "Local Terminated (TR)"]]);
        expect(select.value).toBe("");
        fireEvent.change(select, { target: { value: "4" } });
        expect(onChoose).toHaveBeenCalledWith({ contract_category: "4" });
        expect(screen.getByRole("alert")).toHaveTextContent("Choose the contract category to price this invoice.");
    });

    it("OP-27-41: a Renewal shows its predecessor (reference, Active, end date) read-only; no Local Transfer and no Type (Internal); none found shows the engine's copy", () => {
        let view = renderCard({
            worker: LOCAL, categoryName: "Renew", route: "renewal", categoryAsked: true, choices: { contract_category: "2", process_as_driver: "no" },
            pricing: pricingOf({ ok: true, total: { net: 8300 }, problems: [], lines: [{}, {}, {}], worker: { id: 501 }, pricingCode: "LPF",
                predecessor: { id: 3, ref: "C-2024-0152", status: "active", end: "2027-03-31" }, category: { source: "chosen", id: 2, options: [{ id: 2, name: "Local Finished" }] } }),
        });
        expect(groups()).toEqual(["Process as driver"]);
        expect(screen.getByText("Renewal of").closest("div").parentElement).toHaveTextContent("Renewal ofC-2024-0152Activeends 31 Mar 2027");
        expect(screen.getByRole("status")).toHaveTextContent("Configuration populates 3 lines, totalling HK$8,300 before any staff action.");
        view.unmount();
        view = renderCard({
            worker: LOCAL, categoryName: "Renew", route: "renewal", categoryAsked: true, choices: { contract_category: "2", process_as_driver: "no" },
            pricing: pricingOf({ ok: false, total: null, problems: [{ scope: "predecessor", text: "No Active contract to renew for this employer and worker." }], lines: [], worker: { id: 501 }, predecessor: null, category: { source: "chosen", id: 2, options: [] } }),
        });
        expect(screen.getByText("Renewal of").closest("div").parentElement).toHaveTextContent("Renewal of—");
        expect(screen.getByRole("alert")).toHaveTextContent("No Active contract to renew for this employer and worker.");
    });

    it("Overseas: Direct Hire and Type, no Process as driver and no driver note; Direct Hire: neither", () => {
        let view = renderCard({ worker: OVERSEAS, categoryName: "Overseas", route: "overseas", choices: { direct_hire: "no", contract_type_internal: "new" } });
        expect(groups()).toEqual(["Direct Hire", "Type(Internal)"]);
        expect(screen.queryByRole("note")).toBeNull();
        view.unmount();
        view = renderCard({ worker: OVERSEAS, categoryName: "Direct Hire", route: "direct_hire", choices: { direct_hire: "yes", contract_type_internal: "replacement" } });
        expect(groups()).toEqual(["Direct Hire"]);
    });

    it("enough to price: the package's green note with the lines and their total, and the pricing code the engine used", () => {
        renderCard({
            worker: OVERSEAS, categoryName: "Direct Hire", route: "direct_hire", choices: { direct_hire: "yes" },
            pricing: pricingOf({ ok: true, pricingCode: "BGS", total: { original: 10100, discount: 0, net: 10100 }, problems: [], lines: [{ id: "base" }, { id: "item:1" }, { id: "item:2" }], worker: { id: 502 } }),
        });
        expect(screen.getByRole("status")).toHaveTextContent("Enough is set to price. Configuration populates 3 lines, totalling HK$10,100 before any staff action.");
        expect(screen.getByText("Pricing code").nextSibling).toHaveTextContent("BGS selects the schedule row; the official Worker Code above never changes");
    });

    it("what stops the invoice: the engine's problems word for word, under the reference page's title; one line in the singular", () => {
        let view = renderCard({
            worker: LOCAL, categoryName: "Local Finished", route: "local", choices: { local_transfer: "no", contract_type_internal: "new", process_as_driver: "" },
            pricing: pricingOf({ ok: false, pricingCode: "LPF", total: null, lines: [{ id: "item:1" }, { id: "item:2" }], worker: { id: 501 },
                problems: [{ scope: "driver", text: "Choose Process as driver for this application. It is not taken from the worker’s profile, skills or an earlier contract." }] }),
        });
        expect(screen.getByRole("alert")).toHaveTextContent("This invoice can’t be created yet");
        expect(screen.getByRole("alert")).toHaveTextContent("Choose Process as driver for this application. It is not taken from the worker’s profile, skills or an earlier contract.");
        expect(screen.queryByRole("status")).toBeNull();
        view.unmount();
        renderCard({ worker: LOCAL, categoryName: "Local Finished", route: "local", choices: { process_as_driver: "no" }, pricing: pricingOf({ ok: true, total: { net: 6800 }, problems: [], lines: [{ id: "base" }], worker: { id: 501 } }) });
        expect(screen.getByRole("status")).toHaveTextContent("Configuration populates 1 line, totalling HK$6,800 before any staff action.");
    });

    it("OP-27-42: a failed read says the Price List could not be loaded (or the server's refusal) and Retry asks again", () => {
        const retry = jest.fn();
        let view = renderCard({ worker: LOCAL, categoryName: "Local Finished", route: "local", choices: {}, pricing: { status: "error", result: null, error: "", retry } });
        expect(screen.getByRole("alert")).toHaveTextContent("The Price List could not be loaded. Try again.");
        fireEvent.click(screen.getByRole("button", { name: "Retry" }));
        expect(retry).toHaveBeenCalledTimes(1);
        view.unmount();
        view = renderCard({ worker: LOCAL, categoryName: "Local Finished", route: "local", choices: {}, pricing: { status: "error", result: null, error: "Access Denied", retry } });
        expect(screen.getByRole("alert")).toHaveTextContent("Access Denied");
    });
});

describe("the Employer and worker card's facts row", () => {
    it("Local: Worker Code, Worker Type, Nationality and the profile's Contract Category; Overseas: the current partner agency and its code", () => {
        let view = render(<div className="invd"><ContractSetupFacts worker={ { ...LOCAL, reference_id: "LPF902190", nationality_info: { name: "Filipino" } } } categoryName="Local Transfer" /></div>);
        expect([...view.container.querySelectorAll(".kv")].map((kv) => kv.textContent)).toEqual(["Worker CodeLPF902190", "Worker TypeLocal", "NationalityFilipino", "Contract CategoryLocal Transfer"]);
        view.unmount();
        view = render(<div className="invd"><ContractSetupFacts worker={ { ...OVERSEAS, reference_id: "BGS000417-A", nationality_name: "Filipino" } } categoryName="Overseas" partner={ { id: 101, code: "BGS", name: "BGS Manpower Services" } } /></div>);
        expect([...view.container.querySelectorAll(".kv")].map((kv) => kv.textContent)).toEqual(["Worker CodeBGS000417-A", "Worker TypeOverseas", "NationalityFilipino", "Partner AgencyBGS Manpower Services BGS"]);
    });
});

describe("useContractPricing", () => {
    it("asks on every input change and never before there is one; a 4xx keeps the server's words, anything else none; Retry asks again for the same input", async () => {
        priceContractInvoiceAPI.mockImplementation(() => answer({ ok: true }));
        const { result, rerender } = renderHook(({ input }) => useContractPricing(input), { initialProps: { input: null } });
        expect(result.current.status).toBe("idle");
        expect(priceContractInvoiceAPI).not.toHaveBeenCalled();
        await act(async () => { rerender({ input: { worker_id: 1, route: "local" } }); });
        expect([result.current.status, result.current.result]).toEqual(["ready", { ok: true }]);
        priceContractInvoiceAPI.mockImplementationOnce(() => Promise.reject({ response: { status: 500, data: { message: "connect ECONNREFUSED" } } }));
        await act(async () => { rerender({ input: { worker_id: 1, route: "local_transfer" } }); });
        expect([result.current.status, result.current.error]).toEqual(["error", ""]);
        priceContractInvoiceAPI.mockImplementationOnce(() => Promise.reject({ response: { status: 404, data: { message: "This invoice is not available." } } }));
        await act(async () => { result.current.retry(); });
        expect([result.current.status, result.current.error]).toEqual(["error", "This invoice is not available."]);
        expect(priceContractInvoiceAPI).toHaveBeenCalledTimes(3);
        expect(priceContractInvoiceAPI).toHaveBeenLastCalledWith({ worker_id: 1, route: "local_transfer" });
    });
});
