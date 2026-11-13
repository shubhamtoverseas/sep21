import React, { useState } from "react";
import PropTypes from "prop-types";
const WorkerSkillCollapsibleView = ({ isDescCollapsed = false, heading = '', children, marginBottom = "", headingClasses = "fz16 fw-700 grey3 text-uppercase" }) => {
    const [isCollapsed, setIsCollapsed] = useState(isDescCollapsed);
    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };
    return (
        <div className={`${marginBottom} activity-status-collapsible collapse-view`}>
            <div className="collapsible-wrapper">
                <div className="border-0 fz20 mb10 fw-500 black cursor-pointer d-flex justify-content-between align-items-center" onClick={toggleCollapse}>
                    <div className={headingClasses}> {heading}</div>
                    <span>
                        {isCollapsed ? (
                            <i className="ri-arrow-down-s-line"></i>
                        ) : (
                            <i className="ri-arrow-up-s-line"></i>
                        )}
                    </span>
                </div>
                <div className={`pb-0 border-0 ${isCollapsed ? "collapse" : ""}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};
WorkerSkillCollapsibleView.propTypes = {
    isDescCollapsed: PropTypes.bool,
    marginBottom: PropTypes.string,
    heading: PropTypes.string,
    children: PropTypes.node.isRequired,
    headingClasses: PropTypes.string,
};
export default WorkerSkillCollapsibleView;
