import React from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* Add Contract Invoice · the worker details popup opened after picking a worker: Next saves the worker, and until the API
   answers the button shows the circle spinner (CustomSpinner inline) and takes no second click. The answer, saved or
   refused, gives the button back. */

jest.mock("../../services/commonApi", () => ({
    getCountries: jest.fn(), getNationalities: jest.fn(), getContractStatus: jest.fn(), getTerminationReason: jest.fn(),
}));
jest.mock("../../services/workers", () => ({ getWorkerAllStateInfo: jest.fn(), updateWorkerDetails: jest.fn() }));
jest.mock("../../services/contracts", () => ({ getContractCategory: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
/* eslint-disable import/first */
import { getContractStatus, getCountries, getNationalities } from "../../services/commonApi";
import { getWorkerAllStateInfo, updateWorkerDetails } from "../../services/workers";
import { getContractCategory } from "../../services/contracts";
import { ShowToast } from "../../components/show-toast/ShowToast";
import worker from "../../redux/Slices/worker/WorkerSlice";
import common from "../../redux/Slices/common/CommonSlice";
import countries from "../../redux/Slices/common/countries/CountriesSlice";
import nationalities from "../../redux/Slices/common/nationalities/NationalitiesSlice";
import contracts from "../../redux/Slices/contract/ContractSlice";
import ContractWorkerForm from "../../Views/Pages/Invoice/add-contract-invoice/AddWorkerDetailsOfInvoice";
/* eslint-enable import/first */

beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

const answer = (data) => Promise.resolve({ data: { status: true, data } });
/* an Overseas worker with every required field, so Next is not held back by the form rules */
const WORKER = { id: 56, user_id: 156, type: 2, name: "Ana", surname: "Cruz", nationality: { id: 95 }, country_code: "+852", mobile_number: "91234567", contract_category: 1 };
let save;
beforeEach(() => {
    sessionStorage.setItem("user", JSON.stringify({ token: "t", data: { id: 9, role: { id: 1 } } }));
    for (const fn of [getCountries, getNationalities, getContractStatus]) fn.mockImplementation(() => answer([]));
    getWorkerAllStateInfo.mockImplementation(() => answer(WORKER));
    getContractCategory.mockImplementation(() => answer([{ id: 1, name_en: "Finished Contract" }]));
    save = {};
    updateWorkerDetails.mockImplementation(() => new Promise((resolve, reject) => { save.resolve = resolve; save.reject = reject; }));
});
afterEach(() => { jest.resetAllMocks(); sessionStorage.clear(); });

const mount = () => {
    const onDone = jest.fn();
    const store = configureStore({
        reducer: { worker, common, countries, nationalities, contracts, users: () => ({ permissionList: { data: [] } }) },
        middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
    });
    render(
        <Provider store={ store }>
            <MemoryRouter>
                <ContractWorkerForm asModal workerId={ 56 } onClose={ jest.fn() } onDone={ onDone } />
            </MemoryRouter>
        </Provider>
    );
    return { onDone };
};
const nextButton = () => document.querySelector('.tk-foot button[type="submit"]');
const clickNextWhenReady = async () => {
    await waitFor(() => expect(getContractCategory).toHaveBeenCalled());
    await waitFor(() => expect(nextButton()).not.toBeDisabled());
    fireEvent.click(nextButton());
    await waitFor(() => expect(updateWorkerDetails).toHaveBeenCalledTimes(1));
};

describe("worker details popup · Next waits for the save", () => {
    test("while the save is on its way: the spinner replaces Next and the button takes no second click", async () => {
        mount();
        await clickNextWhenReady();
        expect(nextButton()).toBeDisabled();
        expect(nextButton().querySelector(".nu-spinner--inline")).not.toBeNull();
        expect(nextButton()).not.toHaveTextContent("Next");
        fireEvent.click(nextButton());
        expect(updateWorkerDetails).toHaveBeenCalledTimes(1);
    });

    test("saved: the spinner goes, the worker is handed on once", async () => {
        const { onDone } = mount();
        await clickNextWhenReady();
        save.resolve({ data: { status: true, message: "Saved", data: [] } });
        await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
        expect(onDone.mock.calls[0][0]).toMatchObject({ id: 56, name: "Ana" });
        expect(nextButton().querySelector(".nu-spinner--inline")).toBeNull();
        expect(nextButton()).toHaveTextContent("Next");
    });

    test("refused: the spinner goes, the message shows and Next can be pressed again", async () => {
        const { onDone } = mount();
        await clickNextWhenReady();
        save.reject({ response: { data: { message: "Worker not saved" } } });
        await waitFor(() => expect(ShowToast).toHaveBeenCalledWith("error", "Worker not saved"));
        expect(onDone).not.toHaveBeenCalled();
        expect(nextButton().querySelector(".nu-spinner--inline")).toBeNull();
        expect(nextButton()).not.toBeDisabled();
        expect(nextButton()).toHaveTextContent("Next");
    });
});
