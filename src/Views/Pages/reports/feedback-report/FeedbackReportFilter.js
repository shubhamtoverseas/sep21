import React, { useEffect, useState, useCallback, memo } from "react";
import PropTypes from 'prop-types';

import translation from "../../../../utils/translation";
import { isAdminUser } from "../../../../services/commonService";
import { ReportChip, ReportDateChip, ReportFilters } from "../ReportShell";
import constData from "../../../../components/ReusableComponents/constants";
import dayjs from "dayjs";

const formatDate = (date) => {
  if (!date) return '';
  return dayjs(date).format('YYYY-MM-DD');
};

const FeedbackReportFilter = ({
  onClearFilter,
  onFilterFeedbackList,
  updateFilters,
}) => {

  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null,
  });

  const [feedbackTypeSelect, setFeedbackTypeSelect] = useState([]);
  const [userTypeSelect, setUserTypeSelect] = useState([]);
  const [ratingSelect, setRatingSelect] = useState([]);

  const isAdmin = isAdminUser();


  // Sync local state with updateFilters from Redux
  useEffect(() => {
    if (updateFilters) {
      // Date range
      if (updateFilters.start_date || updateFilters.end_date) {
        setDateRange({
          startDate: updateFilters.start_date ? dayjs(updateFilters.start_date).toDate() : null,
          endDate: updateFilters.end_date ? dayjs(updateFilters.end_date).toDate() : null,
        });
      } else {
        setDateRange({
          startDate: null,
          endDate: null
        });
      }

      // Feedback Type
      if (updateFilters.feedback_type && Array.isArray(updateFilters.feedback_type)) {
        const selected = updateFilters.feedback_type.map(type => {
          const option = constData.feedbackTypeOptions.find(opt => opt.value === type);
          return option || null;
        }).filter(Boolean);
        setFeedbackTypeSelect(selected);
      } else {
        setFeedbackTypeSelect([]);
      }

      // User Type
      if (updateFilters.created_by_type && Array.isArray(updateFilters.created_by_type)) {
        const selected = updateFilters.created_by_type.map(type => {
          const option = constData.userTypeOptions.find(opt => opt.value === type);
          return option || null;
        }).filter(Boolean);
        setUserTypeSelect(selected);
      } else {
        setUserTypeSelect([]);
      }

      // Rating
      if (updateFilters.rating && Array.isArray(updateFilters.rating)) {
        const selected = updateFilters.rating.map(rating => {
          const option = constData.ratingOptions.find(opt => opt.value === rating);
          return option || null;
        }).filter(Boolean);
        setRatingSelect(selected);
      } else {
        setRatingSelect([]);
      }
    }
  }, [updateFilters]);



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

  const handleFeedbackTypeChange = useCallback((selectedOptions) => {
    setFeedbackTypeSelect(selectedOptions || []);
  }, []);

  const handleUserTypeChange = useCallback((selectedOptions) => {
    setUserTypeSelect(selectedOptions || []);
  }, []);

  const handleRatingChange = useCallback((selectedOptions) => {
    setRatingSelect(selectedOptions || []);
  }, []);

  const buildFilters = useCallback((
    currentDateRange = dateRange,
    currentFeedbackTypeSelect = feedbackTypeSelect,
    currentUserTypeSelect = userTypeSelect,
    currentRatingSelect = ratingSelect
  ) => {
    const filters = {};

    // Date range
    if (currentDateRange.startDate && currentDateRange.endDate) {
      filters.start_date = formatDate(currentDateRange.startDate);
      filters.end_date = formatDate(currentDateRange.endDate);
      filters.selected_date_range_type = "custom";
    } else {
      filters.start_date = '';
      filters.end_date = '';
      filters.selected_date_range_type = "auto";
    }

    // Feedback Type
    filters.feedback_type = currentFeedbackTypeSelect.map(item => item.value);

    // User Type
    filters.created_by_type = currentUserTypeSelect.map(item => item.value);

    // Rating
    filters.rating = currentRatingSelect.map(item => item.value);

    return filters;
  }, [dateRange, feedbackTypeSelect, userTypeSelect, ratingSelect]);

  const handleGoClick = useCallback(() => {
    const filters = buildFilters();
    onFilterFeedbackList(filters);
  }, [buildFilters, onFilterFeedbackList]);

  const handleClearFilter = useCallback(() => {
    setDateRange({ startDate: null, endDate: null });
    setFeedbackTypeSelect([]);
    setUserTypeSelect([]);
    setRatingSelect([]);

    onClearFilter();
  }, [onClearFilter]);

  return (
      <ReportFilters onGo={handleGoClick} onClear={handleClearFilter}>
          <ReportDateChip label={translation('key_date_range')} onChange={handleDateRangeChange} startDate={dateRange.startDate} endDate={dateRange.endDate} isClearable={true} datePermission={null} customDatePermission={null} isAdmin={isAdmin} />
          <ReportChip id="feedback-report-feedback_type" label={translation('key_feedback_for')} options={constData.feedbackTypeOptions} value={feedbackTypeSelect} onChange={handleFeedbackTypeChange} multiple />
          <ReportChip id="feedback-report-created_by_type" label={translation('key_user_type')} options={constData.userTypeOptions} value={userTypeSelect} onChange={handleUserTypeChange} multiple />
          <ReportChip id="feedback-report-rating" label={translation('key_rating')} options={constData.ratingOptions} value={ratingSelect} onChange={handleRatingChange} multiple />
      </ReportFilters>
  );
};

FeedbackReportFilter.propTypes = {
  onClearFilter: PropTypes.func,
  onFilterFeedbackList: PropTypes.func,
  updateFilters: PropTypes.object.isRequired,
};

export default memo(FeedbackReportFilter);