import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import RecordFollowUp from "../../../components/follow-up/RecordFollowUp";
import { hasInvoiceFollowUp } from "../../../utils/permissions/followUpPermissionUtils";
import translation from "../../../utils/translation";
import configData from "../../../components/ReusableComponents/app-configs";
import { CAL_FROM_INVOICE, CAL_TASK_SOURCE, FU_COPY_KEY } from "../Calendar/newui/calendarConstants";

/*
 * S10 — Follow Up from Invoice (WORKFLOWS FIN-F01e; v211_followup.jsx): the first header action, same height and gap as
 * Customer Printout and Remark, on the shared RecordFollowUp launcher (grant + server check, count above 0, ?followup
 * arrival). The sheet facts are reference · type · worker — never an amount, a payment state or a balance.
 */
const InvoiceFollowUp = ({ invoice }) => {
    const permissionList = useSelector((state) => state.users.permissionList);
    const granted = hasInvoiceFollowUp(permissionList?.data);
    const invoiceId = invoice?.id ?? null;

    const source = useMemo(() => {
        // the Follow Up facts never use payment fields (S10), so the Reservation Fee subtype reads as Contract (OP-ST2-05)
        const type = configData.invoiceTypeLabel(invoice?.invoice_type) || null;
        const worker = invoice?.worker_name || null;
        return {
            type: CAL_TASK_SOURCE.INVOICE,
            id: invoiceId,
            ref: invoice?.invoice_number || '',
            sub: [type, worker].filter(Boolean).join(' · '),
            kindLabel: translation(FU_COPY_KEY.invoice),
            facts: { type, worker_name: worker, employer_name: invoice?.employer_name || null },
            from: CAL_FROM_INVOICE,
        };
    }, [invoiceId, invoice?.invoice_number, invoice?.invoice_type, invoice?.worker_name, invoice?.employer_name]);

    return (
        <RecordFollowUp source={ source } granted={ granted }>
            { ({ count, open, launcherRef }) => (
                <button ref={ launcherRef } type="button" className="btn btn-secondary md" title={ translation(FU_COPY_KEY.followUp) } data-fu-launcher="invoice" onClick={ open }>
                    { translation(FU_COPY_KEY.followUp) }
                    { count > 0 && <span className="fu-count" data-fu-count={ count }>{ count }</span> }
                </button>
            ) }
        </RecordFollowUp>
    );
};

InvoiceFollowUp.propTypes = {
    /* the loaded invoice detail (GET /contract/invoices/detail): id, invoice_number, invoice_type, worker_name, employer_name */
    invoice: PropTypes.object,
};

export default InvoiceFollowUp;
