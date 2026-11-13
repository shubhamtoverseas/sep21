/* eslint-env jest */
import React from "react";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
jest.mock("../../components/ui/Modal", () => ({ __esModule: true, default: ({ children, footer }) => <div>{ children }{ footer }</div> })); // eslint-disable-line react/prop-types
jest.mock("../../components/ui/DateInput", () => ({ __esModule: true, default: ({ id, value, onChange, disabled }) => <input id={ id } value={ value } disabled={ disabled } onChange={ (e) => onChange(e.target.value) } /> })); // eslint-disable-line react/prop-types
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch, useSelector: (sel) => sel({}) }));
jest.mock("../../services/commonService", () => ({ ...jest.requireActual("../../services/commonService"), showSuccessOrError: () => {} }));

import { phaseTargets } from "../../Views/Pages/Contract/details/contractRecordUtils";
import { CR_PERMISSION } from "../../Views/Pages/Contract/contractConstants";
import { CONTRACT_STATUS } from "../../Views/Pages/ProcessingPage/processingConstants";
import { blockedByHint, StatusMenu } from "../../components/Processing/newui/StagePanel";
import ApplicationPurpose from "../../Views/Pages/ProcessingPage/processing-detail/immigration-tab/ApplicationPurpose";
import TerminalDateDialog from "../../Views/Pages/ProcessingPage/processing-detail/terminal-flow/TerminalDateDialog";
import useTerminalActivation from "../../Views/Pages/ProcessingPage/processing-detail/terminal-flow/useTerminalActivation";
import { E_VISA_PAYMENT_DATE_REASON_CODE, TERMINAL_FLOW_VARIANT } from "../../Views/Pages/ProcessingPage/processing-detail/terminal-flow/terminalFlowConfig";

describe("ask 6 · backend 322 — Cancel / Complete only from the server's status list", () => {
    test("nothing before the list loads; a withheld entry (enable false / 0) is not offered; an enabled one is", () => {
        expect(phaseTargets(CONTRACT_STATUS.PROCESSING, null)).toEqual([]);
        expect(phaseTargets(CONTRACT_STATUS.PROCESSING, [])).toEqual([]);
        expect(phaseTargets(CONTRACT_STATUS.PROCESSING, [{ id: CONTRACT_STATUS.CANCELLED, name: "Cancelled", enable: false }])).toEqual([]);
        expect(phaseTargets(CONTRACT_STATUS.ACTIVE, [{ id: CONTRACT_STATUS.COMPLETED, name: "Completed", enable: 0 }])).toEqual([]);
        expect(phaseTargets(CONTRACT_STATUS.PROCESSING, [{ id: CONTRACT_STATUS.CANCELLED, name: "Cancelled", enable: true }])).toEqual([{ id: CONTRACT_STATUS.CANCELLED, name: "Cancelled" }]);
    });
});

describe("ask 6 · backend 325 — a disabled ready entry names what blocks it", () => {
    test("blocked_by codes read as words", () => {
        expect(blockedByHint(["407_contract_number", "licence_id", "contract_reviewed", "no_files", "unassessed:visa_type", "purpose_unresolved"]))
            .toBe("contract number · licence id · contract reviewed · no files · unassessed: visa type · purpose unresolved");
        expect(blockedByHint([])).toBe("");
        expect(blockedByHint(undefined)).toBe("");
    });
    test("the blocked entry stays one line; its outstanding items are a note under the menu (prototype gateNote)", () => {
        const many = ["407_contract_number", "licence_id", "missing:a", "missing:b", "missing:c", "missing:d", "missing:e", "missing:f"];
        render(<StatusMenu stage="contract" options={ [{ id: 1, name: "Ready", enable: false, blocked_by: many }, { id: 2, name: "Pending", enable: true, blocked_by: ["x"] }] } current={ 2 } onPick={ () => {} } />);
        fireEvent.click(screen.getByRole("button", { name: /key_change_status/ }));
        const ready = screen.getByRole("menuitemradio", { name: /Ready/ });
        expect(ready).toBeDisabled();
        expect(ready).toHaveTextContent(/^Ready$/);
        expect(ready.getAttribute("data-blocked-by")).toBe(many.join(","));
        expect(screen.getByRole("menuitemradio", { name: /Pending/ }).getAttribute("data-blocked-by")).toBeNull();
        const note = document.querySelector(".g1-menu-gate");
        expect(note.getAttribute("data-blocked-status")).toBe("Ready");
        expect(note).toHaveTextContent("key_cr_status_unavailable_outstanding");
        const lines = Array.from(note.querySelectorAll(".g1-menu-gate-line")).map((n) => n.textContent);
        expect(lines).toEqual(["· contract number", "· licence id", "· missing: a", "· missing: b", "· missing: c", "· missing: d", "key_cr_and_n_more"]);
        expect(document.querySelectorAll(".g1-menu-gate").length).toBe(1);
    });
});

describe("§5 · backend 302 — a defaulted application purpose says so and stays confirmable", () => {
    test("Entry (default) with Change still selectable", () => {
        render(<ApplicationPurpose contractId={ 41 } canEdit data={ { purpose: "entry", resolved: true, fixed: false, defaulted: true, default_purpose: "entry", options: ["entry", "change"] } } />);
        expect(document.querySelector("[data-application-purpose]").getAttribute("data-defaulted")).toBe("1");
        expect(screen.getByText(/\(key_default\)/)).toBeInTheDocument();
        expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
    test("a fixed purpose carries no default suffix and no select", () => {
        render(<ApplicationPurpose contractId={ 41 } canEdit data={ { purpose: "renew", resolved: true, fixed: true, options: [] } } />);
        expect(screen.queryByText(/key_default/)).toBeNull();
        expect(screen.queryByRole("combobox")).toBeNull();
    });
});

describe("§4 · backend 301 — End of Processing: a changed E-Visa Payment Date needs a reason", () => {
    const base = { variant: TERMINAL_FLOW_VARIANT.END_OF_PROCESSING, initialDate: "2026-10-20", visaExpiry: "2028-10-20", onClose: () => {} };
    test("the recorded date is editable; a different date shows a required Reason; confirm sends date + reason", () => {
        const onConfirm = jest.fn();
        render(<TerminalDateDialog { ...base } reasonOnChange onConfirm={ onConfirm } />);
        const date = document.getElementById("terminal-flow-date");
        expect(date).not.toBeDisabled();
        expect(document.getElementById("terminal-flow-date-reason")).toBeNull();
        fireEvent.change(date, { target: { value: "2026-10-22" } });
        const reason = document.getElementById("terminal-flow-date-reason");
        expect(reason).toBeInTheDocument();
        fireEvent.click(screen.getByText("key_confirm"));
        expect(onConfirm).not.toHaveBeenCalled();
        /* the error line replaces the hint under the box */
        expect(screen.getAllByText("key_cr_required_when_date_changes").length).toBeGreaterThanOrEqual(1);
        fireEvent.change(reason, { target: { value: "Bank value date corrected" } });
        fireEvent.click(screen.getByText("key_confirm"));
        expect(onConfirm).toHaveBeenCalledWith("2026-10-22", "Bank value date corrected");
    });
    test("an unchanged date confirms without a reason; the server's refusal lands under the box", () => {
        const onConfirm = jest.fn();
        const { rerender } = render(<TerminalDateDialog { ...base } reasonOnChange onConfirm={ onConfirm } />);
        fireEvent.click(screen.getByText("key_confirm"));
        expect(onConfirm).toHaveBeenCalledWith("2026-10-20", "");
        fireEvent.change(document.getElementById("terminal-flow-date"), { target: { value: "2026-10-23" } });
        rerender(<TerminalDateDialog { ...base } reasonOnChange onConfirm={ onConfirm } reasonError="E-Visa payment date change needs a reason" />);
        expect(screen.getByText("E-Visa payment date change needs a reason")).toBeInTheDocument();
    });
    test("the activation hook reports the coded refusal", async () => {
        mockDispatch.mockImplementation(() => Promise.resolve({ error: true, payload: { code: E_VISA_PAYMENT_DATE_REASON_CODE, message: "needs a reason" } }));
        const { result } = renderHook(() => useTerminalActivation());
        let out;
        await act(async () => { out = await result.current.submit({ type: "x" }); });
        expect(out).toEqual({ ok: false, code: E_VISA_PAYMENT_DATE_REASON_CODE, message: "needs a reason" });
        mockDispatch.mockImplementation(() => Promise.resolve({ payload: { status: true, message: "done" } }));
        await act(async () => { out = await result.current.submit({ type: "x" }); });
        expect(out.ok).toBe(true);
    });
});

describe("§3 · backend 300 — no contract_details_visa_expiry_edit key", () => {
    test("the constant is gone", () => {
        expect(CR_PERMISSION.VISA_EXPIRY_EDIT).toBeUndefined();
        expect(CR_PERMISSION.CONTRACT_MODULE).toBeUndefined();
    });
});
