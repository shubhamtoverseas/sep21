/* eslint-env jest */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

import ColumnsChooser from "../../components/ui/ColumnsChooser";
import { chosenWorkerCols, tableColsFor, toggleWorkerCol, workerColumnLabels, workerColumnsStateKey, WORKER_COLUMNS_GRANT, WORKER_MANDATORY_COLS } from "../../Views/Pages/WorkerPage/dashboard/workerDashboardConfig";
import { COLUMN_VIEW_STATE_KEYS } from "../../components/ReusableComponents/constants";

describe("U-0336 (21 Oct catalogue) — Worker column chooser over the view's permitted columns", () => {
    test("the grant key and the per-view storage key", () => {
        expect(WORKER_COLUMNS_GRANT).toBe("worker_select_fields_to_display");
        expect(workerColumnsStateKey("hired")).toBe(`${ COLUMN_VIEW_STATE_KEYS.workers }:hired`);
        expect(WORKER_MANDATORY_COLS).toEqual(["worker", "worker_code", "status"]);
    });
    test("a remembered subset keeps the view's order, the mandatory columns and nothing outside the view", () => {
        expect(chosenWorkerCols("hired", undefined)).toEqual(tableColsFor("hired"));
        expect(chosenWorkerCols("hired", ["branch", "contract_date", "biodata", "bogus"])).toEqual(["worker", "worker_code", "status", "contract_date", "branch"]);
        expect(chosenWorkerCols("hired", [])).toEqual(["worker", "worker_code", "status"]);
    });
    test("toggle: a mandatory column never leaves; an unknown key is ignored; order follows the view", () => {
        const all = tableColsFor("hired");
        const without = toggleWorkerCol("hired", all, "cs");
        expect(without).not.toContain("cs");
        expect(toggleWorkerCol("hired", without, "cs")).toEqual(all);
        expect(toggleWorkerCol("hired", all, "worker_code")).toEqual(all);
        expect(toggleWorkerCol("hired", all, "biodata")).toEqual(all);
        expect(workerColumnLabels().worker_code).toBe("Worker Code");
    });
    test("the shared chooser lists the view's columns, locks the mandatory ones and reports a toggle", () => {
        const onToggle = jest.fn();
        render(<ColumnsChooser order={ ["worker", "worker_code", "status", "cs"] } mandatory={ WORKER_MANDATORY_COLS } selected={ ["worker", "worker_code", "status"] } labels={ workerColumnLabels() } label="key_ins_columns" title="key_ins_select_fields" onToggle={ onToggle } />);
        fireEvent.click(screen.getByRole("button", { name: /key_ins_columns/ }));
        expect(document.querySelector("[data-mc-column='worker_code']")).toBeDisabled();
        const cs = document.querySelector("[data-mc-column='cs']");
        expect(cs).not.toBeDisabled();
        expect(cs.getAttribute("aria-pressed")).toBe("false");
        fireEvent.click(cs);
        expect(onToggle).toHaveBeenCalledWith("cs");
    });
});
