import React, { useState, useMemo, useCallback, useEffect, lazy, Suspense } from "react";
import { useDispatch } from "react-redux";
import PropTypes from 'prop-types';
import "../worker-detail.css";
import "../newui/wkd-details-tab.css";
import PreparationTabs from "../newui/WkdSubTabBar";
import { dispatchWithHandling } from "../../../../../utils/dispatchHandler";

// Lazy load tab detail components
const BasicTabDetails = lazy(() => import("../newui/details/WkdBasicTab"));
const PassportTabDetails = lazy(() => import("../newui/details/WkdPassportTab"));
const ConsulatetTabDetails = lazy(() => import("../newui/details/WkdConsulateTab"));
import { fetchWorkerDetailTabInfo, fetchWorkerDetailTabInfoPassport, fetchWorkerDetailTabInfoConsulate } from "../../../../../redux/Slices/worker/WorkerSlice";
import translation from "../../../../../utils/translation";
import { fillipinoId, indonesiaId } from "../../../../../components/ReusableComponents/constants";

/* PERM 5.9: every Details section is granted by the same `view` verb */
const canView = (perm) => Array.isArray(perm) && perm.includes('view');

const DetailsTabWorker = ({ worker_id, workerDetailTabInfo, isWorkerPermissionAccessInfo, isAdmin, staffType }) => {
    const dispatch = useDispatch();
    const [activeTab, setActiveTab] = useState('basic-tab');

    const handleSelect = useCallback((eventKey) => {
        setActiveTab(eventKey);
        if (eventKey == "passport-details") {
            dispatchWithHandling(dispatch, fetchWorkerDetailTabInfoPassport({
                "worker_id": worker_id,
                "type": "passport"
            }));
        }
        if (eventKey == "consulate-details") {
            dispatchWithHandling(dispatch, fetchWorkerDetailTabInfoConsulate({
                "worker_id": worker_id,
                "type": "consulate"
            }));
        }
        if (eventKey == "basic-tab") {
            dispatch(fetchWorkerDetailTabInfo({ "worker_id": worker_id, type: 'basic' }));
        }
    }, [dispatch, worker_id]);

    const detStat = useCallback((raw) => ((!raw || raw === 'in_complete') ? 'incomplete' : 'completed'), []);

    const isBasicStatus = useMemo(() => {
        if (workerDetailTabInfo && workerDetailTabInfo?.surname !== "" && workerDetailTabInfo?.surname !== null
            && workerDetailTabInfo?.name !== "" && workerDetailTabInfo?.name !== null
            && workerDetailTabInfo?.nationality !== "" && workerDetailTabInfo?.nationality !== null
            && workerDetailTabInfo?.date_of_birth !== "" && workerDetailTabInfo?.date_of_birth !== null
            && workerDetailTabInfo?.gender !== "" && workerDetailTabInfo?.gender !== null
        ) {
            return 'verified';
        }
        return 'in_complete';
    }, [workerDetailTabInfo]);

    const isConsulateDeferred = useMemo(() => {
        const nat = workerDetailTabInfo?.nationality?.id ?? workerDetailTabInfo?.nationality_id;
        return nat != null && nat !== fillipinoId && nat !== indonesiaId;
    }, [workerDetailTabInfo]);

    const tabs = useMemo(() => [
        {
            eventKey: 'basic-tab',
            visible: Boolean(isAdmin) || canView(isWorkerPermissionAccessInfo?.worker_worker_basic_details),
            title: translation('key_basic'),
            content: <Suspense fallback={ <div>{ translation('key_loading') }...</div> }><BasicTabDetails isWorkerPermissionAccessInfo={ isWorkerPermissionAccessInfo } isAdmin={ isAdmin } workerDetailTabInfo={ workerDetailTabInfo } staffType={ staffType } sectionStatus={ detStat(isBasicStatus) } /></Suspense>,
            status: detStat(isBasicStatus),
        },
        {
            eventKey: 'passport-details',
            visible: Boolean(isAdmin) || canView(isWorkerPermissionAccessInfo?.worker_worker_passport_details),
            title: translation('key_passport'),
            content: <Suspense fallback={ <div>{ translation('key_loading') }...</div> }><PassportTabDetails isWorkerPermissionAccessInfo={ isWorkerPermissionAccessInfo } isAdmin={ isAdmin } workerDetailTabInfo={ workerDetailTabInfo } sectionStatus={ detStat(workerDetailTabInfo?.passport_status) } /></Suspense>,
            status: detStat(workerDetailTabInfo?.passport_status),
        },
        {
            eventKey: 'consulate-details',
            visible: Boolean(isAdmin) || canView(isWorkerPermissionAccessInfo?.worker_worker_consulate_details),
            title: translation('key_consulate'),
            content: <Suspense fallback={ <div>{ translation('key_loading') }...</div> }><ConsulatetTabDetails isWorkerPermissionAccessInfo={ isWorkerPermissionAccessInfo } isAdmin={ isAdmin } workerDetailTabInfo={ workerDetailTabInfo } sectionStatus={ isConsulateDeferred ? null : detStat(workerDetailTabInfo?.consulate_status) } /></Suspense>,
            status: isConsulateDeferred ? 'deferred' : detStat(workerDetailTabInfo?.consulate_status),
        },
    ].filter((tab) => tab.visible), [isWorkerPermissionAccessInfo, isAdmin, workerDetailTabInfo, staffType, isBasicStatus, detStat, isConsulateDeferred]);

    /* the first allowed section becomes active when the current one is hidden */
    const effectiveTab = tabs.some((tab) => tab.eventKey === activeTab) ? activeTab : tabs[0]?.eventKey;
    useEffect(() => {
        if (effectiveTab && effectiveTab !== activeTab) handleSelect(effectiveTab);
    }, [effectiveTab, activeTab, handleSelect]);

    if (tabs.length === 0) {
        return (
            <div className="worder-detail-page">
                <div className="wkd-invalid-entry wkd-det-hidden" role="status">
                    <div>
                        <span className="mark">!</span>
                        <h2>{ translation('key_wkr_details_is_hidden_by_permissions') }</h2>
                        <p>{ translation('key_wkr_no_details_section_is_granted_to_this') }</p>
                    </div>
                </div>
            </div>
        );
    }

    return <div className="worder-detail-page">
        <PreparationTabs tabs={ tabs } activeKey={ effectiveTab } onSelect={ handleSelect } />
    </div>
}

DetailsTabWorker.propTypes = {
    worker_id: PropTypes.any,
    workerDetailTabInfo: PropTypes.object,
    isWorkerPermissionAccessInfo: PropTypes.any,
    isAdmin: PropTypes.any,
    staffType: PropTypes.string
}
export default DetailsTabWorker;
