import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import PropTypes from 'prop-types';

import translation from "../../../../utils/translation";
import { isAdminUser } from "../../../../services/commonService";
import { ReportChip, ReportDateChip, ReportFilters } from "../ReportShell";
import dayjs from "dayjs";
import constData, { workerTypeList } from "../../../../components/ReusableComponents/constants";

const formatDate = (date) => {
  if (!date) return '';
  return dayjs(date).format('YYYY-MM-DD');
};

const ContractReportFilter = ({
  onClearFilter,
  onFilterContractList,
  updateFilters,
  mappingBranches,
  csList,
  workerNationalities,
  locationList,
  workerRefIdInitials,
  contractStatus,
  contractInvoiceStatus,
}) => {
  const [contractDateRange, setContractDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const [visaDateRange, setVisaDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  /* v17 §S (backend 372): Processing Group of the contract's worker, `group: [1..4]`; the chip sits first, "on top" as
     Priyanka asked — the final position is Shubham's (sheet U-0447) */
  const [groupSelect, setGroupSelect] = useState([]);
  const [statusSelect, setStatusSelect] = useState([]);
  const [typeSelect, setTypeSelect] = useState([]);
  const [nationalitySelect, setNationalitySelect] = useState([]);
  const [contractStatusSelect, setContractStatusSelect] = useState([]);
  const [codeSelect, setCodeSelect] = useState([]);
  const [locationSelect, setLocationSelect] = useState([]);
  const [branchSelect, setBranchSelect] = useState([]);
  const [csSelect, setCsSelect] = useState([]);

  const isAdmin = isAdminUser();


  const typeOptions = useMemo(() => (
    workerTypeList().map(item => ({ value: item.id, label: translation(item.translationKey) }))
  ), []);

  const groupOptions = useMemo(() => constData.processingGroupOptions().map(item => ({ value: item.id, label: item.name })), []);

  const statusOptions = useMemo(() => (
    Array.isArray(contractInvoiceStatus)
      ? contractInvoiceStatus.map(item => ({ value: item.id, label: item.name }))
      : []
  ), [contractInvoiceStatus]);

  const nationalityOptions = useMemo(() => (
    Array.isArray(workerNationalities)
      ? workerNationalities.map(item => ({ value: item.id, label: item.name }))
      : []
  ), [workerNationalities]);

  const contractStatusOptions = useMemo(() => (
    Array.isArray(contractStatus)
      ? contractStatus.map(item => ({ value: item.id, label: item.name }))
      : []
  ), [contractStatus]);

  const codeOptions = useMemo(() => (
    Array.isArray(workerRefIdInitials)
      ? workerRefIdInitials.map(item => ({ value: item, label: item }))
      : []
  ), [workerRefIdInitials]);

  const locationOptions = useMemo(() => (
    Array.isArray(locationList)
      ? locationList.map(item => ({ value: item.id, label: item.name }))
      : []
  ), [locationList]);

  const branchOptions = useMemo(() => (
    Array.isArray(mappingBranches)
      ? mappingBranches.map(item => ({ value: item.id, label: item.name }))
      : []
  ), [mappingBranches]);

  // Sync local state with updateFilters from Redux
  useEffect(() => {
    if (updateFilters) {
      // Contract Date range
      if (updateFilters.contract_from_date && updateFilters.contract_to_date) {
        setContractDateRange({
          startDate: dayjs(updateFilters.contract_from_date).toDate(),
          endDate: dayjs(updateFilters.contract_to_date).toDate(),
        });
      } else {
        setContractDateRange({ startDate: null, endDate: null });
      }

      // VISA Date range
      if (updateFilters.visa_expiry_from_date && updateFilters.visa_expiry_to_date) {
        setVisaDateRange({
          startDate: dayjs(updateFilters.visa_expiry_from_date).toDate(),
          endDate: dayjs(updateFilters.visa_expiry_to_date).toDate(),
        });
      } else {
        setVisaDateRange({ startDate: null, endDate: null });
      }

      // Group
      if (updateFilters.group && Array.isArray(updateFilters.group)) {
        setGroupSelect(updateFilters.group.map(value => groupOptions.find(g => g.value === Number(value)) || null).filter(Boolean));
      } else {
        setGroupSelect([]);
      }

      // Status 
      if (updateFilters.status && Array.isArray(updateFilters.status) && contractInvoiceStatus) {
        const selected = updateFilters.status.map(value => {
          const status = contractInvoiceStatus.find(s => s.id === value);
          return status ? { value: status.id, label: status.name } : null;
        }).filter(Boolean);
        setStatusSelect(selected);
      } else {
        setStatusSelect([]);
      }

      // Type 
      if (updateFilters.contract_type && Array.isArray(updateFilters.contract_type)) {
        const selected = updateFilters.contract_type.map(value => {
          const found = typeOptions.find(t => t.value === value);
          return found || null;
        }).filter(Boolean);
        setTypeSelect(selected);
      } else {
        setTypeSelect([]);
      }

      // Nationality 
      if (updateFilters.nationality && Array.isArray(updateFilters.nationality) && workerNationalities) {
        const selected = updateFilters.nationality.map(id => {
          const nationality = workerNationalities.find(n => n.id === id);
          return nationality ? { value: nationality.id, label: nationality.name } : null;
        }).filter(Boolean);
        setNationalitySelect(selected);
      } else {
        setNationalitySelect([]);
      }

      // Contract Status 
      if (updateFilters.contract_status && Array.isArray(updateFilters.contract_status) && contractStatus) {
        const selected = updateFilters.contract_status.map(value => {
          const status = contractStatus.find(cs => cs.id === value);
          return status ? { value: status.id, label: status.name } : null;
        }).filter(Boolean);
        setContractStatusSelect(selected);
      } else {
        setContractStatusSelect([]);
      }

      // Code
      if (updateFilters.worker_reference_id && Array.isArray(updateFilters.worker_reference_id) && workerRefIdInitials) {
        const selected = updateFilters.worker_reference_id.map(value => {
          const exists = workerRefIdInitials.includes(value);
          return exists ? { value: value, label: value } : null;
        }).filter(Boolean);
        setCodeSelect(selected);
      } else {
        setCodeSelect([]);
      }

      // Location
      if (updateFilters.worker_current_location && Array.isArray(updateFilters.worker_current_location) && locationList) {
        const selected = updateFilters.worker_current_location.map(id => {
          const location = locationList.find(l => l.id === id);
          return location ? { value: location.id, label: location.name } : null;
        }).filter(Boolean);
        setLocationSelect(selected);
      } else {
        setLocationSelect([]);
      }

      // Branch 
      if (updateFilters.branch_id && Array.isArray(updateFilters.branch_id) && mappingBranches) {
        const selected = updateFilters.branch_id.map(id => {
          const branch = mappingBranches.find(b => b.id === id);
          return branch ? { value: branch.id, label: branch.name } : null;
        }).filter(Boolean);
        setBranchSelect(selected);
      } else {
        setBranchSelect([]);
      }

      // CS 
      if (updateFilters.staff_id && Array.isArray(updateFilters.staff_id) && csList) {
        const selected = updateFilters.staff_id.map(id => {
          const cs = csList.find(c => c.value === id);
          return cs || null;
        }).filter(Boolean);
        setCsSelect(selected);
      } else {
        setCsSelect([]);
      }
    }
  }, [updateFilters, mappingBranches, csList, workerNationalities, locationList, workerRefIdInitials, contractStatus, contractInvoiceStatus, typeOptions, groupOptions]);

  const buildFilters = useCallback((
    currentContractDateRange = contractDateRange,
    currentVisaDateRange = visaDateRange,
    currentStatusSelect = statusSelect,
    currentTypeSelect = typeSelect,
    currentNationalitySelect = nationalitySelect,
    currentContractStatusSelect = contractStatusSelect,
    currentCodeSelect = codeSelect,
    currentLocationSelect = locationSelect,
    currentBranchSelect = branchSelect,
    currentCsSelect = csSelect,
    currentGroupSelect = groupSelect
  ) => {
    const filters = {};
    filters.group = Array.isArray(currentGroupSelect) ? currentGroupSelect.map(item => item.value) : [];

    // Contract Date range
    if (currentContractDateRange.startDate && currentContractDateRange.endDate) {
      filters.contract_from_date = formatDate(currentContractDateRange.startDate);
      filters.contract_to_date = formatDate(currentContractDateRange.endDate);
    } else {
      filters.contract_from_date = '';
      filters.contract_to_date = '';
    }

    // VISA Date range
    if (currentVisaDateRange.startDate && currentVisaDateRange.endDate) {
      filters.visa_expiry_from_date = formatDate(currentVisaDateRange.startDate);
      filters.visa_expiry_to_date = formatDate(currentVisaDateRange.endDate);
    } else {
      filters.visa_expiry_from_date = '';
      filters.visa_expiry_to_date = '';
    }

    filters.status = Array.isArray(currentStatusSelect) ? currentStatusSelect.map(item => item.value) : [];
    filters.contract_type = Array.isArray(currentTypeSelect) ? currentTypeSelect.map(item => item.value) : [];
    filters.nationality = Array.isArray(currentNationalitySelect) ? currentNationalitySelect.map(item => item.value) : [];
    filters.contract_status = Array.isArray(currentContractStatusSelect) ? currentContractStatusSelect.map(item => item.value) : [];
    filters.worker_reference_id = Array.isArray(currentCodeSelect) ? currentCodeSelect.map(item => item.value) : [];
    filters.worker_current_location = Array.isArray(currentLocationSelect) ? currentLocationSelect.map(item => item.value) : [];
    filters.branch_id = Array.isArray(currentBranchSelect) ? currentBranchSelect.map(item => item.value) : [];
    filters.staff_id = Array.isArray(currentCsSelect) ? currentCsSelect.map(item => item.value) : [];

    return filters;
  }, [contractDateRange, visaDateRange, statusSelect, typeSelect, nationalitySelect, contractStatusSelect, codeSelect, locationSelect, branchSelect, csSelect, groupSelect]);

  const handleContractDateRangeChange = useCallback((range) => {
    if (!range.startDate || !range.endDate) {
      setContractDateRange({ startDate: null, endDate: null });
    } else {
      setContractDateRange({
        startDate: dayjs(range.startDate).startOf('day').toDate(),
        endDate: dayjs(range.endDate).startOf('day').toDate()
      });
    }
  }, []);

  const handleVisaDateRangeChange = useCallback((range) => {
    if (!range.startDate || !range.endDate) {
      setVisaDateRange({ startDate: null, endDate: null });
    } else {
      setVisaDateRange({
        startDate: dayjs(range.startDate).startOf('day').toDate(),
        endDate: dayjs(range.endDate).startOf('day').toDate()
      });
    }
  }, []);

  const handleGroupChange = useCallback((selectedOptions) => {
    setGroupSelect(selectedOptions || []);
  }, []);

  const handleStatusChange = useCallback((selectedOptions) => {
    setStatusSelect(selectedOptions || []);
  }, []);

  const handleTypeChange = useCallback((selectedOptions) => {
    setTypeSelect(selectedOptions || []);
  }, []);

  const handleNationalityChange = useCallback((selectedOptions) => {
    setNationalitySelect(selectedOptions || []);
  }, []);

  const handleContractStatusChange = useCallback((selectedOptions) => {
    setContractStatusSelect(selectedOptions || []);
  }, []);

  const handleCodeChange = useCallback((selectedOptions) => {
    setCodeSelect(selectedOptions || []);
  }, []);

  const handleLocationChange = useCallback((selectedOptions) => {
    setLocationSelect(selectedOptions || []);
  }, []);

  const handleBranchChange = useCallback((selectedOptions) => {
    setBranchSelect(selectedOptions || []);
  }, []);

  const handleCSChange = useCallback((selectedOptions) => {
    setCsSelect(selectedOptions || []);
  }, []);

  const handleGoClick = useCallback(() => {
    const filters = buildFilters();
    onFilterContractList(filters);
  }, [buildFilters, onFilterContractList]);

  const handleClearFilter = useCallback(() => {
    setContractDateRange({ startDate: null, endDate: null });
    setVisaDateRange({ startDate: null, endDate: null });
    setGroupSelect([]);
    setStatusSelect([]);
    setTypeSelect([]);
    setNationalitySelect([]);
    setContractStatusSelect([]);
    setCodeSelect([]);
    setLocationSelect([]);
    setBranchSelect([]);
    setCsSelect([]);

    // Call parent's clear filter which will reset Redux state
    onClearFilter();
  }, [onClearFilter]);

  return (
      <ReportFilters onGo={handleGoClick} onClear={handleClearFilter}>
          <ReportChip id="contract-report-group" label={translation('key_group')} options={groupOptions} value={groupSelect} onChange={handleGroupChange} multiple />
          <ReportDateChip label={translation('key_contract_date')} onChange={handleContractDateRangeChange} startDate={contractDateRange.startDate} endDate={contractDateRange.endDate} isClearable={true} datePermission={null} customDatePermission={null} isAdmin={isAdmin} />
          <ReportDateChip label={translation('key_visa_expiry_date')} onChange={handleVisaDateRangeChange} startDate={visaDateRange.startDate} endDate={visaDateRange.endDate} isClearable={true} datePermission={null} customDatePermission={null} isAdmin={isAdmin} />
          <ReportChip id="contract-report-status" label={translation('key_status')} options={statusOptions} value={statusSelect} onChange={handleStatusChange} multiple />
          <ReportChip id="contract-report-contract_type" label={translation('key_type_internal')} options={typeOptions} value={typeSelect} onChange={handleTypeChange} multiple />
          <ReportChip id="contract-report-nationality" label={translation('key_nationality')} options={nationalityOptions} value={nationalitySelect} onChange={handleNationalityChange} multiple />
          <ReportChip id="contract-report-contract_status" label={translation('key_contract_status')} options={contractStatusOptions} value={contractStatusSelect} onChange={handleContractStatusChange} multiple />
          <ReportChip id="contract-report-worker_reference_id" label={translation('key_code')} options={codeOptions} value={codeSelect} onChange={handleCodeChange} multiple />
          <ReportChip id="contract-report-worker_current_location" label={translation('key_location')} options={locationOptions} value={locationSelect} onChange={handleLocationChange} multiple />
          <ReportChip id="contract-report-branch_id" label={translation('key_branch')} options={branchOptions} value={branchSelect} onChange={handleBranchChange} multiple />
          <ReportChip id="contract-report-staff_id" label={translation('key_cs')} options={csList} value={csSelect} onChange={handleCSChange} multiple />
      </ReportFilters>
  );
};

ContractReportFilter.propTypes = {
  onClearFilter: PropTypes.func,
  onFilterContractList: PropTypes.func,
  updateFilters: PropTypes.object.isRequired,
  mappingBranches: PropTypes.array,
  csList: PropTypes.array,
  workerNationalities: PropTypes.array,
  locationList: PropTypes.array,
  workerRefIdInitials: PropTypes.array,
  contractStatus: PropTypes.array,
  contractInvoiceStatus: PropTypes.array,
};

export default memo(ContractReportFilter);