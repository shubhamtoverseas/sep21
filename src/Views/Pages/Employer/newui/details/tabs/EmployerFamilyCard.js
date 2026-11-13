import React, { useMemo } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import Counter from "../../../../../../components/counter/Counter";
import Icon from "../../../../../../components/Icon/Icon";
import DateInput from "../../../../../../components/ui/DateInput";
import configData from "../../../../../../components/ReusableComponents/app-configs";
import { formatHKIDForDisplay, getCalculatedAge } from "../../../../../../services/commonService";
import translation from "../../../../../../utils/translation";
import EmdCard from "./EmdCard";
import useFamilyDetailsForm, { memberAge } from "./useFamilyDetailsForm";
import styles from "../../NewEmployerModal.module.css";
import { FAMILY_YEAR_OPTIONS, DATE_DISPLAY_FORMAT, FAMILY_TABLE_HEADER_KEYS } from "../../employerNewUiConstants";

const FamilyEditTable = ({ familyForm }) => {
    const { form, fields, members, errors, addMember, removeMember, setYearOnly, setHkid } = familyForm;
    const { register, watch, setValue } = form;
    const rowError = (index, key) => errors.family_member_info?.[index]?.[key]?.message;

    return (
        <>
            <div className="det-tablewrap wkd-tablewrap-flush">
                <table className="emd-table">
                    <thead>
                        <tr>
                            { FAMILY_TABLE_HEADER_KEYS.map((key) => <th key={ key }>{ translation(key) }</th>) }
                            <th aria-label={ translation('key_actions') } />
                        </tr>
                    </thead>
                    <tbody>
                        { fields.map((item, index) => {
                            const yearOnly = watch(`family_member_info.${ index }.year_only`);
                            const age = memberAge(members[index]);
                            return (
                                <tr key={ item.id }>
                                    <td>
                                        <input type="text" className={ `${ styles.input } ${ rowError(index, 'name') ? styles.invalid : '' }` } placeholder={ translation('key_enter_name') } { ...register(`family_member_info.${ index }.name`) } />
                                        { rowError(index, 'name') && <div className={ styles.fieldError }>{ rowError(index, 'name') }</div> }
                                    </td>
                                    <td>
                                        <div className={ styles.radioRow }>
                                            { ['y', 'n'].map((value) => (
                                                <label key={ value } className={ styles.radioLabel }>
                                                    <input type="radio" className={ styles.radio } name={ `year_only_${ item.id }` } checked={ yearOnly === value } onChange={ () => setYearOnly(index, value) } />
                                                    { translation(value === 'y' ? 'key_yes' : 'key_no') }
                                                </label>
                                            )) }
                                        </div>
                                    </td>
                                    <td>
                                        { yearOnly === 'y' ? (
                                            <div className={ styles.selectWrap }>
                                                <select className={ styles.select } value={ watch(`family_member_info.${ index }.year`) || '' } onChange={ (event) => setValue(`family_member_info.${ index }.year`, event.target.value) }>
                                                    <option value="">{ translation('key_select_year') }</option>
                                                    { FAMILY_YEAR_OPTIONS.map((year) => <option key={ year } value={ year }>{ year }</option>) }
                                                </select>
                                                <Icon name="chev_down" size={ 10 } className={ styles.selectChevron } />
                                            </div>
                                        ) : (
                                            <DateInput max={ dayjs().format('YYYY-MM-DD') } value={ watch(`family_member_info.${ index }.dob`) || '' } onChange={ (value) => setValue(`family_member_info.${ index }.dob`, value) } invalid={ Boolean(rowError(index, 'dob')) } />
                                        ) }
                                        { (rowError(index, 'dob') || rowError(index, 'year')) && <div className={ styles.fieldError }>{ rowError(index, 'dob') || rowError(index, 'year') }</div> }
                                    </td>
                                    <td>{ age !== null ? `${ age } ${ translation('key_years') }` : '—' }</td>
                                    <td>
                                        <input type="text" className={ `${ styles.input } ${ rowError(index, 'relation') ? styles.invalid : '' }` } placeholder={ translation('key_relationship') } { ...register(`family_member_info.${ index }.relation`) } />
                                        { rowError(index, 'relation') && <div className={ styles.fieldError }>{ rowError(index, 'relation') }</div> }
                                    </td>
                                    <td>
                                        <input type="text" className={ `${ styles.input } ${ rowError(index, 'hk_id') ? styles.invalid : '' }` } placeholder={ translation('key_enter_hkid') } { ...register(`family_member_info.${ index }.hk_id`) } onChange={ (event) => setHkid(index, event.target.value) } />
                                        { rowError(index, 'hk_id') && <div className={ styles.fieldError }>{ rowError(index, 'hk_id') }</div> }
                                    </td>
                                    <td>
                                        <button type="button" className={ styles.iconBtn } aria-label={ translation('key_delete') } onClick={ () => removeMember(index) }>
                                            <Icon name="trash" size={ 13 } />
                                        </button>
                                    </td>
                                </tr>
                            );
                        }) }
                    </tbody>
                </table>
            </div>
            <div className="emd-card-foot">
                <button type="button" className="g2-button" onClick={ addMember }>+ { translation('key_add_family_member') }</button>
            </div>
            <div className="emd-counts">
                <div className="emd-count"><span>{ translation('key_adults') }</span><b>{ familyForm.counts.adults }</b></div>
                <div className="emd-count"><span>{ translation('key_age_below_5') }</span><b>{ familyForm.counts.childrenBelow5 }</b></div>
                <div className="emd-count"><span>{ translation('key_age_5_to_18') }</span><b>{ familyForm.counts.children5To18 }</b></div>
                <div className="emd-count"><span>{ translation('key_expecting_babies') }</span><Counter counterCount={ watch('expecting_baby_count') } onIncreaseDecrease={ (count) => setValue('expecting_baby_count', count) } /></div>
                <div className="emd-count"><span>{ translation('key_special_needs') }</span><Counter counterCount={ watch('special_needs_count') } onIncreaseDecrease={ (count) => setValue('special_needs_count', count) } /></div>
            </div>
        </>
    );
};
FamilyEditTable.propTypes = { familyForm: PropTypes.object.isRequired };

const FamilyReadTable = ({ employer }) => {
    const members = Array.isArray(employer?.family_members) ? employer.family_members : [];
    const counts = useMemo(() => configData.getMembersCountConfig(employer), [employer]);
    return (
        <>
            { members.length ? (
                <div className="det-tablewrap wkd-tablewrap-flush">
                    <table className="emd-table">
                        <thead><tr>{ FAMILY_TABLE_HEADER_KEYS.map((key) => <th key={ key }>{ translation(key) }</th>) }</tr></thead>
                        <tbody>
                            { members.map((member, index) => (
                                <tr key={ member.id || index }>
                                    <td className="emd-primary">{ member.name || '—' }</td>
                                    <td>{ translation(member.year_only === 'y' ? 'key_yes' : 'key_no') }</td>
                                    <td className="emd-mono">{ member.dob ? (member.year_only === 'y' ? member.dob : dayjs(member.dob).format(DATE_DISPLAY_FORMAT)) : '—' }</td>
                                    <td>{ getCalculatedAge(member.dob, member.year_only) ?? '—' }</td>
                                    <td>{ member.relation || '—' }</td>
                                    <td className="emd-mono">{ formatHKIDForDisplay(member.hk_id) || '—' }</td>
                                </tr>
                            )) }
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="mc-worker-listing-empty">{ translation('key_no_family_members') }</div>
            ) }
            <div className="emd-counts">
                { counts.map((item) => (
                    <div key={ item.category } className="emd-count"><span>{ translation(item.category) }</span><b>{ item.no ?? 0 }</b></div>
                )) }
            </div>
        </>
    );
};
FamilyReadTable.propTypes = { employer: PropTypes.object };

const EmployerFamilyCard = ({ employer, canEdit, editing, onEdit, onCancel, onSaved, actions }) => {
    const familyForm = useFamilyDetailsForm({ employer, onSaved });
    return (
        <EmdCard title={ translation('key_family_details') } tableBody canEdit={ canEdit } editing={ editing } onEdit={ onEdit } onCancel={ onCancel } onSave={ familyForm.save } saving={ familyForm.isSaving } actions={ editing ? null : actions }>
            { editing ? <FamilyEditTable familyForm={ familyForm } /> : <FamilyReadTable employer={ employer } /> }
        </EmdCard>
    );
};

EmployerFamilyCard.propTypes = {
    employer: PropTypes.object,
    canEdit: PropTypes.bool,
    editing: PropTypes.bool,
    onEdit: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    onSaved: PropTypes.func.isRequired,
    /* section actions beside Edit (U-0047 Send Template) */
    actions: PropTypes.node,
};

export default React.memo(EmployerFamilyCard);
