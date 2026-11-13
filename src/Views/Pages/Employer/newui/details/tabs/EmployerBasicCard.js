import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Controller } from "react-hook-form";
import dayjs from "dayjs";
import WkdReadField from "../../../../WorkerPage/worker-detail/newui/details/WkdReadField";
import Icon from "../../../../../../components/Icon/Icon";
import DateInput from "../../../../../../components/ui/DateInput";
import { formatHKIDForDisplay, getCalculatedAge } from "../../../../../../services/commonService";
import { validateHKID } from "../../../../../../utils/utils";
import translation from "../../../../../../utils/translation";
import EmdCard from "./EmdCard";
import styles from "../../NewEmployerModal.module.css";
import { primaryLanguageLabel } from "../../usePrimaryLanguages";
import { EMPLOYER_TITLE_OPTIONS, DATE_DISPLAY_FORMAT, EMPLOYER_GENDER_LEGACY_UNSET, EMPLOYER_GENDER_MALE_ID } from "../../employerNewUiConstants";

const Field = ({ label, required, error, children }) => (
    <div className={ styles.field }>
        <div className={ styles.fieldLabel }><span>{ label }{ required && <span className={ styles.required }>*</span> }</span></div>
        { children }
        { error && <div className={ styles.fieldError }>{ error }</div> }
    </div>
);
Field.propTypes = { label: PropTypes.node, required: PropTypes.bool, error: PropTypes.node, children: PropTypes.node };

const SelectBox = ({ field, invalid, children }) => (
    <div className={ `${ styles.selectWrap } ${ invalid ? styles.invalid : '' }` }>
        <select { ...field } value={ field.value ?? '' } className={ styles.select }>{ children }</select>
        <Icon name="chev_down" size={ 10 } className={ styles.selectChevron } />
    </div>
);
SelectBox.propTypes = { field: PropTypes.object.isRequired, invalid: PropTypes.bool, children: PropTypes.node };

const maxDob = () => dayjs().subtract(1, 'day').format('YYYY-MM-DD');

const EmployerBasicCard = ({ employer, canEdit, editing, onEdit, onCancel, onSave, saving, error, form, errors, lookups, actions }) => {
    const { control, watch, setValue, setError, clearErrors } = form;
    const [hkidDisplay, setHkidDisplay] = useState('');

    const genderLabel = useMemo(() => {
        const list = Array.isArray(lookups.genderList) ? lookups.genderList : Object.values(lookups.genderList || {});
        const match = list.find((item) => String(item.id) === String(employer?.gender));
        if (match) return match.name;
        return (employer?.gender === EMPLOYER_GENDER_LEGACY_UNSET || employer?.gender === EMPLOYER_GENDER_MALE_ID) ? translation('key_male') : translation('key_female');
    }, [lookups.genderList, employer?.gender]);

    const dob = watch('birth_date');
    const ageLabel = useMemo(() => {
        const age = getCalculatedAge(editing ? dob : employer?.birth_date);
        return age === null || age === undefined ? '' : `${ age }`;
    }, [editing, dob, employer?.birth_date]);

    const handleHkid = useCallback((value) => {
        const res = validateHKID(value);
        setHkidDisplay(res.formatted || value.toUpperCase());
        setValue('hk_id', res?.hkid || value);
        if (!res.valid) setError('hk_id', { type: 'manual', message: res?.error });
        else clearErrors('hk_id');
    }, [setValue, setError, clearErrors]);

    const startEdit = useCallback(() => {
        setHkidDisplay(employer?.hk_id ? (validateHKID(employer.hk_id).formatted || employer.hk_id) : '');
        onEdit();
    }, [employer?.hk_id, onEdit]);

    return (
        <EmdCard title={ translation('key_employer_details') } canEdit={ canEdit } editing={ editing } onEdit={ startEdit } onCancel={ onCancel } onSave={ onSave } saving={ saving } actions={ editing ? null : actions }>
            { !editing ? (
                <div className="emd-grid-3">
                    <WkdReadField label={ translation('key_title') } value={ employer?.title } required />
                    <WkdReadField label={ translation('key_chinese_name') } value={ employer?.chinese_name } />
                    <div />
                    <WkdReadField label={ translation('key_surname') } value={ employer?.surname } required />
                    <WkdReadField label={ translation('key_given_names') } value={ employer?.name } required />
                    <div />
                    <WkdReadField label={ translation('key_gender') } value={ genderLabel } />
                    <WkdReadField label={ translation('key_date_of_birth') } value={ employer?.birth_date ? dayjs(employer.birth_date).format(DATE_DISPLAY_FORMAT) : '' } required />
                    <WkdReadField label={ translation('key_age') } value={ ageLabel } />
                    <WkdReadField label={ translation('key_hkid') } value={ formatHKIDForDisplay(employer?.hk_id) } />
                    <WkdReadField label={ translation('key_nationality') } value={ employer?.nationality_info?.name } />
                    <WkdReadField label={ translation('key_occupation') } value={ employer?.occupation } />
                    <WkdReadField label={ translation('key_travel_document_held') } value={ employer?.travel_document_held } />
                    <WkdReadField label={ translation('key_travel_document_number') } value={ employer?.travel_document_number } />
                    {/* U-0039: the localized Primary Language, else the legacy value exactly as stored — last row, as the prototype appends it (audit D-10) */}
                    <WkdReadField label={ translation('key_primary_language') } value={ primaryLanguageLabel(employer) } />
                </div>
            ) : (
                <div className="emd-grid-3">
                    { error && <div role="alert" className={ `${ styles.fieldError } emd-card-error` } data-mc-card-error="basic">{ error }</div> }
                    <Field label={ translation('key_title') } required error={ errors.title?.message }>
                        <Controller name="title" control={ control } rules={ { required: translation('key_title_is_required') } } render={ ({ field }) => (
                            <SelectBox field={ field } invalid={ Boolean(errors.title) }>
                                <option value="">{ translation('key_select_title') }</option>
                                { EMPLOYER_TITLE_OPTIONS.map((option) => <option key={ option.value } value={ option.value }>{ option.key ? translation(option.key) : option.label }</option>) }
                            </SelectBox>
                        ) } />
                    </Field>
                    <Field label={ translation('key_chinese_name') } error={ errors.chinese_name?.message }>
                        <Controller name="chinese_name" control={ control } render={ ({ field }) => <input { ...field } value={ field.value ?? '' } type="text" className={ styles.input } /> } />
                    </Field>
                    <div />
                    <Field label={ translation('key_surname') } required error={ errors.surname?.message }>
                        <Controller name="surname" control={ control } rules={ { required: translation('key_surname_is_required') } } render={ ({ field }) => <input { ...field } value={ field.value ?? '' } type="text" className={ `${ styles.input } ${ errors.surname ? styles.invalid : '' }` } /> } />
                    </Field>
                    <Field label={ translation('key_given_names') } required error={ errors.name?.message }>
                        <Controller name="name" control={ control } rules={ { required: translation('key_this_field_is_required') } } render={ ({ field }) => <input { ...field } value={ field.value ?? '' } type="text" className={ `${ styles.input } ${ errors.name ? styles.invalid : '' }` } /> } />
                    </Field>
                    <div />
                    <Field label={ translation('key_gender') } error={ errors.gender?.message }>
                        <Controller name="gender" control={ control } render={ ({ field }) => (
                            <SelectBox field={ field } invalid={ Boolean(errors.gender) }>
                                <option value="">{ translation('key_please_select') }</option>
                                { (Array.isArray(lookups.genderList) ? lookups.genderList : Object.values(lookups.genderList || {})).map((gender) => (
                                    <option key={ gender.id } value={ gender.id }>{ gender.name }</option>
                                )) }
                            </SelectBox>
                        ) } />
                    </Field>
                    <Field label={ translation('key_date_of_birth') } required error={ errors.birth_date?.message }>
                        <Controller
                            name="birth_date"
                            control={ control }
                            rules={ {
                                required: translation('key_date_of_birth_is_required'),
                                validate: (value) => !value || dayjs(value).isBefore(dayjs().startOf('day')) || translation('key_date_must_be_before_today'),
                            } }
                            render={ ({ field }) => (
                                <DateInput value={ field.value ?? '' } onChange={ field.onChange } onBlur={ field.onBlur } max={ maxDob() } invalid={ Boolean(errors.birth_date) } />
                            ) }
                        />
                    </Field>
                    <Field label={ translation('key_age') }>
                        <input type="text" className={ `${ styles.input } ${ styles.readonly }` } value={ ageLabel ? `${ ageLabel } ${ translation('key_years') }` : '' } readOnly disabled />
                        <div className={ styles.hint }>{ translation('key_calculated_automatically_from_dob') }</div>
                    </Field>
                    <Field label={ translation('key_hkid') } error={ errors.hk_id?.message }>
                        <Controller name="hk_id" control={ control } render={ () => (
                            <input type="text" value={ hkidDisplay } placeholder={ translation('key_hkid_example') } className={ `${ styles.input } ${ errors.hk_id ? styles.invalid : '' }` } onChange={ (event) => handleHkid(event.target.value) } />
                        ) } />
                    </Field>
                    <Field label={ translation('key_nationality') } error={ errors.nationality?.message }>
                        <Controller name="nationality" control={ control } render={ ({ field }) => (
                            <SelectBox field={ field } invalid={ Boolean(errors.nationality) }>
                                <option value="">{ translation('key_please_select') }</option>
                                { (lookups.employerNationalities || []).map((nationality) => <option key={ nationality.id } value={ nationality.id }>{ nationality.name }</option>) }
                            </SelectBox>
                        ) } />
                    </Field>
                    {/* U-0039: Cantonese · English · Mandarin; a legacy value stays selected as stored (disabled) and an unchanged save omits the key */}
                    <Field label={ translation('key_primary_language') } error={ errors.primary_language?.message }>
                        <Controller name="primary_language" control={ control } render={ ({ field }) => (
                            <SelectBox field={ field } invalid={ Boolean(errors.primary_language) }>
                                <option value="">{ translation('key_please_select') }</option>
                                { lookups.legacyLanguage && <option value={ lookups.legacyLanguage.id } disabled>{ lookups.legacyLanguage.name }</option> }
                                { (lookups.languages || []).map((language) => <option key={ language.id } value={ language.id }>{ language.name }</option>) }
                            </SelectBox>
                        ) } />
                    </Field>
                    <Field label={ translation('key_occupation') } error={ errors.occupation?.message }>
                        <Controller name="occupation" control={ control } render={ ({ field }) => <input { ...field } value={ field.value ?? '' } type="text" className={ styles.input } /> } />
                    </Field>
                    <Field label={ translation('key_travel_document_held') } error={ errors.travel_document_held?.message }>
                        <Controller name="travel_document_held" control={ control } render={ ({ field }) => <input { ...field } value={ field.value ?? '' } type="text" className={ styles.input } /> } />
                    </Field>
                    <Field label={ translation('key_travel_document_number') } error={ errors.travel_document_number?.message }>
                        <Controller name="travel_document_number" control={ control } render={ ({ field }) => <input { ...field } value={ field.value ?? '' } type="text" className={ styles.input } /> } />
                    </Field>
                </div>
            ) }
        </EmdCard>
    );
};

EmployerBasicCard.propTypes = {
    employer: PropTypes.object,
    canEdit: PropTypes.bool,
    editing: PropTypes.bool,
    onEdit: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    saving: PropTypes.bool,
    /* the server's refusal of this card's last Save */
    error: PropTypes.string,
    form: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired,
    lookups: PropTypes.object.isRequired,
    /* section actions beside Edit (U-0047 Send Template) */
    actions: PropTypes.node,
};

export default React.memo(EmployerBasicCard);
