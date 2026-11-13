/* eslint-env jest */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
let mockStaffType = "internal";
jest.mock("../../utils/storage", () => ({
    getStoredUser: () => ({ data: { id: 30, role: { id: 999, guard_name: "staff" }, staff: { staff_type: mockStaffType } } }),
}));
jest.mock("react-redux", () => ({
    useSelector: (sel) => sel({ users: { permissionList: { data: [] } } }),
    useDispatch: () => () => Promise.resolve({ payload: {} }),
}));
jest.mock("../../Views/Pages/WorkerPage/worker-detail/newui/WorkerIdentityHeader", () => ({
    __esModule: true,
    default: ({ owners, menuActions }) => ( // eslint-disable-line react/prop-types
        <div>
            <ul data-owners="">{ owners.map((o) => <li key={ o.role } data-tone={ o.tone }>{ o.role }: { o.name }{ o.sub ? ` (${ o.sub })` : "" }</li>) }</ul>
            { menuActions.map((m) => <button key={ m.id } type="button" onClick={ m.onClick }>{ m.label }</button>) }
        </div>
    ),
}));
jest.mock("../../Views/Pages/WorkerPage/worker-detail/newui/WkdChangeOwnerDialog", () => ({ __esModule: true, default: () => null }));
jest.mock("../../Views/Pages/WorkerPage/worker-detail/newui/WkdChangePartnerDialog", () => ({ __esModule: true, default: () => null }));
jest.mock("../../Views/Pages/WorkerPage/worker-detail/newui/WkdSendLinkModal", () => ({ __esModule: true, default: () => null }));
jest.mock("../../Views/Pages/WorkerPage/worker-detail/newui/WkdPhotoViewModal", () => ({ __esModule: true, default: () => null }));
jest.mock("../../Views/Pages/JobOfferPage/newui/record/JoChangeInterpreterDialog", () => ({
    __esModule: true,
    default: ({ row }) => <div data-jo-change-interpreter={ row.job_id } data-worker={ row.id }>{ row.existing_interpreter?.first_name }</div>, // eslint-disable-line react/prop-types
}));

import WorkerHeaderSection from "../../Views/Pages/WorkerPage/worker-detail/newui/WorkerHeaderSection";
import { getWorkerPermissionAccess } from "../../services/commonService";

const grid = (module, pairs) => ({ module, category: Object.entries(pairs).map(([id, selected_value]) => ({ id, selected_value })) });

describe("§7 · U-0343 / backend 304 — a viewer who is interpreter owner AND onboarding owner reads both blocks combined", () => {
    const permissionList = [
        grid("worker_interpreter_owner", { worker_interpreter_owner_worker_chat: "n", worker_interpreter_owner_worker_contact_details: "view", worker_interpreter_owner_change_interpreter: "y" }),
        grid("worker_onboarding_owner", { worker_onboarding_owner_worker_chat: "y", worker_onboarding_owner_worker_contact_details: "edit", worker_onboarding_owner_change_interpreter: "n" }),
        grid("worker_interpreter_onboarding_non_owner", { worker_interpreter_onboarding_non_owner_worker_chat: "n", worker_interpreter_onboarding_non_owner_worker_contact_details: "n" }),
    ];
    test("both blocks: y wins, CSV tokens unite", () => {
        const out = getWorkerPermissionAccess({ interpreter_of_worker_ids: [5], onboarding1_of_worker_ids: [5] }, 5, permissionList);
        expect(out.worker_chat).toEqual(["y"]);
        expect(out.worker_contact_details.sort()).toEqual(["edit", "view"]);
        expect(out.worker_change_interpreter).toEqual(["y"]);
    });
    test("one block only: that block as before; neither: Non-Owner", () => {
        expect(getWorkerPermissionAccess({ interpreter_of_worker_ids: [5] }, 5, permissionList).worker_contact_details).toEqual(["view"]);
        expect(getWorkerPermissionAccess({ onboarding2_of_worker_ids: [5] }, 5, permissionList).worker_chat).toEqual(["y"]);
        expect(getWorkerPermissionAccess({ interpreter_of_worker_ids: [9] }, 5, permissionList).worker_contact_details).toEqual(["n"]);
    });
});

describe("§13 / ask 8 · U-0372 / backend 314 — current interpreter on the record header", () => {
    const currentWorker = {
        worker_id: 5, worker_type: 1, type: "Local", nationality: "Filipino", status: 3, onboarding1: "Ann Lee", registration_type: "admin_added",
        current_interpreter: { job_id: 77, job_reference_id: "JO-77", job_status: 2, staff_id: 12, staff_name: "Ivy Lam", staff_active: true, assigned_at: "2026-10-27" },
    };
    const props = { workerStatus: [], allWorkerStatuses: [], onUpdateStatus: () => {}, handleRefreshWorkerInfo: jest.fn(), handleOpenChats: () => {}, workerProfileInfo: {}, tabs: [], activeTab: "details", onSelectTab: () => {} };
    beforeEach(() => { mockStaffType = "internal"; });

    test("read-only interpreter row with the Job Offer; Change opens the JO-scoped dialog for that job_id, then the record is re-read", () => {
        render(<WorkerHeaderSection { ...props } currentWorker={ currentWorker } staffType="internal" isAdmin={ false } isWorkerPermissionAccessInfo={ { worker_change_interpreter: ["y"], worker_contact_details: ["view"] } } />);
        const row = screen.getByText(/key_interpreter: Ivy Lam/);
        expect(row).toHaveTextContent("#JO-77");
        expect(row.getAttribute("data-tone")).toBe("int");
        fireEvent.click(screen.getByText("key_change_interpreter"));
        const dialog = document.querySelector("[data-jo-change-interpreter]");
        expect(dialog.getAttribute("data-jo-change-interpreter")).toBe("77");
        expect(dialog.getAttribute("data-worker")).toBe("5");
        expect(dialog).toHaveTextContent("Ivy Lam");
    });
    test("without the change_interpreter grant the row stays and the action is absent; no Job Offer → no action", () => {
        const { unmount } = render(<WorkerHeaderSection { ...props } currentWorker={ currentWorker } staffType="internal" isAdmin={ false } isWorkerPermissionAccessInfo={ { worker_change_interpreter: ["n"] } } />);
        expect(screen.getByText(/key_interpreter: Ivy Lam/)).toBeInTheDocument();
        expect(screen.queryByText("key_change_interpreter")).toBeNull();
        unmount();
        render(<WorkerHeaderSection { ...props } currentWorker={ { ...currentWorker, current_interpreter: null } } staffType="internal" isAdmin />);
        expect(screen.queryByText(/key_interpreter:/)).toBeNull();
        expect(screen.queryByText("key_change_interpreter")).toBeNull();
    });
    test("a partner viewer never sees host staff names (U-0200)", () => {
        mockStaffType = "partner";
        render(<WorkerHeaderSection { ...props } currentWorker={ currentWorker } staffType="partner" isAdmin={ false } isWorkerPermissionAccessInfo={ { worker_change_interpreter: ["y"] } } />);
        expect(screen.queryByText(/Ivy Lam/)).toBeNull();
        expect(screen.queryByText("key_change_interpreter")).toBeNull();
    });
});
