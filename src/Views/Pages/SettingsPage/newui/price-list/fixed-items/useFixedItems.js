import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchFixedItems, saveFixedItems } from "../../../../../../redux/Slices/settings/price-list/PriceListSlice";
import { isAdminUser } from "../../../../../../services/commonService";
import { useConfigurationPermissions } from "../../../../../../utils/permissions/configurationPermissionUtils";
import usePriceListEditor from "../shared/usePriceListEditor";
import { buildFixedItemsPayload, fixedItemChanges, savedFixedItems } from "./fixedItemsConfig";

/* every change is checked in its dialog before it reaches the draft, so the draft has nothing left to correct */
const nothingInvalid = () => [];

/** The server's rule for the Fixed items keys (Items by service uses the same): View, and Edit as well to save. */
export const useCanEditFixedItems = () => {
    const { permissionList } = useSelector((state) => state.users);
    const permissions = useConfigurationPermissions(permissionList);
    return useMemo(
        () => isAdminUser() || Boolean(permissions?.canViewFixedItemPrice && permissions?.canEditFixedItemPrice),
        [permissions]
    );
};

/**
 * Price List · Fixed items (PL-S5): the saved catalogue, a draft of it, Review changes, Save changes.
 */
const useFixedItems = () => {
    const dispatch = useDispatch();
    const data = useSelector((state) => state.priceList.fixedItems);
    const canEdit = useCanEditFixedItems();
    const fetch = useCallback(() => dispatch(fetchFixedItems()), [dispatch]);
    const save = useCallback((body) => dispatch(saveFixedItems(body)), [dispatch]);
    return usePriceListEditor({
        data, canEdit, fetch, save, toSaved: savedFixedItems, toPayload: buildFixedItemsPayload, changesOf: fixedItemChanges, invalidOf: nothingInvalid,
    });
};

export default useFixedItems;
