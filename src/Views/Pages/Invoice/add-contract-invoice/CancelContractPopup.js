import React from "react";
import PropTypes from 'prop-types';
import { useTranslation } from "react-i18next";
import ConfirmActionModal from "../general/ConfirmActionModal";

function CancelContractPopup(props) {
    const { t } = useTranslation();

    if (!props.showConfirmDialog) return null;

    return (
        <ConfirmActionModal
            danger
            icon="alert"
            title={ t('key_confirm_cancel') }
            message={ props?.message || t('key_cancel_updates_warning') }
            cancelLabel={ t('key_no') }
            confirmLabel={ t('key_yes') }
            onClose={ props.cancelContractDialog }
            onConfirm={ props.confirmCancelContract }
        />
    );
}

CancelContractPopup.propTypes = {
    showConfirmDialog: PropTypes.bool,
    cancelContractDialog: PropTypes.func,
    confirmCancelContract: PropTypes.func,
    message: PropTypes.string,
};

export default CancelContractPopup;
