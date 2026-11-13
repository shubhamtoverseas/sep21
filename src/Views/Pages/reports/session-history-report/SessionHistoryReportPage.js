import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { jsonToXlsxBlob } from "../../../../utils/exportToExcel";
import { saveAs } from 'file-saver';
import PaginationBar from "../../../../components/Layout/pagination/PaginationBar";
import { SessionHistoryReportTableColumns } from "./SessionHistoryReportTableColumns";
import { fetchUserSessionHistory } from "../../../../redux/Slices/settings/user-session/UserSessionSlice";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { dispatchWithHandling } from "../../../../utils/dispatchHandler";
import { formatDate } from "../../../../services/commonService";
import { getBranchUsers } from "../../../../services/users";
import { toTitleCase } from "../../../../utils/utils";
import { SESSION_HISTORY_USERS_QUERY, reportDefaultDateRange } from "../reportConstants";
import translation from "../../../../utils/translation";
import { ReportChip, ReportDateChip, ReportExportButton, ReportFilters, ReportPage, ReportTable } from "../ReportShell";
import configData from "../../../../components/ReusableComponents/app-configs";

function SessionHistoryReportPage() {
    const dispatch = useDispatch();
    const {
        userSessionHistory,
        currentPage,
        totalPages,
        perPage,
        total,
        lastUpdated,
        status
    } = useSelector((state) => state.userSession);

    const [initialFetch, setInitialFetch] = useState(false);
    const [updateFilters, setUpdatedFilters] = useState({});

    const [tableHeaderFilter, setTableHeaderFilter] = useState({
        sort: '',
        order: ''
    });
    const [dateRange, setDateRange] = useState(reportDefaultDateRange);
    /* User chip (Shubham 4 Nov): the report's own staff list; a 403 (no grant) or a failed read leaves the chip with no options */
    const [users, setUsers] = useState([]);
    const [userSelect, setUserSelect] = useState([]);
    useEffect(() => {
        let alive = true;
        getBranchUsers(SESSION_HISTORY_USERS_QUERY)
            .then((res) => { if (alive) setUsers((res?.data?.data || []).map((u) => ({ value: u.user_id, label: u.name }))); })
            .catch(() => { if (alive) setUsers([]); });
        return () => { alive = false; };
    }, []);

    const tableColumns = useMemo(() => SessionHistoryReportTableColumns(), []);

    const filterParams = useMemo(() => ({
        search_from_date: dateRange?.startDate ? formatDate(dateRange.startDate) : null,
        search_to_date: dateRange?.endDate ? formatDate(dateRange.endDate) : null,
        user_id: userSelect.map((option) => option.value),   /* [] = no user filter (Priyanka 4 Nov) */
    }), [dateRange, userSelect]);

    const paginationEntity = useMemo(() => ({
        total: total,
        current_page: parseInt(currentPage),
        prev_page_url: parseInt(currentPage) > 1 ? `?page=${parseInt(currentPage) - 1}` : null,
        next_page_url: parseInt(currentPage) < totalPages ? `?page=${parseInt(currentPage) + 1}` : null,
        last_page: totalPages,
        per_page: perPage,
    }), [total, currentPage, totalPages, perPage]);

    useEffect(() => {
        if (!initialFetch) {
            dispatch(fetchUserSessionHistory({ page: 1, limit: 10, ...filterParams }));
            setInitialFetch(true);
        }
    }, [dispatch, initialFetch, filterParams]);

    const sortTable = useCallback((sortKey) => {
        if (sortKey) {
            const newOrder = tableHeaderFilter.order === 'ASC' ? 'DESC' : 'ASC';
            setTableHeaderFilter({ sort: sortKey, order: newOrder });
            setUpdatedFilters({ ...updateFilters, sort: sortKey, order: newOrder });
            dispatchWithHandling(dispatch, fetchUserSessionHistory({
                page: currentPage,
                limit: 10,
                sort_by: sortKey,
                sort_order: newOrder
            }));
        }
    }, [tableHeaderFilter, updateFilters, dispatch, currentPage]);

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
        if (parseInt(currentPage) > 1) {
            dispatchWithHandling(dispatch, fetchUserSessionHistory({
                page: parseInt(currentPage) - 1,
                limit: perPage,
                ...filterParams,
            }));
        }
    }, [currentPage, perPage, filterParams, dispatch]);

    const handleNextClick = useCallback(() => {
        if (parseInt(currentPage) < totalPages) {
            dispatchWithHandling(dispatch, fetchUserSessionHistory({
                page: parseInt(currentPage) + 1,
                limit: perPage,
                ...filterParams,
            }));
        }
    }, [currentPage, totalPages, perPage, filterParams, dispatch]);

    const handlePerPageChange = useCallback((perPage) => {
        dispatchWithHandling(dispatch, fetchUserSessionHistory({
            limit: perPage,
            page: parseInt(currentPage),
            ...filterParams,
        }));
    }, [currentPage, filterParams, dispatch]);

    const handleRefresh = useCallback(() => {
        dispatchWithHandling(dispatch, fetchUserSessionHistory({
            page: parseInt(currentPage),
        }));
    }, [currentPage, dispatch]);

    const handleFilterSearch = useCallback(() => {
        dispatchWithHandling(dispatch, fetchUserSessionHistory({
            page: 1,
            limit: 10,
            ...filterParams,
        }));
    }, [filterParams, dispatch]);

    const [isExporting, setIsExporting] = useState(false);
    const onExportToExcel = useCallback(async () => {
        if (!userSessionHistory || userSessionHistory.length === 0) {
            ShowToast("error", translation('key_no_data_available'));
            return;
        }

        setIsExporting(true);
        try {
            const fileData = await jsonToXlsxBlob(configData.exportSessionHistory(userSessionHistory));
            const dateStr = new Date().toISOString().slice(0, 10);
            saveAs(fileData, `session-history-report-${dateStr}.xlsx`);
        } catch (error) {
            ShowToast("error", translation('key_something_went_wrong'));
        } finally {
            setIsExporting(false);
        }
    }, [userSessionHistory]);

    return <ReportPage title={translation('key_session_history_report')} actions={<ReportExportButton onClick={onExportToExcel} busy={isExporting} />}>
        <ReportFilters onGo={handleFilterSearch}>
            <ReportDateChip label={translation('key_filter_by_duration')} onChange={handleDateRangeChange} startDate={dateRange.startDate} endDate={dateRange.endDate} />
            <ReportChip id="session-history-user" label={toTitleCase(translation('key_user'))} options={users} value={userSelect} onChange={setUserSelect} multiple menuWidth={240} />
        </ReportFilters>

        {status === 'loading' ? <CustomSpinner /> :
            <>
                <ReportTable columns={tableColumns} rows={userSessionHistory} sortBy={tableHeaderFilter.sort} sortOrder={tableHeaderFilter.order} onSort={sortTable} onCell={entityClick}>
                    <PaginationBar
                        entity={paginationEntity}
                        handlePrevClick={handlePrevClick}
                        handleNextClick={handleNextClick}
                        handlePerPageChange={handlePerPageChange}
                        handleRefresh={handleRefresh}
                        last_update={lastUpdated}
                    />
                </ReportTable>
            </>
        }
    </ReportPage>
}
export default SessionHistoryReportPage;