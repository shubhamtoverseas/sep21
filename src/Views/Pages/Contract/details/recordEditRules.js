import { CONTRACT_STATUS } from "../../ProcessingPage/processingConstants";

/**
 * Contract Details → record header Edit (PROCESS.md §3.3.2; work order 2026-10-21). Of the record's metadata only Requested
 * Start Date and Arrival Date are editable; which of the two, follows the lifecycle:
 * - Processing: Requested Start editable; the arrival is captured in Deployment → Flight Details, so it is read-only here.
 * - Active: both editable (the API writes `arrival_date` to the Deployment record for Active / Completed only).
 * - Completed: Arrival editable, Requested Start frozen (Delay = Contract Start − Requested Start, B14-28).
 * - Cancelled: nothing — Requested / Expected Start give way to the Reason for Cancellation (PROCESS.md §2 l.158).
 * Status ids come from the shared enum; the work order quoted Active 2 / Completed 3 against our list's Cancelled 3 /
 * Completed 4 — the backend was asked which is right (21 Oct); the names below are the contract, the ids live in one place.
 */
export const recordEditRules = (statusId) => {
    const id = Number(statusId);
    const processing = id === CONTRACT_STATUS.PROCESSING;
    const active = id === CONTRACT_STATUS.ACTIVE;
    const completed = id === CONTRACT_STATUS.COMPLETED;
    const requestedEditable = processing || active;
    const arrivalEditable = active || completed;
    return {
        requestedEditable,
        arrivalEditable,
        /* Processing: the row shows the Flight Details value read-only with its hint */
        arrivalFromFlightDetails: processing,
        /* the header Edit opens only when at least one field can change */
        canOpen: requestedEditable || arrivalEditable,
    };
};
