import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import translation from "../../../../../../utils/translation";
import Icon from "../../../../../../components/Icon/Icon";
import EarlierStageWarning from "../../terminal-flow/EarlierStageWarning";
import { deploymentDocumentView, deploymentShareUpdate, deploymentStatusList, deploymentUpdatePickupDetails } from "../../../../../../redux/Slices/processing/ProcessingSlice";
import { isAdminUser, showSuccessOrError } from "../../../../../../services/commonService";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { isPickupNotRequiredStatus } from "../../terminal-flow/terminalFlowRules";
import { CR_PICKUP_REQUIRE } from "../../../../Contract/contractConstants";
import { CheckLine, FormGrid, NotRequiredNote, StageFooter, StagePanel, StagePanelHead, YesNo } from "../../../../../../components/Processing/newui/StagePanel";
import StageSendTemplate from "../../../../../../components/Processing/newui/StageSendTemplate";
import { SUB_STAGE_NOT_REQUIRED_CODE, isSubStageNotRequired } from "../../../processingConstants";
import { useIsProcessingContract } from "../../contractLifecycle";

const draftOf = (doc) => ({
    require_pickup: doc?.require_pickup || CR_PICKUP_REQUIRE.YES,
    send_er_reminder_prior_72_days: doc?.send_er_reminder_prior_72_days === 1,
    send_er_reminder_prior_24_days: doc?.send_er_reminder_prior_24_days === 1,
});

/**
 * Pick Up panel (prototype depPanel 'pickup'): Require Pick Up Yes / No autosaving; footer Share · Send Template · status
 * menu, plus End of Deployment once every other requirement is satisfied while Pick Up is Not Required (CT-04).
 * A Not Required pick-up cannot coexist with Require Pick Up = Yes (prototype pickupReq).
 */
const PickupTab = ({ statusList, onUpdateChangeStatus, deploymentDocument, stageActionPermission, canOfferActivation = false, onEndOfDeployment }) => {
    const { contract_id } = useParams();
    const dispatch = useDispatch();
    const { contractDetails } = useSelector((state) => state.contracts);
    const [draft, setDraft] = useState(draftOf(deploymentDocument));
    const [template, setTemplate] = useState(null);   /* { slug, statusKey } while the Send Template modal is open */
    const processing = useIsProcessingContract(contractDetails);
    const canEdit = processing && stageActionPermission.includes("edit");
    /* backend 281: Not Required = details read-only (values kept); a 409 SUB_STAGE_NOT_REQUIRED keeps the typed values through the reload */
    const locked = isSubStageNotRequired(deploymentDocument?.pickup_status);
    const canEditFields = canEdit && !locked;
    const menuRef = useRef(null);
    const pendingDraft = useRef(null);
    const requireYesBlocked = isPickupNotRequiredStatus(deploymentDocument?.pickup_status);

    useEffect(() => { setDraft(pendingDraft.current ? { ...draftOf(deploymentDocument), ...pendingDraft.current } : draftOf(deploymentDocument)); }, [deploymentDocument]);

    const save = useCallback((next) => {
        dispatch(deploymentUpdatePickupDetails({ ...next, contract_id })).then((res) => {
            showSuccessOrError(res);
            if (res.error && res.payload?.code === SUB_STAGE_NOT_REQUIRED_CODE) { pendingDraft.current = next; dispatch(deploymentDocumentView(contract_id)); return; }
            if (!res.error) { pendingDraft.current = null; }
            if (!res.error) { dispatch(deploymentDocumentView(contract_id)); dispatch(deploymentStatusList({ contract_id, type: "pickup" })); }
        });
    }, [dispatch, contract_id]);
    const commit = (patch) => { const next = { ...draft, ...patch }; setDraft(next); save(next); };
    const onRequire = (v) => {
        if (v === draft.require_pickup) return;
        if (v === CR_PICKUP_REQUIRE.YES && requireYesBlocked) { ShowToast("error", translation("key_cr_pickup_require_yes_blocked")); return; }
        commit({ require_pickup: v });
    };

    const openTemplate = (slug, statusKey) => { setTemplate({ slug, statusKey }); };
    const handleShare = useCallback((data) => {
        dispatch(deploymentShareUpdate({ contract_id, type: template?.statusKey, template_data: data })).then((res) => { showSuccessOrError(res); if (!res.error) dispatch(deploymentStatusList({ contract_id, type: "pickup" })); });
    }, [dispatch, contract_id, template?.statusKey]);

    return (
        <StagePanel locked={ !processing }>
            <StagePanelHead title={ translation("key_pick_up") } stage="pickup" status={ deploymentDocument?.pickup_status } updatedAt={ deploymentDocument?.pickup_updated_at ?? deploymentDocument?.pickup_last_status_updated_at } updatedBy={ deploymentDocument?.pickup_updated_by_info ?? deploymentDocument?.pickup_last_status_updated_name } utc={ Boolean(deploymentDocument?.pickup_updated_at) } />
            { locked && processing && <NotRequiredNote onChangeStatus={ () => menuRef.current?.open() } /> }
            <div className="g1-warn"><EarlierStageWarning deploymentDocument={ deploymentDocument } isProcessing={ processing } /></div>
            <FormGrid layout="pickup">
                <div className="g1-f">
                    <div className="lb" id="pk-rq-lb">{ translation("key_require_pick_up") }</div>
                    <YesNo value={ draft.require_pickup } yes={ CR_PICKUP_REQUIRE.YES } no={ CR_PICKUP_REQUIRE.NO } disabled={ !canEditFields } ariaLabelledBy="pk-rq-lb" onChange={ onRequire } />
                </div>
            </FormGrid>
            { /* U-0297: the two ER automatic reminder flags (72 h / 24 h) are specified Pickup fields (PROCESS §6.11; TPL §8 auto templates) — kept */ }
            <CheckLine id="pk-r72" checked={ draft.send_er_reminder_prior_72_days } disabled={ !canEditFields } label={ translation("key_send_er_automatic_reminder_72_hr") } onChange={ (v) => commit({ send_er_reminder_prior_72_days: v }) } />
            <CheckLine id="pk-r24" checked={ draft.send_er_reminder_prior_24_days } disabled={ !canEditFields } label={ translation("key_send_er_automatic_reminder_24_hr") } onChange={ (v) => commit({ send_er_reminder_prior_24_days: v }) } />
            {/* ruling Q8 (12 Nov): the footer sends Deployment Pickup (cat 70); the old slug `processing_deployment` names no category */}
            <StageFooter menuRef={ menuRef } stage="pickup" onSendTemplate={ () => openTemplate("processing_deployment_pickup", "") } canSendTemplate={ stageActionPermission.includes("send_template") || isAdminUser() }
                statusOptions={ statusList || [] } current={ deploymentDocument?.pickup_status } onChangeStatus={ onUpdateChangeStatus } canChangeStatus={ processing && (stageActionPermission.includes("change_status") || isAdminUser()) }>
                {/* U-0448 / F-07: the Pick Up share template lives in processing_deployment_share_pickup (cat 43) — the old slug pointed at an empty catalogue */}
                <button type="button" className="g1-btn" disabled={ !canEdit } data-fid="share-pickup" onClick={ () => openTemplate("processing_deployment_share_pickup", "pickup") }><Icon name="external" size={ 12 } strokeWidth={ 1.6 } />{ translation("key_share") }</button>
                { canOfferActivation && (
                    <button type="button" className="g1-btn primary" data-end-of-deployment-entry="" title={ translation("key_cr_end_of_deployment_ready_hint") } onClick={ onEndOfDeployment }>{ translation("key_end_of_deployment") }</button>
                ) }
            </StageFooter>

            { template && (
                <StageSendTemplate contractDetails={ contractDetails } slug={ template.slug } statusKey={ template.statusKey }
                    onClose={ () => setTemplate(null) } onSent={ (data) => { if (template.statusKey) handleShare(data); } } />
            ) }
        </StagePanel>
    );
};

PickupTab.propTypes = {
    statusList: PropTypes.array,
    onUpdateChangeStatus: PropTypes.func.isRequired,
    deploymentDocument: PropTypes.object,
    stageActionPermission: PropTypes.array.isRequired,
    /* every other applicable requirement is satisfied while Pick Up is Not Required: End of Deployment is offered here */
    canOfferActivation: PropTypes.bool,
    onEndOfDeployment: PropTypes.func,
};

export default React.memo(PickupTab);
