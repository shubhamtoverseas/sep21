import React, { useEffect, useState, lazy } from "react";
import '../send-template/send-template-v18.css';
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
const TemplateFormWhatsApp = lazy(() => import('../../../template-form/TemplateFormWhatsApp'));
function SendTemplatePopup(props) {
    const [customWorkerInfo, setCustomWorkerInfo] = useState({});
    const maritalStatus = useSelector((state) => state.common.maritalStatus);
    useEffect(() => {
        let initalCustomCategory = {};
        if (props.workerInfoDetails) {
            Object.entries(props.workerInfoDetails).forEach(([key, value]) => {
                if (key === "fullname") {
                    initalCustomCategory['full_name'] = value;
                } else if (key === "current_location") {
                    initalCustomCategory['current_location'] = (value && typeof value === 'object' && value !== null) ? value.name : "";
                } else if (key === "domicile_address") {
                    initalCustomCategory['domicile_address'] = (value && value !== null && value.length > 0) ? value[0]?.address : "";
                } else if (key === "present_address") {
                    initalCustomCategory['present_address'] = (value && value !== null && value.length > 0) ? value[0]?.address : "";
                } else if (key === "nationality") {
                    initalCustomCategory['nationality'] = (value && typeof value === 'object' && value !== null) ? value.name : "";
                } else if (key === "marital_status") {
                    if (Array.isArray(maritalStatus)) {
                        const statusObj = maritalStatus.find(item => item.id === value);
                        initalCustomCategory['marital_status'] = statusObj ? statusObj.name : "";
                    } else {
                        initalCustomCategory['marital_status'] = "";
                    }
                } else if (key === "name_in_education_certificate") {
                    initalCustomCategory['education'] = "";
                } else {
                    initalCustomCategory[key] = value;
                }
            });
            setCustomWorkerInfo(initalCustomCategory);
        }
    }, [props.workerInfoDetails]);

    return <div
        className="modal fade modalCustom sendTemplate show"
        id="newRegistrationJO"
        tabIndex={ -1 }
        aria-labelledby="exampleModalCenterTitle"
        style={ {
            display: "block",
            paddingRight: "15px",
            background: "rgba(0, 0, 0, 0.7)",
        } }
        aria-modal="true"
        role="dialog"
    >
        <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
                <div className="modal-header d-flex align-items-center justify-content-between bg-transparent border-0 px-4">
                    <h5 className="modal-title black" id="exampleModalLabel"> { props.title }</h5>
                </div>
                { props?.actionLocation !== "chat" && <TemplateFormWhatsApp userId={ props.userId } userType={ props.userType } slug={ props.slug } send_to={ props.send_to } onClick={ props.onClose } employee_worker_id={ props.employee_worker_id } status_key={ props.status_key } onEditTemplate={ () => { } } action={ props.action } actionStatusType={ props.actionStatusType } fullname={ props.fullname } onRefreshProfile={ props.handleRefreshProfile } customWorkerInfo={ customWorkerInfo } workerInfoMapping={ props.workerInfoMapping } isCategoryRequired={ props.isCategoryRequired } whatsAppTemplatesRequired={ props.whatsAppTemplatesRequired } custom_content_params={ props.custom_content_params } /> }

            </div>
        </div>
    </div>
}
SendTemplatePopup.propTypes = {
    onClose: PropTypes.func,
    title: PropTypes.string,
    userId: PropTypes.any,
    userType: PropTypes.string,
    slug: PropTypes.string,
    send_to: PropTypes.string,
    employee_worker_id: PropTypes.any,
    status_key: PropTypes.string,
    onOpenAddEditTemplatePopup: PropTypes.func,
    currentTemplateData: PropTypes.any,
    action: PropTypes.string,
    actionStatusType: PropTypes.string,
    fullname: PropTypes.string,
    actionLocation: PropTypes.string,
    onClick: PropTypes.func,
    onShowSchedulePopup: PropTypes.func,
    handleRefreshProfile: PropTypes.func,
    workerInfoDetails: PropTypes.object,
    workerInfoMapping: PropTypes.object,
    isCategoryRequired: PropTypes.bool,
    whatsAppTemplatesRequired: PropTypes.string,
    custom_content_params: PropTypes.any,

};
export default SendTemplatePopup;