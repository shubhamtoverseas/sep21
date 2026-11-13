import { useCallback, useEffect, useMemo, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { clearMessage, fetchReporteesTimeRequests } from "../../../../../../redux/Slices/settings/time-request/TimeRequestSlice";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { dispatchWithHandling } from "../../../../../../utils/dispatchHandler";
import { buildSlicePageInfo } from "../../settingsListConfig";
import { dateRangeQuery, nonReporteesFlag, orderedRows } from "../hrmsConfig";
import { DEFAULT_HRMS_SORT, HRMS_DEFAULT_PAGE_QUERY, HRMS_FAILED_STATUS, HRMS_LOADING_STATUS, HRMS_SORT_ORDER } from "../../settingsNewUiConstants";

const selectReporteesTimeRequests = (state) => ({
    byId: state.timeRequests.reporteesTimeRequest,
    order: state.timeRequests.reporteesTimeRequestOrder,
    status: state.timeRequests.reporteesTimeRequestStatus,
    message: state.timeRequests.reporteesTimeRequestMessage,
    error: state.timeRequests.reporteesTimeRequestError,
    currentPage: state.timeRequests.reporteesTimeRequestCurrentPage,
    totalPages: state.timeRequests.reporteesTimeRequestTotalPage,
    perPage: state.timeRequests.reporteesTimeRequestPerPage,
    total: state.timeRequests.reporteesTimeRequestTotal,
    lastUpdated: state.timeRequests.reporteesTimeRequestLastUpdated,
});

/** Ports approve-time-request/TimeRequests.js: filter-driven fetch, sort/paging, view + take-action modals. */
const useReporteesTimeRequests = ({ type, dateRange, showNonReportees, search = "" }) => {
    const dispatch = useDispatch();
    const slice = useSelector(selectReporteesTimeRequests, shallowEqual);
    const [tableHeaderFilter, setTableHeaderFilter] = useState(DEFAULT_HRMS_SORT);
    const [viewRequest, setViewRequest] = useState(null);
    const [actionRequest, setActionRequest] = useState(null);

    const rows = useMemo(() => orderedRows(slice.byId, slice.order), [slice.byId, slice.order]);
    const currentPage = parseInt(slice.currentPage, 10);

    /* Priyanka 11 Nov: search_text goes to reportees-list (name partial, email exact, request number
       TRxxxxxx); cleared, the param is left out entirely */
    const baseQuery = useCallback(() => ({
        type,
        ...dateRangeQuery(dateRange),
        non_reportees: nonReporteesFlag(showNonReportees),
        ...(search ? { search_text: search } : {}),
    }), [type, dateRange, showNonReportees, search]);

    useEffect(() => {
        dispatch(fetchReporteesTimeRequests({ ...HRMS_DEFAULT_PAGE_QUERY, ...baseQuery() }));
    }, [dispatch, baseQuery]);

    useEffect(() => {
        if (slice.message) {
            ShowToast("success", slice.message);
            dispatch(clearMessage());
        }
    }, [slice.message, dispatch]);

    useEffect(() => {
        if (slice.status === HRMS_FAILED_STATUS && slice.error) {
            ShowToast("error", slice.error);
            dispatch(clearMessage());
        }
    }, [slice.status, slice.error, dispatch]);

    const sortTable = useCallback((sortKey) => {
        if (!sortKey) return;
        const newOrder = tableHeaderFilter.order === HRMS_SORT_ORDER.ASC ? HRMS_SORT_ORDER.DESC : HRMS_SORT_ORDER.ASC;
        setTableHeaderFilter({ sort: sortKey, order: newOrder });
        dispatchWithHandling(dispatch, fetchReporteesTimeRequests({ page: slice.currentPage, limit: HRMS_DEFAULT_PAGE_QUERY.limit, ...baseQuery(), sort_by: sortKey, sort_order: newOrder }));
    }, [dispatch, slice.currentPage, tableHeaderFilter.order, baseQuery]);

    const handleRefresh = useCallback(() => {
        dispatchWithHandling(dispatch, fetchReporteesTimeRequests({ page: currentPage, ...baseQuery() }));
    }, [dispatch, currentPage, baseQuery]);

    const handlePrevClick = useCallback(() => {
        if (currentPage > 1) dispatchWithHandling(dispatch, fetchReporteesTimeRequests({ page: currentPage - 1, ...baseQuery() }));
    }, [dispatch, currentPage, baseQuery]);

    const handleNextClick = useCallback(() => {
        if (currentPage < slice.totalPages) dispatchWithHandling(dispatch, fetchReporteesTimeRequests({ page: currentPage + 1, ...baseQuery() }));
    }, [dispatch, currentPage, slice.totalPages, baseQuery]);

    const handlePerPageChange = useCallback((perPage) => {
        dispatchWithHandling(dispatch, fetchReporteesTimeRequests({ limit: perPage, page: currentPage, ...baseQuery() }));
    }, [dispatch, currentPage, baseQuery]);

    const openView = useCallback((row) => setViewRequest(row), []);
    const closeView = useCallback(() => setViewRequest(null), []);
    const openAction = useCallback((row) => setActionRequest(row), []);
    const closeAction = useCallback(() => setActionRequest(null), []);

    const pageInfo = useMemo(
        () => buildSlicePageInfo({ currentPage: slice.currentPage, totalPages: slice.totalPages, total: slice.total, limit: slice.perPage }),
        [slice.currentPage, slice.totalPages, slice.total, slice.perPage]
    );

    return {
        rows,
        isLoading: slice.status === HRMS_LOADING_STATUS,
        hasError: slice.status === HRMS_FAILED_STATUS,
        pageInfo,
        sort: tableHeaderFilter,
        viewRequest,
        actionRequest,
        sortTable,
        handleRefresh,
        handlePrevClick,
        handleNextClick,
        handlePerPageChange,
        openView,
        closeView,
        openAction,
        closeAction,
    };
};

export default useReporteesTimeRequests;
