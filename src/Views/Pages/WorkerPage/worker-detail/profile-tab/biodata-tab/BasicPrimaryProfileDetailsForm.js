import React, { useState, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Controller, useFormState, useWatch } from "react-hook-form";
import PropTypes from 'prop-types';
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { workerMinAgeByNationalityId } from "../../../../../../components/ReusableComponents/constants";
import translation from "../../../../../../utils/translation";
import { changeDynamicDateFormate } from "../../../../../../utils/utils";
import BioDateInput from "./BioDateInput";
import { emptySel } from "./BioCard";
import { BIODATA_WEIGHT_RANGE, WORKER_DEFAULT_MIN_AGE, WORKER_MIN_AGE_MESSAGE_KEYS } from "../../../workerModuleConstants";

dayjs.extend(customParseFormat);

/* the form seeds date_of_birth as MM-DD-YYYY and stores YYYY-MM-DD after an edit; the date box wants the canonical form */
const dobCanonical = (v) => {
    if (!v) return '';
    const parsed = dayjs(v, ['YYYY-MM-DD', 'MM-DD-YYYY'], true);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : changeDynamicDateFormate(v, 'YYYY-MM-DD');
};

const BasicPrimaryProfileDetailsForm = ({
    workerDetail, control, roles, nationalities, religionList,
    heightMeasurement, maritalStatus,
    register, genderList, handleChangeState, handleUpdateAge, getValues, onUpdateSetValues, setError, clearErrors }) => {
    const [roleValue, setRoleValue] = useState(workerDetail?.role?.id);
    const [genderValue, setGenderValue] = useState(workerDetail?.gender?.id);
    const { errors } = useFormState({ control });
    const [age, setAge] = useState(getValues('age'));
    const dobWatch = useWatch({ control, name: 'date_of_birth' });
    const ageWatch = useWatch({ control, name: 'age' });
    /* registered selects: placeholder colour while empty */
    const [nationalityWatch, religionWatch, heightWatch] = useWatch({ control, name: ['nationality', 'religion', 'height'] });
    /* WORKER.md §3 Step 2: minimum age by nationality — the form's pick, else the record's; 18 when the nationality has no rule */
    const minAge = workerMinAgeByNationalityId[Number(nationalityWatch) || workerDetail?.nationality?.id] ?? WORKER_DEFAULT_MIN_AGE;
    const setRoleChecked = useCallback((e) => {
        setRoleValue(parseInt(e.target.value))
        onUpdateSetValues('role', parseInt(e.target.value))
    }, [onUpdateSetValues]);

    const setGenderChecked = useCallback((e) => {
        setGenderValue(parseInt(e.target.value))
        onUpdateSetValues('gender', parseInt(e.target.value))
    }, [onUpdateSetValues]);

    const handleDob = useCallback((e) => {
        const dobValue = e.target.value;
        if (!dobValue) {
            ShowToast("error", translation('key_invalid_date_of_birth'));
            handleUpdateAge(0, dobValue);
            return;
        }
        const dob = new Date(dobValue);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        const hundredYearsAgo = new Date();
        hundredYearsAgo.setFullYear(today.getFullYear() - 100);

        // Remove time part for comparison
        dob.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        yesterday.setHours(0, 0, 0, 0);
        hundredYearsAgo.setHours(0, 0, 0, 0);

        if (dob > yesterday) {
            ShowToast("error", translation('key_dob_cannot_be_today_or_future'));
            handleUpdateAge(0, dobValue);
            return;
        }
        if (dob < hundredYearsAgo) {
            ShowToast("error", translation('key_dob_too_old'));
            handleUpdateAge(0, dobValue);
            return;
        }

        // Calculate age
        const ageDifMs = today.getTime() - dob.getTime();
        const ageDate = new Date(ageDifMs);
        const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);

        // Nationality-based minimum age validation
        if (calculatedAge < minAge) {
            ShowToast("error", translation(WORKER_MIN_AGE_MESSAGE_KEYS[minAge] || WORKER_MIN_AGE_MESSAGE_KEYS[WORKER_DEFAULT_MIN_AGE]));
            handleUpdateAge(0, dobValue);
            return;
        }
        setAge(calculatedAge);
        handleUpdateAge(calculatedAge, dobValue);
    }, [handleUpdateAge, minAge]);

    const handleChange = useCallback((name, e) => {
        handleChangeState(name, e)
    }, [handleChangeState]);

    const ageDisplay = useMemo(() => {
        const dob = dayjs(dobWatch);
        if (!dob.isValid()) return ageWatch || age || '';
        const totalMonths = dayjs().diff(dob, 'month');
        /* the Sep handoff prototype prints the age as whole years ('38 years'); the older Review Rail's 'years + months' is superseded */
        return `${ Math.floor(totalMonths / 12) } ${ translation('key_years_lc') }`;
    }, [dobWatch, ageWatch, age]);

    // Calculate min and max date for DOB input (minimum age by nationality, max age 100)
    const { minDate, maxAllowedDob } = useMemo(() => {
        const today = new Date();
        const minDateObj = new Date();
        minDateObj.setFullYear(today.getFullYear() - 100);
        minDateObj.setHours(0, 0, 0, 0);
        const minAgeDateObj = new Date();
        minAgeDateObj.setFullYear(today.getFullYear() - minAge);
        minAgeDateObj.setHours(0, 0, 0, 0);
        return {
            minDate: minDateObj.toISOString().split("T")[0],
            maxAllowedDob: minAgeDateObj.toISOString().split("T")[0],
        };
    }, [minAge]);

    return <>
        {/* v18.6 section title: "Profile" */}
        <p className="fz20 fw-700 mt-4 text-uppercase"> { translation('key_profile') }</p>
        <div className="row">
            <div className="col-4 mb-3">
                <label className="form-label required">{ translation('key_role') }</label>
                <div className="mode-radio-buttons d-flex align-items-center">
                    { roles &&
                        Object.values(roles).map((role, index) => (
                            <div key={ index } className="custom-radio compact">
                                <Controller
                                    control={ control }
                                    name="role"
                                    render={ ({ field }) => (
                                        <>
                                            <input  { ...field } type="radio" value={ role.id } id={ "role" + role.id } checked={ roleValue === role.id } onChange={ setRoleChecked } />
                                            <label htmlFor={ "role" + role.id } className="radio-label black">{ role.name }</label>
                                        </>
                                    ) }
                                />
                            </div>
                        ))
                    }
                </div>
                { errors.role && <small className="text-danger">{ errors.role.message }</small> }
            </div>
            <div className="col-4 mb-3">
                <label className="form-label required">{ translation('key_nationality') }</label>
                <select { ...register("nationality") } className={ `form-control ht44${ emptySel(nationalityWatch) }` }>
                    <option value="">{ translation('key_please_select') }</option>
                    { nationalities && Object.keys(nationalities).length > 0 ? (
                        Object.values(nationalities).map((national, i) => (
                            <option key={ i } value={ national.id }>
                                { national.name }
                            </option>
                        ))
                    ) : (
                        <option disabled>{ translation('key_no_nationality_available') }</option>
                    ) }
                </select>
                { errors.nationality && <small className="text-danger">{ errors.nationality.message }</small> }
            </div>
            <div className="col-4 mb-3">
                <label className="form-label required">{ translation('key_gender').replace(/:\s*$/, '') }</label>
                <div className="mode-radio-buttons d-flex align-items-center">

                    { genderList &&
                        Object.values(genderList).map((g, index) => (
                            <div key={ index } className="custom-radio compact">
                                <Controller
                                    control={ control }
                                    name="gender"
                                    render={ ({ field }) => (
                                        <>
                                            <input  { ...field } type="radio" value={ g.id } id={ "gender" + g.id } checked={ genderValue === g.id } onChange={ setGenderChecked } />
                                            <label htmlFor={ "gender" + g.id } className="radio-label black">{ g.name }</label>
                                        </>
                                    ) }
                                />
                            </div>
                        ))
                    }
                </div>
                { errors.gender && <small className="text-danger">{ errors.gender.message }</small> }
            </div>
        </div>

        {/* Date of Birth · Height · Weight */}
        <div className="row">
            <div className="col-4 mb-3">
                <label className="form-label required">{ translation('key_date_of_birth') }</label>
                <Controller
                    control={ control }
                    name="date_of_birth"
                    render={ ({ field }) => (
                        <BioDateInput
                            mode="date"
                            name={ field.name }
                            ariaLabel={ translation('key_date_of_birth') }
                            value={ dobCanonical(field.value) }
                            min={ minDate }
                            max={ maxAllowedDob }
                            error={ Boolean(errors.date_of_birth) }
                            onChange={ (v) => handleDob({ target: { value: v } }) }
                        />
                    ) }
                />
                { errors.date_of_birth && <small className="text-danger">{ errors.date_of_birth.message }</small> }
            </div>
            <div className="col-4 mb-3">
                <label className="form-label required">{ translation('key_height') }</label>
                <select { ...register("height") } className={ `form-control ht44${ emptySel(heightWatch) }` }>
                    <option value="">{ translation('key_please_select') }</option>
                    { heightMeasurement && Object.keys(heightMeasurement).length > 0 ? (
                        Object.values(heightMeasurement).map((national, i) => (
                            <option key={ i } value={ national.id }>
                                { national.name }
                            </option>
                        ))
                    ) : (
                        <option disabled>{ translation('key_list_not_found') }</option>
                    ) }
                </select>
                { errors.height && <small className="text-danger">{ errors.height.message }</small> }
            </div>
            <div className="col-4 mb-3">
                <label className={ `form-label ${ workerDetail?.type === 2 ? 'required' : '' }` }>{ translation('key_weight') }</label>
                <Controller
                    control={ control }
                    name="weight"
                    render={ ({ field }) => (
                        <div className="wkd-unit-field">
                            <input
                                type="text"
                                min="0"
                                { ...field }
                                placeholder={ translation('key_weight') }
                                className="form-control"
                                max={ BIODATA_WEIGHT_RANGE.max }
                                onChange={ (e) => {
                                    const value = e.target.value;
                                    // WORKER.md Step 4: whole kilograms, 1–150
                                    if (value === "" || (/^\d+$/.test(value) && parseInt(value, 10) <= BIODATA_WEIGHT_RANGE.max)) {
                                        handleChange('weight', e);
                                        field.onChange(e);
                                        clearErrors("weight");
                                    } else if (parseInt(value, 10) < 0) {
                                        setError("weight", {
                                            type: "manual",
                                            message: translation('key_weight_must_be_non_negative')
                                        });
                                    } else {
                                        setError("weight", {
                                            type: "manual",
                                            message: translation('key_weight_must_be_less_than_150')
                                        });
                                    }
                                } }
                                value={ getValues('weight') === 0 ? "" : getValues('weight') }
                            />
                            <span className="wkd-unit-suffix">{ translation('key_kg') }</span>
                        </div>
                    ) }
                />
                { errors.weight && <small className="text-danger">{ errors.weight.message }</small> }
            </div>
        </div>

        {/* Age · Marital Status · Religion */}
        <div className="row">
            <div className="col-4 mb-3">
                <label className="form-label">{ translation('key_age') }</label>
                <input
                    placeholder={ translation('key_age') }
                    className="form-control"
                    value={ ageDisplay }
                    readOnly
                    disabled
                />
                { errors.age && <small className="text-danger">{ errors.age.message }</small> }
            </div>
            <div className="col-4 mb-3">
                <label className="form-label required">{ translation('key_marital_status') }</label>
                <Controller
                    control={ control }
                    name="marital_status"
                    render={ ({ field }) => (
                        <select { ...field } className={ `form-control ht44${ emptySel(field.value) }` } id="maritalStatus">
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
            </div>
            <div className="col-4 mb-3">
                <label className="form-label required">{ translation('key_religion') }</label>
                <select { ...register("religion") } className={ `form-control ht44${ emptySel(religionWatch) }` } id="religion">
                    <option value="">{ translation('key_please_select') }</option>
                    { religionList?.map((religion) => (
                        <option key={ religion.id } value={ religion.id }>
                            { religion.name }
                        </option>
                    )) }
                </select>
                { errors.religion && <small className="text-danger">{ errors.religion.message }</small> }
            </div>
        </div>
    </>
}

BasicPrimaryProfileDetailsForm.propTypes = {
    errors: PropTypes.any,
    workerDetail: PropTypes.any,
    control: PropTypes.any,
    roles: PropTypes.any,
    nationalities: PropTypes.any,
    religionList: PropTypes.any,
    heightMeasurement: PropTypes.any,
    maritalStatus: PropTypes.any,
    register: PropTypes.any,
    genderList: PropTypes.any,
    handleChangeState: PropTypes.any,
    handleUpdateAge: PropTypes.any,
    getValues: PropTypes.any,
    onUpdateSetValues: PropTypes.any,
    setError: PropTypes.any,
    clearErrors: PropTypes.any,
}

export default React.memo(BasicPrimaryProfileDetailsForm);
