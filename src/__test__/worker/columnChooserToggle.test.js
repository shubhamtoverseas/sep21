/* eslint-env jest */
import React, { useCallback, useMemo, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

import ColumnsChooser from "../../components/ui/ColumnsChooser";
import { chosenWorkerCols, tableColsFor, toggleWorkerCol, workerColumnLabels, workerColumnsStateKey, WORKER_MANDATORY_COLS } from "../../Views/Pages/WorkerPage/dashboard/workerDashboardConfig";

/* WorkerDashboard's local helpers, copied verbatim */
const loadViewState = (key) => {
    try {
        const parsed = JSON.parse(localStorage.getItem(key));
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch { return null; }
};
const saveViewState = (key, state) => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) { void e; }
};

/* exact copy of WorkerDashboard's chooser wiring (colKeys memo + handleToggleColumn) for the pipe_local view —
   reproduces Mubin/user 6 Nov "clicking a column does nothing" end to end */
const tableKey = "pipe_local";
const Harness = () => {
    const [chosenCols, setChosenCols] = useState({});
    const colKeys = useMemo(() => {
        if (chosenCols[tableKey]) return chosenCols[tableKey];
        return chosenWorkerCols(tableKey, loadViewState(workerColumnsStateKey(tableKey))?.columns);
    }, [chosenCols]);
    const handleToggleColumn = useCallback((key) => {
        const next = toggleWorkerCol(tableKey, colKeys, key);
        setChosenCols((prev) => ({ ...prev, [tableKey]: next }));
        saveViewState(workerColumnsStateKey(tableKey), { columns: next });
    }, [colKeys]);
    return <ColumnsChooser order={ tableColsFor(tableKey) } mandatory={ WORKER_MANDATORY_COLS } selected={ colKeys } labels={ workerColumnLabels() } label="key_ins_columns" title="key_ins_select_fields" onToggle={ handleToggleColumn } />;
};

describe("Worker column chooser toggles on the pipeline Local view", () => {
    test("clicking Delay unticks it and the count drops; clicking again restores it", () => {
        render(<Harness />);
        fireEvent.click(screen.getByRole("button", { name: /key_ins_columns/ }));
        const count = () => screen.getByRole("button", { name: /key_ins_columns/ }).textContent;
        expect(count()).toContain("11");
        const delay = document.querySelector("[data-mc-column='delay']");
        expect(delay.getAttribute("aria-pressed")).toBe("true");
        fireEvent.click(delay);
        expect(document.querySelector("[data-mc-column='delay']").getAttribute("aria-pressed")).toBe("false");
        expect(count()).toContain("10");
        fireEvent.click(document.querySelector("[data-mc-column='delay']"));
        expect(document.querySelector("[data-mc-column='delay']").getAttribute("aria-pressed")).toBe("true");
    });
});
