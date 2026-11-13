import React, { useState } from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import translation from "../../../../utils/translation";
import { extendVisaView, formatShortDate } from "../dashboard/contractDashboardUtils";
import { formatDate, isActive, isClosed, isProcessing, statusKeyOf } from "./contractRecordUtils";
import usePaos from "./usePaos";
import PaosDialog from "./PaosDialog";
import { paosAction, paosFacts, paosHistory, paosKey, paosLabel, stampOf } from "./paosRules";
import useExtendVisaCases from "../extend-visa/useExtendVisaCases";
import { caseLabel, caseRoute, caseStamp, lifecycleLabel, lifecycleTone } from "../extend-visa/extendVisaUtils";
import { CD_PAOS_TONE, CD_STATUS_LABEL_KEYS, CD_XV_PRESENTED, CR_PAOS_ACTION, CR_PAOS_PROGRESS } from "../contractConstants";

const ACTION_LABEL_KEY = Object.freeze({
    [CR_PAOS_ACTION.ARRANGE]: "key_arrange_paos", [CR_PAOS_ACTION.UPDATE]: "key_update_paos", [CR_PAOS_ACTION.RECORD_OUTCOME]: "key_record_outcome", [CR_PAOS_ACTION.VIEW]: "key_view",
});
const DIALOG_MODE = Object.freeze({ [CR_PAOS_ACTION.ARRANGE]: "edit", [CR_PAOS_ACTION.UPDATE]: "edit", [CR_PAOS_ACTION.RECORD_OUTCOME]: "outcome", [CR_PAOS_ACTION.VIEW]: "view" });

/**
 * The work band above the record tabs (prototype v28ActiveWorkHTML + v210 / v211 closed-parent rows; workbook #85,
 * CT-05 / CT-06): "Work that can start before arrival" while Processing (only when PAOS applies), "Active-contract
 * work" on Active (PAOS item when it applies + the Extend Visa case summary), "PAOS from this contract" on a closed
 * parent that still holds a stored case (facts, the parent lifecycle, Record outcome / View). The PAOS item's label
 * follows the case: Arrange PAOS → Update PAOS → View; Arrange / Update / Record outcome need Stage Actions — Edit.
 * The Extend Visa item carries the complete ordered case history (EXTEND.md §15.2, prototype xvIndicatorHTML): one chip
 * per case — "Case n" (creation order, U-0307) · lifecycle — each opening its case; Start lives in the header Actions.
 */
const ActiveWorkBand = ({ contractId, row, canEdit, canStartExtendVisa = false }) => {
    const { info, reload } = usePaos(contractId, row.contract_status);
    const [dialog, setDialog] = useState(null);
    const navigate = useNavigate();
    const active = isActive(row);
    const xvCases = useExtendVisaCases(contractId, active || Boolean(row.extend_visa));
    const closed = isClosed(row);
    if (!active && !isProcessing(row) && !closed) return null;
    const applicable = Boolean(info?.applicable);
    const c = info?.case || null;
    const showPaos = closed ? Boolean(applicable && c) : applicable;
    if (!showPaos && !active) return null;

    const progress = paosKey(c?.progress);
    const action = showPaos ? paosAction(info, row, canEdit) : null;
    const completedEvent = closed && progress === CR_PAOS_PROGRESS.COMPLETED
        ? paosHistory(info).events.find((h) => paosKey(h.current_progress) === CR_PAOS_PROGRESS.COMPLETED) || null
        : null;
    const bandKey = closed ? "key_cr_paos_from_this_contract" : (active ? "key_cr_active_work" : "key_cr_work_before_arrival");
    const parentEnd = row.contract_end || row.cancellation_date;

    const xv = extendVisaView(row.extend_visa);
    let xvText = translation(canStartExtendVisa ? "key_cr_xv_no_case_start" : "key_cr_xv_no_case");
    if (xv) {
        if (xv.presented === CD_XV_PRESENTED.CANCELLED) xvText = `${ translation("key_cancelled") }${ xv.at ? ` · ${ formatShortDate(xv.at) }` : "" }`;
        else xvText = `${ xv.token || "" }${ xv.at ? ` · ${ formatShortDate(xv.at) }` : "" }`;
        if (xv.count > 1) xvText += ` · ×${ xv.count }`;
    }

    return (
        <div className="mcdt-band" data-mc-active-work="" data-closed-paos={ closed ? statusKeyOf(row.contract_status) : undefined }>
            <div className="bk">{ translation(bandKey) }</div>
            <div className="bl">
                { showPaos && (
                    <div className="bi" data-mc-active-item="paos">
                        <span className="bt">{ translation("key_stage_paos") }</span>
                        <span className={ `mcdt-tok inline ${ CD_PAOS_TONE[progress] || "teal" }` } data-paos-progress={ progress }><span>{ paosLabel(progress) }</span></span>
                        <span className="bx">{ paosFacts(c) }</span>
                        <span className="grow" />
                        { !closed && isProcessing(row) && <span className="bn">{ translation("key_paos_booking_before_arrival") }</span> }
                        { completedEvent && <span className="bn" data-paos-completed="">{ paosLabel(completedEvent.current_progress) } { stampOf(completedEvent.created_at) }{ completedEvent.created_by_name ? ` · ${ completedEvent.created_by_name }` : "" }</span> }
                        { closed && (
                            <span className="bn" data-closed-parent={ statusKeyOf(row.contract_status) }>
                                { translation("key_contract") } { translation(CD_STATUS_LABEL_KEYS[statusKeyOf(row.contract_status)]) }{ parentEnd ? ` ${ formatDate(parentEnd) }` : "" }
                            </span>
                        ) }
                        { action && <button type="button" className="g1-btn" data-paos-action={ action } onClick={ () => setDialog(DIALOG_MODE[action]) }>{ translation(ACTION_LABEL_KEY[action]) }</button> }
                    </div>
                ) }
                { active && (
                    <div className="bi" data-mc-active-item="extend-visa">
                        <span className="bt">{ translation("key_stage_extend_visa") }</span>
                        <span className="bx">{ xvText }</span>
                        { xvCases.cases.length > 0 && (
                            <div className="xvcases" data-xv-cases={ xvCases.cases.length }>
                                { xvCases.cases.map((c) => (
                                    <button key={ c.extend_visa_case_id } type="button" className="g1-btn xvcase" data-xv-lifecycle={ c.lifecycle } title={ c.cancel_reason || undefined } onClick={ () => navigate(caseRoute(contractId, c.extend_visa_case_id)) }>
                                        <span className={ `dot ${ lifecycleTone(c.lifecycle) }` } aria-hidden="true" />{ caseLabel(c) } · { lifecycleLabel(c.lifecycle) }{ caseStamp(c) ? ` · ${ formatShortDate(caseStamp(c)) }` : "" }
                                    </button>
                                )) }
                            </div>
                        ) }
                    </div>
                ) }
            </div>
            { dialog && <PaosDialog contractId={ contractId } row={ row } info={ info } mode={ dialog } onClose={ () => setDialog(null) } onSaved={ () => { setDialog(null); reload(); } } /> }
        </div>
    );
};

ActiveWorkBand.propTypes = {
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    row: PropTypes.object.isRequired,
    canEdit: PropTypes.bool,
    /* Active + no open case + processing_start_extend_visa: the empty state names where Start lives */
    canStartExtendVisa: PropTypes.bool,
};

export default React.memo(ActiveWorkBand);
