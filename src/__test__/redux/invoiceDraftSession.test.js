/* eslint-env jest */
import { configureStore } from "@reduxjs/toolkit";
import EmployerSlice, { setInvoiceCurrentEmployer, setInvoiceLocalInfo, clearCurrentEmployer, clearInvoiceLocalInfo } from "../../redux/Slices/employer/EmployerSlice";
import WorkerSlice, { setInvoiceCurrentWorker, clearWorkerDetail } from "../../redux/Slices/worker/WorkerSlice";
import InvoicesSlice, { setInvoiceContractItemsList, clearInvoiceContractItemsList } from "../../redux/Slices/invoices/InvoicesSlice";
import { INVOICE_DRAFT_STORAGE_KEY, hydrateInvoiceDraft, invoiceDraftMiddleware } from "../../redux/invoiceDraftSession";

/* the same slices and the same middleware as redux/store.js, without redux-persist */
const makeStore = () => configureStore({
    reducer: { employer: EmployerSlice, worker: WorkerSlice, invoices: InvoicesSlice },
    middleware: (getDefault) => getDefault({ serializableCheck: false }).concat(invoiceDraftMiddleware),
});

const stored = () => JSON.parse(sessionStorage.getItem(INVOICE_DRAFT_STORAGE_KEY));

describe("invoice draft session mirror", () => {
    beforeEach(() => sessionStorage.clear());

    it("writes the draft fields to sessionStorage as they change", () => {
        const store = makeStore();
        store.dispatch(setInvoiceCurrentWorker({ id: 7, name: "Liza" }));
        store.dispatch(setInvoiceCurrentEmployer({ employer_id: 272, name: "Test Emp" }));
        store.dispatch(setInvoiceLocalInfo({ branchId: "3", csId: "9", invoice_date: "2026-10-19", contract_type_internal: "new" }));
        store.dispatch(setInvoiceContractItemsList({ items: [{ amount: 1000 }] }));
        expect(stored()).toEqual({
            worker: { id: 7, name: "Liza" },
            employer: { employer_id: 272, name: "Test Emp" },
            localInfo: { branchId: "3", csId: "9", invoice_date: "2026-10-19", contract_type_internal: "new" },
            contractItems: { items: [{ amount: 1000 }] },
        });
    });

    it("removes the key once the flow clears the slices (Cancel / create success)", () => {
        const store = makeStore();
        store.dispatch(setInvoiceCurrentWorker({ id: 7 }));
        store.dispatch(setInvoiceCurrentEmployer({ employer_id: 272 }));
        store.dispatch(setInvoiceLocalInfo({ branchId: "3" }));
        store.dispatch(setInvoiceContractItemsList({ items: [1] }));
        expect(sessionStorage.getItem(INVOICE_DRAFT_STORAGE_KEY)).not.toBeNull();
        store.dispatch(clearCurrentEmployer());
        store.dispatch(clearWorkerDetail());
        store.dispatch(clearInvoiceLocalInfo());
        store.dispatch(clearInvoiceContractItemsList());
        expect(sessionStorage.getItem(INVOICE_DRAFT_STORAGE_KEY)).toBeNull();
    });

    it("puts a stored draft back into a fresh store (refresh)", () => {
        sessionStorage.setItem(INVOICE_DRAFT_STORAGE_KEY, JSON.stringify({
            worker: { id: 7, name: "Liza" }, employer: { employer_id: 272 }, localInfo: { branchId: "3", csId: "9" }, contractItems: { items: [{ amount: 1000 }] },
        }));
        const store = makeStore();
        hydrateInvoiceDraft(store);
        const state = store.getState();
        expect(state.worker.currentInvoiceWorkerDetail).toEqual({ id: 7, name: "Liza" });
        expect(state.employer.currentInvoiceEmployerDetail).toEqual({ employer_id: 272 });
        expect(state.employer.currentInvoiceLocalInfo).toEqual({ branchId: "3", csId: "9" });
        expect(state.invoices.invoiceContractItemsList).toEqual({ items: [{ amount: 1000 }] });
    });

    it("ignores a corrupt or empty stored value", () => {
        sessionStorage.setItem(INVOICE_DRAFT_STORAGE_KEY, "{not json");
        const store = makeStore();
        expect(() => hydrateInvoiceDraft(store)).not.toThrow();
        expect(store.getState().worker.currentInvoiceWorkerDetail ?? null).toBeNull();
    });

    it("drops the draft on logout", () => {
        const store = makeStore();
        store.dispatch(setInvoiceCurrentWorker({ id: 7 }));
        expect(sessionStorage.getItem(INVOICE_DRAFT_STORAGE_KEY)).not.toBeNull();
        store.dispatch({ type: "auth/logout/fulfilled" });
        expect(sessionStorage.getItem(INVOICE_DRAFT_STORAGE_KEY)).toBeNull();
    });
});
