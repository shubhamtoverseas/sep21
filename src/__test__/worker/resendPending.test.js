/* eslint-env jest */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

import WorkerDashboardTable from "../../Views/Pages/WorkerPage/dashboard/WorkerDashboardTable";
import { normalizeWorkerRow } from "../../Views/Pages/WorkerPage/dashboard/workerDashboardConfig";
import { canResendInvitation, RESEND_ROW_STATUS_KEY, WORKER_STATUS_ID } from "../../Views/Pages/WorkerPage/workerModuleConstants";

const grid = (module, pairs) => [{ module, category: Object.entries(pairs).map(([id, selected_value]) => ({ id, selected_value })) }];
const getPermissionValue = (list, module, key) => list?.find((m) => m.module === module)?.category?.find((c) => c.id === key)?.selected_value;

const tableProps = (rows, onResend) => ({
    colKeys: ["worker", "worker_code", "status"], rows, sort: { key: "", dir: "asc" }, ownerFilters: {}, selected: new Set(), selectMode: false,
    footStart: 1, footEnd: rows.length, footTotal: rows.length, page: 1, totalPages: 1,
    onSort: () => {}, onOwnerOpen: () => {}, onToggleRow: () => {}, onToggleAll: () => {}, onToggleSelectMode: () => {}, onOpenWorker: () => {}, onOpenStage: () => {}, onPage: () => {},
    onResend,
});

describe("U-0337 (21 Oct package) — Resend on Pending rows, gated on current Send Link", () => {
    test("the grant: admins always; a partner on partner_send_link; a host on worker_send_link alone (no Create needed)", () => {
        expect(canResendInvitation({ permissionList: [], isAdmin: true, isPartner: false, getPermissionValue })).toBe(true);
        expect(canResendInvitation({ permissionList: grid("partner", { partner_send_link: "y" }), isAdmin: false, isPartner: true, getPermissionValue })).toBe(true);
        expect(canResendInvitation({ permissionList: grid("partner", { partner_send_link: "n" }), isAdmin: false, isPartner: true, getPermissionValue })).toBe(false);
        expect(canResendInvitation({ permissionList: grid("worker", { worker_send_link: "y" }), isAdmin: false, isPartner: false, getPermissionValue })).toBe(true);
        expect(canResendInvitation({ permissionList: grid("worker", { worker_send_link: "n", worker_create: "y" }), isAdmin: false, isPartner: false, getPermissionValue })).toBe(false);
    });
    test("a Pending (Not Registered) row without a code carries Resend; a row with a code or another status does not; no grant → no action", () => {
        const pending = normalizeWorkerRow({ id: 5, fullname: "Ana", worker_status: { id: WORKER_STATUS_ID.NOT_REGISTERED }, registration_type: "admin_sent_link", email: "ana@x.hk" });
        expect(pending.statusKey).toBe(RESEND_ROW_STATUS_KEY);
        expect(pending.registrationType).toBe("admin_sent_link");
        const coded = normalizeWorkerRow({ id: 6, fullname: "Bea", reference_id: "W-6", worker_status: { id: WORKER_STATUS_ID.AVAILABLE } });
        const onResend = jest.fn();
        const { unmount } = render(<WorkerDashboardTable { ...tableProps([pending, coded], onResend) } />);
        const btn = document.querySelector("[data-mc-row-resend='5']");
        expect(btn).toBeInTheDocument();
        expect(btn).toHaveTextContent("key_wkr_invitation_resend");
        expect(document.querySelector("[data-mc-row-resend='6']")).toBeNull();
        fireEvent.click(btn);
        expect(onResend).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }));
        unmount();
        render(<WorkerDashboardTable { ...tableProps([pending], undefined) } />);
        expect(document.querySelector("[data-mc-row-resend]")).toBeNull();
        expect(screen.getByText("key_not_assigned")).toBeInTheDocument();
    });
});
