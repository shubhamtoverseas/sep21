import React, { useCallback, useEffect, useMemo, useState } from "react";
import '@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css';
import DateRangePicker from '@wojtekmaj/react-daterange-picker';
import 'react-calendar/dist/Calendar.css';
import './date-range-picker-theme.css';
import PropTypes from "prop-types";
import Select from 'react-select';

import { customStylesOfMultiSelect } from "../../utils/customStylesOfMultiSelect";
import { getPredefinedRangeFromDates } from "../../services/commonService";
import configData from "../ReusableComponents/app-configs";
import translation from "../../utils/translation";
import dayjs from "dayjs";
import constData from "../ReusableComponents/constants";

const getQuarterRange = (date) => {
  const month = date.month(); // 0-indexed
  const quarterStartMonth = Math.floor(month / 3) * 3;
  const start = date.month(quarterStartMonth).startOf('month');
  const end = start.clone().add(2, 'month').endOf('month');
  return { start: start.toDate(), end: end.toDate() };
};

const DateRangePickerComponent = ({ customDatePermission, datePermission, onChange, startDate, endDate, isAdmin, selectStyles: selectStylesProp, selectComponents }) => {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [value, setValue] = useState([
    startDate ? new Date(startDate) : null,
    endDate ? new Date(endDate) : null
  ]);
  const [selectedRange, setSelectedRange] = useState(null);
  const [minDate, setMinDate] = useState(new Date(1000, 0, 1));
  const [maxDate] = useState(new Date(9999, 11, 31));

  useEffect(() => {
    if (startDate && endDate) {
      setValue([new Date(startDate), new Date(endDate)]);
      const range = getPredefinedRangeFromDates(new Date(startDate), new Date(endDate));
      setSelectedRange(range || "custom");
    } else {
      setValue([null, null]);
      setSelectedRange(null);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    // Set min date based on customDatePermission
    const today = dayjs();
    switch (customDatePermission) {
      case '90_days':
        setMinDate(today.clone().subtract(90, 'days').toDate());
        break;
      case '6_MONTHS':
        setMinDate(today.clone().subtract(6, 'months').toDate());
        break;
      case '1_YEAR':
        setMinDate(today.clone().subtract(1, 'year').toDate());
        break;
      case '2_YEARS':
        setMinDate(today.clone().subtract(2, 'years').toDate());
        break;
      case 'all_time':
      default:
        setMinDate(new Date(1000, 0, 1));
        break;
    }
  }, [customDatePermission]);

  const formatDateRange = (start, end) => {
    if (!start || !end) return "Custom Date Range";
    return `${dayjs(start).format('M/D/YYYY')} - ${dayjs(end).format('M/D/YYYY')}`;
  };

  const selectedOption = useMemo(() => {
    if (!selectedRange) return null;

    if (selectedRange === "custom") {
      return {
        value: "custom",
        label: formatDateRange(value[0], value[1])
      };
    }

    const option = configData.predefinedDateRanges.find(
      (r) => r.value === selectedRange
    );

    if (!option) return null;

    return {
      value: option.value,
      label: translation(option.key)
    };
  }, [selectedRange, value]);

  const filteredOptions = useMemo(() => {
    return configData.predefinedDateRanges.map(option => ({
      ...option,
      label: translation(option.key),
      isDisabled: option.value === 'custom'
        ? false
        : !isAdmin
          ? Array.isArray(datePermission)
            ? !datePermission.includes(option.value)
            : datePermission && option.value !== datePermission
          : false
    }));
  }, [datePermission, isAdmin]);

  const handlePredefinedRangeSelect = useCallback((selectedOption) => {
    if (!selectedOption) {
      setSelectedRange(null);
      setValue([null, null]);
      onChange({ startDate: null, endDate: null });
      return;
    }

    const rangeValue = selectedOption.value;
    setSelectedRange(rangeValue);

    if (rangeValue === "custom") {
      setShowCustomPicker(true);
      return;
    }

    setShowCustomPicker(false);
    let start, end;
    const today = dayjs().startOf('day');
    const yearStart = dayjs().startOf('year');

    switch (rangeValue) {
      case "yesterday":
        start = today.clone().subtract(1, 'day').toDate();
        end = start;
        break;
      case "last_7_days":
        start = today.clone().subtract(6, 'days').toDate();
        end = today.toDate();
        break;
      case "last_30_days":
        start = today.clone().subtract(29, 'days').toDate();
        end = today.toDate();
        break;
      case "last_60_days":
        start = today.clone().subtract(59, 'days').toDate();
        end = today.toDate();
        break;
      case "last_90_days":
        start = today.clone().subtract(89, 'days').toDate();
        end = today.toDate();
        break;
      case "this_month":
        start = dayjs().startOf('month').toDate();
        end = dayjs().endOf('month').toDate();
        break;
      case "last_month":
        start = dayjs().subtract(1, 'month').startOf('month').toDate();
        end = dayjs().subtract(1, 'month').endOf('month').toDate();
        break;
      case "this_quarter": {
        const { start: qStart, end: qEnd } = getQuarterRange(dayjs());
        start = qStart;
        end = qEnd;
        break;
      }
      case "year_to_date":
        start = yearStart.toDate();
        end = today.toDate();
        break;
      case "last_year":
        start = dayjs().subtract(1, 'year').startOf('year').toDate();
        end = dayjs().subtract(1, 'year').endOf('year').toDate();
        break;
      default:
        return;
    }

    setValue([start, end]);
    onChange({ startDate: start, endDate: end, type: rangeValue === "custom" ? "custom" : "auto" });
  }, [onChange]);

  const handleCustomRangeChange = useCallback((range) => {
    if (Array.isArray(range) && range.length === 2) {
      const [start, end] = range;

      // Check if custom dates are within allowed range
      if (customDatePermission !== 'all_time') {
        const minAllowedDate = dayjs(minDate);
        if (dayjs(start).isBefore(minAllowedDate)) {
          console.error("Selected date is before minimum allowed date");
          return;
        }
      }

      if (start instanceof Date && !isNaN(start) && end instanceof Date && !isNaN(end)) {
        setValue([start, end]);
        setSelectedRange("custom");
        onChange({
          startDate: start,
          endDate: end,
          type: "custom"
        });

      } else {
        console.error("Invalid date range", range);
      }
    } else {
      setValue([null, null]);
      onChange({ startDate: null, endDate: null });
    }
    setShowCustomPicker(false);
  }, [customDatePermission, minDate, onChange]);

  return (
    <div className="date-range-container position-relative">
      <Select
        styles={selectStylesProp || customStylesOfMultiSelect()}
        components={selectComponents}
        maxMenuHeight={200}
        value={selectedOption}
        options={filteredOptions}
        placeholder={translation('key_please_select')}
        onChange={handlePredefinedRangeSelect}
        menuPortalTarget={selectStylesProp ? document.body : undefined}
        menuPosition={selectStylesProp ? "fixed" : undefined}
        isClearable={!datePermission}
        isSearchable={false}   /* a preset list — free typing only produced "No options" (Mubin 5 Nov) */
      />

      {showCustomPicker && (
        <DateRangePicker
          onChange={handleCustomRangeChange}
          value={value}
          minDate={minDate}
          maxDate={maxDate}
          isOpen={true}
          onCalendarClose={() => setShowCustomPicker(false)}
          className="mt-2"
        />
      )}
    </div>
  );
};

DateRangePickerComponent.propTypes = {
  customDatePermission: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string)
  ]),
  datePermission: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.oneOf(constData.dateRangeStaticProps)
    ),
    PropTypes.oneOf([
      ...constData.dateRangeStaticProps,
      null
    ])
  ]),
  onChange: PropTypes.func.isRequired,
  startDate: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]),
  endDate: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string]),
  isAdmin: PropTypes.any,
  selectStyles: PropTypes.object,
  selectComponents: PropTypes.object
};

export default DateRangePickerComponent;