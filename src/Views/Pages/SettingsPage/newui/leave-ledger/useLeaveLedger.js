import { useCallback, useEffect, useMemo, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import dayjs from "dayjs";
import { clearLedgerState, fetchLedger } from "../../../../../redux/Slices/settings/ledger/LedgerSlice";
import { fetchBranchUsers } from "../../../../../redux/Slices/settings/users/UsersSlice";
import { clearLeaveBalance, fetchLeaveBalance } from "../../../../../redux/Slices/settings/leaves/LeavesSlice";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import translation from "../../../../../utils/translation";
import { DEFAULT_PAGE_LIMIT, LEDGER_DEFAULT_RANGE_MONTHS, LEDGER_SORT_ORDER, LEDGER_USERS_QUERY, SORT_ORDER } from "../settingsNewUiConstants";

const API_DATE = "YYYY-MM-DD";

const selectLedger = (state) => ({
    rows: state.ledger.ledger,
    currentPage: state.ledger.currentPage,
    perPage: state.ledger.perPage,
    totalPages: state.ledger.totalPages,
    total: state.ledger.totalLedger,
    lastUpdated: state.ledger.lastUpdated,
    usersList: state.users.branchUsers,
    leaveBalance: state.leaves?.leaveBalance,
});

/** Ports ViewLeaveLedger.js: employee + date range → ledger rows and balance chips (fetched on Go). */
const useLeaveLedger = () => {
    const dispatch = useDispatch();
    const ledger = useSelector(selectLedger, shallowEqual);

    const [userId, setUserId] = useState("");
    const [fromDate, setFromDate] = useState(dayjs().subtract(LEDGER_DEFAULT_RANGE_MONTHS, "month").format(API_DATE));
    const [toDate, setToDate] = useState(dayjs().format(API_DATE));
    const [userError, setUserError] = useState("");
    const [sort, setSort] = useState({ by: "", order: "" });
    const [limit, setLimit] = useState(DEFAULT_PAGE_LIMIT);
    const [hasSearched, setHasSearched] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        dispatch(fetchBranchUsers(LEDGER_USERS_QUERY));
        dispatch(clearLedgerState());
        dispatch(clearLeaveBalance());
    }, [dispatch]);

    const buildParams = useCallback((overrides = {}) => {
        const params = { page: 1, limit, user_id: userId, ...overrides };
        if (fromDate) params.search_from_date = fromDate;
        if (toDate) params.search_to_date = toDate;
        if (sort.by) {
            params.sort_by = sort.by;
            params.sort_order = sort.order === SORT_ORDER.DESC ? LEDGER_SORT_ORDER.DESC : LEDGER_SORT_ORDER.ASC;
        }
        return params;
    }, [fromDate, toDate, limit, sort, userId]);

    const load = useCallback((overrides) => {
        setIsLoading(true);
        setError(null);
        return dispatch(fetchLedger(buildParams(overrides)))
            .unwrap()
            .catch((err) => {
                const message = err?.data?.data?.message || err?.message;
                setError(message || true);
                if (message) ShowToast("error", message);
            })
            .finally(() => setIsLoading(false));
    }, [dispatch, buildParams]);

    const onUserChange = useCallback((value) => {
        setUserId(value);
        if (value) setUserError("");
    }, []);

    const search = useCallback(() => {
        if (!userId) {
            setUserError(translation("key_this_field_is_required"));
            return;
        }
        setUserError("");
        setHasSearched(true);
        load({ page: 1 });
        dispatch(fetchLeaveBalance(userId));
    }, [dispatch, load, userId]);

    const setSortKey = useCallback((sortKey) => {
        setSort((prev) => {
            const next = { by: sortKey, order: prev.by === sortKey && prev.order === SORT_ORDER.ASC ? SORT_ORDER.DESC : SORT_ORDER.ASC };
            return next;
        });
    }, []);

    /* Sort and limit changes re-query only after a search has been run. */
    useEffect(() => {
        if (hasSearched) load({ page: 1 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sort, limit]);

    const setPage = useCallback((page) => {
        if (!hasSearched) return;
        if (page < 1 || page > Math.max(Number(ledger.totalPages) || 1, 1)) return;
        load({ page });
    }, [hasSearched, ledger.totalPages, load]);

    const pageInfo = useMemo(() => {
        const total = Number(ledger.total) || 0;
        const page = Number(ledger.currentPage) || 1;
        const perPage = Number(ledger.perPage) || limit;
        return {
            from: total ? (page - 1) * perPage + 1 : 0,
            to: total ? Math.min(page * perPage, total) : 0,
            total,
            currentPage: page,
            lastPage: Math.max(Number(ledger.totalPages) || 1, 1),
            limit: perPage,
        };
    }, [ledger.total, ledger.currentPage, ledger.perPage, ledger.totalPages, limit]);

    const balances = useMemo(
        () => (Array.isArray(ledger.leaveBalance?.data) ? ledger.leaveBalance.data : []),
        [ledger.leaveBalance]
    );

    return {
        lastUpdated: ledger.lastUpdated,
        users: Array.isArray(ledger.usersList) ? ledger.usersList : [],
        rows: Array.isArray(ledger.rows) ? ledger.rows : [],
        balances,
        userId,
        userError,
        fromDate,
        toDate,
        sort,
        pageInfo,
        hasSearched,
        isLoading,
        error,
        onUserChange,
        setFromDate,
        setToDate,
        search,
        setSortKey,
        setPage,
        setLimit,
    };
};

export default useLeaveLedger;
