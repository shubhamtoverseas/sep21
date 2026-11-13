/* eslint-env jest */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import useTaskTemplateManager from "../../Views/Pages/SettingsPage/newui/task-templates/useTaskTemplateManager";

/* S-1 (settings audit 9 Nov; spec TASK_TEMPLATE_MANAGER_API_SPEC §46/62): the list rows KEEP notes_en / notes_zh —
   dropping them opened every Edit with empty notes and the save then erased stored notes with nulls. */
jest.mock("../../services/calendar", () => ({
    getCalendarTaskTemplatesAPI: () => Promise.resolve({ data: { data: [
        { id: 7, code: "TT-7", version: 3, title_en: "Collect HKID", title_zh: "領取身份證", notes_en: "Bring the receipt", notes_zh: "帶收據", status: "active", is_standard: 0 },
    ] } }),
    saveCalendarTaskTemplateAPI: () => Promise.resolve({ data: { status: true, data: { id: 7 } } }),
    retireCalendarTaskTemplateAPI: () => Promise.resolve({ data: { status: true } }),
}));

const Probe = () => {
    const { rows } = useTaskTemplateManager();
    return <div data-testid="row">{rows.map((r) => `${r.title_en}|${r.notes_en ?? "MISSING"}|${r.notes_zh ?? "MISSING"}`).join(";")}</div>;
};

test("task template rows carry their notes into the editor", async () => {
    render(<Probe />);
    await waitFor(() => expect(screen.getByTestId("row").textContent).toContain("Collect HKID"));
    expect(screen.getByTestId("row").textContent).toBe("Collect HKID|Bring the receipt|帶收據");
});
