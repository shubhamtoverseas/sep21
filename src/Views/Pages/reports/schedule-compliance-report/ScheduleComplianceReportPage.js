import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { jsonToXlsxBlob } from "../../../../utils/exportToExcel";
import { saveAs } from 'file-saver';
import PaginationBar from "../../../../components/Layout/pagination/PaginationBar";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { ScheduleComplianceReportTableColumns } from "./ScheduleComplianceReportTableColumns";
import { fetchScheduleComplianceList, clearMessage } from "../../../../redux/Slices/settings/leaves/LeavesSlice";
import { formatDate } from "../../../../services/commonService";
import { getBranchUsers } from "../../../../services/users";
import { toTitleCase } from "../../../../utils/utils";
import { SCHEDULE_COMPLIANCE_USERS_QUERY, reportDefaultDateRange } from "../reportConstants";
import { dispatchWithHandling } from "../../../../utils/dispatchHandler";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import translation from "../../../../utils/translation";
import { ReportChip, ReportDateChip, ReportExportButton, ReportFilters, ReportPage, ReportTable } from "../ReportShell";
import configData from "../../../../components/ReusableComponents/app-configs";

function ScheduleComplianceReportPage() {
    const dispatch = useDispatch();

    const {
        scheduleComplianceList,
        scheduleComplianceListCurrentPage,
        scheduleComplianceListPerPage,
        scheduleComplianceListTotalPages,
        scheduleComplianceListTotalLeaves,
        scheduleComplianceListLastUpdated,
        scheduleComplianceListMessage,
        error,
        status
    } = useSelector((state) => state.leaves);

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
        getBranchUsers(SCHEDULE_COMPLIANCE_USERS_QUERY)
            .then((res) => { if (alive) setUsers((res?.data?.data || []).map((u) => ({ value: u.user_id, label: u.name }))); })
            .catch(() => { if (alive) setUsers([]); });
        return () => { alive = false; };
    }, []);

    const tableColumns = useMemo(() => ScheduleComplianceReportTableColumns(), []);

    const dateParams = useMemo(() => ({
        search_from_date: dateRange?.startDate ? formatDate(dateRange.startDate) : null,
        search_to_date: dateRange?.endDate ? formatDate(dateRange.endDate) : null,
        user_id: userSelect.map((option) => option.value),   /* [] = no user filter */
    }), [dateRange, userSelect]);

    const paginationEntity = useMemo(() => ({
        total: scheduleComplianceListTotalLeaves || 0,
        current_page: parseInt(scheduleComplianceListCurrentPage) || 1,
        prev_page_url: parseInt(scheduleComplianceListCurrentPage) > 1 ? `?page=${parseInt(scheduleComplianceListCurrentPage) - 1}` : null,
        next_page_url: parseInt(scheduleComplianceListCurrentPage) < scheduleComplianceListTotalPages ? `?page=${parseInt(scheduleComplianceListCurrentPage) + 1}` : null,
        last_page: scheduleComplianceListTotalPages,
        per_page: scheduleComplianceListPerPage,
    }), [scheduleComplianceListTotalLeaves, scheduleComplianceListCurrentPage, scheduleComplianceListTotalPages, scheduleComplianceListPerPage]);

    useEffect(() => {
        if (!initialFetch) {
            dispatch(fetchScheduleComplianceList({ page: 1, limit: 10, ...dateParams }));
            setInitialFetch(true);
        }
    }, [dispatch, initialFetch, dateParams]);

    useEffect(() => {
        if (scheduleComplianceListMessage) {
            ShowToast("success", scheduleComplianceListMessage);
            dispatch(clearMessage());
        }
    }, [scheduleComplianceListMessage, dispatch]);

    useEffect(() => {
        if (status === 'failed' && error) {
            ShowToast("error", error);
            dispatch(clearMessage());
        }
    }, [status, error, dispatch]);

    const handleRefresh = useCallback(() => {
        dispatchWithHandling(dispatch, fetchScheduleComplianceList({
            page: parseInt(scheduleComplianceListCurrentPage),
            ...dateParams,
        }));
    }, [dispatch, scheduleComplianceListCurrentPage, dateParams]);

    const handlePrevClick = useCallback(() => {
        if (parseInt(scheduleComplianceListCurrentPage) > 1) {
            dispatchWithHandling(dispatch, fetchScheduleComplianceList({
                page: parseInt(scheduleComplianceListCurrentPage) - 1,
                ...dateParams,
            }));
        }
    }, [dispatch, scheduleComplianceListCurrentPage, dateParams]);

    const handleNextClick = useCallback(() => {
        if (parseInt(scheduleComplianceListCurrentPage) < scheduleComplianceListTotalPages) {
            dispatchWithHandling(dispatch, fetchScheduleComplianceList({
                page: parseInt(scheduleComplianceListCurrentPage) + 1,
                ...dateParams,
            }));
        }
    }, [dispatch, scheduleComplianceListCurrentPage, scheduleComplianceListTotalPages, dateParams]);

    const handlePerPageChange = useCallback((perPage) => {
        dispatchWithHandling(dispatch, fetchScheduleComplianceList({
            limit: perPage,
            page: parseInt(scheduleComplianceListCurrentPage),
            ...dateParams,
        }));
    }, [dispatch, scheduleComplianceListCurrentPage, dateParams]);

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
            dispatchWithHandling(dispatch, fetchScheduleComplianceList({
                page: scheduleComplianceListCurrentPage,
                limit: 10,
                sort_by: sortKey,
                sort_order: newOrder,
                ...dateParams,
            }));
        }
    }, [dispatch, tableHeaderFilter, scheduleComplianceListCurrentPage, dateParams]);

    const entityClick = useCallback((job) => {
        console.log(job);
    }, []);

    const handleFilterSearch = useCallback(() => {
        dispatchWithHandling(dispatch, fetchScheduleComplianceList({
            page: 1,
            limit: 10,
            ...dateParams,
        }));
    }, [dispatch, dateParams]);

    const [isExporting, setIsExporting] = useState(false);
    const onExportToExcel = useCallback(async () => {
        if (!scheduleComplianceList || scheduleComplianceList.length === 0) {
            ShowToast("error", translation('key_no_data_available'));
            return;
        }

        setIsExporting(true);
        try {
            const fileData = await jsonToXlsxBlob(configData.exportScheduleCompliance(scheduleComplianceList));
            const dateStr = new Date().toISOString().slice(0, 10);
            saveAs(fileData, `schedule-compliance-report-${dateStr}.xlsx`);
        } catch (error) {
            ShowToast("error", translation('key_something_went_wrong'));
        } finally {
            setIsExporting(false);
        }
    }, [scheduleComplianceList]);

    return (
        <ReportPage title={translation('key_schedule_compliance_report')} actions={<ReportExportButton onClick={onExportToExcel} disabled={!scheduleComplianceList || scheduleComplianceList.length === 0} busy={isExporting} />}>
            <ReportFilters onGo={handleFilterSearch}>
                <ReportDateChip label={translation('key_filter_by_duration')} onChange={handleDateRangeChange} startDate={dateRange.startDate} endDate={dateRange.endDate} />
                <ReportChip id="schedule-compliance-user" label={toTitleCase(translation('key_user'))} options={users} value={userSelect} onChange={setUserSelect} multiple menuWidth={240} />
            </ReportFilters>

            {status === 'loading' ? <CustomSpinner /> : <>
                <ReportTable columns={tableColumns} rows={scheduleComplianceList} sortBy={tableHeaderFilter.sort} sortOrder={tableHeaderFilter.order} onSort={sortTable} onCell={entityClick}>
                    <PaginationBar
                        entity={paginationEntity}
                        handlePrevClick={handlePrevClick}
                        handleNextClick={handleNextClick}
                        handlePerPageChange={handlePerPageChange}
                        handleRefresh={handleRefresh}
                        last_update={scheduleComplianceListLastUpdated}
                    />
                </ReportTable>
            </>
            }
        </ReportPage>
    );
}

export default ScheduleComplianceReportPage;