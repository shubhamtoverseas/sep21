import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import './profile-status-multiselect.css';
import { Link } from "react-router-dom";
import translation from "../../utils/translation";

const ProfileStatusDropdown = ({ options, onSelectChange, defaultSelections }) => {

  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (defaultSelections) {
      if (JSON.stringify(defaultSelections) !== JSON.stringify(selectedStatuses)) {
        setSelectedStatuses(defaultSelections);
      }
    }
  }, [defaultSelections]);

  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setIsDropdownOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggleDropdown = (e) => {
    // Don't toggle if clicking on a remove button
    if (e.target.closest('.remove-selection')) {
      return;
    }
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleCheckboxChange = (dashboardId, valueId, name) => {
    let updatedSelection = [];

    if (dashboardId === "dashboard_1") {
      const dashboard1Options = options.find(opt => opt.id === "dashboard_1");
      const existingDashboard1Selections = selectedStatuses.filter(
        status => status.dashboardId === "dashboard_1"
      );

      const isAllStatusClicked = Array.isArray(valueId);

      if (isAllStatusClicked) {
        // Toggle "All Status"
        const isAllStatusSelected = existingDashboard1Selections.some(
          status => Array.isArray(status.valueId)
        );

        if (!isAllStatusSelected) {
          const allIndividualStatuses = dashboard1Options.values
            .filter(v => !Array.isArray(v.id))
            .map(value => ({
              dashboardId,
              valueId: value.id.toString(),
              name: value.name,
            }));
          updatedSelection = allIndividualStatuses;
        } else {
          updatedSelection = [];
        }
      } else {
        // Individual checkbox clicked
        const isChildSelected = existingDashboard1Selections.some(
          status => status.valueId === valueId.toString()
        );

        if (!isChildSelected) {
          // Add the selected status
          updatedSelection = [
            ...existingDashboard1Selections,
            { dashboardId, valueId: valueId.toString(), name }
          ];
        } else {
          updatedSelection = existingDashboard1Selections.filter(
            status => status.valueId !== valueId.toString()
          );
        }
      }
    } else {
      updatedSelection = [{ dashboardId, valueId, name }];
    }

    setSelectedStatuses(updatedSelection);
    onSelectChange(updatedSelection);
  };

  const isSelected = (dashboardId, valueId) => {
    if (Array.isArray(valueId)) {
      // Check if all individual statuses are selected (for "All Status" checkbox)
      const dashboard1Options = options.find(opt => opt.id === "dashboard_1");
      const individualIds = dashboard1Options?.values
        ?.filter(v => !Array.isArray(v.id))
        .map(v => v.id.toString()) || [];
      
      const selectedIds = selectedStatuses
        .filter(s => s.dashboardId === dashboardId)
        .map(s => s.valueId);

      return individualIds.length > 0 && individualIds.every(id => selectedIds.includes(id));
    }
    
    return selectedStatuses.some(
      (status) => status.dashboardId === dashboardId && status.valueId === valueId.toString()
    );
  };

  const renderDashboard = (dashboard) => {
    if (dashboard?.id === "dashboard_1" && dashboard?.values) {
      return (
        <div key={dashboard.id} className="p7-15 py-0">
          <label className="fz14 fw-600 text-nowrap mb-2">{dashboard.name}</label>
          <div style={{ marginLeft: "0px" }}>
            {dashboard.values.map((child) => {
              const isAllStatus = Array.isArray(child.id);
              const checkboxId = isAllStatus ? child.id : child.id.toString();
              
              return (
                <label 
                  key={isAllStatus ? 'all-status' : child.id} 
                  style={{ display: "block" }}
                  className={`custom-drop-menu fz14 text-nowrap p7-15 ${isSelected(dashboard.id, checkboxId) ? "active" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="mr8"
                    checked={isSelected(dashboard.id, checkboxId)}
                    onChange={() => handleCheckboxChange(dashboard.id, child.id, child.name)}
                  />
                  {child.name}
                </label>
              );
            })}
          </div>
        </div>
      );
    } else {
      // Single-select options
      return (
        <label
          className={`custom-drop-menu fz14 text-nowrap p7-15 ${isSelected(dashboard?.id, dashboard?.id) ? "active" : ""}`}
          key={dashboard?.id} 
          style={{ display: "block" }}
        >
          <input
            type="radio"
            className="opacity-0"
            name="single-select"
            checked={isSelected(dashboard?.id, dashboard?.id)}
            onChange={() => handleCheckboxChange(dashboard?.id, dashboard?.id, dashboard?.name)}
          />
          <span className="position-relative" style={{ 'left': '-13px' }}>{dashboard?.name}</span>
        </label>
      );
    }
  };

  const handleRemoveSelection = (e, dashboardId, valueId) => {
    e.preventDefault();
    e.stopPropagation();
    
    let updatedSelection = [];
    
    if (dashboardId === "dashboard_1") {
      updatedSelection = selectedStatuses.filter(
        (status) => !(status.dashboardId === dashboardId && status.valueId === valueId)
      );
    } else {
      updatedSelection = [];
    }

    setSelectedStatuses(updatedSelection);
    onSelectChange(updatedSelection);
  };

  const renderSelectedOptions = () => {
    if (selectedStatuses.length === 0) {
      return <span className="text-muted w-100">{translation('key_please_select')}</span>;
    }

    return selectedStatuses.map((status) => (
      <div className="d-inline-block p-1" key={`${status.dashboardId}-${status.valueId}`}>
        <div className="fz15">
          <div className="selected-custom-chip text-nowrap">
            <span className="text-dark">{status.name}</span>
            <Link
              className="blue ml4 remove-selection"
              onClick={(e) => handleRemoveSelection(e, status.dashboardId, status.valueId)}
            >
              <svg height="14" width="14" viewBox="0 0 20 20"
                aria-hidden="true" focusable="false" className="css-tj5bde-Svg">
                <path fill="#1e88e5" d="M14.348 14.849c-0.469 0.469-1.229 0.469-1.697 0l-2.651-3.030-2.651 3.029c-0.469 0.469-1.229 0.469-1.697 0-0.469-0.469-0.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-0.469-0.469-0.469-1.228 0-1.697s1.228-0.469 1.697 0l2.652 3.031 2.651-3.031c0.469-0.469 1.228-0.469 1.697 0s0.469 1.229 0 1.697l-2.758 3.152 2.758 3.15c0.469 0.469 0.469 1.229 0 1.698z">
                </path>
              </svg>
            </Link>
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="position-relative" ref={dropdownRef}>
      <button
        type="button"
        className="w-100 brdr9e text-left custom-input-btn bg-white px-2"
        onClick={handleToggleDropdown}
      >
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex flex-wrap">
            {renderSelectedOptions()}
          </div>
          <div className="arrow-down-wrapper">
            <i className="ri-arrow-down-s-fill"></i>
          </div>
        </div>
      </button>
      {isDropdownOpen && (
        <div
          className="position-absolute w-100 bg-white"
          style={{
            top: "100%",
            left: 0,
            border: "1px solid #ccc",
            zIndex: 9,
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {options.map(renderDashboard)}
        </div>
      )}
    </div>
  );
};

ProfileStatusDropdown.propTypes = {
  options: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      values: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.oneOfType([PropTypes.number, PropTypes.arrayOf(PropTypes.number)]).isRequired,
          name: PropTypes.string.isRequired,
        })
      ),
    })
  ).isRequired,
  onSelectChange: PropTypes.func.isRequired,
  defaultSelections: PropTypes.any,
};

export default ProfileStatusDropdown;