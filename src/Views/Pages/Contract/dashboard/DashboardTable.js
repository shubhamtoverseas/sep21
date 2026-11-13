import React, { useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import Btn from "../../../../components/ui/Btn";
import translation from "../../../../utils/translation";
import { hasActiveTextSelection, isRowControlTarget, listingTableWidth, listingTrackStyle, listingTrackWidth } from "../../../../services/commonService";
import {
    EM_DASH, abbrevName, columnLabel, compactToken, elapsedMinutes, extendVisaView, formatDate, formatDuration, formatShortDate, formatStamp,
    initialsOf, isSortable, isTerminalToken, paosKeyOf, stageLabel, toneFor,
} from "./contractDashboardUtils";
import {
    CD_COL, CD_COL_KIND, CD_OWNER_FILTER_LABEL_KEYS, CD_OWNER_REGISTER, CD_PAGE_SIZES, CD_PAOS_TONE, CD_SORT_DIR, CD_SORT_MODE, CD_STAGE, CD_STATUS, CR_PAOS_LABEL_KEYS,
    CD_TOKEN, CD_TONE, CD_XV_PRESENTED, } from "../contractConstants";

const SELECT_ALL = "__all__";

/* ---- cells ---- */
const Na = ({ title }) => <span className="na" title={ title }>{ EM_DASH }</span>;
Na.propTypes = { title: PropTypes.string };

const StageCell = ({ stage, token, at, title: extraTitle }) => {
    if (!token) return <span className="pdst"><Na /></span>;
    const label = stageLabel(stage);
    const shown = compactToken(token);
    const terminal = isTerminalToken(stage, token);
    const tone = toneFor(stage, token);
    const stamp = formatStamp(at);
    const title = `${ extraTitle ? `${ extraTitle } · ` : "" }${ label } · ${ shown }${ stamp ? ` · ${ stamp }` : "" }`;
    if (terminal) {
        const date = formatShortDate(at);
        return <span className="pdst"><span className="stcell term" data-mc-stage-cell={ label } title={ title }>{ date ? <span className="sdate">{ date }</span> : <span className="slbl">{ shown }</span> }</span></span>;
    }
    const elapsed = token === CD_TOKEN.NOT_READY ? null : formatDuration(elapsedMinutes(at));
    return (
        <span className="pdst">
            <span className={ `stcell tone-${ tone }` } data-mc-stage-cell={ label } title={ title }>
                <span className="slbl">{ shown }</span>
                { elapsed && <span className="sago">{ elapsed } { translation("key_ago") }</span> }
            </span>
        </span>
    );
};
StageCell.propTypes = { stage: PropTypes.string.isRequired, token: PropTypes.string, at: PropTypes.string, title: PropTypes.string };

/* Extend Visa: open case → stage cell · latest Released → terminal date · latest Cancelled → qualifier + date · ×N when >1.
   U-0269: a stage cell is plain text — the row is the one control that opens the record (the case is reached from the record) */
const ExtendVisaCell = ({ xv }) => {
    const view = extendVisaView(xv);
    if (!view) return <span className="pdst"><Na /></span>;
    const count = view.count > 1 ? <span className="xvcount" title={ `${ view.count } ${ translation("key_cd_extend_visa_cases_title") }` }>×{ view.count }</span> : null;
    if (view.presented === CD_XV_PRESENTED.CANCELLED) {
        const date = formatShortDate(view.at);
        return (
            <span className="evwrap" data-xv-presented={ view.presented }>
                <span className="pdst">
                    <span className="stcell xvcancel" title={ `${ view.note || translation("key_cd_extend_visa_cancelled_title") }${ formatStamp(view.at) ? ` · ${ formatStamp(view.at) }` : "" }` }>
                        <span className="slbl">{ translation("key_cancelled") }</span>
                        { date && <span className="sdate">{ date }</span> }
                    </span>
                </span>
                { count }
            </span>
        );
    }
    /* U-0306: an open case without a token is at the start of its rail (Not Ready), never presumed released */
    return (
        <span className="evwrap" data-xv-presented={ view.presented }>
            <StageCell stage={ CD_STAGE.EXTEND_VISA } token={ view.token || CD_TOKEN.NOT_READY } at={ view.at } title={ view.note || undefined } />
            { count }
        </span>
    );
};
ExtendVisaCell.propTypes = { xv: PropTypes.object };

const PaosCell = ({ paos }) => {
    const key = paosKeyOf(paos?.token);
    if (!key) return <span className="pdst"><Na title={ translation("key_cd_paos_not_applicable") } /></span>;
    const label = translation(CR_PAOS_LABEL_KEYS[key]);
    const session = formatShortDate(paos.session_date);
    return (
        <span className="pdst">
            <span className={ `stcell tone-${ CD_PAOS_TONE[key] || CD_TONE.TEAL }` } data-mc-stage-cell="PAOS" data-v28-paos={ key } title={ `${ stageLabel(CD_STAGE.PAOS) } · ${ label }${ paos.venue ? ` · ${ paos.venue }` : "" }` }>
                <span className="slbl">{ label }</span>
                { session && <span className="sago">{ session }</span> }
            </span>
        </span>
    );
};
PaosCell.propTypes = { paos: PropTypes.object };

/* with `onOpen` (Processing, single-change grants) the cell is a button opening Manage owners for the row — the row itself does not open */
const OwnerCell = ({ name, tint, onOpen, label }) => {
    const body = name
        ? <><span className={ `rav ${ tint }` }>{ initialsOf(name) }</span><span className="onm" title={ name }>{ abbrevName(name) }</span></>
        : <Na />;
    if (!onOpen) return name ? <span className="owner">{ body }</span> : body;
    return <button type="button" className="owner owner-btn" data-row-control="" aria-label={ `${ label } — ${ name || translation("key_unassigned") }` } onClick={ (e) => { e.stopPropagation(); onOpen(); } }>{ body }</button>;
};
OwnerCell.propTypes = { name: PropTypes.string, tint: PropTypes.string.isRequired, onOpen: PropTypes.func, label: PropTypes.string };

const RowCheck = ({ on, label, onToggle }) => (
    <span className="rowsel">
        <button type="button" role="checkbox" aria-checked={ on } aria-label={ label } onClick={ (event) => { event.stopPropagation(); onToggle(); } }>
            <span className={ `box${ on ? " on" : "" }` }><Icon name="check" size={ 10 } strokeWidth={ 2.6 } /></span>
        </button>
    </span>
);
RowCheck.propTypes = { on: PropTypes.bool.isRequired, label: PropTypes.string.isRequired, onToggle: PropTypes.func.isRequired };

const renderCell = (column, row, status, onOwnerCell) => {
    const owner = onOwnerCell ? () => onOwnerCell(row) : undefined;
    switch (column.key) {
        case CD_COL.EMPLOYER: {
            const full = row.employer_name ? `${ row.employer_name }${ row.employer_chinese_name ? ` · ${ row.employer_chinese_name }` : "" }` : null;
            return full ? <span className="nm-btn noopen mc-person-name mc-truncate" data-mc-cell="employer" title={ full }>{ full }</span> : <span className="nm-btn noopen mc-unavailable">{ EM_DASH }</span>;
        }
        case CD_COL.WORKER: return <span className="nm-btn noopen mc-person-name mc-truncate" data-mc-cell="worker" title={ row.worker_name }>{ row.worker_name }</span>;
        case CD_COL.CODE: return row.worker_code ? <span className="ref mc-code-plain" data-mc-cell="worker-code">{ row.worker_code }</span> : <span className="ref noopen mc-unavailable">{ EM_DASH }</span>;
        case CD_COL.ACTIVITY: {
            const elapsed = formatDuration(elapsedMinutes(row.activity_at));
            return elapsed ? <span className="mono" title={ `${ translation("key_cd_last_recorded_change") } · ${ formatStamp(row.activity_at) }` }>{ elapsed } { translation("key_ago") }</span> : <Na />;
        }
        case CD_COL.CONTRACT_START: return row.contract_start ? <span className="mono">{ formatDate(row.contract_start) }</span> : <Na />;
        case CD_COL.CONTRACT_END: {
            /* Cancelled keeps the cancellation date here until product rules which date the column carries (audit Q2) */
            const value = status === CD_STATUS.CANCELLED ? (row.cancellation_date || row.contract_end) : row.contract_end;
            if (!value) return <Na />;
            return <><span className="mono">{ formatDate(value) }</span>{ column.expected && <span className="tag-expected">{ translation("key_expected") }</span> }</>;
        }
        case CD_COL.COMPLETION_REASON: return row.completion_reason ? <span className="reason">{ row.completion_reason }</span> : <Na />;
        case CD_COL.CANCELLATION_REASON: return row.cancellation_reason ? <span className="reason">{ row.cancellation_reason }</span> : <Na />;
        case CD_COL.CS_OWNER: return <OwnerCell name={ row.cs_owner_name } tint="r-cs" onOpen={ owner } label={ translation("key_cs_owner") } />;
        case CD_COL.CS_ASSISTANT: return <OwnerCell name={ row.cs_assistant_name } tint="r-asn" onOpen={ owner } label={ translation("key_cs_assistant") } />;
        case CD_COL.PREPARED_OWNER: return <OwnerCell name={ row.prepared_owner_name } tint="r-prep" onOpen={ owner } label={ translation("key_prepared_owner") } />;
        case CD_COL.READY_OWNER: return <OwnerCell name={ row.ready_owner_name } tint="r-ready" onOpen={ owner } label={ translation("key_ready_owner") } />;
        case CD_COL.BRANCH: return row.branch_name ? <span className="soft">{ row.branch_name }</span> : <Na />;
        case CD_STAGE.PAOS: return <PaosCell paos={ row.paos } />;
        case CD_STAGE.EXTEND_VISA: return <ExtendVisaCell xv={ row.extend_visa } />;
        default: { const st = row.stages?.[column.key]; return <StageCell stage={ column.key } token={ st?.token } at={ st?.updated_at } />; }
    }
};

/* ---- header ---- */
const sortGlyph = (column, sort) => {
    if (sort.col !== column.key) return "sort_asc";
    if (sort.mode === CD_SORT_MODE.DIR || sort.mode === CD_SORT_MODE.CHANGED || sort.mode === CD_SORT_MODE.TERMINAL) return sort.dir === CD_SORT_DIR.DESC ? "arrow_down" : "arrow_up";
    return "priority";
};
const nextSortLabel = (label, active, dir) => {
    if (!active) return `${ translation("key_sort_by") } ${ label }, ${ translation("key_cd_ascending") }`;
    if (dir === CD_SORT_DIR.ASC) return `${ translation("key_sort_by") } ${ label }, ${ translation("key_cd_descending") }`;
    return `${ translation("key_cd_clear_sorting_by") } ${ label }`;
};

const HeaderCell = ({ column, sort, lead, openMenuId, ownerCount, csFilterVisible, onSortCycle, onSortMenu, onOwnerMenu }) => {
    const label = columnLabel(column);
    const sortable = isSortable(column);
    const active = sortable && sort.col === column.key;
    const ordinary = sortable && column.kind !== CD_COL_KIND.STAGE;
    const dirActive = ordinary && active && sort.mode === CD_SORT_MODE.DIR;
    const menuId = `hsort|${ column.key }`;
    const filterId = `owner|${ column.ownerFilter }`;
    let ariaSort = "none";
    if (active) ariaSort = sort.mode === CD_SORT_MODE.DIR ? (sort.dir === CD_SORT_DIR.DESC ? "descending" : "ascending") : "other";
    return (
        <th
            className={ `${ column.kind === CD_COL_KIND.STAGE ? "stcol" : "" }${ column.sticky ? ` sticky ${ column.sticky }` : "" }${ active ? " sorted" : "" }` }
            style={ listingTrackStyle(column) }
            aria-sort={ sortable ? ariaSort : undefined }
            data-mc-filter-only={ !sortable && column.ownerFilter ? "" : undefined }
        >
            <span className="thwrap">
                { lead }
                { ordinary
                    ? <button type="button" className={ `thlbl thcycle${ dirActive ? " on" : "" }` } aria-label={ nextSortLabel(label, dirActive, sort.dir) } onClick={ () => onSortCycle(column.key) }>{ label }</button>
                    : <span className="thlbl">{ label }</span> }
                { sortable && (
                    <button
                        type="button"
                        className={ `thsort${ active ? " on" : "" }` }
                        aria-haspopup="true"
                        aria-expanded={ openMenuId === menuId }
                        aria-label={ `${ translation("key_sort_by") } ${ label }` }
                        title={ `${ translation("key_sort_by") } ${ label }` }
                        onClick={ (event) => onSortMenu(column, event.currentTarget) }
                    >
                        <Icon name={ sortGlyph(column, sort) } size={ 10 } strokeWidth={ 2 } />
                    </button>
                ) }
                { column.ownerFilter && csFilterVisible && (
                    <button
                        type="button"
                        className={ `thfilter${ ownerCount ? " has" : "" }` }
                        aria-haspopup="true"
                        aria-expanded={ openMenuId === filterId }
                        aria-label={ translation(CD_OWNER_FILTER_LABEL_KEYS[column.ownerFilter]) }
                        title={ translation(CD_OWNER_FILTER_LABEL_KEYS[column.ownerFilter]) }
                        onClick={ (event) => onOwnerMenu(column.ownerFilter, event.currentTarget) }
                    >
                        <Icon name="chev_down" size={ 10 } strokeWidth={ 2 } />
                        { ownerCount ? <i>{ ownerCount }</i> : null }
                    </button>
                ) }
            </span>
        </th>
    );
};
HeaderCell.propTypes = {
    column: PropTypes.object.isRequired,
    sort: PropTypes.object.isRequired,
    lead: PropTypes.node,
    openMenuId: PropTypes.string,
    ownerCount: PropTypes.number,
    csFilterVisible: PropTypes.bool.isRequired,
    onSortCycle: PropTypes.func.isRequired,
    onSortMenu: PropTypes.func.isRequired,
    onOwnerMenu: PropTypes.func.isRequired,
};

/**
 * The listing (prototype tableHTML + v28 whole-row open): kit listing tracks, three sticky identity columns,
 * stage / PAOS / Extend Visa cells, owner cells, the selection column, empty · error · loading states inside the
 * table, and the footer (selection cluster · count · rows per page · pager; a capped result has no page size).
 */
const DashboardTable = ({
    columns, rows, status, sort, loading, error, scrollRef,
    openMenuId, ownerCounts, csFilterVisible, onSortCycle, onSortMenu, onOwnerMenu,
    selecting, picked, onTogglePick, onToggleAll,
    canOpenRow, onOpenRow, onOpenDenied,
    page, limit, total, capped, overflow, searchActive, onPage, onLimit,
    manageAvailable, registers, onToggleSelecting, onBulk, onOwnerCell,
    onRetry, onClearFilters,
}) => {
    const tableWidth = listingTableWidth(columns);
    const stickyVars = useMemo(() => {
        const vars = {};
        let offset = 0;
        columns.filter((c) => c.sticky).forEach((c) => {
            vars[`--mc-sticky-${ c.sticky }`] = `${ offset }px`;
            offset += listingTrackWidth(c.trackRole, c.trackWidth);
        });
        return vars;
    }, [columns]);
    /* pinned columns offset by their declared tracks, so a table with more than one of them keeps its capped width; otherwise it fills the card (Shubham, 2 Nov) */
    const keepsCap = Object.keys(stickyVars).length > 1;
    const tableStyle = { ...stickyVars, ...(tableWidth ? (keepsCap ? { width: tableWidth, minWidth: tableWidth } : { minWidth: tableWidth }) : {}) };

    const allOn = rows.length > 0 && rows.every((row) => picked.includes(row.id));
    const handleRowClick = useCallback((event, row) => {
        if (isRowControlTarget(event.target) || hasActiveTextSelection(event.currentTarget)) return;
        if (canOpenRow(row)) onOpenRow(row); else onOpenDenied();
    }, [canOpenRow, onOpenRow, onOpenDenied]);
    const handleRowKey = useCallback((event, row) => {
        if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        if (canOpenRow(row)) onOpenRow(row);
    }, [canOpenRow, onOpenRow]);

    const pages = Math.max(1, Math.ceil(total / limit));
    const from = total ? (capped ? 1 : (page - 1) * limit + 1) : 0;
    const to = capped ? rows.length : Math.min(total, page * limit);
    const countText = total ? `${ from }–${ to } ${ translation("key_of") } ${ total } ${ translation("key_workers").toLowerCase() }` : `0 ${ translation("key_workers").toLowerCase() }`;
    const showEmpty = !loading && !error && rows.length === 0;
    const showError = !loading && Boolean(error) && rows.length === 0;
    const showLoading = loading && rows.length === 0;
    const registerButton = (register, labelKey) => (registers[register] ? (
        <button type="button" className="mc-coenter" aria-disabled={ picked.length === 0 } onClick={ () => picked.length && onBulk(register) }>{ translation(labelKey) }</button>
    ) : null);

    return (
        <div className="tablecard">
            { capped && overflow && searchActive && <div className="capnote" role="status">{ translation("key_cd_too_many_results") }</div> }
            <div className="tscroll" data-tscroll="" ref={ scrollRef } aria-busy={ loading }>
                <table className={ `wtable mc-tracks${ loading && rows.length ? " refreshing" : "" }` } style={ tableStyle }>
                    <thead>
                        <tr>
                            { columns.map((column, index) => (
                                <HeaderCell
                                    key={ column.key }
                                    column={ column }
                                    sort={ sort }
                                    lead={ index === 0 && selecting ? <RowCheck on={ allOn } label={ translation("key_cd_select_all_on_this_page") } onToggle={ () => onToggleAll(SELECT_ALL) } /> : null }
                                    openMenuId={ openMenuId }
                                    ownerCount={ column.ownerFilter ? ownerCounts[column.ownerFilter] : 0 }
                                    csFilterVisible={ csFilterVisible }
                                    onSortCycle={ onSortCycle }
                                    onSortMenu={ onSortMenu }
                                    onOwnerMenu={ onOwnerMenu }
                                />
                            )) }
                        </tr>
                    </thead>
                    <tbody>
                        { showLoading && <tr><td className="empty" colSpan={ columns.length }>{ translation("key_loading") }…</td></tr> }
                        { showError && (
                            <tr>
                                <td className="empty" colSpan={ columns.length }>
                                    { translation("key_couldnt_load_this_view") }
                                    <span><Btn variant="secondary" onClick={ onRetry }><Icon name="refresh" size={ 13 } /> { translation("key_retry") }</Btn></span>
                                </td>
                            </tr>
                        ) }
                        { showEmpty && (
                            <tr>
                                <td className="empty" colSpan={ columns.length }>
                                    { translation("key_cd_no_workers_match") }
                                    <span><button type="button" className="fclear" onClick={ onClearFilters }>{ translation("key_clear_filters") }</button></span>
                                </td>
                            </tr>
                        ) }
                        { rows.map((row) => {
                            const openable = canOpenRow(row);
                            const on = picked.includes(row.id);
                            return (
                                <tr
                                    key={ row.id }
                                    className={ on ? "picked" : undefined }
                                    data-row-open={ openable ? row.id : undefined }
                                    data-mc-row-noopen={ openable ? undefined : "1" }
                                    tabIndex={ openable ? 0 : undefined }
                                    aria-label={ openable ? `${ translation("key_cd_open_contract_details") } — ${ row.employer_name || translation("key_cd_employer_not_recorded") } · ${ row.worker_name || "" }` : undefined }
                                    onClick={ (event) => handleRowClick(event, row) }
                                    onKeyDown={ (event) => handleRowKey(event, row) }
                                >
                                    { columns.map((column, index) => (
                                        <td key={ column.key } className={ column.sticky ? `sticky ${ column.sticky }` : undefined } style={ listingTrackStyle(column) }>
                                            { column.kind === CD_COL_KIND.ID
                                                ? <span className="wid">{ index === 0 && selecting && <RowCheck on={ on } label={ `${ translation("key_select") } ${ row.worker_code || row.id }` } onToggle={ () => onTogglePick(row.id) } /> }{ renderCell(column, row, status) }</span>
                                                : renderCell(column, row, status, onOwnerCell) }
                                        </td>
                                    )) }
                                </tr>
                            );
                        }) }
                    </tbody>
                </table>
            </div>
            <div className="tfoot">
                { manageAvailable && (
                    <>
                        <button type="button" className={ `mc-selenter${ selecting ? " on" : "" }` } aria-pressed={ selecting } onClick={ onToggleSelecting }>{ translation("key_select_records") }</button>
                        { selecting && (
                            <>
                                <span className="fsel">{ picked.length } { translation("key_selected").toLowerCase() }</span>
                                { registerButton(CD_OWNER_REGISTER.CS_OWNER, "key_change_cs_owner") }
                                { registerButton(CD_OWNER_REGISTER.CS_ASSISTANT, "key_change_cs_assistant") }
                                { registerButton(CD_OWNER_REGISTER.PREPARED, "key_change_prepared_owner") }
                                { registerButton(CD_OWNER_REGISTER.READY, "key_change_ready_owner") }
                            </>
                        ) }
                    </>
                ) }
                <span className="footcount">{ countText }</span>
                { !capped && (
                    <span className="psize" title={ translation("key_rows_per_page") }>
                        <select value={ limit } aria-label={ translation("key_rows_per_page") } onChange={ (event) => onLimit(Number(event.target.value)) }>
                            { CD_PAGE_SIZES.map((n) => <option key={ n } value={ n }>{ n }</option>) }
                        </select>
                        <Icon name="chev_down" size={ 11 } />
                    </span>
                ) }
                { capped ? (
                    <div className="pager" data-capped="1"><span className="pg">{ translation("key_page") } 1 / 1</span></div>
                ) : (
                    <div className="pager">
                        <button type="button" disabled={ page <= 1 } aria-label={ translation("key_cd_previous_page") } onClick={ () => onPage(-1) }><Icon name="chev_left" size={ 12 } /></button>
                        <span className="pg">{ translation("key_page") } { page } / { pages }</span>
                        <button type="button" disabled={ page >= pages } aria-label={ translation("key_cd_next_page") } onClick={ () => onPage(1) }><Icon name="chev_right" size={ 12 } /></button>
                    </div>
                ) }
            </div>
        </div>
    );
};

DashboardTable.propTypes = {
    columns: PropTypes.arrayOf(PropTypes.object).isRequired,
    rows: PropTypes.arrayOf(PropTypes.object).isRequired,
    status: PropTypes.string.isRequired,
    sort: PropTypes.object.isRequired,
    loading: PropTypes.bool.isRequired,
    error: PropTypes.bool.isRequired,
    scrollRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape({ current: PropTypes.any })]),
    openMenuId: PropTypes.string,
    ownerCounts: PropTypes.object.isRequired,
    csFilterVisible: PropTypes.bool.isRequired,
    onSortCycle: PropTypes.func.isRequired,
    onSortMenu: PropTypes.func.isRequired,
    onOwnerMenu: PropTypes.func.isRequired,
    selecting: PropTypes.bool.isRequired,
    picked: PropTypes.array.isRequired,
    onTogglePick: PropTypes.func.isRequired,
    onToggleAll: PropTypes.func.isRequired,
    canOpenRow: PropTypes.func.isRequired,
    onOpenRow: PropTypes.func.isRequired,
    onOpenDenied: PropTypes.func.isRequired,
    page: PropTypes.number.isRequired,
    limit: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired,
    capped: PropTypes.bool.isRequired,
    overflow: PropTypes.bool.isRequired,
    searchActive: PropTypes.bool.isRequired,
    onPage: PropTypes.func.isRequired,
    onLimit: PropTypes.func.isRequired,
    manageAvailable: PropTypes.bool.isRequired,
    onOwnerCell: PropTypes.func,
    registers: PropTypes.object.isRequired,
    onToggleSelecting: PropTypes.func.isRequired,
    onBulk: PropTypes.func.isRequired,
    onRetry: PropTypes.func.isRequired,
    onClearFilters: PropTypes.func.isRequired,
};

export default React.memo(DashboardTable);
