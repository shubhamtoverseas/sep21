/* eslint-env jest */
import React from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* Standalone Invoice · the worker party's details (restored 30 Oct 2026 at the owner's request: "same screen as the old
   worker field"). After Select Worker, and from the worker card's Edit, the old Standalone form: Given names, Surname,
   Mobile, HKID, Date of birth, Passport, read from the worker and saved through the contract API's save-worker before the
   worker is the invoice's party; Cancel, Back (when reached from the search) and Next. Its subtitle names the Standalone
   Invoice. */

jest.mock("../../services/workers", () => ({ ...jest.requireActual("../../services/workers"), getWorkerAllStateInfo: jest.fn(), updateContractWorker: jest.fn() }));
jest.mock("../../services/commonApi", () => ({ ...jest.requireActual("../../services/commonApi"), getCountries: jest.fn(), getNationalities: jest.fn(), getContractStatus: jest.fn() }));
jest.mock("../../services/contracts", () => ({ ...jest.requireActual("../../services/contracts"), getContractCategory: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
/* the contact block (mobile with its verification) is the shared form's; here it only shows it is asked for the mobile */
jest.mock("../../Views/Pages/Invoice/add-contract-invoice/EntityContactDetailsForm", () => (props) => <div data-testid="contact" data-action={ props.actionType } />);
/* eslint-disable import/first */
import { getWorkerAllStateInfo, updateContractWorker } from "../../services/workers";
import { getContractStatus, getCountries, getNationalities } from "../../services/commonApi";
import { getContractCategory } from "../../services/contracts";
import { ShowToast } from "../../components/show-toast/ShowToast";
import worker from "../../redux/Slices/worker/WorkerSlice";
import countries from "../../redux/Slices/common/countries/CountriesSlice";
import nationalities from "../../redux/Slices/common/nationalities/NationalitiesSlice";
import common from "../../redux/Slices/common/CommonSlice";
import contracts from "../../redux/Slices/contract/ContractSlice";
import StandaloneWorkerDetails from "../../Views/Pages/Invoice/general/AddWorkerDetailsOfInvoice";
/* eslint-enable import/first */

jest.setTimeout(20000);
/* the footer actions (the header also has an icon Back, as on the old screen) */
const footer = () => [...document.querySelectorAll(".tk-foot button")].map((b) => b.textContent.trim());

beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

const WORKER = {
    id: 56, user_id: 900, type: 2, name: "Candy", surname: "Jues", country_code: "853", mobile_number: "54284354",
    hk_id: "A123456(3)", date_of_birth: "2002-10-23", passport_number: "P000522", nationality: { id: 71 },
};
const empty = () => Promise.resolve({ data: { status: true, data: [] } });
beforeEach(() => {
    [getCountries, getNationalities, getContractStatus, getContractCategory].forEach((read) => read.mockImplementation(empty));
    getWorkerAllStateInfo.mockImplementation(() => Promise.resolve({ data: { status: true, data: WORKER } }));
    updateContractWorker.mockImplementation(() => Promise.resolve({ data: { status: true, message: "Worker updated" } }));
});

const mount = (props = {}) => {
    const store = configureStore({ reducer: { worker, countries, nationalities, common, contracts }, middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }) });
    const handlers = { onClose: jest.fn(), onBack: jest.fn(), onDone: jest.fn(), ...props };
    render(<Provider store={ store }><StandaloneWorkerDetails workerId={ 56 } { ...handlers } /></Provider>);
    return handlers;
};

it("the old Standalone worker screen: its six fields from the worker, the mobile block, the Standalone subtitle; Cancel, Back and Next", async () => {
    mount();
    expect(await screen.findByDisplayValue("Candy", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(getWorkerAllStateInfo).toHaveBeenCalledWith({ worker_id: 56, type: "basic" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(en.key_worker_details);
    expect(screen.getByText("Review and confirm the worker details for this Standalone Invoice.")).toBeInTheDocument();
    expect(screen.queryByText(/Contract Invoice/)).toBeNull();
    const labels = [...document.querySelectorAll(".ne-form label")].map((l) => l.textContent.replace("*", "").trim());
    expect(labels).toEqual([en.key_given_names, en.key_surname, en.key_hkid, en.key_date_of_birth, en.key_passport]);
    expect(screen.getByTestId("contact")).toHaveAttribute("data-action", "mobile");
    expect(screen.getByDisplayValue("Jues")).toBeInTheDocument();
    expect(screen.getByDisplayValue("P000522")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(en.key_enter_passport)).toBeInTheDocument();
    // the Contract Invoice form's sections are not on this screen
    for (const absent of [en.key_contract_status, en.key_contract_category, en.key_nationality, en.key_maiden_surname]) expect(screen.queryByText(absent)).toBeNull();
    expect(footer()).toEqual([en.key_cancel, en.key_back, en.key_next]);
});

it("Next saves the details through the contract API's save-worker and hands the worker, as saved, to the setup", async () => {
    const { onDone } = mount();
    const passport = await screen.findByDisplayValue("P000522", {}, { timeout: 5000 });
    fireEvent.change(passport, { target: { value: "P000999" } });
    fireEvent.click([...document.querySelectorAll(".tk-foot button")].find((b) => b.textContent.trim() === en.key_next));
    await waitFor(() => expect(onDone).toHaveBeenCalled(), { timeout: 5000 });
    expect(updateContractWorker).toHaveBeenCalledWith(expect.objectContaining({
        worker_id: 56, user_id: 900, name: "Candy", surname: "Jues", country_code: "853", mobile_number: "54284354", hk_id: "A1234563", passport_number: "P000999",
    }));
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ id: 56, name: "Candy", surname: "Jues", passport_number: "P000999" }));
});

/* Next waits for the save: until save-worker answers, the circle spinner (CustomSpinner inline) replaces "Next" and the
   button takes no second click; the answer, saved or refused, gives the button back */
const nextButton = () => document.querySelector('.tk-foot button[type="submit"]');
const pendingSave = () => {
    const save = {};
    updateContractWorker.mockImplementation(() => new Promise((resolve, reject) => { save.resolve = resolve; save.reject = reject; }));
    return save;
};

it("while save-worker is on its way: the spinner replaces Next, one click only; saved: the spinner goes, the worker is handed on", async () => {
    const save = pendingSave();
    const { onDone } = mount();
    await screen.findByDisplayValue("Candy", {}, { timeout: 5000 });
    fireEvent.click(nextButton());
    await waitFor(() => expect(updateContractWorker).toHaveBeenCalledTimes(1), { timeout: 5000 });
    expect(nextButton()).toBeDisabled();
    expect(nextButton().querySelector(".nu-spinner--inline")).not.toBeNull();
    expect(nextButton()).not.toHaveTextContent(en.key_next);
    fireEvent.click(nextButton());
    expect(updateContractWorker).toHaveBeenCalledTimes(1);
    save.resolve({ data: { status: true, message: "Worker updated" } });
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(nextButton().querySelector(".nu-spinner--inline")).toBeNull();
    expect(nextButton()).toHaveTextContent(en.key_next);
});

it("save-worker refused: the spinner goes, the message shows and Next can be pressed again", async () => {
    const save = pendingSave();
    const { onDone } = mount();
    await screen.findByDisplayValue("Candy", {}, { timeout: 5000 });
    fireEvent.click(nextButton());
    await waitFor(() => expect(updateContractWorker).toHaveBeenCalledTimes(1), { timeout: 5000 });
    save.reject({ response: { data: { message: "Worker not saved" } } });
    await waitFor(() => expect(ShowToast).toHaveBeenCalledWith("error", "Worker not saved"));
    expect(onDone).not.toHaveBeenCalled();
    expect(nextButton().querySelector(".nu-spinner--inline")).toBeNull();
    expect(nextButton()).not.toBeDisabled();
    expect(nextButton()).toHaveTextContent(en.key_next);
});

it("from the worker card (no picker behind it): Cancel only, no Back; Cancel closes without saving", async () => {
    const { onClose } = mount({ onBack: undefined });
    await screen.findByDisplayValue("Candy", {}, { timeout: 5000 });
    expect(footer()).toEqual([en.key_cancel, en.key_next]);
    fireEvent.click([...document.querySelectorAll(".tk-foot button")].find((b) => b.textContent.trim() === en.key_cancel));
    expect(onClose).toHaveBeenCalled();
    expect(updateContractWorker).not.toHaveBeenCalled();
});
