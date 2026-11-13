import React, { useEffect, useCallback, useRef, useState, lazy, Suspense } from "react";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import UploadFile from "../../../../../../../components/upload-file/UploadFile";
import DateInput from "../../../../../../../components/ui/DateInput";
import ConfirmModal from "../../../../../../../components/ui/ConfirmModal";
const ActionLoader = lazy(() => import("../../../../../../../components/ReusableComponents/ActionLoader"));
const TabFooterActions = lazy(() => import("../../../../../../../components/tab-footer-actions/TabFooterActions"));
import { WkdG2SectionHead, WkdG2FileCard, WkdG2AwaitingUpload, WkdG2UploadAudit } from "../../../newui/WkdG2PartnerNav";
import { uploadFile, validateUploadFile } from "../../../../../../../services/commonService";
import { ShowToast } from "../../../../../../../components/show-toast/ShowToast";
import { saveWorkerValidateStatus, setWorkerLoading, clearWorkerLoading, uploadIndoDocumentAfterPTAssignSlice, deleteWorkerIndonesianDocument } from "../../../../../../../redux/Slices/worker/WorkerSlice";
import translation from "../../../../../../../utils/translation";
import { getStatusTransitionError, ptSectionStatusOptions } from "../../../statusTransition";
import { LABOUR_ID_TYPE } from "../../../../workerModuleConstants";

/*
 * Partner tab → Labour ID (backend 248 W-30): a record — number, issue date, optional scan — with the §16.18 staged
 * Edit / Delete / Cancel / Save mechanics of the Medical tab. Save → upload-indonesian-document-after-pt-assign
 * { type: "labour_id", labour_id_number, labour_id_issued_at, file_path? }; Delete → delete-indonesian-document { type: "labour_id" }.
 * Status / Ready unchanged. Submit Documents checklist persistence stays a client-side TODO (W-30, item list ❓ product).
 */
const LaborIDTab = ({ activityLogList, status, workerDocumentUploadInfo, updateStatus, onRefreshStatus, isWorkerPermissionAccessInfo, isAdmin, readOnly = false }) => {
    const dispatch = useDispatch();
    const mountedRef = useRef(true);
    const info = workerDocumentUploadInfo?.worker_overseas_detail_info;
    const storedNumber = info?.labour_id_number || "";
    const storedIssuedAt = info?.labour_id_issued_at || "";
    const storedUrl = info?.labour_id_file || "";
    const [mainFile, setMainFile] = useState(null);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ number: "", issuedAt: "" });
    const [staged, setStaged] = useState(null);       /* { kind: 'upload', filename, file } | { kind: 'delete' } — written only on Save */
    const [replacing, setReplacing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => () => { mountedRef.current = false; }, []);
    useEffect(() => {
        setMainFile(storedUrl ? { url: storedUrl, filename: "", fileOriginalName: translation("key_labour_id"), update: true, extension: storedUrl.substring(storedUrl.lastIndexOf(".") + 1) } : null);
        setForm({ number: storedNumber, issuedAt: storedIssuedAt });
        setStaged(null); setReplacing(false); setEditing(false);
    }, [storedUrl, storedNumber, storedIssuedAt]);

    const hasRecord = Boolean(storedNumber || storedIssuedAt || storedUrl);
    const shownFile = staged?.kind === "upload" ? staged.file : (staged?.kind === "delete" ? null : mainFile);
    const dirty = editing && (form.number !== storedNumber || form.issuedAt !== storedIssuedAt || Boolean(staged));

    const handleDownload = useCallback(() => {
        if (!shownFile) return;
        const link = document.createElement("a");
        link.href = shownFile.url; link.download = shownFile.fileOriginalName; link.target = "_blank"; link.click();
    }, [shownFile]);

    const handleChangeStatus = useCallback((id) => {
        const transitionError = getStatusTransitionError(updateStatus, id, { strict: false });
        if (transitionError) { ShowToast("error", translation(transitionError)); return true; }
        dispatch(saveWorkerValidateStatus({ worker_id: workerDocumentUploadInfo?.id, type: LABOUR_ID_TYPE, status_key: id })).then((res) => {
            if (!mountedRef.current) return;
            if (res?.payload?.status) { onRefreshStatus("labor-id"); ShowToast("success", res?.payload?.message); }
            else ShowToast("error", res?.payload?.message);
        });
    }, [updateStatus, workerDocumentUploadInfo?.id, dispatch, onRefreshStatus]);

    const handleFileUploadChange = useCallback(async (event) => {
        const file = event.target.files[0];
        const { valid, errorKey } = validateUploadFile(file);
        if (!valid) { if (errorKey) ShowToast("error", translation(errorKey)); return; }
        try {
            const extension = file.name.substring(file.name.lastIndexOf(".") + 1);
            dispatch(setWorkerLoading());
            const uploaded = await uploadFile([{ file, name: "overseas-doc/labour-id" }]);
            dispatch(clearWorkerLoading());
            if (!mountedRef.current) return;
            setStaged({ kind: "upload", filename: uploaded?.filename, file: { ...uploaded, fileOriginalName: file.name, update: true, extension } });
            setReplacing(false);
        } catch (error) { dispatch(clearWorkerLoading()); ShowToast("error", error); }
    }, [dispatch]);

    const handleCancel = useCallback(() => { setForm({ number: storedNumber, issuedAt: storedIssuedAt }); setStaged(null); setReplacing(false); setEditing(false); }, [storedNumber, storedIssuedAt]);
    const done = useCallback((res) => {
        if (!mountedRef.current) return;
        if (res?.payload?.status) { setStaged(null); setEditing(false); setDeleting(false); onRefreshStatus("labor-id"); ShowToast("success", res?.payload?.message); }
        else ShowToast("error", res?.payload?.message);
    }, [onRefreshStatus]);
    const handleSave = useCallback(() => {
        const number = form.number.trim();
        if (!number || !form.issuedAt) { ShowToast("error", translation("key_wkr_labour_id_required")); return; }
        const payload = { worker_id: workerDocumentUploadInfo?.id, type: LABOUR_ID_TYPE, labour_id_number: number, labour_id_issued_at: form.issuedAt };
        /* answers F (W-30): a field not sent is left alone, "" clears — so a staged scan delete sends "" and an untouched scan is not re-sent */
        if (staged?.kind === "upload") payload.file_path = staged.filename;
        else if (staged?.kind === "delete") payload.file_path = "";
        dispatch(uploadIndoDocumentAfterPTAssignSlice(payload)).then(done);
    }, [form, staged, workerDocumentUploadInfo?.id, dispatch, done]);
    const handleDeleteRecord = useCallback(() => {
        dispatch(deleteWorkerIndonesianDocument({ worker_id: workerDocumentUploadInfo?.id, type: LABOUR_ID_TYPE })).then(done);
    }, [workerDocumentUploadInfo?.id, dispatch, done]);

    const ptPerms = isWorkerPermissionAccessInfo?.worker_indonesia_worker_assign_pt;
    /* partner staff (readOnly) see the record without any write control (§16.18) */
    const canEdit = !readOnly && Boolean((Array.isArray(ptPerms) && ptPerms.includes("edit")) || isAdmin);
    const canChangeStatus = !readOnly && Boolean((Array.isArray(ptPerms) && ptPerms.includes("change_status")) || isAdmin);
    const loading = status === "loading";
    const showUploader = editing && (!shownFile || replacing);

    return <Suspense fallback={ <div>{ translation("key_loading") }...</div> }><div className="e-registration-tab">
        <WkdG2SectionHead title={ translation("key_labour_id") } ready={ updateStatus === "verified" } />
        <div className="wkd-g2sec-body">
            <div className="g2-grid">
                <div>
                    <div className="g2-field-label">{ translation("key_wkr_labour_id_number") }</div>
                    { editing
                        ? <input type="text" className="form-control" maxLength={ 50 } value={ form.number } autoComplete="off" onChange={ (e) => setForm((f) => ({ ...f, number: e.target.value })) } />
                        : <div className="g2-field is-readonly">{ storedNumber || "—" }</div> }
                </div>
                <div>
                    <div className="g2-field-label">{ translation("key_date_of_issue") }</div>
                    { editing
                        ? <DateInput name="labour_id_issued_at" value={ form.issuedAt } onChange={ (v) => setForm((f) => ({ ...f, issuedAt: v || "" })) } />
                        : <div className="g2-field is-readonly">{ storedIssuedAt || "—" }</div> }
                </div>
            </div>
            <div className="wkd-g2-uploadblock">
                <div className="g2-field-label">{ translation("key_wkr_uploaded_file") }</div>
                { shownFile && !replacing
                    ? <WkdG2FileCard name={ shownFile.fileOriginalName } meta={ shownFile.extension ? String(shownFile.extension).toUpperCase() : "" }
                        imageSrc={ ["pdf", "doc", "docx"].includes(shownFile.extension) ? null : shownFile.url } onDownload={ handleDownload }
                        onDelete={ editing ? () => { setStaged({ kind: "delete" }); setReplacing(false); } : undefined } onUploadAgain={ editing ? () => setReplacing(true) : undefined } />
                    : showUploader
                        ? <div className="wkd-g2-upload"><UploadFile onChange={ handleFileUploadChange } marginBottomClass="" /><div className="g2-upload-format">{ translation("key_wkr_pdf_jpg_or_png_5_mb_maximum") }</div></div>
                        : <WkdG2AwaitingUpload /> }
                { canEdit && (
                    <div className="wkd-g2-stagebar">
                        { editing ? (
                            <>
                                <button type="button" className="g2-button" disabled={ loading } onClick={ handleCancel }>{ translation("key_cancel") }</button>
                                <button type="button" className="g2-button primary" disabled={ !dirty || loading } aria-disabled={ !dirty || loading } onClick={ handleSave }>{ translation("key_save") }</button>
                            </>
                        ) : (
                            <>
                                { hasRecord && <button type="button" className="g2-button" disabled={ loading } onClick={ () => setDeleting(true) }>{ translation("key_delete") }</button> }
                                <button type="button" className="g2-button primary" disabled={ loading } onClick={ () => setEditing(true) }>{ translation(hasRecord ? "key_edit" : "key_add") }</button>
                            </>
                        ) }
                    </div>
                ) }
                <WkdG2UploadAudit logs={ activityLogList } />
            </div>
            { loading ? <ActionLoader /> : <TabFooterActions handleChangeStatus={ handleChangeStatus } dropdownList={ ptSectionStatusOptions(updateStatus) } isVisibleSendTemplate={ false } isVisibleChangeStatus={ canChangeStatus } /> }
        </div>
        { deleting && (
            <ConfirmModal title={ translation("key_delete") } body={ translation("key_wkr_labour_id_delete_confirm") } danger busy={ loading }
                confirmLabel={ translation("key_delete") } cancelLabel={ translation("key_cancel") } onConfirm={ handleDeleteRecord } onClose={ () => setDeleting(false) } />
        ) }
    </div></Suspense>;
};

LaborIDTab.propTypes = {
    activityLogList: PropTypes.any,
    status: PropTypes.string,
    workerDocumentUploadInfo: PropTypes.any,
    updateStatus: PropTypes.string,
    onRefreshStatus: PropTypes.func,
    isWorkerPermissionAccessInfo: PropTypes.any,
    isAdmin: PropTypes.any,
    readOnly: PropTypes.bool,
};

export default LaborIDTab;
