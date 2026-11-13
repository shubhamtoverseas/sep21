import React from "react";
import PropTypes from "prop-types";
import constData from "../ReusableComponents/constants";
import configData from "../ReusableComponents/app-configs";
import styles from "../../Views/Pages/Invoice/InvoiceList.module.css";

/* An invoice status as the MaidMatch status gallery tag (.mc-status-tag-v17): the tone and treatment of its status id
   (constData.STATUS_TAG_TONES, the prototype's INVOICE_STATUS_TAG map) and the status label unless one is given. The one
   status tag of the list, the detail state strip, Related Invoices and the related-invoice brief. */
const InvoiceStatusTag = ({ status, label }) => {
    const tag = constData.STATUS_TAG_TONES[status] || { tone: 'neutral' };
    return (
        <span className={ styles.statusTag } data-tone={ tag.tone } data-treatment={ tag.treatment || 'filled' }>
            { label ?? configData.invoiceStatusIdMapping[status]?.label ?? '' }
        </span>
    );
};

InvoiceStatusTag.propTypes = {
    status: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    label: PropTypes.node,
};

export default InvoiceStatusTag;
