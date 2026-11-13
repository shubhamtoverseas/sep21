import React, { useEffect, useCallback, useMemo, useState, memo } from "react";
import PropTypes from 'prop-types';
import { Controller, useFormState } from "react-hook-form";
import translation from "../../../../../../utils/translation";
import { skillDisplayName } from "../../../../../../utils/workerDisplay";
import constData from "../../../../../../components/ReusableComponents/constants";

const MainSkillsBiodataForm = ({ control, mainSkills, onSetSkills, watch, setValue }) => {
    const { errors } = useFormState({ control });
    const [limitHint, setLimitHint] = useState(false);
    const role = React.useMemo(() => watch('role'), [watch]);
    const skills = React.useMemo(() => watch('skills') || [], [watch]);
    const driverSkillExists = useMemo(() => mainSkills?.some(skill => skill.id === constData.DRIVING_SKILL_ID), [mainSkills]);

    const mainSkillsOptions = useMemo(() =>
        mainSkills?.map((item) => ({
            value: item.id,
            label: skillDisplayName(item),
        })) || []
        , [mainSkills]);

    useEffect(() => {
        if (role === constData.DRIVER_ROLE_ID && driverSkillExists) {
            if (!skills.includes(constData.DRIVING_SKILL_ID)) {
                const newSkills = [constData.DRIVING_SKILL_ID];
                setValue('skills', newSkills);
                onSetSkills(newSkills.map(id => ({
                    value: id,
                    label: mainSkills.find(s => s.id === id)?.name
                })));
            }
        }
    }, [role, driverSkillExists, setValue, onSetSkills, mainSkills, skills]);

    const handleSkillChange = useCallback((selected, field) => {
        const selectedValues = selected ? selected.map(s => s.value) : [];

        /* A CHANGED selection may hold at most 3 main skills; Cooking is counted
         * separately. An unchanged legacy selection above 3 is never truncated. */
        const mainCount = selectedValues.filter((id) => id !== constData.COOKING_SKILL_ID).length;
        if (mainCount > constData.MAIN_SKILLS_MAX) {
            setLimitHint(true);
            return;
        }
        setLimitHint(false);

        if (role === constData.DRIVER_ROLE_ID && driverSkillExists) {
            if (!selectedValues.includes(constData.DRIVING_SKILL_ID)) {
                selectedValues.unshift(constData.DRIVING_SKILL_ID);
            }

            if (selectedValues[0] !== constData.DRIVING_SKILL_ID) {
                const filteredValues = selectedValues.filter(id => id !== constData.DRIVING_SKILL_ID);
                filteredValues.unshift(constData.DRIVING_SKILL_ID);
                field.onChange(filteredValues);
                onSetSkills(filteredValues.map(id => ({
                    value: id,
                    label: mainSkills.find(s => s.id === id)?.name
                })));
                return;
            }
        }

        field.onChange(selectedValues);
        onSetSkills(selectedValues.map(id => ({
            value: id,
            label: mainSkills.find(s => s.id === id)?.name
        })));
    }, [role, driverSkillExists, onSetSkills, mainSkills]);

    return <>
        <p className="fz20 fw-700 mt-4 text-uppercase">{ translation('key_main_skills') }</p>
        <div className="row">
            <div className="col-12 mb24">
                {/* label reads "up to 3" (display only — the stored key is unchanged) */}
                <label className="form-label required" aria-label={ translation('key_wkr_main_skills_select_up_to_3') }> { translation('key_main_skills') } { translation('key_wkr_select_up_to') } { constData.MAIN_SKILLS_MAX })</label>
                <Controller
                    name="skills"
                    control={ control }
                    render={ ({ field }) => {
                        const value = Array.isArray(field.value) ? field.value : [];
                        const mainCount = value.filter((id) => id !== constData.COOKING_SKILL_ID).length;
                        const atMax = mainCount >= constData.MAIN_SKILLS_MAX;
                        const options = mainSkillsOptions.map((o) => ({ id: o.value, name: o.label }));
                        return (
                            <div className={ `bio-checkgrid cols-3${ errors.skills ? ' has-error' : '' }` } role="group" aria-label={ translation('key_wkr_main_skills_select_up_to_3') }>
                                { options.map((o) => {
                                    const on = value.includes(o.id);
                                    const pinned = role === constData.DRIVER_ROLE_ID && o.id === constData.DRIVING_SKILL_ID;
                                    const blocked = !on && atMax && o.id !== constData.COOKING_SKILL_ID;
                                    return (
                                        <label key={ o.id } className={ `bio-check${ pinned || blocked ? ' is-disabled' : '' }` }>
                                            <input
                                                type="checkbox"
                                                value={ o.id }
                                                checked={ on }
                                                disabled={ pinned || blocked }
                                                onChange={ () => {
                                                    const next = on ? value.filter((id) => id !== o.id) : [...value, o.id];
                                                    handleSkillChange(next.map((id) => ({ value: id })), field);
                                                } }
                                            />
                                            <span>{ o.name }</span>
                                        </label>
                                    );
                                }) }
                            </div>
                        );
                    } }
                />
                { errors.skills ? <small className="text-danger">{ errors.skills.message }</small> : limitHint ? <small className="text-danger">{ translation('key_wkr_select_up_to_2') } { constData.MAIN_SKILLS_MAX } { translation('key_wkr_main_skills') }</small> : null }
            </div>
        </div>
    </>
}

MainSkillsBiodataForm.propTypes = {
    control: PropTypes.any,
    mainSkills: PropTypes.any,
    onSetSkills: PropTypes.func,
    watch: PropTypes.func.isRequired,
    setValue: PropTypes.func.isRequired,
};

export default memo(MainSkillsBiodataForm);