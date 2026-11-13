import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { saveAs } from 'file-saver';
import { jsonToXlsxBlob } from "../../../../utils/exportToExcel";

import constData from "../../../../components/ReusableComponents/constants";
import PaginationBar from "../../../../components/Layout/pagination/PaginationBar";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { InsuranceReportTableColumns } from "./InsuranceReportTableColumns";
import translation from "../../../../utils/translation";
import { ReportExportButton, ReportPage, ReportTable } from "../ReportShell";
import { fetchMappingBranches } from "../../../../redux/Slices/settings/branches/BranchesSlice";
import { searchStaff } from "../../../../redux/Slices/common/cs/CsSlice";
import configData from "../../../../components/ReusableComponents/app-configs";
import InsuranceReportFilter from "./InsuranceReportFilter";
import { fetchReportOfInsuranceList, setInsuranceReportFilters } from "../../../../redux/Slices/reports/reportSlice";
import { fetchPolicies } from "../../../../redux/Slices/invoices/InvoicesSlice";

const formatStaffData = (staffArray) => {
  if (!staffArray || !Array.isArray(staffArray)) return [];
  return staffArray.map(staff => ({
    value: staff?.id,
    label: staff?.name
  }));
};

const InsuranceReportPage = () => {
  const dispatch = useDispatch();

  const [tableHeaderFilter, setTableHeaderFilter] = useState({});
  const [initialFetch, setInitialFetch] = useState(false);
  const { mappingBranches } = useSelector((state) => state.branches);
  const [csList, setCsList] = useState([]);

  const {
    insuranceReportList,
    insuranceCurrentPage,
    insuranceTotalPages,
    totalInsuranceReports,
    insuranceLastUpdated,
    insurancePerPage,
    status,
    insuranceReportFiltersData
  } = useSelector((state) => state.reports);

  const [updateFilters, setUpdatedFilters] = useState(insuranceReportFiltersData || constData.insuranceReportFilters);

  const tableColumns = useMemo(() => InsuranceReportTableColumns(), []);

  const exportToExcel = useCallback(async () => {
    const fileData = await jsonToXlsxBlob(configData.exportInsuranceReport(insuranceReportList), 'Insurance Reports');
    const dateStr = new Date().toISOString().slice(0, 10);
    saveAs(fileData, `insurance-reports-${dateStr}.xlsx`);
  }, [insuranceReportList]);

  // Initialize filters from Redux
  useEffect(() => {
    if (!insuranceReportFiltersData || Object.keys(insuranceReportFiltersData).length === 0) {
      dispatch(setInsuranceReportFilters(constData.insuranceReportFilters));
      setUpdatedFilters(constData.insuranceReportFilters);
    } else {
      setUpdatedFilters(insuranceReportFiltersData);
    }
  }, [dispatch, insuranceReportFiltersData]);

  useEffect(() => {
    dispatch(fetchMappingBranches({ module_key: 'insurance' }));
    dispatch(fetchPolicies({ type: 1 }));

    dispatch(searchStaff({ branch_id: [], type: 'cs' })).then((res) => {
      if (!res.error && res.payload && res.payload.data) {
        setCsList(formatStaffData(res.payload.data));
      }
    });
  }, [dispatch]);

  // Main fetch function
  const fetchData = useCallback((params = {}) => {
    const finalFilters = { ...updateFilters, ...params };
    dispatch(setInsuranceReportFilters(finalFilters));
    dispatch(fetchReportOfInsuranceList(finalFilters)).then((res) => {
      if (res?.error) {
        console.error('Error fetching insurance reports:', res.error);
      }
    });
  }, [updateFilters, dispatch]);

  useEffect(() => {
    if (!initialFetch) {
      const defaultFilters = constData.insuranceReportFilters;

      if (!insuranceReportFiltersData || Object.keys(insuranceReportFiltersData).length === 0) {
        setUpdatedFilters(defaultFilters);
        dispatch(setInsuranceReportFilters(defaultFilters));
        dispatch(fetchReportOfInsuranceList(defaultFilters)).then((res) => {
          if (res?.error) {
            console.error('Error fetching insurance reports:', res.error);
          }
        });
      } else {
        fetchData(insuranceReportFiltersData);
      }

      setInitialFetch(true);
    }
  }, [initialFetch, insuranceReportFiltersData, dispatch, fetchData]);

  // Shared internal helper — eliminates duplication between handleSearchChange & handleFilterInsuranceList
  const applyFilters = useCallback((filters) => {
    const newFilters = { ...updateFilters, ...filters, page: 1 };
    setUpdatedFilters(newFilters);
    dispatch(setInsuranceReportFilters(newFilters));
    dispatch(fetchReportOfInsuranceList(newFilters)).then((res) => {
      if (res?.error) {
        console.error('Error fetching insurance reports:', res.error);
      }
    });
  }, [updateFilters, dispatch]);

  // useRef stores the timer ID across renders without triggering re-renders itself
  const searchDebounceRef = useRef(null);

  const handleSearchChange = useCallback((filters) => {
    // Cancel any pending debounce before scheduling a new one
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      applyFilters(filters);
    }, constData.SEARCH_DEBOUNCE_MS);
  }, [applyFilters]);

  // Cleanup: cancel any pending debounce timer when the component unmounts
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const handleFilterInsuranceList = useCallback((filter) => {
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
  const entityClick = useCallback((insuranceObj) => {
    console.log('Insurance clicked:', insuranceObj);
  }, []);


  // Pagination handlers
  const handlePrevClick = useCallback(() => {
    if (parseInt(insuranceCurrentPage) > 1) {
      fetchData({ page: parseInt(insuranceCurrentPage) - 1 });
    }
  }, [insuranceCurrentPage, fetchData]);

  const handleNextClick = useCallback(() => {
    if (parseInt(insuranceCurrentPage) < insuranceTotalPages) {
      fetchData({ page: parseInt(insuranceCurrentPage) + 1 });
    }
  }, [insuranceCurrentPage, insuranceTotalPages, fetchData]);

  const handlePerPageChange = useCallback((insurancePerPage) => {
    fetchData({ limit: insurancePerPage, page: 1 });
  }, [fetchData]);

  const resetFilters = useCallback(() => {
    const emptyFilters = constData.insuranceReportFilters;

    setUpdatedFilters(emptyFilters);
    setTableHeaderFilter({});
    dispatch(setInsuranceReportFilters(emptyFilters));

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
    total: typeof totalInsuranceReports === 'object' ? 0 : totalInsuranceReports,
    current_page: parseInt(insuranceCurrentPage),
    prev_page_url: parseInt(insuranceCurrentPage) > 1 ? `?page=${parseInt(insuranceCurrentPage) - 1}` : null,
    next_page_url: parseInt(insuranceCurrentPage) < insuranceTotalPages ? `?page=${parseInt(insuranceCurrentPage) + 1}` : null,
    last_page: insuranceTotalPages,
    per_page: insurancePerPage,
  }), [totalInsuranceReports, insuranceCurrentPage, insuranceTotalPages, insurancePerPage]);

  return (
    <ReportPage title={translation('key_insurance') + ' ' + translation('key_report')} actions={<ReportExportButton onClick={exportToExcel} />}>
      <InsuranceReportFilter
        onClearFilter={clearFilters}
        onFilterInsuranceList={handleFilterInsuranceList}
        onSearchChange={handleSearchChange}
        updateFilters={updateFilters}
        mappingBranches={mappingBranches}
        csList={csList}
      />

      {status === 'loading' ? (
        <CustomSpinner />
      ) : (
        <>
          <ReportTable columns={tableColumns} rows={insuranceReportList} sortBy={tableHeaderFilter.sort} sortOrder={tableHeaderFilter.order} onSort={sortTable} onCell={entityClick}>
              <PaginationBar
                  entity={paginationEntity}
                  handlePrevClick={handlePrevClick}
                  handleNextClick={handleNextClick}
                  handlePerPageChange={handlePerPageChange}
                  handleRefresh={handleRefresh}
                  last_update={insuranceLastUpdated}
              />
          </ReportTable>
        </>
      )}
    </ReportPage>
  );
};

export default InsuranceReportPage;