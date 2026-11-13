/* eslint-env jest */
import React from "react";
import { render } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

import { handleReposteesIndividualLeaveStatusChangeFulfilled, handleReposteesLeaveStatusChangeFulfilled } from "../../redux/Slices/settings/leaves/leavesExtraReducers";
import { formatHoursMinutes } from "../../Views/Pages/SettingsPage/newui/hrms/hrmsConfig";
import { profileSchema } from "../../Views/Pages/SettingsPage/my-profile/basic-information/profileSchema";
import { reporteesActionSchema } from "../../Views/Pages/SettingsPage/leaves/approve-time-request/reporteesActionSchema";
import { leavePolicySchema } from "../../Views/Pages/SettingsPage/leave-policy/add-leave-policy/leavePolicySchema";
import { profileUpdate } from "../../components/ReusableComponents/form-states";
import { CAP_FLAG, LIMIT_FLAG, PROFILE_CARD_FIELDS, PROFILE_DOCUMENT_UPLOAD_FOLDERS, TIME_CREDIT_USERS_QUERY, TIME_REQUEST_UPLOAD_FOLDER } from "../../Views/Pages/SettingsPage/newui/settingsNewUiConstants";
import { capMaxLabel, fromApiRow, toRowPayload } from "../../Views/Pages/SettingsPage/newui/leave-policy/leavePolicyConfig";
import { normalizeWorkerRow } from "../../Views/Pages/WorkerPage/dashboard/workerDashboardConfig";
import WorkerDashboardTable from "../../Views/Pages/WorkerPage/dashboard/WorkerDashboardTable";
import { WORKER_STATUS_ID } from "../../Views/Pages/WorkerPage/workerModuleConstants";

describe("§A · Actioned Leaves (backend 352) — the fulfilled reducers no longer write into the employee's own leave array", () => {
    test("individual: the reportee row's status updates in place; `leaves` is untouched", () => {
        const state = { leaves: [{ id: 1 }], repoteesLeaves: { 10: { id: 10, status: 0, name: "LV10" } }, repoteesLeavesStatus: "loading", repoteesLeavesMessage: "" };
        handleReposteesIndividualLeaveStatusChangeFulfilled(state, { payload: { data: { id: 10, status: 2 }, message: "Updated" } });
        expect(state.repoteesLeaves[10]).toEqual({ id: 10, status: 2, name: "LV10" });
        expect(state.leaves).toEqual([{ id: 1 }]);
        expect(state.repoteesLeavesStatus).toBe("succeeded");
        expect(state.repoteesLeavesMessage).toBe("Updated");
        /* an id the list does not hold is ignored (no throw) */
        handleReposteesIndividualLeaveStatusChangeFulfilled(state, { payload: { data: { id: 99, status: 1 } } });
        expect(state.repoteesLeaves[99]).toBeUndefined();
    });
    test("bulk: nothing is written into `leaves`", () => {
        const state = { leaves: [], repoteesLeaves: {}, repoteesLeavesStatus: "loading", repoteesLeavesMessage: "" };
        handleReposteesLeaveStatusChangeFulfilled(state, { payload: { data: { leave_apply_ids: [3, 4] }, message: "ok" } });
        expect(state.leaves).toEqual([]);
        expect(state.repoteesLeavesStatus).toBe("succeeded");
    });
});

describe("§C · upload folders (backend 349)", () => {
    test("time requests and each profile document use an allowed folder; the time-credit list module is time_entry (356)", () => {
        expect(TIME_REQUEST_UPLOAD_FOLDER).toBe("time-request");
        expect(PROFILE_DOCUMENT_UPLOAD_FOLDERS).toEqual({ bank_hkid_copy: "hk-id", bank_copy: "bank-copy", bank_employment_contract: "employment-contract" });
        expect(TIME_CREDIT_USERS_QUERY).toEqual({ module: "time_entry" });
    });
});

describe("§D.2 · can_resend on list rows (backend 351)", () => {
    const base = { fullname: "Ana", worker_status: { id: WORKER_STATUS_ID.NOT_REGISTERED }, registration_type: "admin_sent_link" };
    const props = (rows) => ({
        colKeys: ["worker", "worker_code", "status"], rows, sort: { key: "", dir: "asc" }, ownerFilters: {}, selected: new Set(), selectMode: false,
        footStart: 1, footEnd: rows.length, footTotal: rows.length, page: 1, totalPages: 1,
        onSort: () => {}, onOwnerOpen: () => {}, onToggleRow: () => {}, onToggleAll: () => {}, onToggleSelectMode: () => {}, onOpenWorker: () => {}, onOpenStage: () => {}, onPage: () => {}, onResend: () => {},
    });
    test("0 hides Resend, 1 shows it, an absent flag keeps it (the 409 is the fallback)", () => {
        expect(normalizeWorkerRow({ ...base, id: 1, can_resend: 0 }).canResend).toBe(false);
        expect(normalizeWorkerRow({ ...base, id: 2, can_resend: 1 }).canResend).toBe(true);
        expect(normalizeWorkerRow({ ...base, id: 3 }).canResend).toBeNull();
        render(<WorkerDashboardTable { ...props([normalizeWorkerRow({ ...base, id: 1, can_resend: 0 }), normalizeWorkerRow({ ...base, id: 2, can_resend: 1 }), normalizeWorkerRow({ ...base, id: 3 })]) } />);
        expect(document.querySelector("[data-mc-row-resend='1']")).toBeNull();
        expect(document.querySelector("[data-mc-row-resend='2']")).toBeInTheDocument();
        expect(document.querySelector("[data-mc-row-resend='3']")).toBeInTheDocument();
    });
});

describe("§F · Approve Time Request (backend 353)", () => {
    test("admin_comment allows up to 1000 characters; a missing pair of hours / minutes reads N/A", async () => {
        await expect(reporteesActionSchema.validateAt("admin_comment", { admin_comment: "x".repeat(1000) })).resolves.toBeTruthy();
        await expect(reporteesActionSchema.validateAt("admin_comment", { admin_comment: "x".repeat(1001) })).rejects.toThrow();
        expect(formatHoursMinutes(null, null)).toBe("");
        expect(formatHoursMinutes(0, 0)).toBe("0 hrs 0 mins");
        expect(formatHoursMinutes(1, 45)).toBe("1 hrs 45 mins");
    });
});

describe("§B · My Profile per-card save + validation (backend 341)", () => {
    test("the form state carries hk_id (not HKID) and every card's keys exist on it", () => {
        expect("hk_id" in profileUpdate).toBe(true);
        expect("HKID" in profileUpdate).toBe(false);
        Object.values(PROFILE_CARD_FIELDS).flat().forEach((key) => expect(key in profileUpdate).toBe(true));
        expect(PROFILE_CARD_FIELDS.official).toEqual(["mobile_number", "birth_date", "address1"]);
        expect(PROFILE_CARD_FIELDS.official).not.toContain("email");
    });
    test("validation mirrors the server: empties pass, digits 7–13, hk_id shape, links with a scheme, DOB not in the future", async () => {
        const ok = (field, value) => profileSchema.validateAt(field, { [field]: value });
        await expect(ok("mobile_number", "")).resolves.toBeDefined();
        await expect(ok("mobile_number", "12345")).rejects.toThrow();
        await expect(ok("mobile_number", "98765432")).resolves.toBe("98765432");
        await expect(ok("hk_id", "A1234563")).resolves.toBe("A1234563");
        /* U-0399 (10 Nov package): the one shared validator — parentheses optional, check digit PROVED */
        await expect(ok("hk_id", "A123456(3)")).resolves.toBe("A123456(3)");
        await expect(ok("hk_id", "A1234564")).rejects.toThrow();
        await expect(ok("hk_id", "AX1234569")).resolves.toBe("AX1234569");
        await expect(ok("facebook", "facebook.com/me")).rejects.toThrow();
        await expect(ok("facebook", "https://facebook.com/me")).resolves.toBe("https://facebook.com/me");
        await expect(ok("facebook", "")).resolves.toBeDefined();
        await expect(ok("birth_date", "2999-01-01")).rejects.toThrow();
        await expect(ok("birth_date", "1899-12-31")).rejects.toThrow();
        await expect(ok("birth_date", "1998-04-20")).resolves.toBe("1998-04-20");
        await expect(ok("address1", "a".repeat(1001))).rejects.toThrow();
        await expect(ok("emergency_contact_name", "a".repeat(256))).rejects.toThrow();
        await expect(ok("personal_email", "not-an-email")).rejects.toThrow();
    });
});

describe("§I · Leave Policy: carry-forward / encashment cap flag (backend 358)", () => {
    const form = { leave_policy_type: "AL", accrual_type: "yearly", accrual_rate: "12", carry_forward: 1, carry_forward_max: "5", carry_forward_max_type: "value", encashment: 1, encashment_max: "50", encashment_max_type: "percentage", threshold: "2", expiry_value_limit: LIMIT_FLAG.LIMITED };
    test("a max sends 'y' with its type; No Limit sends 'n' with an empty type; expiry keeps LIMIT_FLAG", () => {
        const withMax = toRowPayload({ ...form, carry_forward_no_limit: false, encashment_no_limit: false }, 12);
        expect(withMax).toMatchObject({ carry_forward_limit: CAP_FLAG.HAS_MAX, carry_forward_max: 5, carry_forward_max_type: "value", encashment_limit: CAP_FLAG.HAS_MAX, encashment_max: 50, encashment_max_type: "percentage" });
        expect(CAP_FLAG.HAS_MAX).toBe("y");
        const noLimit = toRowPayload({ ...form, carry_forward_no_limit: true, encashment_no_limit: true }, 12);
        expect(noLimit).toMatchObject({ carry_forward_limit: "n", carry_forward_max: 0, carry_forward_max_type: "", encashment_limit: "n", encashment_max: 0, encashment_max_type: "" });
        expect(toRowPayload({ ...form, carry_forward: 0, encashment: 0 }, 12)).toMatchObject({ carry_forward_limit: null, carry_forward_max_type: null, encashment_limit: "", encashment_max_type: "" });
        expect(toRowPayload({ ...form, expiry_value_limit: LIMIT_FLAG.NO_LIMIT, expiry_type: "days", expiry_in_days: "30" }, 12).expiry_value).toBe(30);
    });
    test("an API row with 'y' + 5 re-opens with the max; 'n' re-opens with No Limit ticked, and the row reads it", () => {
        const kept = fromApiRow({ id: 1, carry_forward: 1, carry_forward_limit: "y", carry_forward_max: 5, carry_forward_max_type: "value", encashment: 1, encashment_limit: "n", encashment_max: 0 });
        expect(kept.carry_forward_no_limit).toBe(false);
        expect(kept.encashment_no_limit).toBe(true);
        expect(capMaxLabel(1, "y", 5, "value")).toBe("5");
        expect(capMaxLabel(1, "y", 50, "percentage")).toBe("50%");
        expect(capMaxLabel(1, "n", 0, "")).toBe("key_no_limit");
        expect(capMaxLabel(0, null, 0, null)).toBe("0");
    });
});

describe("§I.2 · Add to Policy refusals are explained (backend 359)", () => {
    const base = { leave_policy_type: "CL", accrual_type: "manual", carry_forward: 1, encashment: 1, expiry_value_limit: "n", status: 1 };
    test("the max type is required only for a limited row; No Limit passes without one", async () => {
        await expect(leavePolicySchema.validateAt("carry_forward_max_type", { ...base, carry_forward_no_limit: false, carry_forward_max_type: "" })).rejects.toThrow("key_carry_forward_type_is_required");
        await expect(leavePolicySchema.validateAt("carry_forward_max_type", { ...base, carry_forward_no_limit: true, carry_forward_max_type: "" })).resolves.toBeDefined();
        await expect(leavePolicySchema.validateAt("encashment_max_type", { ...base, encashment_no_limit: false, encashment_max_type: "" })).rejects.toThrow("key_encash_type_is_required");
        await expect(leavePolicySchema.validateAt("encashment_max_type", { ...base, encashment_no_limit: true, encashment_max_type: "" })).resolves.toBeDefined();
    });
    /* Shubham 10 Nov: max accepts decimals up to 2 places; a third place is refused; threshold stays whole */
    test("max takes up to 2 decimals; threshold stays whole", async () => {
        await expect(leavePolicySchema.validateAt("carry_forward_max", { ...base, carry_forward_no_limit: false, carry_forward_max: "0.05", carry_forward_max_type: "value" })).resolves.toBe(0.05);
        await expect(leavePolicySchema.validateAt("carry_forward_max", { ...base, carry_forward_no_limit: false, carry_forward_max: "0.055", carry_forward_max_type: "value" })).rejects.toThrow("key_pl_two_decimals");
        await expect(leavePolicySchema.validateAt("carry_forward_max", { ...base, carry_forward_no_limit: false, carry_forward_max: "5", carry_forward_max_type: "value" })).resolves.toBe(5);
        await expect(leavePolicySchema.validateAt("encashment_max", { ...base, encashment_no_limit: false, encashment_max: "12.25", encashment_max_type: "value" })).resolves.toBe(12.25);
        await expect(leavePolicySchema.validateAt("encashment_max", { ...base, encashment_no_limit: false, encashment_max: "12.345", encashment_max_type: "value" })).rejects.toThrow("key_pl_two_decimals");
        await expect(leavePolicySchema.validateAt("threshold", { ...base, threshold: "0.02" })).rejects.toThrow();
        await expect(leavePolicySchema.validateAt("threshold", { ...base, threshold: "2" })).resolves.toBe(2);
    });
});
