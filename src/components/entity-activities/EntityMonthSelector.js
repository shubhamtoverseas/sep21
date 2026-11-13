import React from "react";
import PropTypes from "prop-types";

import CustomFormGroup from "../custom-form-group/CustomFormGroup";
import translation from "../../utils/translation";

const EntityMonthSelector = ({ selectedPeriod, monthOptions, onChange }) => (
    <CustomFormGroup classNames={ 'col-auto mw325 px6 mb-3' }>
        <label className='form-label'>{ translation('key_month') }</label>
        <select
            className="form-control ht44"
            value={ selectedPeriod }
            onChange={ onChange }
        >
            <option value=''>{ translation('key_all_time') }</option>
            { monthOptions.map(option => (
                <option key={ option.value } value={ option.value }>
                    { option.label }
                </option>
            )) }
        </select>
    </CustomFormGroup>
);

EntityMonthSelector.propTypes = {
    selectedPeriod: PropTypes.string.isRequired,
    monthOptions: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
};

export default EntityMonthSelector;