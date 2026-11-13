import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { saveAs } from 'file-saver';
import { jsonToXlsxBlob } from "../../../../utils/exportToExcel";

import constData, { SEARCH_DEBOUNCE_MS } from "../../../../components/ReusableComponents/constants";
import PaginationBar from "../../../../components/Layout/pagination/PaginationBar";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { JobOfferReportTableColumns } from "./JobOfferReportTableColumns";
import translation from "../../../../utils/translation";
import { ReportExportButton, ReportPage, ReportTable } from "../ReportShell";
import { fetchMappingBranches } from "../../../../redux/Slices/settings/branches/BranchesSlice";
import { searchStaff } from "../../../../redux/Slices/common/cs/CsSlice";
import configData from "../../../../components/ReusableComponents/app-configs";
import JobOfferReportFilter from "./JobOfferReportFilter";
import { fetchJobOfferCreatedByList, fetchReportOfJobOfferList, setJobOfferFilters } from "../../../../redux/Slices/reports/reportSlice";
import dayjs from "dayjs";
import { reportDefaultDateRange } from "../reportConstants";

const formatStaffData = (staffArray) => {
  if (!staffArray || !Array.isArray(staffArray)) return [];
  return staffArray.map(staff => ({
    value: staff?.id,
    label: staff?.name
  }));
};

const formatCreatedByData = (createdByArray) => {
  if (!createdByArray || !Array.isArray(createdByArray)) return [];
  return createdByArray.map(item => ({
    value: item?.id || item?.user_id,
    label: item?.name || item?.full_name || item?.email
  }));
};

const JobOfferReportPage = () => {
  const dispatch = useDispatch();

  const [tableHeaderFilter, setTableHeaderFilter] = useState({});
  const [initialFetch, setInitialFetch] = useState(false);
  const { mappingBranches } = useSelector((state) => state.branches);
  const [csList, setCsList] = useState([]);

  const {
    jobOfferList,
    currentPage,
    totalPages,
    totalJobOfferReports,
    lastUpdated,
    perPage,
    status,
    jobOfferFiltersData,
    jobOfferCreatedByList
  } = useSelector((state) => state.reports);

  const [updateFilters, setUpdatedFilters] = useState(jobOfferFiltersData || constData.jobOfferReportFilters);

  const tableColumns = useMemo(() => JobOfferReportTableColumns(), []);

  const exportToExcel = useCallback(async () => {
    const fileData = await jsonToXlsxBlob(configData.exportJobOffers(jobOfferList));
    const dateStr = new Date().toISOString().slice(0, 10);
    saveAs(fileData, `jobOffer-reports-${dateStr}.xlsx`);
  }, [jobOfferList]);

  // Initialize filters from Redux
  useEffect(() => {
    if (!jobOfferFiltersData || Object.keys(jobOfferFiltersData).length === 0) {
      dispatch(setJobOfferFilters(constData.jobOfferReportFilters));
      setUpdatedFilters(constData.jobOfferReportFilters);
    } else {
      setUpdatedFilters(jobOfferFiltersData);
    }
  }, [dispatch, jobOfferFiltersData]);

  useEffect(() => {
    dispatch(fetchMappingBranches({ module_key: 'jo' }));

    dispatch(searchStaff({ branch_id: [], type: 'cs' })).then((res) => {
      if (!res.error && res.payload && res.payload.data) {
        const formattedData = formatStaffData(res.payload.data);
        setCsList(formattedData);
      }
    });

    dispatch(fetchJobOfferCreatedByList());
  }, [dispatch]);

  const formattedCreatedByList = useMemo(() => {
    return formatCreatedByData(jobOfferCreatedByList);
  }, [jobOfferCreatedByList]);

  // Main fetch function
  const fetchData = useCallback((params = {}) => {
    const finalFilters = { ...updateFilters, ...params };
    dispatch(setJobOfferFilters(finalFilters));
    dispatch(fetchReportOfJobOfferList(finalFilters)).then((res) => {
      if (res?.error) {
        console.error('Error fetching jobOffers:', res.error);
      }
    });
  }, [updateFilters, dispatch]);

  useEffect(() => {
    if (!initialFetch) {
      const shouldApplyDefaultDates = !jobOfferFiltersData ||
        Object.keys(jobOfferFiltersData).length === 0 ||
        (!jobOfferFiltersData.search_from_date && !jobOfferFiltersData.search_to_date);

      if (shouldApplyDefaultDates) {
        /* default duration: Last 7 days (Mubin 5 Nov; was -3/+3 days) */
        const { startDate: defaultStartDate, endDate: defaultEndDate } = reportDefaultDateRange();

        const defaultFilters = {
          ...constData.jobOfferReportFilters,
          search_from_date: dayjs(defaultStartDate).format('YYYY-MM-DD'),
          search_to_date: dayjs(defaultEndDate).format('YYYY-MM-DD'),
        };

        setUpdatedFilters(defaultFilters);
        dispatch(setJobOfferFilters(defaultFilters));
        dispatch(fetchReportOfJobOfferList(defaultFilters)).then((res) => {
          if (res?.error) {
            console.error('Error fetching jobOffers:', res.error);
          }
        });
      } else {
        // Use existing filters
        fetchData(jobOfferFiltersData);
      }

      setInitialFetch(true);
    }
  }, [initialFetch, jobOfferFiltersData, dispatch, fetchData]);

  // Shared internal helper — eliminates duplication between handleSearchChange & handleFilterJobOfferList
  const applyFilters = useCallback((filters) => {
    const newFilters = { ...updateFilters, ...filters, page: 1 };
    setUpdatedFilters(newFilters);
    dispatch(setJobOfferFilters(newFilters));
    dispatch(fetchReportOfJobOfferList(newFilters)).then((res) => {
      if (res?.error) {
        console.error('Error fetching jobOffers:', res.error);
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
    }, SEARCH_DEBOUNCE_MS);
  }, [applyFilters]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const handleFilterJobOfferList = useCallback((filter) => {
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
  const entityClick = useCallback((jobOfferObj) => {
    console.log('JobOffer clicked:', jobOfferObj);
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
    const emptyFilters = constData.jobOfferReportFilters;

    setUpdatedFilters(emptyFilters);
    setTableHeaderFilter({});
    dispatch(setJobOfferFilters(emptyFilters));

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


  const paginationEntity = useMemo(() => ({
    total: typeof totalJobOfferReports === 'object' ? 0 : totalJobOfferReports,
    current_page: parseInt(currentPage),
    prev_page_url: parseInt(currentPage) > 1 ? `?page=${parseInt(currentPage) - 1}` : null,
    next_page_url: parseInt(currentPage) < totalPages ? `?page=${parseInt(currentPage) + 1}` : null,
    last_page: totalPages,
    per_page: perPage,
  }), [totalJobOfferReports, currentPage, totalPages, perPage]);

  return (
    <ReportPage title={translation('key_job_offer') + ' ' + translation('key_report')} actions={<ReportExportButton onClick={exportToExcel} />}>
      <JobOfferReportFilter
        onClearFilter={clearFilters}
        onFilterJobOfferList={handleFilterJobOfferList}
        onSearchChange={handleSearchChange}
        updateFilters={updateFilters}
        mappingBranches={mappingBranches}
        csList={csList}
        createdByList={formattedCreatedByList}
      />

      {status === 'loading' ? (
        <CustomSpinner />
      ) : (
        <>
          <ReportTable columns={tableColumns} rows={jobOfferList} sortBy={tableHeaderFilter.sort} sortOrder={tableHeaderFilter.order} onSort={sortTable} onCell={entityClick}>
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

export default JobOfferReportPage;