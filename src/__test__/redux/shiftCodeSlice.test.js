/* eslint-env jest */
import { configureStore } from "@reduxjs/toolkit";
import ShiftCodeSlice, * as shiftCodeExports from "../../redux/Slices/settings/shift-code/ShiftCodeSlice";
import * as shiftCodeServices from "../../services/shiftCodes";
import { apiPath } from "../../services/apiPath";

/* Settings optimisation M-4: the dead fetch-by-id chain (GET /settings/shift-codes/view/:id, which the server does
   not have) is gone; the list, roster viewer, edit and import state are mapped exactly as before. */
const makeStore = () => configureStore({ reducer: { shiftCodes: ShiftCodeSlice } });

/* one shift-codes/list `data` object, as the API sends it (strings echoed for page/limit) */
const listData = {
    current_page: "1",
    limit: "10",
    total_shift_code_list_count: 2,
    total_pages: 1,
    last_updated: "2026-06-27 21:32:55",
    data: [
        { id: 20, shift_code: "R2", shift_start_time: "03:15 PM", shift_end_time: "03:30 PM", duration: "0.25" },
        { id: 15, shift_code: "8 AM to 5 PM", shift_start_time: "08:00 AM", shift_end_time: "05:00 PM", duration: "9.00" },
    ],
};

describe("shift code slice", () => {
    it("only exports the thunks the screens use", () => {
        expect(shiftCodeExports.fetchShiftCodeById).toBeUndefined();
        expect(shiftCodeServices.getShiftCodeById).toBeUndefined();
        expect(apiPath.viewShiftCode).toBeUndefined();
        ["fetchShiftCodes", "fetchRosterView", "addShiftCode", "updateShiftCode", "importShiftCode"]
            .forEach((name) => expect(typeof shiftCodeExports[name]).toBe("function"));
    });

    it("maps a shift-codes list response into the id map, order and paging the list reads", () => {
        const store = makeStore();
        store.dispatch({ type: shiftCodeExports.fetchShiftCodes.fulfilled.type, payload: listData });
        const state = store.getState().shiftCodes;
        expect(state.shiftCodesOrder).toEqual([20, 15]);
        expect(state.shiftCodes).toEqual({ 20: listData.data[0], 15: listData.data[1] });
        expect(state.currentPage).toBe("1");
        expect(state.totalPages).toBe(1);
        expect(state.totalShiftCodes).toBe(2);
        expect(state.lastUpdated).toBe("2026-06-27 21:32:55");
        expect(state.shiftCodeStatus).toBe("succeeded");
    });

    it("maps a roster-view response into the roster viewer state", () => {
        const store = makeStore();
        const rows = [{ id: 2, user_id: 9, shift_code: "shift test3", username: "a@example.invalid", shift_date: "2026-04-15", shift_start_time: "06:30:00", shift_end_time: "09:15:00", status: 1, has_holiday: false }];
        store.dispatch({ type: shiftCodeExports.fetchRosterView.fulfilled.type, payload: { data: { current_page: 1, limit: 10, total_shift_count: 1, total_pages: 1, last_updated: "2026-06-01 15:17:03", data: rows } } });
        const state = store.getState().shiftCodes;
        expect(state.rosterViewData).toEqual(rows);
        expect(state.rosterViewCurrentPage).toBe(1);
        expect(state.rosterViewTotalShiftCodes).toBe(1);
        expect(state.rosterViewLastUpdated).toBe("2026-06-01 15:17:03");
    });

    it("an update still writes the row and the current shift code (unchanged behaviour)", () => {
        const store = makeStore();
        const row = { id: 20, shift_code: "R2b", shift_start_time: "3:15 PM", shift_end_time: "3:45 PM", duration: "0.5" };
        store.dispatch({ type: shiftCodeExports.updateShiftCode.fulfilled.type, payload: { message: "Shift code updated successfully", data: row } });
        const state = store.getState().shiftCodes;
        expect(state.shiftCodes[20]).toEqual(row);
        expect(state.currentShiftCode).toEqual(row);
        expect(state.message).toBe("Shift code updated successfully");
    });
});
