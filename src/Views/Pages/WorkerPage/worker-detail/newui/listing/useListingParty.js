import { useMemo } from "react";
import { useSelector } from "react-redux";

const sameId = (a, b) => a != null && b != null && String(a) === String(b);
const employerDisplayName = (employer) =>
    [employer?.name, employer?.surname].filter(Boolean).join(" ") || employer?.employer_name || "";

/**
 * The party a Worker / Employer record page is about, shaped for the create screens its Invoice and
 * Insurance tabs open with "New" — so the record's own worker / employer arrives preselected.
 *
 * - `invoiceState` is what both invoice create pages seed from `location.state`
 *   (`currentInvoiceWorker` / `currentInvoiceEmployer`, the same keys the Job Offer "New Contract Invoice" action sends).
 * - `insuranceState.party` is what the Insurance wizard resolves through its own party search
 *   (`{ worker: { id, name }, employer: { id, name } }`).
 *
 * The redux records are used only when they belong to the id on the page (a stale record from another
 * worker / employer is never preselected).
 */
const useListingParty = (worker_id, employer_id) => {
    const { workerProfileInfo, workerDetailTabInfo } = useSelector((state) => state.worker);
    const currentEmployer = useSelector((state) => state.employer.currentEmployer);

    return useMemo(() => {
        const worker = worker_id && sameId(workerProfileInfo?.id, worker_id)
            ? {
                ...(workerDetailTabInfo || {}),
                id: workerProfileInfo.id,
                worker_id: workerProfileInfo.id,
                name: workerProfileInfo.fullname || workerDetailTabInfo?.name || "",
                reference_id: workerProfileInfo.reference_id,
                type: workerProfileInfo.type,
                nationality: workerProfileInfo.nationality ?? workerDetailTabInfo?.nationality,
            }
            : null;
        const employerId = currentEmployer?.employer_id ?? currentEmployer?.id;
        const employer = employer_id && sameId(employerId, employer_id)
            ? { ...currentEmployer, id: employerId, employer_id: employerId }
            : null;

        const invoiceState = {
            ...(worker && { currentInvoiceWorker: worker }),
            ...(employer && { currentInvoiceEmployer: employer }),
        };
        const party = {
            ...(worker && { worker: { id: worker.id, name: worker.name } }),
            ...(employer && { employer: { id: employerId, name: employerDisplayName(employer) } }),
        };
        return {
            invoiceState: Object.keys(invoiceState).length ? invoiceState : undefined,
            insuranceState: Object.keys(party).length ? { party } : undefined,
        };
    }, [worker_id, employer_id, workerProfileInfo, workerDetailTabInfo, currentEmployer]);
};

export default useListingParty;
