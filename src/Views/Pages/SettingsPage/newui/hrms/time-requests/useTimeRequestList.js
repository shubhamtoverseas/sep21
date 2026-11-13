import { useCallback, useEffect, useMemo, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { clearMessage, fetchTimeRequests, withdrawTimeRequest } from "../../../../../../redux/Slices/settings/time-request/TimeRequestSlice";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { dispatchWithHandling } from "../../../../../../utils/dispatchHandler";
import translation from "../../../../../../utils/translation";
import { buildSlicePageInfo } from "../../settingsListConfig";
import { dateRangeQuery, orderedRows } from "../hrmsConfig";
import {
    DEFAULT_HRMS_SORT,
    HRMS_DEFAULT_PAGE_QUERY,
    HRMS_FAILED_STATUS,
    HRMS_LOADING_STATUS,
    HRMS_SORT_ORDER,
    TIME_REQUEST_WITHDRAW_STATUS,
} from "../../settingsNewUiConstants";

const selectTimeRequests = (state) => ({
    byId: state.timeRequests.timeRequests,
    order: state.timeRequests.timeRequestsOrder,
    status: state.timeRequests.status,
    error: state.timeRequests.error,
    currentPage: state.timeRequests.currentPage,
    totalPages: state.timeRequests.totalPages,
    perPage: state.timeRequests.perPage,
    total: state.timeRequests.totalTimeRequests,
    lastUpdated: state.timeRequests.lastUpdated,
});

/** Ports TimeRequests.js (my recent time requests): date range / search fetches, sort, paging, withdraw. */
const useTimeRequestList = () => {
    const dispatch = useDispatch();
    const slice = useSelector(selectTimeRequests, shallowEqual);
    const [withdrawId, setWithdrawId] = useState(null);
    const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
    const [searchQuery, setSearchQuery] = useState("");
    const [tableHeaderFilter, setTableHeaderFilter] = useState(DEFAULT_HRMS_SORT);
    const [initialFetch, setInitialFetch] = useState(false);

    const rows = useMemo(() => orderedRows(slice.byId, slice.order), [slice.byId, slice.order]);
    const currentPage = parseInt(slice.currentPage, 10);

    useEffect(() => {
        if (slice.status === HRMS_FAILED_STATUS && slice.error) {
            ShowToast("error", slice.error);
            dispatch(clearMessage());
        }
    }, [slice.status, slice.error, dispatch]);

    useEffect(() => {
        if (!initialFetch) {
            dispatch(fetchTimeRequests());
            setInitialFetch(true);
        }
    }, [dispatch, initialFetch]);

    const handleRefresh = useCallback(() => {
        dispatchWithHandling(dispatch, fetchTimeRequests({ page: currentPage, ...dateRangeQuery(dateRange) }));
    }, [dispatch, currentPage, dateRange]);

    const sortTable = useCallback((sortKey) => {
        const newOrder = tableHeaderFilter.order === HRMS_SORT_ORDER.ASC ? HRMS_SORT_ORDER.DESC : HRMS_SORT_ORDER.ASC;
        setTableHeaderFilter({ sort: sortKey, order: newOrder });
        dispatchWithHandling(dispatch, fetchTimeRequests({ sort_by: sortKey, sort_order: newOrder, page: currentPage, ...dateRangeQuery(dateRange) }));
    }, [dispatch, currentPage, dateRange, tableHeaderFilter.order]);

    const handleNextClick = useCallback(() => {
        /* bug log #99 (fixed 2026-10-06): Next keeps the date range, as Prev does */
        if (currentPage < slice.totalPages) dispatchWithHandling(dispatch, fetchTimeRequests({ page: currentPage + 1, ...dateRangeQuery(dateRange) }));
    }, [dispatch, currentPage, slice.totalPages, dateRange]);

    const handlePrevClick = useCallback(() => {
        if (currentPage > 1) dispatchWithHandling(dispatch, fetchTimeRequests({ page: currentPage - 1, ...dateRangeQuery(dateRange) }));
    }, [dispatch, currentPage, dateRange]);

    const handlePerPageChange = useCallback((perPage) => {
        dispatchWithHandling(dispatch, fetchTimeRequests({ limit: perPage, page: currentPage, ...dateRangeQuery(dateRange) }));
    }, [dispatch, currentPage, dateRange]);

    const handleSearch = useCallback((query) => {
        setSearchQuery(query);
        dispatchWithHandling(dispatch, fetchTimeRequests({ search_text: query, page: slice.currentPage, ...dateRangeQuery(dateRange) }));
    }, [dispatch, slice.currentPage, dateRange]);

    /* bug log #99 (fixed 2026-10-18): the range change itself re-queries — a complete range from page 1 with the search
       text, a cleared range from page 1; legacy ran this from an effect keyed on the current page, so every page
       change fired a second request for the page it had just fetched */
    const handleDateRangeChange = useCallback((range) => {
        const next = { startDate: range.startDate, endDate: range.endDate };
        setDateRange(next);
        if (next.startDate && next.endDate) {
            dispatchWithHandling(dispatch, fetchTimeRequests({ ...HRMS_DEFAULT_PAGE_QUERY, search_text: searchQuery || null, ...dateRangeQuery(next) }));
        } else if (!next.startDate && !next.endDate) {
            dispatchWithHandling(dispatch, fetchTimeRequests({ ...HRMS_DEFAULT_PAGE_QUERY, search_text: searchQuery || null }));
        }
    }, [dispatch, searchQuery]);

    const requestWithdraw = useCallback((id) => setWithdrawId(id), []);
    const cancelWithdraw = useCallback(() => setWithdrawId(null), []);
    const confirmWithdraw = useCallback(async () => {
        if (!withdrawId) return;
        try {
            await dispatchWithHandling(dispatch, withdrawTimeRequest({ time_request_apply_id: withdrawId, status: TIME_REQUEST_WITHDRAW_STATUS }));
            ShowToast("success", translation("key_time_request_withdraw_successfully"));
            setWithdrawId(null);
            handleRefresh();
        } catch (err) {
            setWithdrawId(null);
            ShowToast("error", err);
        }
    }, [dispatch, withdrawId, handleRefresh]);

    const pageInfo = useMemo(
        () => buildSlicePageInfo({ currentPage: slice.currentPage, totalPages: slice.totalPages, total: slice.total, limit: slice.perPage }),
        [slice.currentPage, slice.totalPages, slice.total, slice.perPage]
    );

    return {
        lastUpdated: slice.lastUpdated,
        rows,
        isLoading: slice.status === HRMS_LOADING_STATUS,
        pageInfo,
        sort: tableHeaderFilter,
        dateRange,
        searchQuery,
        withdrawId,
        sortTable,
        handlePrevClick,
        handleNextClick,
        handlePerPageChange,
        handleRefresh,
        handleSearch,
        handleDateRangeChange,
        requestWithdraw,
        cancelWithdraw,
        confirmWithdraw,
    };
};

export default useTimeRequestList;
