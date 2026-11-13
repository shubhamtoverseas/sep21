import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { saveAs } from 'file-saver';
import { jsonToXlsxBlob } from "../../../../utils/exportToExcel";
import dayjs from "dayjs";

import constData from "../../../../components/ReusableComponents/constants";
import PaginationBar from "../../../../components/Layout/pagination/PaginationBar";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { ReportExportButton, ReportPage, ReportSearchField, ReportStats, ReportTable, ReportToolbar } from "../ReportShell";
import { fetchMappingBranches } from "../../../../redux/Slices/settings/branches/BranchesSlice";
import { searchStaff } from "../../../../redux/Slices/common/cs/CsSlice";
import ConsolidatedLedgerReportFilter from "./ConsolidatedLedgerReportFilter";
import {
  ConsolidatedLedgerReportTableColumns,
} from "./ConsolidatedLedgerReportTableColumns";
import {
  // fetchConsolidatedLedgerList,
  setConsolidatedLedgerFilters,
} from "../../../../redux/Slices/reports/reportSlice";
import translation from "../../../../utils/translation";
import configData from "../../../../components/ReusableComponents/app-configs";
import Btn from "../../../../components/ui/Btn";

// Pure function — no closure dependencies
const formatStaffData = (staffArray) => {
  if (!staffArray || !Array.isArray(staffArray)) return [];
  return staffArray.map(staff => ({
    value: staff?.id,
    label: staff?.name,
  }));
};

// Default filters — last 7 days
const buildDefaultFilters = () => {
  const today = dayjs();
  const sevenDaysAgo = today.subtract(7, 'day');
  return {
    ...constData.consolidatedLedgerFilters,
    from_date: sevenDaysAgo.format('YYYY-MM-DD'),
    to_date: today.format('YYYY-MM-DD'),
    action: [],
    payment_method: [],
    branch_id: [],
    invoice_cs_id: null,
    page: 1,
  };
};

const SEARCH_DEBOUNCE_MS = 400;

const ConsolidatedLedgerReportPage = () => {
  const dispatch = useDispatch();

  const [tableHeaderFilter, setTableHeaderFilter] = useState({});
  const [initialFetch, setInitialFetch] = useState(false);
  const [invoiceCsList, setInvoiceCsList] = useState([]);
  /* legacy: the toolbar search is not wired to the ledger (MIGRATION_OPEN_POINTS, Reports shell #1) — the field only holds
     the typed text until product says what it should search */
  const [searchText, setSearchText] = useState("");

  const { mappingBranches } = useSelector((state) => state.branches);

  const {
    consolidatedLedgerList,
    consolidatedLedgerCurrentPage,
    consolidatedLedgerTotalPages,
    totalConsolidatedLedger,
    consolidatedLedgerLastUpdated,
    consolidatedLedgerPerPage,
    consolidatedLedgerSummary,
    status,
    consolidatedLedgerFilters,
  } = useSelector((state) => state.reports);

  const [updateFilters, setUpdatedFilters] = useState(buildDefaultFilters);

  const tableColumns = useMemo(() => ConsolidatedLedgerReportTableColumns(), []);

  // TODO: Replace with real action/payment-method lists from API/Redux when available
  // These will come from dedicated API calls similar to how contractInvoiceStatus works
  const actionList = useSelector((state) => state.reports?.ledgerActionList || []);
  const paymentMethodList = useSelector((state) => state.reports?.ledgerPaymentMethodList || []);

  const exportToExcel = useCallback(async () => {
    const fileData = await jsonToXlsxBlob(configData.exportConsolidatedLedgerReport(consolidatedLedgerList), 'Consolidated Ledger');
    const dateStr = new Date().toISOString().slice(0, 10);
    saveAs(fileData, `consolidated-ledger-report-${dateStr}.xlsx`);
  }, [consolidatedLedgerList]);

  // Initialize filters from Redux
  useEffect(() => {
    if (!consolidatedLedgerFilters || Object.keys(consolidatedLedgerFilters).length === 0) {
      const defaultFilters = buildDefaultFilters();
      dispatch(setConsolidatedLedgerFilters(defaultFilters));
      setUpdatedFilters(defaultFilters);
    } else {
      setUpdatedFilters(consolidatedLedgerFilters);
    }
  }, [dispatch, consolidatedLedgerFilters]);

  useEffect(() => {
    dispatch(fetchMappingBranches({ module_key: 'processing' }));

    dispatch(searchStaff({ branch_id: [], type: 'cs' })).then((res) => {
      if (!res.error && res.payload && res.payload.data) {
        setInvoiceCsList(formatStaffData(res.payload.data));
      }
    });

    // TODO: Dispatch actions to fetch actionList and paymentMethodList when APIs are available
    // dispatch(fetchLedgerActionList());
    // dispatch(fetchLedgerPaymentMethodList());
  }, [dispatch]);

  const fetchData = useCallback((params = {}) => {
    const finalFilters = { ...updateFilters, ...params };
    dispatch(setConsolidatedLedgerFilters(finalFilters));
    // dispatch(fetchConsolidatedLedgerList(finalFilters)).then((res) => {
    //     if (res?.error) {
    //         console.error('Error fetching consolidated ledger reports:', res.error);
    //     }
    // });
  }, [updateFilters, dispatch]);

  useEffect(() => {
    if (!initialFetch) {
      if (!consolidatedLedgerFilters || Object.keys(consolidatedLedgerFilters).length === 0) {
        const defaultFilters = buildDefaultFilters();
        setUpdatedFilters(defaultFilters);
        dispatch(setConsolidatedLedgerFilters(defaultFilters));
        // dispatch(fetchConsolidatedLedgerList(defaultFilters)).then((res) => {
        //     if (res?.error) {
        //         console.error('Error fetching consolidated ledger reports:', res.error);
        //     }
        // });
      } else {
        fetchData(consolidatedLedgerFilters);
      }
      setInitialFetch(true);
    }
  }, [initialFetch, consolidatedLedgerFilters, dispatch, fetchData]);

  const applyFilters = useCallback((filters) => {
    const newFilters = { ...updateFilters, ...filters, page: 1 };
    setUpdatedFilters(newFilters);
    dispatch(setConsolidatedLedgerFilters(newFilters));
    // dispatch(fetchConsolidatedLedgerList(newFilters)).then((res) => {
    //     if (res?.error) {
    //         console.error('Error fetching consolidated ledger reports:', res.error);
    //     }
    // });
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

  const handleFilterLedgerList = useCallback((filter) => {
    applyFilters(filter);
  }, [applyFilters]);


  const sortTable = useCallback((sortKey) => {
    if (sortKey) {
      const newOrder = tableHeaderFilter.order === 'ASC' ? 'DESC' : 'ASC';
      const newHeaderFilter = { sort: sortKey, order: newOrder };
      setTableHeaderFilter(newHeaderFilter);
      fetchData({ sort: sortKey, order: newOrder });
    }
  }, [tableHeaderFilter, fetchData]);

  const entityClick = useCallback((ledgerObj) => {
    console.log('Ledger row clicked:', ledgerObj);
  }, []);


  const handlePrevClick = useCallback(() => {
    if (parseInt(consolidatedLedgerCurrentPage) > 1) {
      fetchData({ page: parseInt(consolidatedLedgerCurrentPage) - 1 });
    }
  }, [consolidatedLedgerCurrentPage, fetchData]);

  const handleNextClick = useCallback(() => {
    if (parseInt(consolidatedLedgerCurrentPage) < consolidatedLedgerTotalPages) {
      fetchData({ page: parseInt(consolidatedLedgerCurrentPage) + 1 });
    }
  }, [consolidatedLedgerCurrentPage, consolidatedLedgerTotalPages, fetchData]);

  const handlePerPageChange = useCallback((perPage) => {
    fetchData({ limit: perPage, page: 1 });
  }, [fetchData]);

  const resetFilters = useCallback(() => {
    const emptyFilters = {
      ...constData.consolidatedLedgerFilters,
      from_date: '',
      to_date: '',
      action: [],
      payment_method: [],
      branch_id: [],
      invoice_cs_id: null,
      page: 1,
    };

    setUpdatedFilters(emptyFilters);
    setTableHeaderFilter({});
    dispatch(setConsolidatedLedgerFilters(emptyFilters));

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


  const handleLookUpInLedger = useCallback(() => {
    // TODO: Navigate to ledger lookup page or open modal
    console.log('Look Up in Ledger clicked');
  }, []);

  const paginationEntity = useMemo(() => ({
    total: typeof totalConsolidatedLedger === 'object' ? 0 : totalConsolidatedLedger,
    current_page: parseInt(consolidatedLedgerCurrentPage),
    prev_page_url: parseInt(consolidatedLedgerCurrentPage) > 1
      ? `?page=${parseInt(consolidatedLedgerCurrentPage) - 1}`
      : null,
    next_page_url: parseInt(consolidatedLedgerCurrentPage) < consolidatedLedgerTotalPages
      ? `?page=${parseInt(consolidatedLedgerCurrentPage) + 1}`
      : null,
    last_page: consolidatedLedgerTotalPages,
    per_page: consolidatedLedgerPerPage,
  }), [totalConsolidatedLedger, consolidatedLedgerCurrentPage, consolidatedLedgerTotalPages, consolidatedLedgerPerPage]);

  const summaryCards = useMemo(() => {
    return configData.summaryCardsConfig.map((item) => ({
      ...item,
      label: translation(item.labelKey),
      value: consolidatedLedgerSummary?.[item.key] ?? 0,
    }));
  }, [consolidatedLedgerSummary]);

  const handleSearchInputChange = useCallback((e) => {
    setSearchText(e.target.value);
  }, []);

  return (
    <ReportPage title={translation('key_consolidated_ledger') + ' ' + translation('key_report')} actions={<><Btn variant="secondary" onClick={handleLookUpInLedger}>{translation('key_look_up_in_ledger')}</Btn><ReportExportButton onClick={exportToExcel} /></>}>
      <ConsolidatedLedgerReportFilter
        onClearFilter={clearFilters}
        onFilterLedgerList={handleFilterLedgerList}
        onSearchChange={handleSearchChange}
        updateFilters={updateFilters}
        actionList={actionList}
        paymentMethodList={paymentMethodList}
        branchList={mappingBranches}
        invoiceCsList={invoiceCsList}
      />
      <ReportStats items={summaryCards} />
      <ReportToolbar>
        <ReportSearchField id="consolidated-ledger-search" value={searchText} onChange={handleSearchInputChange} />
      </ReportToolbar>
      {status === 'loading' ? (
        <CustomSpinner />
      ) : (
        <>
          <ReportTable columns={tableColumns} rows={consolidatedLedgerList} sortBy={tableHeaderFilter.sort} sortOrder={tableHeaderFilter.order} onSort={sortTable} onCell={entityClick}>
              <PaginationBar
                  entity={paginationEntity}
                  handlePrevClick={handlePrevClick}
                  handleNextClick={handleNextClick}
                  handlePerPageChange={handlePerPageChange}
                  handleRefresh={handleRefresh}
                  last_update={consolidatedLedgerLastUpdated}
              />
          </ReportTable>
        </>
      )}
    </ReportPage>
  );
};

export default ConsolidatedLedgerReportPage;