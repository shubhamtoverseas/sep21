import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { interpolate } from "../../../../i18n/interpolate";
import { formatDate } from "../../../../utils/utils";
import "../new-ui-shared.css";
import "../new-ui-create.css";

/*
 * Contract Invoice creation · the context strip on Invoice items and Invoice Review (27 Oct package; the reference page's
 * ctxStrip): Employer · Worker · Worker Code · Renewal of (the predecessor) · Invoice Date · Branch · CS Owner, read-only.
 * The route, New / Replacement and Driver are carried by the primary fee's Item Type and Description, so there is no
 * Service field here. A Standalone Invoice (INV-G3, #28) has one party: its cell (Employer or Worker, with its code)
 * replaces Employer · Worker · Worker Code. An Exchange (INV-X3, X4) names its original invoice after the Worker Code.
 */
const ContractContextStrip = ({ contractFormInfo, predecessor, standalone }) => {
    const { t } = useTranslation();
    const employer = contractFormInfo?.currentInvoiceEmployerDetail;
    const worker = contractFormInfo?.currentInvoiceWorkerDetail;
    const workerCode = worker?.reference_id || worker?.worker_reference_id;
    const party = standalone && (contractFormInfo?.party_type === "worker"
        ? { label: "key_worker", name: worker?.name, code: workerCode }
        : { label: "key_employer", name: employer?.name, code: employer?.reference_id });
    return (
        <div className="cs-metastrip items-ctx">
            { party ? (
                <div className="cell" data-party={ contractFormInfo?.party_type }><div className="k">{ t(party.label) }</div><div className="v">{ party.name }{ party.code && <span className="code"> { party.code }</span> }</div></div>
            ) : <>
                <div className="cell"><div className="k">{ t("key_employer") }</div><div className="v">{ employer?.name }{ employer?.reference_id && <span className="code"> { employer.reference_id }</span> }</div></div>
                <div className="cell"><div className="k">{ t("key_worker") }</div><div className="v">{ worker?.name }</div></div>
                <div className="cell"><div className="k">{ t("key_worker_code") }</div><div className="v mono">{ workerCode || "—" }</div></div>
                { contractFormInfo?.currentInvoiceExchange && (
                    <div className="cell" data-exchange-of><div className="k">{ t("key_inv_original_invoice") }</div><div className="v mono">{ contractFormInfo.currentInvoiceExchange.invoice_number }</div></div>
                ) }
            </> }
            { predecessor && (
                <div className="cell"><div className="k">{ t("key_inv_renewal_of") }</div>
                    <div className="v mono">{ predecessor.ref }</div>
                    <div className="v2">{ t("key_active") }{ predecessor.end ? ` · ${ interpolate(t("key_inv_ends"), formatDate(predecessor.end)) }` : "" }</div>
                </div>
            ) }
            <div className="cell"><div className="k">{ t("key_invoice_date") }</div><div className="v mono">{ contractFormInfo?.invoice_date ? formatDate(contractFormInfo.invoice_date) : "—" }</div></div>
            <div className="cell"><div className="k">{ t("key_branch") }</div><div className="v">{ contractFormInfo?.branch_name || "—" }</div></div>
            <div className="cell"><div className="k">{ t("key_cs_owner") }</div><div className="v">{ contractFormInfo?.cs_name || "—" }</div></div>
        </div>
    );
};

ContractContextStrip.propTypes = {
    contractFormInfo: PropTypes.object,
    predecessor: PropTypes.shape({ ref: PropTypes.string, end: PropTypes.string }),
    /** a Standalone Invoice: one party cell (INV-G3) */
    standalone: PropTypes.bool,
};

export default React.memo(ContractContextStrip);
