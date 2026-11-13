import React, { Suspense } from "react";
import i18n from "i18next";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* PROMPT 7: Insurance remarks left the shared Remarks panel (components/remarks) for their own drawer, and lost their 24-hour
   window. The panel's other users keep their own rules, unchanged: Invoice and Employer remarks are edited or deleted by
   their author with the module's remark grant, or by a holder of the module's "update others' remarks" grant, with no time
   limit and no countdown; their body stays at 500 characters. This file passes on the code before PROMPT 7 and after it. */

const mockGranted = new Set();
jest.mock("../../services/remarks", () => ({ getInvoiceRemarks: jest.fn(), getEmployerRemarks: jest.fn() }));
jest.mock("../../services/commonService", () => ({
    ...jest.requireActual("../../services/commonService"),
    getCurrentUser: () => ({ data: { id: 5 } }),
    isAdminUser: () => false,
    hasAnyModulePermission: (list, keys) => (keys || []).some(([, key]) => mockGranted.has(key)),
}));
// eslint-disable-next-line import/first
import { getEmployerRemarks, getInvoiceRemarks } from "../../services/remarks";
// eslint-disable-next-line import/first
import remarksReducer from "../../redux/Slices/remarks/RemarkSlice";
// eslint-disable-next-line import/first
import Remarks from "../../components/remarks/Remarks";
// eslint-disable-next-line import/first
import AddRemarksPopup from "../../components/remarks/AddRemarksPopup";

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
beforeEach(() => mockGranted.clear());

const wrap = (ui) => render(
    <MemoryRouter>
        <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
            <Provider store={configureStore({ reducer: { remarks: remarksReducer, users: (s = { permissionList: { data: [] } }) => s } })}>
                <Suspense fallback={null}>{ui}</Suspense>
            </Provider>
        </QueryClientProvider>
    </MemoryRouter>,
);
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const remark = (by, text) => ({ id: by * 10, remarks: text, remarks_by: by, remarks_by_name: `User ${by}`, created_at: thirtyDaysAgo });
const panel = async (entityType, rows) => {
    const read = entityType === "invoice" ? getInvoiceRemarks : getEmployerRemarks;
    read.mockResolvedValue({ data: { status: true, data: rows } });
    const view = wrap(<Remarks entityType={entityType} entityId={1} isAddRemarksPopup={false} handleOnCloseAddRemarks={() => {}} />);
    await screen.findByText(rows[0].remarks);
    return view;
};
const actionsOn = (container, text) => {
    const block = [...container.querySelectorAll(".remarks-block")].find((b) => b.textContent.includes(text));
    return block ? block.querySelectorAll(".remark-act").length : -1;
};

describe.each([
    ["invoice", "invoice_remarks", null],
    ["employer", "employer_remarks", "employer_update_else_remarks"],
])("%s remarks keep their own rules on the shared panel", (entityType, ownKey, othersKey) => {
    it("the author with the module's remark grant edits and deletes a 30-day-old remark: no window, no countdown", async () => {
        mockGranted.add(ownKey);
        const { container } = await panel(entityType, [remark(5, "Mine, a month old")]);
        expect(actionsOn(container, "Mine, a month old")).toBe(2);
        expect(container.querySelector("[data-remark-window]")).toBeNull();
        expect(container.textContent).not.toMatch(/Editable for|Edit window closed/);
    });

    it("the author without the module's remark grant gets no Edit / Delete", async () => {
        const { container } = await panel(entityType, [remark(5, "Mine, no grant")]);
        expect(actionsOn(container, "Mine, no grant")).toBe(0);
    });

    it("another user's remark: no Edit / Delete with the own-remark grant alone", async () => {
        mockGranted.add(ownKey);
        const { container } = await panel(entityType, [remark(9, "Someone else's")]);
        expect(actionsOn(container, "Someone else's")).toBe(0);
    });

    if (othersKey) {
        it("another user's remark: Edit and Delete with the module's \"update others' remarks\" grant", async () => {
            mockGranted.add(othersKey);
            const { container } = await panel(entityType, [remark(9, "Someone else's, editable")]);
            expect(actionsOn(container, "Someone else's, editable")).toBe(2);
        });
    }

    it("the remark body stays at 500 characters", () => {
        const { container } = wrap(<AddRemarksPopup entityType={entityType} entityId={1} onClose={() => {}} />);
        expect(container.querySelector("textarea").getAttribute("maxlength")).toBe("500");
        expect(screen.getByText("0/500")).toBeTruthy();
    });
});
