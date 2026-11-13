import React, { useMemo, memo, useCallback } from "react";
import PropTypes from 'prop-types';
import { Controller, useFormState } from "react-hook-form";
import BioCheckGrid from "./BioCheckGrid";
import translation from "../../../../../../utils/translation";
import constData from "../../../../../../components/ReusableComponents/constants";

/*
 * Main Skills detail rows (prototype V28_SKILL_GROUPS): every row is a labelled
 * field of the Main Skills section — "I can cook" (3 cols), the Baby Care and
 * Elderly Care questions and "Household Chores Experience" (2 cols each).
 * Same form keys and toggle handlers as before; only the controls changed.
 */
const CookingBiodataForm = ({ control, cookingList, childCareAgeList, childCareDuties, elderlyCareDuties, householdChores, handleSelectedChildCareDuties, handleSelectedElderlyCareDuties, selectedChildCareDuties, selectedElderlyCareDuties, selectedHouseholdChores, handleSelectedHouseholdChores, mainSkillsList, mainSkills }) => {
    const isChildCareSelected = useMemo(() => mainSkillsList.some((id) => constData.isChildCareSkill(mainSkills?.find((s) => s.id === id) || { id })), [mainSkillsList, mainSkills]);
    const isElderlyCareSelected = useMemo(() => mainSkillsList.includes(constData.ELDERLY_CARE_SKILL_ID), [mainSkillsList]);
    const { errors } = useFormState({ control });

    const opts = (list) => (list || []).map((item) => ({ id: item.id, name: item.name }));
    /* U-0209: an empty stored list is empty — nothing is pre-ticked and nothing is filled in on Save */
    const shown = (selected) => (Array.isArray(selected) ? selected : []);
    /* the toggle handlers take ONE id — derive it from the grid's next array */
    const toggled = useCallback((prev, next) => {
        const a = new Set(prev.map(String)); const b = new Set(next.map(String));
        const diff = [...a].find((x) => !b.has(x)) ?? [...b].find((x) => !a.has(x));
        return diff == null ? null : (Number.isNaN(Number(diff)) ? diff : Number(diff));
    }, []);

    return <section className="bio-skill-detail">
        {/* W-02: Cooking is its own section — the cuisines are asked whether or not Cooking is ticked as a skill */}
        <div className="row">
            <div className="col-12 mb-3">
                <label className="form-label">{ translation('key_wkr_i_can_cook') }</label>
                <Controller
                    name="cooking"
                    control={ control }
                    render={ ({ field }) => (
                        <BioCheckGrid cols={ 3 } ariaLabel={ translation('key_wkr_i_can_cook') } options={ opts(cookingList) } value={ field.value || [] } onChange={ field.onChange } error={ Boolean(errors.cooking) } />
                    ) }
                />
                { errors.cooking && <small className="text-danger">{ errors.cooking.message }</small> }
            </div>
        </div>

        { isChildCareSelected && (
            <div className="row">
                <div className="col-12 mb-3">
                    <label className="form-label">{ translation('key_age_groups_cared_for_in_previous_roles') }</label>
                    <Controller
                        name="child_care_age_ids"
                        control={ control }
                        render={ ({ field }) => (
                            <BioCheckGrid cols={ 2 } ariaLabel={ translation('key_which_age_groups_have_you_cared_for') } options={ opts(childCareAgeList) } value={ field.value || [] } onChange={ field.onChange } error={ Boolean(errors.child_care_age_ids) } />
                        ) }
                    />
                    { errors.child_care_age_ids && <small className="text-danger">{ errors.child_care_age_ids.message }</small> }
                </div>
                <div className="col-12 mb-3">
                    <label className="form-label">{ translation('key_tasks_while_caring_for_children') }</label>
                    <BioCheckGrid
                        cols={ 2 }
                        ariaLabel={ translation('key_tasks_performed_while_caring_for_children') }
                        options={ opts(childCareDuties) }
                        value={ shown(selectedChildCareDuties) }
                        onChange={ (next) => { const id = toggled(shown(selectedChildCareDuties), next); if (id != null) handleSelectedChildCareDuties(id); } }
                    />
                </div>
            </div>
        ) }

        { isElderlyCareSelected && (
            <div className="row">
                <div className="col-6 mb-3">
                    <label className="form-label">{ translation('key_wkr_age_of_elderly_person_you_have_provided') }</label>
                    <Controller
                        name="age_of_elder"
                        control={ control }
                        render={ ({ field }) => (
                            <input
                                { ...field }
                                type="text"
                                inputMode="numeric"
                                maxLength={ 3 }
                                className={ `form-control ${ errors.age_of_elder ? "is-invalid" : "" }` }
                                onInput={ (e) => {
                                    let value = e.target.value.replace(/[^0-9]/g, '');
                                    if (value !== "" && Number(value) > 100) value = "100";
                                    e.target.value = value;
                                    field.onChange(value);
                                } }
                            />
                        ) }
                    />
                    { errors.age_of_elder && <small className="text-danger">{ errors.age_of_elder.message }</small> }
                </div>
                <div className="col-12 mb-3">
                    <label className="form-label">{ translation('key_main_responsibilities') }</label>
                    <BioCheckGrid
                        cols={ 2 }
                        ariaLabel={ translation('key_main_responsibilities') }
                        options={ opts(elderlyCareDuties) }
                        value={ shown(selectedElderlyCareDuties) }
                        onChange={ (next) => { const id = toggled(shown(selectedElderlyCareDuties), next); if (id != null) handleSelectedElderlyCareDuties(id); } }
                    />
                </div>
            </div>
        ) }

        <div className="row">
            <div className="col-12 mb-3">
                <label className="form-label">{ translation('key_wkr_household_chores_experience') }</label>
                <BioCheckGrid
                    cols={ 2 }
                    ariaLabel={ translation('key_wkr_household_chores_experience') }
                    options={ opts(householdChores) }
                    value={ shown(selectedHouseholdChores) }
                    onChange={ (next) => { const id = toggled(shown(selectedHouseholdChores), next); if (id != null) handleSelectedHouseholdChores(id); } }
                />
            </div>
        </div>
    </section>;
};

CookingBiodataForm.propTypes = {
    cookingList: PropTypes.any,
    control: PropTypes.any,
    childCareAgeList: PropTypes.any,
    childCareDuties: PropTypes.any,
    elderlyCareDuties: PropTypes.any,
    householdChores: PropTypes.any,
    handleSelectedChildCareDuties: PropTypes.func,
    handleSelectedElderlyCareDuties: PropTypes.func,
    selectedChildCareDuties: PropTypes.any,
    selectedElderlyCareDuties: PropTypes.any,
    selectedHouseholdChores: PropTypes.any,
    handleSelectedHouseholdChores: PropTypes.func,
    mainSkillsList: PropTypes.any,
    mainSkills: PropTypes.array,
};

export default memo(CookingBiodataForm);
