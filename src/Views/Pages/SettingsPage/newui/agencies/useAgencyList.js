import { useCallback } from "react";
import { fetchAgencies } from "../../../../../redux/Slices/settings/agencies/AgenciesSlice";
import useSettingsList from "../useSettingsList";
import { AGENCY_VIEW_STATE_KEY } from "../settingsNewUiConstants";

const selectAgencyList = (state) => ({
    byId: state.agencies.agencies,
    order: state.agencies.agenciesOrder,
    totalPages: state.agencies.totalPages,
    total: state.agencies.totalAgencies,
    lastUpdated: state.agencies.lastUpdated,
});

const useAgencyList = () => {
    const fetchAction = useCallback((payload) => fetchAgencies(payload), []);
    return useSettingsList({ viewStateKey: AGENCY_VIEW_STATE_KEY, fetchAction, selectList: selectAgencyList });
};

export default useAgencyList;
