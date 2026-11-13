import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { jsonToXlsxBlob } from "../../../../utils/exportToExcel";
import { saveAs } from 'file-saver';
import { TimeRequestReportTableColumns } from "./TimeRequestReportTableColumns";
import PaginationBar from "../../../../components/Layout/pagination/PaginationBar";
import { fetchReportTimeRequestHistory } from "../../../../redux/Slices/settings/time-request/TimeRequestSlice";
import { dispatchWithHandling } from "../../../../utils/dispatchHandler";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { formatDate } from "../../../../services/commonService";
import { getBranchUsers } from "../../../../services/users";
import { toTitleCase } from "../../../../utils/utils";
import { TIME_REQUEST_USERS_QUERY, reportDefaultDateRange } from "../reportConstants";
import translation from "../../../../utils/translation";
import { ReportChip, ReportDateChip, ReportExportButton, ReportFilters, ReportPage, ReportTable } from "../ReportShell";
import configData from "../../../../components/ReusableComponents/app-configs";
import { ShowToast } from "../../../../components/show-toast/ShowToast";

function TimeRequestReportPage() {
    const dispatch = useDispatch();
    const {
        reportTimeRequestHistory,
        reportTimeRequestHistoryOrder,
        status,
        reportTimeRequestHistoryCurrentPage,
        reportTimeRequestHistoryPerPage,
        reportTimeRequestHistoryTotalPage,
        reportTimeRequestHistoryTotal,
        reportTimeRequestHistoryLastUpdated
    } = useSelector((state) => state.timeRequests);

    const requestArray = useMemo(() => (
        reportTimeRequestHistoryOrder?.length
            ? reportTimeRequestHistoryOrder.map(id => reportTimeRequestHistory[id])
            : []
    ), [reportTimeRequestHistoryOrder, reportTimeRequestHistory]);

    const [dateRange, setDateRange] = useState(reportDefaultDateRange);
    const [initialFetch, setInitialFetch] = useState(false);
    const [tableHeaderFilter, setTableHeaderFilter] = useState({
        sort: '',
        order: ''
    });

    /* User chip (ClickUp 14ykpqtyr0q): the report's own staff list; a 403 (no grant) or a failed read leaves the chip with no options */
    const [users, setUsers] = useState([]);
    const [userSelect, setUserSelect] = useState([]);
    useEffect(() => {
        let alive = true;
        getBranchUsers(TIME_REQUEST_USERS_QUERY)
            .then((res) => { if (alive) setUsers((res?.data?.data || []).map((u) => ({ value: u.user_id, label: u.name }))); })
            .catch(() => { if (alive) setUsers([]); });
        return () => { alive = false; };
    }, []);

    const tableColumns = useMemo(() => TimeRequestReportTableColumns(), []);

    const dateParams = useMemo(() => ({
        search_from_date: dateRange?.startDate ? formatDate(dateRange.startDate) : null,
        search_to_date: dateRange?.endDate ? formatDate(dateRange.endDate) : null,
        user_id: userSelect.map((option) => option.value),   /* [] = no user filter */
    }), [dateRange, userSelect]);

    const paginationEntity = useMemo(() => ({
        total: reportTimeRequestHistoryTotal || 0,
        current_page: parseInt(reportTimeRequestHistoryCurrentPage) || 1,
        prev_page_url: parseInt(reportTimeRequestHistoryCurrentPage) > 1 ? `?page=${parseInt(reportTimeRequestHistoryCurrentPage) - 1}` : null,
        next_page_url: parseInt(reportTimeRequestHistoryCurrentPage) < reportTimeRequestHistoryTotalPage ? `?page=${parseInt(reportTimeRequestHistoryCurrentPage) + 1}` : null,
        last_page: reportTimeRequestHistoryTotalPage,
        per_page: reportTimeRequestHistoryPerPage,
    }), [reportTimeRequestHistoryTotal, reportTimeRequestHistoryCurrentPage, reportTimeRequestHistoryTotalPage, reportTimeRequestHistoryPerPage]);

    useEffect(() => {
        if (!initialFetch) {
            dispatch(fetchReportTimeRequestHistory({ page: 1, limit: 10, ...dateParams }));
            setInitialFetch(true);
        }
    }, [status, reportTimeRequestHistory, dispatch, initialFetch, dateParams]);

    const handleRefresh = useCallback(() => {
        dispatchWithHandling(dispatch, fetchReportTimeRequestHistory({
            page: parseInt(reportTimeRequestHistoryCurrentPage),
        }));
    }, [dispatch, reportTimeRequestHistoryCurrentPage]);

    const handlePrevClick = useCallback(() => {
        if (parseInt(reportTimeRequestHistoryCurrentPage) > 1) {
            dispatchWithHandling(dispatch, fetchReportTimeRequestHistory({
                page: parseInt(reportTimeRequestHistoryCurrentPage) - 1,
                ...dateParams,
            }));
        }
    }, [dispatch, reportTimeRequestHistoryCurrentPage, dateParams]);

    const handleNextClick = useCallback(() => {
        if (parseInt(reportTimeRequestHistoryCurrentPage) < reportTimeRequestHistoryTotalPage) {
            dispatchWithHandling(dispatch, fetchReportTimeRequestHistory({
                page: parseInt(reportTimeRequestHistoryCurrentPage) + 1,
                ...dateParams,
            }));
        }
    }, [dispatch, reportTimeRequestHistoryCurrentPage, reportTimeRequestHistoryTotalPage, dateParams]);

    const handlePerPageChange = useCallback((perPage) => {
        dispatchWithHandling(dispatch, fetchReportTimeRequestHistory({
            limit: perPage,
            page: parseInt(reportTimeRequestHistoryCurrentPage),
            ...dateParams,
        }));
    }, [dispatch, reportTimeRequestHistoryCurrentPage, dateParams]);

    const handleDateRangeChange = useCallback((range) => {
        setDateRange({
            startDate: range.startDate,
            endDate: range.endDate
        });
    }, []);

    const sortTable = useCallback((sortKey) => {
        if (sortKey) {
            const newOrder = tableHeaderFilter.order === 'ASC' ? 'DESC' : 'ASC';
            setTableHeaderFilter({ sort: sortKey, order: newOrder });
            dispatchWithHandling(dispatch, fetchReportTimeRequestHistory({
                page: reportTimeRequestHistoryCurrentPage,
                limit: 10,
                sort_by: sortKey,
                sort_order: newOrder,
                ...dateParams,
            }));
        }
    }, [dispatch, tableHeaderFilter, reportTimeRequestHistoryCurrentPage, dateParams]);

    const entityClick = useCallback((job) => {
        console.log(job);
    }, []);

    const handleFilterSearch = useCallback(() => {
        dispatchWithHandling(dispatch, fetchReportTimeRequestHistory({
            page: 1,
            limit: 10,
            ...dateParams,
        }));
    }, [dispatch, dateParams]);

    const [isExporting, setIsExporting] = useState(false);
    const onExportToExcel = useCallback(async () => {
        if (!requestArray || requestArray.length === 0) {
            ShowToast("error", translation('key_no_data_available'));
            return;
        }

        setIsExporting(true);
        try {
            const fileData = await jsonToXlsxBlob(configData.exportTimeRequestReport(requestArray));
            const dateStr = new Date().toISOString().slice(0, 10);
            saveAs(fileData, `time-request-report-${dateStr}.xlsx`);
        } catch (error) {
            ShowToast("error", translation('key_something_went_wrong'));
        } finally {
            setIsExporting(false);
        }
    }, [requestArray]);

    return <ReportPage title={translation('key_time_request_report')} actions={<ReportExportButton onClick={onExportToExcel} disabled={!requestArray || requestArray.length === 0} busy={isExporting} />}>
        <ReportFilters onGo={handleFilterSearch}>
            <ReportDateChip label={translation('key_filter_by_duration')} onChange={handleDateRangeChange} startDate={dateRange.startDate} endDate={dateRange.endDate} />
            <ReportChip id="time-request-user" label={toTitleCase(translation('key_user'))} options={users} value={userSelect} onChange={setUserSelect} multiple menuWidth={240} />
        </ReportFilters>

        {status === 'loading' ? <CustomSpinner /> :
            <>
                <ReportTable columns={tableColumns} rows={requestArray} sortBy={tableHeaderFilter.sort} sortOrder={tableHeaderFilter.order} onSort={sortTable} onCell={entityClick}>
                    <PaginationBar
                        entity={paginationEntity}
                        handlePrevClick={handlePrevClick}
                        handleNextClick={handleNextClick}
                        handlePerPageChange={handlePerPageChange}
                        handleRefresh={handleRefresh}
                        last_update={reportTimeRequestHistoryLastUpdated}
                    />
                </ReportTable>
            </>
        }
    </ReportPage>
}
export default TimeRequestReportPage;