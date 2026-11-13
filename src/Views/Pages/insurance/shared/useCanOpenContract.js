import { useCallback } from "react";
import { useSelector } from "react-redux";
import { canAccessProcessingDetails, getProcessingPermissions } from "../../../../utils/permissions/processingPermissionsUtils";

/* Whether the viewer can open a Contract record: the Contract record page's own arrival check (Processing Details View,
   owner / non-owner), with the contract id as that page reads it from its URL. A browser decision (owner ruling P6A-3,
   11 Nov 2026). Used wherever Insurance links a Contract: the dashboard column and the record's summary and Parties. */
const useCanOpenContract = () => {
    const permissionList = useSelector((state) => state.users?.permissionList);
    const ownerOnboardingList = useSelector((state) => state.users?.ownerOnboardingList);
    return useCallback(
        (contractId) => canAccessProcessingDetails(getProcessingPermissions(permissionList, ownerOnboardingList, String(contractId))),
        [permissionList, ownerOnboardingList]
    );
};

export default useCanOpenContract;
