import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { saveAs } from "file-saver";
import { jsonToXlsxBlob } from "../../../../../../utils/exportToExcel";
import { fetchActiveUsers } from "../../../../../../redux/Slices/settings/users/UsersSlice";
import { fetchRosterView } from "../../../../../../redux/Slices/settings/shift-code/ShiftCodeSlice";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { SEARCH_DEBOUNCE_MS } from "../../../../../../components/ReusableComponents/constants";
import debounce from "../../../../../../utils/debounce";
import translation from "../../../../../../utils/translation";
import { ROSTER_ACTIVE_USERS_QUERY, ROSTER_EXPORT_FILE_PREFIX, ROSTER_EXPORT_SHEET, ROSTER_SORT_ORDER, SORT_ORDER } from "../../settingsNewUiConstants";
import { buildDefaultRosterFilters, buildRosterPayload, toRosterExportRows } from "./rosterViewerConfig";

const selectRoster = (state) => ({
    rows: state.shiftCodes.rosterViewData,
    currentPage: state.shiftCodes.rosterViewCurrentPage,
    perPage: state.shiftCodes.rosterViewPerPage,
    totalPages: state.shiftCodes.rosterViewTotalPages,
    total: state.shiftCodes.rosterViewTotalShiftCodes,
    lastUpdated: state.shiftCodes.rosterViewLastUpdated,
});

/** Ports ShiftRosterViewerPage + Filter: users/date-range → Go, debounced search, sort, paging, export. */
const useRosterViewer = () => {
    const dispatch = useDispatch();
    const roster = useSelector(selectRoster, shallowEqual);

    const [filters, setFilters] = useState(buildDefaultRosterFilters);
    const [draftUserIds, setDraftUserIds] = useState([]);
    const [draftFromDate, setDraftFromDate] = useState(() => buildDefaultRosterFilters().from_date);
    const [draftToDate, setDraftToDate] = useState(() => buildDefaultRosterFilters().to_date);
    const [usersError, setUsersError] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [activeUsers, setActiveUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const requestSeq = useRef(0);

    useEffect(() => {
        dispatch(fetchActiveUsers(ROSTER_ACTIVE_USERS_QUERY)).then((res) => {
            if (!res?.error) setActiveUsers(res?.payload?.data || []);
        });
    }, [dispatch]);

    const load = useCallback((nextFilters) => {
        const seq = ++requestSeq.current;
        setIsLoading(true);
        setError(null);
        dispatch(fetchRosterView(buildRosterPayload(nextFilters)))
            .unwrap()
            .catch((err) => {
                if (seq !== requestSeq.current) return;
                const message = err?.data?.data?.message || err?.message;
                setError(message || true);
                if (message) ShowToast("error", message);
            })
            .finally(() => { if (seq === requestSeq.current) setIsLoading(false); });
    }, [dispatch]);

    const apply = useCallback((patch) => {
        setFilters((prev) => {
            const next = { ...prev, ...patch };
            load(next);
            return next;
        });
    }, [load]);

    useEffect(() => { load(buildDefaultRosterFilters()); }, [load]);

    const debouncedSearch = useMemo(() => debounce((value) => apply({ search: value, page: 1 }), SEARCH_DEBOUNCE_MS), [apply]);
    useEffect(() => () => debouncedSearch.cancel(), [debouncedSearch]);

    const onSearchChange = useCallback((value) => {
        setSearchInput(value);
        debouncedSearch(value);
    }, [debouncedSearch]);

    const onUsersChange = useCallback((ids) => {
        setDraftUserIds(ids);
        if (ids.length) setUsersError("");
    }, []);

    const go = useCallback(() => {
        if (!draftUserIds.length) {
            setUsersError(translation("key_this_field_is_required"));
            return;
        }
        setUsersError("");
        apply({ user_ids: draftUserIds, from_date: draftFromDate || "", to_date: draftToDate || "", page: 1 });
    }, [apply, draftUserIds, draftFromDate, draftToDate]);

    /* bug log #35 (fixed 2026-10-18): "Clear Filters" resets the inputs AND re-queries with the defaults (legacy kept the stale rows) */
    const clearFilters = useCallback(() => {
        debouncedSearch.cancel();
        const defaults = buildDefaultRosterFilters();
        setFilters(defaults);
        setDraftUserIds([]);
        setDraftFromDate(defaults.from_date);
        setDraftToDate(defaults.to_date);
        setUsersError("");
        setSearchInput("");
        load(defaults);
    }, [debouncedSearch, load]);

    const setSort = useCallback((sortKey) => {
        setFilters((prev) => {
            const order = prev.sort === sortKey && prev.order === ROSTER_SORT_ORDER.ASC ? ROSTER_SORT_ORDER.DESC : ROSTER_SORT_ORDER.ASC;
            const next = { ...prev, sort: sortKey, order };
            load(next);
            return next;
        });
    }, [load]);

    const setPage = useCallback((page) => {
        if (page < 1 || page > Math.max(Number(roster.totalPages) || 1, 1)) return;
        apply({ page });
    }, [apply, roster.totalPages]);

    const setLimit = useCallback((limit) => apply({ limit, page: 1 }), [apply]);

    const exportRows = useCallback(async () => {
        const rows = Array.isArray(roster.rows) ? roster.rows : [];
        if (!rows.length) return;
        const blob = await jsonToXlsxBlob(toRosterExportRows(rows), ROSTER_EXPORT_SHEET);
        saveAs(blob, `${ROSTER_EXPORT_FILE_PREFIX}${dayjs().format("YYYY-MM-DD")}.xlsx`);
    }, [roster.rows]);

    const userOptions = useMemo(
        () => activeUsers.map((user) => ({ value: user.value ?? user.user_id ?? user.id, label: user.label ?? user.name })),
        [activeUsers]
    );

    const pageInfo = useMemo(() => {
        const total = Number(roster.total) || 0;
        const page = Number(roster.currentPage) || 1;
        const perPage = Number(roster.perPage) || filters.limit;
        return {
            from: total ? (page - 1) * perPage + 1 : 0,
            to: total ? Math.min(page * perPage, total) : 0,
            total,
            currentPage: page,
            lastPage: Math.max(Number(roster.totalPages) || 1, 1),
            limit: perPage,
        };
    }, [roster.total, roster.currentPage, roster.perPage, roster.totalPages, filters.limit]);

    return {
        lastUpdated: roster.lastUpdated,
        rows: Array.isArray(roster.rows) ? roster.rows : [],
        userOptions,
        draftUserIds,
        draftFromDate,
        draftToDate,
        usersError,
        searchInput,
        sortBy: filters.sort,
        sortOrder: filters.order === ROSTER_SORT_ORDER.DESC ? SORT_ORDER.DESC : (filters.order ? SORT_ORDER.ASC : ""),
        pageInfo,
        isLoading,
        error,
        onSearchChange,
        onUsersChange,
        setDraftFromDate,
        setDraftToDate,
        go,
        clearFilters,
        setSort,
        setPage,
        setLimit,
        exportRows,
        refresh: () => load(filters),
    };
};

export default useRosterViewer;
