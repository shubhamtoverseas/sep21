import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import routes from "../../Views/Pages/routes/routesConfig";
import "../../Views/Pages/Invoice/InvoiceDetail.css";
import "../../Views/Pages/Invoice/new-ui-shared.css";

/* The one neutral state for an invoice this user may not open, that does not exist (28 Sep sheet row 8), or that failed to
   load — in the detail frame like the reference RecordDenied: the crumb "Invoices / —", the title "Not available" and the
   message in a neutral card. It names no record fact. The message is the Invoice API's RECORD_NOT_AVAILABLE wording unless
   the screen passes the API's own. */
const InvoiceRecordNotAvailable = ({ message }) => {
    const { t } = useTranslation();
    return (
        <div className="invd" data-invoice-not-available="">
            <div className="detail-header">
                <div className="crumb-row">
                    <Link to={ routes.invoices }>{ t('key_invoices') }</Link>
                    <span className="sep">/</span>
                    <span className="here">—</span>
                </div>
                <div className="detail-title-row">
                    <h1>{ t('key_not_available') }</h1>
                </div>
            </div>
            <div className="detail-section record-unavailable">
                <div className="body">
                    <div className="remark-empty unavailable" role="status">{ message || t('key_record_not_available') }</div>
                </div>
            </div>
        </div>
    );
};

InvoiceRecordNotAvailable.propTypes = {
    message: PropTypes.string,
};

export default InvoiceRecordNotAvailable;
