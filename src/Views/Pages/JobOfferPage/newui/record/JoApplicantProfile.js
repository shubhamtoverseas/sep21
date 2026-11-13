import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import { useDispatch, useSelector } from "react-redux";
import CustomSpinner from "../../../../../components/ReusableComponents/CustomSpinner";
import { exceptionsStatusList } from "../../../../../components/ReusableComponents/constants";
import { fetchWorkerCommonDetailInfo } from "../../../../../redux/Slices/worker/WorkerSlice";
import { fetchContractStatus } from "../../../../../redux/Slices/common/CommonSlice";
import { experienceReasonForLeaving } from "../../../../../utils/workerDisplay";
import { getInitials } from "../../../../../utils/utils";
import { photoRecords } from "../../../WorkerPage/worker-detail/newui/photo/photoModel";
import translation from "../../../../../utils/translation";
import { showErrorMessage } from "../../../../../services/commonService";
import JoIcon from "../joIcons";
import { canChatWorkerAtStage } from "../../../../../utils/permissions/jobPermissionsUtils";
import { JO_APPLICANT_COPY, JO_COOKING_SKILL, JO_HONG_KONG, JO_MAIN_SKILLS_MAX } from "../../jobOfferConstants";

const WkdPhotoViewModal = lazy(() => import("../../../WorkerPage/worker-detail/newui/WkdPhotoViewModal"));

const EM = '—';
const exceptions = exceptionsStatusList();
const exceptionName = (id) => exceptions.find((o) => o.id === id)?.name || '';
const namesOf = (list) => (Array.isArray(list) ? list.map((x) => x?.name).filter(Boolean) : []);
const skillName = (name) => String(name || '').split('|')[0].trim();
const monthOf = (d) => (d ? dayjs(d).format('MMMM YYYY') : '');
const displayDate = (d) => (dayjs(d).isValid() ? dayjs(d).format('DD/MM/YYYY') : d);

const Field = ({ label, value, span }) => (
    <div className={ `f${ span ? ' span' : '' }` }>
        <div className="l">{ label }</div>
        <div className={ `v${ value == null || value === '' ? ' mc-unavailable' : '' }` }>{ value == null || value === '' ? EM : value }</div>
    </div>
);
Field.propTypes = { label: PropTypes.node, value: PropTypes.node, span: PropTypes.bool };

const Tags = ({ items }) => (
    <div className="wd-tags">{ items.map((t) => <span key={ t } className="wd-tag">{ t }</span>) }</div>
);
Tags.propTypes = { items: PropTypes.array.isRequired };

/* Worker Chat per applicant stage (PERM §4.12.1) — the shared resolver */
const canMessage = (row, perms) => canChatWorkerAtStage(row?.job_stage_status_id, perms);

const JoApplicantProfile = ({ row, perms, canOpenWorker, onOpenWorker, onShare, onAddLink, onMessage, onDetail, showTools = true, emptyText }) => {
    const dispatch = useDispatch();
    const contractStatusList = useSelector((state) => state.common.contractStatus);
    useEffect(() => { if (!contractStatusList?.length) dispatch(fetchContractStatus({ type: 'worker' })); }, [contractStatusList?.length, dispatch]);
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [photoOpen, setPhotoOpen] = useState(false);
    const workerId = row?.id;

    useEffect(() => {
        if (!workerId) { setDetail(null); return undefined; }
        let live = true;
        setLoading(true);
        dispatch(fetchWorkerCommonDetailInfo({ worker_id: workerId, type: 'full_details' })).then((res) => {
            if (!live) return;
            if (res?.error) showErrorMessage(res);
            const data = res?.payload?.data || null;
            setDetail(data);
            onDetail?.(workerId, data);
            setLoading(false);
        });
        return () => { live = false; };
    }, [dispatch, workerId, onDetail]);

    const mainSkills = useMemo(() => namesOf(detail?.skills_info).map(skillName).filter((n) => n !== JO_COOKING_SKILL).slice(0, JO_MAIN_SKILLS_MAX), [detail?.skills_info]);
    const skillDetails = useMemo(() => {
        const blocks = [];
        const babyAges = namesOf(detail?.child_care_age_ids_info).join(', ');
        const babyDuties = namesOf(detail?.child_care_duty_ids_info).join(', ');
        if (babyAges || babyDuties) blocks.push({ title: translation('key_baby_care'), rows: [[JO_APPLICANT_COPY.hasCaredFor, babyAges], [JO_APPLICANT_COPY.experiencedIn, babyDuties]] });
        const elderlyDuties = namesOf(detail?.elderly_care_duty_ids_info).join(', ');
        if (elderlyDuties) blocks.push({ title: translation('key_elderly_care'), rows: [[JO_APPLICANT_COPY.experiencedIn, elderlyDuties]] });
        const chores = namesOf(detail?.household_chores_id_info).join(', ');
        if (chores) blocks.push({ title: translation('key_household_chores'), rows: [[JO_APPLICANT_COPY.experiencedIn, chores]] });
        return blocks.map((b) => ({ ...b, rows: b.rows.filter(([, v]) => v) }));
    }, [detail]);
    const expectations = useMemo(() => [
        ['key_care_newborn', detail?.care_newborn], ['key_care_elderly', detail?.care_elderly], ['key_care_disability', detail?.care_disability],
        ['key_share_room', detail?.share_room], ['key_share_work', detail?.share_work],
    ].map(([key, v]) => [translation(key), exceptionName(v)]).filter(([, v]) => v), [detail]);

    if (!row) return <div className="jor-profile"><div className="list-empty">{ emptyText || JO_APPLICANT_COPY.selectApplicant }</div></div>;

    /* the approved (published) photo only — the version employers see; a pending upload never shows here */
    /* `approved_photo` (backend 12 Oct ask 7) is the photo employers may see; the photo records are the rollout fallback */
    const approved = detail?.approved_photo;
    /* backend 13 Oct: `{ headshot: <without background>, original: <uploaded> }`; the raw field names are accepted too */
    const approvedUrl = typeof approved === 'string' ? approved : (approved?.headshot || approved?.uploaded_without_bg || approved?.url || approved?.original || approved?.uploaded || null);
    const photo = detail ? (approvedUrl || photoRecords(detail).current?.headshot || photoRecords(detail).current?.original || null) : (row?.image || null);
    const name = detail?.fullname || row?.name || '';
    const code = detail?.reference_id || row?.reference_id || '';
    /* the team saved on the interview (backend D-05) wins over the worker's current interpreter assignment */
    const team = row?.interview || {};
    const interpreter = row?.existing_interpreter;
    const interpreterName = team.interpreter_owner?.name || [interpreter?.first_name, interpreter?.last_name].filter(Boolean).join(' ');
    const assistantName = team.cs_assistant?.name || '';
    const ownerName = team.cs_owner?.name || '';
    const chips = [
        detail?.work_experience != null && detail?.work_experience !== '' ? `${ JO_APPLICANT_COPY.experience } · ${ detail.work_experience } ${ JO_APPLICANT_COPY.years }` : null,
        detail?.earliest_can_start_date || detail?.start_date ? `${ JO_APPLICANT_COPY.earliestStart } · ${ displayDate(detail.earliest_can_start_date || detail.start_date) }` : null,
        detail?.current_location?.name ? `${ JO_APPLICANT_COPY.location } · ${ detail.current_location.name }` : null,
    ].filter(Boolean);
    const codeNode = code ? (canOpenWorker
        ? <button type="button" className="mc-link-code" title={ `${ JO_APPLICANT_COPY.openWorker } ${ code }` } onClick={ () => onOpenWorker(row) }>{ code }</button>
        : <span className="mc-code-plain" data-mc-plain-worker-code="true">{ code }</span>) : null;

    return (
        <section className="jor-profile" aria-label={ translation('key_profile') }>
            { showTools && (
            <div className="tools">
                { perms.canShare && <button type="button" className="wd-btn" title={ JO_APPLICANT_COPY.shareTitle } onClick={ () => onShare(row, detail) }><JoIcon name="share" /> { translation('key_share') }</button> }
                { perms.canShareWorkerProfile && <button type="button" className="wd-btn" title={ JO_APPLICANT_COPY.addLinkTitle } onClick={ () => onAddLink(row, detail) }><JoIcon name="link" />{ JO_APPLICANT_COPY.addLink }</button> }
                { canMessage(row, perms) && <button type="button" className="wd-btn" title={ JO_APPLICANT_COPY.messageWorkerTitle } onClick={ () => onMessage(row, detail) }><JoIcon name="chat" /> { JO_APPLICANT_COPY.messageWorker }</button> }
                <span className="sp" />
                { /* the team saved on the interview (workbook row 20): CS Owner · CS Assistant · Interpreter Owner, never the job's current owners */ }
                { ownerName && (
                    <span className="wd-owner" aria-label={ `${ translation('key_cs_owner') } ${ ownerName }` }>
                        <span className="av">{ getInitials(ownerName) }</span>
                        <span className="role">{ translation('key_cs_owner') } ·</span>
                        <b>{ ownerName }</b>
                    </span>
                ) }
                { assistantName && (
                    <span className="wd-owner" aria-label={ `${ JO_APPLICANT_COPY.csAssistant } ${ assistantName }` }>
                        <span className="av">{ getInitials(assistantName) }</span>
                        <span className="role">{ JO_APPLICANT_COPY.csAssistant } ·</span>
                        <b>{ assistantName }</b>
                    </span>
                ) }
                <span className="wd-owner" aria-label={ interpreterName ? `${ translation('key_interpreter') } ${ interpreterName }` : JO_APPLICANT_COPY.interpreterNotSourced } data-mc-honest={ interpreterName ? 'deferred' : undefined } title={ interpreterName ? JO_APPLICANT_COPY.teamChatDeferred : undefined }>
                    { interpreterName && <span className="av">{ getInitials(interpreterName) }</span> }
                    <span className="role">{ translation('key_interpreter') } ·</span>
                    { interpreterName ? <b>{ interpreterName }</b> : <b className="mc-unavailable">{ EM }</b> }
                </span>
            </div>
            ) }
            <div className="hero">
                <div className="avatar" aria-hidden={ photo ? 'false' : 'true' }>
                    { photo
                        ? <button type="button" className="photo" aria-label={ `${ translation('key_profile') } — ${ name }` } onClick={ () => setPhotoOpen(true) }><img src={ photo } alt={ name } /></button>
                        : getInitials(name) }
                </div>
                <div className="idm">
                    <div className="name mc-person-name">{ name || EM }</div>
                    <div className="codeline">
                        { codeNode }
                        <span className="meta">{ [detail?.age ?? row?.age ?? EM, detail?.nationality?.name || EM].join(', ') }</span>
                    </div>
                    { chips.length > 0 && <Tags items={ chips } /> }
                </div>
            </div>
            <div className="contract"><div className="fgrid"><Field label={ translation('key_contract_status') } value={ row?.contract_status_info?.admin_panel_status } /></div></div>

            { loading && !detail ? <div className="list-empty"><CustomSpinner /></div> : (
                <>
                    <section className="sec">
                        <h3>{ translation('key_profile') }</h3>
                        <div className="fgrid">
                            <Field label={ translation('key_age') } value={ detail?.age } />
                            <Field label={ translation('key_nationality') } value={ detail?.nationality?.name } />
                            <Field label={ translation('key_height') } value={ detail?.height?.name } />
                            <Field label={ translation('key_chinese_horoscope') } value={ detail?.chinese_horoscope?.name } />
                            <Field label={ translation('key_weight') } value={ detail?.weight ? `${ detail.weight } ${ detail.weight_measurement || '' }`.trim() : '' } />
                            <Field label={ translation('key_horoscope') } value={ detail?.horoscope?.name } />
                            <Field label={ translation('key_religion') } value={ detail?.religion?.name } />
                            <Field label={ translation('key_marital_status') } value={ detail?.marital_status?.name } />
                        </div>
                    </section>
                    <section className="sec">
                        <h3>{ translation('key_family_background') }</h3>
                        <div className="fgrid">
                            <Field label={ translation('key_number_of_children') } value={ detail?.children_count } />
                            <Field label={ translation('key_age_of_oldest_child') } value={ detail?.oldest_child_age } />
                            <Field label={ translation('key_siblings') } value={ detail?.siblings_count ?? detail?.number_of_siblings } />
                        </div>
                    </section>
                    <section className="sec">
                        <h3>{ translation('key_education') }</h3>
                        <div className="fgrid">
                            <Field label={ translation('key_education_level') } value={ detail?.education?.name } />
                            <Field label={ translation('key_special_coursework') } value={ namesOf(detail?.special_course_info).join(', ') } />
                        </div>
                    </section>
                    <section className="sec"><h3>{ translation('key_language') }</h3><p className={ namesOf(detail?.language_info).length ? '' : 'mc-unavailable' }>{ namesOf(detail?.language_info).join(', ') || EM }</p></section>
                    <section className="sec"><h3>{ translation('key_main_skills') }</h3>{ mainSkills.length ? <Tags items={ mainSkills } /> : <p className="mc-unavailable">{ EM }</p> }</section>
                    <section className="sec"><h3>{ translation('key_cooking') }</h3><p className={ namesOf(detail?.cooking_info).length ? '' : 'mc-unavailable' }>{ namesOf(detail?.cooking_info).join(', ') || EM }</p></section>
                    <section className="sec">
                        <h3>{ translation('key_work_experience') }</h3>
                        { Array.isArray(detail?.experience) && detail.experience.length ? detail.experience.map((x) => {
                            const country = x?.work_country_info?.name || '';
                            const isHK = country === JO_HONG_KONG;
                            return (
                                <div className="job" key={ x.id } data-mc-exp-country={ country }>
                                    <div className="mc-profile-subheading">{ [x?.worker_role_info?.name, country].filter(Boolean).join(', ') || EM }</div>
                                    <div className="dates">{ [monthOf(x?.start_date), x?.current_contract ? translation('key_present') : monthOf(x?.end_date)].filter(Boolean).join(' - ') || EM }</div>
                                    <div className="fgrid">
                                        <Field label={ translation('key_employer_nationality') } value={ x?.employer_nationality_info?.name } />
                                        { isHK && <Field label={ translation('key_district') } value={ x?.district_info?.name } /> }
                                        <Field label={ translation('key_language_spoken') } value={ namesOf(x?.spoken_language_info).join(', ') } />
                                        <Field label={ translation('key_household_size') } value={ x?.family_size } />
                                        <Field label={ translation('key_reason_for_leaving') } value={ experienceReasonForLeaving(x, contractStatusList) } span />
                                    </div>
                                    <div className="duties">
                                        <div className="mc-main-duties-label">{ translation('key_main_duties') }</div>
                                        { Array.isArray(x?.duty) && x.duty.length ? <Tags items={ x.duty.map((d) => skillName(d?.duty?.name)).filter(Boolean) } /> : <p className="mc-unavailable">{ EM }</p> }
                                    </div>
                                </div>
                            );
                        }) : <p className="mc-unavailable">{ EM }</p> }
                    </section>
                    <section className="sec">
                        <h3>{ translation('key_expectations') }</h3>
                        { expectations.length ? (
                            <div className="expects">
                                { expectations.map(([label, value]) => (
                                    <div className="expect-row" key={ label }>
                                        <span>{ label }</span>
                                        { value === 'Yes' ? <span className="mc-yes" role="img" aria-label={ translation('key_yes') }>✓</span>
                                            : value === 'No' ? <span className="mc-no" role="img" aria-label={ translation('key_no') }>×</span>
                                                : <span>{ value }</span> }
                                    </div>
                                )) }
                            </div>
                        ) : <p className="mc-unavailable">{ EM }</p> }
                    </section>
                    { skillDetails.length > 0 && (
                        <section className="sec" data-skill-details="true">
                            <h3>{ JO_APPLICANT_COPY.skillDetails }</h3>
                            { skillDetails.map((block) => (
                                <details className="mc-skill-detail" open key={ block.title }>
                                    <summary>{ block.title }</summary>
                                    <div className="mc-skill-detail-body">
                                        { block.rows.map(([k, v]) => <div key={ k }><small>{ k }</small><p>{ v }</p></div>) }
                                    </div>
                                </details>
                            )) }
                        </section>
                    ) }
                    <section className="sec">
                        <h3>{ JO_APPLICANT_COPY.reference }</h3>
                        <p className={ detail?.reference_letter === 1 ? '' : 'mc-unavailable' }>{ detail?.reference_letter === 1 ? JO_APPLICANT_COPY.referenceAvailable : EM }</p>
                    </section>
                </>
            ) }
            { photoOpen && (
                <Suspense fallback={ null }>
                    <WkdPhotoViewModal photo={ { url: photo } } published onClose={ () => setPhotoOpen(false) } />
                </Suspense>
            ) }
        </section>
    );
};

JoApplicantProfile.propTypes = {
    row: PropTypes.object,
    perms: PropTypes.object.isRequired,
    canOpenWorker: PropTypes.bool,
    onOpenWorker: PropTypes.func.isRequired,
    onShare: PropTypes.func,
    onAddLink: PropTypes.func,
    onMessage: PropTypes.func,
    onDetail: PropTypes.func,
    showTools: PropTypes.bool,
    emptyText: PropTypes.node,
};

export default React.memo(JoApplicantProfile);
