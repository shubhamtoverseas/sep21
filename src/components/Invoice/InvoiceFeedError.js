import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

/* Loading / error states of the tab (28 Sep sheet row 1).
   @migration-unspecified(invoice): spec is silent on the loading and error copy of the detail tabs.
   Retained the app's existing keys (key_failed_to_load_data, key_retry); loading shows the circle loader (CustomSpinner, labelled key_loading). Confirm with product before release. */
const InvoiceFeedError = ({ onRetry }) => {
    const { t } = useTranslation();
    return (
        <div className="remark-empty" role="alert">
            <div>{ t('key_failed_to_load_data') }</div>
            <div className="audit-more">
                <button type="button" className="audit-more-btn" onClick={ onRetry }>{ t('key_retry') }</button>
            </div>
        </div>
    );
};

InvoiceFeedError.propTypes = {
    onRetry: PropTypes.func.isRequired,
};

export default InvoiceFeedError;
