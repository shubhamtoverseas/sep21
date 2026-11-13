import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchLocalPricing, saveLocalPricing } from "../../../../../../redux/Slices/settings/price-list/PriceListSlice";
import { isAdminUser } from "../../../../../../services/commonService";
import { useConfigurationPermissions } from "../../../../../../utils/permissions/configurationPermissionUtils";
import usePriceListEditor from "../shared/usePriceListEditor";
import { buildSavePayload, savedValues } from "./localPricingConfig";

/**
 * Price List · Local (PL-S1, PL-S2): the saved schedule, an edit draft over it, Review changes, Save changes.
 * Edit is offered on the server's rule for a save: the Local View and Edit keys (admins pass).
 */
const useLocalPricing = () => {
    const dispatch = useDispatch();
    const data = useSelector((state) => state.priceList.localPricing);
    const { permissionList } = useSelector((state) => state.users);
    const permissions = useConfigurationPermissions(permissionList);
    const canEdit = useMemo(
        () => isAdminUser() || Boolean(permissions?.canViewConditionalLocalItemPrice && permissions?.canEditConditionalLocalItemPrice),
        [permissions]
    );
    const fetch = useCallback(() => dispatch(fetchLocalPricing()), [dispatch]);
    const save = useCallback((body) => dispatch(saveLocalPricing(body)), [dispatch]);
    return usePriceListEditor({ data, canEdit, fetch, save, toSaved: savedValues, toPayload: buildSavePayload });
};

export default useLocalPricing;
