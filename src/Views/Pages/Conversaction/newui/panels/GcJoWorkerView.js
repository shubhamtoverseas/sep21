import React, { useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import GcIcon from "../gcIcons";
import translation from "../../../../../utils/translation";
import { fetchJobDetail } from "../../../../../redux/Slices/job-offer/JobOfferSlice";
import { getJobOfferPermissions } from "../../../../../utils/permissions/jobPermissionsUtils";
import Icon from "../../../../../components/Icon/Icon";
import { getInitials } from "../../../../../utils/utils";
import { JO_APPLICANT_COPY, JO_APPLICANT_VIEW_COPY, JO_EDIT_FROM, JO_RECORD_COPY, jobOfferDayOffNames, jobOfferEditPath } from "../../../JobOfferPage/jobOfferConstants";
import { useNavigate } from "react-router-dom";

const namesOf = (list) => (Array.isArray(list) ? list.map((item) => item?.name).filter(Boolean) : []);
const money = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? `$${ n.toLocaleString("en-US", { maximumFractionDigits: 0 }) }` : "";
};


const GcJoWorkerView = ({ frame, onShareToChat, canShareLink, onShareTemplate, onOpenTeamChat, conversationType }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { jobDetailView, permissionList, ownerOnboardingList } = useSelector((state) => ({
        jobDetailView: state.jobOffer.jobDetailView,
        permissionList: state.users.permissionList,
        ownerOnboardingList: state.users.ownerOnboardingList,
    }), shallowEqual);

    useEffect(() => {
        if (frame.jobId) dispatch(fetchJobDetail(frame.jobId));
    }, [dispatch, frame.jobId]);

    /* guard against the shared slice still holding another job */
    const job = String(jobDetailView?.id) === String(frame.jobId) ? jobDetailView : null;

    /* the Job Offer's own grants (owner = the CS stamped on the record, U-0152); Edit targets the editor route, not Employer
       Details; Share / Add link read the Job Offer Share grant in an employer conversation and the Worker Send Link grant in
       a worker conversation (PERM §4.12) */
    const perms = useMemo(
        () => getJobOfferPermissions(permissionList, ownerOnboardingList, job?.employer_id, typeof job?.is_owner === "boolean" ? job.is_owner : undefined),
        [permissionList, ownerOnboardingList, job?.employer_id, job?.is_owner]
    );
    const canEditJobOffer = perms.canEditJobOffer;
    const canShare = conversationType === "employer" ? perms.canShare : Boolean(canShareLink);

    const emp = job?.employer_details;
    const family = job?.employer_name || job?.employers_fullname || "";
    const location = [
        emp?.district_info?.name || emp?.location_info?.name,
        emp?.house_size ? `${ emp.house_size } ${ translation("key_sq_ft_dot") }` : "",
    ].filter(Boolean).join(", ");

    const salary = money(job?.fixed_salary)
        || [money(job?.min_salary), money(job?.max_salary)].filter(Boolean).join(" – ")
        || job?.expected_salary_info?.name || "";
    const salary2 = job?.higher_salary ? translation("key_higher_salary_note") : "";
    const canStart = job?.asap === 1
        ? JO_RECORD_COPY.asap
        : (job?.start_date ? dayjs(job.start_date).format(JO_APPLICANT_VIEW_COPY.startDateFormat) : "");
    const language = namesOf(job?.spoken_language_info).join(", ");
    const coworker = job
        ? `${ job.coworker_status ? translation("key_yes") : translation("key_no") }${ job.co_worker_count ? ` · ${ job.co_worker_count } ${ translation("key_other") }` : "" }`
        : "";

    const duties = namesOf(job?.skills_info);
    const otherResp = namesOf(job?.responsibilities_info);
    /* the generated package (D-09) is the saved copy; the rollout fields are the fallback */
    const headline = job?.copy?.headline_en || job?.head_line || "";
    const description = job?.copy?.description_en || job?.job_description_english || job?.detailed_description || "";

    const kvRow = (k, v) => (
        <div className="gc-lv-row" key={ k }>
            <span className="gc-lk">{ k }</span>
            <span className="gc-lv gc-preline">{ v || "—" }</span>
        </div>
    );

    return (
        <>
            { /* toolbar: Share → Add link → Edit (labelled, the standalone 28px treatment) left, CS Owner right (CR l.151) */ }
            <div className="gc-deep-toolbar gc-deep-toolbar-line">
                { canShare && onShareTemplate && (
                    <button type="button" className="gc-pa-btn gc-pa-labelled" title={ JO_APPLICANT_COPY.shareTitle } onClick={ () => onShareTemplate(job, { job: true }) }>
                        <GcIcon name="share" /><span>{ translation("key_share") }</span>
                    </button>
                ) }
                { canShare && (
                    <button type="button" className="gc-pa-btn gc-pa-labelled" title={ JO_APPLICANT_COPY.addLinkTitle } onClick={ () => onShareToChat(job, { job: true }) }>
                        <GcIcon name="link" /><span>{ JO_APPLICANT_COPY.addLink }</span>
                    </button>
                ) }
                { canEditJobOffer && job?.employer_id && (
                    <button type="button" className="gc-pa-btn gc-pa-labelled" title={ `${ JO_APPLICANT_VIEW_COPY.editTitle } ${ job.reference_id || "" }` } onClick={ () => navigate(jobOfferEditPath(job.id, JO_EDIT_FROM.CHAT)) }>
                        <Icon name="edit" size={ 14 } /><span>{ translation("key_edit") }</span>
                    </button>
                ) }
                <span className="gc-jod-spacer" />
                { job?.cs_name && (
                    job.cs_owner_user_id && onOpenTeamChat ? (
                        <button
                            type="button"
                            className="gc-owner-named gc-wv-owner tip"
                            data-tip={ translation("key_open_team_chat") }
                            aria-label={ translation("key_open_team_chat") }
                            onClick={ () => onOpenTeamChat({ user_id: job.cs_owner_user_id, name: job.cs_name }, null, { jobId: job.id }) }
                        >
                            <span className="av">{ getInitials(job.cs_name) }</span>
                            <span className="role">{ translation("key_cs_owner") } ·</span><b>{ job.cs_name }</b>
                        </button>
                    ) : (
                        <span className="gc-owner-named gc-wv-owner">
                            <span className="av">{ getInitials(job.cs_name) }</span>
                            <span className="role">{ translation("key_cs_owner") } ·</span><b>{ job.cs_name }</b>
                        </span>
                    )
                ) }
            </div>
            <div className="gc-jo-title-block">
                <span className="gc-ref mc-code-text" data-mc-plain-job-offer-ref="true">{ frame.jobRef || job?.reference_id }</span>
                { headline && <div className="gc-h">{ headline }</div> }
                { family && <div className="gc-fam">{ family }</div> }
                { location && <div className="gc-loc">{ location }</div> }
            </div>
            <div className="gc-sect">
                <div className="gc-sect-title">{ translation("key_job_description") }</div>
                <p className="gc-para gc-preline">{ description || "—" }</p>
            </div>
            <div className="gc-sect">
                <div className="gc-sect-title">{ translation("key_main_duties") }</div>
                <div className="gc-tag-row">
                    { duties.length ? duties.map((duty) => <span className="gc-chip-plain" key={ duty }>{ duty }</span>) : "—" }
                </div>
            </div>
            <div className="gc-sect gc-app-values">
                { kvRow(translation("key_salary"), salary2 ? `${ salary }\n${ salary2 }` : salary) }
                { kvRow(JO_APPLICANT_VIEW_COPY.startDate, canStart) }
                { kvRow(translation("key_language"), language) }
            </div>
            <div className="gc-sect">
                <div className="gc-sect-title">{ translation("key_other_responsibilities") }</div>
                <div className="gc-tag-row">
                    { otherResp.length ? otherResp.map((item) => <span className="gc-chip-plain" key={ item }>{ item }</span>) : "—" }
                </div>
            </div>
            <div className="gc-sect gc-app-values">
                { kvRow(translation("key_accommodation"), job?.helper_accommadation_info?.name) }
                { kvRow(translation("key_coworker"), coworker) }
                { kvRow(translation("key_day_off"), jobOfferDayOffNames(job).join(", ")) }
            </div>
        </>
    );
};

GcJoWorkerView.propTypes = {
    frame: PropTypes.object.isRequired,
    onShareToChat: PropTypes.func.isRequired,
    canShareLink: PropTypes.bool,
    onShareTemplate: PropTypes.func,
    onOpenTeamChat: PropTypes.func,
    conversationType: PropTypes.string,
};

export default React.memo(GcJoWorkerView);
