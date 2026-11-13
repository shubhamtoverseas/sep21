import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import translation from "../../../../utils/translation";
import { headingCase } from "../../../../utils/utils";
import { getInvoices } from "../../../../services/invoices";
import { EM_DASH, dateOrDash, initialsOf, money } from "./contractRecordUtils";
import { CD_TONE, CR_INVOICE_PAGE_LIMIT } from "../contractConstants";
import { balanceDueOf } from "../../Invoice/invoiceBalance";

const COLUMNS = ["key_type", "key_status", "key_date", "key_total", "key_paid", "key_balance_due", "key_handling_staff"];

/**
 * Invoice tab: the invoices of this employer + worker pair (POST /employer-contract-invoice-list; a contract-scoped
 * list is audit B13). Rows open the invoice once the Invoice record route is confirmed by that team.
 */
const InvoiceTab = ({ row }) => {
    const [invoices, setInvoices] = useState(null);
    useEffect(() => {
        let alive = true;
        getInvoices({ employer_id: row.employer_id, worker_id: row.worker_id, contract_id: Number(row.id), page: 1, limit: CR_INVOICE_PAGE_LIMIT })
            .then((res) => {
                if (!alive) return;
                const d = res?.data?.data; const list = Array.isArray(d) ? d : (d?.data || []);
                /* this contract's invoices only: an API that carries contract_id is filtered on it, an older one returns the pair's list */
                setInvoices(list.some((i) => i && "contract_id" in i) ? list.filter((i) => String(i.contract_id) === String(row.id)) : list);
            })
            .catch(() => { if (alive) setInvoices([]); });
        return () => { alive = false; };
    }, [row.id, row.employer_id, row.worker_id]);

    if (invoices === null) return <div className="mcdt-dcard flush"><div className="mcdt-note">{ translation("key_loading") }…</div></div>;
    if (!invoices.length) return <div className="mcdt-dcard flush"><div className="mcdt-note">{ translation("key_cr_no_invoices") }</div></div>;
    return (
        <div className="mcdt-dcard flush">
            <table className="mcdt-list">
                <thead><tr>{ COLUMNS.map((k) => <th key={ k }>{ headingCase(translation(k)) }</th>) }</tr></thead>
                <tbody>
                    { invoices.map((inv) => {
                        /* the row carries the label as `invoice_status` beside the numeric `status` (Priyanka test run 23 Oct #24) */
                        const status = String(inv.invoice_status || inv.status_name || inv.invoice_status_name || EM_DASH);
                        const paid = /paid/i.test(status) && !/unpaid|pending/i.test(status);
                        const staff = inv.staff_name || inv.cs_name;
                        return (
                            <tr key={ inv.id || inv.invoice_number }>
                                <td><div className="mcdt-invtype">{ inv.invoice_type_name || inv.invoice_type || translation("key_invoice") }</div><div className="mono sub">{ inv.invoice_number || EM_DASH }</div></td>
                                <td><span className={ `mcdt-tok inline ${ paid ? CD_TONE.GREEN : CD_TONE.GRAY }` }>● { status }</span></td>
                                <td className="mono">{ dateOrDash(inv.invoices_date || inv.invoice_date) }</td>
                                <td className="mono">{ money(inv.final_amount ?? inv.total_amount) }</td>
                                <td className="mono">{ money(inv.paid_amount) }</td>
                                <td className="mono">{ money(balanceDueOf(inv)) }</td>
                                <td>{ staff ? <span className="mcdt-owner"><span className="mcdt-av sm cs">{ initialsOf(staff) }</span>{ staff }</span> : EM_DASH }</td>
                            </tr>
                        );
                    }) }
                </tbody>
            </table>
        </div>
    );
};

InvoiceTab.propTypes = { row: PropTypes.object.isRequired };

export default React.memo(InvoiceTab);
