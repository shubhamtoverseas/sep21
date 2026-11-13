import React, { Suspense } from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { MemoryRouter } from "react-router-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";

/* PROMPT 7 (Insurance.txt INS09; PM U-0080, U-0115; Insurance.html screens/remarks.js):
   1. The Remarks drawer body is remarks.js: composer for Insurance Remarks holders; every remark newest first with its
      version history (old, new and deleted text); a deleted remark stays as a tombstone; the author edits / deletes with no
      time limit, sending the version it opened; everyone else sees the author note; a retried add keeps its submission key.
   2. The Context card counts live remarks and previews the latest; with only deleted ones it says history is available.
   3. A follow-up launched from a request row returns to that request (Calendar source link → Requests tab, the row focused).
   4. The shared Remarks panel carries no Insurance code any more (its own rules: remarksSharedComponentRules.test.js). */

jest.mock("../../services/remarks", () => ({ addEditInsuranceRemarks: jest.fn(), removeInsuranceRemarks: jest.fn(), getInsuranceRemarks: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../services/commonService", () => ({
    ...jest.requireActual("../../services/commonService"),
    getCurrentUser: () => ({ data: { id: 5 } }),
}));
// eslint-disable-next-line import/first
import { addEditInsuranceRemarks, removeInsuranceRemarks } from "../../services/remarks";
// eslint-disable-next-line import/first
import { ShowToast } from "../../components/show-toast/ShowToast";
// eslint-disable-next-line import/first
import InsuranceRemarks, { REMARK_MAX_LENGTH, remarkLength } from "../../Views/Pages/insurance/record/InsuranceRemarks";
// eslint-disable-next-line import/first
import { liveRemarks, remarksPreview } from "../../Views/Pages/insurance/record/insuranceRecordRemarks";
// eslint-disable-next-line import/first
import { taskSourcePath } from "../../Views/Pages/Calendar/newui/calendarSourceLinks";
// eslint-disable-next-line import/first
import RecordRequestRow from "../../Views/Pages/insurance/record/RecordRequestRow";

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
beforeEach(() => jest.clearAllMocks());

const record = { id: 31, ref: "IN-HKH000001" };
const longAgo = "2026-09-01T02:00:00Z";
const v = (id, operation, old, nu, actorName = "Ann Lee", at = "2026-09-02T02:00:00Z") => ({ id, operation, actorId: 5, actorName, at, old, new: nu });
const mine = { id: 7, remarks: "Called the employer twice", remarks_by: 5, remarks_by_name: "Ann Lee", created_at: longAgo, version: 1, deleted: false,
    history: [v(100, "Added", null, "Called the employer"), v(101, "Edited", "Called the employer", "Called the employer twice")] };
const theirs = { id: 8, remarks: "Their note", remarks_by: 9, remarks_by_name: "Bo Chan", created_at: longAgo, version: 0, deleted: false,
    history: [v(102, "Added", null, "Their note", "Bo Chan")] };
const gone = { id: 6, remarks: "Wrong worker", remarks_by: 5, remarks_by_name: "Ann Lee", created_at: longAgo, version: 1, deleted: true,
    deleted_at: "2026-09-03T02:00:00Z", history: [v(98, "Added", null, "Wrong worker"), v(99, "Deleted", "Wrong worker", null, "Ann Lee", "2026-09-03T02:00:00Z")] };
const drawer = (props = {}) => render(
    <MemoryRouter><Suspense fallback={null}>
        <InsuranceRemarks record={record} remarks={[mine, theirs, gone]} canWrite onChanged={jest.fn()} {...props} />
    </Suspense></MemoryRouter>,
);
const row = (container, id) => container.querySelector(`[data-remark="${id}"]`);
const reply = (data, message) => Promise.resolve({ data: { status: true, message, data } });
const refusal = (status, message) => Promise.reject({ response: { status, data: { status: false, message } } });

describe("1 · Remarks drawer (remarks.js)", () => {
    it("lists every remark newest first, deleted ones as a tombstone with the deleted text in their history", () => {
        const { container } = drawer();
        expect([...container.querySelectorAll("[data-remark]")].map((r) => r.dataset.remark)).toEqual(["8", "7", "6"]);
        const tomb = row(container, 6);
        expect(tomb.dataset.deleted).toBe("true");
        expect(within(tomb).getByText("This remark was deleted. Its original text is retained below.")).toBeTruthy();
        expect(tomb.querySelector("[data-remark-last]").textContent).toMatch(/^Deleted by Ann Lee · /);
        expect(within(tomb).getByText("History · 2")).toBeTruthy();
        const versions = [...tomb.querySelectorAll("[data-remark-event]")];
        expect(versions.map((x) => x.dataset.remarkEvent)).toEqual(["99", "98"]);
        expect(within(versions[0]).getByText("Deleted text")).toBeTruthy();
        expect(within(versions[0]).getByText("Wrong worker")).toBeTruthy();
        expect(within(versions[1]).getByText("Text")).toBeTruthy();
        expect(tomb.querySelector('[data-action="edit-remark"]')).toBeNull();
        expect(within(tomb).queryByText("Only this remark’s author can edit or delete it.")).toBeNull();
    });

    it("shows an edited remark's last change and its Before / After versions", () => {
        const { container } = drawer();
        const r = row(container, 7);
        expect(r.querySelector("[data-remark-last]").textContent).toMatch(/^Edited by Ann Lee · \d\d\/\d\d\/\d\d \d\d:\d\d$/);
        const edited = r.querySelector('[data-remark-event="101"]');
        expect(within(edited).getByText("Before")).toBeTruthy();
        expect(within(edited).getByText("After")).toBeTruthy();
        expect(within(edited).getByText("Called the employer")).toBeTruthy();
    });

    it("the author edits and deletes a remark added long ago (no 24-hour window); others see the author note", () => {
        const { container } = drawer();
        expect(row(container, 7).querySelector('[data-action="edit-remark"]')).toBeTruthy();
        expect(row(container, 7).querySelector('[data-action="delete-remark"]')).toBeTruthy();
        expect(row(container, 8).querySelector('[data-action="edit-remark"]')).toBeNull();
        expect(within(row(container, 8)).getByText("Only this remark’s author can edit or delete it.")).toBeTruthy();
        expect(container.textContent).not.toMatch(/Editable for|Edit window closed/);
    });

    it("without Insurance Remarks: no composer and no Edit / Delete, even on the user's own remark", () => {
        const { container } = drawer({ canWrite: false });
        expect(container.querySelector('[data-action="add-remark"]')).toBeNull();
        expect(container.querySelector('[data-action="edit-remark"]')).toBeNull();
    });

    it("staff text is shown exactly as stored (line breaks and spaces kept, not translated)", () => {
        const typed = "  Line one\n\nLine two  ";
        const { container } = drawer({ remarks: [{ ...theirs, id: 9, remarks: typed, history: [] }] });
        const text = row(container, 9).querySelector("[data-remark-text]");
        expect(text.textContent).toBe(typed);
        expect(text.getAttribute("translate")).toBe("no");
    });

    it("Add remark is disabled until there is text; a retry of the same draft keeps its submission key; a new draft gets a new one", async () => {
        const onChanged = jest.fn();
        const { container } = drawer({ onChanged });
        const add = container.querySelector('[data-action="add-remark"]');
        expect(add.disabled).toBe(true);
        fireEvent.change(screen.getByLabelText("Add an Insurance remark"), { target: { value: "Spoke to QBE" } });
        expect(screen.getByLabelText("Add an Insurance remark").getAttribute("placeholder")).toBe("Add operational context…");

        addEditInsuranceRemarks.mockImplementationOnce(() => refusal(500, "Internal Server Error"));
        fireEvent.click(add);
        await waitFor(() => expect(ShowToast).toHaveBeenCalledWith("error", "Internal Server Error"));
        addEditInsuranceRemarks.mockImplementationOnce(() => reply({ id: 11, version: 0 }, "Remark added"));
        fireEvent.click(container.querySelector('[data-action="add-remark"]'));
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
        const [first, retry] = addEditInsuranceRemarks.mock.calls.map((c) => c[0]);
        expect(first).toEqual({ insurance_id: 31, remarks: "Spoke to QBE", submission_key: expect.stringMatching(/^remark-/) });
        expect(retry.submission_key).toBe(first.submission_key);
        expect(ShowToast).toHaveBeenLastCalledWith("success", "Remark added");
        expect(screen.getByLabelText("Add an Insurance remark").value).toBe("");

        addEditInsuranceRemarks.mockImplementationOnce(() => reply({ id: 12, version: 0 }, "Remark added"));
        fireEvent.change(screen.getByLabelText("Add an Insurance remark"), { target: { value: "Another" } });
        fireEvent.click(container.querySelector('[data-action="add-remark"]'));
        await waitFor(() => expect(addEditInsuranceRemarks).toHaveBeenCalledTimes(3));
        expect(addEditInsuranceRemarks.mock.calls[2][0].submission_key).not.toBe(first.submission_key);
    });

    /* P7-2 (owner, 11 Nov): an over-limit remark shows the error beside the field; nothing is sent; the box does not cut it */
    it("an over-limit remark in the composer shows the error beside the field and is not sent; 1,000 is accepted", async () => {
        const { container } = drawer();
        const box = screen.getByLabelText("Add an Insurance remark");
        expect(box.getAttribute("maxlength")).toBeNull();
        fireEvent.change(box, { target: { value: "x".repeat(REMARK_MAX_LENGTH + 1) } });
        expect(box.value.length).toBe(REMARK_MAX_LENGTH + 1);
        const field = box.closest("div").parentElement;
        expect(within(field).getByRole("alert").textContent).toBe("Remark must be 1,000 characters or fewer.");
        expect(box.getAttribute("aria-invalid") === "true" || box.className.length > 0).toBe(true);
        const add = container.querySelector('[data-action="add-remark"]');
        expect(add.disabled).toBe(true);
        fireEvent.click(add);
        expect(addEditInsuranceRemarks).not.toHaveBeenCalled();
        fireEvent.change(box, { target: { value: "x".repeat(REMARK_MAX_LENGTH) } });
        expect(screen.queryByText("Remark must be 1,000 characters or fewer.")).toBeNull();
        expect(container.querySelector('[data-action="add-remark"]').disabled).toBe(false);
    });

    it("characters are counted as the server counts them: an emoji is one", () => {
        expect(remarkLength("😀".repeat(REMARK_MAX_LENGTH))).toBe(REMARK_MAX_LENGTH);
        expect("😀".repeat(REMARK_MAX_LENGTH).length).toBe(2 * REMARK_MAX_LENGTH);
    });

    it("an over-limit edit shows the error beside the field and Save remark sends nothing", async () => {
        const { container } = drawer();
        fireEvent.click(row(container, 7).querySelector('[data-action="edit-remark"]'));
        const dialog = await screen.findByRole("dialog", { name: /Edit remark/ });
        const box = within(dialog).getByLabelText(/Remark/);
        expect(box.getAttribute("maxlength")).toBeNull();
        fireEvent.change(box, { target: { value: "y".repeat(REMARK_MAX_LENGTH + 5) } });
        expect(within(dialog).getByRole("alert").textContent).toBe("Remark must be 1,000 characters or fewer.");
        fireEvent.click(within(dialog).getByText("Save remark"));
        expect(addEditInsuranceRemarks).not.toHaveBeenCalled();
    });

    it("Edit remark sends the version it opened on; an unchanged save says so", async () => {
        const onChanged = jest.fn();
        const { container } = drawer({ onChanged });
        fireEvent.click(row(container, 7).querySelector('[data-action="edit-remark"]'));
        const dialog = await screen.findByRole("dialog", { name: /Edit remark/ });
        expect(within(dialog).getByText("IN-HKH000001")).toBeTruthy();
        const box = within(dialog).getByLabelText(/Remark/);
        expect(box.value).toBe("Called the employer twice");
        addEditInsuranceRemarks.mockImplementationOnce(() => reply({ id: 7, version: 1, unchanged: true }, "No changes to save"));
        fireEvent.click(within(dialog).getByText("Save remark"));
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
        expect(addEditInsuranceRemarks).toHaveBeenCalledWith({ insurance_id: 31, remark_id: 7, version: 1, remarks: "Called the employer twice" });
        expect(ShowToast).toHaveBeenCalledWith("success", "No changes to save");
    });

    it("an empty edit is refused in the dialog with the prototype's words, nothing sent", async () => {
        const { container } = drawer();
        fireEvent.click(row(container, 7).querySelector('[data-action="edit-remark"]'));
        const dialog = await screen.findByRole("dialog", { name: /Edit remark/ });
        fireEvent.change(within(dialog).getByLabelText(/Remark/), { target: { value: "   " } });
        fireEvent.click(within(dialog).getByText("Save remark"));
        expect(within(dialog).getByText("Enter a remark.")).toBeTruthy();
        expect(addEditInsuranceRemarks).not.toHaveBeenCalled();
    });

    it("Delete remark shows the text and its history note, and sends the version", async () => {
        const onChanged = jest.fn();
        const { container } = drawer({ onChanged });
        fireEvent.click(row(container, 7).querySelector('[data-action="delete-remark"]'));
        const dialog = await screen.findByRole("dialog", { name: /Delete remark\?/ });
        expect(within(dialog).getByText("The deleted text will remain visible in its history.")).toBeTruthy();
        expect(within(dialog).getByText("Called the employer twice")).toBeTruthy();
        removeInsuranceRemarks.mockImplementationOnce(() => reply({ id: 7, version: 2, deleted: true }, "Remark deleted; history retained"));
        fireEvent.click(within(dialog).getByText("Delete remark"));
        await waitFor(() => expect(onChanged).toHaveBeenCalled());
        expect(removeInsuranceRemarks).toHaveBeenCalledWith({ remark_id: 7, version: 1 });
        expect(ShowToast).toHaveBeenCalledWith("success", "Remark deleted; history retained");
    });

    /* PROMPT 9 F-1 (owner, 12 Nov 2026): the stale refusal no longer closes the dialog and drops the text. Until then this test
       expected the dialog to close and the list to be read at once. */
    it("a stale edit is refused by the server: its message shows above the text, which stays; closing reads the list again", async () => {
        const onChanged = jest.fn();
        const { container } = drawer({ onChanged });
        fireEvent.click(row(container, 7).querySelector('[data-action="edit-remark"]'));
        const dialog = await screen.findByRole("dialog", { name: /Edit remark/ });
        fireEvent.change(within(dialog).getByLabelText(/Remark/), { target: { value: "Overwrite" } });
        addEditInsuranceRemarks.mockImplementationOnce(() => refusal(409, "This remark changed. Reopen it before saving."));
        await act(async () => { fireEvent.click(within(dialog).getByText("Save remark")); });
        await waitFor(() => expect(dialog.querySelector("[data-kept-draft]")?.textContent).toBe("This remark changed. Reopen it before saving."));
        expect(within(dialog).getByLabelText(/Remark/).value).toBe("Overwrite");
        expect(onChanged).not.toHaveBeenCalled();
        fireEvent.click(within(dialog).getByText("Cancel"));
        expect(onChanged).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("dialog", { name: /Edit remark/ })).toBeNull();
    });
});

describe("2 · Context card (remarks.js contextButton)", () => {
    it("counts live remarks and previews the latest; only deleted ones: history available; none: No remarks yet", () => {
        expect(liveRemarks([mine, theirs, gone]).map((r) => r.id)).toEqual([8, 7]);
        expect(remarksPreview([mine, theirs, gone])).toBe("Their note");
        expect(remarksPreview([gone])).toBe("No current remarks · history available");
        expect(remarksPreview([])).toBe("No remarks yet");
    });
});

describe("3 · Follow Up returns to its request", () => {
    it("a task launched from a request row opens Requests on that request; a record-level task opens the record", () => {
        const withRequest = taskSourcePath({ source: "insurance", sourceId: 31, taskId: 501, context: { request: { id: 77, type: "Endorsement" }, period: { id: 4 } } });
        const url = new URL(withRequest, "http://x");
        expect(url.pathname).toBe("/insurances/31");
        expect(Object.fromEntries(url.searchParams)).toEqual({ followup: "501", from: "calendar", tab: "requests", request: "77" });
        const plain = new URL(taskSourcePath({ source: "insurance", sourceId: 31, taskId: 502, context: null }), "http://x");
        expect(Object.fromEntries(plain.searchParams)).toEqual({ followup: "502", from: "calendar" });
        // other sources keep their links (a Contract task with launch context gets no request parameter)
        const contract = new URL(taskSourcePath({ source: "contract", sourceId: 55, taskId: 503, context: { request: { id: 1 } } }), "http://x");
        expect(contract.searchParams.has("request")).toBe(false);
    });

    it("the arrived request row is marked and takes focus; other rows do not", () => {
        const rq = { id: 77, type: "Endorsement", state: "pending", endorsement: { type: "address", description: "address → Flat 1" }, submittedBy: null, buttons: null };
        const { container, rerender } = render(<RecordRequestRow request={rq} onAction={jest.fn()} arrived />);
        const r = container.querySelector('[data-request="77"]');
        expect(r.dataset.arrived).toBe("true");
        expect(document.activeElement).toBe(r);
        rerender(<RecordRequestRow request={{ ...rq, id: 78 }} onAction={jest.fn()} />);
        expect(container.querySelector('[data-request="78"]').dataset.arrived).toBeUndefined();
    });
});

describe("4 · the shared Remarks panel carries no Insurance code", () => {
    it("no insurance branch, no edit window module, no canWrite override", () => {
        const dir = path.resolve(__dirname, "../../components/remarks");
        expect(fs.existsSync(path.join(dir, "remarkWindow.js"))).toBe(false);
        for (const f of ["Remarks.js", "AddRemarksPopup.js", "addRemarksSchema.js"]) {
            const code = fs.readFileSync(path.join(dir, f), "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
            expect(code).not.toMatch(/insurance|Insurance|canWrite|remarkWindow/);
        }
    });
});
