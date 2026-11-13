import React, { useState, useCallback, lazy, Suspense } from "react";
import { useSelector } from "react-redux";
import PropTypes from 'prop-types';
import dayjs from "dayjs";
import WkdReadField from "./WkdReadField";
import WkdSendTemplate from "./WkdSendTemplate";
import WkdDetCardHead from "./WkdDetCardHead";
import WkdDetFileCard, { WkdDetFileAwaiting } from "./WkdDetFileCard";
import { indonesiaId } from "../../../../../../components/ReusableComponents/constants";
import translation from "../../../../../../utils/translation";
import { WKD_SEND_TEMPLATE_VERB } from "../../../workerModuleConstants";

const PassportTabDetails = lazy(() => import("../../details-tab-worker/passport-tab-details/PassportTabDetails"));

const FileSection = ({ title, url, uploadedAt, required, last }) => (
    <div className={ `wkd-det-sec${ last ? ' is-last' : '' }` }>
        <div className="wkd-det-filetitle">{ title }{ required && <>{ ' ' }<span className="req">*</span></> }</div>
        { url ? <WkdDetFileCard url={ url } uploadedAt={ uploadedAt } /> : <WkdDetFileAwaiting /> }
    </div>
);

FileSection.propTypes = {
    title: PropTypes.string.isRequired,
    url: PropTypes.string,
    uploadedAt: PropTypes.string,
    required: PropTypes.bool,
    last: PropTypes.bool,
};

const WkdPassportTab = ({ isWorkerPermissionAccessInfo, isAdmin, workerDetailTabInfo, sectionStatus }) => {
    const [mode, setMode] = useState('read');
    const workerDetailTabInfoPassport = useSelector((state) => state.worker.workerDetailTabInfoPassport);

    const passportPerm = Array.isArray(isWorkerPermissionAccessInfo?.worker_worker_passport_details) ? isWorkerPermissionAccessInfo.worker_worker_passport_details : [];
    const canEdit = passportPerm.includes('edit') || isAdmin;
    /* PERM 5.9 Passport · Send Template sub-verb; a partner sees it when their grid grants it (the modal keeps them in-app) */
    const canSendTemplate = passportPerm.includes(WKD_SEND_TEMPLATE_VERB) || isAdmin;
    const isIndonesian = workerDetailTabInfoPassport?.nationality?.id == indonesiaId;
    const handleDone = useCallback(() => setMode('read'), []);

    if (mode === 'edit') {
        return (
            <div className="det-body wkd-read-cards wkd-det-cards is-editing">
                <Suspense fallback={ <div>{ translation('key_loading') }…</div> }>
                    <PassportTabDetails
                        isWorkerPermissionAccessInfo={ isWorkerPermissionAccessInfo }
                        isAdmin={ isAdmin }
                        sectionStatus={ sectionStatus }
                        onSaved={ handleDone }
                        onCancel={ handleDone }
                    />
                </Suspense>
            </div>
        );
    }

    const d = workerDetailTabInfoPassport || {};
    const missing = sectionStatus === 'incomplete';

    return (
        <div className="det-body wkd-read-cards wkd-det-cards">
            <div className="g2-card wkd-det-card">
                <WkdDetCardHead title={ translation('key_passport') } status={ sectionStatus }>
                    { canEdit && (
                        <button type="button" className="g2-button wkd-det-headbtn" onClick={ () => setMode('edit') }>
                            { translation('key_edit') }
                        </button>
                    ) }
                    { canSendTemplate && (
                        <WkdSendTemplate slug="processing_passport" workerInfo={ d } workerInfoDetails={ workerDetailTabInfo } buttonClassName="wkd-det-headbtn" />
                    ) }
                </WkdDetCardHead>
                <FileSection title={ translation('key_passport_main_page') } url={ d.display_passport_main_page } uploadedAt={ d.passport_main_page_uploaded_at } />
                { isIndonesian && (
                    <FileSection title={ translation('key_passport_sign_page') } url={ d.display_passport_sign_page } uploadedAt={ d.passport_sign_page_uploaded_at } required />
                ) }
                <div className="wkd-det-sec is-last">
                    <div className="det-grid">
                        <WkdReadField det label={ translation('key_passport_no') } value={ d.passport_number } mono required={ missing } />
                        <WkdReadField det label={ translation('key_place_of_issue') } value={ d.passport_place_of_issue } required={ missing } />
                        <WkdReadField det label={ translation('key_passport_issue_date') } value={ d.passport_issue_date ? dayjs(d.passport_issue_date).format('DD/MM/YYYY') : '' } required={ missing } />
                        <WkdReadField det label={ translation('key_date_of_expiry') } value={ d.passport_expiry_date ? dayjs(d.passport_expiry_date).format('DD/MM/YYYY') : '' } required={ missing } />
                    </div>
                </div>
            </div>
        </div>
    );
};

WkdPassportTab.propTypes = {
    isWorkerPermissionAccessInfo: PropTypes.any,
    isAdmin: PropTypes.any,
    workerDetailTabInfo: PropTypes.object,
    sectionStatus: PropTypes.string,
};

export default React.memo(WkdPassportTab);
