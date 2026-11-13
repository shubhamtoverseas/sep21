import React, { useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from 'prop-types';
import filterStyles from './InvoiceList.module.css';
import SendRegLink from "../../../components/EmployerForms/send-reg-link/SendRegLink";
import Btn from '../../../components/ui/Btn';
import Icon from '../../../components/Icon/Icon';

// Click-based column chooser — replaces CSS-hover CustomDropDownMultiLevel
/* SH-06: a column option is { value, label }; the stored identity is the value, never the visible label */
const optionValue = (option) => (option && typeof option === 'object' ? option.value : option);
const optionLabel = (option) => (option && typeof option === 'object' ? option.label : option);

function ColumnsDropdown({ allColumns, selected, onToggle, onReset }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);
  return (
    <div ref={wrapRef} className={filterStyles.columnsDropWrap}>
      <button type="button" className={`${filterStyles.btn} ${filterStyles.btnSecondary} ${filterStyles.filterCtl}`} onClick={() => setOpen(o => !o)}>
        <Icon name="columns" size={13} />
        Columns
        <span className={filterStyles.columnsCount}>{selected?.length}</span>
      </button>
      {open && (
        <div className={filterStyles.columnsPanel}>
          <div className={filterStyles.columnsPanelHeader}>Select fields to display</div>
          {allColumns.map((col) => (
            <button key={optionValue(col)} type="button" className={filterStyles.columnsItem} onClick={() => onToggle(optionValue(col))}>
              <span className={`${filterStyles.columnsItemCheck} ${selected?.includes(optionValue(col)) ? filterStyles.columnsItemCheckOn : ''}`}>
                {selected?.includes(optionValue(col)) && <Icon name="check" size={14} />}
              </span>
              {optionLabel(col)}
            </button>
          ))}
          <div className={filterStyles.columnsFoot}>
            <button type="button" onClick={onReset}>{translation('key_clear')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
ColumnsDropdown.propTypes = {
  allColumns: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.shape({ value: PropTypes.string, label: PropTypes.string })])).isRequired,
  selected: PropTypes.arrayOf(PropTypes.string).isRequired,
  onToggle: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
};
/* Search help (reference .mc-shelp): a ? button inside the search — hover / focus shows what the search covers, a click
   pins it, Escape or a click outside closes it */
function SearchHelp() {
  const [peek, setPeek] = useState(false);
  const [pinned, setPinned] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const open = peek || pinned;
  useEffect(() => {
    if (!pinned) return;
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setPinned(false); setPeek(false); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pinned]);
  const onKeyDown = (e) => {
    if (e.key !== 'Escape' || !open) return;
    e.preventDefault();
    setPinned(false);
    setPeek(false);
    btnRef.current?.focus();
  };
  return (
    <span ref={wrapRef} className={`${filterStyles.searchHelpWrap} ${open ? filterStyles.searchHelpShow : ''}`}
      onMouseEnter={() => setPeek(true)} onMouseLeave={() => setPeek(false)} onKeyDown={onKeyDown}>
      <button ref={btnRef} type="button" className={filterStyles.searchHelpBtn} aria-label={translation('key_jo_dash_search_help_label')}
        aria-expanded={open} aria-pressed={pinned} aria-describedby={open ? 'invoice-search-help' : undefined}
        onClick={() => setPinned((p) => !p)} onFocus={() => setPeek(true)} onBlur={() => setPeek(false)}>
        <Icon name="help" size={13} strokeWidth={1.8} />
      </button>
      <span id="invoice-search-help" className={filterStyles.searchHelpPop} role="tooltip">{translation('key_invoice_search_help')}</span>
    </span>
  );
}

import './invoice.css';
import configData from "../../../components/ReusableComponents/app-configs";
import { fetchMappingBranches } from "../../../redux/Slices/settings/branches/BranchesSlice";
import { searchStaff } from '../../../redux/Slices/common/cs/CsSlice';
import constData from "../../../components/ReusableComponents/constants";
import { fetchContractStatus } from "../../../redux/Slices/common/CommonSlice";
import { fetchInvoiceStatus, fetchContractGlobalStatusList, fetchInvoiceFlagList } from "../../../redux/Slices/invoices/InvoicesSlice";
import { fetchContractCategory } from "../../../redux/Slices/contract/ContractSlice";
import { fetchWorkerNationalities } from "../../../redux/Slices/common/nationalities/NationalitiesSlice";
import DateRangePickerComponent from "../../../components/date-range-picker/DateRangePicker";
import { fetchWorkerRefrenceIdInitals } from "../../../redux/Slices/worker/WorkerSlice";
import translation from "../../../utils/translation";
import Select, { components as RSComponents } from "react-select";
import { customStylesOfMultiSelect } from "../../../utils/customStylesOfMultiSelect";
import { getPermissionValue, isAdminUser } from "../../../services/commonService";
import { fetchCountriesAll } from "../../../redux/Slices/common/countries/CountriesSlice";
import { paymentMethodLabel, usePaymentMethodCatalogue } from "./payment-method-selector/paymentMethodCatalogue";

const filterSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '36px',
    border: `1px solid ${state.isFocused ? '#d5d5da' : '#e3e3e7'}`, /* line-strong / line-1 */
    borderRadius: '6px',
    boxShadow: 'none',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '12.5px',
    fontFamily: 'var(--sans)',
    '&:hover': { borderColor: '#d5d5da' },
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '2px 4px 2px 8px',
    flexWrap: 'nowrap',
    overflow: 'hidden',
  }),
  indicatorsContainer: (base) => ({
    ...base,
    minHeight: '34px',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: '0 10px 0 2px',
    color: '#6a6a72', /* text-3 */
  }),
  clearIndicator: (base) => ({
    ...base,
    padding: '0 2px',
    color: '#8e8b8f', /* text-4 */
    ':hover': { color: '#131316' },
  }),
  placeholder: (base) => ({
    ...base,
    fontSize: '12.5px',
    color: 'var(--text-4)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    margin: 0,
  }),
  singleValue: (base) => ({
    ...base,
    fontSize: '12.5px',
    color: '#131316', /* text-1 */
    margin: 0,
  }),
  input: (base) => ({
    ...base,
    fontSize: '12.5px',
    margin: 0,
    padding: 0,
  }),
  /* Selected chips — bundle .multiselect .chip */
  multiValue: (base) => ({
    ...base,
    background: '#f5f5f8', /* bg-subtle */
    border: '1px solid #e3e3e7',
    borderRadius: '4px',
    margin: '1px 2px',
  }),
  multiValueLabel: (base) => ({
    ...base,
    fontSize: '11.5px',
    padding: '1px 2px 1px 6px',
    color: '#131316',
    lineHeight: 1.4,
  }),
  multiValueRemove: (base) => ({
    ...base,
    padding: '0 3px',
    borderRadius: '3px',
    color: '#8e8b8f',
    ':hover': { background: '#f3f3f7', color: '#131316' },
  }),
  /* Popover — bundle .menu */
  menu: (base) => ({
    ...base,
    zIndex: 9999,
    border: '1px solid #e3e3e7',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,.06)', /* shadow-2 */
    overflow: 'hidden',
    fontFamily: 'var(--sans)', /* portal renders outside the app shell */
  }),
  menuList: (base) => ({
    ...base,
    padding: '4px',
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  /* Empty / loading states — same quiet 12.5px menu typography as options */
  noOptionsMessage: (base) => ({
    ...base,
    fontSize: '12.5px',
    color: 'var(--text-4)',
    fontFamily: 'var(--sans)',
    padding: '6px 8px',
  }),
  loadingMessage: (base) => ({
    ...base,
    fontSize: '12.5px',
    color: 'var(--text-4)',
    fontFamily: 'var(--sans)',
    padding: '6px 8px',
  }),
  /* Rows — bundle .menu .item (leading 14px icon slot + 8px gap) */
  option: (base, state) => ({
    ...base,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12.5px',
    padding: '6px 8px',
    borderRadius: '5px',
    backgroundColor: state.isSelected || state.isFocused ? '#f3f3f7' : 'transparent', /* bg-hover */
    color: state.isSelected || state.isFocused ? '#131316' : '#3b3b41', /* text-1 / text-2 */
    cursor: 'pointer',
  }),
};

/* Thin 8×8 border chevron — the bundle's .multiselect::after arrow */
const DropdownIndicator = (props) => (
  <RSComponents.DropdownIndicator { ...props }>
    <span className={ filterStyles.selChevron } aria-hidden="true" />
  </RSComponents.DropdownIndicator>
);

/* Menu row with the bundle's leading icon slot — accent check when selected */
const SelectOption = (props) => (
  <RSComponents.Option { ...props }>
    <span className={ filterStyles.optCheck }>
      { props.isSelected && <Icon name="check" size={ 14 } /> }
    </span>
    <span>{ props.children }</span>
  </RSComponents.Option>
);
SelectOption.propTypes = {
  isSelected: PropTypes.bool,
  children: PropTypes.node,
};

const filterSelectComponents = { DropdownIndicator, Option: SelectOption };

// ─── Defined outside component to avoid re-creation on every render ───────────

const sortBy = constData.INVOICE_SORT_BY_OPTIONS(translation);

/* A-05: the invoice branch mapping, kept for the page session. Other screens put their own module's mapping in the same
   store field, so a later visit puts this copy back instead of reading it again. */
let invoiceBranchMapping = null;

const CONTRACT_TYPE_OPTIONS = constData.CONTRACT_TYPE_INTERNAL_OPTIONS(translation);

// Stable date formatter — no object allocation per call
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const yy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

const InvoiceFilter = ({
  onSearch,
  fieldsToShow,
  handleFieldItems,
  setRegLink,
  isRegLink,
  onHandleFilterInvoiceList,
  onClearFilter,
  applyAllFilters,
  updateFilters,
  viewFrom,
  handleSelectOption,
}) => {
  const dispatch = useDispatch();

  // ── Stable admin check (no re-evaluation every render) ──────────────────
  const isAdmin = useMemo(() => isAdminUser(), []);

  // ── Filter panel visibility ───────────────────────────────────────────────
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const filterDropdownRef = useRef(null);
  const filterPanelWrapRef = useRef(null);
  const filterToggleRef = useRef(null);
  const [filterPopPos, setFilterPopPos] = useState(null);

  useLayoutEffect(() => {
    if (!showFiltersPanel) return;
    const wrapRect = filterPanelWrapRef.current?.getBoundingClientRect();
    const btnRect = filterToggleRef.current?.getBoundingClientRect();
    if (wrapRect && btnRect) {
      setFilterPopPos({ top: btnRect.bottom - wrapRect.top + 6, left: btnRect.left - wrapRect.left });
    }
  }, [showFiltersPanel]);

  useEffect(() => {
    if (!showFiltersPanel) return;
    const handleClickOutside = (e) => {
      const target = e.target;
      if (!(target instanceof Node) || !target.isConnected) return;
      if (target.closest && target.closest('[id^="react-select-"]')) return;
      if (target.closest && target.closest('[data-filter-toggle]')) return;
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(target)) {
        setShowFiltersPanel(false);
      }
    };
    const handleEscape = (e) => { if (e.key === 'Escape') setShowFiltersPanel(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showFiltersPanel]);

  // ── Column chooser options ("Select fields to display") ──────────────────
  // Conflicts sheet U-0223: Change Invoice CS is offered on the invoice detail, not from the list (the list-level
  // ownership entries and their popups were never reachable and are removed)
  const kababOptions = useMemo(() => configData.invoiceOptionsConfig({ translation }), []);

  // ── Stable worker types ───────────────────────────────────────────────────
  const workerTypes = useMemo(() => constData.workerTypeList(), []);

  // ── Redux selectors — granular to minimise re-renders ────────────────────
  const { permissionList } = useSelector((state) => state.users);
  const mappingBranches = useSelector((state) => state.branches.mappingBranches);
  const staffList = useSelector((state) => state.cs.staffList);
  const contractStatus = useSelector((state) => state.common.contractStatus);
  const invoiceStatus = useSelector((state) => state.invoices.invoiceStatus?.data ?? []);
  const invoiceFlagList = useSelector((state) => state.invoices.invoiceFlagList ?? []);
  const contractCategoryLists = useSelector((state) => state.contracts.contractCategoryLists);
  const workerNationalities = useSelector((state) => state.nationalities.workerNationalities);
  const contractGLobalList = useSelector((state) => state.invoices.contractGLobalList?.data ?? []);
  const workerRefrenceIdInitals = useSelector((state) => state.worker.workerRefrenceIdInitals?.data ?? "");
  const countriesAll = useSelector((state) => state.countries.countriesAll);
  // ── Permission values — memoised so getPermissionValue isn't called on every render ──
  const IsInvoiceGeneralAddPermission = useMemo(() => getPermissionValue(permissionList?.data, 'invoice', 'general_invoice_add_from_contract_global'), [permissionList]);
  const InvoiceGlobalDatePermission = useMemo(() => getPermissionValue(permissionList?.data, 'invoice', 'invoice_global_date_filter'), [permissionList]);
  const InvoiceGlobalCustomDatePermission = useMemo(() => getPermissionValue(permissionList?.data, 'invoice', 'invoice_global_custom_date_filter'), [permissionList]);
  // Conflicts sheet U-0223 (ruling C4): the column chooser is the Invoice grant's, never a Job Offer one
  const canSelectColumns = useMemo(() => getPermissionValue(permissionList?.data, 'invoice', 'invoice_select_fields_to_display') === 'y', [permissionList]);


  const InvoiceGlobalDatePermissionObj = useMemo(() => InvoiceGlobalDatePermission ? InvoiceGlobalDatePermission.split(",") : [], [InvoiceGlobalDatePermission]);

  // ── Date range state ──────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState({
    startDate: updateFilters?.start_date ?? null,
    endDate: updateFilters?.end_date ?? null,
  });

  // ── Fetch-guard refs (replace multiple useState booleans) ─────────────────
  // Using refs so setting them does NOT trigger re-renders
  const fetchedCore = useRef(false);
  const fetchedBranch = useRef(false);
  const fetchedOther = useRef(false);
  const fetchedInvoice = useRef(false);

  // Fetch: contract status, countries, nationalities (once)
  useEffect(() => {
    if (fetchedCore.current) return;
    fetchedCore.current = true;

    const promises = [];
    if (!contractStatus?.length) promises.push(dispatch(fetchContractStatus({ type: 'worker' })));
    if (!countriesAll?.length) promises.push(dispatch(fetchCountriesAll({ type: 'employer' })));
    if (!workerNationalities?.length) promises.push(dispatch(fetchWorkerNationalities({ type: 'worker' })));

    // Fire in parallel — no sequential awaiting needed since they're independent
    Promise.all(promises).catch((err) => console.error('Error fetching core data:', err));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch: mapping branches (once per page session)
  useEffect(() => {
    if (fetchedBranch.current) return;
    fetchedBranch.current = true;
    const arg = { module_key: 'invoice' };
    if (invoiceBranchMapping) {
      dispatch(fetchMappingBranches.fulfilled(invoiceBranchMapping, 'invoice-session', arg));
      return;
    }
    dispatch(fetchMappingBranches(arg)).then((res) => {
      if (!res?.error) invoiceBranchMapping = res.payload;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch: contract global list (once); nationalities are read with the core lookups above (one read, not two)
  useEffect(() => {
    if (fetchedOther.current) return;
    fetchedOther.current = true;

    if (!contractGLobalList?.length) dispatch(fetchContractGlobalStatusList());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch: invoice status (once)
  useEffect(() => {
    if (fetchedInvoice.current) return;
    fetchedInvoice.current = true;
    if (!invoiceStatus?.length) dispatch(fetchInvoiceStatus());
    if (!invoiceFlagList?.length) dispatch(fetchInvoiceFlagList());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Memoised select option arrays ─────────────────────────────────────────
  // Only recalculated when the underlying data changes, not on every render

  const invoiceStatusOptions = useMemo(
    () => (Array.isArray(invoiceStatus) ? invoiceStatus.map((i) => ({ value: i.id, label: i.name })) : []),
    [invoiceStatus]
  );

  const countriesOptions = useMemo(
    () => (Array.isArray(countriesAll) ? countriesAll.map((i) => ({ value: i.id, label: i.name })) : []),
    [countriesAll]
  );

  const nationalitiesOptions = useMemo(
    () => (Array.isArray(workerNationalities) ? workerNationalities.map((i) => ({ value: i.id, label: i.name })) : []),
    [workerNationalities]
  );

  const flagOptions = useMemo(
    () => (Array.isArray(invoiceFlagList)
      ? invoiceFlagList.map((i) => (typeof i === 'object' && i !== null
        ? { value: i.key ?? i.id, label: i.name ?? i.label ?? String(i.key ?? i.id) }
        : { value: i, label: String(i) }))
      : []),
    [invoiceFlagList]
  );

  const branchOptions = useMemo(
    () => (Array.isArray(mappingBranches) ? mappingBranches.map((i) => ({ value: i.id, label: i.name })) : []),
    [mappingBranches]
  );

  const staffOptions = useMemo(
    () => (Array.isArray(staffList) ? staffList.map((i) => ({ value: i.id, label: i.name })) : []),
    [staffList]
  );

  /* the 11 payment methods of the Invoice API's catalogue (v4 C-3; Step 8 F1); the API matches each to what invoice rows
     store, retired names included */
  const { catalogue: paymentCatalogue } = usePaymentMethodCatalogue();
  const paymentMethodOptions = useMemo(
    () => (paymentCatalogue?.methods || []).map((m) => ({ value: m.code, label: translation(m.labelKey) })),
    [paymentCatalogue]
  );

  const workerTypeOptions = useMemo(
    () => workerTypes.map((i) => ({ value: i.id, label: translation(i.translationKey) })),
    [workerTypes]
  );

  const workerCodeOptions = useMemo(
    () =>
      Array.isArray(workerRefrenceIdInitals)
        ? workerRefrenceIdInitals.map((i) => ({ value: i, label: i }))
        : [],
    [workerRefrenceIdInitals]
  );

  const contractCategoryOptions = useMemo(
    () => (Array.isArray(contractCategoryLists) ? contractCategoryLists.map((i) => ({ value: i.id, label: i.name })) : []),
    [contractCategoryLists]
  );

  const contractGlobalOptions = useMemo(
    () => (Array.isArray(contractGLobalList) ? contractGLobalList.map((i) => ({ value: i.id, label: i.name })) : []),
    [contractGLobalList]
  );

  const contractStatusOptions = useMemo(
    () =>
      Array.isArray(contractStatus)
        ? contractStatus.map((i) => ({ value: i.id, label: i.admin_panel_status }))
        : [],
    [contractStatus]
  );

  // ── Memoised selected values for controlled selects ───────────────────────

  const selectedInvoiceStatus = useMemo(
    () => invoiceStatusOptions.filter((o) => updateFilters?.invoice_status?.includes(o.value)),
    [invoiceStatusOptions, updateFilters?.invoice_status]
  );

  const selectedCountries = useMemo(
    () => countriesOptions.filter((o) => updateFilters?.branch_country_code?.includes(o.value)),
    [countriesOptions, updateFilters?.branch_country_code]
  );

  const selectedNationalities = useMemo(
    () => nationalitiesOptions.filter((o) => updateFilters?.nationality?.includes(o.value)),
    [nationalitiesOptions, updateFilters?.nationality]
  );

  const selectedFlags = useMemo(
    () => flagOptions.filter((o) => updateFilters?.flags?.includes(o.value)),
    [flagOptions, updateFilters?.flags]
  );

  const selectedBranches = useMemo(
    () => branchOptions.filter((o) => updateFilters?.branch_id?.includes(o.value)),
    [branchOptions, updateFilters?.branch_id]
  );

  const selectedStaff = useMemo(
    () => staffOptions.filter((o) => updateFilters?.staff_id?.includes(o.value)),
    [staffOptions, updateFilters?.staff_id]
  );

  const selectedPaymentMethod = useMemo(
    () => paymentMethodOptions.filter((o) => updateFilters?.payment_method?.includes(o.value)),
    [paymentMethodOptions, updateFilters?.payment_method]
  );

  const selectedWorkerType = useMemo(
    () => workerTypeOptions.find((o) => o.value === updateFilters?.worker_type?.[0]) ?? null,
    [workerTypeOptions, updateFilters?.worker_type]
  );

  const selectedWorkerCode = useMemo(
    () => workerCodeOptions.filter((o) => updateFilters?.worker_reference_id?.includes(o.value)),
    [workerCodeOptions, updateFilters?.worker_reference_id]
  );

  const selectedContractCategory = useMemo(
    () => contractCategoryOptions.filter((o) => updateFilters?.contract_category?.includes(o.value)),
    [contractCategoryOptions, updateFilters?.contract_category]
  );

  const selectedContractGlobal = useMemo(
    () => contractGlobalOptions.filter((o) => updateFilters?.contract_status?.includes(o.value)),
    [contractGlobalOptions, updateFilters?.contract_status]
  );

  const selectedContractStatus = useMemo(
    () => contractStatusOptions.filter((o) => updateFilters?.worker_contract_status?.includes(o.value)),
    [contractStatusOptions, updateFilters?.worker_contract_status]
  );

  const selectedContractType = useMemo(
    () => CONTRACT_TYPE_OPTIONS.filter((o) => updateFilters?.contract_type?.includes(o.value)),
    [updateFilters?.contract_type]
  );

  const selectedSortBy = useMemo(
    () => sortBy.find((o) => o.value === updateFilters?.sort_by) ?? null,
    [updateFilters?.sort_by]
  );

  // ── Stable callbacks ───────────────────────────────────────────────────────

  const getContractCategory = useCallback(
    (selectedOption) => {
      const value = selectedOption?.value || '';
      dispatch(fetchContractCategory({ worker_type: value }));
      onHandleFilterInvoiceList({ worker_type: value === '' ? [] : [value] });
      const workerType = value === 1 ? 'local' : value === 2 ? 'overseas' : 'all';
      dispatch(fetchWorkerRefrenceIdInitals({ worker_type: workerType }));
    },
    [dispatch, onHandleFilterInvoiceList]
  );

  const handleGetCsList = useCallback(
    (selectedOption) => {
      const selected = selectedOption ? selectedOption.map((o) => o.value) : [];
      if (selected.length >= 1) {
        dispatch(searchStaff({ branch_id: selected[selected.length - 1], type: 'cs' }));
      }
      onHandleFilterInvoiceList({ branch_id: selected });
    },
    [dispatch, onHandleFilterInvoiceList]
  );



  const handleDateRangeChange = useCallback(
    (range) => {
      if (!range.startDate || !range.endDate) {
        setDateRange({ startDate: null, endDate: null });
        onHandleFilterInvoiceList({ start_date: null, end_date: null, selected_date_range_type: 'auto' });
      } else {
        setDateRange({
          startDate: new Date(range.startDate).setHours(0, 0, 0, 0),
          endDate: new Date(range.endDate).setHours(0, 0, 0, 0),
        });
        onHandleFilterInvoiceList({
          start_date: formatDate(range.startDate),
          end_date: formatDate(range.endDate),
          selected_date_range_type: range.type === 'custom' ? 'custom' : 'auto',
        });
      }
    },
    [onHandleFilterInvoiceList]
  );

  // Unified filter change handler replaces 10 individual inline lambdas
  const onFilterInvoiceList = useCallback(
    (selectedOption, key) => {
      const toArray = (opts) => (opts ? opts.map((o) => o.value) : []);
      const toSingle = (opt) => opt?.value || '';

      switch (key) {
        case 'payment_method': return onHandleFilterInvoiceList({ payment_method: toArray(selectedOption) });
        case 'contract_invoice_statue': return onHandleFilterInvoiceList({ contract_invoice_statue: toSingle(selectedOption) });
        case 'staff_id': return onHandleFilterInvoiceList({ staff_id: toArray(selectedOption) });
        case 'invoice_status': return onHandleFilterInvoiceList({ invoice_status: toArray(selectedOption) });
        case 'nationality': return onHandleFilterInvoiceList({ nationality: toArray(selectedOption) });
        case 'contract_status': return onHandleFilterInvoiceList({ contract_status: toArray(selectedOption) });
        case 'contract_category': return onHandleFilterInvoiceList({ contract_category: toArray(selectedOption) });
        case 'location': return onHandleFilterInvoiceList({ branch_country_code: toArray(selectedOption) });
        case 'worker_contract_status': return onHandleFilterInvoiceList({ worker_contract_status: toArray(selectedOption) });
        case 'contract_type': return onHandleFilterInvoiceList({ contract_type: toArray(selectedOption) });
        case 'sort_by': return onHandleFilterInvoiceList({ sort_by: toSingle(selectedOption), sort_order: 'ASC' });
        case 'worker_reference_id': return onHandleFilterInvoiceList({ worker_reference_id: toArray(selectedOption) });
        case 'flags': return onHandleFilterInvoiceList({ flags: toArray(selectedOption) });
        default: break;
      }
    },
    [onHandleFilterInvoiceList]
  );

  const clearAllFilters = useCallback(() => {
    setDateRange({ startDate: null, endDate: null });
    onClearFilter();
  }, [onClearFilter]);

  const appliedChips = useMemo(() => {
    const f = updateFilters || {};
    const chips = [];
    if (f.search_text) {
      chips.push({ id: 'search', k: 'Search', v: `"${f.search_text}"`, remove: () => onSearch({ target: { value: '' } }) });
    }
    if (f.start_date && f.end_date) {
      chips.push({ id: 'date', k: 'Date', v: `${f.start_date} → ${f.end_date}`, remove: () => handleDateRangeChange({ startDate: null, endDate: null }) });
    }
    const workerTypeVal = Array.isArray(f.worker_type) ? f.worker_type[0] : null;
    if (workerTypeVal) {
      const opt = workerTypeOptions.find((o) => o.value === workerTypeVal);
      if (opt) chips.push({ id: 'worker_type', k: 'Worker Type', v: opt.label, remove: () => getContractCategory(null) });
    }
    const multiDefs = [
      { key: 'invoice_status', k: 'Status', options: invoiceStatusOptions },
      { key: 'branch_country_code', k: 'Location', options: countriesOptions },
      // a filter saved before the 11 methods may hold a stored value: it reads under its current name
      { key: 'payment_method', k: 'Method', options: paymentMethodOptions, labelOf: paymentMethodLabel },
      { key: 'nationality', k: 'Nationality', options: nationalitiesOptions },
      { key: 'branch_id', k: 'Branch', options: branchOptions },
      { key: 'staff_id', k: 'Staff', options: staffOptions },
      { key: 'worker_reference_id', k: 'Code', options: workerCodeOptions },
      { key: 'contract_category', k: 'Category', options: contractCategoryOptions },
      { key: 'contract_status', k: 'Approval', options: contractGlobalOptions },
      { key: 'worker_contract_status', k: 'Contract', options: contractStatusOptions },
      { key: 'contract_type', k: 'Contract Type', options: CONTRACT_TYPE_OPTIONS },
      { key: 'flags', k: 'Flag', options: flagOptions },
    ];
    multiDefs.forEach(({ key, k, options, labelOf }) => {
      const values = Array.isArray(f[key]) ? f[key] : [];
      values.forEach((val) => {
        if (val === '' || val === null || val === undefined) return;
        const opt = options.find((o) => o.value === val);
        chips.push({
          id: `${key}:${val}`,
          k,
          v: opt ? opt.label : (labelOf ? labelOf(val) : String(val)),
          remove: () => onHandleFilterInvoiceList({ [key]: values.filter((x) => x !== val) }),
        });
      });
    });
    if (f.sort_by && f.sort_by !== 'created_at') {
      const opt = sortBy.find((o) => o.value === f.sort_by);
      chips.push({ id: 'sort', k: 'Sort', v: opt ? opt.label : f.sort_by, remove: () => onHandleFilterInvoiceList({ sort_by: 'created_at', sort_order: 'DESC' }) });
    }
    return chips;
  }, [updateFilters, invoiceStatusOptions, countriesOptions, paymentMethodOptions, nationalitiesOptions, branchOptions, staffOptions, workerCodeOptions, contractCategoryOptions, contractGlobalOptions, contractStatusOptions, workerTypeOptions, flagOptions, onSearch, handleDateRangeChange, getContractCategory, onHandleFilterInvoiceList]);

  // ── Stable select styles object (avoid re-creating each render) ───────────
  const selectStyles = useMemo(() => customStylesOfMultiSelect(), []);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (viewFrom === 'employer' || viewFrom === 'worker') {
    return (
      <div className={filterStyles.filterCard}>
        <div className={filterStyles.filterTop}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label className={filterStyles.filterLabel}>{translation('key_invoice_status')}</label>
            <Select
              styles={selectStyles}
              maxMenuHeight={170}
              options={invoiceStatusOptions}
              name="invoice_status"
              placeholder={translation('key_please_select')}
              onChange={(opts) => onFilterInvoiceList(opts, 'invoice_status')}
              isClearable
              isMulti
              value={selectedInvoiceStatus}
            />
          </div>
          {(IsInvoiceGeneralAddPermission === 'y' || isAdmin) && (
            <Btn variant="secondary" onClick={() => handleSelectOption(viewFrom)}>
              <Icon name="plus" size={13} />
              {translation('key_new_invoice')}
            </Btn>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={filterStyles.filterPanelWrap} ref={filterPanelWrapRef}>
      {/* ── Filter bar card: search · filter toggle · columns ── */}
      <div className={filterStyles.filterBar}>
        <div className={filterStyles.controlsRow}>
          <div className={filterStyles.controlsSearch}>
            <Icon name="search" size={14} />
            <input
              className={filterStyles.controlsSearchInput}
              placeholder={translation('key_search_invoices')}
              value={updateFilters?.search_text || ''}
              onChange={onSearch}
            />
            <SearchHelp />
          </div>
          <span className={filterStyles.filterToggleWrap} ref={filterToggleRef}>
            <Btn
              variant="secondary"
              className={`${filterStyles.filterCtl} ${showFiltersPanel ? filterStyles.filterToggleOpen : ''}`}
              data-filter-toggle=""
              aria-expanded={showFiltersPanel}
              onClick={() => setShowFiltersPanel(f => !f)}
            >
              <Icon name="filter" size={13} />
              {translation('key_filters')}
              {appliedChips.length > 0 && <span className={filterStyles.filterCountBadge}>{appliedChips.length}</span>}
            </Btn>
          </span>
          <div className={filterStyles.controlsRight}>
            {canSelectColumns && (
            <ColumnsDropdown
              allColumns={kababOptions[0]?.subItem ?? []}
              selected={fieldsToShow}
              onToggle={(col) => {
                const next = fieldsToShow.includes(col)
                  ? fieldsToShow.filter(f => f !== col)
                  : [...fieldsToShow, col];
                handleFieldItems(next);
              }}
              onReset={() => handleFieldItems((kababOptions[0]?.subItem ?? []).map(optionValue))}
            />
            )}
          </div>
        </div>

        {/* ── Applied-filter chips (reference .applied-strip) ── */}
        {appliedChips.length > 0 && (
          <div className={filterStyles.appliedStrip}>
            <span className={filterStyles.appliedLabel}>Applied:</span>
            {appliedChips.map((chip) => (
              <span className={filterStyles.filterChip} key={chip.id}>
                <span className={filterStyles.filterChipK}>{chip.k}:</span>{chip.v}
                <button type="button" className={filterStyles.filterChipX} onClick={chip.remove} aria-label={`Remove ${chip.k} filter`}>
                  <Icon name="x" size={10} />
                </button>
              </span>
            ))}
            <button type="button" className={filterStyles.clearAll} onClick={clearAllFilters}>{translation('key_clear_filters')}</button>
          </div>
        )}
      </div>

      {/* ── Filter dropdown (absolute overlay) ── */}
      {showFiltersPanel && (
        <div
          className={filterStyles.filterDropdown}
          ref={filterDropdownRef}
          style={filterPopPos ? { top: filterPopPos.top, left: filterPopPos.left } : undefined}
        >
          <div className={filterStyles.filterDropdownHeader}>Filter invoices</div>

          {/* Status | Approval (Contract Invoice Status) — reference order */}
          <div className={filterStyles.filterGrid2Col}>
            <div>
              <label className={filterStyles.filterLabel}>{translation('key_status')}</label>
              <Select styles={filterSelectStyles} components={filterSelectComponents} maxMenuHeight={200} options={invoiceStatusOptions} name="invoice_status"
                placeholder={translation('key_all')}
                onChange={(opts) => onFilterInvoiceList(opts, 'invoice_status')}
                menuPortalTarget={document.body} menuPosition="fixed"
                isClearable isMulti value={selectedInvoiceStatus} />
            </div>
            <div>
              <label className={filterStyles.filterLabel}>{translation('key_contract_invoice_status')}</label>
              <Select styles={filterSelectStyles} components={filterSelectComponents} maxMenuHeight={200} options={contractGlobalOptions} name="contract_status"
                placeholder={translation('key_all')}
                onChange={(opts) => onFilterInvoiceList(opts, 'contract_status')}
                menuPortalTarget={document.body} menuPosition="fixed"
                isClearable isMulti value={selectedContractGlobal} />
            </div>
          </div>

          {/* Payment method | Flags / relationships */}
          <div className={filterStyles.filterGrid2Col}>
            <div>
              <label className={filterStyles.filterLabel}>{translation('key_payment_method')}</label>
              <Select styles={filterSelectStyles} components={filterSelectComponents} maxMenuHeight={200} options={paymentMethodOptions} name="payment_method"
                placeholder={translation('key_all')}
                onChange={(opts) => onFilterInvoiceList(opts, 'payment_method')}
                menuPortalTarget={document.body} menuPosition="fixed"
                isClearable isMulti value={selectedPaymentMethod} />
            </div>
            <div>
              <label className={filterStyles.filterLabel}>{translation('key_flags_relationships')}</label>
              <Select styles={filterSelectStyles} components={filterSelectComponents} maxMenuHeight={200} options={flagOptions} name="flags"
                placeholder={translation('key_all')}
                onChange={(opts) => onFilterInvoiceList(opts, 'flags')}
                menuPortalTarget={document.body} menuPosition="fixed"
                isClearable isMulti value={selectedFlags} />
            </div>
          </div>

          {/* Staff | Branch */}
          <div className={filterStyles.filterGrid2Col}>
            <div>
              <label className={filterStyles.filterLabel}>{translation('key_staff')}</label>
              <Select styles={filterSelectStyles} components={filterSelectComponents} maxMenuHeight={200} options={staffOptions} name="staff_id"
                placeholder={translation('key_all')}
                onChange={(opts) => onFilterInvoiceList(opts, 'staff_id')}
                menuPortalTarget={document.body} menuPosition="fixed"
                isClearable isMulti value={selectedStaff} />
            </div>
            <div>
              <label className={filterStyles.filterLabel}>{translation('key_branch')}</label>
              <Select styles={filterSelectStyles} components={filterSelectComponents} maxMenuHeight={200} options={branchOptions} name="branch_id"
                placeholder={translation('key_all')}
                onChange={handleGetCsList}
                menuPortalTarget={document.body} menuPosition="fixed"
                isClearable isMulti value={selectedBranches} />
            </div>
          </div>

          {/* Admin fields (not in the reference): Date Range | Location */}
          <div className={filterStyles.filterGrid2Col}>
            <div>
              <label className={filterStyles.filterLabel}>{translation('key_date_range')}</label>
              <DateRangePickerComponent
                onChange={handleDateRangeChange}
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                datePermission={InvoiceGlobalDatePermissionObj}
                customDatePermission={InvoiceGlobalCustomDatePermission}
                isAdmin={isAdmin}
                selectStyles={filterSelectStyles}
                selectComponents={filterSelectComponents}
              />
            </div>
            <div>
              <label className={filterStyles.filterLabel}>{translation('key_location')}</label>
              <Select styles={filterSelectStyles} components={filterSelectComponents} maxMenuHeight={200} options={countriesOptions} name="location"
                placeholder={translation('key_all')}
                onChange={(opts) => onFilterInvoiceList(opts, 'location')}
                menuPortalTarget={document.body} menuPosition="fixed"
                isClearable isMulti value={selectedCountries} />
            </div>
          </div>

          {/* Nationality | Worker Type */}
          <div className={filterStyles.filterGrid2Col}>
            <div>
              <label className={filterStyles.filterLabel}>{translation('key_nationality')}</label>
              <Select styles={filterSelectStyles} components={filterSelectComponents} maxMenuHeight={200} options={nationalitiesOptions} name="nationality"
                placeholder={translation('key_all')}
                onChange={(opts) => onFilterInvoiceList(opts, 'nationality')}
                menuPortalTarget={document.body} menuPosition="fixed"
                isClearable isMulti value={selectedNationalities} />
            </div>
            <div>
              <label className={filterStyles.filterLabel}>{translation('key_worker_type')}</label>
              <Select styles={filterSelectStyles} components={filterSelectComponents} maxMenuHeight={200} options={workerTypeOptions} name="worker_type"
                placeholder={translation('key_all')}
                onChange={getContractCategory}
                menuPortalTarget={document.body} menuPosition="fixed"
                isClearable value={selectedWorkerType} />
            </div>
          </div>

          {/* Worker Code | Contract Category */}
          <div className={filterStyles.filterGrid2Col}>
            <div>
              <label className={filterStyles.filterLabel}>{translation('key_code')}</label>
              <Select styles={filterSelectStyles} components={filterSelectComponents} maxMenuHeight={200} options={workerCodeOptions} name="worker_reference_id"
                placeholder={translation('key_all')}
                onChange={(opts) => onFilterInvoiceList(opts, 'worker_reference_id')}
                menuPortalTarget={document.body} menuPosition="fixed"
                isClearable isMulti value={selectedWorkerCode} />
            </div>
            <div>
              <label className={filterStyles.filterLabel}>{translation('key_contract_category')}</label>
              <Select styles={filterSelectStyles} components={filterSelectComponents} maxMenuHeight={200} options={contractCategoryOptions} name="contract_category"
                placeholder={translation('key_all')}
                onChange={(opts) => onFilterInvoiceList(opts, 'contract_category')}
                menuPortalTarget={document.body} menuPosition="fixed"
                isClearable isMulti value={selectedContractCategory} />
            </div>
          </div>

          {/* Contract Status | Contract Type */}
          <div className={filterStyles.filterGrid2Col}>
            <div>
              <label className={filterStyles.filterLabel}>{translation('key_contract_status')}</label>
              <Select styles={filterSelectStyles} components={filterSelectComponents} maxMenuHeight={200} options={contractStatusOptions} name="worker_contract_status"
                placeholder={translation('key_all')}
                onChange={(opts) => onFilterInvoiceList(opts, 'worker_contract_status')}
                menuPortalTarget={document.body} menuPosition="fixed"
                isClearable isMulti value={selectedContractStatus} />
            </div>
            <div>
              <label className={filterStyles.filterLabel}>{translation('key_type_internal')}</label>
              <Select styles={filterSelectStyles} components={filterSelectComponents} maxMenuHeight={200} options={CONTRACT_TYPE_OPTIONS} name="contract_type"
                placeholder={translation('key_all')}
                onChange={(opts) => onFilterInvoiceList(opts, 'contract_type')}
                menuPortalTarget={document.body} menuPosition="fixed"
                isClearable isMulti value={selectedContractType} />
            </div>
          </div>

          {/* Sort By */}
          <div className={filterStyles.filterGrid2Col}>
            <div>
              <label className={filterStyles.filterLabel}>{translation('key_sort_by')}</label>
              <Select styles={filterSelectStyles} components={filterSelectComponents} maxMenuHeight={200} options={sortBy} name="sort_by"
                placeholder="Sort by…"
                onChange={(opt) => onFilterInvoiceList(opt, 'sort_by')}
                menuPortalTarget={document.body} menuPosition="fixed"
                isClearable value={selectedSortBy} />
            </div>
          </div>

          {/* Actions */}
          <div className={filterStyles.filterDropdownActions}>
            <Btn variant="primary" onClick={() => { applyAllFilters(); setShowFiltersPanel(false); }}>{translation('key_apply_filters')}</Btn>
            <Btn variant="ghost" onClick={clearAllFilters}>{translation('key_clear_filters')}</Btn>
          </div>

          {isRegLink && <SendRegLink closeModal={() => setRegLink(false)} />}
        </div>
      )}
    </div>
  );
};

InvoiceFilter.propTypes = {
  onSearch: PropTypes.func.isRequired,
  defaultFilterType: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  fieldsToShow: PropTypes.array.isRequired,
  handleFieldItems: PropTypes.func.isRequired,
  handleDob: PropTypes.func,
  setRegLink: PropTypes.func.isRequired,
  isRegLink: PropTypes.bool.isRequired,
  onHandleFilterInvoiceList: PropTypes.func.isRequired,
  onClearFilter: PropTypes.func.isRequired,
  applyAllFilters: PropTypes.func.isRequired,
  updateFilters: PropTypes.object,
  viewFrom: PropTypes.string,
  employerObj: PropTypes.object,
  handleSelectOption: PropTypes.func.isRequired,
};

export default React.memo(InvoiceFilter);