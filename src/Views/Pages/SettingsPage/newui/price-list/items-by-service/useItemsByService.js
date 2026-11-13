import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchItemsByService, saveItemsByService } from "../../../../../../redux/Slices/settings/price-list/PriceListSlice";
import usePriceListEditor from "../shared/usePriceListEditor";
import { useCanEditFixedItems } from "../fixed-items/useFixedItems";
import { buildItemsByServicePayload, ruleChanges, savedItemRules } from "./itemsByServiceConfig";

/* every rule is checked in the editor before it reaches the draft, so the draft has nothing left to correct */
const nothingInvalid = () => [];

/**
 * Price List · Items by service (PL-S5): the saved rules, a draft of them, Review changes, Save changes. Saved with the
 * Fixed item keys, as the catalogue items they apply.
 */
const useItemsByService = () => {
    const dispatch = useDispatch();
    const data = useSelector((state) => state.priceList.itemsByService);
    const canEdit = useCanEditFixedItems();
    const fetch = useCallback(() => dispatch(fetchItemsByService()), [dispatch]);
    const save = useCallback((body) => dispatch(saveItemsByService(body)), [dispatch]);
    return usePriceListEditor({
        data, canEdit, fetch, save, toSaved: savedItemRules, toPayload: buildItemsByServicePayload, changesOf: ruleChanges, invalidOf: nothingInvalid,
    });
};

export default useItemsByService;
