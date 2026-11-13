/* Owner, 12 Nov 2026 (Remarks diagnosis, step 3): a user who may read Insurance remarks but not write them (no
   insurance_remarks, e.g. user 1 by ruling Q-02) sees one line in place of the composer saying so; the list stays readable
   and the panel is never blank. An addition to Insurance.html, whose remarks.js shows nothing there (OPEN_QUESTIONS P9-R1).
   Fails before the change: no such line. */
import React, { Suspense } from "react";
import i18n from "i18next";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";
import zh from "../../../public/locales/zh_HK/translation.json";

jest.mock("../../services/remarks", () => ({ getInsuranceRemarks: jest.fn(), getInvoiceRemarks: jest.fn(), addEditInsuranceRemarks: jest.fn(), removeInsuranceRemarks: jest.fn() }));
jest.mock("../../services/commonService", () => ({
    ...jest.requireActual("../../services/commonService"),
    getCurrentUser: () => ({ data: { id: 1 } }),
}));

/* eslint-disable import/first */
import remarksReducer from "../../redux/Slices/remarks/RemarkSlice";
import InsuranceRemarks from "../../Views/Pages/insurance/record/InsuranceRemarks";
/* eslint-enable import/first */

const LINE = "You can read remarks but do not have permission to add them.";
const record = { id: 11, ref: "IN-CBO000011" };
const other = { id: 7, remarks: "Employer asked for the policy copy", remarks_by: 8, remarks_by_name: "Ann Lee", created_at: new Date().toISOString(), version: 0, deleted: false,
    history: [{ id: 70, operation: "Added", actorId: 8, actorName: "Ann Lee", at: new Date().toISOString(), old: null, new: "Employer asked for the policy copy" }] };
const wrap = (ui) => render(
    <MemoryRouter>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <Provider store={configureStore({ reducer: { remarks: remarksReducer, users: (s = { permissionList: { data: [] } }) => s } })}>
                <Suspense fallback={null}>{ui}</Suspense>
            </Provider>
        </QueryClientProvider>
    </MemoryRouter>,
);

describe("Insurance remarks: read but not write", () => {
    beforeAll(async () => {
        await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
    });

    test("the line stands in place of the composer and the list stays readable", async () => {
        const { container } = wrap(<InsuranceRemarks record={record} remarks={[other]} canWrite={false} onChanged={() => {}} />);
        expect((await screen.findAllByText("Employer asked for the policy copy")).length).toBeGreaterThan(0);
        expect(container.querySelector("[data-remark-text]").textContent).toBe("Employer asked for the policy copy");
        const line = container.querySelector("[data-remarks-read-only]");
        expect(line).toBeTruthy();
        expect(line.textContent).toBe(LINE);
        expect(container.querySelector("#ins-remark-draft")).toBeNull();
        expect(container.querySelector('[data-action="add-remark"]')).toBeNull();
        // the line comes first, where the composer would be
        expect(container.querySelector('[data-panel="remarks"]').firstElementChild).toBe(line);
    });

    test("with no remarks the panel still says why there is no composer, and says there are no remarks", async () => {
        const { container } = wrap(<InsuranceRemarks record={record} remarks={[]} canWrite={false} onChanged={() => {}} />);
        expect(container.querySelector("[data-remarks-read-only]")?.textContent).toBe(LINE);
        expect(screen.getByText(en.key_no_remarks_yet)).toBeTruthy();
    });

    test("a holder of Insurance Remarks gets the composer and no read-only line", () => {
        const { container } = wrap(<InsuranceRemarks record={record} remarks={[other]} canWrite onChanged={() => {}} />);
        expect(container.querySelector("#ins-remark-draft")).toBeTruthy();
        expect(container.querySelector("[data-remarks-read-only]")).toBeNull();
    });

    test("the wording is in en and zh_HK (zh_HK shows the English until reviewed)", () => {
        expect(en.key_ins_remarks_read_only).toBe(LINE);
        expect(zh.key_ins_remarks_read_only).toBe(LINE);
    });
});
