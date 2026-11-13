/* eslint-env jest */
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FormProvider, useForm } from "react-hook-form";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
/* one stable dispatch: the tab's lookup effects depend on it, a fresh function per render would re-run them forever */
const mockDispatch = () => Promise.resolve({ payload: { data: [] } });
jest.mock("react-redux", () => ({
    useSelector: (sel) => sel({ users: { permissionList: { data: [] } } }),
    useDispatch: () => mockDispatch,
}));
jest.mock("react-select", () => ({ __esModule: true, default: () => null }));
jest.mock("../../Views/Pages/SettingsPage/newui/users/permissions/UserPermissionsEditor", () => ({ __esModule: true, default: () => require("react").createElement("div", null, "permissions editor") }));
jest.mock("../../Views/Pages/SettingsPage/newui/users/useUserForm", () => {
    const { useForm: useFormMock } = require("react-hook-form");
    return {
        __esModule: true,
        default: function useUserFormMock({ permissionsOnly } = {}) {
            const methods = useFormMock();
            return {
                methods, id: "31", isEdit: true, permissionsOnly: Boolean(permissionsOnly), isLoading: false, isSaving: false,
                activeKey: "user-permission", tabIndex: 3, isLastTab: true,
                selectTab: () => {}, goToPrev: () => {}, goToNext: () => {}, onSubmit: () => {}, onCancel: () => {},
                userStatus: true, toggleUserStatus: () => {}, mfaEnabled: false, toggleMfa: () => {}, currentUser: null, mappingIds: [],
                loadOnce: (key, fetch) => fetch(), perm: { engine: {}, rows: [], bindingOf: () => null }, audience: "internal",
                permDraft: {}, permSaved: {}, permissionsDirty: false, permissionDiffs: [], setPermDraft: () => {}, discardPermissions: () => {},
                applyCopiedGrants: () => {}, loadUserGrants: () => Promise.resolve(null), requestSubmit: () => {}, reviewOpen: false,
                confirmReview: () => {}, closeReview: () => {},
            };
        },
    };
});
jest.mock("../../Views/Pages/SettingsPage/newui/users/tabs/UserPermissionsTab", () => ({ __esModule: true, default: (props) => require("react").createElement("div", null, `tab scope=${ String(props.showScope) } editor=${ String(props.showEditor) }`) })); // eslint-disable-line react/prop-types

import UserFormPage from "../../Views/Pages/SettingsPage/newui/users/UserFormPage";
import { userPermissionsPath } from "../../Views/Pages/SettingsPage/newui/settingsNewUiConstants";
import routes from "../../Views/Pages/routes/routesConfig";
import settingsRoutes from "../../Views/Pages/routes/settingsRoutes";

const UserPermissionsTab = jest.requireActual("../../Views/Pages/SettingsPage/newui/users/tabs/UserPermissionsTab").default;

const Host = ({ children, staffType = "internal" }) => { // eslint-disable-line react/prop-types
    const methods = useForm({ defaultValues: { staff_type: staffType, first_name: "Ada", last_name: "Lovelace", manager_id: "" } });
    return <FormProvider { ...methods }>{ children }</FormProvider>;
};
const tabProps = { loadOnce: (key, fetch) => Promise.resolve(fetch()), perm: { engine: {}, rows: [], bindingOf: () => null }, audience: "internal", permDraft: {}, permSaved: {}, onChangeDraft: () => {}, onApplyCopy: () => {}, loadUserGrants: () => Promise.resolve(null) };

describe("U-0358 — User Type is read-only after creation", () => {
    test("Edit: the Internal / Partner radios are disabled; Add: enabled", () => {
        const { unmount } = render(<Host><UserPermissionsTab { ...tabProps } isEdit showEditor={ false } /></Host>);
        screen.getAllByRole("radio").forEach((radio) => expect(radio).toBeDisabled());
        expect(screen.getByText("key_read_only")).toBeInTheDocument();
        unmount();
        render(<Host><UserPermissionsTab { ...tabProps } isEdit={ false } showEditor={ false } /></Host>);
        screen.getAllByRole("radio").forEach((radio) => expect(radio).not.toBeDisabled());
    });
});

describe("U-0357 — the Permissions editor is its own page", () => {
    test("wizard tab 4 carries the account scope only; the page carries identity + editor only", () => {
        const { unmount } = render(<Host><UserPermissionsTab { ...tabProps } isEdit showScope showEditor={ false } /></Host>);
        expect(screen.getByText("key_assignment_details")).toBeInTheDocument();
        expect(screen.queryByText("permissions editor")).toBeNull();
        unmount();
        render(<Host><UserPermissionsTab { ...tabProps } isEdit showScope={ false } showEditor /></Host>);
        expect(screen.queryByText("key_assignment_details")).toBeNull();
        expect(screen.getByText("permissions editor")).toBeInTheDocument();
        const identity = document.querySelector("[data-mc-user-identity]");
        expect(identity).toHaveTextContent("Ada Lovelace");
        expect(identity).toHaveTextContent("key_user_type: key_internal");
        expect(identity.querySelector("input")).toBeNull();   /* read-only */
    });
    test("the page: Settings → People → Users → Permissions breadcrumb, no step strip, Cancel + Save only", async () => {
        render(<MemoryRouter initialEntries={ ["/settings/user-permissions?id=31"] }><UserFormPage permissionsOnly /></MemoryRouter>);
        const crumbs = screen.getByRole("navigation", { name: "key_settings" });
        expect(crumbs).toHaveTextContent("key_settings");
        expect(crumbs).toHaveTextContent("key_people");
        expect(crumbs).toHaveTextContent("key_users");
        expect(crumbs).toHaveTextContent(/key_permissions/i);   /* the current crumb is the title-cased page title */
        expect(screen.queryByRole("tablist")).toBeNull();
        expect(screen.queryByText(/key_next/)).toBeNull();
        expect(screen.queryByText(/key_back/)).toBeNull();
        expect(await screen.findByText("tab scope=false editor=true")).toBeInTheDocument();   /* the tab is lazy-loaded */
        expect(screen.getByText("key_save")).toBeInTheDocument();
    });
    test("the wizard still renders the step strip and tab 4 as scope only", async () => {
        render(<MemoryRouter initialEntries={ ["/settings/add-user?id=31"] }><UserFormPage /></MemoryRouter>);
        expect(screen.getByRole("tablist")).toBeInTheDocument();
        expect(await screen.findByText("tab scope=true editor=false")).toBeInTheDocument();
    });
    test("the route and the Users-list deep link", () => {
        expect(userPermissionsPath(31)).toBe(`/${ routes.userPermissions }?id=31`);
        const entry = settingsRoutes.find((route) => route.path === routes.userPermissions);
        expect(entry).toMatchObject({ moduleKey: "users", permissionKey: "edit_user" });
    });
});
