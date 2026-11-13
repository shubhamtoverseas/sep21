import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import PropTypes from 'prop-types';

import translation from "../../../../utils/translation";
import { isAdminUser } from "../../../../services/commonService";
import { ReportChip, ReportDateChip, ReportFilters } from "../ReportShell";
import dayjs from "dayjs";
import configData from "../../../../components/ReusableComponents/app-configs";

const formatDate = (date) => {
  if (!date) return '';
  return dayjs(date).format('YYYY-MM-DD');
};

const InsuranceReportFilter = ({
  onClearFilter,
  onFilterInsuranceList,
  updateFilters,
  mappingBranches,
  csList,
}) => {
  const [effectiveDateRange, setEffectiveDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const [expiryDateRange, setExpiryDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const [typeSelect, setTypeSelect] = useState([]);
  const [branchSelect, setBranchSelect] = useState([]);
  const [csSelect, setCsSelect] = useState([]);

  const isAdmin = isAdminUser();


  // Type: New policy / Renewal / Legacy - to review (PROMPT 8 row 5, Q8-1 (a); were new / renew)
  const typeOptions = useMemo(() => (
    configData.insuranceReportTypes.map((item) => ({
      value: item.id,
      label: translation(item.translationKey)
    }))
  ), []);

  const branchOptions = useMemo(() => (
    Array.isArray(mappingBranches)
      ? mappingBranches.map(item => ({ value: item.id, label: item.name }))
      : []
  ), [mappingBranches]);

  // Sync local state with updateFilters from Redux
  useEffect(() => {
    if (updateFilters) {
      // Effective Date range
      if (updateFilters.effective_from_date || updateFilters.effective_to_date) {
        setEffectiveDateRange({
          startDate: updateFilters.effective_from_date ? dayjs(updateFilters.effective_from_date).toDate() : null,
          endDate: updateFilters.effective_to_date ? dayjs(updateFilters.effective_to_date).toDate() : null,
        });
      } else {
        setEffectiveDateRange({ startDate: null, endDate: null });
      }

      // Expiry Date range
      if (updateFilters.expiry_from_date || updateFilters.expiry_to_date) {
        setExpiryDateRange({
          startDate: updateFilters.expiry_from_date ? dayjs(updateFilters.expiry_from_date).toDate() : null,
          endDate: updateFilters.expiry_to_date ? dayjs(updateFilters.expiry_to_date).toDate() : null,
        });
      } else {
        setExpiryDateRange({ startDate: null, endDate: null });
      }

      // Type (an unknown value, e.g. a legacy new / renew, is dropped)
      if (updateFilters.type && Array.isArray(updateFilters.type)) {
        const selected = updateFilters.type.map(value => {
          const type = configData.insuranceReportTypes.find(t => t.id === value);
          return type ? { value: type.id, label: translation(type.translationKey) } : null;
        }).filter(Boolean);
        setTypeSelect(selected);
      } else {
        setTypeSelect([]);
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

      // CS (staff_id)
      if (updateFilters.staff_id && Array.isArray(updateFilters.staff_id) && csList) {
        const selected = updateFilters.staff_id.map(id => {
          const cs = csList.find(s => s.value === id);
          return cs || null;
        }).filter(Boolean);
        setCsSelect(selected);
      } else {
        setCsSelect([]);
      }
    }
  }, [updateFilters, mappingBranches, csList]);

  const buildFilters = useCallback((
    currentEffectiveDateRange = effectiveDateRange,
    currentExpiryDateRange = expiryDateRange,
    currentTypeSelect = typeSelect,
    currentBranchSelect = branchSelect,
    currentCsSelect = csSelect
  ) => {
    const filters = {};

    // Effective Date range
    if (currentEffectiveDateRange.startDate && currentEffectiveDateRange.endDate) {
      filters.effective_from_date = formatDate(currentEffectiveDateRange.startDate);
      filters.effective_to_date = formatDate(currentEffectiveDateRange.endDate);
    } else {
      filters.effective_from_date = '';
      filters.effective_to_date = '';
    }

    // Expiry Date range
    if (currentExpiryDateRange.startDate && currentExpiryDateRange.endDate) {
      filters.expiry_from_date = formatDate(currentExpiryDateRange.startDate);
      filters.expiry_to_date = formatDate(currentExpiryDateRange.endDate);
    } else {
      filters.expiry_from_date = '';
      filters.expiry_to_date = '';
    }

    // Type codes: new_policy / renewal / legacy_review
    filters.type = Array.isArray(currentTypeSelect) ? currentTypeSelect.map(item => item.value) : [];

    // Branch IDs
    filters.branch_id = Array.isArray(currentBranchSelect) ? currentBranchSelect.map(item => item.value) : [];

    // Staff IDs
    filters.staff_id = Array.isArray(currentCsSelect) ? currentCsSelect.map(item => item.value) : [];

    return filters;
  }, [effectiveDateRange, expiryDateRange, typeSelect, branchSelect, csSelect]);

  const handleEffectiveDateRangeChange = useCallback((range) => {
    if (!range.startDate || !range.endDate) {
      setEffectiveDateRange({ startDate: null, endDate: null });
    } else {
      setEffectiveDateRange({
        startDate: dayjs(range.startDate).startOf('day').toDate(),
        endDate: dayjs(range.endDate).startOf('day').toDate()
      });
    }
  }, []);

  const handleExpiryDateRangeChange = useCallback((range) => {
    if (!range.startDate || !range.endDate) {
      setExpiryDateRange({ startDate: null, endDate: null });
    } else {
      setExpiryDateRange({
        startDate: dayjs(range.startDate).startOf('day').toDate(),
        endDate: dayjs(range.endDate).startOf('day').toDate()
      });
    }
  }, []);

  const handleTypeChange = useCallback((selectedOptions) => {
    setTypeSelect(selectedOptions || []);
  }, []);

  const handleBranchChange = useCallback((selectedOptions) => {
    setBranchSelect(selectedOptions || []);
  }, []);

  const handleCSChange = useCallback((selectedOptions) => {
    setCsSelect(selectedOptions || []);
  }, []);

  const handleGoClick = useCallback(() => {
    const filters = buildFilters();
    onFilterInsuranceList(filters);
  }, [buildFilters, onFilterInsuranceList]);

  const handleClearFilter = useCallback(() => {
    setEffectiveDateRange({ startDate: null, endDate: null });
    setExpiryDateRange({ startDate: null, endDate: null });
    setTypeSelect([]);
    setBranchSelect([]);
    setCsSelect([]);

    onClearFilter();
  }, [onClearFilter]);

  return (
      <ReportFilters onGo={handleGoClick} onClear={handleClearFilter}>
          <ReportDateChip label={translation('key_effective_date')} onChange={handleEffectiveDateRangeChange} startDate={effectiveDateRange.startDate} endDate={effectiveDateRange.endDate} isClearable={true} datePermission={null} customDatePermission={null} isAdmin={isAdmin} />
          <ReportDateChip label={translation('key_expiry_date')} onChange={handleExpiryDateRangeChange} startDate={expiryDateRange.startDate} endDate={expiryDateRange.endDate} isClearable={true} datePermission={null} customDatePermission={null} isAdmin={isAdmin} />
          <ReportChip id="insurance-report-type" label={translation('key_type')} options={typeOptions} value={typeSelect} onChange={handleTypeChange} multiple />
          <ReportChip id="insurance-report-branch_id" label={translation('key_branch')} options={branchOptions} value={branchSelect} onChange={handleBranchChange} multiple />
          <ReportChip id="insurance-report-staff_id" label={translation('key_cs')} options={csList} value={csSelect} onChange={handleCSChange} multiple />
      </ReportFilters>
  );
};

InsuranceReportFilter.propTypes = {
  onClearFilter: PropTypes.func,
  onFilterInsuranceList: PropTypes.func,
  updateFilters: PropTypes.object.isRequired,
  mappingBranches: PropTypes.array,
  csList: PropTypes.array,
};

export default memo(InsuranceReportFilter);