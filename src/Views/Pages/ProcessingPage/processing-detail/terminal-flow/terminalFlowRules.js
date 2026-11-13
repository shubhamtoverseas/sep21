import dayjs from "../../../../../utils/dayjsConfig";
import { PICKUP_NOT_REQUIRED_STATUS, PICKUP_TERMINAL_STATUSES } from "../../processingConstants";
import { isProcessingLifecycle } from "../contractLifecycle";

const ISO_FORMAT = "YYYY-MM-DD";

/* Stage statuses that count as terminal for activation (TERMINAL.md §2–3). Not Required is a neutral terminal alternative. */
const TERMINAL_STAGE_STATUSES = Object.freeze({
    contract: ["ready"],
    consulate: ["returned"],
    immigration: ["submitted"],
    visa: ["visa_released"],
    insurance: ["ready", "not_required"],
    medical: ["approved_by_er", "not_required"],
});

const DEPLOYMENT_SUB_STAGES = Object.freeze([
    { key: "dhl_contract", statusField: "dhl_contract_status", terminal: ["received_by_helper", "not_required"], labelKey: "key_dhl_contract" },
    { key: "flight_details", statusField: "flight_details_status", terminal: ["flight_booked", "not_required"], labelKey: "key_flight_details" },
    { key: "hkid", statusField: "hkid_status", terminal: ["hkid_processed", "not_required"], labelKey: "key_hkid" },
]);

const STAGE_LABEL_KEYS = Object.freeze({
    contract: "key_contract",
    consulate: "key_consulate",
    immigration: "key_immigration",
    visa: "key_visa",
    insurance: "key_insurance",
    medical: "key_medical",
    "pre-departure": "key_pre_departure",
});

const GROUP_1_2_STAGES = Object.freeze(["contract", "consulate", "immigration", "visa", "insurance", "medical"]);
const GROUP_3_4_STAGES = Object.freeze(["contract", "consulate", "immigration", "visa", "insurance", "medical"]);

const stageStatusKey = (stage) => `processing${ stage.charAt(0).toUpperCase() + stage.slice(1) }DocumentModel.status`;

export const isGroup1Or2 = (group) => group === 1 || group === 2;
export const isGroup3Or4 = (group) => group === 3 || group === 4;
/* `lifecycleId` is the record header's lifecycle (useContractLifecycle); without it the record's own fields decide */
export const isProcessingContract = (contractDetails, lifecycleId) => isProcessingLifecycle(contractDetails, lifecycleId);

/** Strict calendar validation: rejects impossible dates such as 31/02 instead of rolling them over. */
export const isValidIsoDate = (value) => typeof value === "string" && dayjs(value, ISO_FORMAT, true).isValid();

export const toIsoDateOrEmpty = (value) => {
    if (!value) return "";
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.format(ISO_FORMAT) : "";
};

/**
 * Contract Start must be strictly earlier than a recorded Visa Expiry (TERMINAL.md §4, §7).
 * A blank Visa Expiry never blocks; Visa Expiry is never derived here.
 */
export const isVisaExpiryCompatible = (proposedStartIso, visaExpiryIso) => {
    if (!visaExpiryIso || !proposedStartIso) return true;
    return dayjs(visaExpiryIso).isAfter(dayjs(proposedStartIso), "day");
};

/**
 * End of Deployment / End of Processing open and commit only with the full composition:
 * Stage Actions View + Change Status + Edit, plus Change Status (Contract).
 */
export const canRunTerminalFlow = ({ stageActionPermission = [], isChangeStatusPermission }) =>
    ["view", "change_status", "edit"].every((action) => stageActionPermission.includes(action)) &&
    Boolean(isChangeStatusPermission);

const isStageTerminal = (contractDetails, stage) => {
    const status = contractDetails?.[stageStatusKey(stage)];
    // Same rule as the server's activation check (check.processing.can.be.active): Insurance passes when Not Required
    // or when a policy period covers today — "Policy Confirmed" alone does not (U-0066 / Q-4; CHANGE_HISTORY 217).
    if (stage === "insurance" && status === "ready" && contractDetails && "insurance_cov_label" in contractDetails) {
        return contractDetails.insurance_cov_label === "active";
    }
    return TERMINAL_STAGE_STATUSES[stage].includes(status);
};

const collectOutstanding = (contractDetails, stages) =>
    stages.filter((stage) => !isStageTerminal(contractDetails, stage)).map((stage) => STAGE_LABEL_KEYS[stage]);

/**
 * Required stages still outstanding before End of Deployment (Pick Up excluded — it is the stage being completed).
 * Returns translation keys so the caller can render labels.
 */
export const getGroup1Or2OutstandingBeforePickup = (contractDetails, deploymentDocument) => {
    /* Group 1/2 Medical lives under Deployment: its status on the deployment document counts when the contract record carries none (audit T-14 / B-18) */
    const depMedical = deploymentDocument?.medical?.status;
    const details = depMedical && !contractDetails?.[stageStatusKey("medical")] ? { ...contractDetails, [stageStatusKey("medical")]: depMedical } : contractDetails;
    const outstanding = collectOutstanding(details, GROUP_1_2_STAGES);
    DEPLOYMENT_SUB_STAGES.forEach(({ statusField, terminal, labelKey }) => {
        if (!terminal.includes(deploymentDocument?.[statusField])) outstanding.push(labelKey);
    });
    if (contractDetails?.processing_group === 2 && contractDetails?.predeparture_status !== "ready") {
        outstanding.push(STAGE_LABEL_KEYS["pre-departure"]);
    }
    return outstanding;
};

/** Every Group 1/2 prerequisite including a terminal Pick Up — the state in which End of Deployment is reachable. */
export const areGroup1Or2PrerequisitesMet = (contractDetails) =>
    isGroup1Or2(contractDetails?.processing_group) &&
    collectOutstanding(contractDetails, GROUP_1_2_STAGES).length === 0 &&
    contractDetails?.["processingDeploymentModel.deployment_status"] === "ready" &&
    (contractDetails?.processing_group !== 2 || contractDetails?.predeparture_status === "ready");

/** `g34AllTerminal`: every Group 3/4 terminal-relevant stage has reached a terminal status. */
export const areGroup3Or4PrerequisitesMet = (contractDetails) =>
    isGroup3Or4(contractDetails?.processing_group) &&
    collectOutstanding(contractDetails, GROUP_3_4_STAGES).length === 0;

export const isPickupTerminalStatus = (statusId) => PICKUP_TERMINAL_STATUSES.includes(statusId);
/* Not Required (and its legacy id): a neutral exception, never proof of a pick-up */
export const isPickupNotRequiredStatus = (statusId) => statusId === PICKUP_NOT_REQUIRED_STATUS;

export const getRecordedVisaExpiry = (contractDetails) =>
    toIsoDateOrEmpty(contractDetails?.["processingVisaDocumentModel.visa_expiry_date"] || contractDetails?.visa_expiry_date);

/** True when the recorded Contract Start and Visa Expiry violate Start < Visa Expiry (no override, blank expiry never blocks). */
export const hasContractStartVisaConflict = (contractDetails) =>
    !isVisaExpiryCompatible(toIsoDateOrEmpty(contractDetails?.start_date), getRecordedVisaExpiry(contractDetails));

/**
 * Group 3/4: the status options that would complete the record from `stage` (every other terminal-relevant
 * stage already terminal). These are withdrawn from users without the terminal-flow composition.
 */
export const getCompletingStatusIds = (stage, contractDetails, lifecycleId) => {
    if (!isGroup3Or4(contractDetails?.processing_group) || !isProcessingContract(contractDetails, lifecycleId)) return [];
    if (!TERMINAL_STAGE_STATUSES[stage]) return [];
    const othersTerminal = GROUP_3_4_STAGES.filter((other) => other !== stage).every((other) => isStageTerminal(contractDetails, other));
    return othersTerminal ? TERMINAL_STAGE_STATUSES[stage] : [];
};

export const getRetainedVisaReleaseDate = (contractDetails) =>
    toIsoDateOrEmpty(contractDetails?.["processingVisaDocumentModel.e_visa_payment_date"]);

export const getRetainedArrivalDate = (contractDetails, deploymentDocument) =>
    toIsoDateOrEmpty(deploymentDocument?.arrival_date || contractDetails?.["processingDeploymentModel.arrival_date"]);
