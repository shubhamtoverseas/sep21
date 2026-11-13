import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import DHLContractTab from "./dhl-contract-tab/DHLContractTab";
import HkidTab from "./hkid-tab/HkidTab";
import PickupTab from "./pickup-tab/PickupTab";
import FlightDetailsTab from "./flight-details-tab/FlightDetailsTab";
import ProcessingMedicalTab from "../medical-tab/ProcessingMedicalTab";
import EarlierStageWarning from "../terminal-flow/EarlierStageWarning";
import { activateProcessingGroup1And2, deploymentChangeStatus, deploymentDocumentView, deploymentStatusList } from "../../../../../redux/Slices/processing/ProcessingSlice";
import { fetchContractDetailsById } from "../../../../../redux/Slices/contract/ContractSlice";
import { showSuccessOrError } from "../../../../../services/commonService";
import translation from "../../../../../utils/translation";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { SubTabs } from "../../../../../components/Processing/newui/StagePanel";
import { stageToken } from "../../../../../components/Processing/StageTitle";
import { DEPLOYMENT_SUBS } from "../../processingConstants";
import { CR_PICKUP_REQUIRE } from "../../../Contract/contractConstants";
import TerminalDateDialog from "../terminal-flow/TerminalDateDialog";
import PickupGuardDialog from "../terminal-flow/PickupGuardDialog";
import PickupNotRequiredDialog from "../terminal-flow/PickupNotRequiredDialog";
import useTerminalActivation from "../terminal-flow/useTerminalActivation";
import { TERMINAL_FLOW_VARIANT } from "../terminal-flow/terminalFlowConfig";
import {
    canRunTerminalFlow,
    getGroup1Or2OutstandingBeforePickup,
    getRecordedVisaExpiry,
    getRetainedArrivalDate,
    isPickupNotRequiredStatus,
    isPickupTerminalStatus,
} from "../terminal-flow/terminalFlowRules";
import { useIsProcessingContract } from "../contractLifecycle";

const readPath = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);

/**
 * Deployment stage (prototype depSubTabs + depPanel): the five sub-stage pills (dot = sub-stage status tone) and one
 * panel for the selected sub-stage. Later sub-stages are never locked behind earlier ones (Contract #4/#19); the Pick Up
 * guard surfaces outstanding work. The End of Deployment flow (S7) is unchanged.
 */
const ProcessingDeploymentTab = ({ stageActionPermission, isChangeStatusPermission, reloadGlobalActivityList }) => {
    const dispatch = useDispatch();
    const { contract_id } = useParams();
    const [activeTab, setActiveTab] = useState(DEPLOYMENT_SUBS[0].key);
    const [pendingPickupStatus, setPendingPickupStatus] = useState(null);   /* a status id, or null; the End of Deployment dialog is open while set */
    const [outstandingLabelKeys, setOutstandingLabelKeys] = useState(null);
    const [guardTarget, setGuardTarget] = useState(null);                   /* the Pick Up status the guard refused */
    const [notRequiredBlocked, setNotRequiredBlocked] = useState(false);      /* Not Required asked while Require Pick Up = Yes */
    const { deploymentStatuses: deploymentStatusOptions, deploymentDocument, processingDetails } = useSelector((state) => state.processing);
    const { contractDetails } = useSelector((state) => state.contracts);

    const canCompleteDeployment = canRunTerminalFlow({ stageActionPermission, isChangeStatusPermission });

    /* Terminal Pick Up options are withdrawn from users without the End of Deployment permission composition. */
    const deploymentStatuses = useMemo(() => {
        if (!Array.isArray(deploymentStatusOptions)) return deploymentStatusOptions;
        return deploymentStatusOptions.filter((item) => canCompleteDeployment || activeTab !== "pickup" || !isPickupTerminalStatus(item?.id));
    }, [deploymentStatusOptions, canCompleteDeployment, activeTab]);

    useEffect(() => { if (activeTab !== "medical") dispatch(deploymentStatusList({ contract_id, type: activeTab })); }, [activeTab, contract_id, dispatch]);
    useEffect(() => { dispatch(deploymentDocumentView(contract_id)); }, [contract_id, dispatch]);

    const refreshDeployment = useCallback(async (tab) => {
        await Promise.all([
            dispatch(deploymentStatusList({ contract_id, type: tab })),
            dispatch(fetchContractDetailsById(contract_id)),
            dispatch(deploymentDocumentView(contract_id)),
        ]);
        if (reloadGlobalActivityList) reloadGlobalActivityList();
    }, [dispatch, contract_id, reloadGlobalActivityList]);
    const refreshDocument = useCallback(() => { dispatch(deploymentDocumentView(contract_id)); }, [dispatch, contract_id]);

    const handlePickupCompleted = useCallback(() => refreshDeployment("pickup"), [refreshDeployment]);
    const { isSubmitting, submit } = useTerminalActivation(handlePickupCompleted);

    const requireLabel = translation(deploymentDocument?.require_pickup === CR_PICKUP_REQUIRE.NO ? "key_no" : "key_yes");
    const requestPickupCompletion = useCallback((statusId) => {
        if (!canCompleteDeployment) return;
        /* prototype pickupNotRequiredBlocked: Not Required is valid only when Require Pick Up is No */
        if (isPickupNotRequiredStatus(statusId) && deploymentDocument?.require_pickup !== CR_PICKUP_REQUIRE.NO) { setNotRequiredBlocked(true); return; }
        const outstanding = getGroup1Or2OutstandingBeforePickup(contractDetails, deploymentDocument);
        if (outstanding.length) {
            setGuardTarget(statusId);
            setOutstandingLabelKeys(outstanding);
            return;
        }
        setPendingPickupStatus(statusId);
    }, [canCompleteDeployment, contractDetails, deploymentDocument]);
    /* CT-04: End of Deployment stays reachable when Pick Up started Not Required — offered from the Pick Up panel once every
       other applicable requirement is satisfied (prototype v28ActivationReady); it activates through the activation command */
    const pickupNotRequired = isPickupNotRequiredStatus(deploymentDocument?.pickup_status);
    const isProcessing = useIsProcessingContract(contractDetails);
    const canOfferActivation = canCompleteDeployment && isProcessing && pickupNotRequired
        && getGroup1Or2OutstandingBeforePickup(contractDetails, deploymentDocument).length === 0;
    const offerActivation = useCallback(() => { if (canOfferActivation) setPendingPickupStatus(deploymentDocument?.pickup_status); }, [canOfferActivation, deploymentDocument?.pickup_status]);

    const handleUpdateChangeStatus = useCallback(async (id) => {
        if (activeTab === "pickup" && isPickupTerminalStatus(id)) {
            requestPickupCompletion(id);
            return;
        }
        try {
            const res = await dispatch(deploymentChangeStatus({ contract_id, type: activeTab, status: id }));
            showSuccessOrError(res);
            if (!res.error) await refreshDeployment(activeTab);
        } catch {
            ShowToast("error", translation("key_something_went_wrong"));
        }
    }, [activeTab, contract_id, dispatch, refreshDeployment, requestPickupCompletion]);

    const handleConfirmEndOfDeployment = useCallback(async (arrivalDate) => {
        /* a Pick Up already recorded Not Required is not changed again: the activation command alone (TERMINAL §2) */
        const unchanged = pendingPickupStatus === deploymentDocument?.pickup_status;
        const isSuccess = await submit(unchanged
            ? activateProcessingGroup1And2({ contract_id, arrival_date: arrivalDate })
            : deploymentChangeStatus({ contract_id, type: "pickup", status: pendingPickupStatus, arrival_date: arrivalDate }));
        if (isSuccess) setPendingPickupStatus(null);
    }, [submit, contract_id, pendingPickupStatus, deploymentDocument?.pickup_status]);

    const handleCloseEndOfDeployment = useCallback(() => setPendingPickupStatus(null), []);
    const handleCloseGuard = useCallback(() => { setOutstandingLabelKeys(null); setGuardTarget(null); }, []);
    const handleCloseNotRequiredBlocked = useCallback(() => setNotRequiredBlocked(false), []);

    const tabs = useMemo(() => DEPLOYMENT_SUBS.map((s) => ({ key: s.key, label: translation(s.labelKey), tone: stageToken(s.key, readPath(deploymentDocument, s.statusField)).tone })), [deploymentDocument]);

    const sharedProps = { statusList: deploymentStatuses, onUpdateChangeStatus: handleUpdateChangeStatus, deploymentDocument, stageActionPermission };
    const panels = {
        dhl_contract: <DHLContractTab { ...sharedProps } reloadGlobalActivityList={ reloadGlobalActivityList } />,
        flight_details: <FlightDetailsTab { ...sharedProps } />,
        hkid: <HkidTab { ...sharedProps } />,
        medical: <ProcessingMedicalTab processingDetails={ processingDetails || {} } contractDetails={ contractDetails } stageActionPermission={ stageActionPermission } reloadGlobalActivityList={ reloadGlobalActivityList }
            templateSlug="processing_deployment_medical" shareSlug="processing_deployment_share_medical" title={ translation("key_medical") } onChanged={ refreshDocument }
            warning={ <EarlierStageWarning deploymentDocument={ deploymentDocument } isProcessing={ isProcessing } /> } />,
        pickup: <PickupTab { ...sharedProps } canOfferActivation={ canOfferActivation } onEndOfDeployment={ offerActivation } />,
    };

    return (
        <div className="g1-stack">
            { pendingPickupStatus && (
                <TerminalDateDialog
                    variant={ TERMINAL_FLOW_VARIANT.END_OF_DEPLOYMENT }
                    initialDate={ getRetainedArrivalDate(contractDetails, deploymentDocument) }
                    visaExpiry={ getRecordedVisaExpiry(contractDetails) }
                    isSubmitting={ isSubmitting }
                    onConfirm={ handleConfirmEndOfDeployment }
                    onClose={ handleCloseEndOfDeployment }
                    note={ isPickupNotRequiredStatus(pendingPickupStatus) ? translation("key_cr_pickup_not_required_dialog_note").replace("{value}", requireLabel) : undefined }
                />
            ) }
            { outstandingLabelKeys && (
                <PickupGuardDialog outstandingLabelKeys={ outstandingLabelKeys } titleKey={ isPickupNotRequiredStatus(guardTarget) ? "key_cr_pickup_cannot_be_marked_not_required_yet" : undefined } onClose={ handleCloseGuard } />
            ) }
            { notRequiredBlocked && <PickupNotRequiredDialog requireLabel={ requireLabel } onClose={ handleCloseNotRequiredBlocked } /> }
            <SubTabs tabs={ tabs } active={ activeTab } onSelect={ setActiveTab } ariaLabel={ translation("key_deployment") } />
            { panels[activeTab] }
        </div>
    );
};

ProcessingDeploymentTab.propTypes = {
    stageActionPermission: PropTypes.array.isRequired,
    isChangeStatusPermission: PropTypes.bool,
    reloadGlobalActivityList: PropTypes.func,
};

export default React.memo(ProcessingDeploymentTab);
