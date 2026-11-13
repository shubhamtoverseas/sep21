/* eslint-env jest */
import React from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
jest.mock("react-redux", () => ({ useSelector: (sel) => sel({ users: { permissionList: { data: [] } } }), useDispatch: () => jest.fn() }));
jest.mock("../../services/permissionService", () => ({ isAdminUser: () => true, isPartnerUser: () => false }));
const mockRefresh = jest.fn();
jest.mock("../../Views/Pages/Calendar/newui/useTaskTemplates", () => ({
    __esModule: true,
    default: () => ({ templates: [{ id: 1, code: "T1", version: 2, en: "Call employer", zh: "", notesEn: "", notesZh: "", hasNotes: false }], isLoading: false, refresh: mockRefresh }),
}));
jest.mock("../../Views/Pages/SettingsPage/newui/task-templates/useTaskTemplateManager", () => ({
    __esModule: true,
    default: jest.fn(),
    saveTaskTemplateFlow: jest.fn(),
}));

import useCalendarState from "../../Views/Pages/Calendar/newui/useCalendarState";
import { CAL_VIEWS } from "../../Views/Pages/Calendar/newui/calendarConstants";
import { todayHK } from "../../Views/Pages/Calendar/newui/calendarTime";
import TaskEditorModal from "../../Views/Pages/Calendar/newui/TaskEditorModal";
import { saveTaskTemplateFlow } from "../../Views/Pages/SettingsPage/newui/task-templates/useTaskTemplateManager";

const hookOn = (query) => renderHook(() => useCalendarState(), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={ [`/calendar${ query }`] }>{ children }</MemoryRouter>, // eslint-disable-line react/prop-types
});

describe("U-0009 — Today sets the current Hong Kong date and opens Day view", () => {
    test("from Week", () => {
        const { result } = hookOn("?view=week&date=2026-01-05");
        expect(result.current.view).toBe(CAL_VIEWS.WEEK);
        act(() => result.current.goToday());
        expect(result.current.view).toBe(CAL_VIEWS.DAY);
        expect(result.current.date).toBe(todayHK());
        expect(result.current.days).toEqual([todayHK()]);
    });
    test("from Agenda", () => {
        const { result } = hookOn("?view=agenda&date=2026-01-05");
        act(() => result.current.goToday());
        expect(result.current.view).toBe(CAL_VIEWS.DAY);
    });
});

describe("U-0260 — Create/edit template opens the Task Template Manager's own form over the editor", () => {
    test("no in-editor library panel; the manager form opens prefilled with the typed title, Save refreshes the choices and keeps the draft", async () => {
        saveTaskTemplateFlow.mockResolvedValue();
        render(<TaskEditorModal onClose={ () => {} } />);
        const titleInput = document.querySelector("#cal-te-title") || screen.getAllByRole("textbox")[0];
        fireEvent.change(titleInput, { target: { value: "Chase documents" } });
        fireEvent.click(screen.getByText("key_cal_task_manage_template"));
        expect(document.getElementById("cal-te-lib")).toBeNull();
        await waitFor(() => expect(document.getElementById("task-template-en")).not.toBeNull());
        expect(document.getElementById("task-template-en")).toHaveValue("Chase documents");
        fireEvent.submit(document.getElementById("task-template-form"));
        await waitFor(() => expect(saveTaskTemplateFlow).toHaveBeenCalledTimes(1));
        const [editing, rows, values] = saveTaskTemplateFlow.mock.calls[0];
        expect(editing).toEqual({ title_en: "Chase documents" });
        expect(rows).toEqual([{ id: 1, title_en: "Call employer", title_zh: "" }]);
        expect(values).toMatchObject({ title_en: "Chase documents", retired: false });
        await waitFor(() => expect(document.getElementById("task-template-form")).toBeNull());
        expect(mockRefresh).toHaveBeenCalledTimes(1);
        /* the task draft survived the library round trip and nothing was saved on the task */
        expect(titleInput).toHaveValue("Chase documents");
    });
    test("the exact matching preset opens as an edit of that template", async () => {
        saveTaskTemplateFlow.mockResolvedValue();
        render(<TaskEditorModal onClose={ () => {} } />);
        const titleInput = document.querySelector("#cal-te-title") || screen.getAllByRole("textbox")[0];
        fireEvent.change(titleInput, { target: { value: "call employer" } });
        fireEvent.click(screen.getByText("key_cal_task_manage_template"));
        await waitFor(() => expect(document.getElementById("task-template-en")).not.toBeNull());
        expect(document.getElementById("task-template-en")).toHaveValue("Call employer");
        fireEvent.submit(document.getElementById("task-template-form"));
        await waitFor(() => expect(saveTaskTemplateFlow).toHaveBeenCalledTimes(1));
        expect(saveTaskTemplateFlow.mock.calls[0][0]).toMatchObject({ id: 1, title_en: "Call employer", status: "active" });
    });
});

describe("handoff 29 Oct §K · Week stays selectable while a task is open", () => {
    test("?task=8 arrives on Agenda; Week then shows the week grid with the task still open; a fresh task link still opens Agenda", () => {
        const { result } = hookOn("?date=2026-10-01&task=8");
        expect(result.current.view).toBe(CAL_VIEWS.AGENDA);
        act(() => result.current.setView(CAL_VIEWS.WEEK));
        expect(result.current.view).toBe(CAL_VIEWS.WEEK);
        expect(result.current.task).toBe("8");
        act(() => result.current.setView(CAL_VIEWS.DAY));
        expect(result.current.view).toBe(CAL_VIEWS.DAY);
        act(() => result.current.setView(CAL_VIEWS.AGENDA));
        expect(result.current.view).toBe(CAL_VIEWS.AGENDA);
        /* without a task, Week is still the unwritten default */
        const plain = hookOn("?date=2026-10-01");
        expect(plain.result.current.view).toBe(CAL_VIEWS.WEEK);
    });
});
