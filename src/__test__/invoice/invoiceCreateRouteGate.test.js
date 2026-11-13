/* eslint-env jest */
// QA-27-019 (ruling 10): the creation screens open only with a create key, as the server checks it.
import React from "react";
import fs from "fs";
import path from "path";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";

jest.mock("../../services/commonService", () => ({
    ...jest.requireActual("../../services/commonService"),
    isAdminUser: jest.fn(),
    getPermissionValue: jest.fn(),
}));
import { getPermissionValue, isAdminUser } from "../../services/commonService";
import { withInvoiceCreateGate } from "../../Views/Pages/Invoice/InvoiceRecordGate";

const KEYS = ["key_a", "key_b"];
const Gated = withInvoiceCreateGate(() => <div>the screen</div>, KEYS);
const show = () => render(
    <Provider store={ configureStore({ reducer: { users: () => ({ permissionList: { data: [] } }) } }) }>
        <MemoryRouter initialEntries={ ["/create"] }>
            <Routes>
                <Route path="/create" element={ <Gated /> } />
                <Route path="/dashboard" element={ <div>the dashboard</div> } />
            </Routes>
        </MemoryRouter>
    </Provider>,
);

describe("invoice create route gate", () => {
    test.each([
        [false, [], "the dashboard"],
        [false, ["key_b"], "the screen"],
        [true, [], "the screen"],
    ])("admin %s, holds %j: %s", (admin, held, expected) => {
        isAdminUser.mockReturnValue(admin);
        getPermissionValue.mockImplementation((_list, _module, key) => (held.includes(key) ? "y" : "n"));
        show();
        expect(screen.getByText(expected)).toBeTruthy();
    });

    test("the three Contract and three Standalone stages use the keys the server checks", () => {
        const src = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/routes/invoiceRoutes.js"), "utf8");
        expect(src).toMatch(/CONTRACT_CREATE_KEYS = \["contract_invoice_add_from_invoice_global", "contract_invoice_add_from_contract_global"\]/);
        expect(src).toMatch(/STANDALONE_CREATE_KEYS = \["general_invoice_add_from_contract_global"\]/);
        expect((src.match(/, CONTRACT_CREATE_KEYS\);/g) || []).length).toBe(3);
        expect((src.match(/, STANDALONE_CREATE_KEYS\);/g) || []).length).toBe(3);
    });
});
