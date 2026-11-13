/* eslint-env jest */
import {
    areGroup1Or2PrerequisitesMet,
    areGroup3Or4PrerequisitesMet,
    canRunTerminalFlow,
    getCompletingStatusIds,
    getGroup1Or2OutstandingBeforePickup,
    hasContractStartVisaConflict,
    isValidIsoDate,
    isVisaExpiryCompatible,
} from "../../Views/Pages/ProcessingPage/processing-detail/terminal-flow/terminalFlowRules";

const group3Terminal = {
    status: 1,
    processing_group: 3,
    "processingContractDocumentModel.status": "ready",
    "processingConsulateDocumentModel.status": "returned",
    "processingImmigrationDocumentModel.status": "submitted",
    "processingVisaDocumentModel.status": "visa_released",
    "processingInsuranceDocumentModel.status": "not_required",
    "processingMedicalDocumentModel.status": "not_required",
};

const group1BeforePickup = {
    ...group3Terminal,
    processing_group: 1,
    "processingMedicalDocumentModel.status": "approved_by_er",
    "processingDeploymentModel.deployment_status": "not_ready",
};

describe("terminal flow rules", () => {
    it("rejects impossible calendar dates", () => {
        expect(isValidIsoDate("2026-02-31")).toBe(false);
        expect(isValidIsoDate("2026-02-28")).toBe(true);
    });

    it("requires Contract Start strictly before a recorded Visa Expiry; blank never blocks", () => {
        expect(isVisaExpiryCompatible("2026-03-01", "")).toBe(true);
        expect(isVisaExpiryCompatible("2026-03-01", "2026-03-01")).toBe(false);
        expect(isVisaExpiryCompatible("2026-03-01", "2026-03-02")).toBe(true);
    });

    it("needs every member of the four-permission composition", () => {
        const full = { stageActionPermission: ["view", "edit", "change_status"], isChangeStatusPermission: true };
        expect(canRunTerminalFlow(full)).toBe(true);
        expect(canRunTerminalFlow({ ...full, stageActionPermission: ["view", "edit"] })).toBe(false);
        expect(canRunTerminalFlow({ ...full, isChangeStatusPermission: false })).toBe(false);
    });

    it("counts Medical and Insurance Not Required as terminal for End of Processing", () => {
        expect(areGroup3Or4PrerequisitesMet(group3Terminal)).toBe(true);
        expect(areGroup3Or4PrerequisitesMet({ ...group3Terminal, "processingImmigrationDocumentModel.status": "not_ready" })).toBe(false);
    });

    it("does not reach End of Deployment until Deployment (including Pick Up) is complete", () => {
        expect(areGroup1Or2PrerequisitesMet(group1BeforePickup)).toBe(false);
        expect(areGroup1Or2PrerequisitesMet({ ...group1BeforePickup, "processingDeploymentModel.deployment_status": "ready" })).toBe(true);
    });

    it("lists outstanding Deployment sub-stages before Pick Up can complete", () => {
        const deployment = { dhl_contract_status: "received_by_helper", flight_details_status: "not_ready", hkid_status: "hkid_processed" };
        expect(getGroup1Or2OutstandingBeforePickup(group1BeforePickup, deployment)).toEqual(["key_flight_details"]);
    });

    it("flags Contract Start not earlier than Visa Expiry; a blank expiry never blocks", () => {
        expect(hasContractStartVisaConflict({ start_date: "2026-03-01", visa_expiry_date: "2026-03-01" })).toBe(true);
        expect(hasContractStartVisaConflict({ start_date: "2026-03-01", visa_expiry_date: "2028-03-01" })).toBe(false);
        expect(hasContractStartVisaConflict({ start_date: "2026-03-01" })).toBe(false);
    });

    it("identifies the Group 3/4 status options that would complete the record", () => {
        const lastOpen = { ...group3Terminal, "processingVisaDocumentModel.status": "visa_reference_number_released" };
        expect(getCompletingStatusIds("visa", lastOpen)).toEqual(["visa_released"]);
        expect(getCompletingStatusIds("contract", lastOpen)).toEqual([]);
        expect(getCompletingStatusIds("visa", { ...lastOpen, status: 2 })).toEqual([]);
    });
});
