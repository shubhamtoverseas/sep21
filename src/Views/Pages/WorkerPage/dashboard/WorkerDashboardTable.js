import React, { useMemo } from "react";
import PropTypes from "prop-types";
import WgdIcon from "./WgdIcon";
import { hasActiveTextSelection, isRowControlTarget } from "../../../../services/commonService";
import { COLS, GROUPS, STAGE, JO_STAGES, JO_STAGE_EMPHASIS, JO_STAGE_SHORT, colTrack } from "./workerDashboardConfig";
import { RESEND_ROW_STATUS_KEY, SEND_REG_LINK_COPY } from "../workerModuleConstants";
import translation from "../../../../utils/translation";


const abbrevOwner = (full) => {
    const parts = String(full || '').trim().split(/\s+/);
    if (parts.length < 2) return full;
    return `${ parts[0] } ${ parts[parts.length - 1][0].toUpperCase() }.`;
};

const delayDays = (v) => {
    const m = String(v || '').match(/([\d.]+)\s*(h|hour|d|day|mo)?/i);
    if (!m) return -1;
    let n = parseFloat(m[1]);
    const u = (m[2] || '').toLowerCase();
    if (u.startsWith('h')) n = n / 24;
    if (u.startsWith('mo')) n = n * 30;
    return n;
};

const Dash = () => <span className="na">—</span>;

const Cell = ({ colKey, col, row, onOpenStage, onResend }) => {
    switch (col.type) {
        case 'identity':
            return (
                <span className="wid">
                    <span className="ph" data-mc-worker-glyph="person" aria-hidden="true">
                        <WgdIcon name="person" size={ 14 } strokeWidth={ 1.7 } />
                    </span>
                    <span className="nm mc-worker-name-text">{ row.name }</span>
                </span>
            );
        case 'code':
            if (!row.code) {
                /* U-0337: a Pending (Not Registered) row has no code yet — Resend sits where the code will be, only with Send Link */
                return (
                    <span className="ref na-code">
                        { translation('key_not_assigned') }
                        { onResend && row.statusKey === RESEND_ROW_STATUS_KEY && row.canResend !== false && (
                            <button type="button" className="ref-resend" data-mc-row-resend={ row.id } onClick={ (event) => { event.stopPropagation(); onResend(row); } }>{ SEND_REG_LINK_COPY.resend }</button>
                        ) }
                    </span>
                );
            }
            return <span className="ref mc-code-plain" data-mc-cell="worker-code">{ row.code }</span>;
        case 'badge':
            return (
                <span
                    className={ `stbadge ${ row.statusIntent }` }
                    data-tone={ row.statusTone }
                    data-treatment={ row.statusTreatment || undefined }
                >
                    { row.statusLabel }
                </span>
            );
        case 'mono': {
            const v = row[colKey];
            return v ? <span className="mono">{ v }</span> : <Dash />;
        }
        case 'expected': {
            const v = row[colKey];
            if (!v) return <Dash />;
            return (
                <>
                    <span className="mc-expected-cell mono" data-mc-contract-end="expected">{ v }</span>
                    <span className="mc-expected-tag">{ translation('key_wkr_expected') }</span>
                </>
            );
        }
        case 'delay': {
            const v = row.delay;
            if (!v) return <Dash />;
            const days = delayDays(v);
            const cls = days >= 7 ? ' bad' : days >= 3 ? ' warn' : '';
            return <span className={ `mono delay${ cls }` }>{ v }</span>;
        }
        case 'plain': {
            const v = row[colKey];
            if (!v) return <Dash />;
            if (col.clamp) return <span className={ `clamp${ col.lines === 2 ? ' clamp2' : '' }` } title={ v }>{ v }</span>;
            return <span className="soft">{ v }</span>;
        }
        case 'contract': {
            const v = row.contract_status;
            return v ? <span className="contract">{ v }</span> : <Dash />;
        }
        case 'jo':
            return (
                <span className="jorow">
                    { JO_STAGES.map((s) => (
                        <span key={ s.key } className={ `jo ${ s.hue }` } title={ `${ s.label }: ${ row.jo[s.key] }` }>
                            <WgdIcon name={ s.icon } size={ 11 } strokeWidth={ 1.8 } />
                            <b>{ row.jo[s.key] }</b>
                        </span>
                    )) }
                </span>
            );
        case 'stage_details': {
            const cells = JO_STAGES.filter((s) => row.jo?.[s.key]);
            if (!cells.length) return <span className="soft">—</span>;
            return (
                <span className="stagecells">
                    { cells.map((s) => (
                        <span key={ s.key } className={ JO_STAGE_EMPHASIS.includes(s.key) ? 'hi' : undefined } title={ JO_STAGE_SHORT[s.key] }>
                            <WgdIcon name={ s.icon } size={ 9 } strokeWidth={ 1.8 } />
                            { row.jo[s.key] }
                        </span>
                    )) }
                </span>
            );
        }
        case 'owner': {
            const v = row[col.role];
            if (!v) return <Dash />;
            return (
                <span className="owner">
                    <span className={ `rav r-${ col.role }` }>{ v.split(' ').map((w) => w[0]).join('').slice(0, 2) }</span>
                    <span className="onm" title={ v } data-mc-owner-abbrev="true">{ abbrevOwner(v) }</span>
                </span>
            );
        }
        case 'stage': {
            const v = row.docs?.[colKey] || '';
            if (!v) return <Dash />;
            if (v === 'ok') return <span className="ist ok" title={ translation('key_verified') }><WgdIcon name="check" size={ 13 } strokeWidth={ 2.2 } /></span>;
            if (v === 'miss') return <span className="ist miss" title={ translation('key_wkr_missing') }><WgdIcon name="x" size={ 13 } strokeWidth={ 2.2 } /></span>;
            const st = STAGE[v];
            if (!st) return <Dash />;
            return (
                <button
                    type="button"
                    className={ `stage ${ st.intent }` }
                    title={ `Open ${ row.name } → ${ col.label } (${ st.label })` }
                    onClick={ () => onOpenStage(row, col.action) }
                >
                    { st.label }
                </button>
            );
        }
        default:
            return <Dash />;
    }
};

Cell.propTypes = {
    colKey: PropTypes.string.isRequired,
    col: PropTypes.object.isRequired,
    row: PropTypes.object.isRequired,
    onOpenStage: PropTypes.func.isRequired,
    /* present only while the viewer holds Send Link (U-0337) */
    onResend: PropTypes.func,
};

const CheckCell = ({ on, onToggle, label }) => (
    <span
        className={ `cb${ on ? ' on' : '' }` }
        role="checkbox"
        aria-checked={ on }
        aria-label={ label }
        tabIndex={ 0 }
        onClick={ (e) => { e.stopPropagation(); onToggle(); } }
        onKeyDown={ (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggle(); } } }
    >
        <WgdIcon name="check" size={ 10 } strokeWidth={ 2.6 } />
    </span>
);

CheckCell.propTypes = {
    on: PropTypes.bool.isRequired,
    onToggle: PropTypes.func.isRequired,
    label: PropTypes.string,
};

const widthStyle = (c) => {
    const w = colTrack(c);
    return { width: w, minWidth: w };
};

const ariaSortFor = (on, dir) => (on ? (dir === 'desc' ? 'descending' : 'ascending') : 'none');
const nextSortLabel = (label, on, dir) => {
    if (!on) return `${ translation('key_sort_by') } ${ label }, ${ translation('key_cd_ascending') }`;
    if (dir === 'asc') return `${ translation('key_sort_by') } ${ label }, ${ translation('key_cd_descending') }`;
    return `${ translation('key_cd_clear_sorting_by') } ${ label }`;
};

const HeaderCell = ({ col, sort, ownerActive, ownerFilterHidden = false, onSort, onOwnerOpen, extraClass = '', rowSpan }) => {
    const center = col.type === 'stage';
    const sorted = Boolean(col.sort && sort.key === col.sort);
    const className = [
        center ? 'ctr' : '',
        col.sticky ? 'sticky wname' : '',
        col.sort ? 'sortable' : '',
        sorted ? 'sorted' : '',
        extraClass,
    ].filter(Boolean).join(' ');
    const nextLabel = nextSortLabel(col.label, sorted, sort.dir);
    return (
        <th className={ className } style={ widthStyle(col) } rowSpan={ rowSpan } aria-sort={ col.sort ? ariaSortFor(sorted, sort.dir) : undefined }>
            <span className="thwrap">
                <span className="thlbl">{ col.label }</span>
                { col.sort && (
                    <button type="button" className="thsort" title={ nextLabel } aria-label={ nextLabel } onClick={ () => onSort(col.sort) }>
                        <WgdIcon name={ sorted ? (sort.dir === 'asc' ? 'sort_asc' : 'sort_desc') : 'sort' } size={ 10 } strokeWidth={ 2 } />
                    </button>
                ) }
                { col.ownerPool && !ownerFilterHidden && (
                    <button
                        type="button"
                        className={ `thfilter${ ownerActive ? ' has' : '' }` }
                        title={ `Filter ${ col.label }` }
                        aria-label={ `Filter ${ col.label }` }
                        aria-haspopup="true"
                        onClick={ (e) => onOwnerOpen(col.ownerPool, e.currentTarget.getBoundingClientRect()) }
                    >
                        <WgdIcon name="chev_down" size={ 10 } strokeWidth={ 2 } />
                        { ownerActive ? <i>{ ownerActive }</i> : null }
                    </button>
                ) }
            </span>
        </th>
    );
};

HeaderCell.propTypes = {
    col: PropTypes.object.isRequired,
    sort: PropTypes.object.isRequired,
    ownerActive: PropTypes.number,
    ownerFilterHidden: PropTypes.bool,
    onSort: PropTypes.func.isRequired,
    onOwnerOpen: PropTypes.func.isRequired,
    extraClass: PropTypes.string,
    rowSpan: PropTypes.number,
};

const WorkerDashboardTable = ({
    colKeys, rows, loading, error, emptyText, sort, ownerFilters, hiddenOwnerPools, selected, selectMode, rowsOpenable,
    footStart, footEnd, footTotal, footNote = '', page, totalPages, showLegend, canSelect,
    onSort, onOwnerOpen, onToggleRow, onToggleAll, onToggleSelectMode, onOpenWorker, onOpenStage, onResend, onPage, onRetry,
}) => {
    const cols = useMemo(
        () => colKeys.map((k) => ({ key: k, ...COLS[k] })),
        [colKeys]
    );
    const hasGroups = cols.some((c) => c.grp);
    const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
    const colCount = cols.length + (selectMode ? 1 : 0);

    const groupEdges = (idx) => {
        const c = cols[idx];
        if (!c.grp) return '';
        const first = idx === 0 || cols[idx - 1].grp !== c.grp;
        const last = idx === cols.length - 1 || cols[idx + 1].grp !== c.grp;
        return `ingrp ${ first ? 'gfirst ' : '' }${ last ? 'glast' : '' }`.trim();
    };

    const headerCellProps = (c) => ({
        col: c,
        sort,
        ownerActive: c.ownerPool ? (ownerFilters[c.ownerPool]?.size || 0) : 0,
        ownerFilterHidden: Boolean(c.ownerPool && hiddenOwnerPools?.includes(c.ownerPool)),
        onSort,
        onOwnerOpen,
    });

    const selectAllCell = (rowSpan) => (selectMode ? (
        <th className="cbcol sticky" rowSpan={ rowSpan }>
            <CheckCell on={ allChecked } onToggle={ onToggleAll } label={ translation('key_wkr_select_all_workers_on_this_page') } />
        </th>
    ) : null);

    let thead;
    if (hasGroups) {
        const bandCells = [];
        let i = 0;
        while (i < cols.length) {
            const c = cols[i];
            if (!c.grp) {
                bandCells.push(<HeaderCell key={ c.key } { ...headerCellProps(c) } rowSpan={ 2 } />);
                i += 1;
            } else {
                let j = i;
                while (j < cols.length && cols[j].grp === c.grp) j += 1;
                bandCells.push(<th key={ `band-${ c.grp }` } colSpan={ j - i } className="band">{ GROUPS[c.grp] }</th>);
                i = j;
            }
        }
        thead = (
            <thead>
                <tr className="groupband">
                    { selectAllCell(2) }
                    { bandCells }
                </tr>
                <tr className="subhead">
                    { cols.map((c, idx) => (c.grp
                        ? <HeaderCell key={ c.key } { ...headerCellProps(c) } extraClass={ groupEdges(idx) } />
                        : null)) }
                </tr>
            </thead>
        );
    } else {
        thead = (
            <thead>
                <tr>
                    { selectAllCell() }
                    { cols.map((c) => <HeaderCell key={ c.key } { ...headerCellProps(c) } />) }
                </tr>
            </thead>
        );
    }

    const handleRowClick = (e, row) => {
        if (!rowsOpenable || isRowControlTarget(e.target) || hasActiveTextSelection(e.currentTarget)) return;
        onOpenWorker(row);
    };
    const handleRowKey = (e, row) => {
        if (!rowsOpenable || e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenWorker(row); }
    };

    return (
        <div id="table">
            <div className="tablecard">
                <div className="tscroll">
                    <table className="wtable" data-mc-listing-variant="simple" data-mc-select={ selectMode ? 'on' : 'off' }>
                        { thead }
                        <tbody>
                            { loading ? (
                                <tr>
                                    <td colSpan={ colCount } className="empty">
                                        <WgdIcon name="clock" size={ 22 } />
                                        <span>{ translation('key_wkr_loading_workers') }</span>
                                    </td>
                                </tr>
                            ) : error ? (
                                /* SR-06 (D40): a failed fetch is an error state with a retry, not stale rows or an empty "no match" */
                                <tr>
                                    <td colSpan={ colCount } className="empty" role="alert">
                                        <WgdIcon name="x" size={ 22 } />
                                        <span>{ translation('key_failed_to_load_data') }</span>
                                        { onRetry && <button type="button" className="btn btn-secondary btn-sm wgd-retry" onClick={ () => onRetry() }>{ translation('key_retry') }</button> }
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={ colCount } className="empty">
                                        <WgdIcon name="inbox" size={ 22 } />
                                        <span>{ emptyText || translation('key_wkr_no_workers_match_the_current_filters') }</span>
                                    </td>
                                </tr>
                            ) : rows.map((row) => {
                                const sel = selected.has(row.id);
                                return (
                                    <tr
                                        key={ row.id }
                                        className={ sel ? 'sel' : undefined }
                                        data-row-open={ rowsOpenable ? (row.code || row.id) : undefined }
                                        tabIndex={ rowsOpenable ? 0 : undefined }
                                        aria-label={ rowsOpenable ? `Open Worker Details — ${ row.name }` : undefined }
                                        onClick={ (e) => handleRowClick(e, row) }
                                        onKeyDown={ (e) => handleRowKey(e, row) }
                                    >
                                        { selectMode && (
                                            <td className="cbcol sticky">
                                                <CheckCell on={ sel } onToggle={ () => onToggleRow(row.id) } label={ `Select ${ row.name }` } />
                                            </td>
                                        ) }
                                        { cols.map((c, idx) => {
                                            const center = c.type === 'stage';
                                            const cls = [
                                                center ? 'ctr' : '',
                                                c.sticky ? 'sticky wname' : '',
                                                groupEdges(idx),
                                            ].filter(Boolean).join(' ');
                                            return (
                                                <td key={ c.key } className={ cls || undefined } style={ widthStyle(c) }>
                                                    <Cell colKey={ c.key } col={ c } row={ row } onOpenStage={ onOpenStage } onResend={ onResend } />
                                                </td>
                                            );
                                        }) }
                                    </tr>
                                );
                            }) }
                        </tbody>
                    </table>
                </div>
                <div className="tfoot">
                    { canSelect && (
                        <button
                            type="button"
                            className="mc-selenter"
                            aria-pressed={ selectMode }
                            onClick={ onToggleSelectMode }
                        >
                            { selectMode ? translation('key_wkr_exit_selection') : translation('key_wkr_select_workers') }
                        </button>
                    ) }
                    { showLegend ? (
                        <span className="legend">
                            <span className="cap">{ translation('key_jo_dash_legend') }</span>
                            { JO_STAGES.map((s) => (
                                <span key={ s.key } className="item">
                                    <span className={ `sw ${ s.hue }` }><WgdIcon name={ s.icon } size={ 10 } strokeWidth={ 2 } /></span>
                                    { s.label }
                                </span>
                            )) }
                        </span>
                    ) : (
                        <span className="footcount">{ footStart }–{ footEnd } { translation('key_of') } { footTotal } { translation('key_workers').toLowerCase() }</span>
                    ) }
                    <div className="pager">
                        { footNote && <span className="footcount" role="status">{ footNote }</span> }
                        { showLegend && <span className="footcount">{ footStart }–{ footEnd } { translation('key_of') } { footTotal }</span> }
                        <button type="button" disabled={ page <= 1 } onClick={ () => onPage(-1) } aria-label={ translation('key_wkr_previous_page') }>
                            <WgdIcon name="chev_left" size={ 12 } />
                        </button>
                        <span className="pg">{ translation('key_jo_suggest_page') } { page } / { totalPages }</span>
                        <button type="button" disabled={ page >= totalPages } onClick={ () => onPage(1) } aria-label={ translation('key_wkr_next_page') }>
                            <WgdIcon name="chev_right" size={ 12 } />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

WorkerDashboardTable.propTypes = {
    colKeys: PropTypes.array.isRequired,
    rows: PropTypes.array.isRequired,
    loading: PropTypes.bool,
    error: PropTypes.bool,
    emptyText: PropTypes.string,
    sort: PropTypes.object.isRequired,
    ownerFilters: PropTypes.object.isRequired,
    hiddenOwnerPools: PropTypes.array,
    selected: PropTypes.instanceOf(Set).isRequired,
    selectMode: PropTypes.bool,
    rowsOpenable: PropTypes.bool,
    canSelect: PropTypes.bool,
    footStart: PropTypes.number.isRequired,
    footEnd: PropTypes.number.isRequired,
    footTotal: PropTypes.number.isRequired,
    footNote: PropTypes.string,
    page: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
    showLegend: PropTypes.bool,
    onSort: PropTypes.func.isRequired,
    onOwnerOpen: PropTypes.func.isRequired,
    onToggleRow: PropTypes.func.isRequired,
    onToggleAll: PropTypes.func.isRequired,
    onToggleSelectMode: PropTypes.func.isRequired,
    onOpenWorker: PropTypes.func.isRequired,
    onResend: PropTypes.func,
    onOpenStage: PropTypes.func.isRequired,
    onPage: PropTypes.func.isRequired,
    onRetry: PropTypes.func,
};

WorkerDashboardTable.defaultProps = {
    loading: false,
    error: false,
    emptyText: '',
    hiddenOwnerPools: [],
    selectMode: false,
    rowsOpenable: true,
    canSelect: true,
    showLegend: false,
};

export default React.memo(WorkerDashboardTable);
