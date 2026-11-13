import React from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import translation from "../../../../../../utils/translation";
import "../wkd-listings.css";

dayjs.extend(customParseFormat);

export const fmtListingDate = (v) => {
    if (!v) return null;
    const d = dayjs(v, ['YYYY-MM-DD', 'DD/MM/YYYY', 'YYYY-MM-DD HH:mm:ss', 'DD MMM YY'], true);
    return d.isValid() ? d.format('DD/MM/YYYY') : v;
};

const sortArrow = (order) => (order === 'DESC'
    ? <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="#2563eb" strokeWidth="2" aria-hidden="true"><path d="M3.5 6 8 10.5 12.5 6" /></svg>
    : <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke="#2563eb" strokeWidth="2" aria-hidden="true"><path d="M3.5 10 8 5.5l4.5 4.5" /></svg>);

export const WkdDash = () => <span className="mc-listing-missing">—</span>;

const WkdListing = ({ columns, gridClass, rows, sort, order, onSort, emptyText, rowKey, onRowClick, rowAriaLabel, renderCells, footer, topBar, loading = false, error = false, onRetry, notice }) => {
    /* request states (SR-06): an error, then a first load, are shown in the card instead of a false empty state */
    if (error) {
        return (
            <div className="mc-worker-listing-body">
                { topBar }
                <div className="mc-worker-listing-card">
                    <div className="ctx-state wkd-listing-state" data-context-state="error">
                        <span className="ctx-state-icon">!</span>
                        <strong>{ translation('key_something_went_wrong') }</strong>
                        { onRetry && (
                            <button type="button" className="ctx-btn secondary" onClick={ onRetry }>{ translation('key_retry') }</button>
                        ) }
                    </div>
                </div>
            </div>
        );
    }
    if (!rows.length) {
        return (
            <div className="mc-worker-listing-body">
                { topBar }
                <div className="mc-worker-listing-card" aria-busy={ loading || undefined }>
                    { loading ? (
                        <div className="ctx-state wkd-listing-state" data-context-state="loading">
                            <span className="ctx-spinner" />
                            <strong>{ translation('key_loading') }…</strong>
                        </div>
                    ) : (
                        <>
                            { notice }
                            <div className="mc-worker-listing-empty">{ emptyText }</div>
                            { footer }
                        </>
                    ) }
                </div>
            </div>
        );
    }
    return (
        <div className="mc-worker-listing-body">
            { topBar }
            <div className="mc-worker-listing-card" aria-busy={ loading || undefined }>
                { notice }
                <div className="ct-scroll mc-worker-listing-scroll">
                    <div className="mc-worker-listing-grid">
                        <div className={ `mc-worker-listing-header ${ gridClass }` }>
                            { columns.map((c) => {
                                if (!c.sortKey) {
                                    return <span key={ c.key } className="mc-worker-listing-sort static">{ c.label }</span>;
                                }
                                const active = sort === c.sortKey;
                                return (
                                    <span
                                        key={ c.key }
                                        role="button"
                                        tabIndex={ 0 }
                                        className={ `mc-worker-listing-sort${ active ? ' on' : '' }` }
                                        aria-label={ c.label }
                                        onClick={ () => onSort(c.sortKey) }
                                        onKeyDown={ (e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                onSort(c.sortKey);
                                            }
                                        } }
                                    >
                                        { c.label }{ active && sortArrow(order) }
                                    </span>
                                );
                            }) }
                        </div>
                        { rows.map((row) => {
                            const cells = renderCells(row);
                            const rowNavProps = onRowClick ? {
                                role: 'link',
                                tabIndex: 0,
                                'aria-label': rowAriaLabel ? rowAriaLabel(row) : undefined,
                                onClick: () => onRowClick(row),
                                onKeyDown: (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onRowClick(row);
                                    }
                                },
                            } : {};
                            return (
                                <div
                                    key={ rowKey(row) }
                                    className={ `mc-worker-listing-row${ onRowClick ? ' row-nav' : '' } ${ gridClass }` }
                                    { ...rowNavProps }
                                >
                                    { cells.map((cell, i) => <div key={ columns[i].key }>{ cell }</div>) }
                                </div>
                            );
                        }) }
                    </div>
                </div>
                { footer }
            </div>
        </div>
    );
};

WkdListing.propTypes = {
    columns: PropTypes.arrayOf(PropTypes.shape({
        key: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        sortKey: PropTypes.string.isRequired,
    })).isRequired,
    gridClass: PropTypes.string.isRequired,
    rows: PropTypes.array.isRequired,
    sort: PropTypes.string,
    order: PropTypes.string,
    onSort: PropTypes.func.isRequired,
    emptyText: PropTypes.string.isRequired,
    rowKey: PropTypes.func.isRequired,
    onRowClick: PropTypes.func,
    rowAriaLabel: PropTypes.func,
    renderCells: PropTypes.func.isRequired,
    footer: PropTypes.node,
    topBar: PropTypes.node,
    loading: PropTypes.bool,
    error: PropTypes.bool,
    onRetry: PropTypes.func,
    notice: PropTypes.node,
};

export default React.memo(WkdListing);
