import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import DateInput from "../../../../../../components/ui/DateInput";
import Icon from "../../../../../../components/Icon/Icon";
import { PROCESSING_FILE_UPLOAD_SIZE_LIMIT } from "../../../../../../components/ReusableComponents/constants";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { isAdminUser, showSuccessOrError, uploadFile } from "../../../../../../services/commonService";
import { deleteProcessingVisaFile, eVisaDocumentStatusChange, fetchEvisaDocumentStatusList, updateProcessingVisaEVisa, visaDocumentDetails, visaShareUpdate } from "../../../../../../redux/Slices/processing/ProcessingSlice";
import { fetchContractDetailsById } from "../../../../../../redux/Slices/contract/ContractSlice";
import translation from "../../../../../../utils/translation";
import { headingCase } from "../../../../../../utils/utils";
import useWithdrawnCompletingOptions from "../../terminal-flow/useWithdrawnCompletingOptions";
import VisaExpiryEditor from "../../../../../../components/visa-expiry/VisaExpiryEditor";
import { saveVisaExpiry, VISA_EXPIRY_SURFACE } from "../../../../../../components/visa-expiry/visaExpiryApi";
import { EditFooter, FieldRead, FileTile, Fld, FolderButton, FormGrid, PortalButton, StageFooter, StagePanel, StagePanelHead, UploadButton, YesNo } from "../../../../../../components/Processing/newui/StagePanel";
import StageSendTemplate from "../../../../../../components/Processing/newui/StageSendTemplate";
import { CR_EVISA_ACCEPT, CR_EVISA_RELEASED } from "../../../../Contract/contractConstants";
import { evisaChanges, evisaReasonRequired, isReasonRefusal } from "./evisaRules";
import { useIsProcessingContract } from "../../contractLifecycle";

const ISO = "YYYY-MM-DD";
const fmt = (iso) => (iso ? dayjs(iso).format("DD/MM/YYYY") : "");
/* the RECORDED Visa Expiry: the contract-level projection first (the visa document may lag it — contract 27, 22 Oct), then the document */
const recordedExpiryOf = (contractDetails, doc) => contractDetails?.["processingVisaDocumentModel.visa_expiry_date"] || doc?.visa_expiry_date || "";
/* one draft shape for the stored record and the edit draft; `recordedExpiry` is what read mode shows and what the reason rule compares against */
const draftOf = (doc, recordedExpiry = doc?.visa_expiry_date) => ({
    visa_reference_no: doc?.visa_reference_no || "", e_visa_payment_date: doc?.e_visa_payment_date ? dayjs(doc.e_visa_payment_date).format(ISO) : "",
    ac_refunded: doc?.ac_refunded === 1 ? "1" : "0", entry_visa_expiry_date: doc?.entry_visa_expiry_date ? dayjs(doc.entry_visa_expiry_date).format(ISO) : "",
    visa_expiry_date: recordedExpiry ? dayjs(recordedExpiry).format(ISO) : "", reason: "",
});
/**
 * E-Visa panel (prototype evisaPanel; TERMINAL §5, U-0171 / U-0186 / U-0187): the Visa Record — Visa Ref No. (Share) ·
 * E-Visa Payment Date · A/C Refunded, then Entry Visa Expiry · Visa Expiry — read until Edit; Edit (Processing, Stage
 * Actions Edit) opens every field with Save changes / Cancel; an unchanged save writes nothing; after Visa Released every
 * change is a correction and carries a reason (backend 299); a changed Visa Expiry goes through visa-expiry-update with
 * a correction reason when a recorded value changes. The
 * E-Visa Document tile (upload · download · upload again · remove · Share) and the footer complete the panel.
 */
const EVisaTab = ({ onFetchProcessingTabActivities, contractDetails, stageActionPermission, reloadGlobalActivityList, isActive }) => {
    const dispatch = useDispatch();
    const { contract_id } = useParams();
    const { visaDocument } = useSelector((state) => state.processing);
    const [fileBusy, setFileBusy] = useState(false);
    const [statusList, setStatusList] = useState(null);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [draft, setDraft] = useState(draftOf(null));
    const [errors, setErrors] = useState({});
    /* the server refused a Visa Expiry change for a missing reason although the client saw no recorded value: open the reason box anyway */
    const [needsReason, setNeedsReason] = useState(false);
    const [template, setTemplate] = useState(null);   /* { slug, statusKey } while the Send Template modal is open */
    const processing = useIsProcessingContract(contractDetails);
    const canEdit = processing && stageActionPermission.includes("edit");
    const released = visaDocument?.e_visa_status === CR_EVISA_RELEASED;
    /* backend 299 / N-7: the gate is Stage Actions Edit; after release the change carries a correction reason */
    const canOpenEdit = canEdit;
    /* the Visa reference resolves on the server ({{worker_visa_reference}}); a file Share sends the E-Visa as the media — its
       URL for the chat delivery, its storage key for the send log */
    const shareFile = template?.statusKey === "visa_file";
    const shareAttachment = shareFile ? (visaDocument?.visa_file_path_full_url || undefined) : undefined;
    const shareAttachmentKey = shareFile ? (visaDocument?.visa_file_path || undefined) : undefined;
    const recordedVisaExpiry = recordedExpiryOf(contractDetails, visaDocument);
    const stored = draftOf(visaDocument, recordedVisaExpiry);

    const refreshStatusList = useCallback(() => { dispatch(fetchEvisaDocumentStatusList({ id: contract_id, type: "e-visa" })).then((res) => { if (!res.error && res?.payload?.data) setStatusList(res.payload.data); }); }, [dispatch, contract_id]);
    const refreshRecord = useCallback(() => { dispatch(fetchContractDetailsById(contract_id)); dispatch(visaDocumentDetails(contract_id)); reloadGlobalActivityList?.(); }, [dispatch, contract_id, reloadGlobalActivityList]);
    useEffect(() => { dispatch(visaDocumentDetails(contract_id)); }, [dispatch, contract_id]);
    useEffect(() => { if (isActive) refreshStatusList(); }, [isActive, refreshStatusList]);
    useEffect(() => { if (isActive) onFetchProcessingTabActivities("evisa"); }, [onFetchProcessingTabActivities, isActive]);
    useEffect(() => { if (visaDocument && Object.keys(visaDocument).length) setDraft(draftOf(visaDocument, recordedExpiryOf(contractDetails, visaDocument))); }, [visaDocument, contractDetails]);

    const handleChangeStatus = (id) => { dispatch(eVisaDocumentStatusChange({ contract_id, status: id })).then((res) => { showSuccessOrError(res); if (!res.error) { refreshStatusList(); refreshRecord(); } }); };
    /* the stored record travels with a file save; the draft is never written by the file tile */
    const saveRecord = useCallback(async (values, filename, reason = "") => {
        /* backend 299: the record's `version` travels back (REQ-2); a stale one is refused; after release the change carries `reason` */
        const res = await dispatch(updateProcessingVisaEVisa({ contract_id, visa_reference_no: values.visa_reference_no, e_visa_payment_date: values.e_visa_payment_date || null, ac_refunded: values.ac_refunded === "1" ? 1 : 0, entry_visa_expiry_date: values.entry_visa_expiry_date || null, visa_file_path: filename, ...(visaDocument?.version != null ? { version: visaDocument.version } : {}), ...(reason ? { reason } : {}) }));
        const body = res.error ? (res.payload?.data?.data || {}) : null;
        /* a refusal for a missing reason opens the reason box (no toast); every other answer toasts as before */
        if (body && isReasonRefusal(body)) return { ok: false, reasonRefused: true, message: body.message };
        showSuccessOrError(res); return { ok: !res.error };
    }, [dispatch, contract_id, visaDocument?.version]);
    const onFile = async (file) => {
        if (file.size > PROCESSING_FILE_UPLOAD_SIZE_LIMIT) { ShowToast("error", translation("key_please_upload_file_smaller_than_5mb")); return; }
        try {
            setFileBusy(true);
            const res = await uploadFile([{ file, name: "processing/visa" }]);
            if (!res?.filename) { ShowToast("error", translation("key_failed_to_upload_file")); return; }
            if ((await saveRecord(stored, res.filename)).ok) { refreshStatusList(); refreshRecord(); }
        } catch (e) { ShowToast("error", e?.message || translation("key_failed_to_upload_file")); }
        finally { setFileBusy(false); }
    };
    const onRemove = () => { dispatch(deleteProcessingVisaFile({ contract_id })).then((res) => { showSuccessOrError(res); if (!res.error) { refreshStatusList(); refreshRecord(); } }); };
    const onDownload = () => { const a = document.createElement("a"); a.href = visaDocument?.visa_file_path_full_url; a.download = visaDocument?.visa_file_path; a.target = "_blank"; a.click(); };

    const startEdit = () => { setDraft(stored); setErrors({}); setNeedsReason(false); setEditing(true); };
    const cancelEdit = () => { setDraft(stored); setErrors({}); setNeedsReason(false); setEditing(false); };
    const set = (k, v) => { setDraft((d) => ({ ...d, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
    const saveEdit = async () => {
        const { recordChanged, expiryChanged } = evisaChanges(draft, stored);
        const next = {};
        if (draft.e_visa_payment_date && draft.e_visa_payment_date > dayjs().format(ISO)) next.e_visa_payment_date = translation("key_cr_payment_date_not_future");
        /* U-0284 (recorded dates) · backend 299 (any change after release) · or once the server has asked for one */
        const reasonRequired = evisaReasonRequired({ draft, stored, released, needsReason });
        if (reasonRequired && !draft.reason.trim()) next.reason = translation("key_visa_expiry_reason_required");
        if (expiryChanged && draft.visa_expiry_date && contractDetails?.start_date && draft.visa_expiry_date <= dayjs(contractDetails.start_date).format(ISO)) next.visa_expiry_date = translation("key_visa_expiry_must_be_later_than_contract_start");
        setErrors(next);
        if (Object.keys(next).length) return;
        if (!recordChanged && !expiryChanged) { setEditing(false); return; }
        setSaving(true);
        let ok = true;
        if (recordChanged) {
            const saved = await saveRecord(draft, visaDocument?.visa_file_path, reasonRequired ? draft.reason.trim() : "");
            ok = saved.ok;
            if (saved.reasonRefused) { setNeedsReason(true); setErrors({ reason: saved.message || translation("key_visa_expiry_reason_required") }); }
        }
        if (ok && expiryChanged && draft.visa_expiry_date) {
            const result = await saveVisaExpiry(VISA_EXPIRY_SURFACE.PROCESSING, { contract_id: Number(contract_id), visa_expiry_date: draft.visa_expiry_date, ...((stored.visa_expiry_date || needsReason) && draft.reason.trim() ? { reason: draft.reason.trim() } : {}) });
            if (!result.ok) {
                /* VISA_EXPIRY_CHANGE_REASON_REQUIRED: the box opens and the message sits under it, not under the date */
                if (isReasonRefusal(result)) { setNeedsReason(true); setErrors({ reason: result.message || translation("key_visa_expiry_reason_required") }); }
                else setErrors({ visa_expiry_date: result.message || translation("key_something_went_wrong") });
                ok = false;
            }
            else ShowToast("success", result.message || translation("key_visa_expiry_updated"));
        }
        setSaving(false);
        if (ok) { setEditing(false); refreshStatusList(); refreshRecord(); }
    };

    const handleShareVisaTemplate = (data) => { dispatch(visaShareUpdate({ contract_id, type: template?.statusKey, template_data: data })).then((res) => { showSuccessOrError(res); if (!res.error) { refreshStatusList(); dispatch(visaDocumentDetails(contract_id)); } }); };
    const openShare = (statusKey) => { setTemplate({ slug: "processing_visa_share", statusKey }); };
    const openSendTemplate = () => { setTemplate({ slug: "processing_visa_evisa", statusKey: "" }); };

    const statusOptions = useWithdrawnCompletingOptions("visa", statusList);
    const file = visaDocument?.visa_file_path ? { name: visaDocument.visa_file_path.split("/").pop(), url: visaDocument.visa_file_path_full_url, isImage: /\.(jpe?g|png|gif|webp)$/i.test(visaDocument.visa_file_path), by: visaDocument?.last_updated_by_info } : null;
    const shared = (flag) => (flag === 1 ? <span className="g1-shared" title={ translation("key_shared") }><Icon name="check" size={ 12 } strokeWidth={ 2 } /></span> : null);

    return (
        <StagePanel locked={ !processing }>
            <StagePanelHead title={ translation("key_e_visa") } stage="e_visa" status={ visaDocument?.e_visa_status } updatedAt={ visaDocument?.updated_at } updatedBy={ visaDocument?.last_updated_by_info }>
                { canOpenEdit && !editing && <button type="button" className="g1-btn" data-fid="ev-edit" onClick={ startEdit }>{ translation("key_edit") }</button> }
                <PortalButton />
                <FolderButton folder="visa" label={ headingCase(translation("key_visa")) } />
                { /* prototype evisaPanel head keeps the Upload button beside the Visa folder (the 26 Oct order dropped it — HTML wins, 30 Oct audit) */ }
                { canEdit && <UploadButton folder="visa" /> }
            </StagePanelHead>

            <FormGrid layout="evisa">
                { editing ? (
                    <Fld id="ev-ref" label={ translation("key_visa_ref_no") }><input id="ev-ref" className="g1-in mono" value={ draft.visa_reference_no } maxLength={ 20 } disabled={ saving } onChange={ (e) => set("visa_reference_no", e.target.value) } /></Fld>
                ) : (
                    <div className="g1-f"><div className="lb">{ translation("key_visa_ref_no") }</div>
                        <div className="inline"><div className={ `vl mono${ visaDocument?.visa_reference_no ? "" : " empty" }` }>{ visaDocument?.visa_reference_no || "—" }</div>
                            <button type="button" className="g1-btn sm" disabled={ !canEdit } onClick={ () => openShare("visa_reference_no") }>{ translation("key_share") }</button>{ shared(visaDocument?.visa_reference_no_shared) }</div>
                    </div>
                ) }
                { editing ? <Fld id="ev-pay" label={ translation("key_e_visa_payment_date") } error={ errors.e_visa_payment_date }><DateInput id="ev-pay" value={ draft.e_visa_payment_date } disabled={ saving } className="mcdt-datewrap" onChange={ (v) => set("e_visa_payment_date", v) } /></Fld>
                    : <FieldRead label={ translation("key_e_visa_payment_date") } value={ fmt(visaDocument?.e_visa_payment_date) } /> }
                { editing ? <Fld id="ev-ref-lb" label={ translation("key_ac_refunded") }><YesNo value={ draft.ac_refunded } yes="1" no="0" disabled={ saving } onChange={ (v) => set("ac_refunded", v) } /></Fld>
                    : <FieldRead label={ translation("key_ac_refunded") } value={ translation(visaDocument?.ac_refunded === 1 ? "key_yes" : "key_no") } /> }
            </FormGrid>

            <FormGrid layout="evisa-expiry">
                { editing ? <Fld id="ev-entry" label={ translation("key_entry_visa_expiry") }><DateInput id="ev-entry" value={ draft.entry_visa_expiry_date } disabled={ saving } className="mcdt-datewrap" onChange={ (v) => set("entry_visa_expiry_date", v) } /></Fld>
                    : <FieldRead label={ translation("key_entry_visa_expiry") } value={ fmt(visaDocument?.entry_visa_expiry_date) } /> }
                { editing ? <Fld id="ev-exp" label={ translation("key_visa_expiry") } error={ errors.visa_expiry_date }><DateInput id="ev-exp" value={ draft.visa_expiry_date } disabled={ saving } className="mcdt-datewrap" onChange={ (v) => set("visa_expiry_date", v) } /></Fld>
                    : <div className="g1-f"><div className="lb">{ translation("key_visa_expiry") }</div><div className="g1-vxp"><VisaExpiryEditor surface={ VISA_EXPIRY_SURFACE.PROCESSING } contractId={ contract_id } visaExpiry={ recordedVisaExpiry } contractStart={ contractDetails?.start_date || "" } canEdit={ false } onSaved={ refreshRecord } /></div></div> }
                { editing && evisaReasonRequired({ draft, stored, released, needsReason }) && (
                    <Fld id="ev-reason" label={ `${ translation("key_cr_correction_reason") } *` } error={ errors.reason } cap={ translation(released ? "key_cr_reason_required_after_release" : "key_cr_required_when_date_changes") }>
                        <textarea id="ev-reason" className="g1-in g1-ta" rows={ 2 } maxLength={ 1000 } value={ draft.reason } disabled={ saving } onChange={ (e) => set("reason", e.target.value) } />
                    </Fld>
                ) }
            </FormGrid>

            <div className="g1-fileblock">
                <span className="lb">{ translation("key_cr_e_visa_document") }</span>
                <FileTile file={ file } emptyLabel={ translation("key_cr_no_e_visa_file") } accept={ CR_EVISA_ACCEPT } busy={ fileBusy } canUpload={ canEdit } canManage={ canEdit } onFile={ onFile } onDownload={ file ? onDownload : undefined } onRemove={ file ? onRemove : undefined } />
                { file && <div className="g1-share"><button type="button" className="g1-btn" disabled={ !canEdit || editing } onClick={ () => openShare("visa_file") }><Icon name="external" size={ 12 } strokeWidth={ 1.6 } />{ translation("key_share") }</button>{ shared(visaDocument?.visa_file_shared) }</div> }
            </div>
            { editing && <EditFooter onCancel={ cancelEdit } onSave={ saveEdit } saving={ saving } /> }
            { released && processing && !editing && canEdit && <p className="g1-note" data-ev-released="">{ translation("key_cr_reason_required_after_release") }</p> }


            <StageFooter stage="e_visa" onSendTemplate={ openSendTemplate } canSendTemplate={ stageActionPermission.includes("send_template") || isAdminUser() }
                statusOptions={ statusOptions || [] } current={ visaDocument?.e_visa_status } onChangeStatus={ handleChangeStatus } canChangeStatus={ processing && (stageActionPermission.includes("change_status") || isAdminUser()) } />

            { template && (
                <StageSendTemplate contractDetails={ contractDetails } slug={ template.slug } statusKey={ template.statusKey } attachmentPath={ shareAttachment } attachmentKey={ shareAttachmentKey }
                    onClose={ () => setTemplate(null) } onSent={ (data) => { if (template.statusKey) handleShareVisaTemplate(data); } } />
            ) }
        </StagePanel>
    );
};

EVisaTab.propTypes = {
    contractDetails: PropTypes.object,
    stageActionPermission: PropTypes.array,
    reloadGlobalActivityList: PropTypes.func,
    onFetchProcessingTabActivities: PropTypes.func,
    isActive: PropTypes.bool,
};

export default React.memo(EVisaTab);
