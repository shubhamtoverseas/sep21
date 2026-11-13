import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCountries } from "../../../../../redux/Slices/common/countries/CountriesSlice";
import { fetchMappingBranches } from "../../../../../redux/Slices/settings/branches/BranchesSlice";
import { searchStaff } from "../../../../../redux/Slices/common/cs/CsSlice";
import { getActorLocationIds, getPermissionValue, isAdminUser, isDisabledCsOption } from "../../../../../services/commonService";
import { isMacauLocation, toOptionList } from "./jobOfferDashboardConfig";

const csv = (value) => (value ? String(value).split(',').map((v) => Number(v.trim())).filter((n) => !Number.isNaN(n)) : []);

const useJobOfferFilterOptions = (locationId) => {
    const dispatch = useDispatch();
    const countries = useSelector((state) => state.countries.countries);
    const mappingBranches = useSelector((state) => state.branches.mappingBranches);
    const staffList = useSelector((state) => state.cs.staffList);
    const permissionList = useSelector((state) => state.users.permissionList);
    const isAdmin = useMemo(() => isAdminUser(), []);

    useEffect(() => {
        dispatch(fetchCountries({ type: 'employer' }));
        dispatch(searchStaff({ type: 'cs', branch_id: [] }));
    }, [dispatch]);

    useEffect(() => {
        if (locationId && !isMacauLocation(locationId)) {
            dispatch(fetchMappingBranches({ branch_country_code: locationId, module_key: 'jo', agency_type: 'host' }));
        }
    }, [dispatch, locationId]);

    const actorLocationIds = useMemo(() => getActorLocationIds(), []);
    const locationOptions = useMemo(
        () => (countries || []).filter((c) => actorLocationIds.includes(c.id)).map((c) => ({ value: String(c.id), label: c.name })),
        [countries, actorLocationIds]
    );

    const allowedBranchIds = useMemo(() => csv(getPermissionValue(permissionList?.data, 'jo', 'jo_global_branch')), [permissionList?.data]);
    const branchOptions = useMemo(() => {
        if (!locationId || isMacauLocation(locationId)) return [];
        const list = Array.isArray(mappingBranches) ? mappingBranches : [];
        return toOptionList(isAdmin || !allowedBranchIds.length ? list : list.filter((b) => allowedBranchIds.includes(Number(b.id))));
    }, [mappingBranches, locationId, isAdmin, allowedBranchIds]);
    const branchesById = useMemo(() => (Array.isArray(mappingBranches) ? Object.fromEntries(mappingBranches.map((b) => [String(b.id), b])) : {}), [mappingBranches]);

    const allowedStatusIds = useMemo(() => csv(getPermissionValue(permissionList?.data, 'jo', 'jo_global_status')), [permissionList?.data]);

    const csPermission = getPermissionValue(permissionList?.data, 'jo', 'jo_global_cs');
    const csOptions = useMemo(
        () => (Array.isArray(staffList) ? staffList.filter((staff) => !isDisabledCsOption(staff, csPermission)).map((staff) => ({ value: String(staff.id), label: staff.name })) : []),
        [staffList, csPermission]
    );
    const showCsFilter = isAdmin || Boolean(csPermission);

    return { locationOptions, branchOptions, branchesById, allowedStatusIds, csOptions, showCsFilter, isAdmin };
};

export default useJobOfferFilterOptions;
