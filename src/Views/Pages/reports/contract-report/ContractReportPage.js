import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { saveAs } from 'file-saver';
import { jsonToXlsxBlob } from "../../../../utils/exportToExcel";
import dayjs from "dayjs";

import constData from "../../../../components/ReusableComponents/constants";
import PaginationBar from "../../../../components/Layout/pagination/PaginationBar";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { ContractReportTableColumns } from "./ContractReportTableColumns";
import translation from "../../../../utils/translation";
import { ReportExportButton, ReportPage, ReportTable } from "../ReportShell";
import { fetchMappingBranches } from "../../../../redux/Slices/settings/branches/BranchesSlice";
import { searchStaff } from "../../../../redux/Slices/common/cs/CsSlice";
import configData from "../../../../components/ReusableComponents/app-configs";
import ContractReportFilter from "./ContractReportFilter";
import {
  fetchReportOfContractList,
  setContractReportFilters,
} from "../../../../redux/Slices/reports/reportSlice";
import { fetchWorkerReferenceIdInitials } from "../../../../redux/Slices/worker/WorkerSlice";
import { fetchCountries } from "../../../../redux/Slices/common/countries/CountriesSlice";
import { fetchContractWorkerStatus } from "../../../../redux/Slices/common/CommonSlice";
import { fetchWorkerNationalities } from "../../../../redux/Slices/common/nationalities/NationalitiesSlice";
import { fetchContractInvoiceStatus } from "../../../../redux/Slices/contract/ContractSlice";

// Moved outside component — no closure dependencies, avoids re-creation on every render
const formatStaffData = (staffArray) => {
  if (!staffArray || !Array.isArray(staffArray)) return [];
  return staffArray.map(staff => ({
    value: staff?.id,
    label: staff?.name
  }));
};

// Moved outside component — pure function, no closure dependencies
const buildDefaultFilters = () => {
  const today = dayjs();
  const sevenDaysAgo = today.subtract(7, 'day');
  return {
    ...constData.contractReportFilters,
    contract_from_date: sevenDaysAgo.format('YYYY-MM-DD'),
    contract_to_date: today.format('YYYY-MM-DD'),
    page: 1
  };
};

// Debounce delay for search input — 400ms balances responsiveness and API call reduction
const SEARCH_DEBOUNCE_MS = 400;

const ContractReportPage = () => {
  const dispatch = useDispatch();

  const [tableHeaderFilter, setTableHeaderFilter] = useState({});
  const [initialFetch, setInitialFetch] = useState(false);
  const { mappingBranches } = useSelector((state) => state.branches);
  const { workerRefIdInitials } = useSelector((state) => state.worker);
  const { workerContractStatus } = useSelector((state) => state.common);
  const { workerNationalities } = useSelector((state) => state.nationalities);
  const { countries } = useSelector((state) => state.countries);
  const { contractInvoiceStatus } = useSelector((state) => state.contracts);
  const [csList, setCsList] = useState([]);

  const {
    contractReportList,
    contractCurrentPage,
    contractTotalPages,
    totalContractReports,
    contractLastUpdated,
    contractPerPage,
    status,
    contractReportFilters
  } = useSelector((state) => state.reports);

  // getDefaultFilters was a useCallback with no deps — moved to module-level pure function
  const [updateFilters, setUpdatedFilters] = useState(buildDefaultFilters);

  const tableColumns = useMemo(() => ContractReportTableColumns(), []);

  const exportToExcel = useCallback(async () => {
    const fileData = await jsonToXlsxBlob(configData.exportContractReport(contractReportList), 'Contracts');
    const dateStr = new Date().toISOString().slice(0, 10);
    saveAs(fileData, `contracts-${dateStr}.xlsx`);
  }, [contractReportList]);

  // Initialize filters from Redux
  useEffect(() => {
    if (!contractReportFilters || Object.keys(contractReportFilters).length === 0) {
      const defaultFilters = buildDefaultFilters();
      dispatch(setContractReportFilters(defaultFilters));
      setUpdatedFilters(defaultFilters);
    } else {
      setUpdatedFilters(contractReportFilters);
    }
  }, [dispatch, contractReportFilters]);

  useEffect(() => {
    dispatch(fetchWorkerReferenceIdInitials());
    dispatch(fetchCountries({ type: 'employer' }));
    dispatch(fetchContractWorkerStatus({ type: 'worker' }));
    dispatch(fetchWorkerNationalities({ type: 'worker' }));
    dispatch(fetchContractInvoiceStatus());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchMappingBranches({ module_key: 'processing' }));

    dispatch(searchStaff({ branch_id: [], type: 'cs' })).then((res) => {
      if (!res.error && res.payload && res.payload.data) {
        setCsList(formatStaffData(res.payload.data));
      }
    });
  }, [dispatch]);

  const fetchData = useCallback((params = {}) => {
    const finalFilters = { ...updateFilters, ...params };
    dispatch(setContractReportFilters(finalFilters));
    dispatch(fetchReportOfContractList(finalFilters)).then((res) => {
      if (res?.error) {
        console.error('Error fetching contract reports:', res.error);
      }
    });
  }, [updateFilters, dispatch]);

  useEffect(() => {
    if (!initialFetch) {
      if (!contractReportFilters || Object.keys(contractReportFilters).length === 0) {
        const defaultFilters = buildDefaultFilters();

        setUpdatedFilters(defaultFilters);
        dispatch(setContractReportFilters(defaultFilters));
        dispatch(fetchReportOfContractList(defaultFilters)).then((res) => {
          if (res?.error) {
            console.error('Error fetching contract reports:', res.error);
          }
        });
      } else {
        fetchData(contractReportFilters);
      }

      setInitialFetch(true);
    }
  }, [initialFetch, contractReportFilters, dispatch, fetchData]);

  // Shared internal helper — eliminates duplication between handleSearchChange & handleFilterContractList
  const applyFilters = useCallback((filters) => {
    const newFilters = { ...updateFilters, ...filters, page: 1 };
    setUpdatedFilters(newFilters);
    dispatch(setContractReportFilters(newFilters));
    dispatch(fetchReportOfContractList(newFilters)).then((res) => {
      if (res?.error) {
        console.error('Error fetching contract reports:', res.error);
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

  const handleFilterContractList = useCallback((filter) => {
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
  const entityClick = useCallback((contractObj) => {
    console.log('Contract clicked:', contractObj);
  }, []);


  // Pagination handlers
  const handlePrevClick = useCallback(() => {
    if (parseInt(contractCurrentPage) > 1) {
      fetchData({ page: parseInt(contractCurrentPage) - 1 });
    }
  }, [contractCurrentPage, fetchData]);

  const handleNextClick = useCallback(() => {
    if (parseInt(contractCurrentPage) < contractTotalPages) {
      fetchData({ page: parseInt(contractCurrentPage) + 1 });
    }
  }, [contractCurrentPage, contractTotalPages, fetchData]);

  const handlePerPageChange = useCallback((contractPerPage) => {
    fetchData({ limit: contractPerPage, page: 1 });
  }, [fetchData]);

  const resetFilters = useCallback(() => {
    const emptyFilters = {
      ...constData.contractReportFilters,
      contract_from_date: '',
      contract_to_date: '',
      visa_expiry_from_date: '',
      visa_expiry_to_date: '',
      group: [],
      status: [],
      contract_type: [],
      nationality: [],
      contract_status: [],
      worker_reference_id: [],
      worker_current_location: [],
      branch_id: [],
      staff_id: [],
      page: 1
    };

    setUpdatedFilters(emptyFilters);
    setTableHeaderFilter({});
    dispatch(setContractReportFilters(emptyFilters));

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
    total: typeof totalContractReports === 'object' ? 0 : totalContractReports,
    current_page: parseInt(contractCurrentPage),
    prev_page_url: parseInt(contractCurrentPage) > 1 ? `?page=${parseInt(contractCurrentPage) - 1}` : null,
    next_page_url: parseInt(contractCurrentPage) < contractTotalPages ? `?page=${parseInt(contractCurrentPage) + 1}` : null,
    last_page: contractTotalPages,
    per_page: contractPerPage,
  }), [totalContractReports, contractCurrentPage, contractTotalPages, contractPerPage]);

  return (
    <ReportPage title={translation('key_contract') + ' ' + translation('key_report')} actions={<ReportExportButton onClick={exportToExcel} />}>
      <ContractReportFilter
        onClearFilter={clearFilters}
        onFilterContractList={handleFilterContractList}
        onSearchChange={handleSearchChange}
        updateFilters={updateFilters}
        mappingBranches={mappingBranches}
        csList={csList}
        locationList={countries}
        workerRefIdInitials={workerRefIdInitials}
        contractStatus={workerContractStatus}
        workerNationalities={workerNationalities}
        contractInvoiceStatus={contractInvoiceStatus}
      />

      {status === 'loading' ? (
        <CustomSpinner />
      ) : (
        <>
          <ReportTable columns={tableColumns} rows={contractReportList} sortBy={tableHeaderFilter.sort} sortOrder={tableHeaderFilter.order} onSort={sortTable} onCell={entityClick}>
              <PaginationBar
                  entity={paginationEntity}
                  handlePrevClick={handlePrevClick}
                  handleNextClick={handleNextClick}
                  handlePerPageChange={handlePerPageChange}
                  handleRefresh={handleRefresh}
                  last_update={contractLastUpdated}
              />
          </ReportTable>
        </>
      )}
    </ReportPage>
  );
};

export default ContractReportPage;