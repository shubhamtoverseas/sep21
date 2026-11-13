import {
    processingVisaExpiryUpdateAPI,
    processingVisaExpiryHistoryAPI,
} from "../../services/processings";
import { contractVisaExpiryUpdateAPI, contractVisaExpiryHistoryAPI, contractVisaFieldCorrectionAPI, contractVisaIssuanceHistoryAPI } from "../../services/contracts";
import { processingVisaIssuanceHistoryAPI } from "../../services/processings";

/**
 * Excel Contract No. 8 / 22 — one Visa Expiry editor per contract phase.
 *   processing → E-Visa Edit (processing service)
 *   active     → Details → Visa, Record / Update Visa Expiry (contract service)
 * Completed and Cancelled contracts have no editor (callers do not render one).
 */
export const VISA_EXPIRY_SURFACE = Object.freeze({
    PROCESSING: "processing",
    ACTIVE: "active",
});

const unwrap = async (request) => {
    try {
        const response = await request;
        const body = response?.data || {};
        return { ok: Boolean(body.status), message: body.message, code: body.code, data: body.data };
    } catch (error) {
        const body = error?.response?.data || {};
        return { ok: false, message: body.message || error?.message, code: body.code, data: body.data };
    }
};

export const saveVisaExpiry = (surface, payload) =>
    unwrap(surface === VISA_EXPIRY_SURFACE.ACTIVE
        ? contractVisaExpiryUpdateAPI(payload)
        : processingVisaExpiryUpdateAPI(payload));

/* B-3 / N-7 (Active only): one correction of Visa Ref No · E-Visa Payment Date · Entry Visa Expiry on the latest issuance */
export const correctVisaField = (payload) => unwrap(contractVisaFieldCorrectionAPI(payload));

export const loadVisaExpiryHistory = (surface, contractId) =>
    unwrap(surface === VISA_EXPIRY_SURFACE.ACTIVE
        ? contractVisaExpiryHistoryAPI(contractId)
        : processingVisaExpiryHistoryAPI(contractId));

/** S1: visa issuance history — every issuance version with its original values and ordered corrections. */
export const loadVisaIssuanceHistory = (surface, contractId) =>
    unwrap(surface === VISA_EXPIRY_SURFACE.ACTIVE
        ? contractVisaIssuanceHistoryAPI(contractId)
        : processingVisaIssuanceHistoryAPI(contractId));
