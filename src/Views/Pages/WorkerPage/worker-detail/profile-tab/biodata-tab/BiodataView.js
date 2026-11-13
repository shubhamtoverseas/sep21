import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import BiodataForm from "./BiodataForm";
import { BioCard, BioSection, BioField, BioChips, BioStatusPop } from "./BioCard";
import WkdStatusChip from "../../newui/WkdStatusChip";
import constData, { exceptionsStatusList, interviewDayList } from "../../../../../../components/ReusableComponents/constants";
import { changeDynamicDateFormate } from "../../../../../../utils/utils";
import { timeSince } from "../../../../../../services/commonService";
import { isPartnerUser } from "../../../../../../services/permissionService";
import { fetchContractStatus, fetchMainSkills } from "../../../../../../redux/Slices/common/CommonSlice";
import ActionLoader from "../../../../../../components/ReusableComponents/ActionLoader";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { saveWorkerValidateStatus } from "../../../../../../redux/Slices/worker/WorkerSlice";
const WkdSendTemplateModal = React.lazy(() => import('../../newui/WkdSendTemplateModal'));
import translation from "../../../../../../utils/translation";
import { getStatusTransitionError, sectionStatusOptions } from "../../statusTransition";
import CustomSpinner from "../../../../../../components/ReusableComponents/CustomSpinner";
import { courseDisplayName, experienceReasonForLeaving, isHongKongLocation, skillDisplayName } from "../../../../../../utils/workerDisplay";
import { DOC_STATUS_META } from "../../../workerModuleConstants";
import { SEND_SITE } from "../../../../SettingsPage/newui/templates/templateConfiguration";
import "../../newui/wkd-biodata.css";

const selectWorkerState = (state) => state.worker;
const selectContractStatusList = (state) => state.common.contractStatus;
const cachedExceptionsList = exceptionsStatusList();
const cachedInterviewDayList = interviewDayList();
const names = (list) => (Array.isArray(list) ? list.map((x) => x?.name).filter(Boolean) : []);
const joined = (list) => names(list).join(', ');
const fmt = (d, f = 'DD/MM/YYYY') => (d ? changeDynamicDateFormate(d, f) : '');
/* Yes / No / Consider answers: an empty store is unanswered, not "No" */
const exc = (id) => (id === '' || id === null || id === undefined ? '' : cachedExceptionsList.find((o) => o.id === Number(id))?.name);
/* U-0208: Day Off is multi — every stored day (day_off_list_info / day_off_ids), else the legacy single value */
const dayOffNames = (w) => {
    if (Array.isArray(w.day_off_list_info) && w.day_off_list_info.length) return joined(w.day_off_list_info);
    if (Array.isArray(w.day_off_info) && w.day_off_info.length) return joined(w.day_off_info);
    return w.day_off?.name || '';
};

/*
 * Biodata read view (prototype bioReadHTML): six independent cards —
 * Biodata · Profile · Main Skills · Current Contract · Work Experience N ·
 * Expectations — each with its own Edit that opens the shared form scrolled
 * to that section. Change Status lives on the Biodata card only; Action
 * Required goes through the shared Send Template (W-02).
 */
const BiodataView = React.memo(function BiodataView({ onRefreshStatus, isWorkerPermissionAccessInfo, isAdmin, workerProfileInfo }) {
    const dispatch = useDispatch();
    const [editFocus, setEditFocus] = useState(null);          /* null = read mode; string = section to scroll to */
    const [commonTemplateData, setCommonTemplateData] = useState({ slug: "", title: "", userType: "", statusKey: "", actionStatusType: "" });
    const [isSendTemplatePopup, setIsSendTemplatePopup] = useState(false);
    const [statusPopOpen, setStatusPopOpen] = useState(false);
    const { status, allStatusList } = useSelector(selectWorkerState);
    const contractStatusList = useSelector(selectContractStatusList);
    /* the skills master carries each care skill's age band (backend 253); loaded once for the read card too */
    const mainSkills = useSelector((state) => state.common.mainSkills);
    useEffect(() => { if (!mainSkills?.length) dispatch(fetchMainSkills({ type: "worker" })); }, [dispatch, mainSkills?.length]);
    const w = workerProfileInfo || {};

    const perms = isWorkerPermissionAccessInfo?.worker_worker_biodata;
    const isPartner = isPartnerUser();
    const canEdit = (Array.isArray(perms) && perms.includes('edit')) || isAdmin;
    const canChangeStatus = !isPartner && ((Array.isArray(perms) && perms.includes('change_status')) || isAdmin);
    /* PERM §5.9.3: Action Required opens Send Template — offered only with the section's send_template sub-verb */
    const canSendTemplate = !isPartner && ((Array.isArray(perms) && perms.includes('send_template')) || isAdmin);
    const isLocal = Number(w.type) === 1;
    const isOverseas = Number(w.type) === 2;
    const contractStatusId = w.contract_status_info?.id;
    const isFinishedBranch = contractStatusId === 1;          /* Finished / Plan to Finish → Visa Expiry */

    const statusMeta = DOC_STATUS_META[w.biodata_status] || DOC_STATUS_META.in_complete;
    const statusChip = <WkdStatusChip label={ translation(statusMeta.key) } tone={ statusMeta.tone } />;
    const updated = w.biodata_status && w.biodata_status !== 'in_complete' && w.biodata_updated_at ? timeSince(w.biodata_updated_at) : null;

    /* §16.2 / U-0198: only the states the section can move to; an Incomplete section has no manual transition (the roll-up moves it) */
    const statusOptions = useMemo(() => {
        const current = w.biodata_status || 'in_complete';
        if (current === 'in_complete') return [];
        return sectionStatusOptions(allStatusList, current).filter((s) => canSendTemplate || s.id !== 'action_required');
    }, [allStatusList, w.biodata_status, canSendTemplate]);

    const courses = useMemo(() => {
        const info = w.special_course_info;
        if (!info) return '';
        if (Array.isArray(info)) return info.map((c) => courseDisplayName(c.name)).join(', ');
        return typeof info === 'object' && info.name ? courseDisplayName(info.name) : '';
    }, [w.special_course_info]);

    const sortedExperience = useMemo(() => {
        if (!Array.isArray(w.experience)) return [];
        return [...w.experience].sort((a, b) => {
            if (a.current_contract === 1 && b.current_contract !== 1) return -1;
            if (b.current_contract === 1 && a.current_contract !== 1) return 1;
            return (b.end_date ? new Date(b.end_date) : 0) - (a.end_date ? new Date(a.end_date) : 0);
        });
    }, [w.experience]);
    const currentContract = sortedExperience.find((e) => isLocal && e.current_contract === 1) || null;
    const pastExperience = sortedExperience.filter((e) => e !== currentContract);

    /* Reason for Leaving reads its name from the worker contract status list */
    useEffect(() => { if (!contractStatusList?.length) dispatch(fetchContractStatus({ type: 'worker' })); }, [contractStatusList?.length, dispatch]);

    const handleChangeStatus = useCallback((id) => {
        const transitionError = getStatusTransitionError(w.biodata_status, id);
        if (transitionError) { ShowToast("error", translation(transitionError)); return; }
        if (id === 'action_required') {
            if (!canSendTemplate) return;
            setIsSendTemplatePopup(true);
            setCommonTemplateData({ slug: "biodata_action_required", title: translation('key_send_template_action_required'), userType: "worker", actionStatusType: "biodata", statusKey: id });
            return;
        }
        dispatch(saveWorkerValidateStatus({ worker_id: w.id, type: "biodata", status_key: id })).then((res) => {
            if (res?.payload?.status) { onRefreshStatus('biodata'); ShowToast("success", res?.payload?.message); }
            else ShowToast("error", res?.payload?.message);
        });
    }, [w.id, w.biodata_status, canSendTemplate, dispatch, onRefreshStatus]);

    const handleEditClose = useCallback(() => setEditFocus(null), []);
    const handleCloseSendTemplate = useCallback(() => setIsSendTemplatePopup(false), []);
    const handleRefreshProfile = useCallback((action) => {
        onRefreshStatus(action);
        setEditFocus(null);
        setIsSendTemplatePopup(false);
    }, [onRefreshStatus]);
    const edit = (section) => (canEdit ? () => setEditFocus(section) : undefined);

    /* work experience card body (prototype bioWorkBody) */
    const workBody = (exp) => (
        <>
            <div className="det-grid">
                <BioField label={ translation('key_role') } value={ exp.worker_role_info?.name } required />
                <BioField label={ translation('key_work_location') } value={ exp.work_country_info?.name } required />
                { isHongKongLocation(exp.work_country_info) && <BioField label={ translation('key_district') } value={ exp.district_info?.name } /> }
                <BioField label={ translation('key_employer_nationality') } value={ exp.employer_nationality_info?.name } required />
                <BioField label={ translation('key_language_spoken') } value={ joined(exp.spoken_language_info) } required />
                <BioField label={ translation('key_household_size') } value={ exp.family_size } required />
                <BioField
                    label={ `${ translation('key_start_date') } - ${ translation('key_end_date') }` }
                    value={ exp.start_date ? `${ fmt(exp.start_date, 'MM/YYYY') } - ${ exp.end_date ? fmt(exp.end_date, exp.current_contract === 1 ? 'DD/MM/YYYY' : 'MM/YYYY') : '—' }` : '' }
                    required
                />
                <BioField label={ translation('key_reason_for_leaving') } value={ experienceReasonForLeaving(exp, contractStatusList) } span={ 2 } />
            </div>
            <div className="bio-duties">
                <div className={ `bio-duties-lbl${ !exp.duty?.length ? ' is-missing' : '' }` }>{ translation('key_main_duties') }{ !exp.duty?.length && <span>*</span> }</div>
                <BioChips items={ names((exp.duty || []).map((d) => d.duty)) } />
            </div>
        </>
    );

    if (editFocus !== null) {
        return (
            <div className="bio-data-view">
                <BiodataForm workerDetail={ w } statusData={ status } onClose={ handleEditClose } focusSection={ editFocus } />
            </div>
        );
    }

    return (
        <div className="bio-data-view bio-cards">
            { status === 'loading' ? <CustomSpinner /> : (
                <>
                    {/* 1 · Biodata — status, Updated, Edit, Change Status */}
                    <BioCard
                        title={ translation('key_biodata') }
                        chip={ statusChip }
                        updated={ updated }
                        onEdit={ edit('biodata') }
                        dimmed={ statusPopOpen }
                        dataSection="biodata"
                        extraHead={ canChangeStatus && statusOptions.length > 0 && (
                            <BioStatusPop current={ w.biodata_status } options={ statusOptions } onPick={ handleChangeStatus } onOpenChange={ setStatusPopOpen } />
                        ) }
                    >
                        <div className="det-grid">
                            <BioField label={ translation('key_wkr_i_m_interested_in_working_in') } value={ joined(w.open_to_working_in_info) } required span={ 2 } />
                            {/* U-0205: Current Location is auto-detected — shown as recorded, missing until supplied */}
                            <BioField label={ translation('key_location') } value={ w.current_location?.name } />
                            { isLocal && (
                                <>
                                    <BioField label={ translation('key_contract_status') } value={ w.contract_status_info?.admin_panel_status } required />
                                    {/* Visa Expiry and Contract End are never both shown */}
                                    { isFinishedBranch
                                        ? <BioField label={ translation('key_visa_expiry_date') } value={ fmt(w.visa_expiry_date) } required />
                                        : <BioField label={ translation('key_contract_end_date') } value={ fmt(w.contract_end_date) } required /> }
                                    { isFinishedBranch && (
                                        <>
                                            <BioField label={ translation('key_early_release_applicable') } value={ Number(w.expect_released_early) === 1 ? translation('key_yes') : translation('key_no') } />
                                            { w.expect_released_early ? <BioField label={ translation('key_early_release_date') } value={ fmt(w.early_release_date) } required /> : null }
                                        </>
                                    ) }
                                </>
                            ) }
                            { isOverseas && <BioField label={ translation('key_earliest_date_you_can_start_work') } value={ fmt(w.earliest_can_start_date) } required /> }
                            <BioField label={ `${ translation('key_job') } ${ translation('key_status') }` } value={ w.job_status_info?.name } />
                        </div>
                    </BioCard>

                    {/* 2 · Profile */}
                    <BioCard title={ translation('key_profile') } onEdit={ edit('profile') } dimmed={ statusPopOpen } dataSection="profile">
                        <BioSection title={ translation('key_profile') }>
                            <BioField label={ translation('key_role') } value={ w.role?.name } required />
                            <BioField label={ translation('key_nationality') } value={ w.nationality?.name } required />
                            <BioField label={ translation('key_gender').replace(/:\s*$/, '') } value={ w.gender?.name } required />
                            <BioField label={ translation('key_date_of_birth') } value={ fmt(w.date_of_birth) } required />
                            <BioField label={ translation('key_height') } value={ w.height?.name } required />
                            {/* WORKER.md Step 4: Weight is required for Overseas workers only */}
                            <BioField label={ translation('key_weight') } value={ w.weight ? `${ w.weight } ${ w.weight_measurement || translation('key_kg') }` : '' } required={ isOverseas } />
                            <BioField label={ translation('key_age') } value={ w.age ? `${ String(w.age).replace(/\s*years?.*$/i, '') } ${ translation('key_years_lc') }` : '' } />
                            <BioField label={ translation('key_marital_status') } value={ w.marital_status?.name } required />
                            <BioField label={ translation('key_religion') } value={ w.religion?.name } required />
                        </BioSection>
                        <BioSection title={ translation('key_family_background') }>
                            <BioField label={ translation('key_number_of_children') } value={ w.children_count } />
                            <BioField label={ translation('key_age_of_oldest_child') } value={ w.oldest_child_age } />
                            <BioField label={ translation('key_siblings') } value={ w.siblings_count } />
                        </BioSection>
                        <BioSection title={ translation('key_language_and_education') }>
                            <BioField label={ translation('key_languages_known') } value={ joined(w.language_info) } required />
                            <BioField label={ translation('key_special_course') } value={ courses } />
                            <BioField label={ translation('key_education') } value={ w.education?.name } required />
                            { /college|university/i.test(w.education?.name || '') && (
                                <BioField label={ translation('key_wkr_college_university') } value={ w.college_name } required span={ 2 } />
                            ) }
                        </BioSection>
                        <BioSection title={ translation('key_domestic_helper_experience') } grid={ false }>
                            <div className="bio-val">{ w.work_experience != null && w.work_experience !== '' ? `${ w.work_experience } ${ translation('key_years') }` : '—' }</div>
                        </BioSection>
                    </BioCard>

                    {/* 3 · Main Skills — chips, Cooking, then the skill-detail groups as peers */}
                    <BioCard title={ translation('key_main_skills') } onEdit={ edit('skills') } dimmed={ statusPopOpen } dataSection="skills">
                        <BioSection grid={ false }>
                            <BioChips items={ (Array.isArray(w.skills_info) ? w.skills_info : []).map((s) => skillDisplayName(s, mainSkills)).filter(Boolean) } />
                        </BioSection>
                        {/* W-02: Cooking is its own section, shown whether or not Cooking is ticked as a skill */}
                        <BioSection title={ translation('key_cooking') }>
                            <BioField label={ translation('key_wkr_i_can_cook') } value={ joined(w.cooking_info) } span={ 2 } />
                        </BioSection>
                        { w.skills_info?.some((s) => constData.isChildCareSkill(s)) && (
                            <BioSection title={ translation('key_baby_care') }>
                                <BioField label={ translation('key_age_groups_cared_for_in_previous_roles') } value={ joined(w.child_care_age_ids_info) } />
                                <BioField label={ translation('key_tasks_while_caring_for_children') } value={ joined(w.child_care_duty_ids_info) } />
                            </BioSection>
                        ) }
                        { w.skills_info?.some((s) => s.id === constData.ELDERLY_CARE_SKILL_ID) && (
                            <BioSection title={ translation('key_elderly_care') }>
                                <BioField label={ translation('key_wkr_age_of_elderly_person_you_have_provided') } value={ w.age_of_elder } />
                                <BioField label={ translation('key_main_responsibilities') } value={ joined(w.elderly_care_duty_ids_info) } />
                            </BioSection>
                        ) }
                        <BioSection title={ translation('key_household_chores') }>
                            <BioField label={ translation('key_wkr_household_chores_experience') } value={ joined(w.household_chores_id_info) } span={ 2 } />
                        </BioSection>
                    </BioCard>

                    {/* 4 · Current Contract (Local only) */}
                    { currentContract && (
                        <BioCard
                            title={ `${ translation('key_current') } ${ translation('key_contract') }` }
                            chip={ <span className="wkd-we-active">{ translation('key_active') }</span> }
                            onEdit={ edit(`work-${ currentContract.id ?? 'current' }`) }
                            dimmed={ statusPopOpen }
                            dataSection="work-current"
                        >
                            { workBody(currentContract) }
                        </BioCard>
                    ) }

                    {/* 5 · Work Experience N */}
                    { pastExperience.map((exp, i) => (
                        <BioCard key={ exp.id || `exp-${ i }` } title={ `${ translation('key_work_experience') } ${ i + 1 }` } onEdit={ edit(`work-${ exp.id ?? i }`) } dimmed={ statusPopOpen } dataSection={ `work-${ i }` }>
                            { workBody(exp) }
                        </BioCard>
                    )) }

                    {/* 6 · Expectations */}
                    <BioCard title={ translation('key_expectations') } onEdit={ edit('expectations') } dimmed={ statusPopOpen } dataSection="expectations">
                        <div className="det-grid">
                            <BioField label={ translation('key_care_for_newborn_baby') } value={ exc(w.care_newborn) } required />
                            <BioField label={ translation('key_provide_care_for_elderly') } value={ exc(w.care_elderly) } required />
                            <BioField label={ translation('key_care_for_someone_with_disability') } value={ exc(w.care_disability) } required />
                            <BioField label={ translation('key_share_work_with_another_helper') } value={ exc(w.share_work) } required />
                            <BioField label={ translation('key_share_room') } value={ exc(w.share_room) } required />
                            <BioField label={ translation('key_day_off') } value={ dayOffNames(w) } required />
                            <BioField
                                label={ translation('key_wkr_preferred_interview_locations') }
                                value={ w.preferred_interview_locations_info?.length ? w.preferred_interview_locations_info.map((l) => l.branch_display_name).join(', ') : (isOverseas ? 'Online only (currently overseas)' : translation('key_no_preference')) }
                            />
                            <BioField
                                label={ translation('key_can_interview_on') }
                                value={ w.interview_day ? String(w.interview_day).split(',').map((id) => cachedInterviewDayList.find((o) => o.id === Number(id))?.name).filter(Boolean).join(', ') : '' }
                                required
                            />
                            <BioField label={ translation('key_wkr_reference_letter_available') } value={ exc(w.reference_letter) } required />
                            <BioField label={ translation('key_wkr_tell_employers_more_about_you_optional') } value={ w.additional_info } span={ 2 } />
                        </div>
                    </BioCard>
                </>
            ) }
            { status === 'loading' && <ActionLoader /> }

            { isSendTemplatePopup && (
                <React.Suspense fallback={ <CustomSpinner /> }>
                    <WkdSendTemplateModal onClose={ handleCloseSendTemplate } site={ SEND_SITE.WORKER_BIODATA_AR } context={ { worker_id: w.id } } userType={ commonTemplateData.userType } slug={ commonTemplateData.slug } parties={ { worker: { name: w.fullname || "" } } } title={ commonTemplateData.title } status_key={ commonTemplateData.statusKey } actionStatusType={ commonTemplateData.actionStatusType } handleRefreshProfile={ handleRefreshProfile } contextLabel={ translation('key_biodata') } allowSelfTools={ false } />
                </React.Suspense>
            ) }
        </div>
    );
});

BiodataView.propTypes = {
    onRefreshStatus: PropTypes.func,
    isWorkerPermissionAccessInfo: PropTypes.any,
    isAdmin: PropTypes.any,
    workerProfileInfo: PropTypes.object,
};

export default BiodataView;
