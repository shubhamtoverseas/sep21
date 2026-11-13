import React, { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import ConfirmModal from "../../../ui/ConfirmModal";
import { showSuccessOrError } from "../../../../services/commonService";
import { fetchEmployerDetail, updateEmployerBanOrRemoveStatus } from "../../../../redux/Slices/employer/EmployerSlice";
import translation from "../../../../utils/translation";
import { EMPLOYER_BAN_COPY, EMPLOYER_BAN_REASON_MAX } from "../../../../Views/Pages/Employer/newui/employerNewUiConstants";

/*
 * Ban / Restore confirmation (prototype mc-emp-actions `ask()`): the consequence is stated before the commit;
 * the dialog keeps the shared focus contract (entry, Tab trap, Escape, inert background, focus back to the opener).
 * U-0046 (21 Oct): either operation needs an explicit reason — sent as `reason` beside the unchanged
 * { employer_id, ban_status: 'y' | 'n' } (the immutable audit event is the server's; backend ask).
 */
const RemoveOrBanEmployer = ({ isBan, employerId, onClose }) => {
    const dispatch = useDispatch();
    const [busy, setBusy] = useState(false);
    const [reason, setReason] = useState('');
    const [reasonError, setReasonError] = useState(false);

    const handleConfirm = useCallback(() => {
        const trimmed = reason.trim();
        if (!trimmed) { setReasonError(true); return; }
        setBusy(true);
        dispatch(updateEmployerBanOrRemoveStatus({ employer_id: employerId, ban_status: isBan ? 'y' : 'n', reason: trimmed })).then((res) => {
            setBusy(false);
            showSuccessOrError(res);
            if (!res?.error) {
                dispatch(fetchEmployerDetail({ employer_id: employerId }));
                onClose();
            }
        });
    }, [dispatch, employerId, isBan, reason, onClose]);

    return (
        <ConfirmModal
            title={ isBan ? EMPLOYER_BAN_COPY.banTitle : EMPLOYER_BAN_COPY.restoreTitle }
            body={ (
                <>
                    { isBan ? EMPLOYER_BAN_COPY.banBody : EMPLOYER_BAN_COPY.restoreBody }
                    <label className="wkd-status-reason">
                        <span>{ translation('key_reason') }</span>
                        <textarea
                            rows={ 3 }
                            value={ reason }
                            maxLength={ EMPLOYER_BAN_REASON_MAX }
                            required
                            aria-required
                            aria-invalid={ reasonError || undefined }
                            onChange={ (e) => { setReason(e.target.value); if (reasonError) setReasonError(false); } }
                        />
                        { reasonError && <span className="wkd-ew-err" role="alert">{ translation('key_reason_is_required') }</span> }
                    </label>
                </>
            ) }
            confirmLabel={ isBan ? EMPLOYER_BAN_COPY.banAction : EMPLOYER_BAN_COPY.restoreAction }
            danger={ isBan }
            busy={ busy }
            onConfirm={ handleConfirm }
            onClose={ onClose }
        />
    );
};

RemoveOrBanEmployer.propTypes = {
    onClose: PropTypes.func.isRequired,
    isBan: PropTypes.bool,
    employerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
};

export default RemoveOrBanEmployer;
