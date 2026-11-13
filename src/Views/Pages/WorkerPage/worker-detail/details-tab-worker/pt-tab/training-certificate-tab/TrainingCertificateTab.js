import React, { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
const ActionLoader = lazy(() => import("../../../../../../../components/ReusableComponents/ActionLoader"));
const TabFooterActions = lazy(() => import("../../../../../../../components/tab-footer-actions/TabFooterActions"));
import { WkdG2SectionHead, WkdG2FileCard, WkdG2AwaitingUpload, WkdG2UploadAudit } from "../../../newui/WkdG2PartnerNav";
const UploadFile = lazy(() => import("../../../../../../../components/upload-file/UploadFile"));
import { ShowToast } from "../../../../../../../components/show-toast/ShowToast";
import { uploadFile, validateUploadFile } from "../../../../../../../services/commonService";
import { saveWorkerValidateStatus, setWorkerLoading, clearWorkerLoading, uploadIndoDocumentAfterPTAssignSlice, deleteWorkerIndonesianDocument } from "../../../../../../../redux/Slices/worker/WorkerSlice";
import translation from "../../../../../../../utils/translation";
import { getStatusTransitionError, ptSectionStatusOptions } from "../../../statusTransition";
const TrainingCertificateTab = ({ activityLogList, status, workerDocumentUploadInfo, updateStatus, onRefreshStatus, isWorkerPermissionAccessInfo, isAdmin, readOnly = false }) => {
    const dispatch = useDispatch();
    const mountedRef = useRef(true);
    const [mainFile, SetMainFile] = useState(null);
    /* §16.18 staged edit: a picked file or a delete is held here and written only on Save; Cancel drops it */
    const [staged, setStaged] = useState(null);
    const [replacing, setReplacing] = useState(false);

    // Unmount cleanup
    useEffect(() => {
        return () => { mountedRef.current = false; };
    }, []);

    useEffect(() => {
        const storedUrl = workerDocumentUploadInfo?.worker_overseas_detail_info?.training_certificate_file;
        if (storedUrl) {
            const extension = storedUrl.substring(storedUrl.lastIndexOf(".") + 1);
            SetMainFile({ url: storedUrl, filename: "", fileOriginalName: 'Training Certificate', update: true, extension: extension });
        } else {
            SetMainFile(null);
        }
        setStaged(null);
        setReplacing(false);
    }, [workerDocumentUploadInfo?.worker_overseas_detail_info?.training_certificate_file]);

    const shownFile = staged?.kind === 'upload' ? staged.file : (staged?.kind === 'delete' ? null : mainFile);

    const handleDownload = useCallback(() => {
        if (!shownFile) {
            return false;
        }
        const link = document.createElement('a');
        link.href = shownFile.url;
        link.download = shownFile.fileOriginalName;
        link.target = "_blank";
        link.click();
    }, [shownFile]);

    const handleChangeStatus = useCallback((id) => {
        const transitionError = getStatusTransitionError(updateStatus, id, { strict: false });
        if (transitionError) {
            ShowToast("error", translation(transitionError));
            return true;
        }
        let payload = {
            worker_id: workerDocumentUploadInfo?.id,
            type: "training_certificate",
            status_key: id
        };
        dispatch(saveWorkerValidateStatus(payload)).then((res) => {
            if (!mountedRef.current) return;
            if (res?.payload?.status) {
                onRefreshStatus("training-certificate");
                ShowToast("success", res?.payload?.message);
            } else {
                ShowToast("error", res?.payload?.message);
            }
        });
    }, [updateStatus, workerDocumentUploadInfo?.id, dispatch, onRefreshStatus]);

    /* Delete and Upload again are staged — nothing reaches the record until Save */
    const handleStageDelete = useCallback(() => {
        setStaged({ kind: 'delete' });
        setReplacing(false);
    }, []);
    const handleUploadAgain = useCallback(() => {
        setReplacing(true);
    }, []);

    const handleFileUploadChange = useCallback(async (event) => {
        const file = event.target.files[0];
        const { valid, errorKey } = validateUploadFile(file);
        if (!valid) {
            if (errorKey) ShowToast("error", translation(errorKey));
            return false;
        }
        try {
            const extension = file.name.substring(file.name.lastIndexOf(".") + 1);
            const filesToUpload = [{ file: file, name: "overseas-doc/training-certificate" }];
            dispatch(setWorkerLoading());
            const uploadedFileResponse = await uploadFile(filesToUpload);
            dispatch(clearWorkerLoading());
            if (!mountedRef.current) return;
            setStaged({ kind: 'upload', filename: uploadedFileResponse?.filename, file: { ...uploadedFileResponse, fileOriginalName: file.name, update: true, extension: extension } });
            setReplacing(false);
        } catch (error) {
            dispatch(clearWorkerLoading());
            ShowToast("error", error);
        }
    }, [dispatch]);

    const handleCancel = useCallback(() => {
        setStaged(null);
        setReplacing(false);
    }, []);

    const handleSave = useCallback(() => {
        if (!staged) return;
        const done = (res) => {
            if (!mountedRef.current) return;
            if (res?.payload?.status) {
                setStaged(null);
                onRefreshStatus("training-certificate");
                ShowToast("success", res?.payload?.message);
            } else {
                ShowToast("error", res?.payload?.message);
            }
        };
        if (staged.kind === 'upload') {
            dispatch(uploadIndoDocumentAfterPTAssignSlice({ worker_id: workerDocumentUploadInfo?.id, type: "training_certificate", file_path: staged.filename })).then(done);
        } else if (staged.kind === 'delete') {
            dispatch(deleteWorkerIndonesianDocument({ worker_id: workerDocumentUploadInfo?.id, type: "training_certificate" })).then(done);
        }
    }, [staged, workerDocumentUploadInfo?.id, dispatch, onRefreshStatus]);

    const ptPerms = isWorkerPermissionAccessInfo?.worker_indonesia_worker_assign_pt;
    /* partner staff (readOnly) see the record without any write control (§16.18) */
    const canEditUpload = !readOnly && Boolean((Array.isArray(ptPerms) && ptPerms.includes('edit')) || isAdmin);
    const canChangeStatus = !readOnly && Boolean((Array.isArray(ptPerms) && ptPerms.includes('change_status')) || isAdmin);
    const showUploader = canEditUpload && (!shownFile || replacing);

    return <Suspense fallback={ <div>{ translation('key_loading') }...</div> }><div className="e-registration-tab">
        <WkdG2SectionHead title={ translation('key_training_certificate') } ready={ updateStatus === 'verified' } />
        <div className="wkd-g2sec-body">
        <div className="wkd-g2-uploadblock">
            <div className="g2-field-label">{ translation('key_wkr_uploaded_file') }</div>
            { shownFile && !replacing
                ? <WkdG2FileCard
                    name={ shownFile.fileOriginalName }
                    meta={ shownFile.extension ? String(shownFile.extension).toUpperCase() : '' }
                    imageSrc={ (shownFile.extension === 'pdf' || shownFile.extension === 'doc' || shownFile.extension === 'docx') ? null : shownFile.url }
                    onDownload={ handleDownload }
                    onDelete={ canEditUpload ? handleStageDelete : undefined }
                    onUploadAgain={ canEditUpload ? handleUploadAgain : undefined }
                />
                : showUploader
                    ? <div className="wkd-g2-upload">
                        <UploadFile onChange={ handleFileUploadChange } marginBottomClass="" />
                        <div className="g2-upload-format">{ translation('key_wkr_pdf_jpg_or_png_5_mb_maximum') }</div>
                    </div>
                    : <WkdG2AwaitingUpload /> }
            { (staged || replacing) && (
                <div className="wkd-g2-stagebar">
                    <button type="button" className="g2-button" disabled={ status === 'loading' } onClick={ handleCancel }>{ translation('key_cancel') }</button>
                    <button type="button" className="g2-button primary" disabled={ !staged || status === 'loading' } aria-disabled={ !staged || status === 'loading' } onClick={ handleSave }>{ translation('key_save') }</button>
                </div>
            ) }
            <WkdG2UploadAudit logs={ activityLogList } />
        </div>
        { (status === 'loading') ? <ActionLoader /> : <TabFooterActions
            handleChangeStatus={ handleChangeStatus }
            dropdownList={ ptSectionStatusOptions(updateStatus) }
            isVisibleSendTemplate={ false }
            isVisibleChangeStatus={ canChangeStatus }
        /> }

        </div>
    </div></Suspense>
}

TrainingCertificateTab.propTypes = {
    activityLogList: PropTypes.any,
    status: PropTypes.string,
    workerDocumentUploadInfo: PropTypes.any,
    updateStatus: PropTypes.string,
    onRefreshStatus: PropTypes.func,
    isWorkerPermissionAccessInfo: PropTypes.any,
    isAdmin: PropTypes.any,
    readOnly: PropTypes.bool,
};
export default TrainingCertificateTab;