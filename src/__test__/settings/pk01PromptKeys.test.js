/* eslint-env jest */
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";

/* R-SET-1 (owner 5 Nov 2026: "Prompt screens on view_prompt_manager / edit_prompt_manager"): the Prompt Manager list opens on
   View Prompt Manager, a new or edited template on Edit Prompt Manager; the Settings → Configuration link follows the list's
   key (it was admin only) and the list offers New, the active toggle, edit and delete only with Edit. The prompt server (the
   AI copywriter service) receives no user identity today, so the server half is reported as blocking, not built here. */

let mockUser = { data: { id: 30, role: { id: 999 }, staff: { staff_type: "internal" } } };
let mockModules = [];
jest.mock("../../utils/storage", () => ({ getStoredUser: () => mockUser }));
jest.mock("../../redux/store", () => ({ store: { getState: () => ({ users: { permissionList: { data: mockModules } } }) } }));
jest.mock("../../utils/translation", () => ({ __esModule: true, default: (key) => key, translation: (key) => key }));
jest.mock("../../Views/Pages/SettingsPage/newui/prompt-manager/usePromptManagerList", () => () => ({
    rows: [{ id: 3, name: "Job offer copy", is_active: 1 }], isLoading: false, sort: { sort: "name", order: "ASC" }, pageInfo: null,
    lastUpdate: null, deletingId: null, handleToggleStatus: () => {}, requestDelete: () => {}, sortTable: () => {},
    handlePrevClick: () => {}, handleNextClick: () => {}, handlePerPageChange: () => {}, handleRefresh: () => {},
}));
/* eslint-disable import/first */
import settingsRoutes from "../../Views/Pages/routes/settingsRoutes";
import routes from "../../Views/Pages/routes/routesConfig/index";
import { configurationLinksConfig } from "../../components/ReusableComponents/app-configs";
import { getConfigurationPermissions } from "../../utils/permissions/configurationPermissionUtils";
import PromptManagerList from "../../Views/Pages/SettingsPage/newui/prompt-manager/PromptManagerList";
/* eslint-enable import/first */

const configuration = (keys) => [{ module: "configuration", category: keys.map((id) => ({ id, selected_value: "y" })) }];
const route = (path) => settingsRoutes.find((r) => r.path === path);
const renderList = () => {
    const store = configureStore({ reducer: { users: () => ({ permissionList: { data: mockModules } }) } });
    return render(<Provider store={ store }><MemoryRouter><PromptManagerList /></MemoryRouter></Provider>);
};

describe("R-SET-1 · Prompt Manager keys", () => {
    beforeEach(() => { mockModules = []; });

    test("the list route opens on view_prompt_manager, the template route on edit_prompt_manager", () => {
        expect([route(routes.promptManager).moduleKey, route(routes.promptManager).permissionKey]).toEqual(["configuration", "view_prompt_manager"]);
        expect([route(routes.newPromptTemplate).moduleKey, route(routes.newPromptTemplate).permissionKey]).toEqual(["configuration", "edit_prompt_manager"]);
    });

    test("the Settings → Configuration link shows for a holder of View Prompt Manager", () => {
        const link = () => configurationLinksConfig(getConfigurationPermissions({ data: mockModules })).find((l) => l.link === "prompt-manager");
        expect(link().isPermitted).toBe(false);
        mockModules = configuration(["view_prompt_manager"]);
        expect(link().isPermitted).toBe(true);
    });

    test("with View only the list shows no New, toggle, edit or delete; with Edit it does", () => {
        mockModules = configuration(["view_prompt_manager"]);
        const { unmount } = renderList();
        screen.getByText("Job offer copy");
        expect(screen.queryByText("key_new_prompt")).toBeNull();
        expect(screen.queryByLabelText("key_edit_icon")).toBeNull();
        expect(screen.queryByLabelText("key_delete_icon")).toBeNull();
        unmount();
        mockModules = configuration(["view_prompt_manager", "edit_prompt_manager"]);
        renderList();
        screen.getByText("key_new_prompt");
        expect(screen.getByLabelText("key_edit_icon")).toBeTruthy();
        expect(screen.getByLabelText("key_delete_icon")).toBeTruthy();
    });
});
