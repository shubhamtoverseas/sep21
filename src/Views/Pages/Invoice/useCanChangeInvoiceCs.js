import { useSelector } from "react-redux";
import { getPermissionValue } from "../../../services/commonService";

/* Change Invoice CS is offered with invoice_change_cs, the key the Settings API enforces on change-other-cs-staff
   (conflicts sheet U-0223, ruling C4). An admin always has it (getPermissionValue answers 'y'). */
const useCanChangeInvoiceCs = () => {
    const permissionList = useSelector((state) => state.users?.permissionList);
    return getPermissionValue(permissionList?.data, 'invoice', 'invoice_change_cs') === 'y';
};

export default useCanChangeInvoiceCs;
