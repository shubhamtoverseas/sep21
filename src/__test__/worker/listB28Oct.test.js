/* eslint-env jest */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
jest.mock("react-redux", () => ({ useSelector: () => ({}), useDispatch: () => jest.fn() }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn(), useSearchParams: () => [new URLSearchParams(), jest.fn()], Link: (props) => <span>{ props.children }</span> })); // eslint-disable-line react/prop-types

import { manualStatusTargets, MANUAL_STATUS_OFFERED, WORKER_STATUS_ID, WKD_JO_SUGGESTED_STAGE_ID } from "../../Views/Pages/WorkerPage/workerModuleConstants";
import { BULK_ACTIONS } from "../../Views/Pages/WorkerPage/dashboard/workerDashboardConfig";
import WkdJobOfferListing from "../../Views/Pages/WorkerPage/worker-detail/newui/joboffer/WkdJobOfferListing";

const serverList = [2, 3, 5, 6, 7, 8, 10, 12].map((id) => ({ id, name: `s${ id }` }));

describe("U-0198 / U-0325 — manual status menu is On Hold · Suspended · Banned", () => {
    test("Not Visible, Withdrawn, In Review, Holiday Mode never appear; Suspended is a manual target (backend 324)", () => {
        const targets = manualStatusTargets(serverList, { accessInfo: { worker_status_to_hold: ['y'], worker_status_to_suspended: ['y'], worker_status_to_ban: ['y'] }, isAdmin: false });
        expect(targets.map((t) => t.id).sort()).toEqual([...MANUAL_STATUS_OFFERED].sort());
        const byId = Object.fromEntries(targets.map((t) => [t.id, t]));
        expect(byId[WORKER_STATUS_ID.ON_HOLD].enable).toBe(true);
        expect(byId[WORKER_STATUS_ID.BANNED].enable).toBe(true);
        expect(byId[WORKER_STATUS_ID.SUSPENDED].enable).toBe(true);
        expect(byId[WORKER_STATUS_ID.SUSPENDED].awaiting).toBeUndefined();
        expect(byId[WORKER_STATUS_ID.NOT_VISIBLE]).toBeUndefined();
        expect(byId[WORKER_STATUS_ID.WITHDRAWN]).toBeUndefined();
    });
    test("admins are never gated", () => {
        const admin = manualStatusTargets(serverList, { accessInfo: {}, isAdmin: true });
        expect(admin.filter((t) => t.enable).map((t) => t.id).sort()).toEqual([WORKER_STATUS_ID.BANNED, WORKER_STATUS_ID.ON_HOLD, WORKER_STATUS_ID.SUSPENDED].sort());
    });
});

describe("U-0324 — no worker-level Change Owner control on the dashboard", () => {
    test("the bulk action set has no 'owner' kind and no key-less entry", () => {
        expect(BULK_ACTIONS.find((a) => a.kind === 'owner')).toBeUndefined();
        expect(BULK_ACTIONS.every((a) => a.perm)).toBe(true);
    });
});

describe("U-0326 — Suggested (17) rows stay off the worker's Job Offer tab", () => {
    test("the listing drops stage-17 rows and keeps Invited (1)", () => {
        const workerJobs = { data: [
            { id: 1, job_stage_status: 1, reference_id: "J0000001", employer_name: "A" },
            { id: 2, job_stage_status: WKD_JO_SUGGESTED_STAGE_ID, reference_id: "J0000017", employer_name: "B" },
        ], total: 2 };
        render(<WkdJobOfferListing workerJobs={ workerJobs } handleJobDetailView={ () => {} } handleJoStatusChange={ () => {} } onSearchJORefresh={ () => {} } listState={ { loading: false, error: false } } onRetry={ () => {} } />);
        expect(screen.queryByText("J0000017")).toBeNull();
        expect(screen.getByText("J0000001")).toBeInTheDocument();
    });
});
