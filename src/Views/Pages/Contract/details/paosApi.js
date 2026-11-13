import { paosDetailsAPI, paosRosterAPI, paosSaveAPI } from "../../../../services/processings";

/**
 * PAOS data access (CT-06): `GET /processing/global/paos/:contract_id` → { applicable, phase, action, next[], case, history[] },
 * `POST /processing/global/paos-save`, `POST /processing/global/paos-roster`. Every call resolves to { ok, message, data }.
 */
const unwrap = async (request) => {
    try {
        const response = await request;
        const body = response?.data || {};
        return { ok: Boolean(body.status), message: body.message, data: body.data };
    } catch (error) {
        const body = error?.response?.data || {};
        return { ok: false, message: body.message || error?.message, data: body.data };
    }
};

export const loadPaos = (contractId) => unwrap(paosDetailsAPI(contractId));
export const savePaos = (payload) => unwrap(paosSaveAPI(payload));
export const loadPaosRoster = (payload) => unwrap(paosRosterAPI(payload));
