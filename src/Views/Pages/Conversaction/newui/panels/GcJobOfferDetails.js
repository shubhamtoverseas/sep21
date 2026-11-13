import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import translation from "../../../../../utils/translation";
import { fetchJobWorkerList, fetchJobDetail } from "../../../../../redux/Slices/job-offer/JobOfferSlice";
import { getJobOfferPermissions } from "../../../../../utils/permissions/jobPermissionsUtils";
import { getPermissionValue } from "../../../../../services/commonService";
import GcIcon from "../gcIcons";
import Icon from "../../../../../components/Icon/Icon";
import "../../../JobOfferPage/newui/record/job-offer-record.css";
import GcEntityCodeLink from "../GcEntityCodeLink";
import JoStatusTag from "../../../JobOfferPage/newui/JoStatusTag";
import JoIcon from "../../../JobOfferPage/newui/joIcons";
import JoActionMenu from "../../../JobOfferPage/newui/record/JoActionMenu";
import { applicantActions, followUpContextOf } from "../../../JobOfferPage/newui/record/joApplicantActions";
import { joStatusLabel } from "../../../JobOfferPage/newui/JoStatusTag";
import joStageLabel from "../../../JobOfferPage/newui/joStageLabel";
import GcPanelDenied from "./GcPanelDenied";
import { gcCanOpenDetails, gcDetailsPath } from "../gcHelpers";
import {
    JO_ACTION, JO_APPLICANT_COPY, JO_HIDDEN_ROW_STAGES, JO_INTERVIEW_CELL_FORMAT, JO_INTERVIEW_METHOD, JO_RECORD_COPY, JO_RECORD_STAGE_IDS, JO_STAGE, stageClassOf,
} from "../../../JobOfferPage/jobOfferConstants";
import RecordFollowUp from "../../../../../components/follow-up/RecordFollowUp";
import { CAL_FROM_JOB_OFFER, CAL_TASK_SOURCE, CAL_TASK_SOURCE_LABEL, FU_COPY_KEY } from "../../../Calendar/newui/calendarConstants";
import { PAGE_LIMIT, WORKER_TYPE_FILTERS, OUTCOME_FILTERS } from "../gcConstants";

/* + Suggest opens the ONE shared Suggest Workers modal (S-01): same component and saved state as Job Offer Details */
const JobOfferSuggestModal = lazy(() => import("../../../JobOfferPage/newui/suggest/JobOfferSuggestModal"));

/* the six stage chips in lifecycle order (U-0129 / U-0133) — the one registry the standalone page uses; ids stay strings for the `job_stage` request key */
const GC_STAGE_STRIP = JO_RECORD_STAGE_IDS.map((id) => ({ id: String(id), ...JO_STAGE[id] }));

/* Interview Details = the applicable method icon, date and time only (D-JO-ACT-01); the standalone cell treatment */
const interviewPrimary = (row) => {
    const iv = row?.interview;
    if (!iv?.interview_date) return "";
    const dt = iv.interview_time ? dayjs(`${ iv.interview_date } ${ iv.interview_time }`) : dayjs(iv.interview_date);
    return dt.isValid() ? dt.format(iv.interview_time ? JO_INTERVIEW_CELL_FORMAT : "D MMM") : "";
};
const interviewMethod = (row) => JO_INTERVIEW_METHOD[Number(row?.worker_interview_type ?? row?.interview?.interview_type)] || null;

/* Chat hosts the interview actions (useGcInterviewActions) and the row Follow Up; the standalone-only record flows
   (Start Group Chat, New Contract Invoice, Change Interpreter, Unarchive) stay on Job Offer Details — the shared
   treatment is visual, not capability parity (IMPLEMENTATION_WORK "Job Offer applicant list capabilities") */
const chatHandles = (item) => item.id.startsWith("e_") || item.id === JO_ACTION.FOLLOW_UP;

const GcJobOfferDetails = ({ frame, onPush, onAction, refreshNonce, onOpenTeamChat }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [suggestOpen, setSuggestOpen] = useState(false);
    const job = frame.job || {};
    const isFocusView = frame.view === "jo-app-details";
    const focusId = isFocusView ? frame.focusApplicantId : null;
    const [stageSel, setStageSel] = useState(null);
    const [limit, setLimit] = useState(PAGE_LIMIT);
    const [retryNonce, setRetryNonce] = useState(0);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [typeFilters, setTypeFilters] = useState([]);
    const [outcomeSel, setOutcomeSel] = useState(null);
    const [menu, setMenu] = useState(null);
    /* the launcher's `openWith` — a row Follow Up opens the same sheet (and count) with the applicant context */
    const openFollowUpWith = useRef(null);
    const filtersRef = useRef(null);

    useEffect(() => {
        if (!filtersOpen) return undefined;
        const onDocClick = (e) => {
            if (filtersRef.current && !filtersRef.current.contains(e.target)) setFiltersOpen(false);
        };
        document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, [filtersOpen]);

    const { jobofferWorkerList, totalJobWorkers, jobOfferStatus, jobDetailView, permissionList, ownerOnboardingList, currentEmployer } = useSelector((state) => ({
        jobofferWorkerList: state.jobOffer.jobofferWorkerList,
        totalJobWorkers: state.jobOffer.totalJobWorkers,
        jobOfferStatus: state.jobOffer.status,
        jobDetailView: state.jobOffer.jobDetailView,
        permissionList: state.users.permissionList,
        ownerOnboardingList: state.users.ownerOnboardingList,
        currentEmployer: state.employer.currentEmployer,
    }), shallowEqual);

    /* Fresh counts/meta from the job detail once it matches this job;
     * the list-item snapshot fills in until then. */
    const liveJob = String(jobDetailView?.id) === String(job.id) ? jobDetailView : null;
    const jobField = (key) => liveJob?.[key] ?? job[key];
    /* Openers without employer context (group-chat header) get it from the
     * fetched detail. */
    const employerId = job.employer_id ?? liveJob?.employer_id;

    const isOwnerOfJob = typeof liveJob?.is_owner === "boolean" ? liveJob.is_owner : undefined;
    const perms = useMemo(
        () => getJobOfferPermissions(permissionList, ownerOnboardingList, employerId, isOwnerOfJob),
        [permissionList, ownerOnboardingList, employerId, isOwnerOfJob]
    );
    /* Follow Up (1 Oct Job Offer #2): in the applicant-listing pane beside the Applicant View control, never inside the applicant-facing job body */
    const employerName = jobField("employers_fullname") || job.employer_fullname || job.employer_name || "";
    const statusLabel = joStatusLabel(jobField("status"));
    const followUpSource = useMemo(() => ({
        type: CAL_TASK_SOURCE.JOB_OFFER, id: job.id, ref: job.reference_id || "", sub: [employerName, statusLabel].filter(Boolean).join(" · "),
        kindLabel: CAL_TASK_SOURCE_LABEL.job_offer, facts: { employer_name: employerName || null, status: statusLabel || null }, from: CAL_FROM_JOB_OFFER,
    }), [job.id, job.reference_id, employerName, statusLabel]);

    /* Per-row interview-report gate (the standalone `reportOwnershipForRow`): cs/interpreter ownership plus the non-owner override flags */
    const reportFlags = useMemo(() => ({
        csNonOwner: getPermissionValue(permissionList?.data, "jo_cs_non_owner", "jo_cs_non_owner_interview_report"),
        interpreterNonOwner: getPermissionValue(permissionList?.data, "worker_interpreter_onboarding_non_owner", "worker_interpreter_onboarding_non_owner_interview_report"),
    }), [permissionList?.data]);
    const actionsFor = useCallback((row) => applicantActions(row, perms, reportFlags).filter(chatHandles), [perms, reportFlags]);

    /* the worker code inside the Suggest modal is navigable only where Worker Details already is */
    const canOpenWorker = useMemo(() => gcCanOpenDetails("worker", permissionList), [permissionList]);
    const openWorkerFromSuggest = useCallback((row) => {
        const path = gcDetailsPath("worker", row?.id, { jobOfferId: job.id });
        if (path) navigate(path);
    }, [navigate, job.id]);
    const refreshAfterSuggest = useCallback(() => {
        setRetryNonce((n) => n + 1);
        if (job.id) dispatch(fetchJobDetail(job.id));
    }, [dispatch, job.id]);
    const suggestEmployer = currentEmployer && String(currentEmployer.employer_id ?? currentEmployer.id) === String(employerId) ? currentEmployer : null;

    useEffect(() => {
        const outcome = OUTCOME_FILTERS.find((o) => o.id === outcomeSel);
        const payload = { job_id: job.id, job_stage: stageSel || "", page: 1, limit: isFocusView ? 100 : limit };
        if (outcome?.server) Object.assign(payload, outcome.server);
        dispatch(fetchJobWorkerList(payload));
    }, [dispatch, job.id, stageSel, limit, refreshNonce, retryNonce, outcomeSel, isFocusView]);

    /* Stage counts come from the single-job detail API (get-job-detail now
     * returns the *_stages_count fields), so counts refresh after an action
     * without reloading the employer's whole JO list. A 401 / 403 on it is a denial (the standalone Job Offer Details rule). */
    const [detailDenied, setDetailDenied] = useState(false);
    useEffect(() => {
        if (!job.id) return;
        setDetailDenied(false);
        dispatch(fetchJobDetail(job.id)).then((res) => {
            const code = res?.error ? Number(res?.payload?.data?.status ?? res?.payload?.httpStatus ?? 0) : 0;
            setDetailDenied(code === 401 || code === 403);
        });
    }, [dispatch, job.id, refreshNonce]);

    const handleStage = useCallback((stageId) => {
        setLimit(PAGE_LIMIT);
        setOutcomeSel(null);
        setStageSel((prev) => (prev === stageId ? null : stageId));
    }, []);

    const handleTypeFilter = useCallback((value, checked) => {
        setTypeFilters((prev) => (checked ? [...prev, value] : prev.filter((v) => v !== value)));
    }, []);

    /* Single-select: server outcomes drive the job_stage request param, so
     * picking one clears the stage-strip selection (and vice versa). */
    const handleOutcomeFilter = useCallback((id, checked) => {
        setLimit(PAGE_LIMIT);
        const outcome = OUTCOME_FILTERS.find((o) => o.id === id);
        if (checked && outcome?.server) setStageSel(null);
        setOutcomeSel(checked ? id : null);
    }, []);

    const closeMenu = useCallback((refocus) => {
        setMenu((open) => { if (refocus && open?.trigger) open.trigger.focus(); return null; });
    }, []);
    /* a control click never fires the row action */
    const openMenu = useCallback((event, row, focusLast = false) => {
        event.stopPropagation();
        /* read the trigger NOW: React runs the updater later, when the synthetic event's currentTarget is already null,
           and a menu without a trigger never gets a position (data-ready stays false → hidden) */
        const trigger = event.currentTarget;
        setMenu((open) => (open?.row?.id === row.id ? null : { row, trigger, focusLast }));
    }, []);
    const runAction = useCallback((actionId, row) => {
        if (actionId === JO_ACTION.FOLLOW_UP) { openFollowUpWith.current?.(followUpContextOf(row)); return; }
        onAction(actionId, row, { jobId: job.id, jobRef: job.reference_id });
    }, [onAction, job.id, job.reference_id]);

    const openProfile = useCallback((worker) => onPush({
        view: "profile", workerId: worker.id, interpreter: worker.existing_interpreter, jobId: job.id, jobRef: job.reference_id, employerId, stageId: worker.job_stage_status_id,
        isOwner: isOwnerOfJob,
    }), [onPush, job.id, job.reference_id, employerId, isOwnerOfJob]);
    const openApplicantView = useCallback(() => onPush({ view: "jo-worker-view", jobId: job.id, jobRef: job.reference_id }), [onPush, job.id, job.reference_id]);

    /* Invited / Suggested rows never render here (D-JO-INV-01); Applied onward belongs to this list */
    let allRows = (jobofferWorkerList || []).filter((row) => !JO_HIDDEN_ROW_STAGES.includes(Number(row?.job_stage_status_id)));
    if (focusId) {
        allRows = allRows.filter((row) => String(row.id) === String(focusId) || String(row.job_stage_id) === String(focusId));
    }
    let rows = typeFilters.length
        ? allRows.filter((row) => typeFilters.some((t) => String(row.type_display || "").toLowerCase().includes(t.toLowerCase())))
        : allRows;
    const activeOutcome = OUTCOME_FILTERS.find((o) => o.id === outcomeSel);
    if (activeOutcome?.match) {
        rows = rows.filter((row) => activeOutcome.match(String(row.job_stage_status_name || "").toLowerCase()));
    }
    const filterCount = typeFilters.length + (outcomeSel ? 1 : 0);
    const branch = jobField("branch_display_name") || jobField("branch_name") || null;
    const starts = jobField("asap") === 1 ? JO_RECORD_COPY.asap : (jobField("start_date") ? dayjs(jobField("start_date")).format("D MMM YYYY") : null);
    const dash = <b className="mc-unavailable">—</b>;

    /* Job Offer Details follows the standalone record's denial (refused load, or a loaded record without Details View); the
       applicant view of a group's own Job Offer is refused only by the server, as in the prototype */
    if (detailDenied || (!isFocusView && liveJob && !perms.canViewDetails)) return <GcPanelDenied />;

    return (
        <>
            <div className="gc-jod-head">
                <div className="gc-jod-row1">
                    { /* the record's own identifier is neutral text (CR l.153); Applicant View is the control */ }
                    <span className="gc-ecl-neutral gc-jod-ref" data-mc-plain-job-offer-ref="true">{ job.reference_id }</span>
                    <JoStatusTag status={ jobField("status") } />
                    { !isFocusView && (
                        <span className="gc-jod-row1-actions">
                            <RecordFollowUp source={ followUpSource } granted={ perms.canFollowUp }>
                                { ({ count, open, openWith, launcherRef }) => {
                                    openFollowUpWith.current = openWith;
                                    return (
                                        <button ref={ launcherRef } type="button" className="gc-btn gc-btn-secondary sm inline" title={ translation(FU_COPY_KEY.followUp) } aria-haspopup="dialog" data-fu-launcher="chat-job-offer" onClick={ open }>
                                            { translation(FU_COPY_KEY.followUp) }
                                            { count > 0 && <span className="fu-count" data-fu-count={ count }>{ count }</span> }
                                        </button>
                                    );
                                } }
                            </RecordFollowUp>
                            <button type="button" className="gc-btn gc-btn-secondary sm inline gc-applicant-view-btn" title={ JO_RECORD_COPY.applicantView } onClick={ openApplicantView }>
                                <Icon name="eye" size={ 14 } />{ JO_RECORD_COPY.applicantView }
                            </button>
                        </span>
                    ) }
                </div>
                { isFocusView ? (
                    <div className="gc-jod-row2">
                        { translation("key_cs_owner") }:{ " " }
                        { jobField("cs_owner_user_id") && onOpenTeamChat ? (
                            <button
                                type="button"
                                className="gc-owner-text gc-owner-btn"
                                title={ translation("key_open_team_chat") }
                                onClick={ () => onOpenTeamChat({ user_id: jobField("cs_owner_user_id"), name: jobField("cs_name") }, null, { jobId: job.id }) }
                            >
                                { jobField("cs_name") || "—" }
                            </button>
                        ) : (
                            <span className="gc-owner-text">{ jobField("cs_name") || "—" }</span>
                        ) }
                        <span className="gc-dot" />
                        <span className="gc-jod-meta">
                            { translation("key_starts") } <b>{ starts || "—" }</b>
                        </span>
                    </div>
                ) : (
                    /* the compact fact row: Starts │ days open · views │ branch (the standalone header, U-0137 typography) */
                    <div className="gc-jod-row2 gc-jod-facts" data-gc-jod-meta="true">
                        <span className="gc-jod-meta"><span className="gc-jod-lbl">{ translation("key_starts") }</span> <b>{ starts || "—" }</b></span>
                        <span className="gc-jod-vsep" aria-hidden="true" />
                        <span className="gc-jod-meta"><b>{ jobField("days_open") ?? "—" }</b> { translation("key_days_open_lc") } · <b>{ jobField("view_count") ?? "—" }</b> { translation("key_views_lc") }</span>
                        <span className="gc-jod-vsep" aria-hidden="true" />
                        <span className="gc-jod-meta gc-jod-loc"><Icon name="pin" size={ 13 } />{ branch ? <b>{ branch } { JO_RECORD_COPY.office }</b> : dash }</span>
                    </div>
                ) }
            </div>
            { suggestOpen && (
                <Suspense fallback={ null }>
                    <JobOfferSuggestModal
                        jobId={ job.id }
                        detail={ liveJob }
                        employer={ suggestEmployer }
                        perms={ perms }
                        canOpenWorker={ canOpenWorker }
                        onOpenWorker={ openWorkerFromSuggest }
                        onClose={ () => setSuggestOpen(false) }
                        onChanged={ refreshAfterSuggest }
                    />
                </Suspense>
            ) }
            { !isFocusView && (
            <>
            <div className="gc-stage-strip">
                { GC_STAGE_STRIP.map((stage) => (
                    <button
                        key={ stage.id }
                        type="button"
                        className={ `gc-stage-seg ${ stageSel === stage.id ? "sel" : "" }` }
                        aria-pressed={ stageSel === stage.id }
                        onClick={ () => handleStage(stage.id) }
                    >
                        <span className={ `gc-sdot2 gc-dot-${ stage.className }` } />
                        { joStageLabel(stage.id) }
                        <span className="gc-n">{ jobField(stage.countKey) ?? 0 }</span>
                    </button>
                )) }
            </div>
            { /* Filters and Suggest are left-aligned below the stage controls (CR l.163) */ }
            <div className="gc-filters-bar">
                <div className="gc-filters-wrap" ref={ filtersRef }>
                    <button type="button" className="gc-filters-btn" aria-haspopup="true" aria-expanded={ filtersOpen } onClick={ () => setFiltersOpen((v) => !v) }>
                        <GcIcon name="sliders" />{ translation("key_filters") }
                        { filterCount > 0 && <span className="gc-filter-count">{ filterCount }</span> }
                    </button>
                    { filtersOpen && (
                        <div className="gc-filters-pop">
                            <div className="gc-fp-group">{ translation("key_worker_type") }</div>
                            { WORKER_TYPE_FILTERS.map((type) => (
                                <label className="gc-fp-opt" key={ type }>
                                    <input
                                        type="checkbox"
                                        checked={ typeFilters.includes(type) }
                                        onChange={ (e) => handleTypeFilter(type, e.target.checked) }
                                    />
                                    { translation(type === "Local" ? "key_local" : "key_overseas") }
                                </label>
                            )) }
                            <div className="gc-fp-group">{ translation("key_outcome") }</div>
                            { OUTCOME_FILTERS.map((outcome) => (
                                <label className="gc-fp-opt" key={ outcome.id }>
                                    <input
                                        type="checkbox"
                                        checked={ outcomeSel === outcome.id }
                                        onChange={ (e) => handleOutcomeFilter(outcome.id, e.target.checked) }
                                    />
                                    { translation(outcome.labelKey) }
                                </label>
                            )) }
                        </div>
                    ) }
                </div>
                { perms.canSuggestWorker && (
                    <button type="button" className="gc-btn gc-btn-primary sm inline" aria-haspopup="dialog" aria-expanded={ suggestOpen } title={ translation("key_suggest_workers") } onClick={ () => setSuggestOpen(true) }>
                        <GcIcon name="plus" />{ JO_APPLICANT_COPY.suggest }
                    </button>
                ) }
                { typeFilters.map((type) => (
                    <span className="gc-applied-chip" key={ type }>
                        { translation(type === "Local" ? "key_local" : "key_overseas") }
                        <button type="button" onClick={ () => handleTypeFilter(type, false) } aria-label={ translation('key_gc_remove_filter') }>
                            <GcIcon name="close" />
                        </button>
                    </span>
                )) }
                { outcomeSel && (
                    <span className="gc-applied-chip">
                        { translation(OUTCOME_FILTERS.find((o) => o.id === outcomeSel)?.labelKey) }
                        <button type="button" onClick={ () => handleOutcomeFilter(outcomeSel, false) } aria-label={ translation('key_gc_remove_filter') }>
                            <GcIcon name="close" />
                        </button>
                    </span>
                ) }
            </div>
            </>
            ) }
            { jobOfferStatus === "failed" && rows.length === 0 ? (
                <div className="gc-panel-error">
                    <GcIcon name="warn" />
                    <div>{ translation("key_couldnt_load_this_view") }</div>
                    <button
                        type="button"
                        className="gc-btn gc-btn-secondary sm inline"
                        onClick={ () => setRetryNonce((n) => n + 1) }
                    >
                        { translation("key_retry") }
                    </button>
                </div>
            ) : jobOfferStatus === "loading" && rows.length === 0 ? (
                <div className="gc-panel-skel">
                    <div className="gc-skel" style={ { width: "100%", height: 34 } } />
                    <div className="gc-skel" style={ { width: "100%", height: 34 } } />
                    <div className="gc-skel" style={ { width: "100%", height: 34 } } />
                    <div className="gc-skel" style={ { width: "70%", height: 34 } } />
                </div>
            ) : rows.length === 0 ? (
                <div className="gc-list-empty">{ translation("key_no_applicants_match_filters") }</div>
            ) : (
                <>
                    <div className="gc-dt-wrap">
                        <table className="gc-dt gc-chat-applicants" aria-label={ translation("key_applicants") }>
                            <thead>
                                <tr>
                                    <th className="gc-c-name">{ translation("key_worker_name") }</th>
                                    <th className="gc-c-ref">{ translation("key_worker_code") }</th>
                                    <th className="gc-c-stage">{ translation("key_stage") }</th>
                                    <th className="gc-c-iv">{ translation("key_interview_details") }</th>
                                    { !isFocusView && <th className="gc-c-action">{ translation("key_action") }</th> }
                                </tr>
                            </thead>
                            <tbody>
                                { rows.map((worker) => {
                                    const items = isFocusView ? [] : actionsFor(worker);
                                    const primary = interviewPrimary(worker);
                                    const method = interviewMethod(worker);
                                    return (
                                    <tr
                                        key={ worker.id }
                                        data-appl={ worker.id }
                                        tabIndex={ 0 }
                                        role="button"
                                        aria-label={ `${ JO_APPLICANT_COPY.select } ${ worker.name || "" }` }
                                        onClick={ (e) => { if (!e.target.closest("button,a")) openProfile(worker); } }
                                        onKeyDown={ (e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openProfile(worker); } } }
                                    >
                                        <td><span className="gc-dt-name">{ worker.name }</span></td>
                                        <td>
                                            <GcEntityCodeLink kind="worker" id={ worker.id } code={ worker.reference_id } titleKey="key_worker_details" jobOfferId={ job.id } />
                                        </td>
                                        <td>
                                            <span className={ `gc-stage-pill gc-sp-${ stageClassOf(Number(worker.job_stage_status_id)) }` }>
                                                { worker.job_stage_status_name }
                                            </span>
                                            { worker.is_archived === 1 && <span className="gc-chip-plain gc-archived">{ translation("key_archived") }</span> }
                                        </td>
                                        <td>
                                            { primary ? (
                                                <span className="gc-iv-when">
                                                    { method && <span className="gc-iv-ic" role="img" title={ translation(method.key) } aria-label={ translation(method.key) }><JoIcon name={ method.icon } size={ 14 } /></span> }
                                                    <span className="gc-iv-primary">{ primary }</span>
                                                </span>
                                            ) : <span className="gc-iv-primary mc-unavailable" aria-label={ JO_APPLICANT_COPY.noInterview }>—</span> }
                                        </td>
                                        { !isFocusView && (
                                            <td className="gc-c-action">
                                                <button
                                                    type="button"
                                                    className="gc-iv-btn gc-action-btn"
                                                    aria-haspopup="menu"
                                                    aria-controls={ menu?.row?.id === worker.id ? "jor-menu" : undefined }
                                                    aria-expanded={ menu?.row?.id === worker.id }
                                                    aria-label={ `${ JO_APPLICANT_COPY.actionsFor } ${ worker.name || "" }` }
                                                    data-mc-actions={ items.length ? undefined : "none" }
                                                    onClick={ (event) => openMenu(event, worker) }
                                                    onKeyDown={ (event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); openMenu(event, worker, event.key === "ArrowUp"); } } }
                                                >
                                                    { translation("key_action") }<Icon name="chev_down" size={ 13 } />
                                                </button>
                                            </td>
                                        ) }
                                    </tr>
                                    );
                                }) }
                            </tbody>
                        </table>
                    </div>
                    { !isFocusView && (
                    <div className="gc-dt-foot">
                        { translation("key_showing") } { rows.length } { translation("key_of") } { totalJobWorkers || rows.length } { translation("key_applicants") }
                        <span style={ { flex: 1 } } />
                        { allRows.length < (totalJobWorkers || 0) && (
                            <button type="button" className="gc-foot-btn" onClick={ () => setLimit((l) => l + PAGE_LIMIT) }>
                                { translation("key_load_more") }
                            </button>
                        ) }
                    </div>
                    ) }
                </>
            ) }
            { menu && (
                <JoActionMenu
                    items={ actionsFor(menu.row) }
                    trigger={ menu.trigger }
                    label={ menu.row.name || "" }
                    focusLast={ menu.focusLast }
                    onPick={ (id) => { const { row } = menu; closeMenu(true); runAction(id, row); } }
                    onClose={ closeMenu }
                />
            ) }
        </>
    );
};

GcJobOfferDetails.propTypes = {
    frame: PropTypes.object.isRequired,
    onPush: PropTypes.func.isRequired,
    onAction: PropTypes.func.isRequired,
    refreshNonce: PropTypes.number,
    onOpenTeamChat: PropTypes.func,
};

export default React.memo(GcJobOfferDetails);
