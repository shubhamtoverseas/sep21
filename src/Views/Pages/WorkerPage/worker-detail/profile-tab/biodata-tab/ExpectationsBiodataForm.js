import React, { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import BioCheckGrid from "./BioCheckGrid";
import { Link } from "react-router-dom";
import { Controller, useFormState } from "react-hook-form";
import PropTypes from 'prop-types';
import UploadFile from "../../../../../../components/upload-file/UploadFile";
import { uploadFile } from "../../../../../../services/commonService";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { setWorkerLoading, clearWorkerLoading } from "../../../../../../redux/Slices/worker/WorkerSlice";
import translation from "../../../../../../utils/translation";
import { PREFERRED_LOCATION_NO_PREF_ID, INTERVIEW_ANY_DAY_ID, BIODATA_REFERENCE_LETTER_MAX_BYTES } from "../../../workerModuleConstants";
const ExpectationsBiodataForm = ({ control, dayOffList, interviewDayList, onUpdateRefrenceLetter, workerDetail, mappingBranches }) => {
    const dispatch = useDispatch();
    const { errors } = useFormState({ control });
    const [refrenceFile, setRefrenceFile] = useState("");
    const [fileFlag, setFileFlag] = useState(false);
    /* a stored "Yes" shows the uploader (and the stored letter) on open */
    const [isReferenceLetter, setIsReferenceLetter] = useState(() => String(workerDetail?.reference_letter) === '1');
    useEffect(() => {
        setIsReferenceLetter(String(workerDetail?.reference_letter) === '1');
    }, [workerDetail?.reference_letter]);
    useEffect(() => {
        if (!refrenceFile && !fileFlag) {
            if (workerDetail?.reference_letter_file) {
                let url = new URL(workerDetail?.reference_letter_file);
                let path = url.pathname;
                setRefrenceFile({ url: workerDetail?.reference_letter_file, filename: path });
            }
        }
    }, [refrenceFile, fileFlag, workerDetail?.reference_letter_file]);

    const handleFileUpload = useCallback(async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > BIODATA_REFERENCE_LETTER_MAX_BYTES) {
            ShowToast("error", translation('key_please_upload_a_file_smaller_than_5_mb'));
            return false;
        }
        try {
            const filesToUpload = [{ file: file, name: "reference-letter" }];
            dispatch(setWorkerLoading());
            const uploadedFileResponse = await uploadFile(filesToUpload);
            dispatch(clearWorkerLoading());
            setRefrenceFile(uploadedFileResponse);
            onUpdateRefrenceLetter(uploadedFileResponse, "upload");
        } catch (error) {
            ShowToast("error", error);
        }
    }, [dispatch, onUpdateRefrenceLetter]);

    const onUploadAgain = useCallback(() => {
        setRefrenceFile("");
        onUpdateRefrenceLetter("");
        setFileFlag(true);
        onUpdateRefrenceLetter({}, "remove");
    }, [onUpdateRefrenceLetter]);

    return <>
        <p className="fz20 fw-700 mt-4 text-uppercase"> { translation('key_expectations') } </p>
        {/* prototype v28 Expectations: two columns — left the five Yes / No / Consider answers, right Day Off · Preferred interview locations · Can interview on days · Reference Letter (tester 11 Sep) */}
        <div className="row">
            <div className="col-md-12 col-lg-6">
                <div className="mb-3">
                    <label className="form-label required">{ translation('key_care_for_newborn_baby') }</label>
                    <div className="mode-radio-buttons d-flex align-items-center">
                        <div className="custom-radio compact">
                            <Controller
                                control={ control }
                                name="care_newborn"
                                render={ ({ field }) => (
                                    <>
                                        <input  { ...field } type="radio" value="1" id="babyCareYes" checked={ String(field.value) === '1' } />
                                        <label
                                            htmlFor="babyCareYes"
                                            className="radio-label black">
                                            {translation('key_yes')}
                                        </label>
                                    </>
                                ) }
                            />
                        </div>
                        <div className="custom-radio compact">
                            <Controller
                                control={ control }
                                name="care_newborn"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="babyCareNo"
                                            value="0"
                                            checked={ String(field.value) === '0' }
                                        />
                                        <label
                                            htmlFor="babyCareNo"
                                            className="radio-label black">
                                            {translation('key_no')}
                                        </label>
                                    </>
                                ) }
                            />
                        </div>
                        <div className="custom-radio compact">
                            <Controller
                                control={ control }
                                name="care_newborn"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="babyCareConsider"
                                            value="2"
                                            checked={ String(field.value) === '2' }
                                        />
                                        <label
                                            htmlFor="babyCareConsider"
                                            className="radio-label black">
                                            { translation('key_consider') }
                                        </label>
                                    </>
                                ) }
                            />

                        </div>
                    </div>
                </div>
                <div className="mb-3">
                    <label className="form-label required">{ translation('key_provide_care_for_elderly') }</label>
                    <div className="mode-radio-buttons d-flex align-items-center">
                        <div className="custom-radio compact">
                            <Controller
                                control={ control }
                                name="care_elderly"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="care_elderly_yes"
                                            value="1"
                                            checked={ String(field.value) === '1' }
                                        />
                                        <label
                                            htmlFor="care_elderly_yes"
                                            className="radio-label black">
                                            { translation('key_yes') }
                                        </label>
                                    </>
                                ) }
                            />
                        </div>
                        <div className="custom-radio compact">
                            <Controller
                                control={ control }
                                name="care_elderly"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="care_elderly_no"
                                            value="0"
                                            checked={ String(field.value) === '0' }
                                        />
                                        <label
                                            htmlFor="care_elderly_no"
                                            className="radio-label black">
                                            {translation('key_no') }
                                        </label>
                                    </>
                                ) }
                            />

                        </div>
                        <div className="custom-radio compact">
                            <Controller
                                control={ control }
                                name="care_elderly"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="care_elderly_consider"
                                            value='2'
                                            checked={ String(field.value) === '2' }
                                        />
                                        <label
                                            htmlFor="care_elderly_consider"
                                            className="radio-label black">
                                            { translation('key_consider') }
                                        </label>
                                    </>
                                ) }
                            />
                        </div>
                    </div>
                    { errors.care_elderly && <small className="text-danger">{ errors.care_elderly.message }</small> }
                </div>
                <div className="mb-3">
                    <label className="form-label required">{ translation('key_care_for_someone_with_disability') }</label>
                    <div className="mode-radio-buttons d-flex align-items-center">
                        <div className="custom-radio compact">

                            <Controller
                                control={ control }
                                name="care_disability"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="disabilityCareYes"
                                            value="1"
                                            checked={ String(field.value) === '1' }
                                        />
                                        <label
                                            htmlFor="disabilityCareYes"
                                            className="radio-label black">
                                            { translation('key_yes') }
                                        </label>
                                    </>
                                ) }
                            />

                        </div>
                        <div className="custom-radio compact">

                            <Controller
                                control={ control }
                                name="care_disability"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="disabilityCareNo"
                                            value="0"
                                            checked={ String(field.value) === '0' }
                                        />
                                        <label
                                            htmlFor="disabilityCareNo"
                                            className="radio-label black">
                                            {translation('key_no') }
                                        </label>
                                    </>
                                ) }
                            />
                        </div>
                        <div className="custom-radio compact">
                            <Controller
                                control={ control }
                                name="care_disability"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="disabilityCareConsider"
                                            value="2"
                                            checked={ String(field.value) === '2' }
                                        />
                                        <label
                                            htmlFor="disabilityCareConsider"
                                            className="radio-label black">
                                            { translation('key_consider') }
                                        </label>
                                    </>
                                ) }
                            />
                            { errors.care_disability && <small className="text-danger">{ errors.care_disability.message }</small> }
                        </div>
                    </div>

                </div>
                <div className="mb-3">
                    <label className="form-label required">{ translation('key_share_work_with_another_helper') }</label>
                    <div className="mode-radio-buttons d-flex align-items-center">
                        <div className="custom-radio compact">
                            <Controller
                                control={ control }
                                name="share_work"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="anotherHelperYes"
                                            value='1'
                                            checked={ String(field.value) === '1' }
                                        />
                                        <label
                                            htmlFor="anotherHelperYes"
                                            className="radio-label black">
                                            {translation('key_yes') }
                                        </label>
                                    </>
                                ) }
                            />

                        </div>
                        <div className="custom-radio compact">
                            <Controller
                                control={ control }
                                name="share_work"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="anotherHelperNo"
                                            value='0'
                                            checked={ String(field.value) === '0' }
                                        />
                                        <label
                                            htmlFor="anotherHelperNo"
                                            className="radio-label black">
                                            {translation('key_no') }
                                        </label>
                                    </>
                                ) }
                            />

                        </div>
                        <div className="custom-radio compact">
                            <Controller
                                control={ control }
                                name="share_work"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="anotherHelperConsider"
                                            value='2'
                                            checked={ String(field.value) === '2' }
                                        />
                                        <label
                                            htmlFor="anotherHelperConsider"
                                            className="radio-label black">
                                            { translation('key_consider') }
                                        </label>
                                    </>
                                ) }
                            />
                        </div>
                        { errors.share_work && <small className="text-danger">{ errors.share_work.message }</small> }
                    </div>
                </div>
                <div className="mb-3">
                    <label className="form-label required">{ translation('key_share_room') }</label>
                    <div className="mode-radio-buttons d-flex align-items-center">
                        <div className="custom-radio compact">
                            <Controller
                                control={ control }
                                name="share_room"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="shareRoomYes"
                                            value="1"
                                            checked={ String(field.value) === '1' }
                                        />
                                        <label
                                            htmlFor="shareRoomYes"
                                            className="radio-label black">
                                            {translation('key_yes') }
                                        </label>
                                    </>
                                ) }
                            />

                        </div>
                        <div className="custom-radio compact">
                            <Controller
                                control={ control }
                                name="share_room"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="shareRoomNo"
                                            value="0"
                                            checked={ String(field.value) === '0' }
                                        />
                                        <label
                                            htmlFor="shareRoomNo"
                                            className="radio-label black">
                                            {translation('key_no') }
                                        </label>
                                    </>
                                ) }
                            />
                        </div>
                        <div className="custom-radio compact">
                            <Controller
                                control={ control }
                                name="share_room"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="shareRoomConsider"
                                            value='2'
                                            checked={ String(field.value) === '2' }
                                        />
                                        <label
                                            htmlFor="shareRoomConsider"
                                            className="radio-label black">
                                            { translation('key_consider') }
                                        </label>
                                    </>
                                ) }
                            />
                        </div>
                        { errors.share_room && <small className="text-danger">{ errors.share_room.message }</small> }
                    </div>
                </div>
            </div>
            <div className="col-md-12 col-lg-6">
                <div className="mb-3">
                    {/* conflict sheet U-0208: Day Off is a MULTI select over the documented list (Flexible · Saturday or Sunday · Sunday … Monday); the options come from the day-off master */}
                    <label className="form-label required">{ translation('key_day_off') }</label>
                    <Controller
                        control={ control }
                        name="day_off"
                        render={ ({ field }) => (
                            <BioCheckGrid
                                cols={ 3 }
                                ariaLabel={ translation('key_day_off') }
                                options={ (dayOffList || []).map((item) => ({ id: item.id, name: item.name })) }
                                value={ Array.isArray(field.value) ? field.value : [] }
                                onChange={ field.onChange }
                                error={ Boolean(errors.day_off) }
                            />
                        ) }
                    />
                    { errors.day_off && <small className="text-danger">{ errors.day_off.message }</small> }
                </div>
                { workerDetail?.type === 1 && <div className="mb-3">
                    <label className="form-label required">{ translation('key_wkr_preferred_interview_locations') }</label>
                    <Controller
                        name="preferred_interview_locations"
                        control={ control }
                        render={ ({ field }) => {
                            const value = Array.isArray(field.value) ? field.value : [];
                            const noPref = value.includes(PREFERRED_LOCATION_NO_PREF_ID);
                            const options = [{ id: PREFERRED_LOCATION_NO_PREF_ID, name: translation('key_no_preference') }, ...(mappingBranches || []).map((b) => ({ id: b.id, name: b.name }))];
                            return (
                                <BioCheckGrid
                                    cols={ 3 }
                                    ariaLabel={ translation('key_wkr_preferred_interview_locations') }
                                    options={ noPref ? options.filter((o) => o.id === PREFERRED_LOCATION_NO_PREF_ID) : options }
                                    value={ noPref ? [PREFERRED_LOCATION_NO_PREF_ID] : value }
                                    onChange={ (next) => field.onChange(next.includes(PREFERRED_LOCATION_NO_PREF_ID) ? [PREFERRED_LOCATION_NO_PREF_ID] : next) }
                                    error={ Boolean(errors.preferred_interview_locations) }
                                />
                            );
                        } }
                    />
                    { errors.preferred_interview_locations && <small className="text-danger">{ errors.preferred_interview_locations?.message }</small> }
                </div> }
                <div className="mb-3">
                    <label className="form-label required">{ translation('key_can_interview_on') }</label>
                    <Controller
                        name="interview_day"
                        control={ control }
                        render={ ({ field }) => {
                            const value = Array.isArray(field.value) ? field.value : [];
                            const anyDay = value.includes(INTERVIEW_ANY_DAY_ID);
                            return (
                                <BioCheckGrid
                                    cols={ 3 }
                                    ariaLabel={ translation('key_can_interview_on') }
                                    options={ (interviewDayList || []).map((item) => ({ id: item.id, name: item.name, })).filter((o) => !anyDay || o.id === INTERVIEW_ANY_DAY_ID) }
                                    value={ anyDay ? [INTERVIEW_ANY_DAY_ID] : value }
                                    onChange={ (next) => field.onChange(next.includes(INTERVIEW_ANY_DAY_ID) ? [INTERVIEW_ANY_DAY_ID] : next) }
                                    error={ Boolean(errors.interview_day) }
                                />
                            );
                        } }
                    />
                    { errors.interview_day && <small className="text-danger">{ errors.interview_day.message }</small> }
                </div>
                <div className="mb-3">
                    <label className="form-label required">{ translation('key_wkr_reference_letter_available') }</label>
                    <div className="mode-radio-buttons d-flex align-items-center">
                        <div className="custom-radio compact">
                            <Controller
                                control={ control }
                                name="reference_letter"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="referenceLetterYes"
                                            value="1"
                                            checked={ String(field.value) === '1' }
                                            onClick={ () => setIsReferenceLetter(true) }
                                        />
                                        <label
                                            htmlFor="referenceLetterYes"
                                            className="radio-label black">
                                            {translation('key_yes')}
                                        </label>
                                    </>
                                ) }
                            />

                        </div>
                        <div className="custom-radio compact">
                            <Controller
                                control={ control }
                                name="reference_letter"
                                render={ ({ field }) => (
                                    <>
                                        <input
                                            { ...field }
                                            type="radio"
                                            id="referenceLetterNo"
                                            value="0"
                                            checked={ String(field.value) === '0' }
                                            onClick={ () => setIsReferenceLetter(false) }
                                        />
                                        <label
                                            htmlFor="referenceLetterNo"
                                            className="radio-label black">
                                            {translation('key_no')}
                                        </label>
                                    </>
                                ) }
                            />

                        </div>
                    </div>
                    { errors.reference_letter && <small className="text-danger">{ errors.reference_letter.message }</small> }

                    { isReferenceLetter && <div className="w-100 mt-3">
                        { isReferenceLetter && <label className="form-label"> { translation('key_upload_reference_letter') }</label> }
                        { !refrenceFile && isReferenceLetter && <UploadFile onChange={ handleFileUpload } accept=".pdf" /> }
                        { refrenceFile && <div><iframe
                            src={ refrenceFile.url }
                            title={ translation('key_wkr_uploaded_reference_letter') }
                            className="pdf-preview border-0 pdf-preview-frame"
                        ></iframe><Link className="fz16 fw-400 blue cursor-pointer" onClick={ onUploadAgain }>{ translation('key_upload_again') }</Link></div> }
                    </div> }
                </div>
            </div>
        </div>
        <div className="row">
            <div className="col-12 mb-3">
                <label className="form-label">{ translation('key_wkr_tell_employers_more_about_you_optional') }</label>
                <Controller
                    control={ control }
                    name="additional_info"
                    render={ ({ field }) => (
                        <div className="bio-textarea-wrap">
                            <textarea
                                { ...field }
                                value={ field.value || '' }
                                className="form-control"
                                rows={ 3 }
                                maxLength={ 1000 }
                            />
                            <span className="bio-textarea-count">{ String(field.value || '').length }/1000</span>
                        </div>
                    ) }
                />
            </div>
        </div>
    </>
}

ExpectationsBiodataForm.propTypes = {
    errors: PropTypes.any,
    control: PropTypes.any,
    dayOffList: PropTypes.any,
    interviewDayList: PropTypes.any,
    onUpdateRefrenceLetter: PropTypes.func,
    workerDetail: PropTypes.any,
    mappingBranches: PropTypes.array
}
export default React.memo(ExpectationsBiodataForm);