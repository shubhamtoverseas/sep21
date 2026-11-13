import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import {
    fetchChildCareAgeList, fetchChildCareDuties, fetchContractStatus, fetchCookingList, fetchCourseList, fetchDayOffList, fetchEducationList, fetchElderlyCareDuties,
    fetchGetGenderList, fetchMainSkills, fetchMaritalStatus, fetchReligionList, fetchSpokenLanguageList,
} from "../../../../../redux/Slices/common/CommonSlice";
import { fetchWorkerNationalities } from "../../../../../redux/Slices/common/nationalities/NationalitiesSlice";
import { fetchCountries } from "../../../../../redux/Slices/common/countries/CountriesSlice";
import { fetchWorkerRole } from "../../../../../redux/Slices/worker/WorkerSlice";
import { addSuggestWorker, findWorker } from "../../../../../redux/Slices/job-offer/JobOfferSlice";
import { getJobWorkerList } from "../../../../../services/jobOffers";
import { getCurrentUser, showErrorMessage } from "../../../../../services/commonService";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { SEARCH_DEBOUNCE_MS } from "../../../../../components/ReusableComponents/constants";
import debounce from "../../../../../utils/debounce";
import { JO_STAGE_ID, JO_SUGGEST_COPY, JO_SUGGEST_MODE, JO_SUGGEST_PAGE_LIMIT, jobOfferSuggestStateKey } from "../../jobOfferConstants";
import {
    activeCount, buildFindWorkerPayload, clearClosedDeps, defaultsFromJob, emptyFilters, isCleared, loadSuggestState, pageOf, sameFilters, saveSuggestState,
} from "./jobOfferSuggestConfig";

export const JO_SUGGEST_VIEW = Object.freeze({ SEARCH: 'search', SUGGESTED: 'suggested' });
const EMPTY_PAGE = { rows: [], currentPage: 1, totalPages: 1, total: 0 };

const useJobOfferSuggest = ({ jobId, detail, onChanged }) => {
    const dispatch = useDispatch();
    const storageKey = useMemo(() => jobOfferSuggestStateKey(getCurrentUser()?.data?.id, jobId), [jobId]);
    const joDefaults = useMemo(() => defaultsFromJob(detail), [detail]);

    const lists = useSelector((state) => ({
        spokenLanguages: state.common.spokenLanguages, genderList: state.common.genderList, contractStatus: state.common.contractStatus,
        mainSkills: state.common.mainSkills, courseList: state.common.courseList, educationList: state.common.educationList,
        maritalStatus: state.common.maritalStatus, religionList: state.common.religionList,
        cookingList: state.common.cookingList, dayOffList: state.common.dayOffList, childCareAgeList: state.common.childCareAgeList,
        childCareDuties: state.common.childCareDuties, elderlyCareDuties: state.common.elderlyCareDuties,
        workerRoles: state.worker.workerRoles, workerNationalities: state.nationalities.workerNationalities, countries: state.countries.countries,
    }), shallowEqual);
    useEffect(() => {
        dispatch(fetchWorkerRole());
        dispatch(fetchCookingList({ type: 'worker' }));
        dispatch(fetchDayOffList({ type: 'worker' }));
        dispatch(fetchChildCareAgeList({ type: 'worker' }));
        dispatch(fetchChildCareDuties({ type: 'worker' }));
        dispatch(fetchElderlyCareDuties({ type: 'worker' }));
        dispatch(fetchCountries({ type: 'worker' }));
        dispatch(fetchGetGenderList({ type: 'worker' }));
        dispatch(fetchSpokenLanguageList({ type: 'worker' }));
        dispatch(fetchContractStatus({ type: 'worker' }));
        dispatch(fetchMainSkills({ type: 'worker' }));
        dispatch(fetchCourseList({ type: 'worker' }));
        dispatch(fetchEducationList({ type: 'worker' }));
        dispatch(fetchMaritalStatus({ type: 'worker' }));
        dispatch(fetchReligionList({ type: 'worker' }));
        dispatch(fetchWorkerNationalities({ type: 'worker' }));
    }, [dispatch]);

    const [{ mode, filters }, setPersisted] = useState(() => {
        const saved = loadSuggestState(storageKey);
        if (saved) {
            return {
                mode: saved.mode === JO_SUGGEST_MODE.OVERSEAS ? JO_SUGGEST_MODE.OVERSEAS : JO_SUGGEST_MODE.LOCAL,
                filters: { ...emptyFilters(), ...(saved.filters || {}) },
            };
        }
        return { mode: JO_SUGGEST_MODE.LOCAL, filters: defaultsFromJob(detail) };
    });
    /* first use for this admin + Job Offer: the exact Job Offer-derived defaults are applied and saved — but only once the
       job detail is here (Chat opens the modal before `/get-job-detail` resolves); a change made before that wins instead */
    const firstSave = useRef(!loadSuggestState(storageKey));
    useEffect(() => {
        if (!firstSave.current || !detail) return;
        firstSave.current = false;
        const defaults = defaultsFromJob(detail);
        setPersisted((prev) => ({ mode: prev.mode, filters: defaults }));
        saveSuggestState(storageKey, { mode, filters: defaults });
    }, [detail, storageKey, mode]);

    const [view, setView] = useState(JO_SUGGEST_VIEW.SEARCH);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [page, setPage] = useState(1);
    /* search text (D-14) lives for the open modal only — never saved with the filters */
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearchApplied] = useState('');
    /* exact boolean matching with no minimum length (SUGGEST-CORRECTION): every settled query is sent after the debounce */
    const debouncedSearch = useMemo(() => debounce((value) => { setSearchApplied(value.trim()); setPage(1); }, SEARCH_DEBOUNCE_MS), []);
    useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);
    const setSearch = useCallback((value) => { setSearchInput(value); debouncedSearch(value); }, [debouncedSearch]);
    const [selected, setSelected] = useState({});
    const [profileId, setProfileId] = useState(null);
    const [results, setResults] = useState({ ...EMPTY_PAGE, loading: true, error: false });
    const [suggested, setSuggested] = useState({ ...EMPTY_PAGE, loading: true, error: false });
    const [suggestedPage, setSuggestedPage] = useState(1);
    const [nonce, setNonce] = useState(0);
    const [sending, setSending] = useState(false);
    /* the last bulk send's per-pair outcome (D-17) until dismissed or the next send */
    const [batch, setBatch] = useState(null);

    const persist = useCallback((next) => {
        firstSave.current = false;
        setPersisted(next);
        saveSuggestState(storageKey, next);
        setPage(1);
    }, [storageKey]);
    const setMode = useCallback((nextMode) => {
        if (nextMode === mode) return;
        persist({ mode: nextMode, filters });
        setSelected({});
        setProfileId(null);
    }, [mode, filters, persist]);
    /* dependent fields clear when their gate closes, so no filter can stay active while disabled */
    const setFilter = useCallback((key, value) => persist({ mode, filters: clearClosedDeps({ ...filters, [key]: value }) }), [mode, filters, persist]);
    const clearAll = useCallback(() => persist({ mode, filters: emptyFilters() }), [mode, persist]);
    const restore = useCallback(() => persist({ mode, filters: joDefaults }), [mode, joDefaults, persist]);

    const payload = useMemo(() => buildFindWorkerPayload({ filters, mode, jobId, page, search }), [filters, mode, jobId, page, search]);
    const requestSeq = useRef(0);
    useEffect(() => {
        const seq = ++requestSeq.current;
        setResults((prev) => ({ ...prev, loading: true, error: false }));
        dispatch(findWorker(payload)).then((res) => {
            if (seq !== requestSeq.current) return;
            if (res?.error) { setResults({ ...EMPTY_PAGE, loading: false, error: true }); return; }
            setResults({ ...pageOf(res?.payload?.data), loading: false, error: false });
        });
    }, [dispatch, payload, nonce]);

    useEffect(() => {
        let live = true;
        setSuggested((prev) => ({ ...prev, loading: true, error: false }));
        getJobWorkerList({ job_id: jobId, job_stage: JO_STAGE_ID.SUGGESTED, page: suggestedPage, limit: JO_SUGGEST_PAGE_LIMIT })
            .then((res) => { if (live) setSuggested({ ...pageOf(res?.data?.data?.data), loading: false, error: false }); })
            .catch(() => { if (live) setSuggested({ ...EMPTY_PAGE, loading: false, error: true }); });
        return () => { live = false; };
    }, [jobId, suggestedPage, nonce]);

    const profileRow = useMemo(() => {
        if (!results.rows.length) return null;
        return results.rows.find((r) => String(r.id) === String(profileId)) || results.rows[0];
    }, [results.rows, profileId]);

    const toggleSelected = useCallback((id) => setSelected((prev) => {
        const next = { ...prev };
        if (next[id]) delete next[id]; else next[id] = true;
        return next;
    }), []);
    const selectedIds = useMemo(() => Object.keys(selected), [selected]);

    const refetch = useCallback(() => setNonce((n) => n + 1), []);

    const send = useCallback(() => {
        if (!selectedIds.length || sending) return;
        setSending(true);
        setBatch(null);
        const named = Object.fromEntries(results.rows.map((row) => [String(row.id), row]));
        dispatch(addSuggestWorker({ worker_ids: selectedIds.map(Number), job_id: jobId })).then((res) => {
            setSending(false);
            if (res?.error) { showErrorMessage(res); return; }
            const result = res?.payload?.data;
            const sentIds = Array.isArray(result?.sent) ? result.sent.map(String) : selectedIds;
            const unsent = selectedIds.filter((id) => !sentIds.includes(id));
            if (!Array.isArray(result?.sent) || unsent.length === 0) {
                ShowToast('success', JO_SUGGEST_COPY.sent(sentIds.length));
                setSelected({});
            } else {
                /* per-pair outcome (workbook row 23): every skipped / failed worker with its reason; the unsent stay selected */
                const pair = (kind) => (item) => {
                    const id = String(item?.worker_id ?? item);
                    return { id, kind, reason: item?.reason || null, name: named[id]?.name || id, code: named[id]?.reference_id || null };
                };
                const rows = [
                    ...(Array.isArray(result?.skipped) ? result.skipped.map(pair('skipped')) : []),
                    ...(Array.isArray(result?.failed) ? result.failed.map(pair('failed')) : []),
                ];
                unsent.filter((id) => !rows.some((r) => r.id === id)).forEach((id) => rows.push(pair('failed')(id)));
                setBatch({ sent: sentIds.length, rows });
                if (!sentIds.length) ShowToast('error', JO_SUGGEST_COPY.noneSent);
                setSelected(Object.fromEntries(unsent.map((id) => [id, true])));
            }
            if (sentIds.includes(String(profileRow?.id))) setProfileId(null);
            refetch();
            onChanged?.();
        });
    }, [dispatch, selectedIds, sending, jobId, profileRow?.id, results.rows, refetch, onChanged]);
    const dismissBatch = useCallback(() => setBatch(null), []);

    const openView = useCallback((next) => { setView(next); setFiltersOpen(false); }, []);

    return {
        lists, mode, setMode, filters, setFilter, clearAll, restore,
        filterCount: activeCount(filters, mode),
        showClear: !isCleared(filters, mode),
        showRestore: Boolean(detail) && !sameFilters(filters, joDefaults, mode),
        filtersOpen, setFiltersOpen,
        searchInput, setSearch,
        view, openView,
        results, page, setPage,
        suggested, suggestedPage, setSuggestedPage,
        selected, selectedIds, toggleSelected,
        profileRow, setProfileId,
        send, sending, batch, dismissBatch, refetch,
    };
};

export default useJobOfferSuggest;
