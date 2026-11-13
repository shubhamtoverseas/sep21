import React from "react";
import PropTypes from "prop-types";

/* A related invoice's reference (28 Sep sheet row 8): blue and clickable only when the Invoice API says this user may
   open it (`can_open`); otherwise neutral mono text. Never a "#", never truncated. */
const InvoiceRelatedRef = ({ invoice, onOpen }) => {
    if (!invoice?.can_open) return <div className="ref neutral">{ invoice?.invoice_number }</div>;
    return (
        <div className="ref" role="link" tabIndex={ 0 } onClick={ () => onOpen(invoice) }
            onKeyDown={ (e) => { if (e.key === 'Enter') onOpen(invoice); } }>{ invoice.invoice_number }</div>
    );
};

InvoiceRelatedRef.propTypes = {
    invoice: PropTypes.object,
    onOpen: PropTypes.func.isRequired,
};

export default InvoiceRelatedRef;
