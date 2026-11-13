import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import PropTypes from 'prop-types';

import translation from "../../../../utils/translation";
import { isAdminUser } from "../../../../services/commonService";
import { ReportChip, ReportDateChip, ReportFilters, ReportSearchField } from "../ReportShell";
import dayjs from "dayjs";

const formatDate = (date) => {
  if (!date) return '';
  return dayjs(date).format('YYYY-MM-DD');
};

const JobOfferReportFilter = ({
  onClearFilter,
  onFilterJobOfferList,
  updateFilters,
  mappingBranches,
  csList,
  createdByList,
  onSearchChange
}) => {
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const [searchText, setSearchText] = useState('');
  const [branchSelect, setBranchSelect] = useState([]);
  const [csSelect, setCsSelect] = useState([]);
  const [createdBySelect, setCreatedBySelect] = useState([]);

  const isAdmin = isAdminUser();


  useEffect(() => {
    if (updateFilters) {
      // Date range
      if (updateFilters.search_from_date || updateFilters.search_to_date) {
        setDateRange({
          startDate: updateFilters.search_from_date ? dayjs(updateFilters.search_from_date).toDate() : null,
          endDate: updateFilters.search_to_date ? dayjs(updateFilters.search_to_date).toDate() : null,
        });
      } else {
        setDateRange({
          startDate: null,
          endDate: null
        });
      }

      // Search text
      setSearchText(updateFilters.search_text || '');

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
      if (updateFilters.cs_owner_id && Array.isArray(updateFilters.cs_owner_id) && csList) {
        const selected = updateFilters.cs_owner_id.map(id => {
          const cs = csList.find(s => s.value === id);
          return cs || null;
        }).filter(Boolean);
        setCsSelect(selected);
      } else {
        setCsSelect([]);
      }

      if (updateFilters.created_by && Array.isArray(updateFilters.created_by) && createdByList) {
        const selected = updateFilters.created_by.map(id => {
          const createdBy = createdByList.find(item => item.value === id);
          return createdBy || null;
        }).filter(Boolean);
        setCreatedBySelect(selected);
      } else {
        setCreatedBySelect([]);
      }
    }
  }, [updateFilters, mappingBranches, csList, createdByList]);

  const branchOptions = useMemo(() => (
    Array.isArray(mappingBranches)
      ? mappingBranches.map(item => ({ value: item.id, label: item.name }))
      : []
  ), [mappingBranches]);

  const buildFilters = useCallback((
    customSearchText,
    currentDateRange = dateRange,
    currentBranchSelect = branchSelect,
    currentCsSelect = csSelect,
    currentCreatedBySelect = createdBySelect
  ) => {
    const filters = {};

    filters.search_text = customSearchText !== undefined ? customSearchText : searchText;

    if (currentDateRange.startDate && currentDateRange.endDate) {
      filters.search_from_date = formatDate(currentDateRange.startDate);
      filters.search_to_date = formatDate(currentDateRange.endDate);
      filters.selected_date_range_type = "custom";
    } else {
      filters.search_from_date = '';
      filters.search_to_date = '';
      filters.selected_date_range_type = "auto";
    }

    // Branch IDs
    filters.branch_id = currentBranchSelect.map(item => item.value);

    // CS IDs
    filters.cs_owner_id = currentCsSelect.map(item => item.value);

    // Created By IDs
    filters.created_by = currentCreatedBySelect.map(item => item.value);

    return filters;
  }, [dateRange, branchSelect, csSelect, createdBySelect, searchText]);

  const handleDateRangeChange = useCallback((range) => {
    if (!range.startDate || !range.endDate) {
      setDateRange({ startDate: null, endDate: null });
    } else {
      setDateRange({
        startDate: dayjs(range.startDate).startOf('day').toDate(),
        endDate: dayjs(range.endDate).startOf('day').toDate()
      });
    }
  }, []);

  const handleSearchInputChange = useCallback((e) => {
    const newSearchText = e.target.value;
    setSearchText(newSearchText);

    if (onSearchChange) {
      const filters = buildFilters(newSearchText);
      onSearchChange(filters);
    }
  }, [onSearchChange, buildFilters]);

  const handleBranchChange = useCallback((selectedOptions) => {
    setBranchSelect(selectedOptions || []);
  }, []);

  const handleCSChange = useCallback((selectedOptions) => {
    setCsSelect(selectedOptions || []);
  }, []);

  const handleCreatedByChange = useCallback((selectedOptions) => {
    setCreatedBySelect(selectedOptions || []);
  }, []);

  const handleGoClick = useCallback(() => {
    const filters = buildFilters();
    onFilterJobOfferList(filters);
  }, [buildFilters, onFilterJobOfferList]);

  const handleClearFilter = useCallback(() => {
    setDateRange({ startDate: null, endDate: null });
    setSearchText('');
    setBranchSelect([]);
    setCsSelect([]);
    setCreatedBySelect([]);

    onClearFilter();
  }, [onClearFilter]);

  return (
      <ReportFilters onGo={handleGoClick} onClear={handleClearFilter}>
          <ReportSearchField id="job-offer-report-search" value={searchText} onChange={handleSearchInputChange} />
          <ReportDateChip label={translation('key_date_range')} onChange={handleDateRangeChange} startDate={dateRange.startDate} endDate={dateRange.endDate} isClearable={true} datePermission={null} customDatePermission={null} isAdmin={isAdmin} />
          <ReportChip id="job-offer-report-branch_id" label={translation('key_branch')} options={branchOptions} value={branchSelect} onChange={handleBranchChange} multiple />
          <ReportChip id="job-offer-report-cs_owner_id" label={translation('key_cs')} options={csList} value={csSelect} onChange={handleCSChange} multiple />
          <ReportChip id="job-offer-report-created_by" label={translation('key_created_by')} options={createdByList} value={createdBySelect} onChange={handleCreatedByChange} multiple />
      </ReportFilters>
  );
};

JobOfferReportFilter.propTypes = {
  onClearFilter: PropTypes.func,
  onFilterJobOfferList: PropTypes.func,
  onSearchChange: PropTypes.func,
  updateFilters: PropTypes.object.isRequired,
  mappingBranches: PropTypes.array,
  csList: PropTypes.array,
  createdByList: PropTypes.array,
};
export default memo(JobOfferReportFilter);