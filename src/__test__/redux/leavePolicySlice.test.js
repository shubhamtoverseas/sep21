/* eslint-env jest */
import { configureStore } from "@reduxjs/toolkit";
import LeavePolicySlice, * as leavePolicyExports from "../../redux/Slices/settings/leavePolicy/LeavePolicySlice";

/* Settings optimisation M-1: the dead leave-type list thunks are gone; the list the Leave policy screen and the
   Users form Salary tab read is mapped exactly as before. */
const makeStore = () => configureStore({ reducer: { leavePolicy: LeavePolicySlice } });

/* one leave-master/list response, as the API sends it (strings echoed for page/limit) */
const listResponse = {
    current_page: "1",
    limit: "10",
    total_count: 2,
    total_pages: 1,
    last_updated: "2026-08-05 18:24:18",
    data: [
        { id: 10, leave_policy_name: "medical", status: 1, employees_count: 1, leave_policy_count: 2, annual_total_sum: 13, updated_by_name: null, created_by_name: "Admin User", created_on: "5 Aug 26", updated_on: "1 Jan 70" },
        { id: 2, leave_policy_name: "general", status: 1, employees_count: 3, leave_policy_count: 4, annual_total_sum: 50, updated_by_name: "Admin User", created_by_name: "Admin User", created_on: "1 Jul 26", updated_on: "2 Jul 26" },
    ],
};

describe("leave policy slice", () => {
    it("only exports the thunks the screens use", () => {
        expect(leavePolicyExports.fetchLeavePolicies).toBeUndefined();
        expect(leavePolicyExports.fetchDetailLeavePolicies).toBeUndefined();
        ["fetchLeavePolicyMaster", "fetchLeaveMasterView", "addLeavePolicy", "addMasterLeavePolicy", "updateLeavePolicy", "updateMasterLeavePolicy"]
            .forEach((name) => expect(typeof leavePolicyExports[name]).toBe("function"));
    });

    it("maps a leave-master list response into the id map, order and paging the list and the Salary tab read", () => {
        const store = makeStore();
        store.dispatch({ type: leavePolicyExports.fetchLeavePolicyMaster.fulfilled.type, payload: listResponse });
        const state = store.getState().leavePolicy;
        expect(state.leavePolicyMasterOrder).toEqual([10, 2]);
        expect(state.leavePolicyMaster).toEqual({ 10: listResponse.data[0], 2: listResponse.data[1] });
        expect(state.currentPage).toBe("1");
        expect(state.totalPages).toBe(1);
        expect(state.totalLeavePolicy).toBe(2);
        expect(state.lastUpdated).toBe("2026-08-05 18:24:18");
        expect(state.status).toBe("succeeded");
    });

    it("an answer without data empties the list but keeps the paging totals (unchanged behaviour)", () => {
        const store = makeStore();
        store.dispatch({ type: leavePolicyExports.fetchLeavePolicyMaster.fulfilled.type, payload: listResponse });
        store.dispatch({ type: leavePolicyExports.fetchLeavePolicyMaster.fulfilled.type, payload: { error: "Unknown column" } });
        const state = store.getState().leavePolicy;
        expect(state.leavePolicyMaster).toEqual({});
        expect(state.leavePolicyMasterOrder).toEqual([]);
        expect(state.totalLeavePolicy).toBe(2);
    });
});
