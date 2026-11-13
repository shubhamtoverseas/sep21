import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import Icon from "../../../../../components/Icon/Icon";
import Btn from "../../../../../components/ui/Btn";
import CustomSpinner from "../../../../../components/ReusableComponents/CustomSpinner";
import useOutsideClick from "../../../../../hooks/useOutsideClick";
import { fetchJobWorkerList } from "../../../../../redux/Slices/job-offer/JobOfferSlice";
import translation from "../../../../../utils/translation";
import JoIcon from "../joIcons";
import JoActionMenu from "./JoActionMenu";
import joStageLabel from "../joStageLabel";
import {
    JO_APPLICANT_COPY, JO_APPLICANT_FILTERS, JO_APPLICANT_PAGE_LIMIT, JO_APPLICANT_SORT, JO_APPLICANT_SORT_API, applicantStageIds, visibleApplicantRows,
    JO_INTERVIEW_CELL_FORMAT, JO_INTERVIEW_METHOD, JO_SORT_COPY, JO_SORT_NEXT, JO_STAGE, applicantStageBadge,
} from "../../jobOfferConstants";

/* sorting is server-side (backend D-SORT): the whole applicant set, not the loaded page */
const sortPayload = (sort) => (sort.key && sort.dir ? { sort_by: JO_APPLICANT_SORT_API[sort.key], sort_order: sort.dir.toUpperCase() } : {});
const sortName = (label, active, dir) => (!active ? `${ JO_SORT_COPY.by } ${ label }, ${ JO_SORT_COPY.asc }` : dir === 'asc' ? `${ JO_SORT_COPY.by } ${ label }, ${ JO_SORT_COPY.desc }` : JO_SORT_COPY.clear);
const ariaSort = (active, dir) => (!active ? 'none' : dir === 'asc' ? 'ascending' : 'descending');

const interviewPrimary = (row) => {
    const iv = row?.interview;
    if (!iv?.interview_date) return '';
    const dt = iv.interview_time ? dayjs(`${ iv.interview_date } ${ iv.interview_time }`) : dayjs(iv.interview_date);
    return dt.isValid() ? dt.format(iv.interview_time ? JO_INTERVIEW_CELL_FORMAT : 'D MMM') : '';
};
const interviewMethod = (row) => JO_INTERVIEW_METHOD[Number(row?.worker_interview_type ?? row?.interview?.interview_type)] || null;

const JoApplicantList = ({ jobId, detail, canSuggest, showInvited = false, selectedId, selectionResolved = true, onSelect, onOpenSuggest, actionsFor, onAction, refreshNonce, canOpenWorker, onOpenWorker }) => {
    const dispatch = useDispatch();
    const { rows: apiRows, total, status, currentPage, totalPages } = useSelector((state) => ({
        rows: state.jobOffer.jobofferWorkerList,
        total: state.jobOffer.totalJobWorkers,
        status: state.jobOffer.status,
        currentPage: Number(state.jobOffer.jobWorkerCurrentPage) || 1,
        totalPages: state.jobOffer.jobWorkerTotalPages,
    }), shallowEqual);

    const [stage, setStage] = useState(null);
    const [filterId, setFilterId] = useState(null);
    const [sort, setSort] = useState({ key: null, dir: null });
    const [page, setPage] = useState(1);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [menu, setMenu] = useState(null);
    const filtersRef = useRef(null);
    const tbodyRef = useRef(null);
    useOutsideClick(filtersRef, () => setFiltersOpen(false), filtersOpen);

    const filter = JO_APPLICANT_FILTERS.find((f) => f.id === filterId) || null;
    const requestStage = filter?.stage ?? stage ?? '';

    useEffect(() => {
        dispatch(fetchJobWorkerList({ job_id: jobId, job_stage: requestStage, page, limit: JO_APPLICANT_PAGE_LIMIT, ...(filter?.payload || {}), ...sortPayload(sort) }));
    }, [dispatch, jobId, requestStage, page, filter, sort, refreshNonce]);

    /* U-0133: Invited rows show only for a viewer holding Worker Chat — Invited; Suggested rows never show here */
    const stageIds = useMemo(() => applicantStageIds(showInvited), [showInvited]);
    const rows = useMemo(() => visibleApplicantRows(apiRows, showInvited), [apiRows, showInvited]);

    /* the selection follows the loaded rows: a remembered id (return from Edit / Worker Details) resolves to its row once */
    useEffect(() => {
        if (status === 'loading') return;
        const hit = rows.find((row) => String(row.id) === String(selectedId));
        if (hit) { if (!selectionResolved) onSelect(hit); }
        else if (rows.length) onSelect(rows[0]);
        else if (selectedId != null) onSelect(null);
    }, [rows, selectedId, selectionResolved, onSelect, status]);

    const counts = useMemo(() => Object.fromEntries(stageIds.map((id) => [id, Number(detail?.[JO_STAGE[id].countKey]) || 0])), [detail, stageIds]);
    const eligibleTotal = stageIds.reduce((sum, id) => sum + counts[id], 0);

    const pickStage = useCallback((id) => {
        setStage((prev) => (prev === id ? null : id));
        setFilterId((prev) => (JO_APPLICANT_FILTERS.find((f) => f.id === prev)?.stage ? null : prev));
        setPage(1);
    }, []);
    const pickFilter = useCallback((id) => {
        setFilterId((prev) => (prev === id ? null : id));
        setStage(null);
        setPage(1);
        setFiltersOpen(false);
    }, []);
    const clearStage = useCallback(() => {
        const prevStage = stage;
        setStage(null); setFilterId(null); setPage(1);
        /* prototype: after clearing, focus returns to the chip that was filtered */
        if (prevStage != null) requestAnimationFrame(() => document.querySelector(`[data-stage-chip="${ prevStage }"]`)?.focus());
    }, [stage]);

    const toggleSort = useCallback((key) => {
        setSort((prev) => {
            const next = prev.key === key ? JO_SORT_NEXT[prev.dir] ?? null : 'asc';
            return next ? { key, dir: next } : { key: null, dir: null };
        });
        setPage(1);
    }, []);

    const focusRow = useCallback((id) => {
        const tr = tbodyRef.current?.querySelector(`tr[data-appl="${ id }"]`);
        if (tr) { tr.focus({ preventScroll: true }); tr.scrollIntoView({ block: 'nearest' }); }
    }, []);

    const onRowKey = useCallback((event, row) => {
        if (event.target.closest('button,a')) return;
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(row); return; }
        const isDown = event.key === 'ArrowDown' || event.key === 'j';
        const isUp = event.key === 'ArrowUp' || event.key === 'k';
        if (!isDown && !isUp) return;
        event.preventDefault();
        const index = rows.findIndex((r) => String(r.id) === String(row.id));
        const nextIndex = isDown ? Math.min(rows.length - 1, index + 1) : Math.max(0, index - 1);
        const next = rows[nextIndex];
        if (next) { onSelect(next); focusRow(next.id); }
    }, [rows, onSelect, focusRow]);

    const closeMenu = useCallback((refocus) => {
        setMenu((open) => { if (refocus && open?.trigger) open.trigger.focus(); return null; });
    }, []);
    /* a control click never fires the row action (CR l.152): opening the menu leaves the selection alone */
    const openMenu = useCallback((event, row, focusLast = false) => {
        event.stopPropagation();
        /* read the trigger NOW: React runs the updater later, when the synthetic event's currentTarget is already null,
           and a menu without a trigger never gets a position (data-ready stays false → hidden) */
        const trigger = event.currentTarget;
        setMenu((open) => (open?.row?.id === row.id ? null : { row, trigger, focusLast }));
    }, []);

    const th = (label, key, cls) => {
        const active = Boolean(key && sort.key === key && sort.dir);
        const name = key ? sortName(label, active, sort.dir) : null;
        return (
            <th className={ `${ cls || '' }${ active ? ' sorted' : '' }` } aria-sort={ key ? ariaSort(active, sort.dir) : undefined }>
                <span className="thwrap">
                    <span className="thlbl">{ label }</span>
                    { key && (
                        <button type="button" className="thsort" aria-label={ name } title={ name } onClick={ () => toggleSort(key) }>
                            <Icon name={ active ? (sort.dir === 'desc' ? 'sort_desc' : 'sort_asc') : 'sort' } size={ 10 } />
                        </button>
                    ) }
                </span>
            </th>
        );
    };

    const activeStageChip = filter?.stage && stageIds.includes(filter.stage) ? filter.stage : stage;
    const filterLabel = filter ? ` · ${ translation(filter.key) }` : '';

    return (
        <div className="jor-listing">
            <div className="jor-filterbar" role="group" aria-label={ JO_APPLICANT_COPY.filterByStage }>
                <div className="pipechips">
                    { stageIds.map((id) => {
                        const on = activeStageChip === id;
                        const label = joStageLabel(id);
                        return (
                            <button key={ id } type="button" className={ `chip${ on ? ' on' : '' }` } data-stage-chip={ id } aria-pressed={ on } aria-label={ `${ label }, ${ counts[id] } ${ JO_APPLICANT_COPY.applicants }` } onClick={ () => pickStage(id) }>
                                <span className={ `sdot stage-${ JO_STAGE[id].className }` } />{ label }<span className="n">{ counts[id] }</span>
                            </button>
                        );
                    }) }
                </div>
                <div className="fr">
                    <div className="jor-filters-wrap" ref={ filtersRef }>
                        <button type="button" className={ `fclear${ filter ? ' on' : '' }` } aria-haspopup="true" aria-expanded={ filtersOpen } onClick={ () => setFiltersOpen((open) => !open) }>
                            <JoIcon name="sliders" size={ 13 } />{ JO_APPLICANT_COPY.filters }{ filter ? <span className="n">1</span> : null }
                        </button>
                        { filtersOpen && (
                            <div className="jor-filters-pop" role="group" aria-label={ JO_APPLICANT_COPY.filters }>
                                { JO_APPLICANT_FILTERS.map((entry) => (
                                    <button key={ entry.id } type="button" className={ `opt${ filterId === entry.id ? ' on' : '' }` } aria-pressed={ filterId === entry.id } onClick={ () => pickFilter(entry.id) }>
                                        { translation(entry.key) }
                                    </button>
                                )) }
                            </div>
                        ) }
                    </div>
                    { canSuggest && (
                        <Btn variant="primary" className="jor-suggest" aria-haspopup="dialog" title={ translation('key_suggest_workers') } onClick={ onOpenSuggest }>
                            <Icon name="plus" size={ 14 } /> { JO_APPLICANT_COPY.suggest }
                        </Btn>
                    ) }
                </div>
            </div>

            <div className="jor-tablecard" aria-label={ JO_APPLICANT_COPY.pipeline }>
                <div className="tscroll">
                    <table className="wtable" data-mc-listing-variant="simple">
                        <thead>
                            <tr>
                                { th(translation('key_worker_name'), JO_APPLICANT_SORT.NAME, 'wname') }
                                { th(translation('key_worker_code'), JO_APPLICANT_SORT.CODE) }
                                { th(translation('key_stage'), JO_APPLICANT_SORT.STAGE) }
                                { th(translation('key_interview_details'), null) }
                                { th(translation('key_action'), null, 'c-act') }
                            </tr>
                        </thead>
                        <tbody ref={ tbodyRef }>
                            { status === 'loading' && rows.length === 0 && (
                                <tr><td className="empty" colSpan={ 5 }><CustomSpinner /></td></tr>
                            ) }
                            { status !== 'loading' && rows.length === 0 && (
                                <tr><td className="empty" colSpan={ 5 }><span>{ JO_APPLICANT_COPY.noApplicants }</span></td></tr>
                            ) }
                            { rows.map((row) => {
                                const selected = String(row.id) === String(selectedId);
                                const primary = interviewPrimary(row);
                                const method = interviewMethod(row);
                                const items = actionsFor(row);
                                return (
                                    <tr
                                        key={ row.id }
                                        data-appl={ row.id }
                                        className={ selected ? 'sel' : undefined }
                                        tabIndex={ selected ? 0 : -1 }
                                        aria-current={ selected ? 'true' : undefined }
                                        aria-label={ `${ JO_APPLICANT_COPY.select } ${ row.name || '' }` }
                                        onClick={ (event) => { if (!event.target.closest('button,a') && !window.getSelection()?.toString()) onSelect(row); } }
                                        onKeyDown={ (event) => onRowKey(event, row) }
                                    >
                                        <td className="wname"><span className="nm mc-person-name">{ row.name || '—' }</span></td>
                                        <td>
                                            { row.reference_id ? (
                                                canOpenWorker
                                                    ? <button type="button" className="mc-link-code" title={ `${ JO_APPLICANT_COPY.openWorker } ${ row.reference_id }` } onClick={ (event) => { event.stopPropagation(); onOpenWorker(row); } }>{ row.reference_id }</button>
                                                    : <span className="mc-code-plain" data-mc-plain-worker-code="true">{ row.reference_id }</span>
                                            ) : <span className="mc-unavailable">—</span> }
                                        </td>
                                        <td>
                                            { (() => { const badge = applicantStageBadge(row); const label = badge.labelKey ? translation(badge.labelKey) : badge.label; return (
                                                <span className={ `stbadge stage-${ badge.className }` } data-stage-tag={ label } data-applicant-stage={ row.applicant_stage || undefined }>
                                                    { label }
                                                </span>
                                            ); })() }
                                            { /* Archive is a tag on the card, not a stage (JO.md §7.1) */ }
                                            { row.is_archived === 1 && <span className="wd-tag archived">{ translation('key_archived') }</span> }
                                        </td>
                                        <td>
                                            { primary ? (
                                                <span className="ivd">
                                                    { method && <span role="img" title={ translation(method.key) } aria-label={ translation(method.key) }><JoIcon name={ method.icon } size={ 14 } /></span> }
                                                    <span>{ primary }</span>
                                                </span>
                                            ) : <span className="na" aria-label={ JO_APPLICANT_COPY.noInterview }>—</span> }
                                        </td>
                                        <td className="c-act">
                                            <button
                                                type="button"
                                                className="wd-btn"
                                                aria-haspopup="menu"
                                                aria-controls={ menu?.row?.id === row.id ? 'jor-menu' : undefined }
                                                aria-expanded={ menu?.row?.id === row.id }
                                                aria-label={ `${ JO_APPLICANT_COPY.actionsFor } ${ row.name || '' }` }
                                                data-mc-actions={ items.length ? undefined : 'none' }
                                                onClick={ (event) => openMenu(event, row) }
                                                onKeyDown={ (event) => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); openMenu(event, row, event.key === 'ArrowUp'); } } }
                                            >
                                                { translation('key_action') }<Icon name="chev_down" size={ 13 } />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) }
                        </tbody>
                    </table>
                </div>
                <div className="tfoot">
                    { activeStageChip || filter ? (
                        <span className="footcount">
                            { JO_APPLICANT_COPY.filteredTo } <b>{ activeStageChip ? joStageLabel(activeStageChip) : translation(filter.key) }</b>{ activeStageChip ? filterLabel : '' } · <button type="button" className="linkbtn" onClick={ clearStage }>{ activeStageChip ? JO_APPLICANT_COPY.clearStage : JO_APPLICANT_COPY.clearFilter }</button>
                        </span>
                    ) : (
                        <span className="footcount">{ JO_APPLICANT_COPY.showing } <b>{ rows.length }</b> { JO_APPLICANT_COPY.of } <b>{ eligibleTotal || total || 0 }</b> { JO_APPLICANT_COPY.applicants }</span>
                    ) }
                    { totalPages > 1 && (
                        <span className="pager">
                            <Btn variant="ghost" disabled={ currentPage <= 1 } onClick={ () => setPage(currentPage - 1) }>{ JO_APPLICANT_COPY.previous }</Btn>
                            <span className="mono">{ currentPage } / { totalPages }</span>
                            <Btn variant="ghost" disabled={ currentPage >= totalPages } onClick={ () => setPage(currentPage + 1) }>{ JO_APPLICANT_COPY.next }</Btn>
                        </span>
                    ) }
                </div>
            </div>

            { menu && (
                <JoActionMenu
                    items={ actionsFor(menu.row) }
                    trigger={ menu.trigger }
                    label={ menu.row.name || '' }
                    focusLast={ menu.focusLast }
                    onPick={ (id) => { const { row } = menu; closeMenu(true); onAction(id, row); } }
                    onClose={ closeMenu }
                />
            ) }
        </div>
    );
};

JoApplicantList.propTypes = {
    jobId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    detail: PropTypes.object,
    canSuggest: PropTypes.bool,
    /* U-0133: the viewer holds Worker Chat — Invited → the Invited chip and rows are shown */
    showInvited: PropTypes.bool,
    selectedId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    /* false while `selectedId` is only a remembered id (return state) and the host has no row object yet */
    selectionResolved: PropTypes.bool,
    onSelect: PropTypes.func.isRequired,
    onOpenSuggest: PropTypes.func,
    actionsFor: PropTypes.func.isRequired,
    onAction: PropTypes.func.isRequired,
    refreshNonce: PropTypes.number,
    canOpenWorker: PropTypes.bool,
    onOpenWorker: PropTypes.func.isRequired,
};

export default React.memo(JoApplicantList);
