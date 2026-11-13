import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { fetchWorkerMainActivityLog } from "../../../../../redux/Slices/worker/WorkerSlice";
import { fetchEmployerActivityLog } from "../../../../../redux/Slices/employer/EmployerSlice";
import NewUiSelect from "../../../../../components/newui-select/NewUiSelect";
import "react-calendar/dist/Calendar.css";
import "../../../../../components/date-range-picker/date-range-picker-theme.css";
import translation from "../../../../../utils/translation";
import { normalizeActorName } from "../../../../../utils/utils";
import { API_DATE_FORMAT, ACTOR_OPTIONS, ACTIVITY_RANGE_PRESETS, WKD_ACTIVITY_INTENTS, WKD_ACTIVITY_REMARK_EDITED, WKD_ACTIVITY_TARGET_JOB_OFFER } from "../../workerModuleConstants";
import { JO_FROM, jobOfferDetailsPath } from "../../../JobOfferPage/jobOfferConstants";
import "./wkd-listings.css";

const presetRange = (preset) => {
    const days = ACTIVITY_RANGE_PRESETS.find((p) => p.value === preset)?.days;
    if (!days) return { start_date: "", end_date: "" };
    const today = dayjs().startOf("day");
    return { start_date: today.subtract(days - 1, "day").format(API_DATE_FORMAT), end_date: today.format(API_DATE_FORMAT) };
};

const splitActor = (raw) => {
    const m = String(raw || '').match(/^(.*?)\s*\(([^)]*)\)\s*$/);
    return m
        ? { name: normalizeActorName(m[1]), role: m[2] }
        : { name: normalizeActorName(String(raw || '')), role: '' };
};
/* W-36: an entry's Job Offer target renders as a link when the API resolved its id (the reference inside the message
   becomes the link; appended when the message does not name it); other target types stay text until they have a route */
const activityMessage = (activity, from) => {
    const message = activity?.message || '';
    const ref = activity?.target_ref;
    if (!ref || activity?.target_type !== WKD_ACTIVITY_TARGET_JOB_OFFER || !activity?.target_id) return message;
    const link = <Link className="activity-target" to={ jobOfferDetailsPath(activity.target_id, from) }>{ ref }</Link>;
    const at = message.indexOf(ref);
    if (at === -1) return <>{ message } · { link }</>;
    return <>{ message.slice(0, at) }{ link }{ message.slice(at + ref.length) }</>;
};

dayjs.extend(utc);

const hasZone = (v) => /(?:z|[+-]\d{2}:?\d{2})$/i.test(String(v || ''));
const fmtClock = (v) => (hasZone(v) ? dayjs(v) : dayjs.utc(v)).format("HH:mm");
/* `json_data` arrives as an object or a JSON string; anything else reads as no detail */
const jsonDataOf = (activity) => {
    const raw = activity?.json_data;
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return null; }
};
const remarkChange = (activity) => {
    if (activity?.type !== WKD_ACTIVITY_REMARK_EDITED) return null;
    const d = jsonDataOf(activity);
    if (!d || (d.old == null && d.new == null)) return null;
    return { old: String(d.old ?? ''), next: String(d.new ?? '') };
};

const WkdActivityTab = ({ worker_id, entity }) => {
    const dispatch = useDispatch();
    const isEmployer = entity?.name === 'employer';
    const entityId = isEmployer ? entity?.id : worker_id;
    /* Employer audit D-07: a Job Offer opened from the employer's Activity returns to Employer Details, not Worker Details */
    const joFrom = isEmployer ? JO_FROM.EMPLOYER : JO_FROM.WORKER;
    const [selectedPeriod, setSelectedPeriod] = useState("alltime");
    const [isSearching, setIsSearching] = useState(false);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [allActivities, setAllActivities] = useState({});
    const listRef = useRef(null);
    const loadingRef = useRef(false);

    const [searchFilter, setSearchFilter] = useState({
        limit: 10,
        actor: "",
        start_date: "",
        end_date: "",
    });

    const fetchActivities = useCallback((filter, pageNum, reset = false) => {
        if (reset) {
            setIsSearching(true);
        } else {
            setLoading(true);
            loadingRef.current = true;
        }

        setLoadError(false);
        const request = { ...filter, page: pageNum, limit: filter.limit || 10 };
        Object.keys(request).forEach((key) => { if (request[key] === "") delete request[key]; });
        const action = isEmployer
            ? fetchEmployerActivityLog({ ...request, employer_id: entityId, module_key: "employer" })
            : fetchWorkerMainActivityLog({ ...request, worker_id, module_key: "worker" });
        dispatch(action).then((res) => {
            if (res?.error) {
                setLoadError(true);
                return;
            }
            const logs = res?.payload?.data?.logs || {};
            const pagination = res?.payload?.data?.pagination;

            setAllActivities((prev) => {
                if (reset || pageNum === 1) return logs;
                const merged = { ...prev };
                Object.keys(logs).forEach((date) => {
                    if (merged[date]) {
                        merged[date] = [...merged[date], ...logs[date]];
                    } else {
                        merged[date] = logs[date];
                    }
                });
                return merged;
            });

            const currentPage = pagination?.current_page || pageNum;
            const lastPage = pagination?.last_page || 1;
            setHasMore(currentPage < lastPage);
        }).finally(() => {
            setIsSearching(false);
            setLoading(false);
            loadingRef.current = false;
        });
    }, [dispatch, worker_id, isEmployer, entityId]);

    useEffect(() => {
        if (entityId) {
            fetchActivities(searchFilter, 1, true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityId]);

    useEffect(() => {
        if (page > 1) {
            fetchActivities(searchFilter, page);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    const handleScroll = useCallback(() => {
        if (!listRef.current || loadingRef.current || !hasMore) return;
        const { scrollTop, scrollHeight, clientHeight } = listRef.current;
        if (scrollHeight - scrollTop - clientHeight < 50) {
            loadingRef.current = true;
            setPage((prev) => prev + 1);
        }
    }, [hasMore]);

    useEffect(() => {
        const ref = listRef.current;
        if (ref) {
            ref.addEventListener('scroll', handleScroll);
            return () => ref.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    const applyFilter = useCallback((patch) => {
        const updatedFilter = { ...searchFilter, ...patch };
        setSearchFilter(updatedFilter);
        setPage(1);
        setHasMore(true);
        setAllActivities({});
        fetchActivities(updatedFilter, 1, true);
    }, [searchFilter, fetchActivities]);

    const handleActorChange = useCallback((value) => {
        applyFilter({ actor: value });
    }, [applyFilter]);

    /* U-0329 (10 Nov package): only the approved supported ranges — the custom-range calendar is removed */
    const handleRangeChange = useCallback((value) => {
        setSelectedPeriod(value);
        applyFilter(presetRange(value));
    }, [applyFilter]);

    const actorOptions = useMemo(() => ACTOR_OPTIONS(), []);

    const rangeOptions = useMemo(
        () => ACTIVITY_RANGE_PRESETS.map((p) => ({ value: p.value, label: translation(p.labelKey) })),
        []
    );

    const sortedActivityDates = useMemo(() => {
        if (!allActivities) return [];
        return Object.keys(allActivities).sort((a, b) => new Date(b) - new Date(a));
    }, [allActivities]);

    return (
        <div className="activity-screen">
            <div className="activity-card">
                <div className="activity-filters">
                    <NewUiSelect
                        label={ translation('key_actor') }
                        value={ searchFilter.actor }
                        options={ actorOptions }
                        onChange={ handleActorChange }
                        className="activity-dropdown"
                    />
                    <div className="date-range-container wkd-activity-range">
                        <NewUiSelect
                            label={ translation('key_wkr_date_range') }
                            value={ selectedPeriod }
                            options={ rangeOptions }
                            onChange={ handleRangeChange }
                            className="activity-dropdown"
                        />
                    </div>
                </div>
                <div className="activity-body wkd-activity-scroll" ref={ listRef }>
                    { isSearching ? (
                        <div className="ctx-state" data-context-state="loading">
                            <span className="ctx-spinner" />
                            <strong>{ translation('key_wkr_loading_activity') }</strong>
                            { /* the worker-scoped sentence is the Worker record's (Employer audit D-06) */ }
                            { !isEmployer && <span>{ translation('key_wkr_retrieving_the_worker_scoped_audit_history') }</span> }
                        </div>
                    ) : sortedActivityDates.length > 0 ? (
                        sortedActivityDates.map((date) => (
                            <div key={ date } className="activity-day">
                                <div className="activity-day-label">{ dayjs(date).format("DD MMM YYYY") }</div>
                                <div className="activity-line">
                                    { allActivities[date]?.map((activity, index) => (
                                        <div key={ `${ date }-${ index }` } className="activity-entry">
                                            { /* dot colour follows the entry's intent when the API sends one (proto activityEntryHTML); neutral otherwise */ }
                                            <span className="activity-dot" data-intent={ WKD_ACTIVITY_INTENTS.includes(activity?.intent) ? activity.intent : undefined } />
                                            <div className="activity-event">{ activityMessage(activity, joFrom) }</div>
                                            { (() => { const c = remarkChange(activity); return c ? <div className="activity-change"><s>{ c.old }</s><span aria-hidden="true"> → </span><span>{ c.next }</span></div> : null; })() }
                                            <div className="activity-meta">
                                                { activity?.log_created_by && (() => {
                                                    const actor = splitActor(activity.log_created_by);
                                                    const role = activity.actor_role || actor.role;
                                                    return (
                                                        <>
                                                            { translation('key_by') } <span className="activity-actor-name">{ actor.name }</span>
                                                            { role && <span className="activity-actor-role"> { role }</span> }
                                                            <span> · </span>
                                                        </>
                                                    );
                                                })() }
                                                <time>{ fmtClock(activity?.created_at) }</time>
                                            </div>
                                        </div>
                                    )) }
                                </div>
                            </div>
                        ))
                    ) : loadError ? (
                        <div className="ctx-state" data-context-state="error">
                            <span className="ctx-state-icon">!</span>
                            <strong>{ translation('key_wkr_activity_could_not_be_loaded') }</strong>
                            <span>{ translation('key_wkr_no_source_event_was_changed') }</span>
                            <button type="button" className="ctx-btn secondary" onClick={ () => fetchActivities(searchFilter, 1, true) }>
                                { translation('key_retry') }
                            </button>
                        </div>
                    ) : (
                        <div className="ctx-state" data-context-state="empty">
                            <span className="ctx-state-icon">—</span>
                            <strong>{ translation('key_wkr_no_activity_matches_this_date_range') }</strong>
                            <span>{ translation('key_wkr_try_a_wider_date_range_or_a') }</span>
                        </div>
                    ) }
                    { loading && <div className="wkd-activity-loading">{ translation('key_loading') }…</div> }
                    { /* a page-N failure is reported under the rows already shown, with its own Retry (SR-06) */ }
                    { !loading && loadError && sortedActivityDates.length > 0 && (
                        <div className="wkd-activity-pageerr" role="alert">
                            <span>{ translation('key_wkr_activity_could_not_be_loaded') }</span>
                            <button type="button" className="ctx-btn secondary" onClick={ () => fetchActivities(searchFilter, page) }>
                                { translation('key_retry') }
                            </button>
                        </div>
                    ) }
                </div>
            </div>
        </div>
    );
};

WkdActivityTab.propTypes = {
    worker_id: PropTypes.any,
    entity: PropTypes.shape({ name: PropTypes.string, id: PropTypes.any }),
};

export default React.memo(WkdActivityTab);
