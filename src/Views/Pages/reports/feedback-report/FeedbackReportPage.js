import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { saveAs } from 'file-saver';
import { jsonToXlsxBlob } from "../../../../utils/exportToExcel";

import { showErrorMessage } from "../../../../services/commonService";
import constData from "../../../../components/ReusableComponents/constants";
import PaginationBar from "../../../../components/Layout/pagination/PaginationBar";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { FeedbackReportTableColumns } from "./FeedbackReportTableColumns";
import { fetchFeedbackList, setFeedbackFilters } from "../../../../redux/Slices/settings/feedback-report/FeedbackReportSlice";
import translation from "../../../../utils/translation";
import { ReportExportButton, ReportPage, ReportTable } from "../ReportShell";
import FeedbackReportFilter from "./FeedbackReportFilter";
import FeedbackDetailDialog from "./FeedbackDetailDialog";
import configData from "../../../../components/ReusableComponents/app-configs";
import dayjs from "dayjs";
import { reportDefaultDateRange } from "../reportConstants";

const SEARCH_DEBOUNCE_MS = 400;

const FeedbackReportPage = () => {
  const dispatch = useDispatch();

  const [tableHeaderFilter, setTableHeaderFilter] = useState({});
  const [isFeedbackPopup, setIsFeedbackPopup] = useState(false);
  const [selectedFeedbackObj, setSelectedFeedbackObj] = useState({});
  const [initialFetch, setInitialFetch] = useState(false);

  const {
    feedbackList,
    currentPage,
    totalPages,
    totalFeedbackReports,
    lastUpdated,
    perPage,
    status,
    feedbackFiltersData
  } = useSelector((state) => state.feedbackReports);

  const [updateFilters, setUpdatedFilters] = useState(feedbackFiltersData || constData.feedbackReportFilters);

  // Memoize table columns
  const tableColumns = useMemo(() => FeedbackReportTableColumns(), []);

  // Export to Excel functionality
  const exportToExcel = useCallback(async () => {
    const fileData = await jsonToXlsxBlob(configData.exportFeedbackReport(feedbackList));
    const dateStr = new Date().toISOString().slice(0, 10);
    saveAs(fileData, `feedback-reports-${dateStr}.xlsx`);
  }, [feedbackList]);

  // Initialize filters from Redux
  useEffect(() => {
    if (!feedbackFiltersData || Object.keys(feedbackFiltersData).length === 0) {
      dispatch(setFeedbackFilters(constData.feedbackReportFilters));
      setUpdatedFilters(constData.feedbackReportFilters);
    } else {
      setUpdatedFilters(feedbackFiltersData);
    }
  }, [dispatch, feedbackFiltersData]);

  // Main fetch function
  const fetchData = useCallback((params = {}) => {
    const finalFilters = { ...updateFilters, ...params };
    dispatch(setFeedbackFilters(finalFilters));
    dispatch(fetchFeedbackList(finalFilters)).then((res) => {
      if (res?.error) {
        showErrorMessage(res);
      }
    });
  }, [updateFilters, dispatch]);

  // Initial fetch
  useEffect(() => {
    if (!initialFetch) {
      const hasDates = feedbackFiltersData?.start_date || feedbackFiltersData?.end_date;
      if (hasDates) {
        fetchData(feedbackFiltersData);
      } else {
        /* default duration: Last 7 days (Mubin 5 Nov) */
        const { startDate, endDate } = reportDefaultDateRange();
        fetchData({
          ...constData.feedbackReportFilters,
          ...(feedbackFiltersData || {}),
          start_date: dayjs(startDate).format('YYYY-MM-DD'),
          end_date: dayjs(endDate).format('YYYY-MM-DD'),
          selected_date_range_type: 'custom',
        });
      }
      setInitialFetch(true);
    }
  }, [initialFetch, feedbackFiltersData, fetchData]);

  // Shared internal helper — eliminates duplication between handleSearchChange & handleFilterFeedbackList
  const applyFilters = useCallback((filters) => {
    const newFilters = { ...updateFilters, ...filters, page: 1 };
    setUpdatedFilters(newFilters);
    dispatch(setFeedbackFilters(newFilters));
    dispatch(fetchFeedbackList(newFilters)).then((res) => {
      if (res?.error) {
        showErrorMessage(res);
      }
    });
  }, [updateFilters, dispatch]);

  // Debounce ref for search — keeps timer ID stable across renders without causing re-renders
  const searchDebounceRef = useRef(null);

  const handleSearchChange = useCallback((filters) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      applyFilters(filters);
    }, SEARCH_DEBOUNCE_MS);
  }, [applyFilters]);

  // Cleanup: cancel any pending debounce timer when the component unmounts
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // Filter feedback list handler
  const handleFilterFeedbackList = useCallback((filter) => {
    applyFilters(filter);
  }, [applyFilters]);


  // Sort table handler
  const sortTable = useCallback((sortKey) => {
    if (sortKey) {
      const newOrder = tableHeaderFilter.order === 'ASC' ? 'DESC' : 'ASC';
      const newHeaderFilter = { sort: sortKey, order: newOrder };
      setTableHeaderFilter(newHeaderFilter);
      fetchData({ sort: sortKey, order: newOrder });
    }
  }, [tableHeaderFilter, fetchData]);

  // Entity click handler
  const entityClick = useCallback((feedbackObj) => {
    console.log('Feedback clicked:', feedbackObj);
    setSelectedFeedbackObj(feedbackObj);
    setIsFeedbackPopup(true);
  }, []);


  // Pagination handlers
  const handlePrevClick = useCallback(() => {
    if (parseInt(currentPage) > 1) {
      fetchData({ page: parseInt(currentPage) - 1 });
    }
  }, [currentPage, fetchData]);

  const handleNextClick = useCallback(() => {
    if (parseInt(currentPage) < totalPages) {
      fetchData({ page: parseInt(currentPage) + 1 });
    }
  }, [currentPage, totalPages, fetchData]);

  const handlePerPageChange = useCallback((perPage) => {
    fetchData({ limit: perPage, page: 1 });
  }, [fetchData]);

  const resetFilters = useCallback(() => {
    const emptyFilters = constData.feedbackReportFilters;

    setUpdatedFilters(emptyFilters);
    setTableHeaderFilter({});
    dispatch(setFeedbackFilters(emptyFilters));

    return emptyFilters;
  }, [dispatch]);

  /* handoff 29 Oct §J: Clear reloads the list unfiltered at page 1 (it used to reset the chips and keep the filtered rows) */
  const clearFilters = useCallback(() => {
    const filters = resetFilters();
    fetchData({ ...filters, page: 1 });
  }, [resetFilters, fetchData]);

  const handleRefresh = useCallback(() => {
    const filters = resetFilters();
    fetchData(filters);
  }, [resetFilters, fetchData]);


  // Close popup handler
  const closeFeedbackPopup = useCallback(() => {
    setIsFeedbackPopup(false);
    setSelectedFeedbackObj({});
  }, []);

  // Memoize pagination entity
  const paginationEntity = useMemo(() => ({
    total: typeof totalFeedbackReports === 'object' ? 0 : totalFeedbackReports,
    current_page: parseInt(currentPage),
    prev_page_url: parseInt(currentPage) > 1 ? `?page=${parseInt(currentPage) - 1}` : null,
    next_page_url: parseInt(currentPage) < totalPages ? `?page=${parseInt(currentPage) + 1}` : null,
    last_page: totalPages,
    per_page: perPage,
  }), [totalFeedbackReports, currentPage, totalPages, perPage]);

  return (
    <ReportPage title={translation('key_feedback_report')} actions={<ReportExportButton onClick={exportToExcel} />}>
      {isFeedbackPopup && (
        <FeedbackDetailDialog feedbackObj={selectedFeedbackObj} onClose={closeFeedbackPopup} />
      )}

      <FeedbackReportFilter
        onClearFilter={clearFilters}
        onFilterFeedbackList={handleFilterFeedbackList}
        onSearchChange={handleSearchChange}
        updateFilters={updateFilters}
      />

      {status === 'loading' ? (
        <CustomSpinner />
      ) : (
        <>
          <ReportTable columns={tableColumns} rows={feedbackList} sortBy={tableHeaderFilter.sort} sortOrder={tableHeaderFilter.order} onSort={sortTable} onCell={entityClick}>
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
      )}
    </ReportPage>
  );
};

export default FeedbackReportPage;
