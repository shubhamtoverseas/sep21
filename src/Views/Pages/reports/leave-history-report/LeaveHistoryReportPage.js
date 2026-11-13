import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { jsonToXlsxBlob } from "../../../../utils/exportToExcel";
import { saveAs } from 'file-saver';
import PaginationBar from "../../../../components/Layout/pagination/PaginationBar";
import { fetchReportLeaveHistory, clearMessage } from "../../../../redux/Slices/settings/leaves/LeavesSlice";
import { dispatchWithHandling } from "../../../../utils/dispatchHandler";
import constData from "../../../../components/ReusableComponents/constants";
import { LeaveHistoryReportTableColumns } from "./LeaveHistoryReportTableColumns";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { formatDate } from "../../../../services/commonService";
import { getBranchUsers } from "../../../../services/users";
import { toTitleCase } from "../../../../utils/utils";
import { LEAVE_HISTORY_USERS_QUERY, reportDefaultDateRange } from "../reportConstants";
import translation from "../../../../utils/translation";
import { ReportChip, ReportDateChip, ReportExportButton, ReportFilters, ReportPage, ReportTable } from "../ReportShell";
import configData from "../../../../components/ReusableComponents/app-configs";

function LeaveHistoryReportPage() {
    const dispatch = useDispatch();
    const {
        reportLeaveHistory,
        reportLeaveHistoryStatus,
        reportLeaveHistoryMessage,
        reportLeaveHistoryError,
        reportLeaveHistoryCurrentPage,
        reportLeaveHistoryTotalPages,
        reportLeaveHistoryPerPage,
        reportLeaveHistoryTotalLeaves,
        reportLeaveHistoryLastUpdated
    } = useSelector((state) => state.leaves);

    const [initialFetch, setInitialFetch] = useState(false);
    const [updateFilters, setUpdatedFilters] = useState(
        constData.jobOfferFilters
    );

    const [tableHeaderFilter, setTableHeaderFilter] = useState({
        sort: '',
        order: ''
    });
    const [dateRange, setDateRange] = useState(reportDefaultDateRange);

    /* User chip (ClickUp 14ykpqtyr0q): the report's own staff list; a 403 (no grant) or a failed read leaves the chip with no options */
    const [users, setUsers] = useState([]);
    const [userSelect, setUserSelect] = useState([]);
    useEffect(() => {
        let alive = true;
        getBranchUsers(LEAVE_HISTORY_USERS_QUERY)
            .then((res) => { if (alive) setUsers((res?.data?.data || []).map((u) => ({ value: u.user_id, label: u.name }))); })
            .catch(() => { if (alive) setUsers([]); });
        return () => { alive = false; };
    }, []);

    const tableColumns = useMemo(() => LeaveHistoryReportTableColumns(), []);

    const dateParams = useMemo(() => ({
        search_from_date: dateRange?.startDate ? formatDate(dateRange.startDate) : null,
        search_to_date: dateRange?.endDate ? formatDate(dateRange.endDate) : null,
        user_id: userSelect.map((option) => option.value),   /* [] = no user filter */
    }), [dateRange, userSelect]);

    const paginationEntity = useMemo(() => ({
        total: reportLeaveHistoryTotalLeaves,
        current_page: parseInt(reportLeaveHistoryCurrentPage),
        prev_page_url: parseInt(reportLeaveHistoryCurrentPage) > 1 ? `?page=${parseInt(reportLeaveHistoryCurrentPage) - 1}` : null,
        next_page_url: parseInt(reportLeaveHistoryCurrentPage) < reportLeaveHistoryTotalPages ? `?page=${parseInt(reportLeaveHistoryCurrentPage) + 1}` : null,
        last_page: reportLeaveHistoryTotalPages,
        per_page: reportLeaveHistoryPerPage,
    }), [reportLeaveHistoryTotalLeaves, reportLeaveHistoryCurrentPage, reportLeaveHistoryTotalPages, reportLeaveHistoryPerPage]);

    useEffect(() => {
        if (!initialFetch && (reportLeaveHistoryStatus === 'idle' || !reportLeaveHistory || reportLeaveHistory.length === 0)) {
            dispatch(fetchReportLeaveHistory({ page: 1, limit: 10, ...dateParams }));
            setInitialFetch(true);
        }
    }, [reportLeaveHistoryStatus, reportLeaveHistory, dispatch, initialFetch, dateParams]);

    useEffect(() => {
        if (reportLeaveHistoryMessage) {
            ShowToast("success", reportLeaveHistoryMessage);
            dispatch(clearMessage());
        }
    }, [reportLeaveHistoryMessage, dispatch]);

    useEffect(() => {
        if (reportLeaveHistoryStatus === 'failed' && reportLeaveHistoryError) {
            ShowToast("error", reportLeaveHistoryError);
            dispatch(clearMessage());
        }
    }, [reportLeaveHistoryStatus, reportLeaveHistoryError, dispatch]);

    const sortTable = useCallback((sortKey) => {
        if (sortKey) {
            const newOrder = tableHeaderFilter.order === 'ASC' ? 'DESC' : 'ASC';
            setTableHeaderFilter({ sort: sortKey, order: newOrder });
            setUpdatedFilters({ ...updateFilters, sort: sortKey, order: newOrder });
            dispatchWithHandling(dispatch, fetchReportLeaveHistory({
                page: reportLeaveHistoryCurrentPage,
                limit: 10,
                sort_by: sortKey,
                sort_order: newOrder
            }));
        }
    }, [dispatch, tableHeaderFilter, updateFilters, reportLeaveHistoryCurrentPage]);

    const handleDateRangeChange = useCallback((range) => {
        setDateRange({
            startDate: range.startDate,
            endDate: range.endDate
        });
    }, []);

    const entityClick = useCallback((job) => {
        console.log(job);
    }, []);

    const handlePrevClick = useCallback(() => {
        if (parseInt(reportLeaveHistoryCurrentPage) > 1) {
            dispatchWithHandling(dispatch, fetchReportLeaveHistory({
                page: parseInt(reportLeaveHistoryCurrentPage) - 1,
                ...dateParams,
            }));
        }
    }, [dispatch, reportLeaveHistoryCurrentPage, dateParams]);

    const handleNextClick = useCallback(() => {
        if (parseInt(reportLeaveHistoryCurrentPage) < reportLeaveHistoryTotalPages) {
            dispatchWithHandling(dispatch, fetchReportLeaveHistory({
                page: parseInt(reportLeaveHistoryCurrentPage) + 1,
                ...dateParams,
            }));
        }
    }, [dispatch, reportLeaveHistoryCurrentPage, reportLeaveHistoryTotalPages, dateParams]);

    const handlePerPageChange = useCallback((perPage) => {
        dispatchWithHandling(dispatch, fetchReportLeaveHistory({
            limit: perPage,
            page: parseInt(reportLeaveHistoryCurrentPage),
            ...dateParams,
        }));
    }, [dispatch, reportLeaveHistoryCurrentPage, dateParams]);

    const handleRefresh = useCallback(() => {
        dispatchWithHandling(dispatch, fetchReportLeaveHistory({
            page: parseInt(reportLeaveHistoryCurrentPage),
        }));
    }, [dispatch, reportLeaveHistoryCurrentPage]);

    const handleFilterSearch = useCallback(() => {
        dispatchWithHandling(dispatch, fetchReportLeaveHistory({
            page: 1,
            limit: 10,
            ...dateParams,
        }));
    }, [dispatch, dateParams]);

    const [isExporting, setIsExporting] = useState(false);
    const onExportToExcel = useCallback(async () => {
        if (!reportLeaveHistory || reportLeaveHistory.length === 0) {
            ShowToast("error", translation('key_no_data_available'));
            return;
        }

        setIsExporting(true);
        try {
            const fileData = await jsonToXlsxBlob(configData.exportLeaveHistoryReport(reportLeaveHistory));
            const dateStr = new Date().toISOString().slice(0, 10);
            saveAs(fileData, `leave-history-report-${dateStr}.xlsx`);
        } catch (error) {
            ShowToast("error", translation('key_something_went_wrong'));
        } finally {
            setIsExporting(false);
        }
    }, [reportLeaveHistory]);

    return <ReportPage title={translation('key_leave_history') + ' ' + translation('key_report')} actions={<ReportExportButton onClick={onExportToExcel} busy={isExporting} />}>
        <ReportFilters onGo={handleFilterSearch}>
            <ReportDateChip label={translation('key_filter_by_duration')} onChange={handleDateRangeChange} startDate={dateRange.startDate} endDate={dateRange.endDate} />
            <ReportChip id="leave-history-user" label={toTitleCase(translation('key_user'))} options={users} value={userSelect} onChange={setUserSelect} multiple menuWidth={240} />
        </ReportFilters>

        {reportLeaveHistoryStatus === 'loading' ? <CustomSpinner /> : <>
            <ReportTable columns={tableColumns} rows={reportLeaveHistory} sortBy={tableHeaderFilter.sort} sortOrder={tableHeaderFilter.order} onSort={sortTable} onCell={entityClick}>
                <PaginationBar
                    entity={paginationEntity}
                    handlePrevClick={handlePrevClick}
                    handleNextClick={handleNextClick}
                    handlePerPageChange={handlePerPageChange}
                    handleRefresh={handleRefresh}
                    last_update={reportLeaveHistoryLastUpdated}
                />
            </ReportTable>
        </>
        }
    </ReportPage>
}
export default LeaveHistoryReportPage;