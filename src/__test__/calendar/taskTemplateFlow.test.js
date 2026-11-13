/* eslint-env jest */
jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../services/calendar", () => ({
    getCalendarTaskTemplatesAPI: jest.fn(),
    saveCalendarTaskTemplateAPI: jest.fn(),
    retireCalendarTaskTemplateAPI: jest.fn(),
}));

import { saveTaskTemplateFlow } from "../../Views/Pages/SettingsPage/newui/task-templates/useTaskTemplateManager";
import { retireCalendarTaskTemplateAPI, saveCalendarTaskTemplateAPI } from "../../services/calendar";
import { ShowToast } from "../../components/show-toast/ShowToast";

const rows = [{ id: 1, title_en: "Call employer", title_zh: "致電僱主" }, { id: 2, title_en: "Chase documents", title_zh: "" }];

describe("U-0260 — the one library save flow (manager page and task editor)", () => {
    test("a duplicate title in either language is refused before any request", async () => {
        await expect(saveTaskTemplateFlow({}, rows, { title_en: "  call EMPLOYER ", title_zh: "" })).rejects.toThrow("key_set_task_template_duplicate");
        await expect(saveTaskTemplateFlow({}, rows, { title_en: "", title_zh: "致電僱主" })).rejects.toThrow("key_set_task_template_duplicate");
        expect(saveCalendarTaskTemplateAPI).not.toHaveBeenCalled();
    });
    test("a new title saves (trimmed, empty → null) and toasts created", async () => {
        saveCalendarTaskTemplateAPI.mockResolvedValue({ data: { status: true, data: { id: 9 } } });
        await saveTaskTemplateFlow({}, rows, { title_en: " Visit flat ", title_zh: "", notes_en: "", notes_zh: " bring forms " });
        expect(saveCalendarTaskTemplateAPI).toHaveBeenCalledWith({ title_en: "Visit flat", title_zh: null, notes_en: null, notes_zh: "bring forms" });
        expect(retireCalendarTaskTemplateAPI).not.toHaveBeenCalled();
        expect(ShowToast).toHaveBeenCalledWith("success", "key_set_task_template_created");
    });
    test("an edit that keeps the same title is not a duplicate of itself and writes a new version", async () => {
        saveCalendarTaskTemplateAPI.mockResolvedValue({ data: { status: true, data: { id: 1 } } });
        await saveTaskTemplateFlow({ id: 1, status: "active" }, rows, { title_en: "Call employer", title_zh: "致電僱主", notes_en: "Ask for the HKID", retired: false });
        expect(saveCalendarTaskTemplateAPI).toHaveBeenCalledWith({ id: 1, title_en: "Call employer", title_zh: "致電僱主", notes_en: "Ask for the HKID", notes_zh: null });
        expect(ShowToast).toHaveBeenCalledWith("success", "key_set_task_template_updated");
    });
    test("a 403 rejects with the no-permission text; a server message is passed through", async () => {
        saveCalendarTaskTemplateAPI.mockRejectedValue({ response: { status: 403 } });
        await expect(saveTaskTemplateFlow({}, rows, { title_en: "New", title_zh: "" })).rejects.toThrow("key_set_task_template_no_permission");
        saveCalendarTaskTemplateAPI.mockResolvedValue({ data: { status: false, message: "Title already exists" } });
        await expect(saveTaskTemplateFlow({}, rows, { title_en: "New", title_zh: "" })).rejects.toThrow("Title already exists");
    });
});
