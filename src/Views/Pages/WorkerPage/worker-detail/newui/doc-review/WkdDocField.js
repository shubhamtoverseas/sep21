import React from "react";
import PropTypes from "prop-types";
import DateInput from "../../../../../../components/ui/DateInput";
import translation from "../../../../../../utils/translation";
import { DOC_FIELD_KIND } from "../../../workerModuleConstants";

/* one captured field on the review rail (prototype docsHTML rev.fields): stacked label over a 32px box; a value
   that matches the central document gets the green tone and the inline "Matches <central>" tag */
const WkdDocField = ({ field, value, onChange, readOnly, match, matchLabel, error, minAge }) => {
    const id = `wkd-docrv-${ field.name }`;
    const isDate = field.kind !== DOC_FIELD_KIND.TEXT;
    let min;
    let max;
    if (field.kind === DOC_FIELD_KIND.BIRTH_DATE) {
        const today = new Date();
        min = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate()).toISOString().split('T')[0];
        max = new Date(today.getFullYear() - (minAge || 0), today.getMonth(), today.getDate()).toISOString().split('T')[0];
    }
    return (
        <div className={ `wkd-docrv-field${ match ? ' is-match' : '' }${ error ? ' is-invalid' : '' }` } data-mc-doc-field={ field.name } data-mc-doc-match={ match || undefined }>
            <label className="lbl" htmlFor={ id }>{ translation(field.labelKey) }</label>
            <div className="ctl">
                { isDate ? (
                    <DateInput id={ id } name={ field.name } value={ value || '' } onChange={ (v) => onChange(field.name, v) } readOnly={ readOnly } min={ min } max={ max } invalid={ Boolean(error) } />
                ) : (
                    <input
                        id={ id }
                        className={ `wkd-docrv-in${ field.mono ? ' mono' : '' }` }
                        type="text"
                        name={ field.name }
                        value={ value || '' }
                        maxLength={ field.maxLength || undefined }
                        readOnly={ readOnly }
                        autoComplete="off"
                        onChange={ (e) => onChange(field.name, e.target.value) }
                    />
                ) }
                { match && <span className="match">Matches { matchLabel }</span> }
            </div>
            { error && <div className="err">{ translation(error) }</div> }
        </div>
    );
};

WkdDocField.propTypes = {
    field: PropTypes.shape({ name: PropTypes.string.isRequired, labelKey: PropTypes.string.isRequired, kind: PropTypes.string, maxLength: PropTypes.number, mono: PropTypes.bool }).isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    readOnly: PropTypes.bool,
    match: PropTypes.bool,
    matchLabel: PropTypes.node,
    error: PropTypes.string,
    minAge: PropTypes.number,
};

export default React.memo(WkdDocField);
