import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { saveAs } from 'file-saver';
import { jsonToXlsxBlob } from "../../../../utils/exportToExcel";

import constData from "../../../../components/ReusableComponents/constants";
import PaginationBar from "../../../../components/Layout/pagination/PaginationBar";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { InterviewReportTableColumns } from "./InterviewReportTableColumns";
import { fetchInterviewList, setInterviewFilters } from "../../../../redux/Slices/settings/interview-report/InterviewReportSlice";
import translation from "../../../../utils/translation";
import { ReportExportButton, ReportPage, ReportTable } from "../ReportShell";
import InterviewReportFilter from "./InterviewReportFilter";
import { fetchMappingBranches } from "../../../../redux/Slices/settings/branches/BranchesSlice";
import { searchStaff } from "../../../../redux/Slices/common/cs/CsSlice";
import configData from "../../../../components/ReusableComponents/app-configs";
import dayjs from "dayjs";
import { reportDefaultDateRange } from "../reportConstants";

const formatStaffData = (staffArray) => {
  if (!staffArray || !Array.isArray(staffArray)) return [];
  return staffArray.map(staff => ({
    value: staff?.id,
    label: staff?.name
  }));
};

const InterviewReportPage = () => {
  const dispatch = useDispatch();

  const [tableHeaderFilter, setTableHeaderFilter] = useState({});
  const [initialFetch, setInitialFetch] = useState(false);
  const { mappingBranches } = useSelector((state) => state.branches);
  const [csList, setCsList] = useState([]);
  const [interpreterList, setInterpreterList] = useState([]);

  const {
    interviewList,
    currentPage,
    totalPages,
    totalInterviewReports,
    lastUpdated,
    perPage,
    status,
    interviewFiltersData
  } = useSelector((state) => state.interviewReports);

  const [updateFilters, setUpdatedFilters] = useState(interviewFiltersData || constData.interviewReportFilters);

  const tableColumns = useMemo(() => InterviewReportTableColumns(), []);

  const exportToExcel = useCallback(async () => {
    const fileData = await jsonToXlsxBlob(configData.exportInterviews(interviewList));
    const dateStr = new Date().toISOString().slice(0, 10);
    saveAs(fileData, `interview-reports-${dateStr}.xlsx`);
  }, [interviewList]);

  // Initialize filters from Redux
  useEffect(() => {
    if (!interviewFiltersData || Object.keys(interviewFiltersData).length === 0) {
      dispatch(setInterviewFilters(constData.interviewReportFilters));
      setUpdatedFilters(constData.interviewReportFilters);
    } else {
      setUpdatedFilters(interviewFiltersData);
    }
  }, [dispatch, interviewFiltersData]);

  useEffect(() => {
    dispatch(fetchMappingBranches({ module_key: 'jo' }));

    dispatch(searchStaff({ branch_id: [], type: 'cs' })).then((res) => {
      if (!res.error && res.payload && res.payload.data) {
        setCsList(formatStaffData(res.payload.data));
      }
    });

    dispatch(searchStaff({ branch_id: [], type: 'interpreter' })).then((res) => {
      if (!res.error && res.payload && res.payload.data) {
        setInterpreterList(formatStaffData(res.payload.data));
      }
    });
  }, [dispatch]);

  // Main fetch function
  const fetchData = useCallback((params = {}) => {
    const finalFilters = { ...updateFilters, ...params };
    dispatch(setInterviewFilters(finalFilters));
    dispatch(fetchInterviewList(finalFilters)).then((res) => {
      if (res?.error) {
        console.error('Error fetching interviews:', res.error);
      }
    });
  }, [updateFilters, dispatch]);

  useEffect(() => {
    if (!initialFetch) {
      const shouldApplyDefaultDates = !interviewFiltersData ||
        Object.keys(interviewFiltersData).length === 0 ||
        (!interviewFiltersData.from_date && !interviewFiltersData.to_date);

      if (shouldApplyDefaultDates) {
        /* default duration: Last 7 days (Mubin 5 Nov; was -3/+3 days) */
        const { startDate: defaultStartDate, endDate: defaultEndDate } = reportDefaultDateRange();

        const defaultFilters = {
          ...constData.interviewReportFilters,
          from_date: dayjs(defaultStartDate).format('YYYY-MM-DD'),
          to_date: dayjs(defaultEndDate).format('YYYY-MM-DD'),
          selected_date_range_type: 'custom',
        };

        setUpdatedFilters(defaultFilters);
        dispatch(setInterviewFilters(defaultFilters));
        dispatch(fetchInterviewList(defaultFilters)).then((res) => {
          if (res?.error) {
            console.error('Error fetching interviews:', res.error);
          }
        });
      } else {
        // Use existing filters
        fetchData(interviewFiltersData);
      }

      setInitialFetch(true);
    }
  }, [initialFetch, interviewFiltersData, dispatch, fetchData]);

  const applyFilters = useCallback((filters) => {
    const newFilters = { ...updateFilters, ...filters, page: 1 };
    setUpdatedFilters(newFilters);
    dispatch(setInterviewFilters(newFilters));
    dispatch(fetchInterviewList(newFilters)).then((res) => {
      if (res?.error) {
        console.error('Error fetching interviews:', res.error);
      }
    });
  }, [updateFilters, dispatch]);

  const searchDebounceRef = useRef(null);

  const handleSearchChange = useCallback((filters) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      applyFilters(filters);
    }, constData.SEARCH_DEBOUNCE_MS);
  }, [applyFilters]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const handleFilterInterviewList = useCallback((filter) => {
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
  const entityClick = useCallback((interviewObj) => {
    console.log('Interview clicked:', interviewObj);
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
    const emptyFilters = constData.interviewReportFilters;

    setUpdatedFilters(emptyFilters);
    setTableHeaderFilter({});
    dispatch(setInterviewFilters(emptyFilters));

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


  // Memoize pagination entity
  const paginationEntity = useMemo(() => ({
    total: typeof totalInterviewReports === 'object' ? 0 : totalInterviewReports,
    current_page: parseInt(currentPage),
    prev_page_url: parseInt(currentPage) > 1 ? `?page=${parseInt(currentPage) - 1}` : null,
    next_page_url: parseInt(currentPage) < totalPages ? `?page=${parseInt(currentPage) + 1}` : null,
    last_page: totalPages,
    per_page: perPage,
  }), [totalInterviewReports, currentPage, totalPages, perPage]);

  return (
    <ReportPage title={translation('key_interview_report')} actions={<ReportExportButton onClick={exportToExcel} />}>
      <InterviewReportFilter
        onClearFilter={clearFilters}
        onFilterInterviewList={handleFilterInterviewList}
        onSearchChange={handleSearchChange}
        updateFilters={updateFilters}
        mappingBranches={mappingBranches}
        csList={csList}
        interpreterList={interpreterList}
      />

      {status === 'loading' ? (
        <CustomSpinner />
      ) : (
        <>
          <ReportTable columns={tableColumns} rows={interviewList} sortBy={tableHeaderFilter.sort} sortOrder={tableHeaderFilter.order} onSort={sortTable} onCell={entityClick}>
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

export default InterviewReportPage;