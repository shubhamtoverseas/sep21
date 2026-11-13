import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import Btn from "../../../../components/ui/Btn";
import FilterSelect from "../../../../components/ui/FilterSelect";
import DateInput from "../../../../components/ui/DateInput";
import translation from "../../../../utils/translation";
import { hasActiveTextSelection, isRowControlTarget, listingTableWidth, listingTrackStyle, listingTrackWidth } from "../../../../services/commonService";
import { loadPaosRoster } from "../details/paosApi";
import { paosKey, paosLabel, triOf } from "../details/paosRules";
import { EM_DASH, formatDate, ownerOptionsFrom } from "./contractDashboardUtils";
import { CD_PAOS_TONE, CD_STATUS, CD_STATUS_LABEL_KEYS, CR_PAOS_LABEL_KEYS, CR_PAOS_PROCESSING, CR_PAOS_ROSTER_COLS, CR_PAOS_ROSTER_LIMIT, CR_PAOS_TRI, CR_STATUS_KEY_BY_ID } from "../contractConstants";

const ALL = "";
const EMPTY_FILTERS = Object.freeze({ progress: ALL, branch: ALL, owner: ALL, from: "", to: "", processing: CR_PAOS_PROCESSING.INCLUDED });
const withAll = (options) => [{ value: ALL, label: translation("key_all") }, ...options];
const statusKey = (row) => {
    const raw = row.contract_status ?? row.status;
    if (raw === undefined || raw === null || raw === "") return CD_STATUS.ACTIVE;
    return CR_STATUS_KEY_BY_ID[Number(raw)] || (CD_STATUS_LABEL_KEYS[String(raw).toLowerCase()] ? String(raw).toLowerCase() : CD_STATUS.ACTIVE);
};

/**
 * The PAOS roster (prototype v28RosterHTML, CT-06): newly arrived Filipino workers on Overseas contracts — Active
 * (arrived), Processing (booking prepared before arrival) and closed parents that still hold an unresolved case;
 * the same authorised Hong Kong-scoped population as Contracts (server side). Filters PAOS progress · Branch ·
 * CS Owner · Session from / to · Processing Included / Excluded · Clear filters; columns Worker Name · Worker Code ·
 * Employer Name · Contract Start · Contract · Branch · CS Owner · PAOS · Session · Venue · Certificate; rows open
 * Contract Details. Progress changes only from the contract's PAOS update.
 */
const PaosRoster = ({ branchOptions, onOpenContract }) => {
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const [result, setResult] = useState({ rows: [], total: 0, applicable: 0, facets: {} });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [tick, setTick] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await loadPaosRoster({
            progress: filters.progress ? [filters.progress] : [],
            branch_id: filters.branch ? [Number(filters.branch)] : [],
            cs_owner_id: filters.owner ? [Number(filters.owner)] : [],
            from: filters.from || null,
            to: filters.to || null,
            include_processing: filters.processing === CR_PAOS_PROCESSING.INCLUDED,
            page,
            limit: CR_PAOS_ROSTER_LIMIT,
        });
        setLoading(false);
        if (!res.ok) { setError(true); return; }
        setError(false);
        const d = res.data || {};
        const rows = Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []);
        setResult({ rows, total: Number(d.total ?? rows.length), applicable: Number(d.applicable_total ?? d.total ?? rows.length), facets: { owner_options: d.owner_options } });
    }, [filters, page]);
    useEffect(() => { load(); }, [load, tick]);

    const setFilter = (key) => (value) => { setPage(1); setFilters((f) => ({ ...f, [key]: value ?? "" })); };
    const clear = () => { setPage(1); setFilters(EMPTY_FILTERS); };
    const ownerOptions = useMemo(() => ownerOptionsFrom(result.facets.owner_options, result.rows, "cs_owner_id", "cs_owner_name").map((o) => ({ value: String(o.id), label: o.name })), [result.facets.owner_options, result.rows]);
    const progressOptions = useMemo(() => Object.keys(CR_PAOS_LABEL_KEYS).map((k) => ({ value: k, label: translation(CR_PAOS_LABEL_KEYS[k]) })), []);
    const processingOptions = useMemo(() => [
        { value: CR_PAOS_PROCESSING.INCLUDED, label: translation("key_cr_paos_roster_included") },
        { value: CR_PAOS_PROCESSING.EXCLUDED, label: translation("key_cr_paos_roster_excluded") },
    ], []);

    const columns = CR_PAOS_ROSTER_COLS;
    const tableWidth = listingTableWidth(columns);
    const stickyVars = useMemo(() => {
        const vars = {}; let offset = 0;
        columns.filter((c) => c.sticky).forEach((c) => { vars[`--mc-sticky-${ c.sticky }`] = `${ offset }px`; offset += listingTrackWidth(c.trackRole, c.trackWidth); });
        return vars;
    }, [columns]);
    const keepsCap = Object.keys(stickyVars).length > 1;
    const tableStyle = { ...stickyVars, ...(tableWidth ? (keepsCap ? { width: tableWidth, minWidth: tableWidth } : { minWidth: tableWidth }) : {}) };
    const pages = Math.max(1, Math.ceil(result.total / CR_PAOS_ROSTER_LIMIT));
    const openRow = (event, row) => { if (isRowControlTarget(event.target) || hasActiveTextSelection(event.currentTarget)) return; onOpenContract(row); };
    const keyRow = (event, row) => { if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return; event.preventDefault(); onOpenContract(row); };

    const parentCell = (row) => {
        const key = statusKey(row);
        if (key === CD_STATUS.ACTIVE || key === CD_STATUS.PROCESSING) return <span data-parent={ key }>{ translation(CD_STATUS_LABEL_KEYS[key]) }</span>;
        const end = row.contract_end || row.cancellation_date;
        const reason = row.completion_reason || row.cancellation_reason;
        const title = `${ translation("key_contract") } ${ translation(CD_STATUS_LABEL_KEYS[key]) }${ end ? ` ${ formatDate(end) }` : "" }${ reason ? ` — ${ reason }` : "" } · ${ translation("key_cr_paos_unresolved") }`;
        return <span className="pdst"><span className="stcell tone-gray" data-parent={ key } title={ title }><span className="slbl"><b>{ translation(CD_STATUS_LABEL_KEYS[key]) }</b></span>{ end && <span className="sago">{ formatDate(end) }</span> }</span></span>;
    };
    const cell = (column, row) => {
        const c = row.paosCase || row.paos_case || {};
        switch (column.key) {
            case "name": return <span className="wid"><span className="nm-btn noopen mc-person-name mc-truncate" title={ row.worker_name }>{ row.worker_name }</span></span>;
            case "code": return row.worker_code ? <span className="ref noopen mc-code-plain">{ row.worker_code }</span> : <span className="ref noopen mc-unavailable">{ EM_DASH }</span>;
            case "employer": return row.employer_name ? <span className="wid"><span className="nm-btn noopen mc-person-name mc-truncate" title={ row.employer_name }>{ row.employer_name }</span></span> : <span className="na">{ EM_DASH }</span>;
            case "start": return <span className="mono">{ row.contract_start ? formatDate(row.contract_start) : (statusKey(row) === CD_STATUS.PROCESSING ? translation("key_cr_paos_not_arrived") : EM_DASH) }</span>;
            case "parent": return parentCell(row);
            case "branch": return row.branch_name ? <span className="soft">{ row.branch_name }</span> : <span className="na">{ EM_DASH }</span>;
            case "owner": return row.cs_owner_name ? <span>{ row.cs_owner_name }</span> : <span className="na">{ EM_DASH }</span>;
            case "paos": { const k = paosKey(row.paos_progress || c.progress); return <span className="pdst"><span className={ `stcell tone-${ CD_PAOS_TONE[k] || "teal" }` } data-paos={ k }><span className="slbl">{ paosLabel(k) }</span></span></span>; }
            case "session": return (
                <span className="pdst">
                    <span className="mono">{ c.session_date ? `${ formatDate(c.session_date) }${ c.session_time ? ` ${ String(c.session_time).slice(0, 5) }` : "" }` : EM_DASH }</span>
                    { c.booking_ref && <span className="dt">{ translation("key_cr_paos_booking") } { c.booking_ref }</span> }
                </span>
            );
            case "venue": return c.venue ? <span className="mc-truncate" title={ c.venue }>{ c.venue }</span> : <span className="na">{ EM_DASH }</span>;
            case "cert": return triOf(c.certificate_received) === CR_PAOS_TRI.YES ? <span className="mono">{ c.certificate_ref || translation("key_received") }</span> : <span className="na">{ EM_DASH }</span>;
            default: return null;
        }
    };

    const showEmpty = !loading && !error && result.rows.length === 0;
    return (
        <>
            <div className="fcard" data-filters="" data-paos-roster-filters="">
                <div className="frow" data-frow="1">
                    <FilterSelect id="pr-f-progress" label={ translation("key_paos_progress") } value={ filters.progress } options={ withAll(progressOptions) } onChange={ setFilter("progress") } menuWidth={ 230 } />
                    { branchOptions.length > 0 && <FilterSelect id="pr-f-branch" label={ translation("key_branch") } value={ filters.branch } options={ withAll(branchOptions) } onChange={ setFilter("branch") } menuWidth={ 220 } /> }
                    <FilterSelect id="pr-f-owner" label={ translation("key_cs_owner") } value={ filters.owner } options={ withAll(ownerOptions) } onChange={ setFilter("owner") } menuWidth={ 220 } />
                    <span className="fwrap fdate"><label className="flbl" htmlFor="pr-f-from">{ translation("key_session_from") } ·</label><DateInput id="pr-f-from" name="pr-f-from" value={ filters.from } onChange={ setFilter("from") } /></span>
                    <span className="fwrap fdate"><label className="flbl" htmlFor="pr-f-to">{ translation("key_session_to") } ·</label><DateInput id="pr-f-to" name="pr-f-to" value={ filters.to } onChange={ setFilter("to") } min={ filters.from || undefined } /></span>
                    <FilterSelect id="pr-f-processing" label={ translation("key_processing") } value={ filters.processing } options={ processingOptions } onChange={ setFilter("processing") } menuWidth={ 290 } />
                    <button type="button" className="fclear" onClick={ clear }>{ translation("key_clear_filters") }</button>
                </div>
            </div>
            <div className="tablecard" data-paos-roster="">
                <div className="tscroll" data-tscroll="" aria-busy={ loading }>
                    <table className={ `wtable mc-tracks${ loading && result.rows.length ? " refreshing" : "" }` } style={ tableStyle } aria-label={ translation("key_cd_paos_roster_title") }>
                        <thead>
                            <tr>
                                { columns.map((column) => (
                                    <th key={ column.key } className={ column.sticky ? `sticky ${ column.sticky }` : undefined } style={ listingTrackStyle(column) } aria-sort="none">
                                        <span className="thwrap"><span className="thlbl">{ translation(column.labelKey) }</span></span>
                                    </th>
                                )) }
                            </tr>
                        </thead>
                        <tbody>
                            { loading && result.rows.length === 0 && <tr><td className="empty" colSpan={ columns.length }>{ translation("key_loading") }…</td></tr> }
                            { !loading && error && result.rows.length === 0 && (
                                <tr><td className="empty" colSpan={ columns.length }>{ translation("key_couldnt_load_this_view") }<span><Btn variant="secondary" onClick={ () => setTick((n) => n + 1) }><Icon name="refresh" size={ 13 } /> { translation("key_retry") }</Btn></span></td></tr>
                            ) }
                            { showEmpty && (
                                <tr><td className="empty" colSpan={ columns.length }>{ translation("key_cr_paos_roster_empty") }<span><button type="button" className="fclear" onClick={ clear }>{ translation("key_clear_filters") }</button></span></td></tr>
                            ) }
                            { result.rows.map((row) => {
                                const key = statusKey(row);
                                return (
                                    <tr key={ row.id } data-row-open={ row.id } data-closed-parent={ key === CD_STATUS.COMPLETED || key === CD_STATUS.CANCELLED ? key : undefined } tabIndex={ 0 }
                                        aria-label={ `${ translation("key_cd_open_contract_details") } — ${ row.worker_name || "" }` } onClick={ (e) => openRow(e, row) } onKeyDown={ (e) => keyRow(e, row) }>
                                        { columns.map((column) => <td key={ column.key } className={ column.sticky ? `sticky ${ column.sticky }` : undefined } style={ listingTrackStyle(column) }>{ cell(column, row) }</td>) }
                                    </tr>
                                );
                            }) }
                        </tbody>
                    </table>
                </div>
                <div className="tfoot">
                    <span className="footcount">{ result.total } { translation("key_of") } { result.applicable } { translation("key_cr_paos_applicable") }</span>
                    { pages > 1 && (
                        <div className="pager">
                            <button type="button" disabled={ page <= 1 } aria-label={ translation("key_cd_previous_page") } onClick={ () => setPage(page - 1) }><Icon name="chev_left" size={ 12 } /></button>
                            <span className="pg">{ translation("key_page") } { page } / { pages }</span>
                            <button type="button" disabled={ page >= pages } aria-label={ translation("key_cd_next_page") } onClick={ () => setPage(page + 1) }><Icon name="chev_right" size={ 12 } /></button>
                        </div>
                    ) }
                </div>
            </div>
            <p className="roster-help">{ translation("key_paos_roster_note") }</p>
        </>
    );
};

PaosRoster.propTypes = {
    branchOptions: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.string.isRequired, label: PropTypes.string.isRequired })).isRequired,
    onOpenContract: PropTypes.func.isRequired,
};

export default React.memo(PaosRoster);
