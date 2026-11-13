import React from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import CustomSpinner from "../../../../../components/ReusableComponents/CustomSpinner";
import translation from "../../../../../utils/translation";
import { JO_SUGGEST_COPY } from "../../jobOfferConstants";
import { suggestedStatusOf, suggestedToneOf } from "./jobOfferSuggestConfig";

const EM = '—';

const StatusCell = ({ row }) => {
    const text = suggestedStatusOf(row);
    if (!text) return <span className="mc-unavailable">{ EM }</span>;
    const tone = suggestedToneOf(row);
    if (tone === 'applied' || tone === 'matched') return <span className={ `mc-sw-stage ${ tone }` }>{ text }</span>;
    return <span className={ `mc-sw-plain${ tone === 'neg' ? ' neg' : '' }` }>{ text }</span>;
};
StatusCell.propTypes = { row: PropTypes.object.isRequired };

/* U-0150 (21 Oct): Suggested is read-only outcome tracking — no Cancel Suggestion action (the catalogue has no grant for it) */
const JoSuggestSuggested = ({ suggested, page, onPage, onBack, canOpenWorker, onOpenWorker }) => {
    const { rows, loading, error, total, totalPages } = suggested;
    let body;
    if (loading && !rows.length) body = <div className="mc-sw-empty"><CustomSpinner /></div>;
    else if (error) body = <div className="mc-sw-empty">{ translation('key_couldnt_load_this_view') }</div>;
    else if (!rows.length) body = <div className="mc-sw-empty">{ JO_SUGGEST_COPY.noSuggested }</div>;
    else {
        body = (
            <table className="mc-sw-table" aria-busy={ loading }>
                <thead>
                    <tr>
                        <th className="c-name">{ JO_SUGGEST_COPY.workerName }</th>
                        <th className="c-ref">{ JO_SUGGEST_COPY.workerCode }</th>
                        <th className="c-status">{ JO_SUGGEST_COPY.type }</th>
                        <th className="c-status-max">{ JO_SUGGEST_COPY.status }</th>
                    </tr>
                </thead>
                <tbody>
                    { rows.map((row) => (
                        <tr key={ row.id }>
                            <td><span className="nm plain mc-person-name">{ row.name }</span></td>
                            <td className="cd">
                                { row.reference_id
                                    ? (canOpenWorker
                                        ? <button type="button" className="code mc-link-code" aria-label={ `${ JO_SUGGEST_COPY.openWorker } ${ row.name } (${ row.reference_id })` } onClick={ () => onOpenWorker(row) }>{ row.reference_id }</button>
                                        : <span className="code neutral mc-code-text">{ row.reference_id }</span>)
                                    : <span className="mc-unavailable">{ EM }</span> }
                            </td>
                            <td>{ row.type_display || <span className="mc-unavailable">{ EM }</span> }</td>
                            <td><StatusCell row={ row } /></td>
                        </tr>
                    )) }
                </tbody>
            </table>
        );
    }

    return (
        <>
            <div className="mc-sw-bar dest" role="group" aria-label={ JO_SUGGEST_COPY.suggested }>
                <button type="button" className="mc-sw-btn" data-sw-view="search" onClick={ onBack }><span className="ic"><Icon name="chev_left" size={ 13 } /></span>{ JO_SUGGEST_COPY.back }</button>
                <h3 className="mc-sw-desttitle">{ JO_SUGGEST_COPY.suggested }</h3>
                <span className="mc-sw-destn">{ total }</span>
                { totalPages > 1 && (
                    <span className="pager">
                        <button type="button" className="linkbtn" disabled={ page <= 1 } onClick={ () => onPage(page - 1) }>{ JO_SUGGEST_COPY.previous }</button>
                        <span>{ JO_SUGGEST_COPY.page } { page } { JO_SUGGEST_COPY.of } { totalPages }</span>
                        <button type="button" className="linkbtn" disabled={ page >= totalPages } onClick={ () => onPage(page + 1) }>{ JO_SUGGEST_COPY.next }</button>
                    </span>
                ) }
            </div>
            <div className="mc-sw-grid one">
                <div className="mc-sw-card results"><div className="mc-sw-scroll">{ body }</div></div>
            </div>
        </>
    );
};

JoSuggestSuggested.propTypes = {
    suggested: PropTypes.object.isRequired,
    page: PropTypes.number.isRequired,
    onPage: PropTypes.func.isRequired,
    onBack: PropTypes.func.isRequired,
    canOpenWorker: PropTypes.bool,
    onOpenWorker: PropTypes.func.isRequired,
};

export default React.memo(JoSuggestSuggested);
