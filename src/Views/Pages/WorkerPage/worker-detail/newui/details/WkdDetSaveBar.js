import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../../../utils/translation";

const WkdDetSaveBar = ({ formId, onSave, onCancel, disabled, saving }) => {
    const blocked = Boolean(disabled) || Boolean(saving);
    return (
        <div className="wkd-det-savebar">
            <button type="button" className="wkd-det-btn" onClick={ onCancel } disabled={ saving }>
                { translation('key_cancel') }
            </button>
            <button
                type={ formId ? 'submit' : 'button' }
                form={ formId }
                className="wkd-det-btn primary"
                onClick={ formId ? undefined : onSave }
                disabled={ blocked }
                aria-disabled={ blocked }
            >
                { saving ? `${ translation('key_processing') }...` : translation('key_save') }
            </button>
        </div>
    );
};

WkdDetSaveBar.propTypes = {
    formId: PropTypes.string,
    onSave: PropTypes.func,
    onCancel: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    saving: PropTypes.bool,
};

export default React.memo(WkdDetSaveBar);
