import React, { useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Remarks from "../remarks/Remarks";

const InvoiceRemarks = ({ invoiceId }) => {
    const { t } = useTranslation();
    const [editPopup, setEditPopup] = useState(false);

    return (
        <div className="detail-section">
            <div className="head">
                <h2>{ t('key_remarks') || 'Remarks' }</h2>
                <span className="helper">{ t('key_separate_from_action_reasons') || 'Separate from action reasons' }</span>
            </div>
            <div className="body remarks-host">
                <Remarks
                    entityType='invoice'
                    entityId={ invoiceId }
                    isAddRemarksPopup={ editPopup }
                    handleOnCloseAddRemarks={ (show) => setEditPopup(!!show) }
                    dateFormat="DD MMM YYYY HH:mm"
                />
            </div>
        </div>
    );
};

InvoiceRemarks.propTypes = {
    invoiceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default InvoiceRemarks;
