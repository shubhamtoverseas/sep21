import React, { useEffect, useState, useCallback, useMemo, lazy, Suspense } from "react";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import { ShowToast } from "../../../../../../../components/show-toast/ShowToast";
import { WkdG2SectionHead, WkdG2UploadAudit } from "../../../newui/WkdG2PartnerNav";
const ActionLoader = lazy(() => import("../../../../../../../components/ReusableComponents/ActionLoader"));
const TabFooterActions = lazy(() => import("../../../../../../../components/tab-footer-actions/TabFooterActions"));
import { saveWorkerValidateStatus } from "../../../../../../../redux/Slices/worker/WorkerSlice";
import translation from "../../../../../../../utils/translation";
import { getStatusTransitionError, ptSectionStatusOptions } from "../../../statusTransition";
const initialCheckList = [
  { id: "Passport", name: translation('key_passport_never_applied'), isChecked: false },
  { id: "Indonesian-ID", name: translation('key_indonesian_id'), isChecked: false },
  { id: "Birth-Certificate", name: translation('key_birth_certificate'), isChecked: false },
  { id: "Family-Certificate", name: translation('key_family_certificate'), isChecked: false },
  { id: "Education-Certificate", name: translation('key_education_certificate'), isChecked: false },
];
const SubmitDocumentsTab = ({ activityLogList, status, workerDocumentUploadInfo, onRefreshStatus, updateStatus, isWorkerPermissionAccessInfo, isAdmin }) => {
  const dispatch = useDispatch();
  const [checkList, setCheckList] = useState(initialCheckList);

  useEffect(() => {
    let isMounted = true;
    if (workerDocumentUploadInfo?.worker_overseas_detail_info?.submit_document_completed) {
      if (isMounted) {
        setCheckList((prevCheckList) =>
          prevCheckList.map((item) => ({ ...item, isChecked: true }))
        );
      }
    }
    return () => { isMounted = false; };
  }, [workerDocumentUploadInfo]);

  const handleChangeStatus = useCallback((id) => {
    const transitionError = getStatusTransitionError(updateStatus, id, { strict: false });
    if (transitionError) {
      ShowToast("error", translation(transitionError));
      return true;
    }
    let payload = {
      worker_id: workerDocumentUploadInfo?.id,
      type: "submit_document",
      status_key: id
    };
    dispatch(saveWorkerValidateStatus(payload)).then((res) => {
      if (res?.payload?.status) {
        onRefreshStatus("submit-documents");
        ShowToast("success", res?.payload?.message);
      } else {
        ShowToast("error", res?.payload?.message);
      }
    });
  }, [updateStatus, workerDocumentUploadInfo?.id, dispatch, onRefreshStatus]);

  const handleCheckboxChange = useCallback((id) => {
    setCheckList((prevCheckList) =>
      prevCheckList.map((item) =>
        item.id === id ? { ...item, isChecked: !item.isChecked } : item
      )
    );
  }, []);

  const isVisibleChangeStatus = useMemo(() => {
    return (Array.isArray(isWorkerPermissionAccessInfo?.worker_indonesia_worker_assign_pt) && isWorkerPermissionAccessInfo.worker_indonesia_worker_assign_pt.includes('change_status') || isAdmin) ? true : false;
  }, [isWorkerPermissionAccessInfo?.worker_indonesia_worker_assign_pt, isAdmin]);

  const checkedCount = checkList.filter((item) => item.isChecked).length;
  const allChecked = checkedCount === checkList.length;

  return (
    <Suspense fallback={ <div>{ translation('key_loading') }...</div> }>
    <div className="e-registration-tab">
      <WkdG2SectionHead title={ translation('key_submit_document') } ready={ updateStatus === 'verified' }>
        <span className={ `wkd-g2-count${ allChecked ? ' done' : '' }` }>{ checkedCount } of { checkList.length } { translation('key_wkr_required_items_checked') }</span>
      </WkdG2SectionHead>
      <div className="wkd-g2sec-body">
      <div className="g2-checklist-list mb24">
        { checkList.map((item) => (
          <button
            key={ item.id }
            type="button"
            className={ `g2-check${ item.isChecked ? ' is-checked' : '' }` }
            aria-pressed={ item.isChecked }
            onClick={ () => handleCheckboxChange(item.id) }
          >
            <span className="g2-check-box">
              { item.isChecked && <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5" /></svg> }
            </span>
            <span className="lbl">{ item.name }</span>
          </button>
        )) }
      </div>
      <WkdG2UploadAudit logs={ activityLogList } />
      { (status === 'loading') ? <ActionLoader /> : <TabFooterActions
        handleChangeStatus={ handleChangeStatus }
        dropdownList={ ptSectionStatusOptions(updateStatus, { enableReady: allChecked }) }
          isVisibleSendTemplate={ false }
          isVisibleChangeStatus={ isVisibleChangeStatus }
      /> }

      </div>
    </div>
    </Suspense>
  );
};
SubmitDocumentsTab.propTypes = {
  activityLogList: PropTypes.any,
  status: PropTypes.string,
  workerDocumentUploadInfo: PropTypes.any,
  updateStatus: PropTypes.string,
  onRefreshStatus: PropTypes.func,
  isWorkerPermissionAccessInfo: PropTypes.any,
  isAdmin: PropTypes.any,
};
export default SubmitDocumentsTab;
