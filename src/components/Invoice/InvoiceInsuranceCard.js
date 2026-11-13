import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Icon from "../Icon/Icon";
import Badge from "../ui/Badge";
import routes from "../../Views/Pages/routes/routesConfig";
import { getInvoiceInsuranceRecordsAPI } from "../../services/insurance";
import { takePrefetchedInvoiceInsuranceRecords } from "./invoiceInsurancePrefetch";
import { coverageLabel, factText } from "../../Views/Pages/insurance/dashboard/insuranceDashboardConfig";

/* coverage label → badge (reference InsuranceSide: Active success, In Review attention) */
const COVERAGE_VARIANT = { active: "success", future: "info", none: "neutral" };

/**
 * The Insurance side card of the invoice detail (reference invoice-detail.html InsuranceSide; open point OP-UI4-01): one
 * card per insurance record the invoice is linked to, as the Insurance API reads them for this user — records they may not
 * see are left out, and without Insurance access there is no card. Policy is the applicable period's policy number ("—"
 * until the insurer issues it); Status is In Review while an issue is open on the record (with that issue as the note),
 * otherwise its coverage in the Insurance pages' words; the policy anchors on this invoice.
 */
const InvoiceInsuranceCard = ({ invoiceId = null, invoiceRef = "" }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);

    useEffect(() => {
        let live = true;
        setRecords([]);
        if (!invoiceId) return undefined;
        /* the read the invoice screen's gate started, if any (performance track A-10; invoiceInsurancePrefetch.js) */
        (takePrefetchedInvoiceInsuranceRecords(invoiceId) || getInvoiceInsuranceRecordsAPI(invoiceId))
            .then((res) => { if (live) setRecords(res?.data?.data?.records || []); })
            .catch(() => { /* the card is information only: no Insurance access or the Insurance API is unavailable */ });
        return () => { live = false; };
    }, [invoiceId]);

    return records.map((record) => {
        const path = routes.insuranceRecord.replace(":ref", record.ref);
        const coverage = record.coverage || {};
        return (
            <div className="context-side" key={ record.ref } data-insurance-ref={ record.ref }>
                <div className="head-row"><Icon name="shield" size={ 12 } /><span>{ t("key_insurance") }</span></div>
                <div className="row">
                    <span className="k">{ t("key_policy") }</span>
                    <span className="v mono">{ record.policyNumber || "—" }</span>
                </div>
                <div className="row">
                    <span className="k">{ t("key_status") }</span>
                    { record.inReview
                        ? <Badge variant="attention" status={ t("key_in_review") } />
                        : <Badge variant={ COVERAGE_VARIANT[coverage.label] || "neutral" } status={ factText(coverage.fact, coverage.factDate) || coverageLabel(coverage.label) } /> }
                </div>
                <div className="row">
                    <span className="k">{ t("key_anchored_on") }</span>
                    <span className="v mono">{ invoiceRef }</span>
                </div>
                { record.note && <div className="rf-hold-note">{ record.note }</div> }
                { record.openable && (
                    <a className="link" href={ path } onClick={ (e) => { e.preventDefault(); navigate(path); } }>
                        <Icon name="external" size={ 12 } /> { t("key_open_insurance_record") }
                    </a>
                ) }
            </div>
        );
    });
};

InvoiceInsuranceCard.propTypes = {
    invoiceId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    invoiceRef: PropTypes.string,
};

export default InvoiceInsuranceCard;
