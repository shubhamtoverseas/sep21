import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../../ui/Modal";
import Btn from "../../../ui/Btn";
import { Field, RadioGroup } from "../../../ui/FormControls";
import translation from "../../../../utils/translation";
import { ShowToast } from "../../../show-toast/ShowToast";
import { changeProcessingCsAssistantAPI } from "../../../../services/processings";
import ProcessingStaffSearch from "./ProcessingStaffSearch";

const MODE = Object.freeze({ ASSIGN: "assign", UNASSIGN: "unassign" });

/**
 * Excel Contract No. 17 / 20 — Change CS Assistant: an eligible person or Unassigned.
 * The CS Owner can never be chosen. Assignment grants nothing (no access, permissions or authority).
 * Nothing is written on Cancel / Escape; server refusals keep the dialog open with the message.
 */
const ChangeCsAssistantPopup = ({ contractId, employerId, csOwnerStaffId, currentAssistant, onClose, onChanged }) => {
    const hasAssistant = Boolean(currentAssistant?.id);
    const [mode, setMode] = useState(MODE.ASSIGN);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reason, setReason] = useState(""); // P-3: optional reason, stored in the activity log
    const inFlightRef = useRef(false);

    const modeOptions = [
        { value: MODE.ASSIGN, label: translation("key_choose_a_person") },
        { value: MODE.UNASSIGN, label: translation("key_unassigned"), disabled: !hasAssistant },
    ];

    const handleModeChange = useCallback((value) => {
        setMode(value);
        setError("");
    }, []);

    const handleSelect = useCallback((staff) => {
        setSelectedStaff(staff);
        setError("");
    }, []);

    const handleClose = useCallback(() => {
        if (!isSubmitting) onClose();
    }, [isSubmitting, onClose]);

    const handleSubmit = useCallback(async () => {
        if (inFlightRef.current) return;
        let staffId = null;
        if (mode === MODE.ASSIGN) {
            if (!selectedStaff?.id) {
                setError(translation("key_select_cs_assistant"));
                return;
            }
            if (Number(selectedStaff.id) === Number(csOwnerStaffId)) {
                setError(translation("key_cs_owner_and_assistant_must_differ"));
                return;
            }
            staffId = Number(selectedStaff.id);
        }
        if (staffId === (hasAssistant ? Number(currentAssistant.id) : null)) {
            onClose();
            return;
        }

        inFlightRef.current = true;
        setIsSubmitting(true);
        try {
            const response = await changeProcessingCsAssistantAPI({ contract_id: Number(contractId), staff_id: staffId, ...(reason.trim() ? { reason: reason.trim() } : {}) });
            if (!response?.data?.status) {
                setError(response?.data?.message || translation("key_something_went_wrong"));
                return;
            }
            ShowToast("success", response.data.message);
            if (onChanged) await onChanged();
            onClose();
        } catch (requestError) {
            setError(requestError?.response?.data?.message || translation("key_something_went_wrong"));
        } finally {
            inFlightRef.current = false;
            setIsSubmitting(false);
        }
    }, [mode, selectedStaff, csOwnerStaffId, hasAssistant, currentAssistant, contractId, onChanged, onClose]);

    return (
        <Modal
            title={ translation("key_change_processing_cs_assistant") }
            width={ 480 }
            onClose={ handleClose }
            closeLabel={ translation("key_close") }
            trapFocus
            footer={ (
                <>
                    <span style={ { flex: 1 } } />
                    <Btn variant="secondary" type="button" onClick={ handleClose } disabled={ isSubmitting }>
                        { translation("key_cancel") }
                    </Btn>
                    <Btn variant="primary" type="button" onClick={ handleSubmit } disabled={ isSubmitting }>
                        { isSubmitting ? translation("key_loading") : translation("key_save") }
                    </Btn>
                </>
            ) }
        >
            <p className="fz14 mb-3">
                <b>{ translation("key_current_cs_assistant") }</b>: { currentAssistant?.name || "—" }
            </p>
            <RadioGroup
                name="cs-assistant-mode"
                value={ mode }
                options={ modeOptions }
                onChange={ handleModeChange }
                disabled={ isSubmitting }
                ariaLabel={ translation("key_cs_assistant") }
            />
            { mode === MODE.ASSIGN && (
                <div className="mt-3">
                    <Field label={ translation("key_cs_assistant") } required error={ error }>
                        <ProcessingStaffSearch
                            contractId={ contractId }
                            employerId={ employerId }
                            placeholder={ translation("key_search_cs_assistant") }
                            excludeIds={ [csOwnerStaffId, currentAssistant?.id] }
                            selected={ selectedStaff }
                            onSelect={ handleSelect }
                            invalid={ Boolean(error) }
                            disabled={ isSubmitting }
                        />
                    </Field>
                </div>
            ) }
            { mode === MODE.UNASSIGN && error && <p className="text-danger fz12 mt-2" role="alert">{ error }</p> }
            <div className="mt-3">
                <Field label={ `${translation("key_reason")} (${translation("key_optional")})` }>
                    <textarea
                        className="form-control"
                        rows={ 2 }
                        maxLength={ 500 }
                        value={ reason }
                        onChange={ (e) => setReason(e.target.value) }
                        disabled={ isSubmitting }
                    />
                </Field>
            </div>
            <p className="fz12 grey3 mt-3 mb-0">{ translation("key_cs_assistant_grants_nothing_note") }</p>
        </Modal>
    );
};

ChangeCsAssistantPopup.propTypes = {
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    employerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    csOwnerStaffId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    currentAssistant: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string,
    }),
    onClose: PropTypes.func.isRequired,
    onChanged: PropTypes.func,
};

export default ChangeCsAssistantPopup;
