import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* P3 · the Invoice create flows (performance track A-16…A-18): the employer and worker forms read their lookups and their
   record once, an empty answer included; the employer and worker pickers read once typing pauses and only the latest answer
   lands; the setup step's eligibility answer is not read again on the next step (setup since INV-C2 and Invoice items since
   INV-C3 price with the engine; nothing reads the old base price for them). The old exchange items screen, with its fixed-item
   list, base price and promotion reads, is gone: an Exchange prices with the engine (INV-X3). */

jest.mock("../../services/commonApi", () => ({
    getCountries: jest.fn(), getNationalities: jest.fn(), getContractStatus: jest.fn(), getspokenLanguage: jest.fn(),
    getDistrictByCountryCode: jest.fn(), getWorkerProfileStatus: jest.fn(), getWorkerStatuses: jest.fn(),
}));
jest.mock("../../services/branches", () => ({ getActiveBranches: jest.fn() }));
jest.mock("../../services/employers", () => ({ getEmpEmployers: jest.fn(), getEmployerDetail: jest.fn() }));
jest.mock("../../services/workers", () => ({ getWorkers: jest.fn(), getWorkerAllStateInfo: jest.fn() }));
jest.mock("../../services/contracts", () => ({ getContractCategory: jest.fn() }));
jest.mock("../../services/invoices", () => ({
    validateContractAPI: jest.fn(), priceContractInvoiceAPI: jest.fn(), getPaymentMethodCatalogueAPI: jest.fn(() => new Promise(() => {})),
}));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
/* the contract-setup screen's other parts, as stand-ins that expose their callbacks */
jest.mock("../../Views/Pages/Invoice/add-contract-invoice/CommonPageHeaderInvoice", () => (props) => (
    <button type="button" onClick={ () => props.onUpdateContractForm({ branchId: 2, invoice_date: "2026-10-21", csId: 5, contract_type_internal: "new" }) }>fill-header</button>
));
jest.mock("../../Views/Pages/Invoice/add-contract-invoice/DetailsCardEmployer", () => () => null);
jest.mock("../../Views/Pages/Invoice/add-contract-invoice/DetailsCardWorker", () => (props) => (
    <button type="button" onClick={ props.onSelectClick }>open-worker-picker</button>
));
jest.mock("../../Views/Pages/Invoice/add-contract-invoice/SelectWorkerModal", () => (props) => (props.open
    ? <button type="button" onClick={ () => props.onSelect({ id: 56, name: "Ana" }) }>pick-worker-56</button> : null));
/* eslint-disable import/first */
import { getContractStatus, getCountries, getNationalities, getspokenLanguage, getDistrictByCountryCode, getWorkerProfileStatus } from "../../services/commonApi";
import { getActiveBranches } from "../../services/branches";
import { getEmpEmployers, getEmployerDetail } from "../../services/employers";
import { getWorkerAllStateInfo, getWorkers } from "../../services/workers";
import { getContractCategory } from "../../services/contracts";
import { priceContractInvoiceAPI, validateContractAPI } from "../../services/invoices";
import invoices from "../../redux/Slices/invoices/InvoicesSlice";
import employer, { setInvoiceCurrentEmployer } from "../../redux/Slices/employer/EmployerSlice";
import worker, { setInvoiceCurrentWorker } from "../../redux/Slices/worker/WorkerSlice";
import common from "../../redux/Slices/common/CommonSlice";
import countries from "../../redux/Slices/common/countries/CountriesSlice";
import nationalities from "../../redux/Slices/common/nationalities/NationalitiesSlice";
import branches from "../../redux/Slices/settings/branches/BranchesSlice";
import district from "../../redux/Slices/common/district/DistrictSlice";
import workerStatuses from "../../redux/Slices/common/workerStatuses/WorkerStatusesSlice";
import contracts from "../../redux/Slices/contract/ContractSlice";
import useLatestSearch from "../../Views/Pages/Invoice/useLatestSearch";
import SelectEmployerModal from "../../Views/Pages/Invoice/add-contract-invoice/SelectEmployerModal";
import SelectWorkerPage from "../../Views/Pages/Invoice/add-contract-invoice/SelectWorker";
import WorkerResultTable from "../../Views/Pages/Invoice/add-contract-invoice/WorkerResultTable";
import AddContractInvoice from "../../Views/Pages/Invoice/add-contract-invoice/AddContractInvoice";
import ContractEmployerForm from "../../Views/Pages/Invoice/add-contract-invoice/AddEmployerDetailsOfInvoice";
import ContractWorkerForm from "../../Views/Pages/Invoice/add-contract-invoice/AddWorkerDetailsOfInvoice";
/* eslint-enable import/first */

beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
const unhandled = [];
const onUnhandled = (reason) => unhandled.push(reason);
beforeEach(() => {
    sessionStorage.setItem("user", JSON.stringify({ token: "t", data: { id: 9, role: { id: 1 } } }));
    unhandled.length = 0;
    /* the setup step's Service card prices on every change (INV-C2); these tests do not wait for it */
    priceContractInvoiceAPI.mockImplementation(() => new Promise(() => {}));
    process.on("unhandledRejection", onUnhandled);
});
afterEach(() => { process.off("unhandledRejection", onUnhandled); jest.useRealTimers(); jest.resetAllMocks(); sessionStorage.clear(); });

const answer = (data) => Promise.resolve({ data: { status: true, data } });
const later = () => new Promise((r) => setTimeout(r, 40));
const makeStore = () => configureStore({
    reducer: {
        invoices, employer, worker, common, countries, nationalities, branches, district, workerStatuses, contracts,
        users: () => ({ permissionList: { data: [] } }),
    },
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
});
const mount = (element, { at = "/", routePath = "/", store = makeStore(), extra = null } = {}) => {
    const view = render(
        <Provider store={ store }>
            <MemoryRouter initialEntries={ [at] }>
                <Routes>
                    <Route path={ routePath } element={ element } />
                    { extra }
                </Routes>
            </MemoryRouter>
        </Provider>
    );
    return { store, ...view };
};

describe("A-16 · forms read their lookups and their record once", () => {
    it("contract employer form: the same", async () => {
        for (const fn of [getCountries, getActiveBranches, getNationalities, getspokenLanguage]) fn.mockImplementation(() => answer([]));
        getEmployerDetail.mockImplementation(() => answer({ employer_id: 2, name: "Lee" }));
        getDistrictByCountryCode.mockImplementation(() => answer([]));
        mount(<ContractEmployerForm />, { at: "/e/2", routePath: "/e/:employer_id" });
        await waitFor(() => expect(getEmployerDetail).toHaveBeenCalledTimes(1));
        await act(later);
        expect([getCountries, getActiveBranches, getNationalities, getspokenLanguage].map((fn) => fn.mock.calls.length)).toEqual([1, 1, 1, 1]);
        expect(getEmployerDetail).toHaveBeenCalledTimes(1);
    });

    it("contract worker form: lookups and the worker once; one /get-contract-status read fills both lists (A-18)", async () => {
        const statuses = [{ id: 1, admin_panel_status: "Finished" }];
        for (const fn of [getCountries, getNationalities]) fn.mockImplementation(() => answer([]));
        getContractStatus.mockImplementation(() => answer(statuses));
        getWorkerAllStateInfo.mockImplementation(() => answer({ id: 56, name: "Ana", type: 1, contract_status: 1 }));
        getContractCategory.mockImplementation(() => answer([]));
        const { store } = mount(<ContractWorkerForm />, { at: "/w/56", routePath: "/w/:worker_id" });
        await waitFor(() => expect(getWorkerAllStateInfo).toHaveBeenCalledTimes(1));
        await act(later);
        expect(getCountries).toHaveBeenCalledTimes(2); // worker_only and worker_home, once each
        expect(getNationalities).toHaveBeenCalledTimes(1);
        expect(getContractStatus).toHaveBeenCalledTimes(1);
        expect(getContractStatus).toHaveBeenCalledWith({ type: "worker" });
        expect(store.getState().common.contractStatus).toEqual(statuses);
        expect(store.getState().common.workerContractStatus).toEqual(statuses);
        expect(getWorkerAllStateInfo).toHaveBeenCalledTimes(1);
    });

    it("contract worker form: if that read fails, the second list is read on its own, as before", async () => {
        for (const fn of [getCountries, getNationalities]) fn.mockImplementation(() => answer([]));
        getContractStatus.mockImplementationOnce(() => Promise.reject({ response: { data: { message: "x" } } }))
            .mockImplementation(() => answer([{ id: 1, admin_panel_status: "Finished" }]));
        getWorkerAllStateInfo.mockImplementation(() => answer({ id: 56, type: 1 }));
        getContractCategory.mockImplementation(() => answer([]));
        const { store } = mount(<ContractWorkerForm />, { at: "/w/56", routePath: "/w/:worker_id" });
        await waitFor(() => expect(getWorkerAllStateInfo).toHaveBeenCalledTimes(1));
        expect(getContractStatus).toHaveBeenCalledTimes(2);
        expect(store.getState().common.workerContractStatus).toEqual([{ id: 1, admin_panel_status: "Finished" }]);
    });
});

describe("A-17 · picker searches", () => {
    const Probe = ({ make, onReady }) => {
        const api = useLatestSearch(make.dispatch, make.action);
        React.useEffect(() => { onReady(api); }, [api, onReady]);
        return null;
    };

    it("the search waits for typing to pause (300 ms), sends the last text, and aborts a read still in flight", () => {
        jest.useFakeTimers();
        const reads = [];
        const dispatch = jest.fn((action) => { const read = { action, abort: jest.fn() }; reads.push(read); return read; });
        let api;
        render(<Probe make={ { dispatch, action: (text) => ({ type: "search", text }) } } onReady={ (a) => { api = a; } } />);
        act(() => { api.search("L"); api.search("Le"); api.search("Lee"); });
        act(() => { jest.advanceTimersByTime(299); });
        expect(dispatch).not.toHaveBeenCalled();
        act(() => { jest.advanceTimersByTime(1); });
        expect(reads.map((r) => r.action.text)).toEqual(["Lee"]);
        act(() => { api.search("Leo"); jest.advanceTimersByTime(300); });
        expect(reads[0].abort).toHaveBeenCalledTimes(1);
        expect(reads[1].action.text).toBe("Leo");
    });

    it("a search still waiting is sent when the picker unmounts, so the last text is read", () => {
        jest.useFakeTimers();
        const dispatch = jest.fn(() => ({ abort: jest.fn() }));
        let api;
        const { unmount } = render(<Probe make={ { dispatch, action: (text) => ({ type: "search", text }) } } onReady={ (a) => { api = a; } } />);
        act(() => { api.search("Ann"); });
        unmount();
        expect(dispatch).toHaveBeenCalledWith({ type: "search", text: "Ann" });
    });

    it("contract employer picker (modal): one read per pause; the latest answer lands; a waiting search is sent on close", async () => {
        const rows = (name) => ({ data: { status: true, data: { data: { data: [{ employer_id: name.length, name }], current_page: 1, last_page: 1, total: 1 } } } });
        let slow;
        getEmpEmployers
            .mockImplementationOnce(() => Promise.resolve(rows("first")))           // the table's own first read
            .mockImplementationOnce(() => new Promise((r) => { slow = r; }))        // "Le": slower than the next one
            .mockImplementation((body) => Promise.resolve(rows(body.search_text)));
        const store = makeStore();
        const props = { open: true, onClose: jest.fn(), onSelect: jest.fn() };
        const { rerender } = mount(<SelectEmployerModal { ...props } />, { store });
        await waitFor(() => expect(getEmpEmployers).toHaveBeenCalledTimes(1));
        const box = screen.getByPlaceholderText(en.key_search_phone_email_hkid_name_code);
        fireEvent.change(box, { target: { value: "L" } });
        fireEvent.change(box, { target: { value: "Le" } });
        await act(() => new Promise((r) => setTimeout(r, 320)));
        expect(getEmpEmployers).toHaveBeenCalledTimes(2);
        expect(getEmpEmployers.mock.calls[1][0]).toEqual({ search_text: "Le", context: "list" });
        fireEvent.change(box, { target: { value: "Lee" } });
        await act(() => new Promise((r) => setTimeout(r, 320)));
        await waitFor(() => expect(store.getState().employer.employers).toEqual([{ employer_id: 3, name: "Lee" }]));
        await act(async () => { slow(rows("Le")); });
        expect(store.getState().employer.employers).toEqual([{ employer_id: 3, name: "Lee" }]);
        fireEvent.change(screen.getByPlaceholderText(en.key_search_phone_email_hkid_name_code), { target: { value: "Leon" } });
        rerender(<Provider store={ store }><MemoryRouter><Routes><Route path="/" element={ <SelectEmployerModal { ...props } open={ false } /> } /></Routes></MemoryRouter></Provider>);
        expect(getEmpEmployers.mock.calls.at(-1)[0]).toEqual({ search_text: "Leon", context: "list" });
        expect(unhandled).toEqual([]);
    });

    it("contract worker picker page: the table's paused read only — the page no longer reads on every keystroke", async () => {
        getWorkers.mockImplementation(() => answer([]));
        getNationalities.mockImplementation(() => answer([]));
        getWorkerProfileStatus.mockImplementation(() => answer([]));
        mount(<SelectWorkerPage />);
        await waitFor(() => expect(getWorkers).toHaveBeenCalledTimes(1)); // the table's first read
        const box = screen.getByPlaceholderText(en.key_phone_email_hkid_passport_english_name_worker_code);
        for (const value of ["A", "An", "Ana"]) fireEvent.change(box, { target: { value } });
        expect(getWorkers).toHaveBeenCalledTimes(1);
        await act(() => new Promise((r) => setTimeout(r, 450)));
        expect(getWorkers).toHaveBeenCalledTimes(2);
        expect(getWorkers.mock.calls[1][0]).toMatchObject({ search_text: "Ana", page: 1 });
    });

    it("worker results table: only the latest search lands; the aborted one raises no error", async () => {
        const list = (name) => ({ data: { status: true, data: [{ id: name.length, fullname: name }], current_page: 1, last_page: 1, total: 1 } });
        let slow;
        getWorkers.mockImplementationOnce(() => Promise.resolve(list("all")))
            .mockImplementationOnce(() => new Promise((r) => { slow = r; }))
            .mockImplementation((body) => Promise.resolve(list(body.search_text)));
        getNationalities.mockImplementation(() => answer([]));
        getWorkerProfileStatus.mockImplementation(() => answer([]));
        const store = makeStore();
        const { rerender } = mount(<WorkerResultTable searchQueryText="" handleSelectedCheckedRows={ jest.fn() } />, { store });
        await waitFor(() => expect(getWorkers).toHaveBeenCalledTimes(1));
        const again = (text) => rerender(<Provider store={ store }><MemoryRouter><Routes><Route path="/" element={ <WorkerResultTable searchQueryText={ text } handleSelectedCheckedRows={ jest.fn() } /> } /></Routes></MemoryRouter></Provider>);
        again("An");
        await act(() => new Promise((r) => setTimeout(r, 450)));
        again("Anna");
        await act(() => new Promise((r) => setTimeout(r, 450)));
        expect(await screen.findByText("Anna")).toBeTruthy();
        await act(async () => { slow(list("An")); });
        expect(screen.queryByText("An")).toBeNull();
        expect(screen.getByText("Anna")).toBeTruthy();
        expect(unhandled).toEqual([]);
    });
});

describe("A-18 · no second read of what the step before just read", () => {
    it("Continue does not check again the worker found eligible when it was picked on this screen", async () => {
        validateContractAPI.mockImplementation(() => Promise.resolve({ data: { status: 400, message: "eligible" } }));
        getWorkerAllStateInfo.mockImplementation(() => answer({ id: 56, type: 1 }));
        for (const fn of [getCountries, getNationalities, getContractStatus]) fn.mockImplementation(() => answer([{ id: 1 }]));
        getContractCategory.mockImplementation(() => answer([]));
        const store = makeStore();
        store.dispatch(setInvoiceCurrentEmployer({ employer_id: 2, name: "Lee" }));
        mount(<AddContractInvoice />, { store, at: "/s", routePath: "/s", extra: <Route path="/invoices/add-contract-invoice/form" element={ <div>pricing-step</div> } /> });
        fireEvent.click(await screen.findByText("open-worker-picker"));
        fireEvent.click(await screen.findByText("pick-worker-56"));
        await waitFor(() => expect(validateContractAPI).toHaveBeenCalledTimes(1));
        expect(validateContractAPI).toHaveBeenCalledWith({ worker_id: 56, employer_id: 2 });
        /* the worker form opens; its Next makes the worker the invoice's worker */
        act(() => { store.dispatch(setInvoiceCurrentWorker({ id: 56, name: "Ana" })); });
        fireEvent.click(screen.getByText("fill-header"));
        fireEvent.click(screen.getByText(en.key_continue_to_pricing_items || en.key_next));
        expect(await screen.findByText("pricing-step")).toBeTruthy();
        expect(validateContractAPI).toHaveBeenCalledTimes(1);
    });

    it("a worker that came another way is still checked on Continue", async () => {
        validateContractAPI.mockImplementation(() => Promise.resolve({ data: { status: 400 } }));
        const store = makeStore();
        store.dispatch(setInvoiceCurrentEmployer({ employer_id: 2, name: "Lee" }));
        store.dispatch(setInvoiceCurrentWorker({ id: 77, name: "Bea" }));
        mount(<AddContractInvoice />, { store, at: "/s", routePath: "/s", extra: <Route path="/invoices/add-contract-invoice/form" element={ <div>pricing-step</div> } /> });
        fireEvent.click(await screen.findByText("fill-header"));
        fireEvent.click(screen.getByText(en.key_continue_to_pricing_items || en.key_next));
        expect(await screen.findByText("pricing-step")).toBeTruthy();
        // OP-27-53: the employer and the route travel with the check (the Renewal exception is scoped to them)
        expect(validateContractAPI).toHaveBeenCalledWith({ worker_id: 77, employer_id: 2, route: "overseas" });
    });

    it("Contract Invoice creation no longer reads the old base price: setup (INV-C2) and Invoice items (INV-C3) price with the engine", () => {
        const dir = path.resolve(__dirname, "../../Views/Pages/Invoice/add-contract-invoice");
        expect(fs.existsSync(path.join(dir, "basePriceRead.js"))).toBe(false);
        expect(fs.existsSync(path.join(dir, "AddContractInvoiceForm.js"))).toBe(false);
        for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
            expect([file, /fetchInvoicesGetBasePrice|invoicesGetBasePrice|base-price/.test(fs.readFileSync(path.join(dir, file), "utf8"))]).toEqual([file, false]);
        }
    });

    it("the old exchange items screen and its own reads are gone (INV-X3): fixed-item list, base price, promotions by worker", () => {
        const services = fs.readFileSync(path.resolve(__dirname, "../../services/invoices.js"), "utf8");
        expect(services).not.toMatch(/getInvoicesFixedItemList|invoicesGetBasePrice|promotionListByWorker/);
        for (const gone of ["exchange/addContractInvoiceExchange.js", "add-contract-invoice/AdjustmentPopover.js", "add-contract-invoice/ItemTable.js"]) {
            expect([gone, fs.existsSync(path.resolve(__dirname, "../../Views/Pages/Invoice", gone))]).toEqual([gone, false]);
        }
    });
});
