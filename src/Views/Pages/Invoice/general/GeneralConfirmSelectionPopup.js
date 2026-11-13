import React, { useState } from "react";
import PropTypes from "prop-types";
import translation from "../../../../utils/translation";
import Icon from "../../../../components/Icon/Icon";
import constData from "../../../../components/ReusableComponents/constants";
import "./GeneralConfirmSelectionPopup.css";

const OPTIONS = constData.GENERAL_CONFIRM_SELECTION_OPTIONS;

function GeneralConfirmSelectionPopup(props) {
    const { cancelContractDialog, confirmSelectOption } = props;
    const [selected, setSelected] = useState("");

    const handleNext = () => {
        if (!selected) return;
        confirmSelectOption(selected);
    };

    return (
        <div className="invd gcs-veil" role="dialog" aria-modal="true" onClick={ (e) => e.target === e.currentTarget && cancelContractDialog() }>
            <div className="gcs-card">
                <div className="gcs-head">
                    <h2>{ translation("key_please_select") }</h2>
                    <button type="button" className="gcs-close" onClick={ cancelContractDialog } aria-label={ translation("key_close") }>
                        <Icon name="x" size={ 18 } />
                    </button>
                </div>

                <div className="gcs-body">
                    <p className="gcs-question">{ translation("key_who_generate_invoice") }</p>
                    <div className="gcs-radio-row">
                        { OPTIONS.map((o) => (
                            <label key={ o.key } className="gcs-radio">
                                <input
                                    type="radio"
                                    name="gcs-invoice-for"
                                    value={ o.key }
                                    checked={ selected === o.key }
                                    onChange={ () => setSelected(o.key) }
                                />
                                <span className="gcs-radio-label">{ translation(o.title) }</span>
                            </label>
                        )) }
                    </div>
                </div>

                <div className="gcs-foot">
                    <button type="button" className="btn btn-secondary md" onClick={ cancelContractDialog }>{ translation("key_cancel") }</button>
                    <button type="button" className="btn btn-primary md" disabled={ !selected } onClick={ handleNext }>{ translation("key_next") }</button>
                </div>
            </div>
        </div>
    );
}

GeneralConfirmSelectionPopup.propTypes = {
    cancelContractDialog: PropTypes.func,
    confirmSelectOption: PropTypes.func,
    message: PropTypes.string,
};

export default GeneralConfirmSelectionPopup;
