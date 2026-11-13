import React, { useState } from "react";
import PropTypes from "prop-types";
import './schedule-interview.css';
const TimeSlotSelector = ({ selectedDate, interviewTimeSlots = [], handleSelectedTimeSlot }) => {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const currentTime = new Date();
  const currentHours = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();

  const handleSlotSelection = (slot) => {
    if (slot.available === 0) return;
    setSelectedSlot(slot.slot);
    console.log("Selected Slot:", slot);
    handleSelectedTimeSlot(slot);
  };

  const isPastSlot = (slotTime) => {
    const isToday = new Date(selectedDate).toDateString() === currentTime.toDateString();
    if (!isToday) return false; 

    const [hours, minutes] = slotTime.split(":").map(Number);
    if (hours < currentHours) {
      return true;
    } else if (hours === currentHours && minutes < currentMinutes) {
      return true;
    }
    return false;
  };

  return (
    <div className="time-slots">
      <div
        className="pt20 pb20"
        style={{
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
          display: "grid",
        }}
      >
        {interviewTimeSlots?.map((slot, index) => (
          <button
            key={index}
            onClick={() => handleSlotSelection(slot)}
            disabled={slot.available === 0 || isPastSlot(slot.slot)}
            className={`px-3 py-2 br20 fz14 grey2 cursor-pointer ${isPastSlot(slot.slot) ? 'bg-light' : 'bg-white'} ${slot.available === 0 ? "unavailable-slot" : ""
              }`}
            style={{
              border: "2px solid #ddd",
              borderColor: selectedSlot === slot.slot ? "#1E90FF" : "#ddd",
              color: selectedSlot === slot.slot && "#000",
              cursor: (slot.available === 0 || isPastSlot(slot.slot)) ? "not-allowed" : "pointer",
            }}
          >
            {slot.label}
          </button>
        ))}
      </div>
    </div>
  );
};

TimeSlotSelector.propTypes = {
  selectedDate: PropTypes.instanceOf(Date).isRequired,
  interviewTimeSlots: PropTypes.arrayOf(
    PropTypes.shape({
      slot: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      available: PropTypes.number.isRequired,
    })
  ).isRequired,
  handleSelectedTimeSlot: PropTypes.func.isRequired,
};

export default TimeSlotSelector;
