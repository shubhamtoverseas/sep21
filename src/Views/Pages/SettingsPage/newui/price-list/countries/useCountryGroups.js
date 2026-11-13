import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCountryGroups, saveCountryGroups } from "../../../../../../redux/Slices/settings/price-list/PriceListSlice";
import translation from "../../../../../../utils/translation";
import usePriceListEditor from "../shared/usePriceListEditor";
import { useCanEditOverseas } from "../overseas/useOverseasPricing";
import { buildCountryGroupsPayload, groupChanges, groupIssues, savedCountryGroups } from "./countryGroupsConfig";

/**
 * Price List · Pricing countries (PL-S4): the saved groups, a draft of them, Review changes, Save changes. Saved with
 * the Overseas Edit key, as the experience rates it groups are.
 */
const useCountryGroups = () => {
    const dispatch = useDispatch();
    const data = useSelector((state) => state.priceList.countryGroups);
    const canEdit = useCanEditOverseas();
    const fetch = useCallback(() => dispatch(fetchCountryGroups()), [dispatch]);
    const save = useCallback((body) => dispatch(saveCountryGroups(body)), [dispatch]);

    const countryName = useMemo(() => {
        const names = new Map((data?.countries || []).map((c) => [c.id, c.name]));
        return (id) => names.get(id) || String(id);
    }, [data]);
    const otherLabel = translation("key_pl_other_countries");
    /* the server refuses a group named like its Other row */
    const otherName = data?.other?.name || otherLabel;
    const changesOf = useCallback((draft, saved) => groupChanges(draft, saved, otherLabel, countryName), [otherLabel, countryName]);
    const invalidOf = useCallback((draft, saved) => groupIssues(draft, saved, otherName, countryName).map((issue) => issue.key), [otherName, countryName]);

    const pl = usePriceListEditor({
        data, canEdit, fetch, save, toSaved: savedCountryGroups, toPayload: buildCountryGroupsPayload, changesOf, invalidOf,
    });
    return { ...pl, countryName, otherName, otherLabel };
};

export default useCountryGroups;
