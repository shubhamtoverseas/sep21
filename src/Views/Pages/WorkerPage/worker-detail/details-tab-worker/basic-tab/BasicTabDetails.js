import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import PropTypes from 'prop-types';
import { validateSaveBasicProfile } from '../../formValidation';
import { saveWorkerBasicProfileState } from "../../../../../../components/ReusableComponents/form-states";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { fetchGetGenderList, fetchMaritalStatus } from "../../../../../../redux/Slices/common/CommonSlice";
import { fetchWorkerNationalities } from "../../../../../../redux/Slices/common/nationalities/NationalitiesSlice";
import { formatDate } from "../../../../../../services/commonService";
import { saveWorkerBasicProfileSlice, fetchWorkerDetailTabInfo } from "../../../../../../redux/Slices/worker/WorkerSlice";
import { changeDynamicDateFormate } from "../../../../../../utils/utils"
import { validateHKID, validateHKIDStripped } from "../../../../../../utils/utils";
import BioDateInput from "../../profile-tab/biodata-tab/BioDateInput";
import translation from "../../../../../../utils/translation";
import DateInput from "../../../../../../components/ui/DateInput";

// Extracted reusable text field to reduce repeated Controller boilerplate
const TextFormField = memo(({ name, control, register, extraClass }) => (
    <Controller
        name={ name }
        control={ control }
        render={ ({ field, fieldState: { error } }) => (
            <>
                <input
                    className={ `form-control ${ error?.message ? 'is-invalid' : '' }${ extraClass ? ` ${ extraClass }` : '' }` }
                    type="text"
                    { ...field }
                    { ...register(name) }
                />
                { error && (
                    <small className="text-danger">{ error.message }</small>
                ) }
            </>
        ) }
    />
));
TextFormField.displayName = 'TextFormField';
TextFormField.propTypes = {
    name: PropTypes.string.isRequired,
    control: PropTypes.object.isRequired,
    register: PropTypes.func.isRequired,
    extraClass: PropTypes.string,
};

const DetField = memo(({ label, required, span, hint, children }) => (
    <div className={ `wkd-det-field${ span ? ' det-full' : '' }` }>
        <label className={ `wkd-det-elbl${ required ? ' required' : '' }` }>{ label }</label>
        { hint && <div className="wkd-det-hint">{ hint }</div> }
        { children }
    </div>
));
DetField.displayName = 'DetField';
DetField.propTypes = {
    label: PropTypes.string.isRequired,
    required: PropTypes.bool,
    span: PropTypes.bool,
    hint: PropTypes.string,
    children: PropTypes.node,
};

// Derive form reset values from worker data in a single pass
const buildFormValues = (workerDetailTabInfo) => {
    const values = {};
    Object.keys(saveWorkerBasicProfileState).forEach((key) => {
        if (typeof workerDetailTabInfo?.[key] === 'object') {
            if (key === "primary_present_address" || key === "primary_domicile_address") {
                values[key] = workerDetailTabInfo[key]?.address || '';
            } else {
                values[key] = workerDetailTabInfo[key]?.id || '';
            }
        } else {
            values[key] = workerDetailTabInfo?.[key] || '';
        }
    });
    values.date_of_birth = workerDetailTabInfo?.date_of_birth ? formatDate(workerDetailTabInfo?.date_of_birth) : null;
    values.gender = workerDetailTabInfo?.gender ?? null;
    return values;
};

/*
 * Legacy Basic form, rendered in place inside the Details cards. `card`
 * picks which card owns the form: "basic" shows the two field sections
 * (the Work Experience rows stay in state and are resent unchanged),
 * "work" hides them and shows the editable Work Experience rows. Both
 * submit the same payload through the same thunk; the sticky Save bar
 * submits by `formId`.
 */
const BasicTabDetails = ({ onSaved, onSavingChange, card = 'basic', formId, staffType }) => {
    const dispatch = useDispatch();
    const workerDetailTabInfo = useSelector((state) => state.worker.workerDetailTabInfo);
    const genderList = useSelector((state) => state.common.genderList);
    const maritalStatus = useSelector((state) => state.common.maritalStatus);
    const workerNationalities = useSelector((state) => state.nationalities.workerNationalities);
    const { control, setError, clearErrors, setValue, reset, register, handleSubmit, formState: { errors } }
        = useForm({ resolver: yupResolver(validateSaveBasicProfile), defaultValues: saveWorkerBasicProfileState });
    const [genderValue, setGenderValue] = useState(workerDetailTabInfo?.gender);
    const [workExperiences, setWorkExperiences] = useState(null);
    const [isHKID, setisHKID] = useState("");
    const setChecked = useCallback((e) => {
        setGenderValue(e.target.value)
    }, []);

    // Memoize derived form values to avoid recomputation on every render
    const formValues = useMemo(() => buildFormValues(workerDetailTabInfo), [workerDetailTabInfo]);

    // Single merged useEffect: batch-reset form + sync local state from workerDetailTabInfo
    useEffect(() => {
        if (!workerDetailTabInfo) return;
        reset(formValues);
        setGenderValue(workerDetailTabInfo.gender);
        setWorkExperiences(Array.isArray(workerDetailTabInfo.worker_employer) ? workerDetailTabInfo.worker_employer : []);
        setisHKID(workerDetailTabInfo.hk_id ? workerDetailTabInfo.hk_id.replace(/[^A-Z0-9]/g, '') : '');
        if (workerDetailTabInfo.hk_id) {
            const res = validateHKIDStripped(workerDetailTabInfo?.hk_id);
            setisHKID(workerDetailTabInfo?.hk_id || "");
            if (!res.valid) {
                setError("hk_id", {
                    type: "manual",
                    message: res?.error,
                });
            } else {
                setValue("hk_id", res?.hkid || ""); // Update the form value with the formatted HKID
                setisHKID(res?.formatted || "");
            }
        }
    }, [workerDetailTabInfo, formValues, reset, setError, setValue]);

    // Fetch reference lists once on mount
    useEffect(() => {
        dispatch(fetchGetGenderList({ type: 'employer' }));
        dispatch(fetchMaritalStatus({ type: 'worker' }));
        dispatch(fetchWorkerNationalities({ type: 'worker' }));
    }, [dispatch]);

    const addWorkExperience = useCallback(() => {
        setWorkExperiences(prev => [...(prev || []), {
            "worker_id": workerDetailTabInfo?.id,
            "start_date": "",
            "end_date": "",
            "employer_name": "",
            "employer_address": "",
            "status": 1,
            "action": "add"
        }]);
    }, [workerDetailTabInfo?.id]);

    const handleInputChange = useCallback((e, id) => {
        const { name, value } = e.target;
        setWorkExperiences((prevExperiences) =>
            prevExperiences.map((exp, index) =>
                index === id ? { ...exp, [name]: value } : exp
            )
        );
    }, []);

    const removeWorkExperience = useCallback((id) => {
        setWorkExperiences((prevExperiences) =>
            prevExperiences.map((exp, index) =>
                index === id ? { ...exp, 'action': "delete" } : exp
            )
        );
    }, []);

    // Memoize IDs used frequently in submit
    const workerId = workerDetailTabInfo?.id;
    const presentAddressId = workerDetailTabInfo?.primary_present_address?.id;
    const domicileAddressId = workerDetailTabInfo?.primary_domicile_address?.id;

    const onSubmit = useCallback((data) => {
        let payload = {
            ...data,
            nationality: data.nationality,
            present_address: data.primary_present_address,
            domicile_address: data.primary_domicile_address,
            worker_id: workerId,
            present_address_id: presentAddressId,
            domicile_address_id: domicileAddressId,
            date_of_birth: changeDynamicDateFormate(data?.date_of_birth, "YYYY-MM-DD"),
            gender: genderValue
        }
        delete payload['primary_domicile_address'];
        delete payload['primary_present_address'];
        delete payload['nationality_info'];
        if (payload.hk_id) {
            const res = validateHKID(payload.hk_id);
            if (!res.valid) {
                setError("hk_id", { type: "manual", message: res?.error });
                return;
            } else {
                payload.hk_id = res?.hkid || payload.hk_id;
                clearErrors("hk_id");
            }
        }
        let workExperiencesList = (workExperiences || []).map((val) => {
            const newObj = { ...val };
            if (newObj?.id) {
                if (newObj.action != 'delete') {
                    newObj['action'] = "edit";
                }
            } else {
                newObj['action'] = "add";
            }
            return newObj;
        })

        payload.worker_employer = workExperiencesList;
        if (workExperiencesList) {
            /* the busy flag belongs to this card's own save, not to every worker-slice request */
            if (onSavingChange) onSavingChange(true);
            dispatch(saveWorkerBasicProfileSlice(payload)).then(res => {
                if (onSavingChange) onSavingChange(false);
                if (res?.error) {
                    ShowToast("error", res?.payload?.message);
                } else {
                    dispatch(fetchWorkerDetailTabInfo({ "worker_id": workerId, type: 'basic' }));
                    ShowToast("success", res?.payload?.message);
                    if (onSaved) onSaved();
                }
            });
        }
    }, [dispatch, genderValue, workExperiences, workerId, presentAddressId, domicileAddressId, setError, clearErrors, onSaved, onSavingChange]);

    const validate = useCallback((val) => {
        const res = validateHKID(val);
        setisHKID(res.formatted || "");
        setValue("hk_id", res?.hkid || "");
        if (!res.valid) {
            setError("hk_id", {
                type: "manual",
                message: res?.error,
            });
        } else {
            setError("hk_id", {
                type: "manual",
                message: "",
            });
        }
    }, [setError, setValue]);

    const workCard = card === 'work';
    /* the Basic fields stay mounted (same form, same payload) but hidden while
     * the Work Experience card owns the edit; surface their validation errors
     * as one line so a blocked save is never silent */
    const hiddenErrorKeys = workCard ? Object.keys(errors).filter((key) => key in saveWorkerBasicProfileState) : [];

    return (
        <form id={ formId } className="wkd-bio-edit wkd-det-form" onSubmit={ handleSubmit(onSubmit) }>
            <div className="wkd-det-sec" hidden={ workCard }>
                <div className="det-grid-edit">
                    <DetField label={ translation('key_surname') } required>
                        <TextFormField name="surname" control={ control } register={ register } />
                    </DetField>
                    <DetField label={ translation('key_given_names') } required>
                        <TextFormField name="name" control={ control } register={ register } />
                    </DetField>
                    <DetField label={ translation('key_name_in_chinese_if_applicable') }>
                        <TextFormField name="chinese_name" control={ control } register={ register } />
                    </DetField>
                    <DetField label={ translation('key_maiden_surname') }>
                        <TextFormField name="maiden_surname" control={ control } register={ register } />
                    </DetField>
                    <DetField label={ translation('key_alias_if_any') }>
                        <TextFormField name="alias_name" control={ control } register={ register } />
                    </DetField>
                    <div aria-hidden="true" />

                    <DetField label={ translation('key_sex') } required>
                        <div className="wkd-det-radios">
                            { genderList &&
                                Object.values(genderList).map((g, index) => (
                                    <div key={ index } className="custom-radio compact">
                                        <Controller
                                            control={ control }
                                            name="gender"
                                            render={ ({ field }) => (
                                                <>
                                                    <input { ...field } type="radio" value={ g.id } id={ "gende_" + g.id }
                                                        checked={ genderValue == g.id }
                                                        onChange={ setChecked }
                                                    />
                                                    <label htmlFor={ "gende_" + g.id } className="radio-label black">{ g.name }</label>
                                                </>
                                            ) }
                                        />
                                    </div>
                                ))
                            }
                        </div>
                        { errors.gender && <small className="text-danger">{ errors.gender.message }</small> }
                    </DetField>
                    <DetField label={ translation('key_date_of_birth') } required>
                        <Controller
                            name="date_of_birth"
                            control={ control }
                            render={ ({ field, fieldState: { error } }) => (
                                <BioDateInput
                                    mode="date"
                                    name={ field.name }
                                    value={ field.value || '' }
                                    error={ Boolean(error) }
                                    ariaLabel={ translation('key_date_of_birth') }
                                    onChange={ (canonical) => {
                                        field.onChange(canonical);
                                        if (canonical && new Date(canonical) > new Date()) {
                                            setError("date_of_birth", {
                                                type: "manual",
                                                message: translation('key_date_of_birth_cannot_be_in_the_future'),
                                            });
                                        } else {
                                            clearErrors("date_of_birth");
                                        }
                                    } }
                                />
                            ) }
                        />
                        { errors.date_of_birth && <small className="text-danger">{ errors.date_of_birth.message }</small> }
                    </DetField>
                    <DetField label={ translation('key_place_of_birth') }>
                        <TextFormField name="birth_place" control={ control } register={ register } />
                    </DetField>
                    <DetField label={ translation('key_place_of_origin') }>
                        <TextFormField name="origin_place" control={ control } register={ register } />
                    </DetField>
                    <DetField label={ translation('key_marital_status_civil_status') } required>
                        <Controller
                            control={ control }
                            name="marital_status"
                            render={ ({ field }) => (
                                <select { ...field } className="form-control ht44" id="maritalStatus">
                                    <option value="">{ translation('key_please_select') }</option>
                                    { maritalStatus?.map((status) => (
                                        <option key={ status.id } value={ status.id }>
                                            { status.name }
                                        </option>
                                    )) }
                                </select>
                            ) }
                        />
                        { errors.marital_status && <small className="text-danger">{ errors.marital_status.message }</small> }
                    </DetField>
                    <div aria-hidden="true" />

                    <DetField label={ translation('key_hkid') }>
                        <Controller
                            name="hk_id"
                            control={ control }
                            render={ ({ field, fieldState: { error } }) => (
                                <>
                                    <input
                                        className={ `form-control mono ${ error?.message ? 'is-invalid' : '' }` }
                                        type="text"
                                        { ...field }
                                        { ...register('hk_id') }
                                        onChange={ (e) => { validate(e.target.value) } }
                                        value={ isHKID }
                                    />
                                    { error && (
                                        <small className="text-danger">{ error.message }</small>
                                    ) }
                                </>
                            ) }
                        />
                    </DetField>
                    <DetField label={ translation('key_nationality') } required>
                        <Controller
                            name="nationality"
                            control={ control }
                            render={ ({ field }) => (
                                <select { ...field } className="form-control ht44" disabled={ staffType === 'partner' }>
                                    <option value="">{ translation('key_please_select') }</option>
                                    { workerNationalities && Object.keys(workerNationalities).length > 0 ? (
                                        Object.values(workerNationalities).map((national, i) => (
                                            <option key={ i } value={ national.id }>
                                                { national.name }
                                            </option>
                                        ))
                                    ) : (
                                        <option disabled>{ translation('key_no_nationality_available') }</option>
                                    ) }
                                </select>
                            ) }
                        />
                        { errors.nationality && <small className="text-danger">{ errors.nationality.message }</small> }
                    </DetField>
                    <DetField label={ translation('key_occupation') }>
                        <TextFormField name="occupation" control={ control } register={ register } />
                    </DetField>
                </div>
            </div>
            <div className="wkd-det-sec is-last" hidden={ workCard }>
                <div className="det-grid-edit">
                    <DetField label={ translation('key_wkr_present_address') } span>
                        <TextFormField name="primary_present_address" control={ control } register={ register } />
                    </DetField>
                    <DetField label={ translation('key_wkr_home_country_address') } span hint="Permanent address in your home country">
                        <TextFormField name="primary_domicile_address" control={ control } register={ register } />
                    </DetField>
                    <DetField label={ translation('key_current_employer_name_if_applicable') }>
                        <TextFormField name="current_employer_name" control={ control } register={ register } />
                    </DetField>
                    <DetField label={ translation('key_address_of_current_employer') }>
                        <TextFormField name="current_employer_address_line_1" control={ control } register={ register } />
                    </DetField>
                </div>
            </div>

            { workCard && (
                <div className="wkd-det-wxwrap">
                    { workExperiences && workExperiences.some((col) => col.action != "delete") ? (
                        <table className="wkd-det-wx is-edit">
                            <thead>
                                <tr>
                                    <th className="mc-collabel">{ translation('key_employer_name') }</th>
                                    <th className="mc-collabel">{ translation('key_employer_address') }</th>
                                    <th className="mc-collabel">{ translation('key_start_date') }</th>
                                    <th className="mc-collabel">{ translation('key_end_date') }</th>
                                    <th className="act" />
                                </tr>
                            </thead>
                            <tbody>
                                { workExperiences.map((col, index) => (
                                    (col.action != "delete") ?
                                        <tr key={ index }>
                                            <td>
                                                <input type="text" className="form-control" name="employer_name" placeholder={ translation('key_enter_name') } value={ col.employer_name } onChange={ (e) => handleInputChange(e, index) } />
                                            </td>
                                            <td>
                                                <input type="text" name="employer_address" className="form-control" placeholder={ translation('key_enter_address') } value={ col.employer_address } onChange={ (e) => handleInputChange(e, index) } />
                                            </td>
                                            <td>
                                                <DateInput name="start_date" value={ col.start_date ? formatDate(col.start_date) : '' } onChange={ (value) => { handleInputChange({ target: { name: 'start_date', value } }, index); clearErrors("start_date_" + index); } } />
                                                { errors?.['start_date_' + index] && <small className="text-danger">{ errors?.['start_date_' + index].message }</small> }
                                            </td>
                                            <td>
                                                <DateInput name="end_date" value={ col.end_date ? formatDate(col.end_date) : '' } onChange={ (value) => { handleInputChange({ target: { name: 'end_date', value } }, index); clearErrors("end_date_" + index); } } />
                                                { errors?.['end_date_' + index] && <small className="text-danger">{ errors?.['end_date_' + index].message }</small> }
                                            </td>
                                            <td className="act">
                                                <button type="button" className="wkd-det-iconbtn" aria-label={ translation('key_delete') } title={ translation('key_delete') } onClick={ () => removeWorkExperience(index) }>
                                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#676e77" strokeWidth="1.6" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                                                </button>
                                            </td>
                                        </tr> : null
                                )) }
                            </tbody>
                        </table>
                    ) : (
                        <div className="wkd-det-empty">{ translation('key_no_work_experience_recorded') }</div>
                    ) }
                    <button type="button" className="g2-button wkd-det-headbtn wkd-det-addbtn" onClick={ addWorkExperience }>
                        + { translation('key_add_work_experience') }
                    </button>
                    { hiddenErrorKeys.length > 0 && (
                        <small className="text-danger">{ translation('key_wkr_some_basic_fields_are_invalid_open_edit') }</small>
                    ) }
                </div>
            ) }
        </form>
    );
};

BasicTabDetails.propTypes = {
    onSaved: PropTypes.func,
    onSavingChange: PropTypes.func,
    card: PropTypes.oneOf(['basic', 'work']),
    formId: PropTypes.string,
    staffType: PropTypes.string,
};

export default React.memo(BasicTabDetails);
