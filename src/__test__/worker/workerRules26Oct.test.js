/* eslint-env jest */
import { gateVerifyOnCentral } from "../../Views/Pages/WorkerPage/worker-detail/statusTransition";
import { experienceReasonForLeaving } from "../../utils/workerDisplay";
import { isSubStageNotRequired, SUB_STAGE_NOT_REQUIRED_CODE } from "../../Views/Pages/ProcessingPage/processingConstants";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

describe("W-27 — dependent Indonesian documents wait for the central one", () => {
    const options = [{ id: "in_review", enable: true }, { id: "action_required", enable: true }, { id: "verified", enable: true }];
    it("Verified stays listed but disabled while the central document is not Verified", () => {
        expect(gateVerifyOnCentral(options, false).map((o) => [o.id, o.enable])).toEqual([["in_review", true], ["action_required", true], ["verified", false]]);
    });
    it("nothing changes once the central document is Verified, or for a central document itself", () => {
        expect(gateVerifyOnCentral(options, true)).toBe(options);
        expect(gateVerifyOnCentral(options, undefined)).toBe(options);
    });
});

describe("Reason for Leaving is the experience's Contract Status (work order 26 Oct)", () => {
    const list = [{ id: 1, admin_panel_status: "Finished" }, { id: 5, admin_panel_status: "Terminated" }];
    it("reads the name from the worker contract status list by id", () => {
        expect(experienceReasonForLeaving({ contract_status: "5" }, list)).toBe("Terminated");
        expect(experienceReasonForLeaving({ contract_status: 1 }, list)).toBe("Finished");
    });
    it("falls back to a name the row carries, then to nothing", () => {
        expect(experienceReasonForLeaving({ contract_status: 9, contract_status_info: { name: "Other" } }, list)).toBe("Other");
        expect(experienceReasonForLeaving({ contract_status: 9, leaving_reason_info: { name: "Legacy" } }, list)).toBe("Legacy");
        expect(experienceReasonForLeaving({}, list)).toBe("");
    });
});

describe("Deployment / Medical sub-stage lock (backend 281)", () => {
    it("Not Required locks; every other status does not", () => {
        expect(isSubStageNotRequired("not_required")).toBe(true);
        expect(isSubStageNotRequired("not_ready")).toBe(false);
        expect(isSubStageNotRequired(undefined)).toBe(false);
        expect(SUB_STAGE_NOT_REQUIRED_CODE).toBe("SUB_STAGE_NOT_REQUIRED");
    });
});
