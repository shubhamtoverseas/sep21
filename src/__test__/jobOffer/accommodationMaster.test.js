/* eslint-env jest */
import React from "react";
import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import useJobOfferMasterLists from "../../Views/Pages/JobOfferPage/newui/editor/useJobOfferMasterLists";
import { fetchAccommodation, fetchMaritalStatus, fetchReligionList } from "../../redux/Slices/common/CommonSlice";

/* plain tracked functions, not jest.fn — CRA's resetMocks would strip factory implementations before the test runs */
jest.mock("../../redux/Slices/common/CommonSlice", () => {
    const mockTracked = (name) => {
        const fn = (...args) => { fn.calls.push(args); return { type: `test/${ name }`, payload: args[0] }; };
        fn.calls = [];
        return fn;
    };
    return {
        fetchAccommodation: mockTracked("accommodation"), fetchContractStatus: mockTracked("contractStatus"), fetchCookingList: mockTracked("cooking"),
        fetchCourseList: mockTracked("course"), fetchDayOffList: mockTracked("dayOff"), fetchEducationList: mockTracked("education"),
        fetchExpectedSalary: mockTracked("salary"), fetchFlexibleDate: mockTracked("flexible"), fetchMainSkills: mockTracked("skills"),
        fetchMaritalStatus: mockTracked("marital"), fetchPetList: mockTracked("pets"), fetchReligionList: mockTracked("religion"),
    };
});
jest.mock("../../redux/Slices/common/locations/LocationsSlice", () => ({ fetchLocations: () => ({ type: "test/locations" }) }));
jest.mock("../../redux/Slices/worker/WorkerSlice", () => ({ fetchWorkerRole: () => ({ type: "test/workerRole" }) }));
jest.mock("../../redux/Slices/common/nationalities/NationalitiesSlice", () => ({
    fetchWorkerNationalities: () => ({ type: "test/natWorker" }), getEmployerNationalityList: () => ({ type: "test/natEmp" }),
}));
jest.mock("../../redux/Slices/common/countries/CountriesSlice", () => ({ fetchCountries: () => ({ type: "test/countries" }) }));
jest.mock("../../redux/Slices/employer/EmployerSlice", () => ({ fetchSpokenLanguage: () => ({ type: "test/spoken" }) }));
jest.mock("../../redux/Slices/common/district/DistrictSlice", () => ({ fetchDistrictByCountryCode: () => ({ type: "test/district" }) }));

const state = {
    common: {
        flexibleDates: [], courseList: [], religionList: [], cookingList: [], contractStatus: [], maritalStatus: [],
        expectedSalaryList: [], dayOffList: [], educationList: [], mainSkills: [], accommodations: [], petList: [],
    },
    employer: { spokenLanguages: [] },
    worker: { workerRoles: [] },
    locations: { locations: [] },
    countries: { countries: [] },
    district: { districtsByCountryCode: [] },
    nationalities: { employerNationalities: [], workerNationalities: [] },
};
const Probe = () => { useJobOfferMasterLists(null); return null; };

/* The legacy editor called /get-accommodation with NO params; a `type: 'employer'` the rebuild added matched nothing
   server-side and left Helper's accommodation empty (user, 9 Nov). */
test("the accommodation master is fetched with no params (legacy /get-accommodation contract)", () => {
    const store = configureStore({ reducer: (s = state) => s });
    render(<Provider store={ store }><Probe /></Provider>);
    expect(fetchAccommodation.calls).toHaveLength(1);
    expect(fetchAccommodation.calls[0]).toHaveLength(0);
    /* the Preferences selects take the WORKER masters (All-Modules HTML, Shubham 9 Nov): religion carries
       Catholic / Hindu / Other, marital carries Widowed / Separated — the employer variants have neither */
    expect(fetchReligionList.calls).toEqual([[{ type: "worker" }]]);
    expect(fetchMaritalStatus.calls).toEqual([[{ type: "worker" }]]);
});
