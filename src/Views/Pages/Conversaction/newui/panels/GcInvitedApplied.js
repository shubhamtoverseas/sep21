import React, { Suspense, useCallback, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import translation from "../../../../../utils/translation";
import GcEntityCodeLink from "../GcEntityCodeLink";
import JoIcon from "../../../JobOfferPage/newui/joIcons";
import { fetchWorkerJobOfferList } from "../../../../../redux/Slices/worker/WorkerSlice";
import { getJobOfferPermissions } from "../../../../../utils/permissions/jobPermissionsUtils";
import { JO_FROM, JO_INTERVIEW_CELL_FORMAT, JO_INTERVIEW_METHOD, jobOfferDetailsPath } from "../../../JobOfferPage/jobOfferConstants";
import { WSTAGE_LABEL_KEY, WSTAGE_CLASS, WORKER_STAGE_ACTIONS } from "../gcConstants";

const WkdSuggestTimeDrawer = React.lazy(() => import("../../../WorkerPage/worker-detail/newui/joboffer/WkdSuggestTimeDrawer"));

const interviewPrimary = (row) => (row?.interview_date && row?.interview_time
    ? dayjs(`${ row.interview_date } ${ row.interview_time }`).format(JO_INTERVIEW_CELL_FORMAT)
    : "");
const interviewMethod = (row) => JO_INTERVIEW_METHOD[Number(row?.worker_interview_type)] || null;
const interviewSub = (row) => {
    const method = interviewMethod(row);
    return [method ? translation(method.key) : "", row?.branch_display_name].filter(Boolean).join(" · ");
};

const hasAccess = (accessInfo, key, isAdmin) =>
    isAdmin || (Array.isArray(accessInfo?.[key]) && accessInfo[key].includes("y"));

const GcInvitedApplied = ({ onPush, onAction, workerPermissionAccessInfo, isAdmin }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [suggestRow, setSuggestRow] = useState(null);
    const { workerProfileInfo, workerJobOfferList, permissionList, ownerOnboardingList } = useSelector((state) => ({
        workerProfileInfo: state.worker.workerProfileInfo,
        workerJobOfferList: state.worker.workerJobOfferList,
        permissionList: state.users.permissionList,
        ownerOnboardingList: state.users.ownerOnboardingList,
    }), shallowEqual);
    /* a Job Offer reference is blue only when Job Offer Details is delivered AND permitted for this actor (CR l.153); it opens
       the record — the row itself opens the in-chat Applicant View */
    const canOpenJob = useCallback((row) => Boolean(row?.employer_id && row?.job_id
        && getJobOfferPermissions(permissionList, ownerOnboardingList, row.employer_id, typeof row?.is_owner === "boolean" ? row.is_owner : undefined).canViewDetails), [permissionList, ownerOnboardingList]);

    const rows = (workerJobOfferList?.data || []).filter((row) => row.job_stage_status !== 17);
    const gates = {
        accept: hasAccess(workerPermissionAccessInfo, "worker_interview_accept", isAdmin),
        decline: hasAccess(workerPermissionAccessInfo, "worker_interview_decline", isAdmin),
        reschedule: hasAccess(workerPermissionAccessInfo, "worker_interview_reschedule", isAdmin),
    };
    const allowedActions = (stage) =>
        (WORKER_STAGE_ACTIONS[stage] || []).filter((action) => gates[action.gate]);

    return (
        <>
            <div className="gc-deep-toolbar">
                <span className="gc-pid-name">{ workerProfileInfo?.fullname }</span>
                <GcEntityCodeLink kind="worker" id={ workerProfileInfo?.id } code={ workerProfileInfo?.reference_id } titleKey="key_worker_details" />
            </div>
            { rows.length === 0 ? (
                <div className="gc-list-empty">{ translation("key_no_invited_applied_jobs") }</div>
            ) : (
                <div className="gc-dt-wrap">
                    <table className="gc-dt gc-dt-ia">
                        <thead>
                            <tr>
                                <th className="gc-c-emp">{ translation("key_employer") }</th>
                                <th className="gc-c-ref">{ translation("key_job_offer_ref") }</th>
                                <th className="gc-c-stage">{ translation("key_stage") }</th>
                                <th className="gc-c-iv">{ translation("key_interview_details") }</th>
                            </tr>
                        </thead>
                        <tbody>
                            { rows.map((row) => (
                                <tr
                                    key={ row.job_id }
                                    tabIndex={ 0 }
                                    role="button"
                                    onClick={ () => onPush({ view: "jo-worker-view", jobId: row.job_id, jobRef: row.reference_id }) }
                                    onKeyDown={ (e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); onPush({ view: "jo-worker-view", jobId: row.job_id, jobRef: row.reference_id }); } } }
                                >
                                    <td><span className="gc-dt-name">{ row.employers_fullname }</span></td>
                                    <td>
                                        { canOpenJob(row) ? (
                                            <button
                                                type="button"
                                                className="gc-ecl gc-ecl-sm"
                                                title={ translation("key_job_offer_details") }
                                                onClick={ (e) => { e.stopPropagation(); navigate(jobOfferDetailsPath(row.job_id, JO_FROM.DASHBOARD)); } }
                                            >
                                                { row.reference_id }
                                            </button>
                                        ) : <span className="gc-ecl-neutral">{ row.reference_id }</span> }
                                    </td>
                                    <td>
                                        <span className={ `gc-stage-pill ${ WSTAGE_CLASS[row.job_stage_status] || "gc-sp-invited" }` }>
                                            { WSTAGE_LABEL_KEY[row.job_stage_status]
                                                ? translation(WSTAGE_LABEL_KEY[row.job_stage_status])
                                                : row.job_stage_status_name }
                                        </span>
                                    </td>
                                    <td>
                                        <div className="gc-iv-cell">
                                            <span className="gc-iv-primary">{ interviewPrimary(row) }</span>
                                            { (allowedActions(row.job_stage_status).length > 0 || (row.job_stage_status === 4 && gates.reschedule)) && (
                                                <div className={ `gc-iv-actions${ row.job_stage_status === 4 && gates.reschedule ? " gc-iv-stack" : "" }` }>
                                                    <div className="gc-iv-row">
                                                        { allowedActions(row.job_stage_status).map((action) => (
                                                            <button
                                                                key={ action.id }
                                                                type="button"
                                                                className={ `gc-iv-btn ${ action.pri ? "pri" : "" } ${ action.danger ? "danger" : "" }` }
                                                                onClick={ (e) => { e.stopPropagation(); onAction(action.id, row, { jobRef: row.reference_id }); } }
                                                            >
                                                                { translation(action.labelKey) }
                                                            </button>
                                                        )) }
                                                    </div>
                                                    { row.job_stage_status === 4 && gates.reschedule && (
                                                        <div className="gc-iv-row">
                                                            <button
                                                                type="button"
                                                                className="gc-iv-btn"
                                                                onClick={ (e) => { e.stopPropagation(); setSuggestRow(row); } }
                                                            >
                                                                { translation("key_suggest_another_time") }
                                                            </button>
                                                        </div>
                                                    ) }
                                                </div>
                                            ) }
                                            { interviewPrimary(row) && interviewSub(row) && (
                                                <span className="gc-iv-sub gc-iv-when">
                                                    { interviewMethod(row) && <span className="gc-iv-ic" aria-hidden="true"><JoIcon name={ interviewMethod(row).icon } size={ 14 } /></span> }
                                                    { interviewSub(row) }
                                                </span>
                                            ) }
                                        </div>
                                    </td>
                                </tr>
                            )) }
                        </tbody>
                    </table>
                </div>
            ) }
            { suggestRow && (
                <div className="wkd">
                    <Suspense fallback={ null }>
                        <WkdSuggestTimeDrawer
                            onClose={ () => setSuggestRow(null) }
                            jobRef={ suggestRow.reference_id }
                            workerName={ workerProfileInfo?.fullname }
                            proposedDt={ (suggestRow.interview_date && suggestRow.interview_time)
                                ? dayjs(`${ suggestRow.interview_date } ${ suggestRow.interview_time }`).format("DD MMM · hh:mm A") : "" }
                            methodLocation={ interviewSub(suggestRow) }
                            row={ suggestRow }
                            workerId={ workerProfileInfo?.id }
                            interviewTypeNum={ suggestRow.worker_interview_type }
                            onSent={ () => dispatch(fetchWorkerJobOfferList({ worker_id: workerProfileInfo?.id })) }
                        />
                    </Suspense>
                </div>
            ) }
        </>
    );
};

GcInvitedApplied.propTypes = {
    onPush: PropTypes.func.isRequired,
    onAction: PropTypes.func.isRequired,
    workerPermissionAccessInfo: PropTypes.object,
    isAdmin: PropTypes.bool,
};

export default React.memo(GcInvitedApplied);
