/* eslint-env jest */
import { manualStatusTargets, workerDetailsPath, workerProfileStatusLabel, WORKER_STATUS_ID } from "../../Views/Pages/WorkerPage/workerModuleConstants";

jest.mock("../../utils/translation", () => ({ __esModule: true, default: (key) => key }));
jest.mock("../../Views/Pages/routes/routesConfig", () => ({ __esModule: true, default: { workerDetails: "/workers/details/:worker_id/:tab?" } }));

const statuses = [
    { id: WORKER_STATUS_ID.IN_REVIEW, name: "In Review" }, { id: WORKER_STATUS_ID.AVAILABLE, name: "Available" }, { id: WORKER_STATUS_ID.SUSPENDED, name: "Suspended" },
    { id: WORKER_STATUS_ID.BANNED, name: "Banned" }, { id: WORKER_STATUS_ID.ON_HOLD, name: "Hold" },
];

/* X29 / U-0198 / U-0325 (21 Oct) / backend 324: the manual menu is exactly On Hold · Suspended · Banned; each withheld without its grant */
describe("manualStatusTargets", () => {
    it("keeps only the three host actions, in server order", () => {
        expect(manualStatusTargets(statuses, { accessInfo: {}, isAdmin: false }).map((s) => s.id)).toEqual([WORKER_STATUS_ID.SUSPENDED, WORKER_STATUS_ID.BANNED, WORKER_STATUS_ID.ON_HOLD]);
    });
    it("Hold, Suspended and Ban are listed but disabled when the role block withholds them", () => {
        const out = manualStatusTargets(statuses, { accessInfo: { worker_status_to_hold: ["n"], worker_status_to_ban: ["n"], worker_status_to_suspended: ["n"] }, isAdmin: false });
        expect(out.find((s) => s.id === WORKER_STATUS_ID.ON_HOLD).enable).toBe(false);
        expect(out.find((s) => s.id === WORKER_STATUS_ID.BANNED).enable).toBe(false);
        expect(out.find((s) => s.id === WORKER_STATUS_ID.SUSPENDED).enable).toBe(false);
        expect(manualStatusTargets(statuses, { accessInfo: { worker_status_to_suspended: ["y"] }, isAdmin: false }).find((s) => s.id === WORKER_STATUS_ID.SUSPENDED).enable).toBe(true);
    });
    it("a granted key or an admin enables them", () => {
        expect(manualStatusTargets(statuses, { accessInfo: { worker_status_to_hold: ["y"] }, isAdmin: false }).find((s) => s.id === WORKER_STATUS_ID.ON_HOLD).enable).toBe(true);
        expect(manualStatusTargets(statuses, { accessInfo: { worker_status_to_ban: ["n"] }, isAdmin: true }).find((s) => s.id === WORKER_STATUS_ID.BANNED).enable).toBe(true);
    });
    it("tolerates a non-array list", () => {
        expect(manualStatusTargets(undefined)).toEqual([]);
    });
});

describe("workerDetailsPath", () => {
    it("builds record, tab and query forms, skipping empty params", () => {
        expect(workerDetailsPath(12)).toBe("/workers/details/12");
        expect(workerDetailsPath(12, null, "profile")).toBe("/workers/details/12/profile");
        expect(workerDetailsPath(12, { from: "job-offers", action: "", jobOfferId: 7 }, "job-offer")).toBe("/workers/details/12/job-offer?from=job-offers&jobOfferId=7");
    });
});

describe("workerProfileStatusLabel", () => {
    it("reads the registry key, falls back to the API name only for an unknown id", () => {
        expect(workerProfileStatusLabel(WORKER_STATUS_ID.ON_HOLD, "Hold")).toBe("key_on_hold");
        expect(workerProfileStatusLabel(99, "Mystery")).toBe("Mystery");
    });
});
