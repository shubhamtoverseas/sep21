import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import Btn from "../../../../../components/ui/Btn";
import WgdIcon from "../../../WorkerPage/dashboard/WgdIcon";
import PaginationBar from "../../../../../components/Layout/pagination/PaginationBar";
import translation from "../../../../../utils/translation";
import joStageLabel from "../joStageLabel";
import { hasActiveTextSelection, isRowControlTarget, listingTableWidth, listingTrackStyle } from "../../../../../services/commonService";
import "../../../../../components/ui/listing-tracks.css";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import empStyles from "../../../Employer/newui/EmployerDashboard.module.css";
import styles from "./JobOfferDashboard.module.css";
import { JO_DASH_COPY, JO_DASH_STAGE_CELLS, JO_STAGE } from "../../jobOfferConstants";
import { sortNextActionLabel } from "./jobOfferDashboardConfig";

const SKELETON_ROWS = 6;
const sortIconName = (active, order) => (!active ? 'sort' : order === 'DESC' ? 'sort_desc' : 'sort_asc');
const ariaSort = (active, order) => (!active ? 'none' : order === 'DESC' ? 'descending' : 'ascending');

/* the menu portals to body and sits fixed under its button — the table's scroll container would clip it otherwise */
const CsHeaderFilter = ({ options, value, onChange }) => {
    const [anchor, setAnchor] = useState(null);
    const wrapRef = useRef(null);
    const menuRef = useRef(null);
    const buttonRef = useRef(null);
    const open = anchor !== null;
    /* open → first item takes focus; Escape closes and restores focus to the caret (DASH §9 menu pattern) */
    useEffect(() => { if (open) menuRef.current?.querySelector('button')?.focus(); }, [open]);
    const onMenuKey = (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault(); event.stopPropagation();
        setAnchor(null);
        buttonRef.current?.focus();
    };
    useEffect(() => {
        if (!open) return undefined;
        const onDown = (event) => {
            const target = event.target;
            if (!(target instanceof Node)) return;
            if (!wrapRef.current?.contains(target) && !menuRef.current?.contains(target)) setAnchor(null);
        };
        const close = () => setAnchor(null);
        document.addEventListener('mousedown', onDown);
        window.addEventListener('resize', close);
        document.addEventListener('scroll', close, true);
        return () => { document.removeEventListener('mousedown', onDown); window.removeEventListener('resize', close); document.removeEventListener('scroll', close, true); };
    }, [open]);
    const toggleOpen = (event) => {
        if (open) { setAnchor(null); return; }
        const rect = event.currentTarget.getBoundingClientRect();
        setAnchor({ '--jo-menu-top': `${ Math.round(rect.bottom + 5) }px`, '--jo-menu-right': `${ Math.round(window.innerWidth - rect.right) }px` });
    };
    const selected = (value || []).map(String);
    const toggle = (id) => onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]);
    return (
        <span ref={ wrapRef } className={ styles.thFilterWrap }>
            <button ref={ buttonRef } type="button" className={ `${ styles.thFilter }${ selected.length ? ` ${ styles.thFilterOn }` : '' }` } aria-haspopup="true" aria-expanded={ open } aria-label={ JO_DASH_COPY.csOwnerFilter } title={ JO_DASH_COPY.csOwnerFilter } onClick={ toggleOpen }>
                <Icon name="chev_down" size={ 10 } strokeWidth={ 2 } />
                { selected.length > 0 && <i>{ selected.length }</i> }
            </button>
            { open && createPortal(
                <div ref={ menuRef } className={ styles.menu } style={ anchor } role="group" aria-label={ JO_DASH_COPY.csOwner } onKeyDown={ onMenuKey }>
                    { options.map((option) => {
                        const on = selected.includes(String(option.value));
                        return (
                            <button key={ option.value } type="button" className={ styles.menuItem } aria-pressed={ on } onClick={ () => toggle(String(option.value)) }>
                                <span className={ `${ styles.cb }${ on ? ` ${ styles.cbOn }` : '' }` }>{ on && <Icon name="check" size={ 10 } strokeWidth={ 2.6 } /> }</span>
                                <span>{ option.label }</span>
                            </button>
                        );
                    }) }
                    <div className={ styles.menuFoot }><button type="button" onClick={ () => { onChange([]); setAnchor(null); } }>{ JO_DASH_COPY.clearCs }</button></div>
                </div>,
                document.body
            ) }
        </span>
    );
};
CsHeaderFilter.propTypes = { options: PropTypes.array.isRequired, value: PropTypes.array, onChange: PropTypes.func.isRequired };

const HeaderCell = ({ column, sortBy, sortOrder, onSort, csFilter }) => {
    const active = Boolean(column.sortKey) && column.sortKey === sortBy;
    const style = listingTrackStyle(column);
    const className = column.sticky ? `${ listStyles.stickyCol } ${ empStyles.stickyName }` : '';
    if (column.headerFilter === 'cs' && csFilter) {
        return (
            <th scope="col" style={ style } className={ className }>
                <span className={ styles.thwrap }>{ column.label }<CsHeaderFilter { ...csFilter } /></span>
            </th>
        );
    }
    if (!column.sortKey) return <th scope="col" style={ style } className={ className }>{ column.label }</th>;
    const name = sortNextActionLabel(column.label, active, sortOrder);
    return (
        <th scope="col" style={ style } className={ className } aria-sort={ ariaSort(active, sortOrder) }>
            <button type="button" className={ `${ empStyles.thSortBtn } ${ active ? empStyles.thSortActive : '' }` } onClick={ () => onSort(column.sortKey) } title={ name } aria-label={ name }>
                <span>{ column.label }</span>
                <Icon name={ sortIconName(active, sortOrder) } size={ 11 } strokeWidth={ 1.8 } />
            </button>
        </th>
    );
};
HeaderCell.propTypes = { column: PropTypes.object.isRequired, sortBy: PropTypes.string, sortOrder: PropTypes.string, onSort: PropTypes.func.isRequired, csFilter: PropTypes.object };

const Legend = () => (
    <span className={ styles.legend } aria-label={ JO_DASH_COPY.legend }>
        <span className={ styles.legendCap }>{ JO_DASH_COPY.legend }</span>
        { JO_DASH_STAGE_CELLS.map((s) => (
            <span key={ s.id } className={ styles.legendItem }>
                { /* prototype legend swatches are 10px/1.9 (the 9px treatment is the stage CELLS', DASH §8.4) */ }
                <span className={ `${ styles.sw } ${ styles[`sw_${ JO_STAGE[s.id].className }`] }` }><WgdIcon name={ s.icon } size={ 10 } strokeWidth={ 1.9 } /></span>
                { joStageLabel(s.id) }
            </span>
        )) }
    </span>
);

const JobOfferDashboardTable = ({ columns, rows, isLoading, error, sortBy, sortOrder, pageInfo, csFilter, onSort, onRowClick, rowOpenLabel, onPrev, onNext, onRetry }) => {
    const showSkeleton = isLoading && rows.length === 0;
    const showError = !isLoading && Boolean(error) && rows.length === 0;
    const showEmpty = !isLoading && !error && rows.length === 0;

    const handleRowClick = useCallback((event, row) => {
        if (isRowControlTarget(event.target) || hasActiveTextSelection(event.currentTarget)) return;
        onRowClick(row);
    }, [onRowClick]);
    const handleRowKey = useCallback((event, row) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onRowClick(row); }
    }, [onRowClick]);

    const trackedWidth = useMemo(() => listingTableWidth(columns), [columns]);
    const tableStyle = trackedWidth ? { minWidth: trackedWidth } : undefined;
    /* U-0254: a capped (Restricted) population shows the one specified message and no count — nothing may hint at the hidden volume */
    const countText = pageInfo.capped ? null : (pageInfo.total
        ? `${ pageInfo.from }–${ pageInfo.to } ${ translation('key_of') } ${ pageInfo.total } ${ pageInfo.total === 1 ? JO_DASH_COPY.jobOffer : JO_DASH_COPY.jobOffers }`
        : `0 ${ JO_DASH_COPY.jobOffers }`);

    return (
        <div className={ `${ listStyles.tableCard } ${ empStyles.card10 }` }>
            <div className={ empStyles.tableScroll } aria-busy={ isLoading }>
                <table className={ `${ empStyles.table } ${ trackedWidth ? 'mc-tracks' : '' } ${ isLoading && rows.length ? empStyles.tableRefreshing : '' }` } style={ tableStyle }>
                    <thead>
                        <tr>{ columns.map((column) => <HeaderCell key={ column.key } column={ column } sortBy={ sortBy } sortOrder={ sortOrder } onSort={ onSort } csFilter={ csFilter } />) }</tr>
                    </thead>
                    <tbody>
                        { showSkeleton && Array.from({ length: SKELETON_ROWS }, (_, i) => (
                            <tr key={ `sk-${ i }` } className={ empStyles.skeletonRow } aria-hidden="true">
                                { columns.map((column) => <td key={ column.key } className={ column.sticky ? `${ listStyles.stickyCol } ${ empStyles.stickyName }` : '' }><span className={ empStyles.skeletonBar } /></td>) }
                            </tr>
                        )) }
                        { showError && (
                            <tr><td colSpan={ columns.length } className={ `${ listStyles.emptyStateCell } ${ empStyles.stateCell }` }>
                                <div className={ empStyles.stateBody }>
                                    <span>{ translation('key_couldnt_load_this_view') }</span>
                                    <Btn variant="secondary" onClick={ onRetry }><Icon name="refresh" size={ 13 } /> { translation('key_retry') }</Btn>
                                </div>
                            </td></tr>
                        ) }
                        { showEmpty && (
                            /* prototype .empty: a 22px magnifier above the text, 200px tall, --text-4 */
                            <tr><td colSpan={ columns.length } className={ `${ listStyles.emptyStateCell } ${ empStyles.stateCell } ${ styles.emptyCell }` }>
                                <span className={ styles.emptyWrap }><Icon name="search" size={ 22 } strokeWidth={ 1.6 } aria-hidden="true" />{ JO_DASH_COPY.empty }</span>
                            </td></tr>
                        ) }
                        { rows.map((row) => (
                            <tr key={ row.id } className={ empStyles.row } data-row-open={ row.id } tabIndex={ 0 } aria-label={ rowOpenLabel(row) } onClick={ (event) => handleRowClick(event, row) } onKeyDown={ (event) => handleRowKey(event, row) }>
                                { columns.map((column) => (
                                    <td key={ column.key } style={ listingTrackStyle(column) } className={ column.sticky ? `${ listStyles.stickyCol } ${ empStyles.stickyName }` : '' }>{ column.render(row) }</td>
                                )) }
                            </tr>
                        )) }
                    </tbody>
                </table>
            </div>
            { /* prototype .tfoot: three siblings spread — Legend | count | pager (the count sits between, not with the pager) */ }
            <div className={ `${ listStyles.tableFoot } ${ styles.foot }` }>
                <Legend />
                { countText && <span className={ empStyles.footCount }>{ countText }</span> }
                { pageInfo.capped && <span className={ styles.capNote } role="status">{ JO_DASH_COPY.tooManyResults }</span> }
                <PaginationBar
                    entity={ { total: pageInfo.total, current_page: pageInfo.currentPage, last_page: pageInfo.lastPage, per_page: pageInfo.limit } }
                    handlePrevClick={ onPrev }
                    handleNextClick={ onNext }
                    handlePerPageChange={ () => {} }
                    hidePerPage
                    status={ isLoading ? 'loading' : 'idle' }
                />
            </div>
        </div>
    );
};

JobOfferDashboardTable.propTypes = {
    columns: PropTypes.arrayOf(PropTypes.object).isRequired,
    rows: PropTypes.arrayOf(PropTypes.object).isRequired,
    isLoading: PropTypes.bool,
    error: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
    sortBy: PropTypes.string,
    sortOrder: PropTypes.string,
    pageInfo: PropTypes.shape({ from: PropTypes.number, to: PropTypes.number, total: PropTypes.number, currentPage: PropTypes.number, lastPage: PropTypes.number, limit: PropTypes.number, capped: PropTypes.bool }).isRequired,
    csFilter: PropTypes.shape({ options: PropTypes.array, value: PropTypes.array, onChange: PropTypes.func }),
    onSort: PropTypes.func.isRequired,
    onRowClick: PropTypes.func.isRequired,
    rowOpenLabel: PropTypes.func.isRequired,
    onPrev: PropTypes.func.isRequired,
    onNext: PropTypes.func.isRequired,
    onRetry: PropTypes.func.isRequired,
};

export default React.memo(JobOfferDashboardTable);
