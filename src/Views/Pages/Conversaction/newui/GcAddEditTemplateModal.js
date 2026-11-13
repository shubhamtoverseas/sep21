import React from "react";
import PropTypes from "prop-types";
import GcModal from "./GcModal";
import AddEditTemplateFormChat from "../../../../components/template-form/AddEditTemplateFormChat";

/**
 * Add/Edit Template in the new-UI modal shell. The form logic is the
 * existing chat-only AddEditTemplateFormChat (unchanged — same fields,
 * validation and save flow); .gc-tpl-form restyles its controls to the
 * Send Template modal's visual language.
 */
const GcAddEditTemplateModal = ({
    title,
    onClose,
    userId,
    userType,
    slug,
    sendTo,
    employeeWorkerId,
    statusKey,
    onCloseAddEditTemplateOpenSendTemplatePopup,
    currentTemplateData,
}) => (
    <GcModal title={ title } size="lg" onClose={ onClose }>
        <div className="gc-tpl-form">
            <AddEditTemplateFormChat
                userId={ userId }
                userType={ userType }
                slug={ slug }
                send_to={ sendTo }
                onClick={ onClose }
                employee_worker_id={ employeeWorkerId }
                status_key={ statusKey }
                onCloseAddEditTemplateOpenSendTemplatePopup={ onCloseAddEditTemplateOpenSendTemplatePopup }
                currentTemplateData={ currentTemplateData }
            />
        </div>
    </GcModal>
);

GcAddEditTemplateModal.propTypes = {
    title: PropTypes.node,
    onClose: PropTypes.func.isRequired,
    userId: PropTypes.any,
    userType: PropTypes.string,
    slug: PropTypes.string,
    sendTo: PropTypes.any,
    employeeWorkerId: PropTypes.any,
    statusKey: PropTypes.string,
    onCloseAddEditTemplateOpenSendTemplatePopup: PropTypes.func,
    currentTemplateData: PropTypes.any,
};

export default GcAddEditTemplateModal;
