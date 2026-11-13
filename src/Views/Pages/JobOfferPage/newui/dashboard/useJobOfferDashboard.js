import { JO_DASH_RESTRICTED_ROW_CAP } from "../../jobOfferConstants";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchJobOffers } from "../../../../../redux/Slices/job-offer/JobOfferSlice";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { getActorDefaultLocationId } from "../../../../../services/commonService";
import { SEARCH_DEBOUNCE_MS } from "../../../../../components/ReusableComponents/constants";
import debounce from "../../../../../utils/debounce";
import { JO_DASH_DEFAULT_FILTERS, JO_DASH_VIEW_STATE_KEY } from "../../jobOfferConstants";
import { buildJobListPayload, createdPresetToRange, hasActiveFilters, sanitizeSavedFilters } from "./jobOfferDashboardConfig";

const readViewState = () => { try { return JSON.parse(sessionStorage.getItem(JO_DASH_VIEW_STATE_KEY) || 'null'); } catch { return null; } };
const writeViewState = (state) => { try { sessionStorage.setItem(JO_DASH_VIEW_STATE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } };
const clearViewState = () => { try { sessionStorage.removeItem(JO_DASH_VIEW_STATE_KEY); } catch { /* storage unavailable */ } };

const useJobOfferDashboard = ({ searchEnabled = true, restricted = false } = {}) => {
    const dispatch = useDispatch();
    const { jobOffers, totalPages, totalJobOffers, lastUpdated, statusCounts } = useSelector((state) => state.jobOffer);
    const defaultLocation = useMemo(() => String(getActorDefaultLocationId() || ''), []);
    const defaults = useMemo(() => ({ ...JO_DASH_DEFAULT_FILTERS, location: defaultLocation }), [defaultLocation]);

    /* the saved view is restored only on a return from a Job Offer opened from this list (prototype adapter); any other
       arrival starts from the defaults */
    const saved = useMemo(() => { const state = readViewState(); return state?.rowId ? state : null; }, []);
    const [filters, setLocalFilters] = useState(() => (saved?.filters ? { ...defaults, ...sanitizeSavedFilters(saved.filters) } : defaults));
    const [searchInput, setSearchInput] = useState(saved?.searchInput || '');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadNonce, setReloadNonce] = useState(0);
    const requestSeq = useRef(0);
    const returnRow = useRef(saved?.rowId || null);

    const patch = useCallback((change) => setLocalFilters((prev) => ({ ...prev, ...change })), []);

    /* searched from the first character (Chinese names match on one character, SEARCH §2.2.1) */
    const debouncedSearch = useMemo(() => debounce((value) => patch({ search_text: value.trim(), page: 1 }), SEARCH_DEBOUNCE_MS), [patch]);
    useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

    const onSearchChange = useCallback((value) => { setSearchInput(value); debouncedSearch(value); }, [debouncedSearch]);

    const setFilter = useCallback((key, value) => {
        if (key === 'created') { patch({ created: value, ...createdPresetToRange(value), page: 1 }); return; }
        if (key === 'location') { patch({ location: value, branch_location: [], page: 1 }); return; }
        patch({ [key]: value, page: 1 });
    }, [patch]);
    const setCustomCreatedRange = useCallback((from, to) => patch({ created: 'custom', from_date: from, to_date: to, page: 1 }), [patch]);

    const toggleStatusCard = useCallback((id) => {
        setLocalFilters((prev) => {
            const only = prev.status.length === 1 && String(prev.status[0]) === String(id);
            return { ...prev, status: only ? [] : [String(id)], page: 1 };
        });
    }, []);

    const toggleSort = useCallback((key) => {
        setLocalFilters((prev) => {
            if (prev.sort_by === key && prev.sort_order === 'DESC') return { ...prev, sort_by: '', sort_order: '', page: 1 };
            return { ...prev, sort_by: key, sort_order: prev.sort_by === key && prev.sort_order === 'ASC' ? 'DESC' : 'ASC', page: 1 };
        });
    }, []);
    const setSortKey = useCallback((key) => patch({ sort_by: key, sort_order: key ? 'ASC' : '', page: 1 }), [patch]);

    /* Restricted Search Access caps the list at the first 10 accessible rows with no pagination (PERM §4.4) */
    const setPage = useCallback((page) => {
        if (restricted || page < 1 || page > Math.max(Number(totalPages) || 1, 1)) return;
        patch({ page });
    }, [patch, totalPages, restricted]);

    const clearFilters = useCallback(() => {
        debouncedSearch.cancel();
        setSearchInput('');
        setLocalFilters(defaults);
        clearViewState();
    }, [debouncedSearch, defaults]);

    useEffect(() => { writeViewState({ filters, searchInput, rowId: null }); }, [filters, searchInput]);
    const rememberOpenedRow = useCallback((rowId) => { writeViewState({ filters, searchInput, rowId: String(rowId), scrollY: window.scrollY }); }, [filters, searchInput]);
    const takeReturnRow = useCallback(() => { const id = returnRow.current; returnRow.current = null; return { rowId: id, scrollY: saved?.scrollY }; }, [saved?.scrollY]);

    const refresh = useCallback(() => setReloadNonce((n) => n + 1), []);

    useEffect(() => {
        const seq = ++requestSeq.current;
        setIsLoading(true);
        setError(null);
        const effective = { ...filters, ...(searchEnabled ? {} : { search_text: '' }), ...(restricted ? { limit: JO_DASH_RESTRICTED_ROW_CAP, page: 1 } : {}) };
        dispatch(fetchJobOffers(buildJobListPayload(effective)))
            .unwrap()
            .catch((err) => {
                if (seq !== requestSeq.current) return;
                const message = err?.data?.data?.message;
                setError(message || true);
                if (message) ShowToast('error', message);
            })
            .finally(() => { if (seq === requestSeq.current) setIsLoading(false); });
    }, [dispatch, filters, reloadNonce, searchEnabled, restricted]);

    const pageInfo = useMemo(() => {
        const total = Number(totalJobOffers) || 0;
        if (restricted) {
            const to = Math.min(JO_DASH_RESTRICTED_ROW_CAP, total);
            return { from: total ? 1 : 0, to, total, currentPage: 1, lastPage: 1, limit: JO_DASH_RESTRICTED_ROW_CAP, capped: total > JO_DASH_RESTRICTED_ROW_CAP };
        }
        const from = total ? (filters.page - 1) * filters.limit + 1 : 0;
        const to = total ? Math.min(filters.page * filters.limit, total) : 0;
        return { from, to, total, currentPage: Number(filters.page) || 1, lastPage: Math.max(Number(totalPages) || 1, 1), limit: filters.limit, capped: false };
    }, [filters.page, filters.limit, totalJobOffers, totalPages, restricted]);

    return {
        rows: Array.isArray(jobOffers) ? jobOffers : [],
        filters, searchInput, isLoading, error, lastUpdated, statusCounts, pageInfo, defaultLocation,
        isFiltered: hasActiveFilters(filters),
        onSearchChange, setFilter, setCustomCreatedRange, toggleStatusCard, toggleSort, setSortKey, setPage, clearFilters, refresh,
        rememberOpenedRow, takeReturnRow,
    };
};

export default useJobOfferDashboard;
