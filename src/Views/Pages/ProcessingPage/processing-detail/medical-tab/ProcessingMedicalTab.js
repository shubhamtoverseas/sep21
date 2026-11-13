import React, { useCallback, useEffect, useRef, useState } from "react";
import { PropTypes } from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import DateInput from "../../../../../components/ui/DateInput";
import { fetchMedicalList } from "../../../../../redux/Slices/settings/medical/MedicalSlice";
import { deploymentShareUpdate, fetchMedicalDocumentStatusList, medicalDocumentDelete, medicalDocumentSave, medicalDocumentStatusChange, medicalDocumentView } from "../../../../../redux/Slices/processing/ProcessingSlice";
import { fetchContractDetailsById } from "../../../../../redux/Slices/contract/ContractSlice";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { PROCESSING_FILE_UPLOAD_SIZE_LIMIT } from "../../../../../components/ReusableComponents/constants";
import { isAdminUser, showSuccessOrError, uploadFile } from "../../../../../services/commonService";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import useWithdrawnCompletingOptions from "../terminal-flow/useWithdrawnCompletingOptions";
import { FileTile, Fld, FormGrid, NotRequiredNote, StageFooter, StagePanel, StagePanelHead } from "../../../../../components/Processing/newui/StagePanel";
import StageSendTemplate from "../../../../../components/Processing/newui/StageSendTemplate";
import { PROCESSING_MEDICAL_ACCEPT, SUB_STAGE_NOT_REQUIRED_CODE, isSubStageNotRequired } from "../../processingConstants";
import { useIsProcessingContract } from "../contractLifecycle";

const EMPTY = { medical_clinic_id: "", coupon_code: "", coupon_provided_date: "", file_path: "" };
const draftOf = (doc) => ({ medical_clinic_id: doc?.medical_clinic_id || "", coupon_code: doc?.coupon_code || "", coupon_provided_date: doc?.coupon_provided_date || "", file_path: doc?.file_path || "" });

/**
 * Medical stage panel (Groups 3 / 4; prototype depPanel 'medical' layout): Medical Clinic · Coupon Code · Check Up Date
 * (Groups 1 / 2) or Coupon Shared (Groups 3 / 4) autosaving on change, the Medical Report file tile once the stage has
 * started, footer Send Template · status menu. Logic unchanged: medicalDocumentSave / View / StatusList / Delete.
 */
/* `title`: the Groups 3 / 4 stage is "HK Medical" (PROCESS §6.6, U-0279); Deployment reuses the panel as "Medical" */
const ProcessingMedicalTab = ({ processingDetails, contractDetails, stageActionPermission, reloadGlobalActivityList, templateSlug = "processing_medical", title, shareSlug, warning, onChanged }) => {
    const dispatch = useDispatch();
    const { contract_id } = useParams();
    const { medicalList = [] } = useSelector((state) => state.medical);
    const { medicalDocument, medicalDocumentStatusList } = useSelector((state) => state.processing);
    const statusOptions = useWithdrawnCompletingOptions("medical", medicalDocumentStatusList);
    const [draft, setDraft] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [fileBusy, setFileBusy] = useState(false);
    const [template, setTemplate] = useState(null);   /* { slug, statusKey } while the Send Template modal is open */
    const processing = useIsProcessingContract(contractDetails);
    const canEdit = processing && stageActionPermission.includes("edit");
    /* backend 281: Not Required = details read-only (values kept); a 409 SUB_STAGE_NOT_REQUIRED keeps the typed values through the reload */
    const locked = isSubStageNotRequired(medicalDocument?.status);
    const canEditFields = canEdit && !locked;
    const menuRef = useRef(null);
    const pendingDraft = useRef(null);

    useEffect(() => {
        if (!contract_id) return;
        setLoading(true);
        Promise.all([dispatch(fetchMedicalList()), dispatch(medicalDocumentView(contract_id)), dispatch(fetchMedicalDocumentStatusList(contract_id))])
            .catch(() => ShowToast("error", translation("key_something_went_wrong")))
            .finally(() => setLoading(false));
    }, [dispatch, contract_id]);
    useEffect(() => { if (!loading) { setDraft(pendingDraft.current ? { ...draftOf(medicalDocument), ...pendingDraft.current } : draftOf(medicalDocument)); } }, [medicalDocument, loading]);

    const refresh = useCallback(() => { dispatch(medicalDocumentView(contract_id)); dispatch(fetchMedicalDocumentStatusList(contract_id)); onChanged?.(); }, [dispatch, contract_id, onChanged]);
    /* a field commits on change / blur (the panel autosaves — PROCESS §6: no Save button on Medical) */
    const save = useCallback((next, filePath) => {
        if (!(next.medical_clinic_id || next.coupon_code || next.coupon_provided_date || next.file_path || filePath)) return;
        dispatch(medicalDocumentSave({ ...next, ...(filePath !== undefined ? { file_path: filePath } : {}), contract_id })).then((res) => {
            showSuccessOrError(res);
            if (res.error && res.payload?.code === SUB_STAGE_NOT_REQUIRED_CODE) { pendingDraft.current = next; dispatch(medicalDocumentView(contract_id)); return; }
            if (!res.error) { pendingDraft.current = null; refresh(); }
        });
    }, [dispatch, contract_id, refresh]);
    const commit = (key, value) => { const next = { ...draft, [key]: value }; setDraft(next); save(next); };

    const onFile = async (file) => {
        if (file.size > PROCESSING_FILE_UPLOAD_SIZE_LIMIT) { ShowToast("error", translation("key_please_upload_file_smaller_than_5mb")); return; }
        try {
            setFileBusy(true);
            const res = await uploadFile([{ file, name: "processing/medical" }]);
            if (!res?.filename) { ShowToast("error", translation("key_failed_to_upload_file")); return; }
            save({ ...draft, file_path: res.filename }, res.filename);
        } catch (e) { ShowToast("error", e?.message || translation("key_failed_to_upload_file")); }
        finally { setFileBusy(false); }
    };
    const onRemove = () => { dispatch(medicalDocumentDelete({ contract_id })).then((res) => { showSuccessOrError(res); if (!res.error) refresh(); }); };
    const fileUrl = medicalDocument?.file_path_full_url || medicalDocument?.file_path;
    const onDownload = () => { if (fileUrl) { const a = document.createElement("a"); a.href = fileUrl; a.download = medicalDocument.file_path.split("/").pop() || "medical_document"; a.target = "_blank"; a.click(); } };

    const handleChangeStatus = (id) => {
        dispatch(medicalDocumentStatusChange({ contract_id, status: id })).then((res) => {
            showSuccessOrError(res);
            if (!res.error) { refresh(); dispatch(fetchContractDetailsById(contract_id)); reloadGlobalActivityList?.(); }
        });
    };
    /* U-0298: Deployment Medical shares the report to the Worker with the catalogue's Share Medical template; the share is recorded like Flight / Pick Up */
    const openShare = () => { setTemplate({ slug: shareSlug, statusKey: "medical" }); };
    const handleShare = (data) => { dispatch(deploymentShareUpdate({ contract_id, type: "medical", template_data: data })).then((res) => { showSuccessOrError(res); if (!res.error) refresh(); }); };
    const openSendTemplate = () => { setTemplate({ slug: templateSlug, statusKey: "" }); };

    const group = processingDetails?.contract?.group;
    const dateLabel = group === 1 || group === 2 ? translation("key_check_up_date") : translation("key_coupon_shared");
    const detailsFilled = Boolean(medicalDocument?.medical_clinic_id && medicalDocument?.coupon_code && medicalDocument?.coupon_provided_date);
    const file = medicalDocument?.file_path ? { name: medicalDocument.file_path.split("/").pop(), url: fileUrl, isImage: /\.(jpe?g|png|gif|webp)$/i.test(medicalDocument.file_path), by: medicalDocument?.last_updated_by_info, at: "" } : null;

    return (
        <StagePanel locked={ !processing }>
            <StagePanelHead title={ title || translation("key_stage_medical") } stage="medical" status={ medicalDocument?.status } updatedAt={ medicalDocument?.last_status_updated_at || medicalDocument?.updated_at } updatedBy={ medicalDocument?.last_updated_by_info } />
            { locked && processing && <NotRequiredNote onChangeStatus={ () => menuRef.current?.open() } /> }
            { warning && <div className="g1-warn">{ warning }</div> }
            { loading ? <div className="g1-note">{ translation("key_loading") }…</div> : (
                <>
                    <FormGrid layout="medical">
                        <Fld id="md-cl" label={ translation("key_medical_clinic") }>
                            <select id="md-cl" className="g1-in" value={ draft.medical_clinic_id } disabled={ !canEditFields } onChange={ (e) => commit("medical_clinic_id", e.target.value) }>
                                <option value="">{ translation("key_please_select") }</option>
                                { medicalList.map((item) => <option key={ item.id } value={ item.id }>{ item.agency_name }</option>) }
                            </select>
                        </Fld>
                        <Fld id="md-cc" label={ translation("key_coupon_code") }>
                            <input id="md-cc" className="g1-in mono" value={ draft.coupon_code } maxLength={ 20 } placeholder={ translation("key_enter_coupon_code") } disabled={ !canEditFields }
                                onChange={ (e) => setDraft((d) => ({ ...d, coupon_code: e.target.value })) } onBlur={ (e) => { if (e.target.value !== (medicalDocument?.coupon_code || "")) commit("coupon_code", e.target.value); } } />
                        </Fld>
                        <Fld id="md-ck" label={ dateLabel }>
                            <DateInput id="md-ck" value={ draft.coupon_provided_date } disabled={ !canEditFields } className="mcdt-datewrap" onChange={ (v) => commit("coupon_provided_date", v) } />
                        </Fld>
                    </FormGrid>
                    { medicalDocument?.status && medicalDocument.status !== "not_ready" && (detailsFilled || file) && (
                        <div className="g1-fileblock">
                            <span className="lb">{ translation("key_cr_medical_report") }</span>
                            <FileTile file={ file } emptyLabel={ translation("key_cr_no_medical_report") } accept={ PROCESSING_MEDICAL_ACCEPT } busy={ fileBusy } canUpload={ canEditFields } canManage={ canEditFields }
                                onFile={ onFile } onDownload={ file ? onDownload : undefined } onRemove={ file ? onRemove : undefined } />
                        </div>
                    ) }
                </>
            ) }
            <StageFooter menuRef={ menuRef } stage="medical" onSendTemplate={ openSendTemplate } canSendTemplate={ stageActionPermission.includes("send_template") || isAdminUser() }
                statusOptions={ statusOptions } current={ medicalDocument?.status } onChangeStatus={ handleChangeStatus } canChangeStatus={ processing && (stageActionPermission.includes("change_status") || isAdminUser()) }>
                { shareSlug && <button type="button" className="g1-btn" disabled={ !canEdit } data-fid="share-medical" onClick={ openShare }><Icon name="external" size={ 12 } strokeWidth={ 1.5 } />{ translation("key_share") }</button> }
            </StageFooter>

            { template && (
                <StageSendTemplate contractDetails={ contractDetails } slug={ template.slug } statusKey={ template.statusKey }
                    onClose={ () => setTemplate(null) } onSent={ (data) => { if (template.statusKey) handleShare(data); } } />
            ) }
        </StagePanel>
    );
};

ProcessingMedicalTab.propTypes = {
    title: PropTypes.string,
    /* Deployment reuse: the Share Medical template slug (U-0298) */
    shareSlug: PropTypes.string,
    processingDetails: PropTypes.object.isRequired,
    contractDetails: PropTypes.object.isRequired,
    stageActionPermission: PropTypes.array,
    reloadGlobalActivityList: PropTypes.func,
    /* Deployment reuse: the Deployment template slug, the earlier-stage warning, a refresh of the deployment document */
    templateSlug: PropTypes.string,
    warning: PropTypes.node,
    onChanged: PropTypes.func,
};

export default React.memo(ProcessingMedicalTab);
