import React from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getInitials } from "../../utils/utils";

/* The detail header's context cards, the same on every invoice type (reference HeaderContext): Employer (name · 中文 over
   its code), Worker (name over its code), Contract (its code), Branch, Handling Staff (avatar + name as stored) and Dates
   (Created / Updated, DD/MM/YYYY; an invoice with a frozen pricing record adds Confirmed and Collected, INV-C5). Names are plain text; a code opens its record only when the Invoice API says this user
   may open it (links.*.can_open — a worker needs a profile, so an INS-coded standalone-insurance worker never opens;
   sheet row 8), otherwise it is neutral code text. The contract code (its Contract Number) opens Contract Details only
   when this user may open that contract (links.contract.can_open, with its id; SR-05). Each screen still decides which
   of the party cards it shows. */

const formatDateOnly = (date) => (date ? dayjs(date).format('DD/MM/YYYY') : '—');

const CodeRef = ({ code, canOpen, title, onOpen }) => (canOpen
    ? <span className="code-link" role="link" tabIndex={ 0 } title={ title } onClick={ onOpen }
        onKeyDown={ (e) => { if (e.key === 'Enter') onOpen(); } }>{ code }</span>
    : <span className="code-text">{ code }</span>);

CodeRef.propTypes = {
    code: PropTypes.node.isRequired,
    canOpen: PropTypes.bool,
    title: PropTypes.string,
    onOpen: PropTypes.func,
};

const InvoiceHeaderContext = ({ invoice, showEmployer = Boolean(invoice?.employer_name), showWorker = Boolean(invoice?.worker_name),
    showContract = Boolean(invoice?.contract_number) }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const employerCode = invoice?.links?.employer?.code ?? invoice?.employer_reference_id ?? null;
    const workerCode = invoice?.worker_reference_id || invoice?.reference_id || null;
    const contractCode = invoice?.links?.contract?.code ?? invoice?.contract_number;
    const contractOpens = Boolean(invoice?.links?.contract?.can_open) && Number(invoice?.links?.contract?.id) > 0;
    return (
        <div className="header-context">
            { showEmployer && (
                <div className="context-card">
                    <div className="k">{ t('key_employer') || 'Employer' }</div>
                    <div className="v">
                        <span className="id2">
                            <span className="employer-name-line">
                                { invoice?.employer_name }
                                { invoice?.chinese_name && <span className="zh"> · { invoice.chinese_name }</span> }
                            </span>
                            { employerCode && (
                                <CodeRef code={ employerCode } canOpen={ Boolean(invoice?.links?.employer?.can_open) } title={ `${ t('key_employer') } — ${ employerCode }` }
                                    onOpen={ () => navigate(`/employers/details/${ invoice.employer_id }`) } />
                            ) }
                        </span>
                    </div>
                </div>
            ) }
            { showWorker && (
                <div className="context-card">
                    <div className="k">{ t('key_worker') || 'Worker' }</div>
                    <div className="v worker-id">
                        <span className="worker-name-line">{ invoice?.worker_name }</span>
                        { workerCode && (
                            <CodeRef code={ workerCode } canOpen={ Boolean(invoice?.links?.worker?.can_open) } title={ `${ t('key_worker') } — ${ workerCode }` }
                                onOpen={ () => navigate(`/workers/details/${ invoice.worker_id }`) } />
                        ) }
                    </div>
                </div>
            ) }
            { showContract && (
                <div className="context-card">
                    <div className="k">{ t('key_contract') || 'Contract' }</div>
                    <div className="v">
                        <CodeRef code={ contractCode } canOpen={ contractOpens } title={ `${ t('key_contract') } — ${ contractCode }` }
                            onOpen={ () => navigate(`/contracts/details/${ invoice.links.contract.id }`) } />
                    </div>
                </div>
            ) }
            <div className="context-card">
                <div className="k">{ t('key_branch') || 'Branch' }</div>
                <div className="v">{ invoice?.branch_name }</div>
            </div>
            { invoice?.staff_name && (
                <div className="context-card">
                    <div className="k">{ t('key_handling_staff') || 'Handling Staff' }</div>
                    <div className="v with-avatar"><span className="avatar">{ getInitials(invoice.staff_name) }</span>{ invoice.staff_name }</div>
                </div>
            ) }
            <div className="context-card">
                <div className="k">{ t('key_dates') || 'Dates' }</div>
                <div className="v dates">
                    { t('key_created') || 'Created' } <span className="date-v">{ formatDateOnly(invoice?.created_at) }</span><br />
                    { t('key_updated') || 'Updated' } <span className="date-v">{ formatDateOnly(invoice?.updated_at) }</span>
                    { invoice?.pricing_record && (
                        <>
                            <br />{ t('key_confirmed') } <span className="date-v" data-confirmed>{ formatDateOnly(invoice.pricing_record.confirmed_at) }</span>
                            <br />{ t('key_collected') } <span className="date-v" data-collected>{ formatDateOnly(invoice.pricing_record.collected_at) }</span>
                        </>
                    ) }
                </div>
            </div>
        </div>
    );
};

InvoiceHeaderContext.propTypes = {
    /* the loaded invoice detail (GET /contract/invoices/detail), with its links */
    invoice: PropTypes.object,
    showEmployer: PropTypes.bool,
    showWorker: PropTypes.bool,
    showContract: PropTypes.bool,
};

export default InvoiceHeaderContext;
