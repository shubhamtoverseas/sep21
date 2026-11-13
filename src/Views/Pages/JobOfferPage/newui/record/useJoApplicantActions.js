import { useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import useGcInterviewActions from "../../../Conversaction/newui/useGcInterviewActions";
import { unArchiveJobStage } from "../../../../../redux/Slices/common/interview/InterviewSlice";
import { getPermissionValue, showSuccessOrError } from "../../../../../services/commonService";
import routes from "../../../routes/routesConfig";
import { JO_ACTION } from "../../jobOfferConstants";

const useJoApplicantActions = ({ jobId, jobRef, employerId, employer, onRefresh, onGroupChat, workerDetailFor }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const permissionList = useSelector((state) => state.users.permissionList);
    const [interpreterRow, setInterpreterRow] = useState(null);

    const gc = useGcInterviewActions({ workerId: null, employerId, onRefresh });

    const reportFlags = useMemo(() => ({
        csNonOwner: getPermissionValue(permissionList?.data, 'jo_cs_non_owner', 'jo_cs_non_owner_interview_report'),
        interpreterNonOwner: getPermissionValue(permissionList?.data, 'worker_interpreter_onboarding_non_owner', 'worker_interpreter_onboarding_non_owner_interview_report'),
    }), [permissionList?.data]);

    const run = useCallback((actionId, row) => {
        switch (actionId) {
            case JO_ACTION.START_GROUP_CHAT:
                onGroupChat?.(row);
                return;
            case JO_ACTION.NEW_CONTRACT_INVOICE: {
                const detail = workerDetailFor?.(row) || {};
                navigate(`/${ routes.addContractInvoice }`, {
                    state: {
                        currentInvoiceWorker: { ...detail, worker_id: row.id, name: detail.fullname || row.name, chinese_name: "", contract_category: detail.contract_category_info?.id },
                        currentInvoiceEmployer: employer ? { ...employer, id: employer.employer_id } : { id: employerId, employer_id: employerId },
                        jobInfo: { id: row.id, job_id: row.job_id ?? jobId, job_stage_id: row.job_stage_id, reference_id: jobRef },
                    },
                });
                return;
            }
            case JO_ACTION.CHANGE_INTERPRETER:
                setInterpreterRow(row);
                return;
            case JO_ACTION.UNARCHIVE:
                dispatch(unArchiveJobStage({ job_stage_id: row.job_stage_id })).then((res) => {
                    showSuccessOrError(res);
                    if (!res?.error) onRefresh?.();
                });
                return;
            default:
                gc.requestAction(actionId, row, { jobId, jobRef });
        }
    }, [dispatch, navigate, gc, jobId, jobRef, employerId, employer, onRefresh, onGroupChat, workerDetailFor]);

    const closeInterpreter = useCallback(() => setInterpreterRow(null), []);

    return { ...gc, run, reportFlags, interpreterRow, closeInterpreter };
};

export default useJoApplicantActions;
