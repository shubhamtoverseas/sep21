import React, { useState, useEffect, useMemo, useCallback, memo } from "react";
import PropTypes from 'prop-types';

import translation from "../../../../utils/translation";
import { isAdminUser } from "../../../../services/commonService";
import { ReportChip, ReportDateChip, ReportFilters, ReportSearchField } from "../ReportShell";
import dayjs from "dayjs";
import constData from "../../../../components/ReusableComponents/constants";

const formatDate = (date) => {
  if (!date) return '';
  return dayjs(date).format('YYYY-MM-DD');
};

const InterviewReportFilter = ({
  onClearFilter,
  onFilterInterviewList,
  updateFilters,
  mappingBranches,
  csList,
  interpreterList,
  onSearchChange
}) => {
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const [searchText, setSearchText] = useState('');
  const [branchSelect, setBranchSelect] = useState([]);
  const [csSelect, setCsSelect] = useState([]);
  const [interpreterSelect, setInterpreterSelect] = useState([]);
  const [categorySelect, setCategorySelect] = useState([]);

  const isAdmin = isAdminUser();


  // Sync local state with updateFilters from Redux
  useEffect(() => {
    if (updateFilters) {
      // Date range
      if (updateFilters.from_date || updateFilters.to_date) {
        setDateRange({
          startDate: updateFilters.from_date ? dayjs(updateFilters.from_date).toDate() : null,
          endDate: updateFilters.to_date ? dayjs(updateFilters.to_date).toDate() : null,
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

      if (updateFilters.cs_id && Array.isArray(updateFilters.cs_id) && csList) {
        const selected = updateFilters.cs_id.map(email => {
          const cs = csList.find(s => s.value === email);
          return cs || null;
        }).filter(Boolean);
        setCsSelect(selected);
      } else {
        setCsSelect([]);
      }

      if (updateFilters.interpreter_id && Array.isArray(updateFilters.interpreter_id) && interpreterList) {
        const selected = updateFilters.interpreter_id.map(email => {
          const interpreter = interpreterList.find(i => i.value === email);
          return interpreter || null;
        }).filter(Boolean);
        setInterpreterSelect(selected);
      } else {
        setInterpreterSelect([]);
      }

      // Interview category
      if (updateFilters.interview_category && Array.isArray(updateFilters.interview_category)) {
        const selected = updateFilters.interview_category.map(value => {
          const category = constData.CATEGORY_OPTIONS.find(c => c.value === value);
          return category || null;
        }).filter(Boolean);
        setCategorySelect(selected);
      } else {
        setCategorySelect([]);
      }
    }
  }, [updateFilters, mappingBranches, csList, interpreterList]);

  // Memoized branch options — avoids recomputing on every render
  const branchOptions = useMemo(() => (
    Array.isArray(mappingBranches)
      ? mappingBranches.map(item => ({ value: item.id, label: item.name }))
      : []
  ), [mappingBranches]);

  // Accepts current select state explicitly to avoid reading stale closure values
  const buildFilters = useCallback((
    customSearchText,
    currentDateRange = dateRange,
    currentBranchSelect = branchSelect,
    currentCsSelect = csSelect,
    currentInterpreterSelect = interpreterSelect,
    currentCategorySelect = categorySelect
  ) => {
    const filters = {};

    filters.search_text = customSearchText !== undefined ? customSearchText : searchText;

    // Date range
    if (currentDateRange.startDate && currentDateRange.endDate) {
      filters.from_date = formatDate(currentDateRange.startDate);
      filters.to_date = formatDate(currentDateRange.endDate);
      filters.selected_date_range_type = "custom";
    } else {
      filters.from_date = '';
      filters.to_date = '';
      filters.selected_date_range_type = "auto";
    }

    // Branch IDs
    filters.branch_id = currentBranchSelect.map(item => item.value);

    // CS IDs
    filters.cs_id = currentCsSelect.map(item => item.value);

    // Interpreter IDs
    filters.interpreter_id = currentInterpreterSelect.map(item => item.value);

    // Interview category
    filters.interview_category = currentCategorySelect.map(item => item.value);

    return filters;
  }, [dateRange, branchSelect, csSelect, interpreterSelect, categorySelect, searchText]);

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

  // Renamed from handleSearchChange to avoid shadowing the onSearchChange prop
  const handleSearchInputChange = useCallback((e) => {
    const newSearchText = e.target.value;
    setSearchText(newSearchText);

    if (onSearchChange) {
      // Pass newSearchText explicitly so buildFilters doesn't read stale state
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

  const handleInterpreterChange = useCallback((selectedOptions) => {
    setInterpreterSelect(selectedOptions || []);
  }, []);

  const handleCategoryChange = useCallback((selectedOptions) => {
    setCategorySelect(selectedOptions || []);
  }, []);

  const handleGoClick = useCallback(() => {
    const filters = buildFilters();
    onFilterInterviewList(filters);
  }, [buildFilters, onFilterInterviewList]);

  const handleClearFilter = useCallback(() => {
    setDateRange({ startDate: null, endDate: null });
    setSearchText('');
    setBranchSelect([]);
    setCsSelect([]);
    setInterpreterSelect([]);
    setCategorySelect([]);

    onClearFilter();
  }, [onClearFilter]);

  return (
      <ReportFilters onGo={handleGoClick} onClear={handleClearFilter}>
          <ReportSearchField id="interview-report-search" value={searchText} onChange={handleSearchInputChange} />
          <ReportDateChip label={translation('key_date_range')} onChange={handleDateRangeChange} startDate={dateRange.startDate} endDate={dateRange.endDate} isClearable={true} datePermission={null} customDatePermission={null} isAdmin={isAdmin} />
          <ReportChip id="interview-report-branch_id" label={translation('key_branch')} options={branchOptions} value={branchSelect} onChange={handleBranchChange} multiple />
          <ReportChip id="interview-report-cs_id" label={translation('key_cs')} options={csList} value={csSelect} onChange={handleCSChange} multiple />
          <ReportChip id="interview-report-interpreter_id" label={translation('key_interpreter')} options={interpreterList} value={interpreterSelect} onChange={handleInterpreterChange} multiple />
          <ReportChip id="interview-report-interview_category" label={translation('key_interview') + ' ' + translation('category')} options={constData.CATEGORY_OPTIONS(translation)} value={categorySelect} onChange={handleCategoryChange} multiple />
      </ReportFilters>
  );
};

InterviewReportFilter.propTypes = {
  onClearFilter: PropTypes.func,
  onFilterInterviewList: PropTypes.func,
  onSearchChange: PropTypes.func,
  updateFilters: PropTypes.object.isRequired,
  mappingBranches: PropTypes.array,
  csList: PropTypes.array,
  interpreterList: PropTypes.array,
};

export default memo(InterviewReportFilter);