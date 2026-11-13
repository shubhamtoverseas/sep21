import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    fetchAgencyPricing, fetchOverseasPricing, saveAgencyPricing, saveOverseasPricing,
} from "../../../../../../redux/Slices/settings/price-list/PriceListSlice";
import { isAdminUser } from "../../../../../../services/commonService";
import { useConfigurationPermissions } from "../../../../../../utils/permissions/configurationPermissionUtils";
import usePriceListEditor from "../shared/usePriceListEditor";
import { buildAgencyPayload, buildOverseasPayload, savedAgency, savedOverseas } from "./overseasPricingConfig";

/* The server's rule for an Overseas, agency or Pricing countries save: the Conditional item View key and the Overseas
   Edit key (admins pass). */
export const useCanEditOverseas = () => {
    const { permissionList } = useSelector((state) => state.users);
    const permissions = useConfigurationPermissions(permissionList);
    return useMemo(
        () => isAdminUser() || Boolean(permissions?.canViewConditionalItemPrice && permissions?.canEditConditionalOverseasItemPrice),
        [permissions]
    );
};

/** Price List · Overseas (PL-S3): the nationality bases and the Overseas replacement %. */
export const useOverseasPricing = () => {
    const dispatch = useDispatch();
    const data = useSelector((state) => state.priceList.overseasPricing);
    const canEdit = useCanEditOverseas();
    const fetch = useCallback(() => dispatch(fetchOverseasPricing()), [dispatch]);
    const save = useCallback((body) => dispatch(saveOverseasPricing(body)), [dispatch]);
    return usePriceListEditor({ data, canEdit, fetch, save, toSaved: savedOverseas, toPayload: buildOverseasPayload });
};

/** One partner agency's schedule (PL-S3): No Overseas Experience and the skill supplements. */
export const useAgencyPricing = (agencyId) => {
    const dispatch = useDispatch();
    const stored = useSelector((state) => state.priceList.agencyPricing);
    /* the store holds the last schedule opened: never show another agency's values while this one loads */
    const data = stored?.agency?.id === agencyId ? stored : null;
    const canEdit = useCanEditOverseas();
    const fetch = useCallback(() => dispatch(fetchAgencyPricing(agencyId)), [dispatch, agencyId]);
    const save = useCallback((body) => dispatch(saveAgencyPricing({ agencyId, body })), [dispatch, agencyId]);
    return usePriceListEditor({ data, canEdit, fetch, save, toSaved: savedAgency, toPayload: buildAgencyPayload });
};
