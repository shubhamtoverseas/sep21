import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import PropTypes from 'prop-types';
import { useTranslation } from "react-i18next";
import { jsonToXlsxBlob } from "../../../utils/exportToExcel";
import { saveAs } from 'file-saver';
import constData from "../../../components/ReusableComponents/constants";
import routes from "../routes/routesConfig";
import Btn from '../../../components/ui/Btn';
import Badge from '../../../components/ui/Badge';
import './invoice.css';
import styles from './InvoiceList.module.css';
import { balanceDueOf } from "./invoiceBalance";
const InvoiceTable = React.lazy(() => import("./InvoiceTable"));
const InvoiceFilter = React.lazy(() => import("./InvoiceFilter"));
import { InvoiceListTableColumns } from "./InvoiceListTableColumns";
import PaginationBar from "../../../components/Layout/pagination/PaginationBar";
import configData from "../../../components/ReusableComponents/app-configs";
import CustomSpinner from "../../../components/ReusableComponents/CustomSpinner";
import { getPermissionValue, isAdminUser, loadColumnKeys, saveColumnKeys, showErrorMessage } from "../../../services/commonService";
import { COLUMN_VIEW_STATE_KEYS } from "../../../components/ReusableComponents/constants";
import {
  fetchInvoiceListAdmin,
  fetchActionStatusList,
  saveChangeInvoiceStatus,
  setFilters,
  setInvoicePageLimit,
  clearInvoiceHeaderForm,
  clearInvoiceContractItemsList,
} from "../../../redux/Slices/invoices/InvoicesSlice";
import { formatHK, toNumberOrNull, toNonZeroNumberOrNull } from "../../../utils/utils";
import dayjs from "dayjs";
import GeneralConfirmSelectionPopup from "./general/GeneralConfirmSelectionPopup";
import { setInvoiceCurrentEmployer, fetchEmployerDetail, clearCurrentEmployer, clearInvoiceLocalInfo, clearInvoiceCurrentJobInfo } from "../../../redux/Slices/employer/EmployerSlice";
import { setInvoiceCurrentWorker, fetchWorkerDetailTabInfo, clearWorkerDetail } from "../../../redux/Slices/worker/WorkerSlice";
import ActionStatusPopup from "../../../components/Layout/popups/invoice-popups/ActionStatusPopup";
import { ShowToast } from "../../../components/show-toast/ShowToast";
import Icon from "../../../components/Icon/Icon";

import { paymentMethodLabel } from "./payment-method-selector/paymentMethodCatalogue";
import { batchActions, needsReason } from "./invoiceActionList";
/* typing in the search box and changing a filter read the list once input pauses (performance track A-01, A-02) */
const LIST_INPUT_DEBOUNCE_MS = 300;
const readStoredInvoiceFilters = () => {
  try {
    const raw = localStorage.getItem(constData.INVOICE_FILTERS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' && Object.keys(parsed).length ? parsed : null;
  } catch { return null; }
};

const Invoice = ({ employerObj, workerObj, viewFrom = '', employer_worker_id }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [tableHeaderFilter, setTableHeaderFilter] = useState({ sort: '', sort_by: "", order: '' });
  const fieldsToShow = useMemo(() => configData.invoiceColumnsConfigTrans({ t }), [t]);
  const [fieldsToShowState, setFieldsToShowState] = useState(() => loadColumnKeys(COLUMN_VIEW_STATE_KEYS.invoices, fieldsToShow));
  const [isRegLink, setRegLink] = useState(false);
  const pageLimit = useSelector((state) => state.invoices.invoicePageLimit) || 25;
  const [isGeneralInsurance, setIsGeneralInsurance] = useState(false);
  const [isSelectedItems, setIsSelectedItems] = useState([]);
  const [isSelectStatusPopup, setIsSelectStatusPopup] = useState(false);
  const [batchStatus, setBatchStatus] = useState('');
  const isAdmin = isAdminUser();
  const { permissionList } = useSelector((state) => state.users);
  const [isInitialLoad, setIsInitialLoad] = useState(false);
  const [showNewInvoiceMenu, setShowNewInvoiceMenu] = useState(false);
  const newInvoiceRef = useRef(null);

  useEffect(() => {
    if (!showNewInvoiceMenu) return;
    const handler = (e) => {
      if (newInvoiceRef.current && !newInvoiceRef.current.contains(e.target)) {
        setShowNewInvoiceMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNewInvoiceMenu]);
  const IsInvoicBatchActionAddPermission = getPermissionValue(permissionList?.data, 'invoice', 'invoice_batch_action');
  const IsInvoiceExportPermission = getPermissionValue(permissionList?.data, 'invoice', 'invoice_export');
  const invoiceGlobalListPermission = getPermissionValue(permissionList?.data, 'invoice', 'invoice_global_list');
  /* A-07: without the list key the table is not shown and the list is not asked for (the server would refuse with 401,
     which the client takes for an expired session: a token refresh and a retry) */
  const canList = invoiceGlobalListPermission === 'y' || isAdmin;
  const IsInvoiceContractAddPermission = useMemo(() => getPermissionValue(permissionList?.data, 'invoice', 'contract_invoice_add_from_invoice_global'), [permissionList]);
  const IsInvoiceGeneralAddPermission = useMemo(() => getPermissionValue(permissionList?.data, 'invoice', 'general_invoice_add_from_contract_global'), [permissionList]);

  const { invoices, currentPage, totalPages, totalInvoices, lastUpdated, actionStatusList, filtersData } = useSelector((state) => ({
    invoices: state.invoices.invoices,
    currentPage: state.invoices.currentPage,
    totalPages: state.invoices.totalPages,
    totalInvoices: (state.invoices.invoices.length > 0) ? state.invoices.total : 0,
    lastUpdated: state.invoices.lastUpdated,
    actionStatusList: state.invoices.actionStatusList,
    filtersData: state.invoices.filtersData,
  }), shallowEqual);

  const invoiceStats = useMemo(() => {
    const n = (v) => Number(v) || 0;
    return invoices.reduce((acc, inv) => {
      acc.total += n(inv.final_amount);
      acc.paid += n(inv.paid_amount);
      acc.balance_due += balanceDueOf(inv);
      acc.unsettled += n(inv.unsettled_amount);
      acc.bad_debt += n(inv.bad_debt_amount);
      return acc;
    }, { total: 0, paid: 0, balance_due: 0, unsettled: 0, bad_debt: 0 });
  }, [invoices]);

  /* KPI amounts as the table formats money (reference fmt): rounded, negatives in parentheses, '—' for no value */
  const fmtAmt = useCallback((n) => (n == null || n === '' ? '—' : formatHK(Math.round(Number(n)))), []);

  /* A-02: the list keeps no server refresh time, so the header shows when this page last loaded the list */
  const [refreshedAt, setRefreshedAt] = useState(null);
  useEffect(() => { setRefreshedAt(new Date()); }, [invoices]);

  const { workerDetailTabInfo } = useSelector((state) => state.worker)

  /* the selected invoices' rows (the table hands back id and status only); the batch actions read their type */
  const selectedInvoiceRows = useMemo(() => invoices.filter((inv) => isSelectedItems.some((item) => item?.id === inv?.id)),
    [invoices, isSelectedItems]);

  const selectionStatusLabel = useMemo(() => {
    if (isSelectedItems.length === 0) return '';
    const first = isSelectedItems[0];
    const label = configData.invoiceStatusIdMapping[first?.status]?.label?.toLowerCase();
    const allSame = isSelectedItems.every(i => i.status === first?.status);
    return allSame && label ? `all ${label}` : '';
  }, [isSelectedItems]);

  const [updateFilters, setUpdatedFilters] = useState(() => {
    if (viewFrom === 'employer' || viewFrom === 'worker') return filtersData;
    return readStoredInvoiceFilters() || filtersData;
  });
  /* the filters as last set, for handlers that must not change with every keystroke (the search box, the table's sort) */
  const filtersRef = useRef(updateFilters);
  filtersRef.current = updateFilters;

  /* The list is read on INV-1 (POST /contract/admin/invoices/list). One request at a time: a newer one cancels the one in
     flight, so the latest always lands. Typing and filter changes read it once input pauses; a click (Apply, sort, page,
     clear, batch) reads it at once and drops a read still waiting. */
  const listRequest = useRef(null);
  const listTimer = useRef(null);
  useEffect(() => () => clearTimeout(listTimer.current), []);
  const requestList = useCallback((body, { reportError = false } = {}) => {
    clearTimeout(listTimer.current);
    if (!canList) return;
    listRequest.current?.abort();
    const request = dispatch(fetchInvoiceListAdmin(body));
    listRequest.current = request;
    request.then((res) => {
      if (reportError && res?.error && !res.meta?.aborted) showErrorMessage(res);
    });
  }, [dispatch, canList]);
  const scheduleList = useCallback((body) => {
    clearTimeout(listTimer.current);
    listTimer.current = setTimeout(() => requestList(body), LIST_INPUT_DEBOUNCE_MS);
  }, [requestList]);

  useEffect(() => {
    if (viewFrom === 'employer' || viewFrom === 'worker') return;
    if (!updateFilters || Object.keys(updateFilters).length === 0) return;
    const pageNum = parseInt(currentPage);
    try {
      localStorage.setItem(constData.INVOICE_FILTERS_STORAGE_KEY, JSON.stringify({
        ...updateFilters,
        page: pageNum > 0 ? pageNum : (updateFilters.page || 1),
        limit: pageLimit,
      }));
    } catch { /* storage unavailable */ }
  }, [updateFilters, viewFrom, currentPage, pageLimit]);

  // Initialize filters from redux store
  useEffect(() => {
    dispatch(clearInvoiceLocalInfo());
    dispatch(clearInvoiceHeaderForm());
    dispatch(clearInvoiceContractItemsList());
    dispatch(clearInvoiceCurrentJobInfo());

    if (viewFrom !== 'employer') {
      dispatch(clearCurrentEmployer());
    }
    dispatch(clearWorkerDetail());
  }, [dispatch, viewFrom]);

  useEffect(() => {
    if (!filtersData || Object.keys(filtersData).length === 0) {
      const stored = (viewFrom !== 'employer' && viewFrom !== 'worker') ? readStoredInvoiceFilters() : null;
      dispatch(setFilters(stored || constData.invoiceFilters));
    }
  }, [dispatch, filtersData, viewFrom]);

  const [isExporting, setIsExporting] = useState(false);
  const exportToExcel = useCallback(async () => {
    const exportInvoices = invoices.map((invoice) => {
      const isZeroed = invoice.status === 6 || invoice.status === 11;
      return {
        "Invoice Status": invoice.invoice_status || '',
        "Invoice Type": configData.invoiceTypeLabel(invoice.invoice_type, invoice.payment_type) || '',
        "Payment": paymentMethodLabel(invoice?.payment_method),
        "Staff": invoice.staff_name || '',
        "Ref No.": invoice.invoice_number || '',
        "Date": invoice.invoices_date || '',
        "Employer Name": invoice.employer_name || '',
        "Worker Name": invoice.worker_name || '',
        "Code": invoice.worker_reference_id || '',
        "Worker Nationality": invoice.worker_nationality_name || '',
        "Total": isZeroed ? 0 : toNumberOrNull(invoice?.final_amount),
        "Paid": isZeroed ? 0 : toNonZeroNumberOrNull(invoice?.paid_amount),
        "Unsettled": isZeroed ? 0 : toNonZeroNumberOrNull(invoice?.unsettled_amount),
        "Refunded": isZeroed ? 0 : toNonZeroNumberOrNull(invoice?.refund_amount),
        "Bad Debt": isZeroed ? 0 : toNonZeroNumberOrNull(invoice?.bad_debt_amount),
        "Adjustments": isZeroed ? 0 : toNonZeroNumberOrNull(invoice?.adjusted_amount),
      };
    });
    if (exportInvoices.length === 0) return;
    setIsExporting(true);
    try {
      const fileData = await jsonToXlsxBlob(exportInvoices, 'Sheet1', {
        moneyColumns: constData.INVOICE_EXPORT_MONEY_COLUMNS,
        moneyFormat: constData.EXCEL_MONEY_FORMAT,
        autoFitColumns: true,
      });
      const dateStr = new Date().toISOString().slice(0, 10); // e.g., "2024-06-09"
      saveAs(fileData, `invoices-${ dateStr }.xlsx`);
    } catch (error) {
      ShowToast("error", t('key_something_went_wrong'));
    } finally {
      setIsExporting(false);
    }
  }, [invoices, t]);

  const handleGetInvoices = useCallback((filters = updateFilters, headerFilters = tableHeaderFilter) => {
    setUpdatedFilters({ ...updateFilters });
    filters = { ...updateFilters };
    requestList({
      page: parseInt(currentPage),
      ...(viewFrom === 'employer' && { employer_id: employerObj?.employer_id || employer_worker_id }),
      ...(viewFrom === 'worker' && { worker_id: workerObj?.worker_id || employer_worker_id }),
      ...headerFilters,
      ...filters,
      limit: pageLimit,
    }, { reportError: true });
  }, [requestList, updateFilters, tableHeaderFilter, currentPage, employerObj?.employer_id, workerObj?.worker_id, employer_worker_id, viewFrom, pageLimit]);


  useEffect(() => {
    if (!canList) return;
    if (!isInitialLoad || employerObj?.employer_id || workerObj?.worker_id) {
      handleGetInvoices();
      setIsInitialLoad(true);
    }
  }, [dispatch, isInitialLoad, employerObj?.employer_id, workerObj?.worker_id, canList]);

  /* A-06: the selection's action list is read once per first selected invoice (its id and status); Batch actions reuse it */
  const firstSelectedId = isSelectedItems[0]?.id;
  const firstSelectedStatus = isSelectedItems[0]?.status;
  const actionListFor = useRef('');
  useEffect(() => {
    if (!firstSelectedId) return;
    const key = `${ firstSelectedId }:${ firstSelectedStatus }`;
    actionListFor.current = key;
    dispatch(fetchActionStatusList({ status: firstSelectedStatus, contract_invoices_id: firstSelectedId })).then((res) => {
      if (res?.error && actionListFor.current === key) actionListFor.current = '';
    });
  }, [dispatch, firstSelectedId, firstSelectedStatus]);


  const handleGetInvoicesByFilter = useCallback((filters = updateFilters, headerFilters = tableHeaderFilter) => {
    setUpdatedFilters({ ...updateFilters, ...filters, page: 1 });
    dispatch(setFilters({ ...updateFilters, ...filters, page: 1 }));
    filters = { ...updateFilters, ...filters, page: 1 };
    scheduleList({
      ...(viewFrom === 'employer' && { employer_id: employerObj?.employer_id || employer_worker_id }),
      ...(viewFrom === 'worker' && { worker_id: workerObj?.worker_id || employer_worker_id }),
      page: parseInt(currentPage),
      ...headerFilters,
      ...filters,
      limit: pageLimit,
    });
  }, [dispatch, scheduleList, updateFilters, tableHeaderFilter, currentPage, employerObj?.employer_id, workerObj?.worker_id, employer_worker_id, viewFrom, pageLimit]);

  const handleClearFilter = useCallback((headerFilters = constData.invoiceFilters) => {
    setUpdatedFilters(headerFilters);
    dispatch(setFilters(headerFilters));
    requestList({
      ...(viewFrom === 'employer' && { employer_id: employerObj?.employer_id || employer_worker_id }),
      ...(viewFrom === 'worker' && { worker_id: workerObj?.worker_id || employer_worker_id }),
      page: parseInt(currentPage),
      ...headerFilters,
      limit: pageLimit,
    });
  }, [dispatch, requestList, employerObj?.employer_id, currentPage, workerObj?.worker_id, viewFrom, employer_worker_id, pageLimit]);


  /* A-01: the box shows every keystroke; the list is read once typing pauses, and only the latest search lands */
  const onSearch = useCallback((event) => {
    const filters = { ...filtersRef.current, search_text: event.target.value, page: 1 };
    filtersRef.current = filters;
    setUpdatedFilters(filters);
    dispatch(setFilters(filters));
    scheduleList({
      page: parseInt(currentPage),
      ...(viewFrom === 'employer' && { employer_id: employerObj?.employer_id || employer_worker_id }),
      ...(viewFrom === 'worker' && { worker_id: workerObj?.worker_id || employer_worker_id }),
      ...tableHeaderFilter,
      ...filters,
      limit: pageLimit,
    });
  }, [dispatch, scheduleList, currentPage, employerObj?.employer_id, tableHeaderFilter, workerObj?.worker_id, employer_worker_id, viewFrom, pageLimit]);

  const setCheckedItems = useCallback((ids) => {
    setIsSelectedItems(ids);
  }, []);

  const sortTable = useCallback((sortKey) => {
    if (sortKey) {
      /* ascending → descending → cleared (reference cycle) */
      const current = tableHeaderFilter.sort === sortKey ? tableHeaderFilter.order : '';
      const clear = current === 'DESC';
      const newOrder = current === 'ASC' ? 'DESC' : 'ASC';
      setTableHeaderFilter(clear ? { sort: '', order: '' } : { sort: sortKey, order: newOrder });
      // Map column UI key → API sort_by field name
      const apiSortBy = constData.INVOICE_LIST_API_SORT_KEYS[sortKey] || sortKey;
      const filters = clear
        ? { ...filtersRef.current, sort_by: constData.invoiceFilters.sort_by, sort_order: constData.invoiceFilters.sort_order, page: 1 }
        : { ...filtersRef.current, sort_by: apiSortBy, sort_order: newOrder, page: 1 };
      setUpdatedFilters(filters);
      dispatch(setFilters(filters));
      requestList({
        page: parseInt(currentPage),
        ...(viewFrom === 'employer' && { employer_id: employerObj?.employer_id || employer_worker_id }),
        ...(viewFrom === 'worker' && { worker_id: workerObj?.worker_id || employer_worker_id }),
        ...filters,
        limit: pageLimit,
      });
    }
  }, [tableHeaderFilter, dispatch, requestList, currentPage, viewFrom, employerObj?.employer_id, workerObj?.worker_id, employer_worker_id, pageLimit]);

  const entityClick = useCallback((row) => {
    if (row?.employer_id > 0 && row?.worker_id > 0) {
      if (row.status === 8 || row.status === 9) {
        navigate(`/invoices/add-contract-invoice/refund-invoice/` + row.id);
      } else if (row.status === 10) {
        navigate(`/invoices/add-contract-invoice/exchange-payment-review/` + row.id);
      } else if (row.status === 11) {
        navigate(`/invoices/add-contract-invoice/exchange-payment-type-invoice/` + row.id);
      } else if (row.status === 6 && (row.invoice_type === 'contract_refund' || row.invoice_type === 'overpaid_refund')) {
        navigate(`/invoices/add-contract-invoice/refund-invoice/` + row.id);
      } else {
        navigate(`/invoices/add-contract-invoice/payment-type-invoice/` + row.id);
      }
    } else {
      if (row.status === 8 || row.status === 9) {
        navigate(`/invoices/general/refund-invoice/` + row.id);
      } else if (row.status === 10) {
        navigate(`/invoices/general/exchange-payment-review/` + row.id);
      } else if (row.status === 6 && (row.invoice_type === 'general_refund' || row.invoice_type === 'overpaid_refund')) {
        navigate(`/invoices/general/refund-invoice/` + row.id);
      } else {
        navigate(`/invoices/general/payment-type-invoice/` + row.id);
      }
    }

  }, [navigate]);

  const handlePrevClick = useCallback(() => {
    let filter = { ...updateFilters };
    if (parseInt(currentPage) > 1) {
      requestList({
        ...filter,
        page: parseInt(currentPage) - 1,
        ...(viewFrom === 'employer' && { employer_id: employerObj?.employer_id || employer_worker_id }),
        ...(viewFrom === 'worker' && { worker_id: workerObj?.worker_id || employer_worker_id }),
        limit: pageLimit,
      });
    }
  }, [requestList, updateFilters, currentPage, employerObj?.employer_id, pageLimit, workerObj?.worker_id, employer_worker_id, viewFrom]);

  const handleNextClick = useCallback(() => {
    let filter = { ...updateFilters };
    if (parseInt(currentPage) < totalPages) {
      requestList({
        ...filter,
        page: parseInt(currentPage) + 1,
        ...(viewFrom === 'employer' && { employer_id: employerObj?.employer_id || employer_worker_id }),
        ...(viewFrom === 'worker' && { worker_id: workerObj?.worker_id || employer_worker_id }),
        limit: pageLimit,
      });
    }
  }, [requestList, updateFilters, currentPage, employerObj?.employer_id, totalPages, pageLimit, workerObj?.worker_id, employer_worker_id, viewFrom]);

  const handlePerPageChange = useCallback((perPage) => {
    dispatch(setInvoicePageLimit(perPage));
    let filter = { ...updateFilters };
    requestList({
      page: parseInt(currentPage),
      ...filter,
      ...(viewFrom === 'employer' && { employer_id: employerObj?.employer_id || employer_worker_id }),
      ...(viewFrom === 'worker' && { worker_id: workerObj?.worker_id || employer_worker_id }),
      limit: perPage,
    });
  }, [dispatch, requestList, updateFilters, currentPage, employerObj?.employer_id, workerObj?.worker_id, employer_worker_id, viewFrom]);

  /* Apply reads the list at once; a read still waiting from a filter change is dropped (one read, not two) */
  const handleApplyAllFilters = useCallback(() => {
    let filter = { ...updateFilters, page: 1 };
    requestList({
      page: parseInt(currentPage),
      ...(viewFrom === 'employer' && { employer_id: employerObj?.employer_id || employer_worker_id }),
      ...(viewFrom === 'worker' && { worker_id: workerObj?.worker_id || employer_worker_id }),
      ...filter,
      limit: pageLimit,
    });
  }, [requestList, updateFilters, currentPage, employerObj?.employer_id, workerObj?.worker_id, employer_worker_id, viewFrom, pageLimit]);

  const handleSetFieldsToShow = useCallback((fields) => {
    setFieldsToShowState(fields);
    saveColumnKeys(COLUMN_VIEW_STATE_KEYS.invoices, fields);
  }, []);
  const handleSelectAddGeneralInsurance = useCallback(() => {
    setIsGeneralInsurance(true);
  }, []);

  const cancelContractDialog = useCallback(() => {
    setIsGeneralInsurance(false);
  }, []);

  const handleSelectOption = useCallback((option) => {
    navigate(`/invoices/general/add-contract-invoice/` + option);
  }, [navigate]);

  const handleSelectOptionInvoice = useCallback((option) => {
    if (option === 'worker' && workerDetailTabInfo) {
      dispatch(fetchWorkerDetailTabInfo({ "worker_id": employer_worker_id, type: 'basic' }))
        .then((res) => {
          // You can handle the response here if needed
          if (res?.payload?.data) {
            dispatch(setInvoiceCurrentWorker(res?.payload?.data));
          }
        });
    }
    if (option === 'employer') {
      dispatch(fetchEmployerDetail({ "employer_id": employer_worker_id }))
        .then((res) => {
          // You can handle the response here if needed
          if (res?.payload?.data) {
            dispatch(setInvoiceCurrentEmployer(res?.payload?.data));
          }
        });
    }
    navigate(`/invoices/general/add-contract-invoice/` + option);
  }, [dispatch, navigate, employer_worker_id, workerDetailTabInfo]);

  const handleSelectStatusPopup = useCallback(() => {
    if (isSelectedItems.length === 0) return;
    const invoiceSelected = isSelectedItems[0];
    /* the list read for this selection is reused; it is read here only if that read is missing or failed */
    const key = `${ invoiceSelected?.id }:${ invoiceSelected?.status }`;
    if (actionListFor.current !== key) {
      actionListFor.current = key;
      dispatch(fetchActionStatusList({ status: invoiceSelected?.status, contract_invoices_id: invoiceSelected?.id }));
    }
    setBatchStatus('');
    setIsSelectStatusPopup(!isSelectStatusPopup);
  }, [isSelectedItems, dispatch, isSelectStatusPopup]);

  /* Void, Mark Unsettled, Mark Bad Debt and Revert ask for a reason first (spec v5 §2.4): the batch popup opens on that status */
  const openBatchReason = useCallback((status) => {
    setBatchStatus(status);
    setIsSelectStatusPopup(true);
  }, []);

  /* A-03: one change-status call per invoice, as before (each its own result); when they have all answered the list is
     read once, and the toast follows the answers */
  const handleUpdateStatus = useCallback((status, reason) => {
    if (isSelectedItems.length === 0) return;
    const calls = isSelectedItems.map((item) =>
      dispatch(saveChangeInvoiceStatus({ invoice_id: item?.id, from_status: item?.status, to_status: status, ...(reason ? { reason } : {}) })));
    setIsSelectStatusPopup(false);
    setIsSelectedItems([]);
    Promise.allSettled(calls).then((results) => {
      if (results.some((r) => r.status === 'fulfilled' && !r.value?.error)) {
        requestList({
          page: parseInt(currentPage),
          ...updateFilters,
          limit: pageLimit,
        });
      }
      ShowToast("success", t('key_invoice_status_updated_successfully'));
    });
  }, [isSelectedItems, dispatch, requestList, currentPage, updateFilters, pageLimit, t]);

  /* A-04: the table is memoised; its props stay the same while only the search text changes */
  const visibleFields = useMemo(
    () => (viewFrom === "worker" ? fieldsToShowState.filter(field => field !== 'key_worker_name' && field !== 'key_worker_code') : fieldsToShowState),
    [viewFrom, fieldsToShowState]
  );
  const tableColumns = InvoiceListTableColumns(visibleFields);
  const logRowChange = useCallback((id) => console.log(id), []);

  return (
    <div className={`${ styles.pageWrap } ${ styles.invoiceList }`}>
      { isSelectStatusPopup && <ActionStatusPopup onClose={ () => { setIsSelectStatusPopup(false) } } selectedInvoices={ selectedInvoiceRows } actionStatusList={ actionStatusList } handleUpdateStatus={ handleUpdateStatus } initialStatus={ batchStatus } /> }
      { (viewFrom !== 'employer' && viewFrom !== 'worker' && isGeneralInsurance) && <GeneralConfirmSelectionPopup cancelContractDialog={ cancelContractDialog } confirmSelectOption={ handleSelectOption } /> }

      {/* ── Page header ── */}
      { (viewFrom !== 'employer' && viewFrom !== 'worker') && (
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderBody}>
            <h1 className={styles.pageTitle}>Invoices</h1>
            <p className={styles.pageSubtitle}>All Standalone, Contract, Exchange, Refund and Underpayment invoices. Click any row to open Invoice Detail.</p>
            { refreshedAt && <div className={ styles.pageStats }>{ t('key_last_refresh') } <b>{ dayjs(refreshedAt).format('HH:mm') }</b></div> }
          </div>
          <div className={styles.pageHeaderActions}>
            { (IsInvoiceExportPermission === 'y' || isAdmin) && (
              <Btn variant="secondary" onClick={ exportToExcel } disabled={ isExporting }>
                <Icon name="external" size={13} /> { isExporting ? <CustomSpinner variant="inline" /> : 'Export' }
              </Btn>
            ) }
            { (IsInvoicBatchActionAddPermission === 'y' || isAdmin) && (
              <Btn variant="secondary" onClick={ handleSelectStatusPopup }>
                <Icon name="filter" size={13} /> Batch actions
              </Btn>
            ) }
            { (IsInvoiceContractAddPermission === 'y' || IsInvoiceGeneralAddPermission === 'y' || isAdmin) && (
              <div className={styles.newInvoiceWrap} ref={newInvoiceRef}>
                <Btn variant="primary" onClick={ () => setShowNewInvoiceMenu(m => !m) }>
                  <Icon name="plus" size={13} /> New invoice <Icon name="chev_down" size={11} />
                </Btn>
                { showNewInvoiceMenu && (
                  <div className={styles.newInvoiceMenu}>
                    <div className={styles.newInvoiceMenuHeader}>Create</div>
                    { (IsInvoiceGeneralAddPermission === 'y' || isAdmin) && (
                      <button
                        className={styles.newInvoiceMenuItem}
                        onClick={ () => { setShowNewInvoiceMenu(false); handleSelectAddGeneralInsurance(); } }
                      >
                        <Icon name="receipt" size={14} /> Standalone Invoice
                      </button>
                    ) }
                    { (IsInvoiceContractAddPermission === 'y' || isAdmin) && (
                      <Link
                        className={styles.newInvoiceMenuItem}
                        to={ '../' + routes.addContractInvoice }
                        onClick={ () => setShowNewInvoiceMenu(false) }
                      >
                        <Icon name="building" size={14} /> Contract Invoice
                      </Link>
                    ) }
                  </div>
                ) }
              </div>
            ) }
          </div>
        </div>
      ) }

      {/* ── Stats strip ── */}
      { (viewFrom !== 'employer' && viewFrom !== 'worker') && (
        <div className={styles.statsStrip}>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>{ t('key_invoices') }</div>
            <div className={styles.statValue}>{ totalInvoices }</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>{ t('key_total') }</div>
            <div className={styles.statValue}>{ fmtAmt(invoiceStats.total) }</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>{ t('key_paid') }</div>
            <div className={styles.statValue}>{ fmtAmt(invoiceStats.paid) }</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>Balance Due</div>
            <div className={styles.statValue}>{ fmtAmt(invoiceStats.balance_due) }</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>{ t('key_unsettled') }</div>
            <div className={styles.statValue}>{ fmtAmt(invoiceStats.unsettled) }</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statLabel}>Bad Debt</div>
            <div className={styles.statValue}>{ fmtAmt(invoiceStats.bad_debt) }</div>
          </div>
        </div>
      ) }

      {/* ── Selection bar (when rows are checked) ── */}
      { isSelectedItems.length > 0 && (viewFrom !== 'employer' && viewFrom !== 'worker') && (
        <div className={styles.selectionBar}>
          <span className={styles.selectionBarInfo}>
            <span className={styles.selectionCount}>{ isSelectedItems.length }</span> { (isSelectedItems.length === 1 ? t('key_invoice') : t('key_invoices')).toLowerCase() } selected
            { selectionStatusLabel && <><span className={styles.selectionSep}>·</span>{ selectionStatusLabel }</> }
          </span>
          <span className={styles.selectionSep}>·</span>
          <div className={styles.selectionActions}>
            { (IsInvoicBatchActionAddPermission === 'y' || isAdmin) && Array.isArray(actionStatusList) &&
              batchActions(actionStatusList, selectedInvoiceRows).map(item => {
                const act = constData.STATUS_ACTION_MAP[item.id] || { label: item.name, icon: 'chev_right' };
                return (
                  <Btn key={ item.id } variant="secondary" onClick={ () => needsReason(item.id) ? openBatchReason(item.id) : handleUpdateStatus(item.id) }>
                    <Icon name={ act.icon } size={13} /> { act.label }
                  </Btn>
                );
              })
            }
            { (IsInvoiceExportPermission === 'y' || isAdmin) && (
              <Btn variant="secondary" onClick={ exportToExcel } disabled={ isExporting }>
                <Icon name="external" size={13} /> { isExporting ? <CustomSpinner variant="inline" /> : 'Export selection' }
              </Btn>
            ) }
            <Btn variant="ghost" onClick={ () => setIsSelectedItems([]) }>Clear</Btn>
          </div>
        </div>
      ) }

      {/* ── Search + filter toggle + columns (InvoiceFilter manages collapse state) ── */}
      <Suspense fallback={ <CustomSpinner /> }>
        <InvoiceFilter
          onSearch={ onSearch }
          fieldsToShow={ fieldsToShowState }
          handleFieldItems={ handleSetFieldsToShow }
          setRegLink={ setRegLink }
          isRegLink={ isRegLink }
          onHandleFilterInvoiceList={ handleGetInvoicesByFilter }
          onClearFilter={ handleClearFilter }
          applyAllFilters={ handleApplyAllFilters }
          trans={ t }
          updateFilters={ updateFilters }
          viewFrom={ viewFrom }
          employerObj={ employerObj }
          handleSelectOption={ handleSelectOptionInvoice }
        />
      </Suspense>

      { (invoiceGlobalListPermission === 'y' || isAdmin) && (
        <div>
          <Suspense fallback={ <CustomSpinner /> }>
            <InvoiceTable
              columns={ tableColumns }
              data={ invoices }
              setCheckedItems={ setCheckedItems }
              sortTable={ sortTable }
              tableHeaderfilter={ tableHeaderFilter }
              entityClick={ entityClick }
              onChangeFunc={ logRowChange }
              showCheckbox={ (employerObj?.employer_id || workerObj?.worker_id) ? false : true }
              roundedTable={ true }
              isTableShadow={ false }
              selectedItems={ isSelectedItems }
            />
          </Suspense>
          <div className={styles.tableFoot}>
            <div className={styles.legendRow}>
              <Badge variant="success" status="Status" />
              <span className={styles.legendText}>{ t('key_invoice_list_legend') }</span>
            </div>
            <PaginationBar
              entity={ {
                total: totalInvoices,
                current_page: parseInt(currentPage),
                prev_page_url: parseInt(currentPage) > 1 ? `?page=${ parseInt(currentPage) - 1 }` : null,
                next_page_url: parseInt(currentPage) < totalPages ? `?page=${ parseInt(currentPage) + 1 }` : null,
                last_page: totalPages,
                // user's selected size (drives every fetch); redux perPage
                // echoes the API and can lag, snapping the dropdown back to 25
                per_page: pageLimit,
              } }
              handlePrevClick={ handlePrevClick }
              handleNextClick={ handleNextClick }
              handlePerPageChange={ handlePerPageChange }
              last_update={ lastUpdated }
            />
          </div>
        </div>
      ) }
    </div>
  );
};
Invoice.propTypes = {
  employerObj: PropTypes.object,
  viewFrom: PropTypes.string,
  workerObj: PropTypes.object,
  employer_worker_id: PropTypes.any,
}
export default Invoice;