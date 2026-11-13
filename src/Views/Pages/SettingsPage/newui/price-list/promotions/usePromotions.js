import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPromotions, savePromotions } from "../../../../../../redux/Slices/settings/price-list/PriceListSlice";
import { isAdminUser } from "../../../../../../services/commonService";
import { useConfigurationPermissions } from "../../../../../../utils/permissions/configurationPermissionUtils";
import usePriceListEditor from "../shared/usePriceListEditor";
import { buildPromotionsPayload, promotionChanges, savedPromotions } from "./promotionsConfig";

/* every promotion is checked in its dialog before it reaches the draft, so the draft has nothing left to correct */
const nothingInvalid = () => [];

/**
 * Price List · Promotions (PL-S6): the saved promotions, a draft of them, Review changes, Save changes. The server's rule:
 * the Promotion View key, and the Promotion Edit key as well to save (admins pass).
 */
const usePromotions = () => {
    const dispatch = useDispatch();
    const data = useSelector((state) => state.priceList.promotions);
    const { permissionList } = useSelector((state) => state.users);
    const permissions = useConfigurationPermissions(permissionList);
    const canEdit = useMemo(
        () => isAdminUser() || Boolean(permissions?.canViewPromotion && permissions?.canEditPromotion),
        [permissions]
    );
    const fetch = useCallback(() => dispatch(fetchPromotions()), [dispatch]);
    const save = useCallback((body) => dispatch(savePromotions(body)), [dispatch]);
    const changesOf = useCallback((draft, saved) => promotionChanges(draft, saved, data), [data]);
    return usePriceListEditor({
        data, canEdit, fetch, save, toSaved: savedPromotions, toPayload: buildPromotionsPayload, changesOf, invalidOf: nothingInvalid,
    });
};

export default usePromotions;
