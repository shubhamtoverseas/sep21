import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import { Field } from "../../../../components/ui/FormControls";
import translation from "../../../../utils/translation";
import { updateProcessingDetails } from "../../../../redux/Slices/processing/ProcessingSlice";
import { showSuccessOrError } from "../../../../services/commonService";
import { dateOrDash, isoOf } from "./contractRecordUtils";
import { recordEditRules } from "./recordEditRules";
import { CR_RECORD_EDIT } from "../contractConstants";

/**
 * "Edit record" (PROCESS.md §3.3.2; work order 2026-10-21): the header Edit opens this dialog instead of flipping the rail's
 * Requested Start tile. Exactly the two editable metadata fields — Requested Start Date, Arrival Date — each per the
 * lifecycle (recordEditRules). Save → POST processing/global/details-update with ONLY the fields the viewer may edit here
 * (the API writes the keys present; `expected_start_date` is never sent from this dialog — the rail pencil keeps its own
 * payload). The kit date field accepts DD/MM/YYYY; a typed string that is not a date never becomes a value.
 */
const ContractEditRecordDialog = ({ contractId, row, contractDetails, onClose, onSaved }) => {
    const dispatch = useDispatch();
    const rules = useMemo(() => recordEditRules(row?.contract_status), [row?.contract_status]);
    const storedRequested = useMemo(() => isoOf(row?.[CR_RECORD_EDIT.FIELDS.REQUESTED_START]) || "", [row]);
    /* the record carries no flat arrival_date yet (asked 21 Oct): the Deployment value on the legacy detail is the source */
    const storedArrival = useMemo(() => isoOf(row?.[CR_RECORD_EDIT.FIELDS.ARRIVAL] ?? contractDetails?.[CR_RECORD_EDIT.ARRIVAL_DETAIL_KEY]) || "", [row, contractDetails]);
    const [requested, setRequested] = useState(storedRequested);
    const [arrival, setArrival] = useState(storedArrival);
    const [busy, setBusy] = useState(false);

    const changed = (rules.requestedEditable && requested !== storedRequested) || (rules.arrivalEditable && arrival !== storedArrival);

    const save = useCallback(async () => {
        const payload = { contract_id: Number(contractId) };
        if (rules.requestedEditable) payload[CR_RECORD_EDIT.FIELDS.REQUESTED_START] = requested || null;
        if (rules.arrivalEditable) payload[CR_RECORD_EDIT.FIELDS.ARRIVAL] = arrival || null;
        setBusy(true);
        const res = await dispatch(updateProcessingDetails(payload));
        setBusy(false);
        showSuccessOrError(res);
        if (res?.error) return;
        onSaved();
        onClose();
    }, [dispatch, contractId, rules, requested, arrival, onSaved, onClose]);

    return (
        <Modal title={ translation("key_edit_details") } width={ 480 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="mcdt-dlg"
            footer={ (
                <>
                    <span className="grow" />
                    <Btn variant="secondary" type="button" disabled={ busy } onClick={ onClose }>{ translation("key_cancel") }</Btn>
                    <Btn variant="primary" type="button" disabled={ busy || !changed } onClick={ save }>{ busy ? `${ translation("key_loading") }…` : translation("key_save_changes") }</Btn>
                </>
            ) }>
            <div className="row two">
                <Field label={ translation("key_requested_start_date") } htmlFor="cr-er-requested" className="f-date">
                    { rules.requestedEditable
                        ? <DateInput id="cr-er-requested" name="cr-er-requested" value={ requested } onChange={ setRequested } disabled={ busy } />
                        : <div className="mcdt-ro" data-mc-readonly="">{ dateOrDash(row?.[CR_RECORD_EDIT.FIELDS.REQUESTED_START]) }</div> }
                </Field>
                <Field label={ translation("key_arrival_date") } htmlFor="cr-er-arrival" className="f-date" hint={ rules.arrivalFromFlightDetails ? translation("key_cr_from_flight_details") : undefined }>
                    { rules.arrivalEditable
                        ? <DateInput id="cr-er-arrival" name="cr-er-arrival" value={ arrival } onChange={ setArrival } disabled={ busy } />
                        : <div className="mcdt-ro" data-mc-readonly="">{ dateOrDash(storedArrival) }</div> }
                </Field>
            </div>
        </Modal>
    );
};

ContractEditRecordDialog.propTypes = {
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    row: PropTypes.object.isRequired,
    contractDetails: PropTypes.object,
    onClose: PropTypes.func.isRequired,
    onSaved: PropTypes.func.isRequired,
};

export default ContractEditRecordDialog;
