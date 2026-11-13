import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import translation from "../../../../../utils/translation";
import { activateProcessing, activateProcessingGroup1And2 } from "../../../../../redux/Slices/processing/ProcessingSlice";
import TerminalDateDialog from "./TerminalDateDialog";
import TerminalFlowRecoveryBar from "./TerminalFlowRecoveryBar";
import useTerminalActivation from "./useTerminalActivation";
import { E_VISA_PAYMENT_DATE_REASON_CODE, TERMINAL_FLOW_COPY, TERMINAL_FLOW_VARIANT } from "./terminalFlowConfig";
import {
    areGroup1Or2PrerequisitesMet,
    areGroup3Or4PrerequisitesMet,
    canRunTerminalFlow,
    getRecordedVisaExpiry,
    getRetainedArrivalDate,
    getRetainedVisaReleaseDate,
    isGroup1Or2,
    isGroup3Or4,
    isProcessingContract,
} from "./terminalFlowRules";
import { useContractLifecycle } from "../contractLifecycle";

const resolveVariant = (group) => {
    if (isGroup1Or2(group)) return TERMINAL_FLOW_VARIANT.END_OF_DEPLOYMENT;
    if (isGroup3Or4(group)) return TERMINAL_FLOW_VARIANT.END_OF_PROCESSING;
    return null;
};

/**
 * Record-level terminal flow. Opens automatically only when the record crosses into the terminal state
 * during this visit; otherwise (initial load, after Cancel) the recovery bar reopens it.
 */
const ContractTerminalFlow = ({ contractId, contractDetails, stageActionPermission, isChangeStatusPermission, onActivated }) => {
    const variant = resolveVariant(contractDetails?.processing_group);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [reasonError, setReasonError] = useState("");
    const previousReachableRef = useRef(null);
    const { isSubmitting, submit } = useTerminalActivation(onActivated);

    const lifecycle = useContractLifecycle(contractDetails);
    const isReachable = useMemo(() => {
        if (!variant || !isProcessingContract(contractDetails, lifecycle)) return false;
        if (!canRunTerminalFlow({ stageActionPermission, isChangeStatusPermission })) return false;
        return variant === TERMINAL_FLOW_VARIANT.END_OF_DEPLOYMENT
            ? areGroup1Or2PrerequisitesMet(contractDetails)
            : areGroup3Or4PrerequisitesMet(contractDetails);
    }, [variant, contractDetails, lifecycle, stageActionPermission, isChangeStatusPermission]);

    useEffect(() => {
        if (previousReachableRef.current === false && isReachable) setIsDialogOpen(true);
        if (!isReachable) setIsDialogOpen(false);
        previousReachableRef.current = isReachable;
    }, [isReachable]);

    const initialDate = useMemo(() => (
        variant === TERMINAL_FLOW_VARIANT.END_OF_DEPLOYMENT
            ? getRetainedArrivalDate(contractDetails)
            : getRetainedVisaReleaseDate(contractDetails)
    ), [variant, contractDetails]);

    const visaExpiry = useMemo(() => getRecordedVisaExpiry(contractDetails), [contractDetails]);
    /* U-0171 / backend 301: a recorded E-Visa Payment Date may be changed here — the change is a correction and carries a reason */
    const reasonOnChange = variant === TERMINAL_FLOW_VARIANT.END_OF_PROCESSING && Boolean(initialDate);

    const handleOpen = useCallback(() => setIsDialogOpen(true), []);
    const handleClose = useCallback(() => { setIsDialogOpen(false); setReasonError(""); }, []);

    const handleConfirm = useCallback(async (dateIso, reason) => {
        setReasonError("");
        const action = variant === TERMINAL_FLOW_VARIANT.END_OF_DEPLOYMENT
            ? activateProcessingGroup1And2({ contract_id: contractId, arrival_date: dateIso })
            : activateProcessing({ contract_id: contractId, e_visa_payment_date: dateIso, ...(reason ? { reason } : {}) });
        const result = await submit(action);
        if (result.ok) { setIsDialogOpen(false); return; }
        if (result.code === E_VISA_PAYMENT_DATE_REASON_CODE) setReasonError(result.message || translation("key_cr_required_when_date_changes"));
    }, [variant, contractId, submit]);

    if (!isReachable) return null;

    return (
        <>
            { !isDialogOpen && (
                <TerminalFlowRecoveryBar
                    actionLabel={ translation(TERMINAL_FLOW_COPY[variant].titleKey) }
                    onOpen={ handleOpen }
                />
            ) }
            { isDialogOpen && (
                <TerminalDateDialog
                    variant={ variant }
                    initialDate={ initialDate }
                    visaExpiry={ visaExpiry }
                    isSubmitting={ isSubmitting }
                    onConfirm={ handleConfirm }
                    onClose={ handleClose }
                    reasonOnChange={ reasonOnChange }
                    reasonError={ reasonError }
                />
            ) }
        </>
    );
};

ContractTerminalFlow.propTypes = {
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    contractDetails: PropTypes.object,
    stageActionPermission: PropTypes.arrayOf(PropTypes.string),
    isChangeStatusPermission: PropTypes.bool,
    onActivated: PropTypes.func,
};

export default React.memo(ContractTerminalFlow);
