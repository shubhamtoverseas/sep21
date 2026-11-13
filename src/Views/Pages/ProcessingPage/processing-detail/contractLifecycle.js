import { createContext, useContext } from "react";
import { CONTRACT_STATUS } from "../processingConstants";

/*
 * One lifecycle for the Contract record (Mubin, contract 20, 3 Nov 2026). The record header reads `contract_status` from the
 * dashboard row, while the stage panels used to read `status` from GET /contract/global/details/:id; a contract created
 * through Add Contract / Invoice carried the two apart, so the header said Processing and every panel was locked.
 * ProgressTab provides the header's value; a stage panel reads it with useContractLifecycle(), and outside the provider
 * (or until the row has loaded) it falls back to the details record — `contract_status`, then `status`.
 */
export const ContractLifecycleContext = createContext(null);

const toId = (value) => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

/** the lifecycle id (CONTRACT_STATUS.*) — an explicit value first, then the record's `contract_status`, then its `status` */
export const lifecycleOf = (contractDetails, override) => (
    toId(override) ?? toId(contractDetails?.contract_status) ?? toId(contractDetails?.status)
);

export const isProcessingLifecycle = (contractDetails, override) => lifecycleOf(contractDetails, override) === CONTRACT_STATUS.PROCESSING;

export const useContractLifecycle = (contractDetails) => lifecycleOf(contractDetails, useContext(ContractLifecycleContext));

export const useIsProcessingContract = (contractDetails) => useContractLifecycle(contractDetails) === CONTRACT_STATUS.PROCESSING;
