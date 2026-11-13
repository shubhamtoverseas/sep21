import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import translation from "../../../../../../utils/translation";
import DateInput from "../../../../../../components/ui/DateInput";
import { fetchActiveBranches } from "../../../../../../redux/Slices/settings/branches/BranchesSlice";
import { deploymentDocumentView, deploymentStatusList, deploymentUpdateHKIDDetails } from "../../../../../../redux/Slices/processing/ProcessingSlice";
import { isAdminUser, showSuccessOrError } from "../../../../../../services/commonService";
import EarlierStageWarning from "../../terminal-flow/EarlierStageWarning";
import { Fld, FormGrid, NotRequiredNote, StageFooter, StagePanel, StagePanelHead } from "../../../../../../components/Processing/newui/StagePanel";
import StageSendTemplate from "../../../../../../components/Processing/newui/StageSendTemplate";
import { DEPLOYMENT_TYPED_FIELDS, HKID_BRING_BACK_OTHER, HKID_SCHEDULE, SUB_STAGE_NOT_REQUIRED_CODE, isSubStageNotRequired } from "../../../processingConstants";
import { withFocusedText } from "../draftSync";
import { useIsProcessingContract } from "../../contractLifecycle";

const DISPLAY = "DD/MM/YYYY";
const draftOf = (doc) => ({
    schedule_hkid_appointment: doc?.schedule_hkid_appointment || HKID_SCHEDULE.NO,
    hkid_requested_date: doc?.hkid_requested_date || "",
    branch_id: doc?.branch_id || "",
    other_branch: doc?.other_branch || "",
});

/**
 * HKID panel (prototype depPanel 'hkid' + v210HkidSchedule): Schedule HKID Appointment Yes / No; with Yes the Requested
 * Date, the Arrival Date read from Flight Details, Bring Back To (host branches + Other) and Please specify for Other.
 * No hides the appointment inputs and keeps their values (C-09). Other = no branch_id + the typed other_branch
 * (PROCESS.md §6.10; stored shape unchanged). Logic unchanged: deploymentUpdateHKIDDetails + refresh.
 */
const HkidTab = ({ statusList, onUpdateChangeStatus, deploymentDocument, stageActionPermission }) => {
    const dispatch = useDispatch();
    const { contract_id } = useParams();
    const { contractDetails } = useSelector((state) => state.contracts);
    const { currentActiveBranches } = useSelector((state) => state.branches);
    const [draft, setDraft] = useState(draftOf(deploymentDocument));
    const [otherBranch, setOtherBranch] = useState(false);
    const [template, setTemplate] = useState(null);   /* { slug, statusKey } while the Send Template modal is open */
    const processing = useIsProcessingContract(contractDetails);
    const canEdit = processing && stageActionPermission.includes("edit");
    /* backend 281: Not Required = details read-only (values kept); a 409 SUB_STAGE_NOT_REQUIRED keeps the typed values through the reload */
    const locked = isSubStageNotRequired(deploymentDocument?.hkid_status);
    const canEditFields = canEdit && !locked;
    const menuRef = useRef(null);
    const pendingDraft = useRef(null);
    const hasAppointment = draft.schedule_hkid_appointment === HKID_SCHEDULE.YES;

    useEffect(() => { dispatch(fetchActiveBranches({ status: 1, type: "host" })); }, [dispatch]);
    /* Priyanka 9 Nov: a refresh never takes the user out of a locally chosen "Other" (its save only goes out on the
       specify input's blur) — otherBranch resets only when a host branch is picked in onBringBack */
    useEffect(() => { setDraft((prev) => withFocusedText(pendingDraft.current ? { ...draftOf(deploymentDocument), ...pendingDraft.current } : draftOf(deploymentDocument), prev, DEPLOYMENT_TYPED_FIELDS.hkid)); setOtherBranch((prev) => prev || Boolean(deploymentDocument && !deploymentDocument.branch_id && deploymentDocument.other_branch)); }, [deploymentDocument]);

    const save = useCallback((next) => {
        /* N-10: `hkid_arrival_date` mirrors the Flight arrival server-side and is never sent */
        dispatch(deploymentUpdateHKIDDetails({ ...next, contract_id, hkid_requested_date: next.hkid_requested_date || "" })).then((res) => {
            showSuccessOrError(res);
            if (res.error && res.payload?.code === SUB_STAGE_NOT_REQUIRED_CODE) { pendingDraft.current = next; dispatch(deploymentDocumentView(contract_id)); return; }
            if (!res.error) { pendingDraft.current = null; }
            if (!res.error) { dispatch(deploymentDocumentView(contract_id)); dispatch(deploymentStatusList({ contract_id, type: "hkid" })); }
        });
    }, [dispatch, contract_id]);
    const commit = (patch) => { const next = { ...draft, ...patch }; setDraft(next); save(next); };
    const onBringBack = (v) => {
        if (v === HKID_BRING_BACK_OTHER) {
            /* Priyanka 9 Nov: choosing Other saves NOTHING — the save goes out on the specify input's blur
               (branch_id "", other_branch = typed text); saving here raced the reload and blanked the select */
            setOtherBranch(true);
            setDraft((d) => ({ ...d, branch_id: "" }));
        } else { setOtherBranch(false); commit({ branch_id: v, other_branch: "" }); }
    };

    const openSendTemplate = () => { setTemplate({ slug: "processing_deployment_hkid", statusKey: "" }); };

    const arrivalIso = deploymentDocument?.hkid_arrival_date || deploymentDocument?.arrival_date;
    const arrival = arrivalIso ? dayjs(arrivalIso).format(DISPLAY) : "";
    return (
        <StagePanel locked={ !processing }>
            <StagePanelHead title={ translation("key_hkid") } stage="hkid" status={ deploymentDocument?.hkid_status } updatedAt={ deploymentDocument?.hkid_updated_at ?? deploymentDocument?.hkid_last_status_updated_at } updatedBy={ deploymentDocument?.hkid_updated_by_info ?? deploymentDocument?.hkid_last_status_updated_name } utc={ Boolean(deploymentDocument?.hkid_updated_at) } />
            { locked && processing && <NotRequiredNote onChangeStatus={ () => menuRef.current?.open() } /> }
            <div className="g1-warn"><EarlierStageWarning deploymentDocument={ deploymentDocument } isProcessing={ processing } /></div>
            <FormGrid layout={ hasAppointment ? "hkid" : "hkid-no" }>
                <Fld id="hk-sc" label={ translation("key_schedule_hkid_appointment") }>
                    <select id="hk-sc" className="g1-in" value={ draft.schedule_hkid_appointment } disabled={ !canEditFields } onChange={ (e) => commit({ schedule_hkid_appointment: e.target.value }) }>
                        <option value={ HKID_SCHEDULE.YES }>{ translation("key_yes") }</option>
                        <option value={ HKID_SCHEDULE.NO }>{ translation("key_no") }</option>
                    </select>
                </Fld>
                { hasAppointment && (
                    <>
                        <Fld id="hk-rq" label={ translation("key_requested_date") }>
                            <DateInput id="hk-rq" value={ draft.hkid_requested_date } disabled={ !canEditFields } className="mcdt-datewrap" onChange={ (v) => commit({ hkid_requested_date: v }) } />
                        </Fld>
                        <div className="g1-f" data-hkid-arrival="">
                            <div className="lb">{ translation("key_arrival_date") }</div>
                            <div className={ `vl${ arrival ? "" : " empty" }` }>{ arrival || "—" }</div>
                            <div className="cap">{ translation("key_cr_from_flight_details") }</div>
                        </div>
                        <Fld id="hk-bb" label={ translation("key_bring_back_to") }>
                            <select id="hk-bb" className="g1-in" value={ otherBranch ? HKID_BRING_BACK_OTHER : draft.branch_id } disabled={ !canEditFields } onChange={ (e) => onBringBack(e.target.value) }>
                                <option value="">{ translation("key_please_select") }</option>
                                { currentActiveBranches?.map((b) => <option key={ b.id } value={ b.id }>{ b.branch_name }</option>) }
                                <option value={ HKID_BRING_BACK_OTHER }>{ translation("key_other") }</option>
                            </select>
                        </Fld>
                        { otherBranch && (
                            <Fld id="hk-sp" label={ translation("key_other_specify") }>
                                <input id="hk-sp" className="g1-in" value={ draft.other_branch } disabled={ !canEditFields } onChange={ (e) => setDraft((d) => ({ ...d, other_branch: e.target.value })) }
                                    onBlur={ (e) => { if (e.target.value !== (deploymentDocument?.other_branch || "")) commit({ other_branch: e.target.value }); } } />
                            </Fld>
                        ) }
                    </>
                ) }
            </FormGrid>
            { !hasAppointment && deploymentDocument?.hkid_requested_date && (
                <div className="g1-note" data-hkid-earlier-request="">{ translation("key_cr_hkid_earlier_requested_kept").replace("{date}", dayjs(deploymentDocument.hkid_requested_date).format(DISPLAY)) }</div>
            ) }
            <StageFooter menuRef={ menuRef } stage="hkid" onSendTemplate={ openSendTemplate } canSendTemplate={ stageActionPermission.includes("send_template") || isAdminUser() }
                statusOptions={ statusList || [] } current={ deploymentDocument?.hkid_status } onChangeStatus={ onUpdateChangeStatus } canChangeStatus={ processing && (stageActionPermission.includes("change_status") || isAdminUser()) } />

            { template && (
                <StageSendTemplate contractDetails={ contractDetails } slug={ template.slug } statusKey={ template.statusKey }
                    onClose={ () => setTemplate(null) } />
            ) }
        </StagePanel>
    );
};

HkidTab.propTypes = {
    statusList: PropTypes.array,
    onUpdateChangeStatus: PropTypes.func.isRequired,
    deploymentDocument: PropTypes.object,
    stageActionPermission: PropTypes.array.isRequired,
};

export default React.memo(HkidTab);
