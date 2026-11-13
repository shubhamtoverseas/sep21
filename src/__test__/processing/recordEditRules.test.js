/* eslint-env jest */
import { recordEditRules } from "../../Views/Pages/Contract/details/recordEditRules";
import { CONTRACT_STATUS } from "../../Views/Pages/ProcessingPage/processingConstants";

/* PROCESS.md §3.3.2 editable metadata by lifecycle (header-edit work order 2026-10-21) */
describe("recordEditRules", () => {
    it("Processing: Requested Start editable, Arrival read-only from Flight Details", () => {
        expect(recordEditRules(CONTRACT_STATUS.PROCESSING)).toEqual({ requestedEditable: true, arrivalEditable: false, arrivalFromFlightDetails: true, canOpen: true });
    });
    it("Active: both editable", () => {
        expect(recordEditRules(CONTRACT_STATUS.ACTIVE)).toEqual({ requestedEditable: true, arrivalEditable: true, arrivalFromFlightDetails: false, canOpen: true });
    });
    it("Completed: Arrival editable, Requested Start frozen", () => {
        expect(recordEditRules(CONTRACT_STATUS.COMPLETED)).toEqual({ requestedEditable: false, arrivalEditable: true, arrivalFromFlightDetails: false, canOpen: true });
    });
    it("Cancelled: nothing editable, no Edit", () => {
        expect(recordEditRules(CONTRACT_STATUS.CANCELLED).canOpen).toBe(false);
    });
    it("accepts the id as a string", () => {
        expect(recordEditRules(String(CONTRACT_STATUS.ACTIVE)).arrivalEditable).toBe(true);
    });
});
