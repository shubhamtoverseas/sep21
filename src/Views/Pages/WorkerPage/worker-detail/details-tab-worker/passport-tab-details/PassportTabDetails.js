import React, { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Controller, useForm } from "react-hook-form";
import PropTypes from 'prop-types';
import { yupResolver } from "@hookform/resolvers/yup";
const UploadFile = lazy(() => import("../../../../../../components/upload-file/UploadFile"));
import WkdDetCardHead from "../../newui/details/WkdDetCardHead";
import WkdDetSaveBar from "../../newui/details/WkdDetSaveBar";
import WkdDetFileCard from "../../newui/details/WkdDetFileCard";
import BioDateInput from "../../profile-tab/biodata-tab/BioDateInput";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { dispatchWithHandling } from "../../../../../../utils/dispatchHandler";
import { workerUploadPassportState } from "../../../../../../components/ReusableComponents/form-states";
import { validateWorkerUploadPassport } from '../../formValidation';
import { uploadFile, formatDate, validateUploadFile } from "../../../../../../services/commonService";
import { changeDynamicDateFormate } from "../../../../../../utils/utils"
import { indonesiaId } from "../../../../../../components/ReusableComponents/constants";
import { setWorkerLoading, clearWorkerLoading, saveWorkerPassportDetail, fetchWorkerDetailTabInfoPassport, fetchWorkerDetailTabInfo } from "../../../../../../redux/Slices/worker/WorkerSlice";
import translation from "../../../../../../utils/translation";
import { DET_FORM_IDS } from "../../../workerModuleConstants";

const PassportTabDetails = ({ isWorkerPermissionAccessInfo, isAdmin, onSaved, onCancel, sectionStatus }) => {
    const dispatch = useDispatch();
    const [natinality, SetNationality] = useState(false);
    const [mainFileError, SetMainFileError] = useState(null);
    const [signFileError, SetSignFileError] = useState(null);
    const [passportMainFile, SetPassportMainFile] = useState(null);
    const [passportSignFile, SetPassportSignFile] = useState(null);
    const { workerDetailTabInfoPassport, status } = useSelector((state) => state.worker)
    const { control, setValue, setError, register, handleSubmit } = useForm({ resolver: yupResolver(validateWorkerUploadPassport), defaultValues: workerUploadPassportState });
    useEffect(() => {

        if (workerDetailTabInfoPassport?.nationality?.id == indonesiaId)
            SetNationality(true);

        if (workerDetailTabInfoPassport?.passport_main_page)
            SetPassportMainFile({ url: workerDetailTabInfoPassport?.display_passport_main_page, filename: workerDetailTabInfoPassport?.passport_main_page, fileOriginalName: 'passport-main', update: true });

        if (workerDetailTabInfoPassport?.passport_sign_page)
            SetPassportSignFile({ url: workerDetailTabInfoPassport?.display_passport_sign_page, filename: workerDetailTabInfoPassport?.passport_sign_page, fileOriginalName: 'passport-sign', update: true });

        Object.keys(workerUploadPassportState).forEach((key) => {
            setValue(key, workerDetailTabInfoPassport?.[key] || '');
        });
        setValue('passport_issue_date', workerDetailTabInfoPassport?.passport_issue_date ? formatDate(workerDetailTabInfoPassport?.passport_issue_date) : null)
        setValue('passport_expiry_date', workerDetailTabInfoPassport?.passport_expiry_date ? formatDate(workerDetailTabInfoPassport?.passport_expiry_date) : null)
    }, [workerDetailTabInfoPassport, setValue]);

    const handleDownloadMainFile = useCallback(() => {
        if (!passportMainFile) {
            return false;
        }
        const link = document.createElement('a');
        link.href = passportMainFile.url; // Using the image URL in the state
        link.download = passportMainFile.fileOriginalName; // Download the image with its original name
        link.target = "_blank";
        link.click();
    }, [passportMainFile]);

    const handleDownloadSignFile = useCallback(() => {
        if (!passportSignFile) {
            return false;
        }
        const link = document.createElement('a');
        link.href = passportSignFile.url; // Using the image URL in the state
        link.download = passportSignFile.fileOriginalName; // Download the image with its original name
        link.target = "_blank";
        link.click();
    }, [passportSignFile]);

    const handleDeleteMainFile = useCallback(() => {
        SetPassportMainFile(null)
    }, []);

    const handleDeleteSignFile = useCallback(() => {
        SetPassportSignFile(null)
    }, []);

    const handleFileUploadChange = useCallback(async (event, type) => {
        const file = event.target.files[0];
        const { valid, errorKey } = validateUploadFile(file);
        if (!valid) {
            if (errorKey) ShowToast("error", translation(errorKey));
            return false;
        }
        try {
            const filesToUpload = [{ file: file, name: "passport" }];
            dispatch(setWorkerLoading());
            const uploadedFileResponse = await uploadFile(filesToUpload);
            if (type == "passport-main-page") {
                SetPassportMainFile({ ...uploadedFileResponse, fileOriginalName: file.name, update: true });
                SetMainFileError(null);
            } else {
                SetPassportSignFile({ ...uploadedFileResponse, fileOriginalName: file.name, update: true });
                SetSignFileError(null);
            }
            dispatch(clearWorkerLoading());
        } catch (error) {
            dispatch(clearWorkerLoading());
            ShowToast("error", error?.message || error);
        }
    }, [dispatch]);

    const onSubmit = useCallback((data) => {
        if (!passportMainFile) {
            SetMainFileError(translation('key_please_upload_passport_main_page'));
            return;
        }
        if (!passportSignFile && natinality) {
            /* the sign-page error belongs under the sign zone */
            SetSignFileError(translation('key_please_upload_passport_sign_page'));
            return;
        }
        if (changeDynamicDateFormate(data.passport_expiry_date, "YYYY-MM-DD") < changeDynamicDateFormate(data.passport_issue_date, "YYYY-MM-DD")) {
            /* inline under Date of Expiry instead of a toast */
            setError("passport_expiry_date", { type: "manual", message: translation('key_passport_date_of_expiry_cannot_less_than_passport_issue_date') });
            return;
        }
        let payload = {
            ...data,
            worker_id: workerDetailTabInfoPassport.id,
            passport_issue_date: changeDynamicDateFormate(data.passport_issue_date, "YYYY-MM-DD"),
            passport_expiry_date: changeDynamicDateFormate(data.passport_expiry_date, "YYYY-MM-DD"),
            module_key: "worker"
        }
        if (passportMainFile.update)
            payload.passport_main_page = passportMainFile.filename;
        if (natinality) {
            if (passportSignFile.update)
                payload.passport_sign_page = passportSignFile.filename;
        }
        dispatch(saveWorkerPassportDetail(payload)).then(res => {
            if (res?.payload?.status) {
                dispatch(fetchWorkerDetailTabInfo({ "worker_id": workerDetailTabInfoPassport.id, type: 'basic' }));
                dispatchWithHandling(dispatch, fetchWorkerDetailTabInfoPassport({
                    "worker_id": workerDetailTabInfoPassport.id,
                    "type": "passport"
                }));
                ShowToast("success", res?.payload?.message);
                if (onSaved) onSaved();
            } else {
                ShowToast("error", res?.payload?.message);
            }
        });
    }, [dispatch, passportMainFile, passportSignFile, natinality, workerDetailTabInfoPassport?.id, onSaved, setError]);

    const canUpload = (Array.isArray(isWorkerPermissionAccessInfo?.worker_worker_passport_details) && isWorkerPermissionAccessInfo.worker_worker_passport_details.includes('edit')) || isAdmin;
    const saveBlocked = !passportMainFile || (natinality && !passportSignFile);

    const dateField = (name, label) => (
        <div className="wkd-det-field">
            <label className="wkd-det-elbl required">{ label }</label>
            <Controller
                name={ name }
                control={ control }
                render={ ({ field, fieldState: { error } }) => (
                    <>
                        <BioDateInput
                            mode="date"
                            name={ field.name }
                            value={ field.value || '' }
                            error={ Boolean(error) }
                            ariaLabel={ label }
                            onChange={ field.onChange }
                        />
                        { error && (
                            <small className="text-danger">{ error.message }</small>
                        ) }
                    </>
                ) }
            />
        </div>
    );

    return <>
        <div className="g2-card wkd-det-card">
            <WkdDetCardHead title={ translation('key_passport') } status={ sectionStatus } />
            <Suspense fallback={ <div>{ translation('key_loading') }...</div> }>
                <div className="wkd-det-sec is-edit">
                    <div className="wkd-det-filetitle">{ translation('key_passport_main_page') } <span className="req">*</span></div>
                    { passportMainFile ? (
                        <WkdDetFileCard
                            url={ passportMainFile.url }
                            name={ passportMainFile.fileOriginalName }
                            uploadedAt={ passportMainFile.fileOriginalName === 'passport-main' ? workerDetailTabInfoPassport?.passport_main_page_uploaded_at : undefined }
                            onDownload={ handleDownloadMainFile }
                            onDelete={ handleDeleteMainFile }
                        />
                    ) : canUpload && (
                        <div className={ `wkd-det-drop${ mainFileError ? ' is-error' : '' }` }>
                            <UploadFile marginBottomClass="" onChange={ (event) => handleFileUploadChange(event, 'passport-main-page') } />
                        </div>
                    ) }
                    { mainFileError && (
                        <small className="text-danger wkd-det-err">{ mainFileError }</small>
                    ) }
                </div>
                { natinality && (
                    <div className="wkd-det-sec is-edit">
                        <div className="wkd-det-filetitle">{ translation('key_passport_sign_page') } <span className="req">*</span></div>
                        { passportSignFile ? (
                            <WkdDetFileCard
                                url={ passportSignFile.url }
                                name={ passportSignFile.fileOriginalName }
                                uploadedAt={ passportSignFile.fileOriginalName === 'passport-sign' ? workerDetailTabInfoPassport?.passport_sign_page_uploaded_at : undefined }
                                onDownload={ handleDownloadSignFile }
                                onDelete={ handleDeleteSignFile }
                            />
                        ) : canUpload && (
                            <div className={ `wkd-det-drop${ signFileError ? ' is-error' : '' }` }>
                                <UploadFile marginBottomClass="" onChange={ (event) => handleFileUploadChange(event, 'passport-sign-page') } />
                            </div>
                        ) }
                        { signFileError && (
                            <small className="text-danger wkd-det-err">{ signFileError }</small>
                        ) }
                    </div>
                ) }
                { /* W-31: one attribution line for the block — from the latest passport Activity entry (null when none) */ }
                { workerDetailTabInfoPassport?.passport_updated_at && (
                    <div className="wkd-det-hint wkd-det-filemeta">
                        { translation('key_updated') }: { [workerDetailTabInfoPassport.passport_updated_by_name, changeDynamicDateFormate(workerDetailTabInfoPassport.passport_updated_at, 'DD MMM YYYY HH:mm')].filter(Boolean).join(' · ') }
                    </div>
                ) }
            </Suspense>
            <form id={ DET_FORM_IDS.passport } className="wkd-bio-edit wkd-det-form" onSubmit={ handleSubmit(onSubmit) }>
                <div className="wkd-det-sec is-edit is-last">
                    <div className="det-grid-edit">
                        <div className="wkd-det-field">
                            <label className="wkd-det-elbl required">{ translation('key_passport_no') }</label>
                            <Controller
                                name="passport_number"
                                control={ control }
                                render={ ({ field, fieldState: { error } }) => (
                                    <>
                                        <input
                                            className={ `form-control mono ${ error?.message ? 'is-invalid' : '' }` }
                                            type="text"
                                            { ...field }
                                            maxLength={ 11 }
                                            { ...register('passport_number') }
                                        />
                                        { error && (
                                            <small className="text-danger">{ error.message }</small>
                                        ) }
                                    </>
                                ) }
                            />
                        </div>
                        <div className="wkd-det-field">
                            <label className="wkd-det-elbl required">{ translation('key_place_of_issue') }</label>
                            <Controller
                                name="passport_place_of_issue"
                                control={ control }
                                render={ ({ field, fieldState: { error } }) => (
                                    <>
                                        <input
                                            className={ `form-control ${ error?.message ? 'is-invalid' : '' }` }
                                            type="text"
                                            { ...field }
                                            { ...register('passport_place_of_issue') }
                                        />
                                        { error && (
                                            <small className="text-danger">{ error.message }</small>
                                        ) }
                                    </>
                                ) }
                            />
                        </div>
                        { dateField('passport_issue_date', translation('key_passport_issue_date')) }
                        { dateField('passport_expiry_date', translation('key_date_of_expiry')) }
                    </div>
                </div>
            </form>
        </div>
        <WkdDetSaveBar formId={ DET_FORM_IDS.passport } onCancel={ onCancel } disabled={ saveBlocked } saving={ status === 'loading' } />
    </>
}

PassportTabDetails.propTypes = {
    isWorkerPermissionAccessInfo: PropTypes.any,
    isAdmin: PropTypes.any,
    onSaved: PropTypes.func,
    onCancel: PropTypes.func,
    sectionStatus: PropTypes.string,
};

export default React.memo(PassportTabDetails);
