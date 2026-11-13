/* eslint-env jest */
import { configureStore } from "@reduxjs/toolkit";
import RolesSlice, * as rolesExports from "../../redux/Slices/settings/roles/RolesSlice";
import * as roleServices from "../../services/roles";
import { apiPath } from "../../services/apiPath";

/* Settings optimisation M-7: the dead delete chain (DELETE /settings/roles/delete, which the server does not have) is
   gone; the list, view, add and update state the Roles screens and the Users form read is mapped exactly as before. */
const makeStore = () => configureStore({ reducer: { roles: RolesSlice } });

/* one roles/list response, as the API sends it (no envelope; strings echoed for page/limit) */
const listResponse = {
    current_page: "1",
    limit: "10",
    total_count: 14,
    total_pages: 2,
    last_updated: "2026-09-19 17:02:11",
    data: [
        { id: 28, role_name: "test23", description: "", status: 1, number_of_employee: 0 },
        { id: 25, role_name: "QA tester", description: "", status: 1, number_of_employee: 2 },
    ],
};

describe("roles slice", () => {
    it("only exports the thunks the screens use", () => {
        expect(rolesExports.deleteRole).toBeUndefined();
        expect(roleServices.deleteRoleById).toBeUndefined();
        expect(apiPath.deleteRole).toBeUndefined();
        ["fetchRoles", "addRole", "fetchRoleById", "updateRole"].forEach((name) => expect(typeof rolesExports[name]).toBe("function"));
    });

    it("maps a roles list response into the id map, order and paging the list and the Users form read", () => {
        const store = makeStore();
        store.dispatch({ type: rolesExports.fetchRoles.fulfilled.type, payload: listResponse });
        const state = store.getState().roles;
        expect(state.rolesOrder).toEqual([28, 25]);
        expect(state.roles).toEqual({ 28: listResponse.data[0], 25: listResponse.data[1] });
        expect(state.currentPage).toBe("1");
        expect(state.totalPages).toBe(2);
        expect(state.totalRoles).toBe(14);
        expect(state.lastUpdated).toBe("2026-09-19 17:02:11");
        expect(state.status).toBe("succeeded");
    });

    it("view, add and update keep their state writes (unchanged behaviour)", () => {
        const store = makeStore();
        const role = { id: 29, role_name: "E2E role", description: "", status: 1, number_of_employee: 0 };
        store.dispatch({ type: rolesExports.fetchRoleById.fulfilled.type, payload: { data: role } });
        expect(store.getState().roles.currentRole).toEqual(role);
        store.dispatch({ type: rolesExports.addRole.fulfilled.type, payload: { message: "New role created successfully", data: role } });
        expect(store.getState().roles.roles[29]).toEqual([role]);
        const renamed = { ...role, role_name: "E2E role B" };
        store.dispatch({ type: rolesExports.updateRole.fulfilled.type, payload: { message: "Role updated successfully", data: renamed } });
        const state = store.getState().roles;
        expect(state.roles[29]).toEqual(renamed);
        expect(state.currentRole).toEqual(renamed);
        expect(state.message).toBe("Role updated successfully");
    });
});
