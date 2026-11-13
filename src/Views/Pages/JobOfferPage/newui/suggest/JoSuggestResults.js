import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import Btn from "../../../../../components/ui/Btn";
import CustomSpinner from "../../../../../components/ReusableComponents/CustomSpinner";
import translation from "../../../../../utils/translation";
import { JO_SUGGEST_COPY, JO_SUGGEST_MODE } from "../../jobOfferConstants";
import { daysRemaining, earliestStartOf, formatDate } from "./jobOfferSuggestConfig";

const EM = '—';
const Cell = ({ value }) => (value == null || value === '' ? <span className="mc-unavailable">{ EM }</span> : value);
Cell.propTypes = { value: PropTypes.node };

const CodeCell = ({ row, canOpenWorker, onOpenWorker }) => {
    const code = row?.reference_id;
    if (!code) return <Cell value={ null } />;
    if (canOpenWorker) return <button type="button" className="code mc-link-code" aria-label={ `${ JO_SUGGEST_COPY.openWorker } ${ row.name } (${ code })` } onClick={ () => onOpenWorker(row) }>{ code }</button>;
    return <span className="code neutral mc-code-text">{ code }</span>;
};
CodeCell.propTypes = { row: PropTypes.object.isRequired, canOpenWorker: PropTypes.bool, onOpenWorker: PropTypes.func.isRequired };

const Pager = ({ page, totalPages, onPage }) => (totalPages > 1 ? (
    <span className="pager">
        <button type="button" className="linkbtn" disabled={ page <= 1 } onClick={ () => onPage(page - 1) }>{ JO_SUGGEST_COPY.previous }</button>
        <span>{ JO_SUGGEST_COPY.page } { page } { JO_SUGGEST_COPY.of } { totalPages }</span>
        <button type="button" className="linkbtn" disabled={ page >= totalPages } onClick={ () => onPage(page + 1) }>{ JO_SUGGEST_COPY.next }</button>
    </span>
) : null);
Pager.propTypes = { page: PropTypes.number.isRequired, totalPages: PropTypes.number.isRequired, onPage: PropTypes.func.isRequired };

/* per-pair outcome of the last bulk send (workbook row 23 / D-17): every skipped or failed worker with its reason */
const BatchPanel = ({ batch, onDismiss }) => (
    <div className="mc-sw-batch" role="status">
        <div className="hd">
            <b>{ JO_SUGGEST_COPY.batchTitle }</b>
            <span className="n">{ batch.sent } { JO_SUGGEST_COPY.batchSent } · { batch.rows.filter((r) => r.kind === 'skipped').length } { JO_SUGGEST_COPY.batchSkipped } · { batch.rows.filter((r) => r.kind === 'failed').length } { JO_SUGGEST_COPY.batchFailed }</span>
            <span className="sp" />
            <button type="button" className="linkbtn" onClick={ onDismiss }>{ JO_SUGGEST_COPY.dismiss }</button>
        </div>
        <ul>
            { batch.rows.map((r) => (
                <li key={ r.id }>
                    <span className="mc-person-name">{ r.name }</span>
                    { r.code && <span className="mc-code-text"> { r.code }</span> }
                    <span className={ `k ${ r.kind }` }>{ r.kind === 'skipped' ? JO_SUGGEST_COPY.batchSkipped : JO_SUGGEST_COPY.batchFailed }</span>
                    <span className="why">{ (r.reason && JO_SUGGEST_COPY.batchReason[r.reason]) || r.reason || EM }</span>
                </li>
            )) }
        </ul>
        <p className="note">{ JO_SUGGEST_COPY.batchNote }</p>
    </div>
);
BatchPanel.propTypes = { batch: PropTypes.object.isRequired, onDismiss: PropTypes.func.isRequired };

const JoSuggestResults = ({ mode, results, page, onPage, selected, onToggle, profileId, onProfile, canOpenWorker, onOpenWorker, canSend, sending, onSend, onRetry, batch, onDismissBatch }) => {
    const isLocal = mode === JO_SUGGEST_MODE.LOCAL;
    const { rows, loading, error, total } = results;
    const selectedCount = Object.keys(selected).length;

    let body;
    if (loading && !rows.length) body = <div className="mc-sw-empty"><CustomSpinner /></div>;
    else if (error) body = <div className="mc-sw-empty">{ translation('key_couldnt_load_this_view') } <button type="button" className="linkbtn" onClick={ onRetry }>{ translation('key_retry') }</button></div>;
    else if (!rows.length) body = <div className="mc-sw-empty">{ JO_SUGGEST_COPY.noResults }</div>;
    else {
        body = (
            <table className="mc-sw-table selectable" aria-busy={ loading }>
                <thead>
                    <tr>
                        <th className="sel"><span className="mc-sr-only">{ JO_SUGGEST_COPY.select }</span></th>
                        <th className="c-name">{ JO_SUGGEST_COPY.workerName }</th>
                        <th className="c-ref">{ JO_SUGGEST_COPY.workerCode }</th>
                        { isLocal ? (
                            <>
                                <th className="c-status">{ JO_SUGGEST_COPY.contractStatus }</th>
                                <th className="c-amount">{ JO_SUGGEST_COPY.daysRemaining }</th>
                            </>
                        ) : <th className="oe">{ JO_SUGGEST_COPY.overseasExperience }</th> }
                        <th className="c-date">{ JO_SUGGEST_COPY.earliestStart }</th>
                    </tr>
                </thead>
                <tbody>
                    { rows.map((row) => {
                        const on = Boolean(selected[row.id]);
                        const cur = String(profileId) === String(row.id);
                        /* D-15 / U-0239: `days_remaining` as delivered (an ended contract — zero or negative — has no value, em dash), else derived */
                        const rawDays = row?.days_remaining != null ? Number(row.days_remaining) : daysRemaining(row?.contract_end_date);
                        const days = Number.isFinite(rawDays) && rawDays > 0 ? `${ rawDays } ${ translation(rawDays === 1 ? 'key_day' : 'key_days') }` : null;
                        const overseas = row?.overseas_experience_display || row?.overseas_experience_info || null;
                        return (
                            <tr key={ row.id } aria-selected={ on } className={ cur ? 'cur' : undefined } aria-current={ cur ? 'true' : undefined } onClick={ () => onProfile(row.id) }>
                                <td className="sel" onClick={ (e) => e.stopPropagation() }>
                                    <input type="checkbox" checked={ on } aria-label={ `${ JO_SUGGEST_COPY.select } ${ row.name }` } onChange={ () => onToggle(String(row.id)) } />
                                </td>
                                <td><button type="button" className="nm mc-person-name" onClick={ (e) => { e.stopPropagation(); onProfile(row.id); } }>{ row.name }</button></td>
                                <td className="cd" onClick={ (e) => e.stopPropagation() }><CodeCell row={ row } canOpenWorker={ canOpenWorker } onOpenWorker={ onOpenWorker } /></td>
                                { isLocal ? (
                                    <>
                                        <td><Cell value={ row?.contract_status_info?.admin_panel_status } /></td>
                                        <td><Cell value={ days } /></td>
                                    </>
                                ) : <td className="oe"><span title={ typeof overseas === 'string' ? overseas : undefined }><Cell value={ typeof overseas === 'string' ? overseas : null } /></span></td> }
                                <td><Cell value={ formatDate(earliestStartOf(row)) } /></td>
                            </tr>
                        );
                    }) }
                </tbody>
            </table>
        );
    }

    return (
        <div className="mc-sw-card results">
            { batch && <BatchPanel batch={ batch } onDismiss={ onDismissBatch } /> }
            <div className="mc-sw-scroll">{ body }</div>
            <div className="mc-sw-foot">
                <span className="mc-sw-selcount"><b>{ total }</b> { JO_SUGGEST_COPY.workers } · <b>{ selectedCount }</b> { JO_SUGGEST_COPY.selected }</span>
                <Pager page={ page } totalPages={ results.totalPages } onPage={ onPage } />
                <span className="sp" />
                <Btn variant="primary" disabled={ !canSend || !selectedCount || sending } aria-disabled={ !canSend || !selectedCount || sending } onClick={ onSend }>
                    <Icon name="plus" size={ 13 } /> { JO_SUGGEST_COPY.suggestWorkers }
                </Btn>
            </div>
        </div>
    );
};

JoSuggestResults.propTypes = {
    mode: PropTypes.string.isRequired,
    results: PropTypes.object.isRequired,
    page: PropTypes.number.isRequired,
    onPage: PropTypes.func.isRequired,
    selected: PropTypes.object.isRequired,
    onToggle: PropTypes.func.isRequired,
    profileId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onProfile: PropTypes.func.isRequired,
    canOpenWorker: PropTypes.bool,
    onOpenWorker: PropTypes.func.isRequired,
    canSend: PropTypes.bool,
    sending: PropTypes.bool,
    onSend: PropTypes.func.isRequired,
    onRetry: PropTypes.func.isRequired,
    batch: PropTypes.object,
    onDismissBatch: PropTypes.func.isRequired,
};

export default React.memo(JoSuggestResults);
