import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from 'prop-types';
import dayjs from "dayjs";
import WkdReadField from "./WkdReadField";
import WkdSendTemplate from "./WkdSendTemplate";
import WkdDetCardHead from "./WkdDetCardHead";
import WkdDetSaveBar from "./WkdDetSaveBar";
import WkdOtherContactCard, { useOtherContactEdit } from "./WkdOtherContactCard";
import { fetchGetGenderList } from "../../../../../../redux/Slices/common/CommonSlice";
import translation from "../../../../../../utils/translation";
import { MARITAL_KEYS, DET_FORM_IDS, WKD_SEND_TEMPLATE_VERB } from "../../../workerModuleConstants";

const fmtDate = (v) => { if (!v) return '—'; const d = dayjs(v); return d.isValid() ? d.format('DD/MM/YYYY') : v; };

const BasicTabDetails = lazy(() => import("../../details-tab-worker/basic-tab/BasicTabDetails"));

const WkdBasicTab = ({ isWorkerPermissionAccessInfo, isAdmin, workerDetailTabInfo, staffType, sectionStatus }) => {
    const dispatch = useDispatch();
    const [card, setCard] = useState(null);
    /* busy flag of this card's own save only (SR-06) — not every worker-slice request */
    const [saving, setSaving] = useState(false);
    const genderList = useSelector((state) => state.common.genderList);

    useEffect(() => {
        if (!genderList || Object.keys(genderList).length === 0) {
            dispatch(fetchGetGenderList({ type: 'employer' }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    const basicPerm = Array.isArray(isWorkerPermissionAccessInfo?.worker_worker_basic_details) ? isWorkerPermissionAccessInfo.worker_worker_basic_details : [];
    const canEdit = basicPerm.includes('edit') || isAdmin;
    /* PERM 5.9 Basic · Send Template sub-verb; a partner sees it when their grid grants it (the modal keeps them in-app) */
    const canSendTemplate = basicPerm.includes(WKD_SEND_TEMPLATE_VERB) || isAdmin;

    const genderLabel = useMemo(() => {
        if (!workerDetailTabInfo?.gender || !genderList) return '';
        const g = Object.values(genderList).find((item) => item.id == workerDetailTabInfo.gender);
        return g?.name || '';
    }, [genderList, workerDetailTabInfo?.gender]);

    const maritalLabel = workerDetailTabInfo?.marital_status
        ? translation(MARITAL_KEYS[workerDetailTabInfo.marital_status]) || ''
        : '';

    const workExperiences = useMemo(
        () => (Array.isArray(workerDetailTabInfo?.worker_employer) ? workerDetailTabInfo.worker_employer : []),
        [workerDetailTabInfo?.worker_employer]
    );

    const d = workerDetailTabInfo || {};

    const handleDone = useCallback(() => setCard(null), []);
    const otherContact = useOtherContactEdit(d, card === 'other', handleDone);
    const { begin: beginOtherContact } = otherContact;
    const handleEditOther = useCallback(() => {
        beginOtherContact();
        setCard('other');
    }, [beginOtherContact]);

    return (
        <div className={ `det-body wkd-read-cards wkd-det-cards${ card ? ' is-editing' : '' }` }>
            <div className="g2-card wkd-det-card">
                { card === 'basic' ? (
                    <>
                        <WkdDetCardHead title={ translation('key_basic') } status={ sectionStatus } />
                        <Suspense fallback={ <div>{ translation('key_loading') }…</div> }>
                            <BasicTabDetails card="basic" formId={ DET_FORM_IDS.basic } staffType={ staffType } onSaved={ handleDone } onSavingChange={ setSaving } />
                        </Suspense>
                    </>
                ) : (
                    <>
                        <WkdDetCardHead title={ translation('key_basic') } status={ sectionStatus }>
                            { canEdit && (
                                <button type="button" className="g2-button wkd-det-headbtn" onClick={ () => setCard('basic') }>
                                    { translation('key_edit') }
                                </button>
                            ) }
                            { canSendTemplate && (
                                <WkdSendTemplate slug="basic" workerInfo={ d } workerInfoDetails={ d } buttonClassName="wkd-det-headbtn" />
                            ) }
                        </WkdDetCardHead>
                        <div className="wkd-det-sec">
                            <div className="det-grid">
                                <WkdReadField det label={ translation('key_surname') } value={ d.surname } required />
                                <WkdReadField det label={ translation('key_given_names') } value={ d.name } required />
                                <WkdReadField det label={ translation('key_name_in_chinese_if_applicable') } value={ d.chinese_name } />
                                <WkdReadField det label={ translation('key_maiden_surname') } value={ d.maiden_surname } />
                                <WkdReadField det label={ translation('key_alias_if_any') } value={ d.alias_name } />
                                <div aria-hidden="true" />
                                <WkdReadField det label={ translation('key_sex') } value={ genderLabel } required />
                                <WkdReadField det label={ translation('key_date_of_birth') } value={ d.date_of_birth ? dayjs(d.date_of_birth).format('DD/MM/YYYY') : '' } required />
                                <WkdReadField det label={ translation('key_place_of_birth') } value={ d.birth_place } />
                                <WkdReadField det label={ translation('key_place_of_origin') } value={ d.origin_place } />
                                <WkdReadField det label={ translation('key_marital_status_civil_status') } value={ maritalLabel } required />
                                <div aria-hidden="true" />
                                <WkdReadField det label={ translation('key_hkid') } value={ d.hk_id } mono />
                                <WkdReadField det label={ translation('key_nationality') } value={ d.nationality?.name || d.nationality_info?.name } required />
                                <WkdReadField det label={ translation('key_occupation') } value={ d.occupation } />
                            </div>
                        </div>
                        <div className="wkd-det-sec is-last">
                            <div className="det-grid">
                                <WkdReadField det label={ translation('key_wkr_present_address') } value={ d.primary_present_address?.address } span />
                                <WkdReadField det label={ translation('key_wkr_home_country_address') } hint="Permanent address in your home country" value={ d.primary_domicile_address?.address } span />
                                <WkdReadField det label={ translation('key_current_employer_name_if_applicable') } value={ d.current_employer_name } />
                                <WkdReadField det label={ translation('key_address_of_current_employer') } value={ d.current_employer_address_line_1 } />
                            </div>
                        </div>
                    </>
                ) }
            </div>

            <WkdOtherContactCard
                workerDetailTabInfo={ d }
                canEdit={ Boolean(canEdit) }
                editing={ card === 'other' }
                onEdit={ handleEditOther }
                edit={ otherContact }
            />

            <div className="g2-card wkd-det-card">
                <WkdDetCardHead title={ translation('key_work_experience') }>
                    { canEdit && card !== 'work' && (
                        <button type="button" className="g2-button wkd-det-headbtn" onClick={ () => setCard('work') }>
                            { translation('key_edit') }
                        </button>
                    ) }
                </WkdDetCardHead>
                <div className="wkd-det-sec is-last">
                    { card === 'work' ? (
                        <Suspense fallback={ <div>{ translation('key_loading') }…</div> }>
                            <BasicTabDetails card="work" formId={ DET_FORM_IDS.work } staffType={ staffType } onSaved={ handleDone } onSavingChange={ setSaving } />
                        </Suspense>
                    ) : workExperiences.length > 0 ? (
                        <div className="wkd-det-wxwrap">
                            <table className="wkd-det-wx">
                                <thead>
                                    <tr>
                                        <th className="mc-collabel">{ translation('key_employer_name') }</th>
                                        <th className="mc-collabel">{ translation('key_employer_address') }</th>
                                        <th className="mc-collabel">{ translation('key_start_date') }</th>
                                        <th className="mc-collabel">{ translation('key_end_date') }</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { workExperiences.map((wx, index) => (
                                        <tr key={ wx.id || index }>
                                            <td className="nm">{ wx.employer_name || '—' }</td>
                                            <td>{ wx.employer_address || '—' }</td>
                                            <td className="mono">{ fmtDate(wx.start_date) }</td>
                                            <td className="mono">{ fmtDate(wx.end_date) }</td>
                                        </tr>
                                    )) }
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="wkd-det-empty">{ translation('key_no_work_experience_recorded') }</div>
                    ) }
                </div>
            </div>

            { card === 'basic' && <WkdDetSaveBar formId={ DET_FORM_IDS.basic } onCancel={ handleDone } saving={ saving } /> }
            { card === 'work' && <WkdDetSaveBar formId={ DET_FORM_IDS.work } onCancel={ handleDone } saving={ saving } /> }
            { card === 'other' && <WkdDetSaveBar onSave={ otherContact.save } onCancel={ handleDone } saving={ otherContact.saving } /> }
        </div>
    );
};

WkdBasicTab.propTypes = {
    isWorkerPermissionAccessInfo: PropTypes.any,
    isAdmin: PropTypes.any,
    workerDetailTabInfo: PropTypes.object,
    staffType: PropTypes.string,
    sectionStatus: PropTypes.string,
};

export default React.memo(WkdBasicTab);
