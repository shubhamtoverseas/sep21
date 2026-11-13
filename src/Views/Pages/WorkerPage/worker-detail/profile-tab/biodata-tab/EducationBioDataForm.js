import React from "react";
import { Controller, useFormState } from "react-hook-form";
import PropTypes from 'prop-types';
import Select from "react-select";
import translation from "../../../../../../utils/translation";
import { courseDisplayName } from "../../../../../../utils/workerDisplay";
import BioCheckGrid from "./BioCheckGrid";
import { emptySel } from "./BioCard";
const EducationBioDataForm = ({ control, watch, educationList, courseList, languages, register }) => {
    const { errors } = useFormState({ control });
    return <>
        <p className="fz20 fw-700 text-uppercase">{ translation('key_language_and_education') }</p>

        <div className="row">
            <div className="col-12 mb-3">
                <label className="form-label required">{ translation('key_languages_known') }</label>
                <Controller
                    name="spoken_language"
                    control={ control }
                    render={ ({ field }) => (
                        <BioCheckGrid
                            cols={ 3 }
                            ariaLabel={ translation('key_languages') }
                            options={ (languages || []).map((item) => ({ id: item.id, name: item.name })) }
                            value={ field.value || [] }
                            onChange={ field.onChange }
                            error={ Boolean(errors.spoken_language) }
                        />
                    ) }
                />
                { errors.spoken_language && <small className="text-danger">{ errors.spoken_language.message }</small> }
            </div>
            <div className="col-6 mb-3">
                <label className="form-label"> { translation('key_special_course') }</label>
                <Controller
                    name="special_course"
                    control={ control }
                    render={ ({ field }) => {
                        const selectedOptions = field.value
                            ? field.value.map((selectedId) =>
                                [
                                    ...courseList,
                                ]
                                    .find((item) => item.id === selectedId)
                            )
                            : [];

                        const isNoPreferenceSelected = selectedOptions.some(
                            (option) => option?.id === 0
                        );
                        return (
                            <Select
                                { ...field }
                                styles={ { control: (provided) => ({ ...provided, minHeight: "44px" }) } }
                                options={ isNoPreferenceSelected ? [] :
                                    [
                                        ...courseList,
                                    ].map((item) => ({
                                        value: item.id,
                                        label: courseDisplayName(item.name),
                                    })) }
                                isMulti
                                value={ selectedOptions.map((option) => ({
                                    value: option?.id,
                                    label: courseDisplayName(option?.name),
                                })) }
                                onChange={ (selected) => {
                                    let selectedAltered = [];
                                    if (selected.some((s) => s.value === 0)) {
                                        selectedAltered = [{ value: 0, label: translation('key_none') }];
                                    } else {
                                        selectedAltered = selected.map((s) => ({
                                            value: s.value,
                                            label: s.label,
                                        }));
                                    }
                                    field.onChange(selectedAltered.map((s) => s.value));
                                } }
                            />
                        );
                    } }
                />
                { errors.special_course && <small className="text-danger">{ errors.special_course.message }</small> }
            </div>
        </div>
        <div className="row align-items-end">
            <div className="col-6 mb32">
                <label className="form-label required">{ translation('key_education') }</label>
                <Controller
                    control={ control }
                    name="education"
                    render={ ({ field }) => (
                        <select { ...field } className={ `form-control ht44${ emptySel(field.value) }` } id="education">
                            <option value="">{ translation('key_please_select') }</option>
                            { educationList?.map((item) => (
                                <option key={ item.id } value={ item.id } >{ item.name }</option>
                            )) }
                        </select>
                    ) }
                />
                { errors.education && <small className="text-danger">{ errors.education.message }</small> }
            </div>
            {watch("education") &&
                ["4"].includes(watch("education").toString()) && (
                    <div className="col-6 mb32">
                        <div className="form-row">
                            <div className="col">
                                <label className="form-label required">
                                    {translation('key_institution_college_university')}
                                </label>

                                 <input
                                    { ...register("college_name") }
                                    type="text"
                                    className={ `form-control ${errors.college_name ? "is-invalid" : ""}` }
                                    id="college_name"
                                    maxLength={ 120 }
                                />

                                {errors.college_name && (
                                    <small className="text-danger">
                                        {errors.college_name.message}
                                    </small>
                                )}
                            </div>
                        </div>
                    </div>
                )}
        </div>
        <p className="bio-hint">{ translation('key_wkr_institution_college_university_appears_required_') }</p>
    </>
}

EducationBioDataForm.propTypes = {
    errors: PropTypes.any,
    watch: PropTypes.any,
    control: PropTypes.any,
    educationList: PropTypes.any,
    courseList: PropTypes.any,
    languages: PropTypes.any,
    register: PropTypes.any,
}

export default EducationBioDataForm;