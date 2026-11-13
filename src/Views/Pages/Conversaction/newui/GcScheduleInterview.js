import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import dayjs from "dayjs";
/* self-contained styles so non-chat pages (Employer applicants) can host this modal */
import "./global-chat.css";
import GcModal from "./GcModal";
import GcIcon from "./gcIcons";
import translation from "../../../../utils/translation";
import { dayMapping, getLocalTimeZone, showSuccessOrError } from "../../../../services/commonService";
import {
    fetchInterviewDateSlots, fetchInterviewTimeSlots, fetchUpcomingInterviews,
    reScheduleInterview, scheduleInterview,
} from "../../../../redux/Slices/common/interview/InterviewSlice";
import { fetchJobDetail, fetchJobWorkerList } from "../../../../redux/Slices/job-offer/JobOfferSlice";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { SCAN_DAYS, MAX_PILLS, GC_INTERVIEW_OWNERS_COPY, GC_INTERVIEW_OWNERS_UNRESOLVED_CODE } from "./gcConstants";
import { getInitials, headingCase } from "../../../../utils/utils";

const EM = '—';
const personName = (person) => (person?.name || [person?.first_name, person?.last_name].filter(Boolean).join(' ') || '');

const GcScheduleInterview = ({ handleOnClose, jobId, selectedjobWorkerObj = {}, interviewType, scheduleInterviewFrom, onScheduled, employerId }) => {
    const dispatch = useDispatch();
    const { interviewTimeSlots, status } = useSelector((state) => ({
        interviewTimeSlots: state.interview.interviewTimeSlots,
        status: state.interview.status,
    }), shallowEqual);
    const currentEmployer = useSelector((state) => state.employer.currentEmployer);
    const jobDetailView = useSelector((state) => state.jobOffer.jobDetailView);
    const jobDetail = String(jobDetailView?.id) === String(jobId) ? jobDetailView : null;
    /* U002: the three owners the interview will be saved with — CS Owner and CS Assistant from the Job Offer (backend D-05 / D-24
       carries `cs_assistant`), Interpreter Owner from the applicant's interpreter assignment; read-only, no substitute */
    const owners = useMemo(() => ({
        csOwner: jobDetail?.cs_owner_name || jobDetail?.cs_name || selectedjobWorkerObj?.cs_name || '',
        csAssistant: personName(jobDetail?.cs_assistant),
        interpreter: personName(selectedjobWorkerObj?.interview?.interpreter_owner) || personName(selectedjobWorkerObj?.existing_interpreter) || selectedjobWorkerObj?.interpreter_name || '',
    }), [jobDetail, selectedjobWorkerObj]);
    /* a 422 INTERVIEW_OWNERS_UNRESOLVED from the server (an inactive owner is only known there) is shown in the owners alert, dialog kept open */
    const [serverOwnerError, setServerOwnerError] = useState(null);
    useEffect(() => { setServerOwnerError(null); }, [owners]);
    /* hosts that open the dialog without the Job Offer loaded (Worker › Job Offer tab) fetch it for the ownership row */
    useEffect(() => { if (jobId && !jobDetail) dispatch(fetchJobDetail(jobId)); }, [dispatch, jobId, jobDetail]);

    const [holidayData, setHolidayData] = useState(null);
    const [selDate, setSelDate] = useState(null);
    const [selSlot, setSelSlot] = useState(null);
    const [selLoc, setSelLoc] = useState(null);
    const [slotStatus, setSlotStatus] = useState("idle");
    const [upcomingList, setUpcomingList] = useState([]);
    const [warnUnsaved, setWarnUnsaved] = useState(false);

    const title = interviewType === "re-schedule"
        ? translation("key_reschedule_interview")
        : interviewType === "interview-again"
            ? translation("key_schedule_follow_up_interview")
            : translation("key_schedule_interview");

    const availDayNames = useMemo(() => (
        String(selectedjobWorkerObj?.interview_day || "")
            .split(",")
            .map((d) => dayMapping[d.trim()])
            .filter(Boolean)
    ), [selectedjobWorkerObj?.interview_day]);
    const availJsDays = useMemo(() => new Set(
        String(selectedjobWorkerObj?.interview_day || "")
            .split(",")
            .map((d) => parseInt(d.trim(), 10) - 1)
            .filter((n) => n >= 0 && n <= 6)
    ), [selectedjobWorkerObj?.interview_day]);

    useEffect(() => {
        const months = new Set();
        for (let i = 0; i <= SCAN_DAYS; i += 1) months.add(dayjs().add(i, "day").month() + 1);
        Promise.all([...months].map((month) => dispatch(fetchInterviewDateSlots({
            worker_id: selectedjobWorkerObj?.id,
            employer_id: selectedjobWorkerObj?.employer_id,
            job_id: jobId,
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
    }, [dispatch, selectedjobWorkerObj?.id, selectedjobWorkerObj?.employer_id, jobId]);

    useEffect(() => {
        dispatch(fetchUpcomingInterviews({ job_id: jobId })).then((res) => {
            const data = res?.payload?.data;
            setUpcomingList(Array.isArray(data) ? data : []);
        });
    }, [dispatch, jobId]);

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
        for (let i = 0; i <= SCAN_DAYS && pills.length < MAX_PILLS; i += 1) {
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
            employer_id: selectedjobWorkerObj?.employer_id,
            interview_date: date.format("YYYY-MM-DD"),
            time_zone: getLocalTimeZone(),
            type: "employer",
        })).then(() => setSlotStatus("done"));
    }, [dispatch, selectedjobWorkerObj?.employer_id]);

    const isPastSlot = useCallback((slotTime) => {
        if (!selDate || !selDate.isSame(dayjs(), "day")) return false;
        const [hours, minutes] = String(slotTime).split(":").map(Number);
        const now = new Date();
        return hours < now.getHours() || (hours === now.getHours() && minutes < now.getMinutes());
    }, [selDate]);

    const conflict = useMemo(() => {
        if (!selDate) return null;
        const hit = upcomingList.find((item) => dayjs(item.date).isSame(selDate, "day"));
        if (!hit) return null;
        const times = (hit.interviews || [])
            .map((iv) => iv.interview_time || iv.time)
            .filter(Boolean);
        return { count: hit.booking_count || (hit.interviews || []).length, times };
    }, [selDate, upcomingList]);

    const dirty = Boolean(selDate || selSlot || selLoc);
    const requestClose = useCallback(() => {
        if (dirty) { setWarnUnsaved(true); return; }
        handleOnClose();
    }, [dirty, handleOnClose]);

    const handleConfirm = useCallback(() => {
        if (!selDate || !selSlot || !selLoc) return;
        const interviewDate = selDate.format("YYYY-MM-DD");
        if ((scheduleInterviewFrom === "from-pending" || scheduleInterviewFrom === "from-upcoming") && interviewType === "re-schedule") {
            dispatch(reScheduleInterview({
                interview_id: selectedjobWorkerObj?.interview_id ?? selectedjobWorkerObj?.interview?.id,
                new_interview_date: interviewDate,
                new_interview_time: selSlot?.slot,
                interview_type: selLoc,
            })).then((res) => {
                showSuccessOrError(res);
                if (!res?.error) {
                    dispatch(fetchJobWorkerList({ job_id: jobId, job_stage: selectedjobWorkerObj?.job_stage_status_id }));
                    dispatch(fetchJobDetail(jobId));
                    onScheduled?.();
                    handleOnClose();
                }
            });
            return;
        }
        const payload = {
            job_id: jobId,
            worker_id: selectedjobWorkerObj?.id,
            employer_id: employerId ?? currentEmployer?.employer_id,
            interview_date: interviewDate,
            interview_time: selSlot?.slot,
            interview_type: selLoc,
        };
        if (scheduleInterviewFrom === "from-cancelled" || scheduleInterviewFrom === "from-completed" || interviewType === "interview-again") {
            payload.interview_id = selectedjobWorkerObj?.interview?.id;
        }
        setServerOwnerError(null);
        dispatch(scheduleInterview(payload)).then((res) => {
            const refused = res?.error ? res.payload?.data?.data : null;
            if (refused?.code === GC_INTERVIEW_OWNERS_UNRESOLVED_CODE) { setServerOwnerError(refused.message || translation("key_server_error")); return; }
            showSuccessOrError(res);
            if (!res?.error) {
                onScheduled?.();
                handleOnClose();
            }
        });
    }, [dispatch, selDate, selSlot, selLoc, scheduleInterviewFrom, interviewType, selectedjobWorkerObj, jobId, currentEmployer?.employer_id, employerId, handleOnClose, onScheduled]);

    /* every interview saves three owners (28 Sep U002 / 1 Oct #19; rule JO 12 Oct item 6 = backend 194, restated by the 27 Oct work order,
       which supersedes the 26 Oct §3 wording): only a MISSING CS Owner or CS Owner = CS Assistant blocks creation here. An empty CS Assistant
       or Interpreter is allowed — the interview is created with that owner empty (the CS Assistant is support metadata, not a second owner).
       Inactive staff is only known server-side (422, shown below). */
    const ownerCollision = jobDetail?.cs_owner_user_id != null && String(jobDetail.cs_owner_user_id) === String(jobDetail?.cs_assistant?.user_id ?? jobDetail?.cs_assistant?.id);
    const unresolvedOwner = !owners.csOwner ? translation("key_cs_owner") : ownerCollision ? `${ translation("key_cs_owner") } / ${ GC_INTERVIEW_OWNERS_COPY.csAssistant }` : null;
    const ownerAlert = serverOwnerError || (!owners.csOwner ? translation("key_gc_interview_owner_unresolved").replace("{role}", unresolvedOwner) : ownerCollision ? GC_INTERVIEW_OWNERS_COPY.collision : null);
    const canConfirm = Boolean(selDate && selSlot && selLoc) && !unresolvedOwner && status !== "loading";

    return (
        <GcModal
            title={ title }
            size="lg"
            onClose={ requestClose }
            belowBody={ warnUnsaved && (
                <div className="gc-unsaved-bar">
                    <GcIcon name="warn" />
                    { translation("key_discard_unsaved_schedule") }
                    <span className="gc-spacer" />
                    <button type="button" className="gc-btn gc-btn-secondary inline sm" onClick={ () => setWarnUnsaved(false) }>
                        { translation("key_keep_editing") }
                    </button>
                    <button type="button" className="gc-btn gc-btn-primary inline sm danger-solid" onClick={ handleOnClose }>
                        { translation("key_discard") }
                    </button>
                </div>
            ) }
            footer={ (
                <>
                    <span className="gc-spacer" />
                    <button type="button" className="gc-btn gc-btn-secondary inline" onClick={ requestClose }>
                        { translation("key_cancel") }
                    </button>
                    <button type="button" className="gc-btn gc-btn-primary inline" disabled={ !canConfirm } onClick={ handleConfirm }>
                        <GcIcon name="check" />{ translation("key_confirm_interview") }
                    </button>
                </>
            ) }
        >
            { availDayNames.length > 0 && (
                <div className="gc-avail-banner">
                    { translation("key_worker_available_days") }: { availDayNames.join(", ") }
                </div>
            ) }
            <div className="gc-ff full">
                <label>{ translation("key_select_date") }</label>
                { dayPills === null ? (
                    <CustomSpinner />
                ) : dayPills.length === 0 ? (
                    <div className="gc-left-note">{ translation("key_no_available_dates") }</div>
                ) : (
                    <div className="gc-day-grid">
                        { dayPills.map((date) => (
                            <button
                                key={ date.format("YYYY-MM-DD") }
                                type="button"
                                className={ `gc-slot wide ${ selDate?.isSame(date, "day") ? "sel" : "" }` }
                                onClick={ () => handleSelectDate(date) }
                            >
                                { date.format("ddd D MMM") }
                            </button>
                        )) }
                    </div>
                ) }
            </div>
            { selDate && (
                <div className="gc-ff full">
                    <label>{ translation("key_select_time") }</label>
                    { slotStatus === "loading" ? (
                        <CustomSpinner />
                    ) : (
                        <div className="gc-slot-grid">
                            { (interviewTimeSlots || []).map((slot) => {
                                const busy = slot.available === 0 || isPastSlot(slot.slot);
                                return (
                                    <button
                                        key={ slot.slot }
                                        type="button"
                                        className={ `gc-slot ${ busy ? "busy" : "" } ${ selSlot?.slot === slot.slot ? "sel" : "" }` }
                                        disabled={ busy }
                                        onClick={ () => setSelSlot(slot) }
                                    >
                                        { slot.label }
                                    </button>
                                );
                            }) }
                        </div>
                    ) }
                </div>
            ) }
            { conflict && (
                <div className="gc-conflict-note">
                    <GcIcon name="warn" />
                    <span>
                        <b>{ conflict.count } { translation("key_interviews_already_scheduled_note") }</b>
                        { conflict.times.length > 0 && <> ({ conflict.times.join(", ") })</> }
                    </span>
                </div>
            ) }
            <div className="gc-ff full">
                <label>{ headingCase(translation("key_interview_location")) }</label>
                <div className="gc-loc-cards">
                    <button
                        type="button"
                        className={ `gc-loc-card ${ selLoc === 1 ? "sel" : "" }` }
                        onClick={ () => setSelLoc(1) }
                    >
                        <GcIcon name="video" />
                        <b>{ translation("key_video_interview") }</b>
                        <span>{ translation("key_interview_candidate_remotely_by_video") }</span>
                    </button>
                    <button
                        type="button"
                        className={ `gc-loc-card ${ selLoc === 2 ? "sel" : "" }` }
                        onClick={ () => setSelLoc(2) }
                    >
                        <GcIcon name="building" />
                        <b>{ translation("key_office_interview") }</b>
                        <span>{ translation("key_interview_at_one_of_our_office_locations") }</span>
                    </button>
                </div>
            </div>
            <div className="gc-ff full" data-gc-interview-owners="1">
                <label>{ GC_INTERVIEW_OWNERS_COPY.title }</label>
                { /* the standalone Job Offer header's owner chips (avatar initials · role · name) — Chat borrows from the JO page, never the
                     other way round (CURRENT_REQUIREMENTS "owner presentation"; work order 26 Oct) */ }
                <div className="gc-owner-row">
                    { [
                        [translation("key_cs_owner"), owners.csOwner],
                        [GC_INTERVIEW_OWNERS_COPY.csAssistant, owners.csAssistant],
                        [GC_INTERVIEW_OWNERS_COPY.interpreterOwner, owners.interpreter],
                    ].map(([role, name]) => (
                        <span key={ role } className="wd-owner" aria-label={ `${ role } ${ name || EM }` }>
                            { name && <span className="av">{ getInitials(name) }</span> }
                            <span className="role">{ role } ·</span>
                            { name ? <b>{ name }</b> : <b className="mc-unavailable">{ EM }</b> }
                        </span>
                    )) }
                </div>
                <div className="gc-ff-note">{ GC_INTERVIEW_OWNERS_COPY.note }</div>
                { ownerAlert && (
                    <div className="gc-ff-note gc-ff-block" role="alert" data-gc-owner-unresolved={ unresolvedOwner || GC_INTERVIEW_OWNERS_UNRESOLVED_CODE }>
                        { ownerAlert }
                    </div>
                ) }
            </div>
        </GcModal>
    );
};

GcScheduleInterview.propTypes = {
    handleOnClose: PropTypes.func.isRequired,
    employerId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    jobId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    selectedjobWorkerObj: PropTypes.object,
    interviewType: PropTypes.string,
    scheduleInterviewFrom: PropTypes.string,
    onScheduled: PropTypes.func,
};

export default GcScheduleInterview;
