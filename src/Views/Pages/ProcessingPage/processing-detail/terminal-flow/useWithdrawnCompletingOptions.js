import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { getProcessingPermissions } from "../../../../../utils/permissions/processingPermissionsUtils";
import { canRunTerminalFlow, getCompletingStatusIds } from "./terminalFlowRules";
import { useContractLifecycle } from "../contractLifecycle";

/**
 * Withdraws the status options that would complete a Group 3/4 record (and so trigger End of Processing)
 * from users lacking the terminal-flow permission composition; every other option remains.
 */
const useWithdrawnCompletingOptions = (stage, statusList) => {
    const { contract_id } = useParams();
    const contractDetails = useSelector((state) => state.contracts.contractDetails);
    const { permissionList, ownerOnboardingList } = useSelector((state) => state.users);
    const lifecycle = useContractLifecycle(contractDetails);

    return useMemo(() => {
        if (!Array.isArray(statusList)) return statusList;
        const { stageActionPermission, isChangeStatusPermission } = getProcessingPermissions(permissionList, ownerOnboardingList, contract_id);
        if (canRunTerminalFlow({ stageActionPermission, isChangeStatusPermission })) return statusList;
        const completingIds = getCompletingStatusIds(stage, contractDetails, lifecycle);
        if (!completingIds.length) return statusList;
        return statusList.filter((item) => !completingIds.includes(item?.id));
    }, [stage, statusList, contractDetails, lifecycle, permissionList, ownerOnboardingList, contract_id]);
};

export default useWithdrawnCompletingOptions;
