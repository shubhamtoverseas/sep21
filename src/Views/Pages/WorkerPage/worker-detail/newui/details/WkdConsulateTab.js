import React, { useState, useCallback, lazy, Suspense } from "react";
import { useSelector } from "react-redux";
import PropTypes from 'prop-types';
import WkdReadField from "./WkdReadField";
import WkdSendTemplate from "./WkdSendTemplate";
import WkdDetCardHead from "./WkdDetCardHead";
import { indonesiaId, fillipinoId } from "../../../../../../components/ReusableComponents/constants";
import translation from "../../../../../../utils/translation";
import { WKD_SEND_TEMPLATE_VERB } from "../../../workerModuleConstants";

const ConsulatetTabDetails = lazy(() => import("../../details-tab-worker/consulate-tab-details/ConsulatetTabDetails"));

const WkdConsulateTab = ({ isWorkerPermissionAccessInfo, isAdmin, workerDetailTabInfo, sectionStatus }) => {
    const [mode, setMode] = useState('read');
    const workerDetailTabInfoConsulate = useSelector((state) => state.worker.workerDetailTabInfoConsulate);

    const consulatePerm = Array.isArray(isWorkerPermissionAccessInfo?.worker_worker_consulate_details) ? isWorkerPermissionAccessInfo.worker_worker_consulate_details : [];
    const canEdit = consulatePerm.includes('edit') || isAdmin;
    /* PERM 5.9 Consulate · Send Template sub-verb; a partner sees it when their grid grants it (the modal keeps them in-app) */
    const canSendTemplate = consulatePerm.includes(WKD_SEND_TEMPLATE_VERB) || isAdmin;
    /* the body kind comes from the basic info already loaded with the record (proto detConsulateKind), not from the
       consulate payload that is fetched only once this sub-tab is selected */
    const nationalityId = workerDetailTabInfo?.nationality?.id ?? workerDetailTabInfo?.nationality_id ?? workerDetailTabInfoConsulate?.nationality?.id;
    const kind = nationalityId == fillipinoId ? 'filipino' : nationalityId == indonesiaId ? 'indonesian' : 'deferred';
    const handleDone = useCallback(() => setMode('read'), []);

    if (mode === 'edit') {
        return (
            <div className="det-body wkd-read-cards wkd-det-cards is-editing">
                <Suspense fallback={ <div>{ translation('key_loading') }…</div> }>
                    <ConsulatetTabDetails
                        sectionStatus={ sectionStatus }
                        onSaved={ handleDone }
                        onCancel={ handleDone }
                    />
                </Suspense>
            </div>
        );
    }

    const doc = workerDetailTabInfoConsulate?.worker_cosulate_document || {};

    return (
        <div className="det-body wkd-read-cards wkd-det-cards">
            <div className="g2-card wkd-det-card">
                <WkdDetCardHead title={ translation('key_consulate') } status={ kind === 'deferred' ? null : sectionStatus }>
                    { canEdit && kind !== 'deferred' && (
                        <button type="button" className="g2-button wkd-det-headbtn" onClick={ () => setMode('edit') }>
                            { translation('key_edit') }
                        </button>
                    ) }
                    { canSendTemplate && kind !== 'deferred' && (
                        <WkdSendTemplate slug="consulate" workerInfo={ workerDetailTabInfoConsulate } workerInfoDetails={ workerDetailTabInfo } buttonClassName="wkd-det-headbtn" />
                    ) }
                </WkdDetCardHead>
                { kind === 'filipino' && (
                    <div className="wkd-det-sec is-last">
                        <div className="det-grid">
                            <WkdReadField det label={ translation('key_sss_no') } value={ doc.sss_number } mono required />
                            <WkdReadField det label={ translation('key_philhealth_no') } value={ doc.phill_health_number } mono required />
                            <WkdReadField det label={ translation('key_pag_ibig_no') } value={ doc.pag_ibig_number } mono required />
                            <WkdReadField det label={ translation('key_beneficiary_name') } value={ doc.beneficiary_name } required />
                            <WkdReadField det label={ translation('key_beneficiary_contact') } value={ doc.beneficiary_contact } required />
                            <WkdReadField det label={ translation('key_relationship_to_worker') } value={ doc.relationship_with_worker } required />
                            <WkdReadField det label={ translation('key_beneficiary_address') } value={ doc.beneficiary_address } span required />
                        </div>
                    </div>
                ) }
                { kind === 'indonesian' && (
                    <div className="wkd-det-sec is-last">
                        <div className="det-grid">
                            <WkdReadField det label={ translation('key_ktp') } value={ doc.ktp } mono required />
                            <WkdReadField det label={ translation('key_nama_suami') } value={ doc.nama_suami } required />
                            <WkdReadField det label={ translation('key_nama_ayah') } value={ doc.nama_ayah } required />
                            <WkdReadField det label={ translation('key_nama_ibu') } value={ doc.nama_ibu } required />
                        </div>
                    </div>
                ) }
                { kind === 'deferred' && (
                    <div className="wkd-consulate-deferred">
                        <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#c3cad4" strokeWidth="1.4" aria-hidden="true">
                            <path d="M3.5 2h6.5l2.5 2.5V15h-9zM6 6.8h4M6 9.3h4" />
                        </svg>
                        <span>{ translation('key_no_consulate_details_to_display') }</span>
                    </div>
                ) }
            </div>
        </div>
    );
};

WkdConsulateTab.propTypes = {
    isWorkerPermissionAccessInfo: PropTypes.any,
    isAdmin: PropTypes.any,
    workerDetailTabInfo: PropTypes.object,
    sectionStatus: PropTypes.string,
};

export default React.memo(WkdConsulateTab);
