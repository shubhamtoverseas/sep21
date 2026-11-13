/* eslint-env jest */
import React from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { act, render, screen } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* Contract Invoice · Contract setup · the "Invoice" card (27 Oct package, INV-C2, OP-27-43): Invoice Date, Branch and CS
   Owner are the header's own controls, rendered into the setup screen's third card; every other screen (Exchange) keeps
   them in the header strip. No screen shows a draft reference (QA-27 rulings 8, QA-27-038). */

jest.mock("../../services/branches", () => ({ getActiveBranches: jest.fn(() => new Promise(() => {})) }));
/* eslint-disable import/first */
import branches from "../../redux/Slices/settings/branches/BranchesSlice";
import cs from "../../redux/Slices/common/cs/CsSlice";
import invoices from "../../redux/Slices/invoices/InvoicesSlice";
import CommonPageHeaderInvoice from "../../Views/Pages/Invoice/add-contract-invoice/CommonPageHeaderInvoice";
/* eslint-enable import/first */

beforeAll(async () => {
    await i18n.use(initReactI18next).init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

const store = () => configureStore({
    reducer: { branches, cs, invoices },
    preloadedState: { branches: { ...branches(undefined, { type: "@init" }), currentActiveBranches: [{ id: 2, branch_name: "Central" }] } },
});
const cellLabels = (root) => [...root.querySelectorAll(".cs-metastrip .cell .k")].map((k) => k.textContent);

it("in the card: the three controls in the setup screen's Invoice card, none in the header", async () => {
    const card = document.createElement("div");
    document.body.appendChild(card);
    let view;
    await act(async () => {
        view = render(<Provider store={ store() }><CommonPageHeaderInvoice title="New Contract Invoice" onUpdateContractForm={ jest.fn() } inCard cardTarget={ card } /></Provider>);
    });
    expect(cellLabels(card)).toEqual([en.key_invoice_date, en.key_branch, en.key_handling_staff_cs_owner]);
    expect(view.container.querySelector(".cs-metastrip")).toBeNull();
    // R-P1, QA-27 ruling 8: no reference before the first submission
    expect(screen.queryByText(/draft ref/i)).toBeNull();
    expect(card.querySelector("select[name=branch_id]")).not.toBeNull();
    // before the card is on the page nothing is drawn, and the values are kept
    view.unmount();
    await act(async () => {
        view = render(<Provider store={ store() }><CommonPageHeaderInvoice title="New Contract Invoice" onUpdateContractForm={ jest.fn() } inCard cardTarget={ null } /></Provider>);
    });
    expect(document.querySelectorAll(".cs-metastrip")).toHaveLength(0);
    card.remove();
});

it("elsewhere (Exchange): the header strip, with no draft reference", async () => {
    let view;
    await act(async () => {
        view = render(<Provider store={ store() }><CommonPageHeaderInvoice title="New Exchange Invoice" onUpdateContractForm={ jest.fn() } /></Provider>);
    });
    expect(cellLabels(view.container)).toEqual([en.key_invoice_date, en.key_branch, en.key_handling_staff_cs_owner]);
    expect(screen.queryByText(/draft (invoice )?ref/i)).toBeNull();
});
