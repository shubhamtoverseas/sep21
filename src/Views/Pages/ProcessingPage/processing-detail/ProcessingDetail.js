import PropTypes from "prop-types";
import React, { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { showSuccessOrError } from "../../../../services/commonService";
import translation from "../../../../utils/translation";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { useProcessingPermissions } from "../../../../utils/permissions/processingPermissionsUtils";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import { EmbeddedContext } from "../../../../components/Processing/EmbeddedContext";
import {
  fetchProcessingActivityLog,
  fetchProcessingDetails,
  fetchProcessingStatusList,
  updateProcessingStatus,
  clearContractDocuments,
} from "../../../../redux/Slices/processing/ProcessingSlice";
import { fetchContractDetailsById } from "../../../../redux/Slices/contract/ContractSlice";
import { useIsProcessingContract } from "./contractLifecycle";

const ProcessingContractTab = lazy(() => import("./contract-tab/ProcessingContractTab"));
const ProcessingConsulateTab = lazy(() => import("./consulate-tab/ProcessingConsulateTab"));
const ProcessingImmigrationTab = lazy(() => import("./immigration-tab/ProcessingImmigrationTab"));
const ProcessingVisaTab = lazy(() => import("./visa-tab/ProcessingVisaTab"));
const ProcessingInsuranceTab = lazy(() => import("./insurance-tab/ProcessingInsuranceTab"));
const ProcessingDeploymentTab = lazy(() => import("./deployment-tab/ProcessingDeploymentTab"));
const ProcessingPreDepartureTab = lazy(() => import("./pre-departure-tab/ProcessingPreDepartureTab"));
const ProcessingMedicalTab = lazy(() => import("./medical-tab/ProcessingMedicalTab"));
const EVisaTab = lazy(() => import("./visa-tab/e-visa/EVisaTab"));

const ACTIVITY_FREE_TABS = ['deployment', 'pre-departure', 'visa'];
const STATUS_LIST_TABS = ['contract', 'consulate', 'immigration'];
const DETAILS_FREE_TABS = ['contract', 'consulate', 'immigration'];

/**
 * The stage panel of the Contract record (Progress tab): the selected stage's checklist / documents / status UI with
 * its permissions, rendered inside the record page. `stage` is the stage tab key; `onChanged` lets the record page
 * refresh its row after a stage mutation. The standalone Processing screen is retired (10 Oct workbook Contract #1).
 */
const ProcessingDetail = ({ stage, onChanged }) => {
  const dispatch = useDispatch();
  const { contract_id } = useParams();
  const { contractDetails } = useSelector((state) => state.contracts);
  const isProcessing = useIsProcessingContract(contractDetails);
  const { permissionList, ownerOnboardingList } = useSelector((state) => state.users);
  const { entityProcessingStatuses, processingDetails } = useSelector((state) => state.processing);
  const { stageActionPermission, isChangeStatusPermission } = useProcessingPermissions(permissionList, ownerOnboardingList, contract_id);

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [loadedTabs, setLoadedTabs] = useState({});
  const [activeTab, setActiveTab] = useState(null);
  const [processingTabActivities, setProcessingTabActivities] = useState([]);

  const fetchContractDetails = useCallback(() => (contract_id ? dispatch(fetchContractDetailsById(contract_id)) : Promise.resolve()), [dispatch, contract_id]);

  useEffect(() => {
    /* a new contract starts from empty stage documents and reloads its tab (CH 480) */
    dispatch(clearContractDocuments());
    setLoadedTabs({});
    setActiveTab(null);
    setIsPageLoading(true);
    fetchContractDetails().finally(() => setIsPageLoading(false));
  }, [dispatch, fetchContractDetails]);

  const reloadGlobalActivityList = useCallback(() => { if (onChanged) onChanged(); }, [onChanged]);

  const fetchTabData = useCallback(async (tab) => {
    if (!tab) return;
    try {
      const requests = [];
      if (!ACTIVITY_FREE_TABS.includes(tab)) {
        requests.push(dispatch(fetchProcessingActivityLog({ contract_id, type: tab })).then((res) => { if (res?.payload) setProcessingTabActivities(res.payload); }));
      }
      if (!DETAILS_FREE_TABS.includes(tab)) requests.push(dispatch(fetchProcessingDetails({ contract_id, type: tab })));
      if (STATUS_LIST_TABS.includes(tab)) requests.push(dispatch(fetchProcessingStatusList({ contract_id, type: tab })));
      await Promise.all(requests);
      setLoadedTabs((prev) => ({ ...prev, [tab]: true }));
    } catch {
      ShowToast("error", translation("key_something_went_wrong"));
    }
  }, [dispatch, contract_id]);

  /* the selected stage comes from the record page's rail */
  useEffect(() => {
    const next = stage || 'contract';
    if (next === activeTab) return;
    if (loadedTabs[next]) { setActiveTab(next); return; }
    let alive = true;
    fetchTabData(next).then(() => { if (alive) setActiveTab(next); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, fetchTabData]);

  /* returns the save so a stage panel can re-read its own details after the change (CH 470) */
  const onClickChangeStatus = useCallback((id) => (
    dispatch(updateProcessingStatus({ contract_id, type: activeTab, status: id })).then((res) => {
      showSuccessOrError(res);
      if (!res.error) {
        dispatch(fetchProcessingStatusList({ contract_id, type: activeTab }));
        dispatch(fetchContractDetailsById(contract_id));
        dispatch(fetchProcessingActivityLog({ contract_id, type: activeTab })).then((r) => { if (r?.payload) setProcessingTabActivities(r.payload); });
        reloadGlobalActivityList();
      }
      return res;
    })
  ), [dispatch, contract_id, activeTab, reloadGlobalActivityList]);

  const handleHandleFetchProcessingTabActivities = useCallback((tabName) => {
    dispatch(fetchProcessingActivityLog({ contract_id, type: 'visa', tab_name: tabName }))
      .then((res) => { if (res?.payload) setProcessingTabActivities(res.payload); })
      .catch(() => { ShowToast("error", translation("key_something_went_wrong")); });
  }, [dispatch, contract_id]);

  const renderActiveTabContent = useCallback(() => {
    if (!activeTab || !loadedTabs[activeTab]) return <CustomSpinner />;
    switch (activeTab) {
      case "contract":
        return (
          <Suspense fallback={ <CustomSpinner /> }>
            <div className="mcdt-embed-tab"><ProcessingContractTab embedded entityProcessingStatuses={ entityProcessingStatuses } handleOnChangeStatus={ onClickChangeStatus } activityLogList={ processingTabActivities } stageActionPermission={ stageActionPermission } /></div>
          </Suspense>
        );
      case "consulate":
        return (
          <Suspense fallback={ <CustomSpinner /> }>
            <div className="mcdt-embed-tab"><ProcessingConsulateTab entityProcessingStatuses={ entityProcessingStatuses } handleOnChangeStatus={ onClickChangeStatus } activityLogList={ processingTabActivities || [] } stageActionPermission={ stageActionPermission } /></div>
          </Suspense>
        );
      case "pre-departure":
        return <Suspense fallback={ <CustomSpinner /> }><ProcessingPreDepartureTab stageActionPermission={ stageActionPermission } reloadGlobalActivityList={ reloadGlobalActivityList } /></Suspense>;
      case "immigration":
        return (
          <Suspense fallback={ <CustomSpinner /> }>
            <div className="mcdt-embed-tab"><ProcessingImmigrationTab entityProcessingStatuses={ entityProcessingStatuses } handleOnChangeStatus={ onClickChangeStatus } stageActionPermission={ stageActionPermission } /></div>
          </Suspense>
        );
      case "medical":
        return (
          <Suspense fallback={ <CustomSpinner /> }>
            <div className="mcdt-embed-tab"><ProcessingMedicalTab processingDetails={ processingDetails || {} } activityLogList={ processingTabActivities } contractDetails={ contractDetails } stageActionPermission={ stageActionPermission } reloadGlobalActivityList={ reloadGlobalActivityList } /></div>
          </Suspense>
        );
      case "visa":
        return (
          <Suspense fallback={ <CustomSpinner /> }>
            { (contractDetails?.processing_group === 3 || contractDetails?.processing_group === 4)
              ? <div className="mcdt-embed-tab"><EVisaTab stageActionPermission={ stageActionPermission } contractDetails={ contractDetails } activityLogList={ processingTabActivities } reloadGlobalActivityList={ reloadGlobalActivityList } onFetchProcessingTabActivities={ handleHandleFetchProcessingTabActivities } isActive={ activeTab === 'visa' } /></div>
              : <ProcessingVisaTab contractDetails={ contractDetails } stageActionPermission={ stageActionPermission } activityLogList={ processingTabActivities } reloadGlobalActivityList={ reloadGlobalActivityList } onFetchProcessingTabActivities={ handleHandleFetchProcessingTabActivities } /> }
          </Suspense>
        );
      case "insurance":
        return (
          <Suspense fallback={ <CustomSpinner /> }>
            <div className="mcdt-embed-tab"><ProcessingInsuranceTab stageActionPermission={ stageActionPermission } reloadGlobalActivityList={ reloadGlobalActivityList } /></div>
          </Suspense>
        );
      case "deployment":
        return (
          <Suspense fallback={ <CustomSpinner /> }>
            <ProcessingDeploymentTab stageActionPermission={ stageActionPermission } isChangeStatusPermission={ isChangeStatusPermission } reloadGlobalActivityList={ reloadGlobalActivityList } />
          </Suspense>
        );
      default:
        return null;
    }
  }, [activeTab, loadedTabs, entityProcessingStatuses, onClickChangeStatus, processingTabActivities, stageActionPermission, contractDetails, processingDetails, reloadGlobalActivityList, handleHandleFetchProcessingTabActivities, isChangeStatusPermission]);


  if (isPageLoading) return <CustomSpinner />;

  return (
    <EmbeddedContext.Provider value={ true }><div className="tab-content mcdt-embed" data-stage-locked={ isProcessing ? undefined : "" }>{ renderActiveTabContent() }</div></EmbeddedContext.Provider>
  );
};

ProcessingDetail.propTypes = {
  stage: PropTypes.string,      // the stage tab to show (the Contract record's rail selection)
  onChanged: PropTypes.func,    // called after a stage mutation so the record page can refresh its row
};

export default ProcessingDetail;
