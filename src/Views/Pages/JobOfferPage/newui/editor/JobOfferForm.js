import React, { useCallback, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { Controller, useWatch } from "react-hook-form";
import constData from "../../../../../components/ReusableComponents/constants";
import { Checkbox, Field, FormGrid, RadioGroup, SelectBox, TextArea, TextInput } from "../../../../../components/ui/FormControls";
import Icon from "../../../../../components/Icon/Icon";
import DateInput from "../../../../../components/ui/DateInput";
import Slider from "../../../../../components/ReusableComponents/RangeSlider";
import JobOfferCopySection from "../../../../../components/job-offer/copy-generator/JobOfferCopySection";
import translation from "../../../../../utils/translation";
import JoMultiSelect from "./JoMultiSelect";
import JoHouseholdCard from "./JoHouseholdCard";
import {
    JO_AGE, JO_COOKING_DUTY_ID, JO_EDITOR_COPY, JO_HOUSE_SIZE_MAX_DIGITS, JO_MAIN_DUTIES_MAX, JO_NO_PREFERENCE_ID, JO_NOTES_MAX, JO_NULL_CHOICE,
    JO_RELIGION_PREFERENCE_NAMES, JO_SALARY, JO_YES_NO, JO_YES_NO_CONSIDER,
} from "../../jobOfferConstants";

const C = JO_EDITOR_COPY;
const toOptions = (list, labelOf = (x) => x.name) => (Array.isArray(list) ? list.map((item) => ({ value: item.id, label: labelOf(item) || '' })) : []);
const withNoPreference = (options) => [{ value: JO_NO_PREFERENCE_ID, label: C.noPreference }, ...options];
const cleanName = (name) => String(name || '').replace('|', '').replace(/\n/g, '').trim();
const digits = (value, max) => String(value || '').replace(/\D/g, '').slice(0, max);
const courseLabel = (course) => (/maternity/i.test(course?.name || '') ? C.maternityLabel : course?.name);

const Eyebrow = ({ children }) => <div className="eyebrow">{ children }</div>;
Eyebrow.propTypes = { children: PropTypes.node };

/* U-0250 (+ All-Modules HTML, 9 Nov): the Job Offer religion preference is a single select of No preference · Christian ·
   Catholic · Muslim · Buddhist · Hindu · Other; a value already stored outside that set stays visible (not coerced on an
   unrelated save) */
const religionPreferenceOptions = (rows, value) => {
    const stored = Array.isArray(value) && value.length ? String(value[0]) : null;
    return (rows || []).filter((row) => JO_RELIGION_PREFERENCE_NAMES.includes(String(row?.name_en || row?.name || '').trim().toLowerCase()) || (stored && String(row?.id) === stored));
};

const JobOfferForm = ({ control, setValue, errors, lists, isMacau, recordedBelowFloor, copy, copyMissing, showStillNeeded = false, readOnly = false, onSaveDraftAndClose, idPrefix = 'jo' }) => {
    const asap = useWatch({ control, name: 'asap' });
    const roleId = useWatch({ control, name: 'role_id' });
    const skillsValue = useWatch({ control, name: 'skills' });
    const responsibilitiesValue = useWatch({ control, name: 'responsibilities' });
    const skills = useMemo(() => skillsValue || [], [skillsValue]);
    const responsibilities = useMemo(() => responsibilitiesValue || [], [responsibilitiesValue]);
    const expectedSalary = useWatch({ control, name: 'expected_salary' });
    const minAge = useWatch({ control, name: 'min_age' });
    const maxAge = useWatch({ control, name: 'max_age' });

    const isDriver = String(roleId) === String(constData.DRIVER_ROLE_ID);
    const drivingId = constData.DRIVING_SKILL_ID;
    const skillOptions = useMemo(() => toOptions(lists.mainSkills, (s) => cleanName(s.name)), [lists.mainSkills]);
    const skillLabel = useCallback((id) => skillOptions.find((o) => String(o.value) === String(id))?.label || '', [skillOptions]);
    const cookingIsMainDuty = skills.map(Number).includes(JO_COOKING_DUTY_ID);

    const driverDropped = useMemo(() => {
        if (!isDriver) return [];
        const ordered = [drivingId, ...skills.filter((s) => Number(s) !== drivingId)];
        return ordered.slice(JO_MAIN_DUTIES_MAX).map(skillLabel).filter(Boolean);
    }, [isDriver, skills, drivingId, skillLabel]);
    useEffect(() => {
        if (!roleId) return;
        if (isDriver) {
            const ordered = [drivingId, ...skills.filter((s) => Number(s) !== drivingId)].slice(0, JO_MAIN_DUTIES_MAX);
            if (ordered.join(',') !== skills.map(Number).join(',')) setValue('skills', ordered, { shouldDirty: true, shouldValidate: true });
        } else if (skills.map(Number).includes(drivingId)) {
            setValue('skills', skills.filter((s) => Number(s) !== drivingId), { shouldDirty: true, shouldValidate: true });
        }
    }, [isDriver, roleId, skills, drivingId, setValue]);

    useEffect(() => {
        const kept = responsibilities.filter((r) => !skills.map(Number).includes(Number(r)));
        if (kept.length !== responsibilities.length) setValue('responsibilities', kept, { shouldDirty: true });
    }, [skills, responsibilities, setValue]);
    useEffect(() => {
        if (!cookingIsMainDuty) setValue('cooking', [], { shouldDirty: false });
    }, [cookingIsMainDuty, setValue]);

    const fixedValue = useWatch({ control, name: 'fixed_salary' });
    useEffect(() => {
        if (String(expectedSalary) === JO_SALARY.FIXED_ID && (fixedValue === '' || fixedValue === null || fixedValue === undefined)) {
            setValue('fixed_salary', JO_SALARY.FLOOR, { shouldDirty: true });
        }
    }, [expectedSalary, fixedValue, setValue]);

    const promote = useCallback((index) => {
        if (index <= 0 || !skills[index]) return;
        const next = [...skills];
        [next[index - 1], next[index]] = [next[index], next[index - 1]];
        setValue('skills', next, { shouldDirty: true });
    }, [skills, setValue]);

    const anyAge = minAge == null || maxAge == null;
    const field = (name) => errors?.[name]?.message;

    return (
        <fieldset className="joe-form" disabled={ readOnly } aria-readonly={ readOnly || undefined }>
            <section className="joe-card">
                <Eyebrow>{ C.sections.start }</Eyebrow>
                <FormGrid columns={ 2 }>
                    <Field label={ C.date } required={ asap !== 1 } error={ field('start_date') } htmlFor={ `${ idPrefix }-start` }>
                        { asap === 1
                            ? <div className="joe-ctl mono disabled" aria-disabled="true">{ C.asapValue }</div>
                            : <Controller control={ control } name="start_date" render={ ({ field: f }) => <DateInput id={ `${ idPrefix }-start` } value={ f.value || '' } onChange={ f.onChange } min={ new Date().toISOString().slice(0, 10) } invalid={ Boolean(errors?.start_date) } /> } /> }
                    </Field>
                    <Field label={ C.flexible } required={ asap !== 1 } error={ asap !== 1 ? field('flexible_start_date') : undefined } htmlFor={ `${ idPrefix }-flex` }>
                        <Controller control={ control } name="flexible_start_date" render={ ({ field: f }) => (
                            <SelectBox id={ `${ idPrefix }-flex` } value={ f.value || '' } onChange={ f.onChange } disabled={ asap === 1 } invalid={ Boolean(errors?.flexible_start_date) && asap !== 1 }>
                                <option value="">{ translation('key_please_select') }</option>
                                { toOptions(lists.flexibleDates).map((o) => <option key={ o.value } value={ o.value }>{ o.label }</option>) }
                            </SelectBox>
                        ) } />
                    </Field>
                </FormGrid>
                <Controller control={ control } name="asap" render={ ({ field: f }) => (
                    <Checkbox label={ C.asap } checked={ f.value === 1 } onChange={ (event) => { const on = event.target.checked; f.onChange(on ? 1 : 0); if (on) setValue('flexible_start_date', '', { shouldDirty: true }); } } />
                ) } />
            </section>

            <section className="joe-card">
                <Eyebrow>{ C.sections.role }</Eyebrow>
                <FormGrid columns={ 2 }>
                    <Field label={ C.role } required error={ field('role_id') } htmlFor={ `${ idPrefix }-role` }>
                        <Controller control={ control } name="role_id" render={ ({ field: f }) => (
                            <SelectBox id={ `${ idPrefix }-role` } value={ f.value || '' } onChange={ f.onChange } invalid={ Boolean(errors?.role_id) }>
                                <option value="">{ translation('key_please_select') }</option>
                                { toOptions(lists.workerRoles).map((o) => <option key={ o.value } value={ o.value }>{ o.label }</option>) }
                            </SelectBox>
                        ) } />
                    </Field>
                    <Field label={ C.speak } required error={ field('spoken_language') }>
                        <Controller control={ control } name="spoken_language" render={ ({ field: f }) => (
                            <JoMultiSelect disabled={ readOnly } id={ `${ idPrefix }-speak` } value={ f.value } options={ toOptions(lists.spokenLanguages) } onChange={ f.onChange } placeholder={ C.selectLanguages } invalid={ Boolean(errors?.spoken_language) } ariaLabel={ C.speak } />
                        ) } />
                    </Field>
                    <Field label={ C.nationality } required error={ field('helper_nationality') }>
                        <Controller control={ control } name="helper_nationality" render={ ({ field: f }) => (
                            <JoMultiSelect disabled={ readOnly } id={ `${ idPrefix }-nat` } value={ f.value } options={ withNoPreference(toOptions(lists.workerNationalities)) } onChange={ f.onChange } placeholder={ C.selectNationalities } invalid={ Boolean(errors?.helper_nationality) } ariaLabel={ C.nationality } />
                        ) } />
                    </Field>
                    <Field label={ C.currentLocation } required error={ field('current_location') }>
                        <Controller control={ control } name="current_location" render={ ({ field: f }) => (
                            <JoMultiSelect disabled={ readOnly } id={ `${ idPrefix }-loc` } value={ f.value } options={ withNoPreference(toOptions(lists.locations)) } onChange={ f.onChange } placeholder={ C.select } invalid={ Boolean(errors?.current_location) } ariaLabel={ C.currentLocation } />
                        ) } />
                    </Field>
                    { /* both prototypes: No preference (the default) · Yes · No — a valid choice, never a required blank */ }
                    <Field label={ C.overseasExp } error={ field('overseas_exp') } htmlFor={ `${ idPrefix }-ovs` }>
                        <Controller control={ control } name="overseas_exp" render={ ({ field: f }) => (
                            <SelectBox id={ `${ idPrefix }-ovs` } value={ f.value ?? JO_NULL_CHOICE } onChange={ f.onChange } invalid={ Boolean(errors?.overseas_exp) }>
                                <option value={ JO_NULL_CHOICE }>{ C.noPreference }</option>
                                { JO_YES_NO.map((o) => <option key={ o.value } value={ o.value }>{ translation(o.key) }</option>) }
                            </SelectBox>
                        ) } />
                    </Field>
                    <Field label={ C.contractStatus } error={ field('contract_status') } htmlFor={ `${ idPrefix }-cs` }>
                        <Controller control={ control } name="contract_status" render={ ({ field: f }) => (
                            <SelectBox id={ `${ idPrefix }-cs` } value={ f.value ?? JO_NULL_CHOICE } onChange={ f.onChange }>
                                <option value={ JO_NULL_CHOICE }>{ C.noPreference }</option>
                                { toOptions(lists.contractStatus).map((o) => <option key={ o.value } value={ o.value }>{ o.label }</option>) }
                            </SelectBox>
                        ) } />
                    </Field>
                </FormGrid>
            </section>

            <section className="joe-card">
                <Eyebrow>{ C.sections.duties }</Eyebrow>
                <Field label={ C.mainDuties } required error={ field('skills') } hint={ C.mainDutiesHint }>
                    <Controller control={ control } name="skills" render={ ({ field: f }) => (
                        <JoMultiSelect
                            disabled={ readOnly }
                            id={ `${ idPrefix }-duties` } value={ f.value } options={ skillOptions } onChange={ f.onChange } placeholder={ C.selectDuties }
                            cap={ JO_MAIN_DUTIES_MAX } capNote={ C.mainDutiesCap } locked={ isDriver ? [drivingId] : [] } lockedBadge="AUTO"
                            invalid={ Boolean(errors?.skills) } ariaLabel={ C.mainDuties }
                        />
                    ) } />
                </Field>
                <div className="ranklbl"><span className="lbl">{ C.priority }</span><span className="hint">{ C.optional }</span></div>
                <div className="rankrow">
                    { [0, 1, 2].map((i) => {
                        const id = skills[i];
                        if (!id) return <div key={ i } className="rankslot empty"><span className="num">{ i + 1 }</span><span className="slotempty">{ C.slotEmpty[i] }</span></div>;
                        const lockedDriving = isDriver && Number(id) === drivingId;
                        const locked = i === 1 && isDriver && Number(skills[0]) === drivingId;
                        return (
                            <div key={ String(id) } className="rankslot">
                                <span className="num">{ i + 1 }</span>
                                <span className={ `chip${ lockedDriving ? ' auto' : '' }` }>{ skillLabel(id) }{ lockedDriving && <span className="autotag">AUTO</span> }</span>
                                { i > 0 && !locked && <button type="button" className="rankup" aria-label={ `${ C.moveToRank } ${ i }` } onClick={ () => promote(i) }><Icon name="chev_up" size={ 11 } strokeWidth={ 2 } /></button> }
                            </div>
                        );
                    }) }
                </div>
                { isDriver && (
                    <div className="drivernote">{ C.driverNote }{ driverDropped.length > 0 && <span>{ C.driverDropped(driverDropped) }</span> }</div>
                ) }
            </section>

            <JoHouseholdCard control={ control } setValue={ setValue } readOnly={ readOnly } />

            <section className="joe-card">
                <Eyebrow>{ C.sections.other }</Eyebrow>
                <Field label={ C.otherResp } hint={ C.otherRespHint } error={ field('responsibilities') }>
                    <Controller control={ control } name="responsibilities" render={ ({ field: f }) => (
                        <JoMultiSelect disabled={ readOnly } id={ `${ idPrefix }-other` } value={ f.value } options={ skillOptions } onChange={ f.onChange } placeholder={ C.select } excluded={ skills } excludedNote={ C.otherRespNote } ariaLabel={ C.otherResp } />
                    ) } />
                </Field>
                { cookingIsMainDuty && (
                    <Field label={ C.cooking } hint={ C.cookingHint } error={ field('cooking') }>
                        <Controller control={ control } name="cooking" render={ ({ field: f }) => (
                            <JoMultiSelect disabled={ readOnly } id={ `${ idPrefix }-cook` } value={ f.value } options={ toOptions(lists.cookingList, (c) => cleanName(c.name)) } onChange={ f.onChange } placeholder={ C.selectCuisines } invalid={ Boolean(errors?.cooking) } ariaLabel={ C.cooking } />
                        ) } />
                    </Field>
                ) }
                <FormGrid columns={ 2 }>
                    { /* the schema requires at least one pick (No preference counts) — the marker says so */ }
                    <Field label={ C.specialCourse } required error={ field('special_course') }>
                        <Controller control={ control } name="special_course" render={ ({ field: f }) => (
                            <JoMultiSelect disabled={ readOnly } id={ `${ idPrefix }-course` } value={ f.value } options={ withNoPreference(toOptions(lists.courseList, courseLabel)) } onChange={ f.onChange } placeholder={ C.noPreference } invalid={ Boolean(errors?.special_course) } ariaLabel={ C.specialCourse } />
                        ) } />
                    </Field>
                    <Field label={ C.minEducation } error={ field('education') } htmlFor={ `${ idPrefix }-edu` }>
                        <Controller control={ control } name="education" render={ ({ field: f }) => (
                            <SelectBox id={ `${ idPrefix }-edu` } value={ f.value ?? JO_NULL_CHOICE } onChange={ f.onChange }>
                                <option value={ JO_NULL_CHOICE }>{ C.noPreference }</option>
                                { toOptions(lists.educationList).map((o) => <option key={ o.value } value={ o.value }>{ o.label }</option>) }
                            </SelectBox>
                        ) } />
                    </Field>
                </FormGrid>
            </section>

            <section className="joe-card">
                <Eyebrow>{ C.sections.home }</Eyebrow>
                <FormGrid columns={ 2 }>
                    <Field label={ C.employerNationality } required error={ field('employer_nationality') } htmlFor={ `${ idPrefix }-empnat` }>
                        <Controller control={ control } name="employer_nationality" render={ ({ field: f }) => (
                            <SelectBox id={ `${ idPrefix }-empnat` } value={ f.value || '' } onChange={ f.onChange } invalid={ Boolean(errors?.employer_nationality) }>
                                <option value="">{ translation('key_please_select') }</option>
                                { toOptions(lists.employerNationalities).map((o) => <option key={ o.value } value={ o.value }>{ o.label }</option>) }
                            </SelectBox>
                        ) } />
                    </Field>
                    { !isMacau && (
                        <Field label={ C.district } required error={ field('employer_district') } htmlFor={ `${ idPrefix }-district` }>
                            <Controller control={ control } name="employer_district" render={ ({ field: f }) => (
                                <SelectBox id={ `${ idPrefix }-district` } value={ f.value || '' } onChange={ f.onChange } invalid={ Boolean(errors?.employer_district) }>
                                    <option value="">{ C.selectDistrict }</option>
                                    { toOptions(lists.districts).map((o) => <option key={ o.value } value={ o.value }>{ o.label }</option>) }
                                </SelectBox>
                            ) } />
                        </Field>
                    ) }
                    <Field label={ C.houseSize } error={ field('employer_house_size') } htmlFor={ `${ idPrefix }-size` }>
                        <Controller control={ control } name="employer_house_size" render={ ({ field: f }) => (
                            <div className={ `joe-typein${ errors?.employer_house_size ? ' is-invalid' : '' }` }>
                                <TextInput id={ `${ idPrefix }-size` } inputMode="numeric" placeholder="750" value={ f.value ?? '' } invalid={ Boolean(errors?.employer_house_size) } onChange={ (event) => f.onChange(digits(event.target.value, JO_HOUSE_SIZE_MAX_DIGITS)) } />
                                <span className="sfx">{ C.sqft }</span>
                            </div>
                        ) } />
                    </Field>
                </FormGrid>
            </section>

            <section className="joe-card">
                <Eyebrow>{ C.sections.terms }</Eyebrow>
                <FormGrid columns={ 2 }>
                    <Field label={ C.accommodation } required error={ field('helper_accommadation') } htmlFor={ `${ idPrefix }-accom` }>
                        <Controller control={ control } name="helper_accommadation" render={ ({ field: f }) => (
                            <SelectBox id={ `${ idPrefix }-accom` } value={ f.value || '' } onChange={ f.onChange } invalid={ Boolean(errors?.helper_accommadation) }>
                                <option value="">{ C.select }</option>
                                { toOptions(lists.accommodations).map((o) => <option key={ o.value } value={ o.value }>{ o.label }</option>) }
                            </SelectBox>
                        ) } />
                    </Field>
                    <Field label={ C.dayOff } required error={ field('day_off') }>
                        { /* U-0142 (10 Nov package, outranks the 9 Nov prototype order): Day Off is a required
                             MULTI-select; the payload stays backend ask 12's id array */ }
                        <Controller control={ control } name="day_off" render={ ({ field: f }) => (
                            <JoMultiSelect disabled={ readOnly } id={ `${ idPrefix }-dayoff` } value={ f.value } options={ toOptions(lists.dayOffList) } onChange={ f.onChange } placeholder={ C.selectDayOff } invalid={ Boolean(errors?.day_off) } ariaLabel={ C.dayOff } />
                        ) } />
                    </Field>
                </FormGrid>
                <Field label={ C.coworkers } error={ field('coworker_status') }>
                    <Controller control={ control } name="coworker_status" render={ ({ field: f }) => (
                        <RadioGroup name={ `${ idPrefix }-coworker` } value={ f.value } options={ JO_YES_NO.map((o) => ({ value: o.value, label: translation(o.key) })) } onChange={ f.onChange } ariaLabel={ C.coworkers } />
                    ) } />
                </Field>
                <FormGrid columns={ 3 }>
                    <Field label={ C.expectedSalary } required error={ field('expected_salary') } htmlFor={ `${ idPrefix }-salary` }>
                        <Controller control={ control } name="expected_salary" render={ ({ field: f }) => (
                            <SelectBox id={ `${ idPrefix }-salary` } value={ f.value || '' } onChange={ f.onChange } invalid={ Boolean(errors?.expected_salary) }>
                                <option value="">{ translation('key_please_select') }</option>
                                { toOptions(lists.expectedSalaryList).map((o) => <option key={ o.value } value={ o.value }>{ o.label }</option>) }
                            </SelectBox>
                        ) } />
                    </Field>
                    { String(expectedSalary) === JO_SALARY.RANGE_ID && (
                        <>
                            <Field label={ C.minimum } required hint={ C.floorHint } error={ field('min_salary') } htmlFor={ `${ idPrefix }-min` }>
                                <Controller control={ control } name="min_salary" render={ ({ field: f }) => <TextInput id={ `${ idPrefix }-min` } className="mono" inputMode="numeric" placeholder="4,990" value={ f.value ?? '' } invalid={ Boolean(errors?.min_salary) } onChange={ (event) => f.onChange(digits(event.target.value, JO_SALARY.MAX_DIGITS)) } /> } />
                            </Field>
                            <Field label={ C.maximum } required hint={ C.ceilingHint } error={ field('max_salary') } htmlFor={ `${ idPrefix }-max` }>
                                <Controller control={ control } name="max_salary" render={ ({ field: f }) => <TextInput id={ `${ idPrefix }-max` } className="mono" inputMode="numeric" placeholder="20,000" value={ f.value ?? '' } invalid={ Boolean(errors?.max_salary) } onChange={ (event) => f.onChange(digits(event.target.value, JO_SALARY.MAX_DIGITS)) } /> } />
                            </Field>
                        </>
                    ) }
                    { String(expectedSalary) === JO_SALARY.FIXED_ID && (
                        <Field label={ C.fixed } required hint={ C.floorHint } error={ field('fixed_salary') } htmlFor={ `${ idPrefix }-fixed` }>
                            <Controller control={ control } name="fixed_salary" render={ ({ field: f }) => <TextInput id={ `${ idPrefix }-fixed` } className="mono" inputMode="numeric" placeholder="4,990" value={ f.value ?? '' } invalid={ Boolean(errors?.fixed_salary) } onChange={ (event) => f.onChange(digits(event.target.value, JO_SALARY.MAX_DIGITS)) } /> } />
                        </Field>
                    ) }
                </FormGrid>
                { recordedBelowFloor && <div className="joe-note" data-mc-historical-salary={ recordedBelowFloor.amount }>{ C.historical(recordedBelowFloor.date, recordedBelowFloor.amount.toLocaleString('en-US')) }</div> }
                <Field label={ C.higherSalary } error={ field('higher_salary') }>
                    <Controller control={ control } name="higher_salary" render={ ({ field: f }) => (
                        <RadioGroup name={ `${ idPrefix }-higher` } value={ f.value } options={ JO_YES_NO_CONSIDER.map((o) => ({ value: o.value, label: translation(o.key) })) } onChange={ f.onChange } ariaLabel={ C.higherSalary } />
                    ) } />
                </Field>
                <Field label={ C.bonus } error={ field('salary_bonus') }>
                    <Controller control={ control } name="salary_bonus" render={ ({ field: f }) => (
                        <RadioGroup name={ `${ idPrefix }-bonus` } value={ f.value } options={ JO_YES_NO_CONSIDER.map((o) => ({ value: o.value, label: translation(o.key) })) } onChange={ f.onChange } ariaLabel={ C.bonus } />
                    ) } />
                </Field>
            </section>

            <section className="joe-card">
                <div className="keyhd"><Eyebrow>{ C.sections.prefs }</Eyebrow><span className="opttag">{ C.optional }</span></div>
                <div className="grouphint">{ C.prefsHint }</div>
                <FormGrid columns={ 2 }>
                    <Field label={ C.religion } error={ field('religion') }>
                        <Controller control={ control } name="religion" render={ ({ field: f }) => (
                            <SelectBox id={ `${ idPrefix }-religion` } value={ Array.isArray(f.value) && f.value.length ? String(f.value[0]) : String(JO_NO_PREFERENCE_ID) } onChange={ (e) => f.onChange([Number(e.target.value)]) } aria-label={ C.religion }>
                                { withNoPreference(toOptions(religionPreferenceOptions(lists.religionList, f.value))).map((o) => <option key={ o.value } value={ o.value }>{ o.label }</option>) }
                            </SelectBox>
                        ) } />
                    </Field>
                    <Field label={ C.siblings } htmlFor={ `${ idPrefix }-sib` }>
                        <Controller control={ control } name="having_siblings" render={ ({ field: f }) => (
                            <SelectBox id={ `${ idPrefix }-sib` } value={ f.value === null || f.value === undefined ? JO_NULL_CHOICE : String(f.value) } onChange={ (event) => f.onChange(event.target.value === JO_NULL_CHOICE ? JO_NULL_CHOICE : Number(event.target.value)) }>
                                <option value={ JO_NULL_CHOICE }>{ C.noPreference }</option>
                                { JO_YES_NO.map((o) => <option key={ o.value } value={ o.value }>{ translation(o.key) }</option>) }
                            </SelectBox>
                        ) } />
                    </Field>
                    <Field label={ C.marital } htmlFor={ `${ idPrefix }-marital` }>
                        <Controller control={ control } name="marital_status" render={ ({ field: f }) => (
                            <SelectBox id={ `${ idPrefix }-marital` } value={ f.value ?? '0' } onChange={ f.onChange }>
                                <option value="0">{ C.noPreference }</option>
                                { toOptions(lists.maritalStatus).map((o) => <option key={ o.value } value={ o.value }>{ o.label }</option>) }
                            </SelectBox>
                        ) } />
                    </Field>
                    <Field label={ C.children } htmlFor={ `${ idPrefix }-children` }>
                        <Controller control={ control } name="having_children" render={ ({ field: f }) => (
                            <SelectBox id={ `${ idPrefix }-children` } value={ f.value === null || f.value === undefined ? JO_NULL_CHOICE : String(f.value) } onChange={ (event) => f.onChange(event.target.value === JO_NULL_CHOICE ? JO_NULL_CHOICE : Number(event.target.value)) }>
                                <option value={ JO_NULL_CHOICE }>{ C.noPreference }</option>
                                { JO_YES_NO.map((o) => <option key={ o.value } value={ o.value }>{ translation(o.key) }</option>) }
                            </SelectBox>
                        ) } />
                    </Field>
                </FormGrid>
                <div className="fld">
                    <div className="ranklbl">
                        <span className="lbl">{ C.helperAge }</span>
                        <span className="agerange mono">{ anyAge ? C.anyAge : `${ minAge } – ${ maxAge }` }</span>
                        { !anyAge && <button type="button" className="linkbtn" onClick={ () => { setValue('min_age', null, { shouldDirty: true }); setValue('max_age', null, { shouldDirty: true }); } }>{ C.anyAge }</button> }
                    </div>
                    <div className={ `joe-slider${ anyAge ? ' anyage' : '' }` }>
                        { /* prototype slider shows no value bubbles (the range reads beside the label); read-only must not drag (fieldset does not reach it) */ }
                        <Slider min={ JO_AGE.MIN } max={ JO_AGE.MAX } value={ [minAge ?? JO_AGE.MIN, maxAge ?? JO_AGE.MAX] } disabled={ readOnly } onChange={ (_, next) => { setValue('min_age', next[0], { shouldDirty: true }); setValue('max_age', next[1], { shouldDirty: true }); } } />
                    </div>
                    <div className="scale mono"><span>{ JO_AGE.MIN }</span><span>{ JO_AGE.MAX }</span></div>
                </div>
            </section>

            <section className="joe-card keycard">
                <div className="keyhd"><Eyebrow>{ C.sections.notes }</Eyebrow><span className="opttag">{ C.optional }</span></div>
                <div className="grouphint">{ C.notesHint }</div>
                <Field error={ field('detailed_description') } hint={ C.notesLong } htmlFor={ `${ idPrefix }-notes` }>
                    <Controller control={ control } name="detailed_description" render={ ({ field: f }) => (
                        <TextArea id={ `${ idPrefix }-notes` } rows={ 4 } placeholder={ C.notesPlaceholder } value={ f.value ?? '' } maxLength={ JO_NOTES_MAX } invalid={ Boolean(errors?.detailed_description) } onChange={ f.onChange } />
                    ) } />
                    { /* no counter in either prototype — the hint states the 1,000-character limit */ }
                </Field>
            </section>

            <section className="joe-card copycard">
                <Eyebrow>{ C.sections.copy }</Eyebrow>
                { showStillNeeded && (
                    <div className="fieldwarn" role="status">{ C.stillNeeded } { copyMissing.map((k) => C.requiredLabels[k]).join(' · ') }.</div>
                ) }
                <JobOfferCopySection
                    copy={ copy }
                    placeholderTitle={ C.copyPlaceholderTitle }
                    placeholderText={ C.copyPlaceholderText }
                    placeholderExtra={ (
                        <div className="gennote">
                            <div className="genfields">{ C.copyFields.map((f) => <span key={ f }>{ f }</span>) }</div>
                            <div className="hint">{ C.copyNote }</div>
                        </div>
                    ) }
                    onSaveDraftAndClose={ onSaveDraftAndClose }
                />
            </section>
        </fieldset>
    );
};

JobOfferForm.propTypes = {
    control: PropTypes.object.isRequired,
    setValue: PropTypes.func.isRequired,
    errors: PropTypes.object,
    lists: PropTypes.object.isRequired,
    isMacau: PropTypes.bool,
    recordedBelowFloor: PropTypes.shape({ amount: PropTypes.number, date: PropTypes.string }),
    copy: PropTypes.object.isRequired,
    copyMissing: PropTypes.array.isRequired,
    showStillNeeded: PropTypes.bool,
    /* Details View without Edit Job Offer: every control inert, nothing hidden (U-0136) */
    readOnly: PropTypes.bool,
    onSaveDraftAndClose: PropTypes.func,
    idPrefix: PropTypes.string,
};

export default React.memo(JobOfferForm);
