import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import "../worker-details.css";
import dayjs from "dayjs";
import Icon from "../../../../../../components/Icon/Icon";
import translation from "../../../../../../utils/translation";
import useDialogFocus from "../../../../../../hooks/useDialogFocus";
import { getLocalTimeZone, showSuccessOrError } from "../../../../../../services/commonService";
import { SUGGEST_SCAN_DAYS, SUGGEST_MAX_PILLS } from "../../../workerModuleConstants";
import {
    fetchInterviewDateSlots, fetchInterviewTimeSlots, reScheduleInterview,
} from "../../../../../../redux/Slices/common/interview/InterviewSlice";

const WkdSuggestTimeDrawer = ({ onClose, jobRef, workerName, proposedDt, methodLocation, row, workerId, interviewTypeNum, onSent }) => {
    const panelRef = useRef(null);
    useDialogFocus(panelRef, onClose);
    const dispatch = useDispatch();
    const { interviewTimeSlots, status } = useSelector((state) => ({
        interviewTimeSlots: state.interview.interviewTimeSlots,
        status: state.interview.status,
    }), shallowEqual);

    const [holidayData, setHolidayData] = useState(null);
    const [selDate, setSelDate] = useState(null);
    const [selSlot, setSelSlot] = useState(null);
    const [slotStatus, setSlotStatus] = useState("idle");
    const [sent, setSent] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const months = new Set();
        for (let i = 1; i <= SUGGEST_SCAN_DAYS; i += 1) months.add(dayjs().add(i, "day").month() + 1);
        Promise.all([...months].map((month) => dispatch(fetchInterviewDateSlots({
            worker_id: workerId,
            employer_id: row?.employer_id,
            job_id: row?.job_id,
            month,
        }))))
            .then((results) => {
                const merged = { cs_holidays: [], interpreter_holidays: [], cs_doop: [], interpreter_doop: [], off_doops: [] };
                results.forEach((res) => {
                    if (res?.error) return;
                    const data = res?.payload?.data || {};
                    Object.keys(merged).forEach((key) => {
                        if (Array.isArray(data[key])) merged[key] = merged[key].concat(data[key]);
                    });
                });
                setHolidayData(merged);
            });
    }, [dispatch, workerId, row?.employer_id, row?.job_id]);

    const availJsDays = useMemo(() => new Set(
        String(row?.interview_day || "")
            .split(",")
            .map((d) => parseInt(d.trim(), 10) - 1)
            .filter((n) => n >= 0 && n <= 6)
    ), [row?.interview_day]);

    const dayPills = useMemo(() => {
        if (!holidayData) return null;
        const dayNameToNumber = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
        const holidays = new Set((holidayData.cs_holidays || []).filter((d) => (holidayData.interpreter_holidays || []).includes(d)));
        const doopDays = new Set((holidayData.cs_doop || [])
            .filter((d) => (holidayData.interpreter_doop || []).includes(d))
            .map((d) => dayNameToNumber[String(d).toLowerCase()])
            .filter((n) => n !== undefined));
        const offDoops = new Set((holidayData.off_doops || []).map((d) => dayjs(d).format("YYYY-MM-DD")));
        const pills = [];
        for (let i = 1; i <= SUGGEST_SCAN_DAYS && pills.length < SUGGEST_MAX_PILLS; i += 1) {
            const date = dayjs().add(i, "day");
            const iso = date.format("YYYY-MM-DD");
            if (availJsDays.size > 0 && !availJsDays.has(date.day())) continue;
            if (holidays.has(iso) || offDoops.has(iso) || doopDays.has(date.day())) continue;
            pills.push(date);
        }
        return pills;
    }, [holidayData, availJsDays]);

    const handleSelectDate = useCallback((date) => {
        setSelDate(date);
        setSelSlot(null);
        setSlotStatus("loading");
        dispatch(fetchInterviewTimeSlots({
            employer_id: row?.employer_id,
            interview_date: date.format("YYYY-MM-DD"),
            time_zone: getLocalTimeZone(),
            type: "employer",
        })).then(() => setSlotStatus("done"));
    }, [dispatch, row?.employer_id]);

    useEffect(() => {
        if (dayPills?.length && !selDate) handleSelectDate(dayPills[0]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dayPills]);

    const slotLabel = (slot) => dayjs(`2000-01-01 ${ slot }`).format("h:mm A");

    const handleSend = useCallback(() => {
        if (!selDate || !selSlot || sending) return;
        setSending(true);
        /* NOTE(backend): a worker-side suggestion is sent through the employer reschedule endpoint (reScheduleInterview);
           a worker-side proposal endpoint has been asked for — the API call stays as is until it exists */
        dispatch(reScheduleInterview({
            interview_id: row?.interview_id ?? row?.interview?.id,
            new_interview_date: selDate.format("YYYY-MM-DD"),
            new_interview_time: selSlot?.slot,
            interview_type: interviewTypeNum || 1,
        })).then((res) => {
            setSending(false);
            if (res?.error) { showSuccessOrError(res); return; }
            setSent(true);
            onSent?.();
        });
    }, [dispatch, selDate, selSlot, sending, row, interviewTypeNum, onSent]);

    return (
        <>
            <div className="ctx-backdrop" onClick={ onClose } role="presentation" />
            <div ref={ panelRef } className="ctx-drawer wkd-sug-drawer" role="dialog" aria-modal="true" aria-label={ translation("key_suggest_another_time") }>
                <div className="ctx-drawer-head">
                    <div className="wkd-sug-head-main">
                        <h2>{ translation("key_suggest_another_time") }</h2>
                        { jobRef && <span className="mc-code">{ jobRef }</span> }
                    </div>
                    <button type="button" className="ctx-icon-btn" aria-label={ translation("key_close") } onClick={ onClose }>
                        <Icon name="close" size={ 14 } />
                    </button>
                </div>
                { sent ? (
                    <div className="wkd-sug-sent">
                        <span className="wkd-sug-sent-ico"><Icon name="check" size={ 20 } /></span>
                        <div className="wkd-sug-sent-title">{ translation("key_reschedule_request_sent") }</div>
                        <div className="wkd-sug-sent-msg">
                            { translation("key_proposed") }: <span className="mc-code">{ selDate?.format("D MMM") } · { selSlot ? slotLabel(selSlot.slot) : "" }</span>
                            { methodLocation ? ` · ${ methodLocation }` : "" }. { translation("key_employer_must_accept_note") }
                        </div>
                        <button type="button" className="g2-button primary" onClick={ onClose }>{ translation("key_done") }</button>
                    </div>
                ) : (
                    <>
                        <div className="ctx-drawer-body wkd-sug-body">
                            <span className="wkd-jo-acting">{ translation("key_acting_for") } { workerName } · { translation("key_worker_side_request") }</span>
                            <div className="wkd-sug-grid">
                                <span className="wkd-sug-k">{ translation("key_proposed_by_employer") }</span>
                                <span className="wkd-sug-v mc-code">{ proposedDt || "—" }</span>
                                <span className="wkd-sug-k">{ translation("key_method") } · { translation("key_location") }</span>
                                <span className="wkd-sug-v">{ methodLocation || "—" }</span>
                            </div>
                            <div>
                                <div className="wkd-lbl">{ translation("key_date") }</div>
                                <div className="wkd-sug-pills">
                                    { dayPills === null && <span className="wkd-sug-note">{ translation("key_loading") }…</span> }
                                    { dayPills?.length === 0 && <span className="wkd-sug-note">{ translation("key_no_available_dates") }</span> }
                                    { (dayPills || []).map((d) => (
                                        <button
                                            key={ d.format("YYYY-MM-DD") }
                                            type="button"
                                            className={ `wkd-sug-pill${ selDate?.isSame(d, "day") ? " sel" : "" }` }
                                            onClick={ () => handleSelectDate(d) }
                                        >
                                            { d.format("ddd D MMM") }
                                        </button>
                                    )) }
                                </div>
                            </div>
                            <div>
                                <div className="wkd-lbl">{ translation("key_time") }</div>
                                <div className="wkd-sug-pills">
                                    { slotStatus === "loading" && <span className="wkd-sug-note">{ translation("key_loading") }…</span> }
                                    { slotStatus === "done" && (interviewTimeSlots || []).length === 0 && (
                                        <span className="wkd-sug-note">{ translation("key_wkr_no_available_time_slots") }</span>
                                    ) }
                                    { slotStatus === "done" && (interviewTimeSlots || []).map((slot) => {
                                        const busy = Number(slot.available) === 0;
                                        return (
                                            <button
                                                key={ slot.slot }
                                                type="button"
                                                className={ `wkd-sug-pill mono${ selSlot?.slot === slot.slot ? " sel" : "" }` }
                                                disabled={ busy }
                                                onClick={ () => setSelSlot(slot) }
                                            >
                                                { slotLabel(slot.slot) }
                                            </button>
                                        );
                                    }) }
                                </div>
                            </div>
                            <div className="wkd-sug-note">{ translation("key_employer_must_accept_note") }</div>
                        </div>
                        <div className="wkd-sug-foot">
                            <button type="button" className="g2-button" onClick={ onClose }>{ translation("key_cancel") }</button>
                            <button
                                type="button"
                                className="g2-button primary"
                                disabled={ !selDate || !selSlot || sending || status === "loading" }
                                onClick={ handleSend }
                            >
                                { sending ? `${ translation("key_processing") }...` : translation("key_send_request") }
                            </button>
                        </div>
                    </>
                ) }
            </div>
        </>
    );
};

WkdSuggestTimeDrawer.propTypes = {
    onClose: PropTypes.func.isRequired,
    jobRef: PropTypes.string,
    workerName: PropTypes.string,
    proposedDt: PropTypes.string,
    methodLocation: PropTypes.string,
    row: PropTypes.object,
    workerId: PropTypes.any,
    interviewTypeNum: PropTypes.number,
    onSent: PropTypes.func,
};

export default React.memo(WkdSuggestTimeDrawer);
