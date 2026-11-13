/* eslint-env jest */
import React from "react";
import PropTypes from "prop-types";
import { act, renderHook, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import useUserForm from "../../Views/Pages/SettingsPage/newui/users/useUserForm";

/* Settings optimisation M-Users U-FE-02 / U-FE-03: picker lookups load once per wizard open (a failed one retries), and
   the permission template is fetched once per staff type: edit waits for the loaded user (no template for the default
   type first), a type chosen again reuses its template as a fresh copy, and a late answer for a type no longer
   selected is dropped. */
const mockCalls = [];
const mockPending = {};
const mockReply = (name, payload) => new Promise((resolve) => {
    mockPending[name] = () => resolve({ payload });
});
jest.mock("../../redux/Slices/settings/users/UsersSlice", () => ({
    addUser: () => () => Promise.resolve({}),
    updateUser: () => () => Promise.resolve({}),
    savePermissions: () => () => Promise.resolve({}),
    fetchUserById: (args) => () => {
        mockCalls.push(`detail ${args.staff_id}`);
        return Promise.resolve({ payload: { data: { id: 31, staff_type: "internal", manager_id: 745, first_name: "A", prepared_groups: null, ready_groups: null } } });
    },
    fetchPermissionSpecificUser: (args) => () => {
        mockCalls.push(`own ${args.staff_id}`);
        return Promise.resolve({ payload: { data: [{ module: "own", staff: args.staff_id }] } });
    },
}));
jest.mock("../../redux/Slices/settings/user-permissions/UserPermissionSlice", () => ({
    fetchPermissionsWithoutStaff: (args) => () => {
        mockCalls.push(`blank ${args.staff_type}`);
        return mockPending.manual ? mockReply(`blank ${args.staff_type}`, { data: [{ module: `blank-${args.staff_type}` }] })
            : Promise.resolve({ payload: { data: [{ module: `blank-${args.staff_type}` }] } });
    },
}));
/* ownership option lists of internal staff (languages, branches, nationalities): not under test, answered empty */
jest.mock("../../redux/Slices/common/CommonSlice", () => ({ fetchLanguageList: () => () => Promise.resolve({ payload: [] }) }));
jest.mock("../../redux/Slices/settings/branches/BranchesSlice", () => ({ fetchActiveBranches: () => () => Promise.resolve({ payload: [] }) }));
jest.mock("../../redux/Slices/common/nationalities/NationalitiesSlice", () => ({ fetchWorkerNationalities: () => () => Promise.resolve({ payload: [] }) }));

const store = configureStore({ reducer: { users: (state = { permissionList: null }) => state } });   /* the hook reads the actor's permission list (History gate) */
const wrap = (url) => {
    const Wrapper = ({ children }) => <Provider store={store}><MemoryRouter initialEntries={[url]}>{children}</MemoryRouter></Provider>;
    Wrapper.propTypes = { children: PropTypes.node };
    return Wrapper;
};

describe("Add / Edit User lookups", () => {
    beforeEach(() => { mockCalls.length = 0; Object.keys(mockPending).forEach((k) => delete mockPending[k]); });

    it("loadOnce fetches a lookup once per wizard open and retries one that failed", async () => {
        const { result } = renderHook(() => useUserForm(), { wrapper: wrap("/settings/add-user") });
        const ok = jest.fn(() => Promise.resolve({ payload: [1] }));
        const first = await act(() => result.current.loadOnce("countries", ok));
        const again = await act(() => result.current.loadOnce("countries", ok));
        expect(ok).toHaveBeenCalledTimes(1);
        expect(again).toBe(first);
        const failing = jest.fn(() => Promise.resolve({ error: { message: "x" } }));
        await act(() => result.current.loadOnce("roles", failing));
        await act(() => result.current.loadOnce("roles", failing));
        expect(failing).toHaveBeenCalledTimes(2);
    });

    it("edit fetches the user's own permissions only, after the user has loaded", async () => {
        const { result } = renderHook(() => useUserForm(), { wrapper: wrap("/settings/add-user?id=31") });
        await waitFor(() => expect(result.current.permTemplate).toEqual({ data: [{ module: "own", staff: "31" }] }));
        expect(mockCalls).toEqual(["detail 31", "own 31"]);
    });

    it("create fetches each staff type's template once and hands it out as a fresh copy", async () => {
        const { result } = renderHook(() => useUserForm(), { wrapper: wrap("/settings/add-user") });
        await waitFor(() => expect(result.current.permTemplate).toEqual({ data: [{ module: "blank-partner" }] }));
        const firstPartner = result.current.permTemplate;
        act(() => { result.current.methods.setValue("staff_type", "internal"); });
        await waitFor(() => expect(result.current.permTemplate).toEqual({ data: [{ module: "blank-internal" }] }));
        act(() => { result.current.methods.setValue("staff_type", "partner"); });
        await waitFor(() => expect(result.current.permTemplate).toEqual({ data: [{ module: "blank-partner" }] }));
        expect(result.current.permTemplate).not.toBe(firstPartner);
        expect(mockCalls).toEqual(["blank partner", "blank internal"]);
    });

    it("drops a late template for a staff type that is no longer selected", async () => {
        mockPending.manual = true;
        const { result } = renderHook(() => useUserForm(), { wrapper: wrap("/settings/add-user") });
        await waitFor(() => expect(mockPending["blank partner"]).toBeDefined());
        act(() => { result.current.methods.setValue("staff_type", "internal"); });
        await waitFor(() => expect(mockPending["blank internal"]).toBeDefined());
        await act(async () => { mockPending["blank internal"](); });
        await waitFor(() => expect(result.current.permTemplate).toEqual({ data: [{ module: "blank-internal" }] }));
        await act(async () => { mockPending["blank partner"](); });
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 20)); });
        expect(result.current.permTemplate).toEqual({ data: [{ module: "blank-internal" }] });
    });
});
