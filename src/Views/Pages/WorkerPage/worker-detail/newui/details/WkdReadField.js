import React from "react";
import PropTypes from "prop-types";

const WkdReadField = ({ label, value, required, mono, span, hint, det }) => {
    const missing = !value && required;
    return (
        <div className={ span ? 'det-full' : undefined }>
            <div className={ `wkd-lbl${ det ? ' wkd-det-lbl' : '' }${ missing ? ' is-missing' : '' }` }>{ label }{ missing ? '*' : '' }</div>
            { hint && <div className="wkd-det-hint">{ hint }</div> }
            <div className={ `wkd-read-value${ missing ? ' is-missing' : '' }${ !value ? ' is-empty' : '' }${ mono && value ? ' mono' : '' }` }>
                { value || '—' }
            </div>
        </div>
    );
};

WkdReadField.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.node,
    required: PropTypes.bool,
    mono: PropTypes.bool,
    span: PropTypes.bool,
    hint: PropTypes.string,
    det: PropTypes.bool,
};

export default React.memo(WkdReadField);
