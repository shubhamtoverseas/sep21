import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCountries } from "../../../../redux/Slices/common/countries/CountriesSlice";
import { fetchActiveBranches } from "../../../../redux/Slices/settings/branches/BranchesSlice";
import { useReferenceQuery } from "../../../../hooks/useReferenceQuery";
import translation from "../../../../utils/translation";
import usePrimaryLanguages from "./usePrimaryLanguages";
import { ALL_OPTION_VALUE, indexById, toOptionList } from "./employerDashboardConfig";
import { ACTIVE_BRANCH_PARAMS } from "./employerNewUiConstants";
import { MACAU_LOCATION_ID } from "../../../../components/ReusableComponents/constants";

/* DASH §3 exposure (audit L4 / L5 / P-06): the Location options are the actor's Access (Location) ticks, so a single-location
   actor never sees the control; the Branch list is Hong Kong's — "Macau is never a Branch" */
const useEmployerFilterOptions = (locationIds = [], accessLocations = null) => {
    const dispatch = useDispatch();
    const branches = useSelector((state) => state.branches.currentActiveBranches);
    /* U-0039: All + Cantonese · English · Mandarin (GET /get-primary-language) */
    const languages = usePrimaryLanguages();

    const { data: countries } = useReferenceQuery(
        ["ref", "countries", "employer"],
        () => dispatch(fetchCountries({ type: "employer" })).unwrap()
    );

    const scopedCountries = useMemo(() => {
        const list = Array.isArray(countries) ? countries : [];
        return accessLocations ? list.filter((country) => accessLocations.includes(Number(country.id))) : list;
    }, [countries, accessLocations]);

    /* branches follow the selected locations (else every location the actor may see), Macau excluded; nothing to
       request while the selection is Macau only — the control is withdrawn then */
    const selectedIds = Array.isArray(locationIds) && locationIds.length ? locationIds.map(Number) : scopedCountries.map((country) => Number(country.id));
    const branchCountryKey = selectedIds.filter((id) => id !== MACAU_LOCATION_ID).join(",");

    useEffect(() => {
        if (!branchCountryKey) return;
        dispatch(fetchActiveBranches({ ...ACTIVE_BRANCH_PARAMS, branch_country_code: branchCountryKey.split(",").map(Number) }));
    }, [dispatch, branchCountryKey]);

    const allOption = useMemo(() => ({ value: ALL_OPTION_VALUE, label: translation("key_all") }), []);

    const locationOptions = useMemo(() => [allOption, ...toOptionList(scopedCountries)], [allOption, scopedCountries]);
    const branchOptions = useMemo(() => [allOption, ...toOptionList(branches, "id", "branch_name")], [allOption, branches]);
    const languageOptions = useMemo(() => [allOption, ...toOptionList(languages)], [allOption, languages]);

    const branchesById = useMemo(() => indexById(branches), [branches]);

    return { locationOptions, branchOptions, languageOptions, branchesById };
};

export default useEmployerFilterOptions;
