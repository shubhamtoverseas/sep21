/* eslint-env jest */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UserFormPage from "../../Views/Pages/SettingsPage/newui/users/UserFormPage";

/* Settings optimisation M-Users U-FE-01 (BL-44): Next on step 3 must open step 4 without submitting the user form.
   In the browser the tab switch is committed before the click's default action runs; the mocked goToNext reproduces
   that order with flushSync. Since the permissions rebuild (CH 333) Save is a plain button too: it asks the wizard to
   review (requestSubmit) and the form's own submit never fires from the footer. */
const mockSubmit = jest.fn();
const mockState = { saving: false };
jest.mock("../../Views/Pages/SettingsPage/newui/users/useUserForm", () => {
    const mockReact = require("react");
    const { useForm } = require("react-hook-form");
    const { flushSync } = require("react-dom");
    const { USER_FORM_TABS } = require("../../Views/Pages/SettingsPage/newui/settingsNewUiConstants");
    return {
        __esModule: true,
        default: function useUserFormMock() {
            const [tabIndex, setTabIndex] = mockReact.useState(USER_FORM_TABS.length - 2);
            const methods = useForm();
            return {
                methods,
                id: "31",
                isEdit: true,
                isLoading: false,
                isSaving: mockState.saving,
                activeKey: USER_FORM_TABS[tabIndex].key,
                tabIndex,
                isLastTab: tabIndex === USER_FORM_TABS.length - 1,
                selectTab: () => {},
                goToPrev: () => setTabIndex((index) => index - 1),
                goToNext: () => flushSync(() => setTabIndex((index) => index + 1)),
                onSubmit: () => {},
                onCancel: () => {},
                userStatus: true,
                toggleUserStatus: () => {},
                mfaEnabled: false,
                toggleMfa: () => {},
                currentUser: null,
                mappingIds: [],
                loadOnce: (key, fetch) => fetch(),
                perm: { engine: {}, rows: [], bindingOf: () => null },
                audience: "internal",
                permDraft: {},
                permSaved: {},
                permissionsDirty: false,
                permissionDiffs: [],
                setPermDraft: () => {},
                discardPermissions: () => {},
                applyCopiedGrants: () => {},
                loadUserGrants: () => Promise.resolve(null),
                requestSubmit: (...args) => mockSubmit(...args),
                reviewOpen: false,
                confirmReview: () => {},
                closeReview: () => {},
            };
        },
    };
});
jest.mock("../../Views/Pages/SettingsPage/newui/users/tabs/UserBasicInfoTab", () => ({ __esModule: true, default: () => require("react").createElement("div", null, "basic tab") }));
jest.mock("../../Views/Pages/SettingsPage/newui/users/tabs/UserSalaryTab", () => ({ __esModule: true, default: () => require("react").createElement("div", null, "salary tab") }));
jest.mock("../../Views/Pages/SettingsPage/newui/users/tabs/UserSecurityTab", () => ({ __esModule: true, default: () => require("react").createElement("div", null, "security tab") }));
jest.mock("../../Views/Pages/SettingsPage/newui/users/tabs/UserPermissionsTab", () => ({ __esModule: true, default: () => require("react").createElement("div", null, "permission tab") }));

// translation() has no resources in Jest (labels render empty): the footer's primary action is its last button.
const primaryButton = () => { const buttons = screen.getAllByRole("button"); return buttons[buttons.length - 1]; };

describe("Add / Edit User footer", () => {
    beforeEach(() => { mockSubmit.mockClear(); mockState.saving = false; });

    it("Next on step 3 opens step 4 without submitting the form", async () => {
        render(<MemoryRouter><UserFormPage /></MemoryRouter>);
        await screen.findByText("security tab");
        expect(primaryButton().getAttribute("type")).toBe("button");
        await act(async () => { fireEvent.click(primaryButton()); });
        await screen.findByText("permission tab");
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
        expect(primaryButton().getAttribute("type")).toBe("button");
        expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("Save on step 4 asks the wizard to review and save", async () => {
        render(<MemoryRouter><UserFormPage /></MemoryRouter>);
        await screen.findByText("security tab");
        await act(async () => { fireEvent.click(primaryButton()); });
        await screen.findByText("permission tab");
        await act(async () => { fireEvent.click(primaryButton()); });
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
        expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    it("while saving: Save shows the loader and every footer button and tab is disabled", async () => {
        mockState.saving = true;
        render(<MemoryRouter><UserFormPage /></MemoryRouter>);
        await screen.findByText("security tab");
        await act(async () => { fireEvent.click(primaryButton()); });
        await screen.findByText("permission tab");
        const save = primaryButton();
        expect(save.getAttribute("type")).toBe("button");
        expect(save.getAttribute("aria-busy")).toBe("true");
        expect(save.querySelector('[role="status"]')).toBeTruthy();
        screen.getAllByRole("button").forEach((button) => expect(button.disabled).toBe(true));
        screen.getAllByRole("tab").forEach((tab) => expect(tab.disabled).toBe(true));
    });
});
