import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import dayjs from "dayjs";
import translation from "../../../../../../utils/translation";
import DateInput from "../../../../../../components/ui/DateInput";
import TimeInput from "../../../../../../components/ui/TimeInput";
import Icon from "../../../../../../components/Icon/Icon";
import { deploymentDocumentView, deploymentShareUpdate, deploymentStatusList, deploymentUpdateFlightDetails } from "../../../../../../redux/Slices/processing/ProcessingSlice";
import { isAdminUser, showSuccessOrError } from "../../../../../../services/commonService";
import { Fld, FormGrid, NotRequiredNote, StageFooter, StagePanel, StagePanelHead } from "../../../../../../components/Processing/newui/StagePanel";
import StageSendTemplate from "../../../../../../components/Processing/newui/StageSendTemplate";
import { DEPLOYMENT_TYPED_FIELDS, FLIGHT_BOOKED_BY, SUB_STAGE_NOT_REQUIRED_CODE, isSubStageNotRequired } from "../../../processingConstants";
import { withFocusedText } from "../draftSync";
import { useIsProcessingContract } from "../../contractLifecycle";

const toTime = (t) => (t ? new Date(`1970-01-01T${ t }`) : null);
const draftOf = (doc) => ({
    booking_made_by: doc?.booking_made_by || FLIGHT_BOOKED_BY[0].value,
    flight_number: doc?.flight_number || "",
    from_place: doc?.from_place || "",
    to_place: doc?.to_place || "",
    arrival_date: doc?.arrival_date || "",
    departure_date: doc?.departure_date || "",
    arrival_time: toTime(doc?.arrival_time),
    departure_time: toTime(doc?.departure_time),
});

/**
 * Flight Details panel (prototype depPanel 'flight'): Booking Made By · Flight No. · From · To · Arrival Date / Time ·
 * Departure Date / Time autosaving per field; footer Share · Send Template · status menu. The flight departs first and
 * arrives after, so ARRIVAL cannot precede DEPARTURE (Shubham 9 Nov — the earlier rule was inverted; an arrival left
 * earlier than a new departure is cleared). Logic unchanged: deploymentUpdateFlightDetails / deploymentShareUpdate.
 */
const FlightDetailsTab = ({ statusList, onUpdateChangeStatus, deploymentDocument, stageActionPermission }) => {
    const { contract_id } = useParams();
    const dispatch = useDispatch();
    const { contractDetails } = useSelector((state) => state.contracts);
    const [draft, setDraft] = useState(draftOf(deploymentDocument));
    const [template, setTemplate] = useState(null);   /* { slug, statusKey } while the Send Template modal is open */
    const processing = useIsProcessingContract(contractDetails);
    const canEdit = processing && stageActionPermission.includes("edit");
    /* backend 281: Not Required = details read-only (values kept); a 409 SUB_STAGE_NOT_REQUIRED keeps the typed values through the reload */
    const locked = isSubStageNotRequired(deploymentDocument?.flight_details_status);
    const canEditFields = canEdit && !locked;
    const menuRef = useRef(null);
    const pendingDraft = useRef(null);

    useEffect(() => { setDraft((prev) => withFocusedText(pendingDraft.current ? { ...draftOf(deploymentDocument), ...pendingDraft.current } : draftOf(deploymentDocument), prev, DEPLOYMENT_TYPED_FIELDS.flight_details)); }, [deploymentDocument]);

    const save = useCallback((next) => {
        const payload = {
            ...next, contract_id,
            arrival_date: next.arrival_date || "", departure_date: next.departure_date || "",
            arrival_time: next.arrival_time ? dayjs(next.arrival_time).format("HH:mm:ss") : "",
            departure_time: next.departure_time ? dayjs(next.departure_time).format("HH:mm:ss") : "",
        };
        dispatch(deploymentUpdateFlightDetails(payload)).then((res) => {
            showSuccessOrError(res);
            if (res.error && res.payload?.code === SUB_STAGE_NOT_REQUIRED_CODE) { pendingDraft.current = next; dispatch(deploymentDocumentView(contract_id)); return; }
            if (!res.error) { pendingDraft.current = null; }
            if (!res.error) { dispatch(deploymentDocumentView(contract_id)); dispatch(deploymentStatusList({ contract_id, type: "flight_details" })); }
        });
    }, [dispatch, contract_id]);
    const commit = (patch) => { const next = { ...draft, ...patch }; setDraft(next); save(next); };
    const commitText = (key) => (e) => { if (e.target.value !== (draftOf(deploymentDocument)[key] || "")) commit({ [key]: e.target.value }); };
    const onDepartureDate = (v) => {
        const clearArrival = v && draft.arrival_date && draft.arrival_date < v;
        commit({ departure_date: v, ...(clearArrival ? { arrival_date: "" } : {}) });
    };

    const openTemplate = (slug, statusKey) => { setTemplate({ slug, statusKey }); };
    const handleShare = (data) => {
        dispatch(deploymentShareUpdate({ contract_id, type: template?.statusKey, template_data: data })).then((res) => { showSuccessOrError(res); if (!res.error) dispatch(deploymentStatusList({ contract_id, type: "flight_details" })); });
    };

    return (
        <StagePanel locked={ !processing }>
            <StagePanelHead title={ translation("key_flight_details") } stage="flight_details" status={ deploymentDocument?.flight_details_status } updatedAt={ deploymentDocument?.flight_details_updated_at ?? deploymentDocument?.flight_details_last_status_updated_at } updatedBy={ deploymentDocument?.flight_details_updated_by_info ?? deploymentDocument?.flight_details_last_status_updated_name } utc={ Boolean(deploymentDocument?.flight_details_updated_at) } />
            { locked && processing && <NotRequiredNote onChangeStatus={ () => menuRef.current?.open() } /> }
            <FormGrid layout="flight">
                <Fld id="fl-bb" label={ translation("key_booking_made_by") }>
                    <select id="fl-bb" className="g1-in" value={ draft.booking_made_by } disabled={ !canEditFields } onChange={ (e) => commit({ booking_made_by: e.target.value }) }>
                        { FLIGHT_BOOKED_BY.map((o) => <option key={ o.value } value={ o.value }>{ translation(o.labelKey) }</option>) }
                    </select>
                </Fld>
                <Fld id="fl-no" label={ translation("key_flight_no") }>
                    <input id="fl-no" className="g1-in mono" value={ draft.flight_number } maxLength={ 20 } disabled={ !canEditFields } onChange={ (e) => setDraft((d) => ({ ...d, flight_number: e.target.value })) } onBlur={ commitText("flight_number") } />
                </Fld>
                <Fld id="fl-fr" label={ translation("key_from") }>
                    <input id="fl-fr" className="g1-in" value={ draft.from_place } maxLength={ 30 } disabled={ !canEditFields } onChange={ (e) => setDraft((d) => ({ ...d, from_place: e.target.value })) } onBlur={ commitText("from_place") } />
                </Fld>
                <Fld id="fl-to" label={ translation("key_to") }>
                    <input id="fl-to" className="g1-in" value={ draft.to_place } maxLength={ 30 } disabled={ !canEditFields } onChange={ (e) => setDraft((d) => ({ ...d, to_place: e.target.value })) } onBlur={ commitText("to_place") } />
                </Fld>
                <Fld id="fl-ad" label={ translation("key_arrival_date") }>
                    <DateInput id="fl-ad" value={ draft.arrival_date } min={ draft.departure_date || undefined } disabled={ !canEditFields } className="mcdt-datewrap" onChange={ (v) => commit({ arrival_date: v }) } />
                </Fld>
                <Fld id="fl-at" label={ translation("key_arrival_time") }>
                    <TimeInput id="fl-at" value={ draft.arrival_time } disabled={ !canEditFields } className="g1-timewrap" onChange={ (t) => commit({ arrival_time: t }) } />
                </Fld>
                <Fld id="fl-dd" label={ translation("key_departure_date") }>
                    <DateInput id="fl-dd" value={ draft.departure_date } disabled={ !canEditFields } className="mcdt-datewrap" onChange={ onDepartureDate } />
                </Fld>
                <Fld id="fl-dt" label={ translation("key_departure_time") }>
                    <TimeInput id="fl-dt" value={ draft.departure_time } disabled={ !canEditFields } className="g1-timewrap" onChange={ (t) => commit({ departure_time: t }) } />
                </Fld>
            </FormGrid>
            <StageFooter menuRef={ menuRef } stage="flight_details" onSendTemplate={ () => openTemplate("processing_deployment_flight_details", "") } canSendTemplate={ stageActionPermission.includes("send_template") || isAdminUser() }
                statusOptions={ statusList || [] } current={ deploymentDocument?.flight_details_status } onChangeStatus={ onUpdateChangeStatus } canChangeStatus={ processing && (stageActionPermission.includes("change_status") || isAdminUser()) }>
                <button type="button" className="g1-btn" disabled={ !canEdit } data-fid="share-flight" onClick={ () => openTemplate("processing_deployment_share_flight", "flight_details") }><Icon name="external" size={ 12 } strokeWidth={ 1.6 } />{ translation("key_share") }</button>
            </StageFooter>

            { template && (
                <StageSendTemplate contractDetails={ contractDetails } slug={ template.slug } statusKey={ template.statusKey }
                    onClose={ () => setTemplate(null) } onSent={ (data) => { if (template.statusKey) handleShare(data); } } />
            ) }
        </StagePanel>
    );
};

FlightDetailsTab.propTypes = {
    statusList: PropTypes.array,
    onUpdateChangeStatus: PropTypes.func.isRequired,
    deploymentDocument: PropTypes.object,
    stageActionPermission: PropTypes.array.isRequired,
};

export default React.memo(FlightDetailsTab);
