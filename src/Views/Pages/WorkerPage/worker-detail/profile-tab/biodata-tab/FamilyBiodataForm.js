import React, { useState, useCallback, useMemo } from "react";
import { Controller, useFormState } from "react-hook-form";
import PropTypes from 'prop-types';
import translation from "../../../../../../utils/translation";

const COUNT_MAX = 20;
const CHILD_AGE_MAX = 18;

/*
 * Family Background (prototype): Number of Children · Age of Oldest Child ·
 * Number of Siblings — selects 0–20 / 20+ (children, siblings) and 0–18 / 18+
 * (age). Marital Status lives in Profile. Same hidden-field + updateFamilyCounter
 * contract as the old steppers, so the parent's payload is unchanged.
 */
const FamilyBioDataForm = ({ workerDetail, control, register, updateFamilyCounter, setValue }) => {
    const { errors } = useFormState({ control });
    const [childrenCount, setChildrenCount] = useState(workerDetail?.children_count ?? '');
    const [siblingsCount, setSiblingsCount] = useState(workerDetail?.siblings_count ?? '');

    const countOptions = useMemo(() => Array.from({ length: COUNT_MAX + 1 }, (_, i) => i), []);
    const ageOptions = useMemo(() => Array.from({ length: CHILD_AGE_MAX }, (_, i) => i), []);

    const handleChildren = useCallback((e) => {
        const v = e.target.value;
        setChildrenCount(v);
        const n = v === `${ COUNT_MAX }+` ? v : Number(v);
        updateFamilyCounter({ children_count: n });
        if (n === 0 || v === '') setValue("oldest_child_age", 0);
    }, [updateFamilyCounter, setValue]);
    const handleSiblings = useCallback((e) => {
        const v = e.target.value;
        setSiblingsCount(v);
        updateFamilyCounter({ siblings_count: v === `${ COUNT_MAX }+` ? v : Number(v) });
    }, [updateFamilyCounter]);

    const noChildren = childrenCount === '' || Number(childrenCount) === 0;

    return <>
        <p className="fz20 fw-700 mt-4 text-uppercase">{ translation('key_family_background') }</p>
        <div className="row">
            <div className="col-6 mb-3">
                <label className="form-label">{ translation('key_number_of_children') }</label>
                <input { ...register("children_count") } type="hidden" name="children_count" value={ childrenCount } />
                <select className="form-control ht44" value={ childrenCount } onChange={ handleChildren } aria-label={ translation('key_number_of_children') }>
                    <option value="">{ translation('key_please_select') }</option>
                    { countOptions.map((n) => <option key={ n } value={ n }>{ n }</option>) }
                    <option value={ `${ COUNT_MAX }+` }>{ COUNT_MAX }+</option>
                </select>
                { errors.children_count && <small className="text-danger">{ errors.children_count.message }</small> }
            </div>
            <div className="col-6 mb-3">
                <label className="form-label">{ translation('key_age_of_oldest_child') }</label>
                <Controller
                    control={ control }
                    name="oldest_child_age"
                    render={ ({ field }) => (
                        <select { ...field } className="form-control ht44" disabled={ noChildren }>
                            <option value="">{ translation('key_please_select') }</option>
                            { ageOptions.map((age) => <option key={ age } value={ age }>{ age }</option>) }
                            <option value={ `${ CHILD_AGE_MAX }+` }>{ CHILD_AGE_MAX }+</option>
                        </select>
                    ) }
                />
                { errors.oldest_child_age && <small className="text-danger">{ errors.oldest_child_age.message }</small> }
            </div>
        </div>
        <div className="row">
            <div className="col-6 mb-3">
                <label className="form-label">{ translation('key_number_of_siblings') }</label>
                <input { ...register("siblings_count") } type="hidden" name="siblings_count" value={ siblingsCount } />
                <select className="form-control ht44" value={ siblingsCount } onChange={ handleSiblings } aria-label={ translation('key_number_of_siblings') }>
                    <option value="">{ translation('key_please_select') }</option>
                    { countOptions.map((n) => <option key={ n } value={ n }>{ n }</option>) }
                    <option value={ `${ COUNT_MAX }+` }>{ COUNT_MAX }+</option>
                </select>
                { errors.siblings_count && <small className="text-danger">{ errors.siblings_count.message }</small> }
            </div>
        </div>
    </>;
};

FamilyBioDataForm.propTypes = {
    errors: PropTypes.any,
    workerDetail: PropTypes.any,
    control: PropTypes.any,
    maritalStatus: PropTypes.any,
    register: PropTypes.any,
    updateFamilyCounter: PropTypes.any,
    setValue: PropTypes.any,
};

export default React.memo(FamilyBioDataForm);
