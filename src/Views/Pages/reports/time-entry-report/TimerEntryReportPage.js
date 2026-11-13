import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { jsonToXlsxBlob } from "../../../../utils/exportToExcel";
import { saveAs } from 'file-saver';
import { TimeEntryReportTableColumns } from "./TimeEntryReportTableColumns";
import PaginationBar from "../../../../components/Layout/pagination/PaginationBar";
import { dispatchWithHandling } from "../../../../utils/dispatchHandler";
import { fetchReportTimeEntry } from "../../../../redux/Slices/settings/time-request/TimeRequestSlice";
import { formatDate } from "../../../../services/commonService";
import { getBranchUsers } from "../../../../services/users";
import { toTitleCase } from "../../../../utils/utils";
import { TIME_ENTRY_USERS_QUERY, reportDefaultDateRange } from "../reportConstants";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import translation from "../../../../utils/translation";
import { ReportChip, ReportDateChip, ReportExportButton, ReportFilters, ReportPage, ReportTable } from "../ReportShell";
import configData from "../../../../components/ReusableComponents/app-configs";

function TimeEntryReportPage() {
    const dispatch = useDispatch();
    const {
        reportTimeEntry,
        reportTimeEntryCurrentPage,
        reportTimeEntryPerPage,
        reportTimeEntryTotalPage,   
        reportTimeEntryTotal,
        reportTimeEntryLastUpdated,
        status,
    } = useSelector((state) => state.timeRequests);

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
        getBranchUsers(TIME_ENTRY_USERS_QUERY)
            .then((res) => { if (alive) setUsers((res?.data?.data || []).map((u) => ({ value: u.user_id, label: u.name }))); })
            .catch(() => { if (alive) setUsers([]); });
        return () => { alive = false; };
    }, []);

    const tableColumns = useMemo(() => TimeEntryReportTableColumns(), []);

    const dateParams = useMemo(() => ({
        search_from_date: dateRange?.startDate ? formatDate(dateRange.startDate) : null,
        search_to_date: dateRange?.endDate ? formatDate(dateRange.endDate) : null,
        user_id: userSelect.map((option) => option.value),   /* [] = no user filter */
    }), [dateRange, userSelect]);

    const paginationEntity = useMemo(() => ({
        total: reportTimeEntryTotal || 0,
        current_page: parseInt(reportTimeEntryCurrentPage) || 1,
        prev_page_url: parseInt(reportTimeEntryCurrentPage) > 1 ? `?page=${parseInt(reportTimeEntryCurrentPage) - 1}` : null,
        next_page_url: parseInt(reportTimeEntryCurrentPage) < reportTimeEntryTotalPage ? `?page=${parseInt(reportTimeEntryCurrentPage) + 1}` : null,
        last_page: reportTimeEntryTotalPage,
        per_page: reportTimeEntryPerPage,
    }), [reportTimeEntryTotal, reportTimeEntryCurrentPage, reportTimeEntryTotalPage, reportTimeEntryPerPage]);

    useEffect(() => {
        if (!initialFetch && (status === 'idle' || !reportTimeEntry || reportTimeEntry.length === 0)) {
            dispatch(fetchReportTimeEntry({ page: 1, limit: 10, ...dateParams }));
            setInitialFetch(true);
        }
    }, [status, reportTimeEntry, dispatch, initialFetch, dateParams]);

    const handleRefresh = useCallback(() => {
        dispatchWithHandling(dispatch, fetchReportTimeEntry({
            page: parseInt(reportTimeEntryCurrentPage),
            ...dateParams,
        }));
    }, [dispatch, reportTimeEntryCurrentPage, dateParams]);

    const handlePrevClick = useCallback(() => {
        if (parseInt(reportTimeEntryCurrentPage) > 1) {
            dispatchWithHandling(dispatch, fetchReportTimeEntry({
                page: parseInt(reportTimeEntryCurrentPage) - 1,
                ...dateParams,
            }));
        }
    }, [dispatch, reportTimeEntryCurrentPage, dateParams]);

    const handleNextClick = useCallback(() => {
        if (parseInt(reportTimeEntryCurrentPage) < reportTimeEntryTotalPage) {
            dispatchWithHandling(dispatch, fetchReportTimeEntry({
                page: parseInt(reportTimeEntryCurrentPage) + 1,
                ...dateParams,
            }));
        }
    }, [dispatch, reportTimeEntryCurrentPage, reportTimeEntryTotalPage, dateParams]);

    const handlePerPageChange = useCallback((perPage) => {
        dispatchWithHandling(dispatch, fetchReportTimeEntry({
            limit: perPage,
            page: parseInt(reportTimeEntryCurrentPage),
            ...dateParams,
        }));
    }, [dispatch, reportTimeEntryCurrentPage, dateParams]);

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
            dispatchWithHandling(dispatch, fetchReportTimeEntry({
                page: reportTimeEntryCurrentPage,
                limit: 10,
                sort_by: sortKey,
                sort_order: newOrder,
                ...dateParams,
            }));
        }
    }, [dispatch, tableHeaderFilter, reportTimeEntryCurrentPage, dateParams]);

    const entityClick = useCallback((job) => {
        console.log(job);
    }, []);

    const handleFilterSearch = useCallback(() => {
        dispatchWithHandling(dispatch, fetchReportTimeEntry({
            page: 1,
            limit: 10,
            ...dateParams,
        }));
    }, [dispatch, dateParams]);

    const [isExporting, setIsExporting] = useState(false);
    const onExportToExcel = useCallback(async () => {
        if (!reportTimeEntry || reportTimeEntry.length === 0) {
            ShowToast("error", translation('key_no_data_available'));
            return;
        }

        setIsExporting(true);
        try {
            const fileData = await jsonToXlsxBlob(configData.exportTimeEntryReport(reportTimeEntry));
            const dateStr = new Date().toISOString().slice(0, 10);
            saveAs(fileData, `time-entry-report-${dateStr}.xlsx`);
        } catch (error) {
            ShowToast("error", translation('key_something_went_wrong'));
        } finally {
            setIsExporting(false);
        }
    }, [reportTimeEntry]);

    return (
        <ReportPage title={translation('key_manager_approved_time_entry_report')} actions={<ReportExportButton onClick={onExportToExcel} disabled={!reportTimeEntry || reportTimeEntry.length === 0} busy={isExporting} />}>
            <ReportFilters onGo={handleFilterSearch}>
                <ReportDateChip label={translation('key_filter_by_duration')} onChange={handleDateRangeChange} startDate={dateRange.startDate} endDate={dateRange.endDate} />
                <ReportChip id="time-entry-user" label={toTitleCase(translation('key_user'))} options={users} value={userSelect} onChange={setUserSelect} multiple menuWidth={240} />
            </ReportFilters>

            {status === 'loading' ? <CustomSpinner /> : (
                <>
                    <ReportTable columns={tableColumns} rows={reportTimeEntry} sortBy={tableHeaderFilter.sort} sortOrder={tableHeaderFilter.order} onSort={sortTable} onCell={entityClick}>
                        <PaginationBar
                            entity={paginationEntity}
                            handlePrevClick={handlePrevClick}
                            handleNextClick={handleNextClick}
                            handlePerPageChange={handlePerPageChange}
                            handleRefresh={handleRefresh}
                            last_update={reportTimeEntryLastUpdated}
                        />
                    </ReportTable>
                </>
            )}
        </ReportPage>
    );
}

export default TimeEntryReportPage;