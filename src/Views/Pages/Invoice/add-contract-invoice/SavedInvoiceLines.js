import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import { formatHK } from "../../../../utils/utils";
import InvoiceItemsTable from "./InvoiceItemsTable";
import { SETTLEMENT_KINDS } from "./contractSetup";
import "../new-ui-review.css";
import "./SavedInvoiceLines.css";

/*
 * Saved Invoice Details · the frozen pricing record (27 Oct package, INV-C5, INV-G5; R-F1): the line table Invoice Review
 * showed, read from the rows saved when the invoice was created and carried by the detail answer (pricing_record). Nothing
 * is recomputed or re-priced here. The pricing code and the price list version are small text on the card; the rule notes
 * follow. The five sections of the screen stay as they are: this fills the Financial Summary and the Line items section.
 * An A2 (INV-X1) shows its settlement lines and, under its HK$0 total, the settlement figures it was created with (OP-27-118).
 */

/* the routes with no Reservation Fee (R-P1); a Standalone invoice has no route and takes neither note */
const NO_RESERVATION_FEE_ROUTES = ["direct_hire", "local_transfer", "renewal"];

/** The frozen record in the shape the line table reads (the engine's answer, as Invoice Review has it). */
export const savedResultOf = (record) => {
    const lines = record.lines || [];
    const charged = lines.filter((l) => !l.removed && l.role !== "credit");
    return {
        ok: true,
        lines: charged.map((l) => ({ id: l.key, kind: l.role, itemType: l.item_type, label: l.description, savedDetail: l.detail, original: l.original, net: l.net, steps: l.steps || [] })),
        restorable: lines.filter((l) => l.removed).map((l) => ({ item: l.key, itemType: l.item_type, label: l.description, amount: l.original })),
        total: { original: record.summary.charges, discount: record.summary.discounts, net: record.summary.invoiceTotal },
        summary: record.summary,
    };
};

export const savedCreditsOf = (record) => (record.lines || []).filter((l) => l.role === "credit")
    .map((l) => ({ key: l.key, itemType: l.item_type, description: l.description, applied: Math.abs(Number(l.net)) }));

/** The Financial Summary's figures from the frozen record (R-T1); Paid and Balance Due stay live below them. */
export const SavedFinancialRows = ({ summary }) => {
    const { t } = useTranslation();
    return (
        <>
            <div className="fs-row" data-saved="charges"><div className="label">{ t("key_inv_charges") }</div><div className="v">{ formatHK(summary.charges) }</div></div>
            { summary.discounts > 0 && <div className="fs-row adj-neg" data-saved="discounts"><div className="label">{ t("key_inv_discounts") }</div><div className="v">-{ formatHK(summary.discounts) }</div></div> }
            <div className="fs-row" data-saved="total"><div className="label">{ t("key_invoice_total") }</div><div className="v">{ formatHK(summary.invoiceTotal) }</div></div>
            { summary.creditApplied > 0 && <div className="fs-row adj-neg" data-saved="credit"><div className="label">{ t("key_inv_credit_applied") }</div><div className="v">-{ formatHK(summary.creditApplied) }</div></div> }
        </>
    );
};
SavedFinancialRows.propTypes = { summary: PropTypes.object.isRequired };

const SavedInvoiceLines = ({ record, isReservationFee = false }) => {
    const { t } = useTranslation();
    const result = useMemo(() => savedResultOf(record), [record]);
    const credits = useMemo(() => savedCreditsOf(record), [record]);
    const items = result.lines.filter((l) => !SETTLEMENT_KINDS.includes(l.kind)).length;
    return (
        <div className="detail-section" data-saved-record>
            <div className="head">
                <h2>{ t("key_line_items") }</h2>
                <span className="helper">
                    { items } { (items === 1 ? t("key_item") : t("key_items")).toLowerCase() }
                    { credits.length > 0 && ` · ${ credits.length } ${ (credits.length === 1 ? t("key_credit") : t("key_credits")).toLowerCase() }` }
                </span>
            </div>
            <div className="body">
                <InvoiceItemsTable result={ result } mode="ro" credits={ credits } settlement={ record.settlement } />
                <div className="saved-lines-meta">
                    { record.pricing_code && <span data-pricing-code>{ t("key_pricing_code") } <span className="code">{ record.pricing_code }</span></span> }
                    { record.price_list_version_id != null && <span data-price-version>{ t("key_inv_price_list_version") } <span className="code">{ record.price_list_version_id }</span></span> }
                </div>
                <div className="saved-lines-note" data-rule-note>{ t("key_inv_never_repriced") }</div>
                { isReservationFee && <div className="saved-lines-note" data-rf-note>{ t("key_inv_saved_rf_note") }</div> }
                { NO_RESERVATION_FEE_ROUTES.includes(record.route) && <div className="saved-lines-note" data-no-rf-note>{ t("key_inv_no_rf_on_route") }</div> }
            </div>
        </div>
    );
};

SavedInvoiceLines.propTypes = {
    /* the detail answer's pricing_record */
    record: PropTypes.object.isRequired,
    /* @migration-unspecified(invoice): the package asks for an "RF note" and gives no text (OP-27-96) */
    isReservationFee: PropTypes.bool,
};

export default React.memo(SavedInvoiceLines);
