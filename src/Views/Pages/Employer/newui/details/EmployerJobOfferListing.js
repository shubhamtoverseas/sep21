import React, { useMemo } from "react";
import PropTypes from "prop-types";
import NewUiSelect from "../../../../../components/newui-select/NewUiSelect";
import translation from "../../../../../utils/translation";
import { changeDynamicDateFormate, getInitials } from "../../../../../utils/utils";
import { getJoApplyRate, getJoStageCapsules } from "./employerDetailsConfig";
import JoStatusTag from "../../../JobOfferPage/newui/JoStatusTag";
import { JO_STAGE_ICON_PATHS, JO_LISTING_COLUMN_KEYS } from "../employerNewUiConstants";

const searchIcon = (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#6e757f" strokeWidth="1.6" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5 14 14" />
    </svg>
);

const Dash = () => <span className="mc-listing-missing">—</span>;

const MonoCell = ({ value }) => (value === null || value === undefined || value === '' ? <Dash /> : <span className="emd-mono">{ value }</span>);
MonoCell.propTypes = { value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) };

const ApplyRateCell = ({ row }) => {
    const rate = getJoApplyRate(row);
    return rate === null ? <Dash /> : <span className="emd-mono">{ rate }%</span>;
};
ApplyRateCell.propTypes = { row: PropTypes.object };

const StageIcon = ({ stage }) => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        { (JO_STAGE_ICON_PATHS[stage] || []).map(([tag, attrs], index) => React.createElement(tag, { key: index, ...attrs })) }
    </svg>
);
StageIcon.propTypes = { stage: PropTypes.string.isRequired };

const StageCell = ({ row }) => {
    const capsules = getJoStageCapsules(row);
    if (!capsules.length) return <Dash />;
    return (
        <span className="emd-stage-row">
            { capsules.map((stage) => (
                <span key={ stage.className } className={ `emd-stage ${ stage.className }` } title={ `${ translation(stage.label) }: ${ stage.count }` }>
                    <StageIcon stage={ stage.className } />
                    <b>{ stage.count }</b>
                </span>
            )) }
        </span>
    );
};
StageCell.propTypes = { row: PropTypes.object };

const OwnerCell = ({ name }) => (name ? (
    <span className="wkd-listing-owner">
        <span className="wkd-listing-owner-av">{ getInitials(name) }</span>
        <span className="mc-listing-owner-name">{ name }</span>
    </span>
) : <Dash />);
OwnerCell.propTypes = { name: PropTypes.string };

const EmployerJobOfferListing = ({ rows, isLoading, error = false, onRetry, search, onSearchChange, statusValue, statusOptions, onStatusChange, toolbarActions, onOpenJobOffer, canOpenRow }) => {
    const labels = useMemo(() => JO_LISTING_COLUMN_KEYS.map((key) => translation(key)), []);

    return (
        <div className="mc-worker-listing-card" aria-busy={ isLoading || undefined }>
            <div className="wkd-listing-toolbar">
                <div className="wkd-listing-search">
                    { searchIcon }
                    <input
                        type="search"
                        value={ search }
                        aria-label={ translation('key_search') }
                        placeholder={ translation('key_search') }
                        onChange={ (event) => onSearchChange(event.target.value) }
                    />
                </div>
                <NewUiSelect label={ translation('key_jo_status') } value={ statusValue } options={ statusOptions } onChange={ onStatusChange } />
                { toolbarActions && <div className="emd-toolbar-actions">{ toolbarActions }</div> }
            </div>

            { /* prototype employer-details JO listing: kit card / header / rows on the shared column tokens; the scroll wrap keeps
                 the last column (CS Owner) reachable instead of clipped when the panel is narrower than the column minimums (tester 11 Sep) */ }
            <div className="mc-worker-listing-scroll">
                <div className="mc-worker-listing-header emd-grid-jo">
                    { labels.map((label) => <span key={ label } className="mc-collabel">{ label }</span>) }
                </div>

                { !error && rows.map((row) => {
                    /* U-0256 (21 Oct): without Details View the row stays listed but carries a truthful unavailable state — neutral
                       reference text plus an "Unavailable" tag — never a dead hyperlink; nothing of the record is disclosed */
                    const opens = canOpenRow ? canOpenRow(row) : true;
                    return (
                        <div
                            key={ row.id }
                            role={ opens ? 'link' : undefined }
                            tabIndex={ opens ? 0 : undefined }
                            aria-label={ row.reference_id }
                            aria-disabled={ opens ? undefined : true }
                            className={ `mc-worker-listing-row emd-grid-jo${ opens ? ' row-nav' : '' }` }
                            onClick={ opens ? () => onOpenJobOffer(row) : undefined }
                            onKeyDown={ opens ? (event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    onOpenJobOffer(row);
                                }
                            } : undefined }
                        >
                            <div>{ opens ? <span className="wkd-jo-ref">{ row.reference_id }</span> : <span className="emd-mono">{ row.reference_id }<span className="emd-row-unavailable">{ translation('key_unavailable') }</span></span> }</div>
                            <div>{ row.status ? <JoStatusTag status={ row.status } /> : <Dash /> }</div>
                            <div><MonoCell value={ row.days_open ? `${ row.days_open }d` : null } /></div>
                            <div><MonoCell value={ row.view_count } /></div>
                            <div><ApplyRateCell row={ row } /></div>
                            <div><MonoCell value={ changeDynamicDateFormate(row.start_date, 'DD/MM/YYYY') } /></div>
                            <div><StageCell row={ row } /></div>
                            <div><OwnerCell name={ row.cs_name } /></div>
                        </div>
                    );
                }) }
            </div>

            { /* audit D-03 (SR-06): a failed request is an error with Retry, never the empty copy or another record's rows */ }
            { !isLoading && error && (
                <div className="wkd-jo-empty emd-jo-error" role="alert">
                    <span>{ translation('key_couldnt_load_this_view') }</span>
                    { onRetry && <button type="button" className="g2-button" onClick={ onRetry }>{ translation('key_retry') }</button> }
                </div>
            ) }
            { !isLoading && !error && rows.length === 0 && (
                <div className="wkd-jo-empty">{ translation('key_no_job_offers_match') }</div>
            ) }
            { isLoading && rows.length === 0 && (
                <div className="wkd-jo-empty">{ translation('key_loading') }…</div>
            ) }
        </div>
    );
};

EmployerJobOfferListing.propTypes = {
    rows: PropTypes.array.isRequired,
    isLoading: PropTypes.bool,
    error: PropTypes.bool,
    onRetry: PropTypes.func,
    search: PropTypes.string.isRequired,
    onSearchChange: PropTypes.func.isRequired,
    statusValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    statusOptions: PropTypes.array.isRequired,
    onStatusChange: PropTypes.func.isRequired,
    toolbarActions: PropTypes.node,
    onOpenJobOffer: PropTypes.func.isRequired,
    /* (row) → whether the actor may open this Job Offer (U-0256) */
    canOpenRow: PropTypes.func,
};

export default React.memo(EmployerJobOfferListing);
