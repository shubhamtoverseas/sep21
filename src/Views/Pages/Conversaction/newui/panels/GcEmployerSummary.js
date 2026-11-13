import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { useSelector, shallowEqual } from "react-redux";
import GcIcon from "../gcIcons";
import translation from "../../../../../utils/translation";
import { getPermissionValue, isAdminUser } from "../../../../../services/commonService";
import { getJobOfferPermissions } from "../../../../../utils/permissions/jobPermissionsUtils";
import GcEntityCodeLink from "../GcEntityCodeLink";
import JoStatusTag from "../../../JobOfferPage/newui/JoStatusTag";
import { gcDetailsPath } from "../gcHelpers";
import { useNavigate } from "react-router-dom";
/* one definition each (CLAUDE.md §4.1): the Employer module owns the active status and the open-JO limit (Employer audit P-26) */
import { ACTIVE_EMPLOYER_STATUS, OPEN_JO_LIMIT } from "../../../Employer/newui/employerNewUiConstants";
import { JO_OPEN_STATUS_IDS } from "../../../JobOfferPage/jobOfferConstants";

const GcEmployerSummary = ({ onPush }) => {
    const navigate = useNavigate();
    const { currentEmployer, empJobOffers, permissionList, ownerOnboardingList } = useSelector((state) => ({
        currentEmployer: state.employer.currentEmployer,
        empJobOffers: state.employer.empJobOffers,
        permissionList: state.users.permissionList,
        ownerOnboardingList: state.users.ownerOnboardingList,
    }), shallowEqual);

    const employerId = currentEmployer?.employer_id || currentEmployer?.id || null;

    /* Same permission model as JobOfferCardTab: JO section visibility via the
     * jo_cs details-view permission; creation via employer_jo_add; the create
     * limit via no_inreview_open_expiring_jobs (max 2). */
    const isAdmin = useMemo(() => isAdminUser(), []);
    const canViewJobOffers = useMemo(
        () => getJobOfferPermissions(permissionList, ownerOnboardingList, employerId).canViewDetails,
        [permissionList, ownerOnboardingList, employerId]
    );
    const canAddJobOffer = useMemo(
        /* U-0257: Employer grid grant (PERM §9.3) AND Job Offer module access */
        () => isAdmin || (getPermissionValue(permissionList?.data, "employer", "employer_jo_add") === "y" && getPermissionValue(permissionList?.data, "jo", "jo_access") === "y"),
        [isAdmin, permissionList?.data]
    );
    const isJoLimitReached = (currentEmployer?.no_inreview_open_expiring_jobs ?? 0) >= OPEN_JO_LIMIT;

    const recent = useMemo(() => {
        const list = [...(empJobOffers || [])];
        if (list.length && list.every((jo) => jo.created_at)) {
            list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
        }
        return list.slice(0, 2);
    }, [empJobOffers]);

    /* Guard against the shared slice still holding another employer's list
     * (or the initial load) before deciding the New Job Offer empty state. */
    const listIsCurrent = Array.isArray(empJobOffers)
        && (empJobOffers.length === 0
            || empJobOffers.every((jo) => String(jo.employer_id) === String(employerId)));
    const isJoOpenStatus = (status) => JO_OPEN_STATUS_IDS.includes(Number(status));
    const hasOpen = (empJobOffers || []).some((jo) => isJoOpenStatus(jo.status));
    const showCreateSlot = canAddJobOffer && listIsCurrent && !hasOpen
        && currentEmployer?.status === ACTIVE_EMPLOYER_STATUS && !!employerId;
    const olderOpenExists = useMemo(() => {
        const list = [...(empJobOffers || [])];
        if (list.length && list.every((jo) => jo.created_at)) {
            list.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
        }
        return list.slice(2).some((jo) => isJoOpenStatus(jo.status));
    }, [empJobOffers]);

    return (
        <div className="gc-panel-pad">
            <div className="gc-pid">
                <span className="gc-pid-name">
                    { currentEmployer?.name } { currentEmployer?.surname || "" }
                    { currentEmployer?.chinese_name && <span className="gc-zh-inline"> · { currentEmployer.chinese_name }</span> }
                </span>
                <GcEntityCodeLink kind="employer" id={ employerId } code={ currentEmployer?.reference_id } titleKey="key_employer_details" />
                <span className="gc-pid-ter">
                    { currentEmployer?.district_info?.name || currentEmployer?.location_info?.name || "" }
                </span>
            </div>
            { canViewJobOffers && recent.length === 0 && listIsCurrent && (
                <div className="gc-no-jo">{ translation("key_no_job_offer_found") }</div>
            ) }
            { canViewJobOffers && recent.map((jo, index) => (
    
                <div
                    className={ `gc-rec-card ${ isJoOpenStatus(jo.status) ? "clickable" : "" }` }
                    key={ jo.id }
                    onClick={ isJoOpenStatus(jo.status)
                        ? (e) => { if (!e.target.closest("button")) onPush({ view: "jod", job: jo }); }
                        : undefined }
                >
                    <div className="gc-rec-card-head">{ translation("key_job_offer") } { index + 1 }</div>
                    <div className="gc-rec-rows">
                        <div className="gc-rec-row">
                            <span className="gc-k">{ translation("key_ref_short") }</span>
                            <span className="gc-v"><span className="gc-ecl-neutral">{ jo.reference_id }</span></span>
                        </div>
                        <div className="gc-rec-row">
                            <span className="gc-k">{ translation("key_status") }</span>
                            <span className="gc-v"><JoStatusTag status={ jo.status } /></span>
                        </div>
                        <div className="gc-rec-row">
                            <span className="gc-k">{ translation("key_cs_owner") }</span>
                            <span className="gc-v">{ jo.cs_name || "—" }</span>
                        </div>
                    </div>
                </div>
            )) }
            { canViewJobOffers && olderOpenExists && (
                <div className="gc-older-open-note">{ translation("key_older_open_jo_note") }</div>
            ) }
            { showCreateSlot && (
                <div className="gc-btn-stack">
                    { isJoLimitReached ? (
                        <>
                            <button type="button" className="gc-btn gc-btn-secondary full disabled" disabled>
                                <GcIcon name="plus" />{ translation("key_new_job_offer") }
                            </button>
                            <div className="gc-btn-reason">{ translation("key_job_offer_limit_reached") }</div>
                        </>
                    ) : (
                        <button
                            type="button"
                            className="gc-btn gc-btn-primary full"
                            onClick={ () => { const path = gcDetailsPath("employer", employerId, { createJobOffer: 1 }); if (path) navigate(path); } }
                        >
                            <GcIcon name="plus" />{ translation("key_new_job_offer") }
                        </button>
                    ) }
                </div>
            ) }
        </div>
    );
};

GcEmployerSummary.propTypes = {
    onPush: PropTypes.func.isRequired,
};

export default React.memo(GcEmployerSummary);
