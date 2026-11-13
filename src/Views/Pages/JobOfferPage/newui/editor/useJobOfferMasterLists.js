import { useEffect, useMemo } from "react";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import {
    fetchAccommodation, fetchContractStatus, fetchCookingList, fetchCourseList, fetchDayOffList, fetchEducationList, fetchExpectedSalary,
    fetchFlexibleDate, fetchMainSkills, fetchMaritalStatus, fetchPetList, fetchReligionList,
} from "../../../../../redux/Slices/common/CommonSlice";
import { fetchLocations } from "../../../../../redux/Slices/common/locations/LocationsSlice";
import { fetchWorkerRole } from "../../../../../redux/Slices/worker/WorkerSlice";
import { fetchWorkerNationalities, getEmployerNationalityList } from "../../../../../redux/Slices/common/nationalities/NationalitiesSlice";
import { fetchCountries } from "../../../../../redux/Slices/common/countries/CountriesSlice";
import { fetchSpokenLanguage } from "../../../../../redux/Slices/employer/EmployerSlice";
import { fetchDistrictByCountryCode } from "../../../../../redux/Slices/common/district/DistrictSlice";

/* the employer's ISO country code (districts, copy source): `location_info.country_code`; `employer.country_code` is the dialing code */
export const employerCountryCodeOf = (employer, countries) => employer?.location_info?.country_code
    || (Array.isArray(countries) ? countries.find((c) => c.code === employer?.country_code)?.country_code : undefined)
    || undefined;

const useJobOfferMasterLists = (employer) => {
    const dispatch = useDispatch();
    const common = useSelector((state) => ({
        flexibleDates: state.common.flexibleDates, courseList: state.common.courseList, religionList: state.common.religionList,
        cookingList: state.common.cookingList, contractStatus: state.common.contractStatus, maritalStatus: state.common.maritalStatus,
        expectedSalaryList: state.common.expectedSalaryList, dayOffList: state.common.dayOffList, educationList: state.common.educationList,
        mainSkills: state.common.mainSkills, accommodations: state.common.accommodations, petList: state.common.petList,
    }), shallowEqual);
    const spokenLanguages = useSelector((state) => state.employer.spokenLanguages);
    const workerRoles = useSelector((state) => state.worker.workerRoles);
    const locations = useSelector((state) => state.locations.locations);
    const countries = useSelector((state) => state.countries.countries);
    const districts = useSelector((state) => state.district.districtsByCountryCode);
    const { employerNationalities, workerNationalities } = useSelector((state) => ({
        employerNationalities: state.nationalities.employerNationalities, workerNationalities: state.nationalities.workerNationalities,
    }), shallowEqual);

    useEffect(() => {
        dispatch(fetchCookingList({ type: 'employer' }));
        dispatch(fetchFlexibleDate({ type: 'employer' }));
        dispatch(fetchSpokenLanguage({ type: 'worker' }));
        dispatch(fetchCountries({ type: 'employer' }));
        dispatch(fetchLocations({ type: 'worker' }));
        dispatch(fetchContractStatus({ type: 'employer' }));
        dispatch(fetchMainSkills({ type: 'employer' }));
        dispatch(fetchEducationList({ type: 'employer' }));
        dispatch(fetchCourseList({ type: 'employer' }));
        dispatch(fetchDayOffList({ type: 'employer' }));
        /* the Preferences selects describe the WORKER being sought, so they take the worker masters (All-Modules HTML,
           Shubham 9 Nov): religion gains Catholic / Hindu / Other, marital gains Widowed / Separated — same lists the
           worker biodata and Suggest filters already use */
        dispatch(fetchReligionList({ type: 'worker' }));
        dispatch(fetchMaritalStatus({ type: 'worker' }));
        dispatch(getEmployerNationalityList({ type: 'employer' }));
        dispatch(fetchWorkerNationalities({ type: 'worker' }));
        /* legacy JobOfferDetailsDropdowns called /get-accommodation with NO params — kept verbatim (the 9 Nov empty
           dropdown itself was backend: `share_room_equivalent` column missing on staging, sent to Priyanka) */
        dispatch(fetchAccommodation());
        dispatch(fetchPetList());
        dispatch(fetchWorkerRole());
        dispatch(fetchExpectedSalary());
    }, [dispatch]);

    const employerCountryCode = employerCountryCodeOf(employer, countries);
    useEffect(() => {
        if (employerCountryCode) dispatch(fetchDistrictByCountryCode(employerCountryCode));
    }, [dispatch, employerCountryCode]);

    return useMemo(() => ({
        ...common, spokenLanguages, workerRoles, locations, countries, districts, employerNationalities, workerNationalities, employerCountryCode,
    }), [common, spokenLanguages, workerRoles, locations, countries, districts, employerNationalities, workerNationalities, employerCountryCode]);
};

export default useJobOfferMasterLists;
