import React from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { hk } from "./contractSetup";
import "../new-ui-shared.css";
import "../new-ui-create.css";

/*
 * Exchange · setup · the original invoice card (INV-X2; register #70, #71), in the Contract setup's card pattern: A1's
 * reference, its employer and outgoing worker, what A1 received, what its non-voided refunds returned and the available
 * credit, read-only. The figures are the pricing engine's (POST /invoices/price, route "exchange"): the credit is its
 * Exchange Credit line, never computed here.
 */
const ExchangeOriginCard = ({ a1, pricing }) => {
    const { t } = useTranslation();
    const result = pricing?.result || null;
    const answer = result?.exchange || null;
    const credit = (result?.lines || []).find((l) => l.kind === "exchange_credit");
    return (
        <div className="party-card exchange-origin" data-exchange-origin>
            <div className="pc-head"><span className="role">{ t("key_inv_original_invoice") }</span></div>
            <div className="pc-body">
                <div className="party-detail setup-facts">
                    <div className="kv"><div className="k">{ t("key_invoice_ref") }</div><div className="v mono" data-a1-ref>{ a1?.invoice_number || "—" }</div></div>
                    <div className="kv"><div className="k">{ t("key_employer") }</div>
                        <div className="v">{ a1?.employer_name || "—" }{ a1?.employer_reference_id && <span className="code"> { a1.employer_reference_id }</span> }</div></div>
                    <div className="kv"><div className="k">{ t("key_inv_outgoing_worker") }</div>
                        <div className="v">{ a1?.worker_name || "—" }{ a1?.worker_reference_id && <span className="code"> { a1.worker_reference_id }</span> }</div></div>
                    <div className="kv"><div className="k">{ t("key_paid") }</div><div className="v mono" data-a1-paid>{ answer ? hk(answer.paid) : "—" }</div></div>
                    <div className="kv"><div className="k">{ t("key_inv_refunds") }</div>
                        <div className="v mono" data-a1-refunds>{ answer ? (answer.refunds ? `−${ hk(answer.refunds) }` : hk(0)) : "—" }</div></div>
                    <div className="kv"><div className="k">{ t("key_inv_available_credit") }</div>
                        <div className="v mono" data-a1-credit>{ credit ? hk(Math.abs(credit.net)) : "—" }</div></div>
                </div>
            </div>
        </div>
    );
};

ExchangeOriginCard.propTypes = {
    /* the original invoice as its detail screen opened the exchange with it */
    a1: PropTypes.object,
    /* the engine's answer for the exchange setup (useContractPricing) */
    pricing: PropTypes.shape({ status: PropTypes.string, result: PropTypes.object }),
};

export default React.memo(ExchangeOriginCard);
