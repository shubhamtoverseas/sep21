import React from "react";
import PropTypes from "prop-types";
import Select from "react-select";
import translation from "../../utils/translation";
import styles from "./SearchSelect.module.css";

/*
 * The kit's searchable single select (react-select, unstyled, styled like FormControls' input): typing filters the
 * options client-side, or the host filters server-side through `onInputChange`. An option may carry a `sub` line
 * (e.g. an owner's workload) and an `adornment` beside its label (e.g. the shared inactive-staff cue); the label stays
 * plain text, so filtering and the screen-reader announcements read it as before. `noOptionsMessage` is the host's empty
 * state — never a silent empty list.
 */
const formatOption = (option) => (
    <div className={ styles.option }>
        { option.adornment ? (
            <span className={ styles.optionRow }>
                <span className={ styles.optionLabel }>{ option.label }</span>
                { option.adornment }
            </span>
        ) : <span className={ styles.optionLabel }>{ option.label }</span> }
        { option.sub && <span className={ styles.optionSub }>{ option.sub }</span> }
    </div>
);

const SearchSelect = ({ inputId, value, options, onChange, onInputChange, filterOption, placeholder, noOptionsMessage, isLoading, disabled, invalid, isClearable = false, className }) => (
    <Select
        inputId={ inputId }
        className={ `${ styles.select }${ invalid ? ` ${ styles.invalid }` : "" }${ className ? ` ${ className }` : "" }` }
        classNamePrefix="mc-select"
        unstyled
        options={ options }
        value={ options.find((o) => String(o.value) === String(value)) || null }
        onChange={ (option) => onChange(option ? option.value : "") }
        onInputChange={ onInputChange }
        filterOption={ filterOption }
        formatOptionLabel={ formatOption }
        isLoading={ isLoading }
        isDisabled={ disabled }
        isClearable={ isClearable }
        isSearchable
        placeholder={ placeholder || translation("key_please_select") }
        noOptionsMessage={ () => noOptionsMessage || translation("key_no_data_found") }
        loadingMessage={ () => `${ translation("key_loading") }…` }
    />
);

SearchSelect.propTypes = {
    inputId: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, label: PropTypes.node.isRequired, sub: PropTypes.node, adornment: PropTypes.node })).isRequired,
    onChange: PropTypes.func.isRequired,
    onInputChange: PropTypes.func,
    filterOption: PropTypes.oneOfType([PropTypes.func, PropTypes.oneOf([null])]),
    placeholder: PropTypes.node,
    noOptionsMessage: PropTypes.node,
    isLoading: PropTypes.bool,
    disabled: PropTypes.bool,
    invalid: PropTypes.bool,
    isClearable: PropTypes.bool,
    className: PropTypes.string,
};

export default SearchSelect;
