import React, { useState } from "react";
// import crossCircleBlue from "../../assets/img/svg/cancel-circle-blue.svg";
import crossCircleLight from "../../assets/img/svg/cross-circle-light.svg";
import verifiedCircleGreen from "../../assets/img/svg/verified-circle-green.svg";
import actionCircle from "../../assets/img/svg/cross-circle-violet1.svg";
import PropTypes from "prop-types";
import "./activity-status-collapsible.css";
import { changeDynamicDateFormate } from "../../utils/utils"
import translation from '../../utils/translation';
const ActivityStatusInvoice = ({ marginBottom = "", documentStatus }) => {
    const [isCollapsed, setIsCollapsed] = useState(true);

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "1":
                return "text-success";
            case "2":
                return "text-warning";
            case "3":
                return "text-warning";
            case "4":
                return "text-purple";
            case "5":
                return "blue";
            case "6":
                return "text-info";
            case "7":
                return "text-danger";
            case "8":
                return "text-info";
            case "9":
                return "text-success";
            default:
                return "secondary";
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case "1":
                return verifiedCircleGreen;
            case "2":
                return crossCircleLight;
            case "3":
                return crossCircleLight;
            case "4":
                return crossCircleLight;
            case "5":
                return actionCircle;
            case "6":
                return crossCircleLight;
            case "7":
                return crossCircleLight;
            case "8":
                return verifiedCircleGreen;
            case "9":
                return verifiedCircleGreen;
            default:
                return actionCircle;
        }
    };

    return (
        <div className={ `${ marginBottom } activity-status-collapsible collapse-view` }>
            <div className="card">
                <div className="card-header border-0 fz20 fw-500 black d-flex justify-content-between align-items-center" onClick={ toggleCollapse }>
                    <span> { translation('key_activity')}</span>
                    <span>
                        { isCollapsed ? (
                            <i className="ri-arrow-down-s-line"></i>
                        ) : (
                            <i className="ri-arrow-up-s-line"></i>
                        ) }
                    </span>
                </div>
                <div className={ `card-body pb-0 border-0 ${ isCollapsed ? "collapse" : "" }` }>
                    { !documentStatus?.error && documentStatus?.map((tab, index) => (
                        <div key={ index }>
                            <div className="activity-item mb40 position-relative">
                                <div className="d-flex align-items-start">
                                    <img src={ getStatusIcon(tab?.current_status) } alt="status icon" />
                                    <div className="d-flex flex-column align-items-start ml5">
                                        <span className={ `fz16 font-roboto lh-normal mb4 ${ getStatusColor(tab?.current_status) }` }>
                                            { tab?.current_status_name }
                                        </span>
                                        <span className="fz14 fw-400 grey3">
                                            { tab?.log_created_by },
                                            { changeDynamicDateFormate(tab?.created_at, "DD/MM/YYYY") } at { changeDynamicDateFormate(tab?.created_at, "HH:mm:ss") }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) }
                </div>
            </div>
        </div>
    );


};
ActivityStatusInvoice.propTypes = {
    marginBottom: PropTypes.string,
    documentStatus: PropTypes.any
};
export default ActivityStatusInvoice;
