import React, { useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import GcIcon from "../gcIcons";
import { canChatWorkerAtStage, getJobOfferPermissions } from "../../../../../utils/permissions/jobPermissionsUtils";
import translation from "../../../../../utils/translation";
import { fetchWorkerCommonDetailInfo } from "../../../../../redux/Slices/worker/WorkerSlice";
import { exceptionsStatusList } from "../../../../../components/ReusableComponents/constants";
import GcEntityCodeLink from "../GcEntityCodeLink";

const cachedExceptionsList = exceptionsStatusList();
const exceptionName = (id) => cachedExceptionsList.find((o) => o.id === id)?.name || "";

const namesOf = (list) => (Array.isArray(list) ? list.map((item) => item?.name).filter(Boolean) : []);

const Kv = ({ k, v }) => (
    <div className="gc-kv">
        <span className="gc-k">{ k }</span>
        <span className="gc-v">{ v || "—" }</span>
    </div>
);
Kv.propTypes = { k: PropTypes.string, v: PropTypes.node };

const GcWorkerProfile = ({ frame, onShareToChat, canShareLink, onOpenMessageTemplate, onChatWithWorker, conversationType, onShareTemplate, onOpenTeamChat }) => {
    const dispatch = useDispatch();
    const { workerProfileInfo, permissionList, ownerOnboardingList } = useSelector((state) => ({
        workerProfileInfo: state.worker.workerProfileInfo, permissionList: state.users.permissionList, ownerOnboardingList: state.users.ownerOnboardingList,
    }), shallowEqual);
    /* Worker Chat is granted per applicant stage (PERM §4.12.1) — shared resolver; the owner column comes from the Job Offer's `is_owner` */
    const canMessageWorker = useMemo(() => {
        if (conversationType !== "employer" || !onChatWithWorker) return false;
        const perms = getJobOfferPermissions(permissionList, ownerOnboardingList, frame.employerId, typeof frame.isOwner === "boolean" ? frame.isOwner : undefined);
        return canChatWorkerAtStage(frame.stageId, perms);
    }, [conversationType, onChatWithWorker, permissionList, ownerOnboardingList, frame.employerId, frame.isOwner, frame.stageId]);

    /* An applicant row may target a different worker than the loaded profile. */
    useEffect(() => {
        if (frame.workerId && String(workerProfileInfo?.id) !== String(frame.workerId)) {
            dispatch(fetchWorkerCommonDetailInfo({ worker_id: frame.workerId, type: "biodata" }));
        }
    }, [dispatch, frame.workerId, workerProfileInfo?.id]);

    const photo = workerProfileInfo?.last_uploaded_worker_image || workerProfileInfo?.image || workerProfileInfo?.default_worker_image;
    const skills = useMemo(() => namesOf(workerProfileInfo?.skills_info), [workerProfileInfo?.skills_info]);
    const languages = useMemo(() => namesOf(workerProfileInfo?.language_info).join(", "), [workerProfileInfo?.language_info]);
    const cooking = useMemo(() => namesOf(workerProfileInfo?.cooking_info).join(", "), [workerProfileInfo?.cooking_info]);
    const experience = workerProfileInfo?.experience || [];

    /* Expanded Profile — per-skill detail blocks, rendered only when data exists */
    const expandedBlocks = useMemo(() => {
        const blocks = [];
        const childAges = namesOf(workerProfileInfo?.child_care_age_ids_info).join(", ");
        const childDuties = namesOf(workerProfileInfo?.child_care_duty_ids_info).join(", ");
        if (childAges || childDuties) {
            blocks.push({ title: translation("key_baby_care"), caredFor: childAges, experiencedIn: childDuties });
        }
        const elderlyDuties = namesOf(workerProfileInfo?.elderly_care_duty_ids_info).join(", ");
        if (workerProfileInfo?.age_of_elder || elderlyDuties) {
            blocks.push({
                title: translation("key_elderly_care"),
                caredFor: workerProfileInfo?.age_of_elder ? `${ workerProfileInfo.age_of_elder }yr old` : "",
                experiencedIn: elderlyDuties,
            });
        }
        const chores = namesOf(workerProfileInfo?.household_chores_id_info).join(", ");
        if (chores) {
            blocks.push({ title: translation("key_household_chores"), caredFor: "", experiencedIn: chores });
        }
        return blocks;
    }, [workerProfileInfo]);

    /* Values are ids resolved through the shared exceptionsStatusList,
     * exactly like BiodataView. */
    const expectations = [
        [translation("key_care_newborn"), exceptionName(workerProfileInfo?.care_newborn)],
        [translation("key_care_elderly"), exceptionName(workerProfileInfo?.care_elderly)],
        [translation("key_care_disability"), exceptionName(workerProfileInfo?.care_disability)],
        [translation("key_share_room"), exceptionName(workerProfileInfo?.share_room)],
        [translation("key_share_work"), exceptionName(workerProfileInfo?.share_work)],
    ].filter(([, v]) => v);

    return (
        <>
            <div className="gc-deep-toolbar">
                { canShareLink && onShareTemplate && (
                    <button
                        type="button"
                        className="gc-pa-btn tip"
                        data-tip={ translation("key_send_template") }
                        aria-label={ translation("key_send_template") }
                        onClick={ () => onShareTemplate(workerProfileInfo, { jobId: frame.jobId }) }
                    >
                        <GcIcon name="share" />
                    </button>
                ) }
                { canShareLink && (
                    <button
                        type="button"
                        className="gc-pa-btn tip"
                        data-tip={ translation("key_share_link") }
                        aria-label={ translation("key_share_link") }
                        onClick={ () => onShareToChat(workerProfileInfo, { jobId: frame.jobId }) }
                    >
                        <GcIcon name="link" />
                    </button>
                ) }
                <button
                    type="button"
                    className="gc-pa-btn tip"
                    data-tip={ translation("key_send_template") }
                    aria-label={ translation("key_send_template") }
                    onClick={ onOpenMessageTemplate }
                >
                    <GcIcon name="template" />
                </button>
                { canMessageWorker && (
                    <button
                        type="button"
                        className="gc-pa-btn tip"
                        data-tip={ translation("key_chat") }
                        aria-label={ translation("key_chat") }
                        onClick={ () => onChatWithWorker(workerProfileInfo?.id) }
                    >
                        <GcIcon name="chat" />
                    </button>
                ) }
                { frame.interpreter?.staff_id && (
                    <>
                        <span className="gc-jod-spacer" />
                        { frame.interpreter?.user_id && onOpenTeamChat ? (
                            <button
                                type="button"
                                className="gc-owner-named tip"
                                data-tip={ translation("key_open_team_chat_attach") }
                                aria-label={ translation("key_open_team_chat_attach") }
                                onClick={ () => onOpenTeamChat(
                                    {
                                        user_id: frame.interpreter.user_id,
                                        name: [frame.interpreter?.first_name, frame.interpreter?.last_name].filter(Boolean).join(" "),
                                    },
                                    {
                                        workerId: workerProfileInfo?.id ?? frame.workerId,
                                        workerName: workerProfileInfo?.fullname,
                                        workerRef: workerProfileInfo?.reference_id,
                                        jobId: frame.jobId,
                                        employerId: frame.employerId,
                                    }
                                ) }
                            >
                                <GcIcon name="team" />
                                { translation("key_interpreter") } · <b>{ [frame.interpreter?.first_name, frame.interpreter?.last_name].filter(Boolean).join(" ") }</b>
                            </button>
                        ) : (
                            <span className="gc-owner-named">
                                <GcIcon name="team" />
                                { translation("key_interpreter") } · <b>{ [frame.interpreter?.first_name, frame.interpreter?.last_name].filter(Boolean).join(" ") }</b>
                            </span>
                        ) }
                    </>
                ) }
            </div>
            <div className="gc-prof-hero">
                <div className="gc-wphoto">
                    { photo ? <img src={ photo } alt="" /> : (workerProfileInfo?.fullname || "?").charAt(0) }
                </div>
                <div className="gc-prof-hero-main">
                    <span className="gc-pid-name">{ workerProfileInfo?.fullname }</span>
                    <GcEntityCodeLink kind="worker" id={ workerProfileInfo?.id } code={ workerProfileInfo?.reference_id } titleKey="key_worker_details" jobOfferId={ frame.jobId } />
                    <span className="gc-prof-meta">
                        { [workerProfileInfo?.age, workerProfileInfo?.nationality?.name].filter(Boolean).join(", ") }
                    </span>
                    <div className="gc-prof-facts">
                        { workerProfileInfo?.current_location?.name && (
                            <span className="gc-fact-chip">{ translation("key_location") } · { workerProfileInfo.current_location.name }</span>
                        ) }
                        { workerProfileInfo?.earliest_can_start_date && (
                            <span className="gc-fact-chip">{ translation("key_can_start") } · { workerProfileInfo.earliest_can_start_date }</span>
                        ) }
                    </div>
                </div>
            </div>
            <div className="gc-sect">
                <div className="gc-sect-title">{ translation("key_profile") }</div>
                <div className="gc-kv-grid">
                    <Kv k={ translation("key_age") } v={ workerProfileInfo?.age } />
                    <Kv k={ translation("key_nationality") } v={ workerProfileInfo?.nationality?.name } />
                    <Kv k={ translation("key_height") } v={ workerProfileInfo?.height?.name } />
                    <Kv k={ translation("key_weight") } v={ workerProfileInfo?.weight ? `${ workerProfileInfo.weight }${ workerProfileInfo.weight_measurement || "" }` : "" } />
                    <Kv k={ translation("key_religion") } v={ workerProfileInfo?.religion?.name } />
                    <Kv k={ translation("key_marital_status") } v={ workerProfileInfo?.marital_status?.name } />
                </div>
            </div>
            <div className="gc-sect">
                <div className="gc-sect-title">{ translation("key_family_background") }</div>
                <div className="gc-kv-grid">
                    <Kv k={ translation("key_no_of_children") } v={ workerProfileInfo?.children_count } />
                    <Kv k={ translation("key_age_of_eldest_child") } v={ workerProfileInfo?.oldest_child_age } />
                </div>
            </div>
            <div className="gc-sect">
                <div className="gc-sect-title">{ translation("key_education") }</div>
                <div className="gc-kv-grid">
                    <Kv k={ translation("key_education") } v={ workerProfileInfo?.education?.name } />
                    <Kv k={ translation("key_college_name") } v={ workerProfileInfo?.college_name } />
                </div>
            </div>
            { languages && (
                <div className="gc-sect">
                    <div className="gc-sect-title">{ translation("key_languages") }</div>
                    <p className="gc-para">{ languages }</p>
                </div>
            ) }
            { skills.length > 0 && (
                <div className="gc-sect">
                    <div className="gc-sect-title">{ translation("key_main_skills") }</div>
                    <div className="gc-skills-grid">
                        { skills.map((skill) => <div className="gc-skill-card" key={ skill }>{ skill }</div>) }
                    </div>
                </div>
            ) }
            { experience.length > 0 && (
                <div className="gc-sect">
                    <div className="gc-sect-title">{ translation("key_work_experience") }</div>
                    { experience.map((exp) => (
                        <div className="gc-exp-block" key={ exp.id }>
                            <div className="gc-eh">
                                { [exp?.worker_role_info?.name, exp?.work_country_info?.name].filter(Boolean).join(", ") || "—" }
                            </div>
                            <div className="gc-ed">
                                { [exp?.start_date, exp?.current_contract ? translation("key_present") : exp?.end_date].filter(Boolean).join(" – ") }
                            </div>
                        </div>
                    )) }
                </div>
            ) }
            { cooking && (
                <div className="gc-sect">
                    <div className="gc-sect-title">{ translation("key_cooking") }</div>
                    <p className="gc-para">{ cooking }</p>
                </div>
            ) }
            { expectations.length > 0 && (
                <div className="gc-sect">
                    <div className="gc-sect-title">{ translation("key_expectations") }</div>
                    { expectations.map(([label, value]) => (
                        <div className="gc-expect-row" key={ label }>
                            <span>{ label }</span>
                            <span className={ value === "Yes" ? "gc-expect-yes" : value === "No" ? "gc-expect-no" : "" }>
                                { value === "Yes" ? "✓" : value === "No" ? "✕" : value }
                            </span>
                        </div>
                    )) }
                </div>
            ) }
            { expandedBlocks.length > 0 && (
                <div className="gc-sect">
                    <div className="gc-sect-title">{ translation("key_expanded_profile") }</div>
                    { expandedBlocks.map((block) => (
                        <div className="gc-exp-block" key={ block.title }>
                            <div className="gc-eh">{ block.title }</div>
                            <div className="gc-kv-grid">
                                { block.caredFor && (
                                    <div className="gc-kv">
                                        <span className="gc-k">{ translation("key_has_cared_for") }</span>
                                        <span className="gc-v">{ block.caredFor }</span>
                                    </div>
                                ) }
                                { block.experiencedIn && (
                                    <div className="gc-kv">
                                        <span className="gc-k">{ translation("key_experienced_in") }</span>
                                        <span className="gc-v">{ block.experiencedIn }</span>
                                    </div>
                                ) }
                            </div>
                        </div>
                    )) }
                </div>
            ) }
            <div className="gc-sect">
                <div className="gc-sect-title">{ translation("key_reference_letter") }</div>
                <p className="gc-para">{ exceptionName(workerProfileInfo?.reference_letter) || "—" }</p>
            </div>
        </>
    );
};

GcWorkerProfile.propTypes = {
    frame: PropTypes.object.isRequired,
    onShareToChat: PropTypes.func.isRequired,
    canShareLink: PropTypes.bool,
    onOpenMessageTemplate: PropTypes.func.isRequired,
    onChatWithWorker: PropTypes.func,
    conversationType: PropTypes.string,
    onShareTemplate: PropTypes.func,
    onOpenTeamChat: PropTypes.func,
};

export default React.memo(GcWorkerProfile);
