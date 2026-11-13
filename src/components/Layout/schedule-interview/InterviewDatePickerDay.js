import React from 'react';
import PropTypes from 'prop-types';

const InterviewDatePickerDay = React.forwardRef(({ 
  date, 
  onClick, 
  onMouseEnter, 
  highlightDates, 
  holidayDates,
  offDoopDates,
  disabledDays,
  minDate,
  className,
  ...props 
}, ref) => {
  const isHoliday = holidayDates.some(holidayDate => 
    holidayDate.toDateString() === date.toDateString()
  );

  const isOffDoop = offDoopDates.some(offDoopDate => 
    offDoopDate.toDateString() === date.toDateString()
  );
  
  const isScheduled = highlightDates.some(scheduledDate => 
    scheduledDate.toDateString() === date.toDateString()
  );

  const isPastDate = minDate && date < minDate;
  const isDoopDay = disabledDays.includes(date.getDay());

  const handleClick = (e) => {
    if (isHoliday || isPastDate || isDoopDay || isOffDoop) {
      e.preventDefault();
      return;
    }
    onClick && onClick(e);
  };

  return (
    <div
      ref={ref}
      {...props}
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      className={`
        react-datepicker__day
        ${isScheduled ? 'react-datepicker__day--highlighted' : ''}
        ${isHoliday ? 'react-datepicker__day--holiday' : ''}
        ${(isPastDate || isDoopDay || isOffDoop) ? 'react-datepicker__day--disabled' : ''}
        ${className || ''}
      `}
      style={{
        cursor: (isHoliday || isPastDate || isDoopDay || isOffDoop) ? 'not-allowed' : 'pointer'
      }}
    >
      {date.getDate()}
    </div>
  );
});

InterviewDatePickerDay.displayName = 'InterviewDatePickerDay';

InterviewDatePickerDay.propTypes = {
  date: PropTypes.instanceOf(Date).isRequired,
  onClick: PropTypes.func,
  onMouseEnter: PropTypes.func,
  highlightDates: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
  holidayDates: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
  offDoopDates: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
  disabledDays: PropTypes.arrayOf(PropTypes.number),
  minDate: PropTypes.instanceOf(Date),
  className: PropTypes.string
};

InterviewDatePickerDay.defaultProps = {
  highlightDates: [],
  holidayDates: [],
  offDoopDates: [],
  disabledDays: [],
  onClick: () => {},
  onMouseEnter: () => {},
  className: ''
};
export default InterviewDatePickerDay;