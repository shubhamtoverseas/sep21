import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense, memo } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from "prop-types";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import dayjs from "dayjs";
import { fetchLocations } from "../../../../../../redux/Slices/common/locations/LocationsSlice";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import CustomSpinner from "../../../../../../components/ReusableComponents/CustomSpinner";
import constData, { workerMinAgeByNationalityId } from "../../../../../../components/ReusableComponents/constants";
import { fetchDistrictByCountryCode } from "../../../../../../redux/Slices/common/district/DistrictSlice";
import {
    fetchContractStatus,
    fetchCookingList,
    fetchCourseList,
    fetchDayOffList,
    fetchEducationList,
    fetchGetGenderList,
    fetchInterviewDayList,
    fetchMainSkills,
    fetchMaritalStatus,
    fetchReligionList,
} from "../../../../../../redux/Slices/common/CommonSlice";
import { workerBioProfileState } from "../../../../../../components/ReusableComponents/form-states";
import { validateAddBioWorker, validateAddBioOverseasWorker } from '../../formValidation'
import { changeDynamicDateFormate } from "../../../../../../utils/utils"
import { fetchWorkerRole, saveWorkerBiodataSlice, fetchWorkerCanStartDate, fetchWorkerCommonDetailInfo, fetchWorkerJobStatus, fetchWorkerDetailTabInfo, fetchWorkerValidateStatus, fetchWorkerActivityLog } from "../../../../../../redux/Slices/worker/WorkerSlice";
import { fetchWorkerNationalities, getEmployerNationalityList } from "../../../../../../redux/Slices/common/nationalities/NationalitiesSlice";
import WkdStatusChip from "../../newui/WkdStatusChip";
import BioCheckGrid from "./BioCheckGrid";
import BioDateInput from "./BioDateInput";
import { emptySel } from "./BioCard";
import { DOC_STATUS_META, EARLIEST_START_MAX_YEARS, BIODATA_EXPERIENCE_YEARS, WORKER_MIN_AGE_MESSAGE_KEYS, WORKER_DEFAULT_MIN_AGE, STALE_VERSION_CODE } from "../../../workerModuleConstants";
import {
    fetchHeghtList,
    fetchChildCareAgeList, fetchHouseholdChores, fetchElderlyCareDuties, fetchChildCareDuties
} from "../../../../../../redux/Slices/common/CommonSlice";
import { fetchCountries, fetchCountriesWorkerBiodata } from "../../../../../../redux/Slices/common/countries/CountriesSlice";
import { showSuccessOrError } from "../../../../../../services/commonService";
import SubmitSpinnerButton from "../../../../../../components/ReusableComponents/SubmitSpinnerButton";
import translation from "../../../../../../utils/translation";
import { getcurrentcontractexp, isEmptyCurrentContract, isMacauCountry } from "../../../../../../services/workerBiodataService";
import { fetchSpokenLanguage } from "../../../../../../redux/Slices/employer/EmployerSlice";
import { fetchMappingBranches } from "../../../../../../redux/Slices/settings/branches/BranchesSlice";

// Lazy loaded components
const BasicPrimaryProfileDetailsForm = lazy(() => import("./BasicPrimaryProfileDetailsForm"));
const FamilyBioDataForm = lazy(() => import("./FamilyBiodataForm"));
const EducationBioDataForm = lazy(() => import("./EducationBioDataForm"));
const MainSkillsBiodataForm = lazy(() => import("./MainSkillsBiodataForm"));
const CookingBiodataForm = lazy(() => import("./CookingBiodataForm"));
const WorkExperienceBiodataForm = lazy(() => import("./WorkExperienceBiodataForm"));
const ExpectationsBiodataForm = lazy(() => import("./ExpectationsBiodataForm"));

/* Yes / No / Consider answers and the family counts: an empty store is an unanswered question (WORKER.md Step 9) */
const UNANSWERED_STAYS_EMPTY_KEYS = ['care_newborn', 'care_disability', 'share_work', 'reference_letter', 'share_room', 'care_elderly', 'children_count', 'siblings_count'];
/* U-0208: the stored Day Off ids — the multi list when the record carries one, else the legacy single value */
const workerDayOffIds = (w) => {
    if (Array.isArray(w?.day_off_list_info) && w.day_off_list_info.length) return w.day_off_list_info.map((d) => d?.id).filter((id) => id != null);
    if (Array.isArray(w?.day_off_ids) && w.day_off_ids.length) return w.day_off_ids.map(Number).filter((n) => !Number.isNaN(n));
    const single = w?.day_off?.id ?? w?.day_off;
    return single === '' || single === null || single === undefined ? [] : [Number(single)];
};
const BiodataForm = ({ onClose, workerDetail, statusData, focusSection }) => {
    /* W-23: the version a 409 STALE_VERSION handed back — the next Save carries it (null = use the record's) */
    const [serverVersion, setServerVersion] = useState(null);
    /* per-card Edit: scroll the matching section into view and mark it with the blue inset rail */
    const focusRef = useRef(false);
    useEffect(() => {
        if (!focusSection || focusRef.current) return;
        /* "work-<id>" rails that one record (Current Contract / Work Experience N); the rest rail the section */
        const isWork = focusSection.startsWith('work-');
        const el = (isWork && document.querySelector(`[data-we-record="${ focusSection.slice(5) }"]`))
            || document.querySelector(`[data-bio-section="${ isWork ? 'work' : focusSection }"]`);
        if (!el) return;
        focusRef.current = true;
        el.setAttribute('data-mc-edit-focus', '1');
        setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
    });
    const dispatch = useDispatch();
    const [updateWorkExperience, setUpdateWorkExperience] = useState([]);
    const [canStartdateFormData, setCanStartdateFormData] = useState({ type: workerDetail?.type, contract_status: workerDetail?.contract_status, early_release_date: workerDetail?.early_release_date, visa_expiry_date: workerDetail?.visa_expiry_date, contract_end_date: workerDetail?.contract_end_date });
    const [loading, setLoading] = useState(true);
    const [contractStatusId, setContractStatusId] = useState("");
    const [contractEndDateId, setContractEndDateId] = useState("");
    const [earlyReleaseDate, setEarlyReleaseDate] = useState(false);
    const [selectedChildCareDuties, setSelectedChildCareDuties] = useState([]);
    const [selectedElderlyCareDuties, setSelectedElderlyCareDuties] = useState([]);
    const [selectedHouseholdChores, setSelectedHouseholdChores] = useState([]);
    const [mainSkillsList, setMainSkillsList] = useState([]);
    const [newContractStatus, setNewContractStatus] = useState([]);
    const [oldContractStatus, setOldContractStatus] = useState([]);

    const locations = useSelector((state) => state.locations.locations);
    const religionList = useSelector((state) => state.common.religionList);
    const maritalStatus = useSelector((state) => state.common.maritalStatus);
    const educationList = useSelector((state) => state.common.educationList);
    const mainSkills = useSelector((state) => state.common.mainSkills);
    const courseList = useSelector((state) => state.common.courseList);
    const cookingList = useSelector((state) => state.common.cookingList);
    const dayOffList = useSelector((state) => state.common.dayOffList);
    const interviewDayList = useSelector((state) => state.common.interviewDayList);
    const genderList = useSelector((state) => state.common.genderList);
    const heightList = useSelector((state) => state.common.heightList);
    const childCareAgeList = useSelector((state) => state.common.childCareAgeList);
    const childCareDuties = useSelector((state) => state.common.childCareDuties);
    const elderlyCareDuties = useSelector((state) => state.common.elderlyCareDuties);
    const householdChores = useSelector((state) => state.common.householdChores);
    const workerRoles = useSelector((state) => state.worker.workerRoles);
    const workerJobStatus = useSelector((state) => state.worker.workerJobStatus);
    // const workerStartDate = useSelector((state) => state.worker.workerStartDate);
    const spokenLanguages = useSelector((state) => state.employer.spokenLanguages);
    const mappingBranches = useSelector((state) => state.branches.mappingBranches);
    const workerNationalities = useSelector((state) => state.nationalities.workerNationalities);
    const employerNationalities = useSelector((state) => state.nationalities.employerNationalities);
    const districtsByCountryCode = useSelector((state) => state.district.districtsByCountryCode);
    const countriesBiodata = useSelector((state) => state.countries.countriesBiodata);
    const countries = useSelector((state) => state.countries.countries);

    const lookupListsRef = useRef({});
    useEffect(() => {
        lookupListsRef.current = {
            countriesBiodata, workerJobStatus, heightList, locations, workerRoles,
            workerNationalities, religionList, maritalStatus, mainSkills, educationList,
            courseList, cookingList, employerNationalities, dayOffList, interviewDayList,
            spokenLanguages, genderList, childCareAgeList, childCareDuties,
            elderlyCareDuties, householdChores
        };
    });

    useEffect(() => {
        const fetchData = async () => {
            const lists = lookupListsRef.current;
            setLoading(true);
            const promises = [];
            promises.push(
                dispatch(fetchContractStatus({ type: 'worker' })).then((res) => {
                    if (!res?.error) {
                        setOldContractStatus(res?.payload?.data);
                        setNewContractStatus(res?.payload?.data);
                    }
                    return res;
                })
            );
            // if (!countriesAll?.length) promises.push(dispatch(fetchCountriesAll({ type: "worker" })));
            if (!lists.countriesBiodata?.length) promises.push(dispatch(fetchCountriesWorkerBiodata({ type: "worker" })));
            if (!lists.workerJobStatus?.length) promises.push(dispatch(fetchWorkerJobStatus()));
            promises.push(dispatch(fetchCountries({ type: workerDetail?.type === 2 ? 'overseas_working_in' : "employer" })));
            if (!lists.heightList?.length) promises.push(dispatch(fetchHeghtList()));
            if (!lists.locations?.length) promises.push(dispatch(fetchLocations({ type: "worker" })));
            // if (!contractStatus?.length) promises.push(dispatch(fetchContractStatus({ type: "worker" })));
            if (!lists.workerRoles?.length) promises.push(dispatch(fetchWorkerRole({ type: "worker" })));
            if (!lists.workerNationalities?.length) promises.push(dispatch(fetchWorkerNationalities({ type: "worker" })));
            if (!lists.religionList?.length) promises.push(dispatch(fetchReligionList({ type: "worker" })));
            if (!lists.maritalStatus?.length) promises.push(dispatch(fetchMaritalStatus({ type: "worker" })));
            if (!lists.mainSkills?.length) promises.push(dispatch(fetchMainSkills({ type: "worker" })));
            if (!lists.educationList?.length) promises.push(dispatch(fetchEducationList({ type: "worker" })));
            if (!lists.courseList?.length) promises.push(dispatch(fetchCourseList({ type: "worker" })));
            if (!lists.cookingList?.length) promises.push(dispatch(fetchCookingList({ type: "worker" })));
            if (!lists.employerNationalities?.length) promises.push(dispatch(getEmployerNationalityList({ type: "employer" })));
            if (!lists.dayOffList?.length) promises.push(dispatch(fetchDayOffList({ type: "worker" })));
            if (!lists.interviewDayList?.length) promises.push(dispatch(fetchInterviewDayList({ type: "worker" })));
            if (!lists.spokenLanguages?.length) promises.push(dispatch(fetchSpokenLanguage({ type: "worker" })));
            if (!lists.genderList?.length) promises.push(dispatch(fetchGetGenderList({ type: "worker" })));
            if (!lists.childCareAgeList?.length) promises.push(dispatch(fetchChildCareAgeList({ type: "worker" })));
            if (!lists.childCareDuties?.length) promises.push(dispatch(fetchChildCareDuties({ type: "worker" })));
            if (!lists.elderlyCareDuties?.length) promises.push(dispatch(fetchElderlyCareDuties({ type: "worker" })));
            if (!lists.householdChores?.length) promises.push(dispatch(fetchHouseholdChores({ type: "worker" })));
            try {
                await Promise.allSettled(promises);
            } catch (error) {
                console.error("Error fetching data:", error);
                ShowToast('error', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [dispatch, workerDetail?.type]);

    const {
        handleSubmit,
        setError,
        clearErrors,
        setValue,
        control,
        register,
        getValues,
        watch,
        formState: { errors },
    } = useForm({
        resolver: yupResolver(workerDetail?.type === 1 ? validateAddBioWorker : validateAddBioOverseasWorker),
        defaultValues: workerBioProfileState,
    });

    useEffect(() => {
        let experienceState = workerDetail?.experience &&
            workerDetail?.experience.length > 0 &&
            workerDetail?.experience
                .map((experience) => {
                    return {
                        ...experience,
                        spoken_language: experience?.spoken_language_info?.length > 0
                            ? String(experience.spoken_language_info[0].id)
                            : (experience?.spoken_language ? String(experience.spoken_language) : ''),
                        main_duties: (experience?.duty) ? experience?.duty.map(o => o.duty_id) : [],
                        cooking: (experience?.cooking_info) ? experience?.cooking_info.map(o => o.id) : [],
                        duty: (experience?.duty) ? experience?.duty.map(o => o.duty) : [],
                        district_id: experience.district_id ? experience.district_id : "",
                        action: "edit"
                    };
                }).sort((a, b) => new Date(b.end_date) - new Date(a.end_date));

        if (experienceState) {
            // experienceState[0].contract_status = workerDetail?.contract_status;
            setUpdateWorkExperience(experienceState);
        }

    }, [workerDetail, setValue]);

    useEffect(() => {
        if (workerDetail?.current_location?.id) {
            dispatch(
                fetchMappingBranches({
                    module_key: "processing",
                    branch_country_code: workerDetail.current_location.id,
                })
            );
        }
    }, [dispatch, workerDetail?.current_location?.id]);

    useEffect(() => {
        const household_chores_id = workerDetail?.household_chores_id;
        const household_chores_ids = household_chores_id
            ? household_chores_id.split(',').map(Number)
            : [];
        setSelectedHouseholdChores(household_chores_ids);

        const elderly_care_duty_id = workerDetail?.elderly_care_duty_ids;
        const elderly_care_duty_ids = elderly_care_duty_id
            ? elderly_care_duty_id.split(',').map(Number)
            : [];
        setSelectedElderlyCareDuties(elderly_care_duty_ids);

        const child_care_duty_id = workerDetail?.child_care_duty_ids;
        const child_care_duty_ids = child_care_duty_id
            ? child_care_duty_id.split(',').map(Number)
            : [];
        setSelectedChildCareDuties(child_care_duty_ids);

        const skills = workerDetail?.skills
            ? workerDetail?.skills.split(',').map(Number)
            : [];
        setMainSkillsList(skills);

    }, [dispatch, workerDetail]);

    useEffect(() => {
        if (workerDetail) {
            let earlyReleaseDate = null;
            let visaExpiryDate = null;
            Object.keys(workerBioProfileState).forEach((key) => {
                if (typeof workerDetail?.[key] === 'object' && workerDetail?.[key] !== null) {
                    setValue(key, workerDetail[key]?.id || null);
                } else {
                    if (key == "contract_can_start_date") {
                        if (workerDetail?.start_date) {
                            setValue("contract_can_start_date", changeDynamicDateFormate(workerDetail?.start_date, "MM/DD/YYYY"));
                        }
                    } else if (key == "contract_end_date") {
                        if (workerDetail?.contract_end_date) {
                            const formattedValue = changeDynamicDateFormate(workerDetail?.contract_end_date, "YYYY-MM-DD");

                            setValue("contract_end_date", formattedValue);
                            setContractEndDateId(formattedValue);
                        }
                    } else if (key == "visa_expiry_date") {
                        if (workerDetail?.visa_expiry_date) {
                            const formattedValue = changeDynamicDateFormate(workerDetail?.visa_expiry_date, "YYYY-MM-DD");
                            setValue("visa_expiry_date", formattedValue);
                            visaExpiryDate = formattedValue;
                        }
                    } else if (key === 'contract_status' &&
                        workerDetail?.contract_status &&
                        workerDetail?.contract_end_date && workerDetail?.type === 1) {
                        const selectedDate = new Date(workerDetail?.contract_end_date);
                        const currentDate = new Date();
                        if (selectedDate <= currentDate) {
                            dispatch(fetchContractStatus({ type: 'worker' })).then((res) => {
                                if (!res?.error) {
                                    setOldContractStatus(res?.payload?.data);
                                    setValue("contract_status", workerDetail?.contract_status);
                                    setContractStatusId(workerDetail?.contract_status);
                                    [1, 7].includes(workerDetail?.contract_status) && setValue("expect_released_early", '0');
                                }
                            });
                        } else if (selectedDate > currentDate) {
                            dispatch(fetchContractStatus({ type: 'worker' })).then((res) => {
                                if (!res?.error) {
                                    setNewContractStatus(res?.payload?.data);
                                    setValue("contract_status", workerDetail?.contract_status);
                                    setContractStatusId(workerDetail?.contract_status);
                                    [1, 7].includes(workerDetail?.contract_status) && setValue("expect_released_early", '0');
                                }
                            });
                        }
                    }
                    else if (key == "early_release_date") {
                        if (workerDetail?.early_release_date) {
                            const formattedValue = changeDynamicDateFormate(workerDetail?.early_release_date, "YYYY-MM-DD");
                            setValue("early_release_date", formattedValue);
                            earlyReleaseDate = formattedValue;
                        }
                    } else if (key == "date_of_birth") {
                        if (workerDetail?.date_of_birth) {
                            const ageDifMs = Date.now() - new Date(workerDetail?.date_of_birth).getTime();
                            const ageDate = new Date(ageDifMs);
                            const calculatedAge = Math.abs(ageDate.getUTCFullYear() - 1970);
                            setValue("age", calculatedAge)
                            setValue("date_of_birth", changeDynamicDateFormate(workerDetail?.date_of_birth, "MM-DD-YYYY"));
                        }
                    } if (key == "current_location") {
                        setValue("current_location", workerDetail?.[key]?.id || '');
                    } else if (key === 'day_off') {
                        /* conflict sheet U-0208: Day Off is multi — every stored day (day_off_ids / day_off_list_info), else the legacy single value */
                        setValue(key, workerDayOffIds(workerDetail));
                    } else if (key == "preferred_interview_locations") {
                        if (workerDetail?.type === 1) {
                            const value = workerDetail?.[key];
                            if (!value) {
                                setValue(key, [0]);
                            } else {
                                const parsedValue = typeof value === 'string'
                                    ? value.split(',').map(Number).filter(n => !isNaN(n))
                                    : [];
                                setValue(key, parsedValue);
                            }
                        } else {
                            setValue(key, []);
                        }

                    } else if (key == "spoken_language" ||
                        key === 'open_to_working_in' ||
                        key == "special_course" ||
                        key == "skills" ||
                        key == "interview_day" ||
                        key == 'cooking'
                    ) {
                        const value = workerDetail?.[key];
                        const parsedValue = typeof value === 'string'
                            ? value.split(',').map(Number).filter(n => !isNaN(n))
                            : [];
                        setValue(key, parsedValue);
                    } else if (key == "expect_released_early") {
                        if (workerDetail?.[key] == 1) {
                            setEarlyReleaseDate(true);
                        } else {
                            setEarlyReleaseDate(false);
                        }
                        setValue(key, workerDetail?.[key] || '0');
                    } else if (key === 'earliest_can_start_date') {
                        setValue(key, workerDetail?.[key] ? changeDynamicDateFormate(workerDetail?.[key], "YYYY-MM-DD") : null);
                    } else if (UNANSWERED_STAYS_EMPTY_KEYS.includes(key)) {
                        /* WORKER.md Step 9: nothing stored means unanswered — never defaulted to "No" / 0 */
                        setValue(key, workerDetail?.[key] ?? '');
                    } else if (key == "age_of_elder") {
                        setValue(key, workerDetail?.[key] || 0);
                    } else if (key == "oldest_child_age") {
                        setValue(key, workerDetail?.[key] || 0);
                    } else if (key == "child_care_age_ids") {
                        const child_care_age_id = workerDetail?.['child_care_age_ids'];
                        const child_care_age_ids = child_care_age_id
                            ? child_care_age_id.split(',').map(Number)
                            : [];
                        setValue(key, child_care_age_ids);
                    } else {
                        setValue(key, workerDetail?.[key] || '');
                    }
                }
            });
            // validate if early_release_date is before visa_expiry_date
            if (earlyReleaseDate && visaExpiryDate) {
                if (new Date(earlyReleaseDate) >= new Date(visaExpiryDate)) {
                    setError("early_release_date", {
                        type: "manual",
                        message: translation('key_early_release_date_less_than_visa_expiry_date')
                    });
                }
            }
        }
    }, [setValue, workerDetail, setError, dispatch, getValues, clearErrors]);

    const getDistrictList = useCallback((countryCode) => {
        if (countryCode && countryCode === "HK") {
            dispatch(fetchDistrictByCountryCode(countryCode));
        }
    }, [dispatch]);

    useEffect(() => {
        if (workerDetail?.current_location?.id) {
            // Find the country details from countriesBiodata
            const selectedCountry = countriesBiodata?.find(
                country => country.id === workerDetail.current_location.id
            );

            if (selectedCountry?.country_code === "HK" || selectedCountry?.country_code === "MO") {
                getDistrictList(selectedCountry.country_code);
            }
        }
    }, [workerDetail?.current_location?.id, countriesBiodata, getDistrictList]);

    const handleCanStartDate = useCallback((e) => {
        const { name, value } = e.target;
        const formattedValue = changeDynamicDateFormate(value, "YYYY-MM-DD");

        // For visa_expiry_date, check if early_release_date exists and is valid for comparison
        if (name === 'visa_expiry_date') {
            setValue("visa_expiry_date", formattedValue);
            const earlyReleaseDate = getValues("early_release_date");

            if (earlyReleaseDate && new Date(value) <= new Date(earlyReleaseDate)) {
                setError("visa_expiry_date", {
                    type: "manual",
                    message: translation('key_visa_expiry_date_greater_than_early_release_date')
                });
                return;
            } else {
                clearErrors("visa_expiry_date");
                clearErrors("early_release_date");
            }
        }

        setValue(name, changeDynamicDateFormate(value, "YYYY-MM-DD"));
        setCanStartdateFormData(prev => ({ ...prev, [name]: value }));
        const isFormDataValid = Object.values({ ...canStartdateFormData, [name]: value }).every(val => val !== null && val !== undefined && val !== '');
        if (isFormDataValid) {
            dispatch(fetchWorkerCanStartDate({ ...canStartdateFormData, type: workerDetail.type, [name]: value }));
        }
        if (name === "contract_end_date") {
            setContractEndDateId(formattedValue);
        }
    }, [canStartdateFormData, dispatch, getValues, setError, setValue, clearErrors, workerDetail.type]);

    const handleManualError = useCallback((error, message = "") => {
        if (message) {
            setError(error, {
                type: "manual",
                message: message,
            });
        } else {
            setError(error, {
                type: "manual",
                message: `${ error.replace(/_/g, " ") } ${ translation('key_is_required') }`,
            });
        }
    }, [setError]);

    const onSubmit = useCallback((data) => {

        /* WORKER.md Step 7 / U-0209: the detail groups open for any child-care skill; an empty list is saved empty */
        const isChildCareSelected = mainSkillsList.some((id) => constData.isChildCareSkill(mainSkills?.find((s) => s.id === id) || { id }));
        const isElderlyCareSelected = mainSkillsList.includes(constData.ELDERLY_CARE_SKILL_ID);
        const selectedChildCareDutiesAll = isChildCareSelected ? selectedChildCareDuties : [];
        const selectedElderlyCareDutiesAll = isElderlyCareSelected ? selectedElderlyCareDuties : [];

        if (workerDetail?.type === 1) {
            const currentContract = getcurrentcontractexp(updateWorkExperience);
            const isCurrentContractEmpty = isEmptyCurrentContract(currentContract);

            // if worker type local, and current contract avaialble and empty then contract status should be optional otherwise mandatory 
            if (!data.contract_status) {

                // if current contract exist and empty then only clear error of contract status
                if (currentContract && isCurrentContractEmpty) {
                    clearErrors(["contract_status"]);
                } else {
                    handleManualError("contract_status");
                    return false;
                }
            }
            if (data.contract_status) {
                if (data.contract_status === 1 || data.contract_status === 7) {
                    if (!getValues("visa_expiry_date")) {
                        handleManualError("visa_expiry_date");
                        return false;
                    }
                } else {
                    if (!data.contract_end_date &&
                        currentContract &&
                        !isCurrentContractEmpty &&
                        Number(data?.contract_status) !== 1 //finished
                    ) {
                        handleManualError("contract_end_date");
                        return false;
                    }
                }

                if (data.expect_released_early == 1) {
                    if (!data.early_release_date) {
                        handleManualError("early_release_date");
                        return false;
                    }
                }
                clearErrors(["visa_expiry_date", "early_release_date", "contract_end_date"]);
            }
        }
        if (workerDetail?.type !== 1) {
            delete data.contract_status;
            delete data.contract_end_date;
            delete data.visa_expiry_date;
            delete data.early_release_date;
            delete data.expect_released_early;
            delete data.contract_can_start_date;
        }
        if (workerDetail?.reference_letter_file) {
            if (data?.reference_letter_file == "") {
                let url = new URL(workerDetail?.reference_letter_file);
                let path = url.pathname;
                data.reference_letter_file = path;
            }
        }
        if (data?.children_count >= 1) {
            if (!data.oldest_child_age) {
                handleManualError("oldest_child_age");
                return false;
            }
            clearErrors(["oldest_child_age"]);
        }

        /* WORKER.md §3 Step 2: minimum age by nationality (the form's nationality, else the record's); a draft without a DOB is not checked */
        if (data?.date_of_birth) {
            const ageDifMs = Date.now() - new Date(data.date_of_birth).getTime();
            const calculatedAge = Math.abs(new Date(ageDifMs).getUTCFullYear() - 1970);
            const nationalityId = Number(data?.nationality) || workerDetail?.nationality?.id;
            const minAge = workerMinAgeByNationalityId[nationalityId] ?? WORKER_DEFAULT_MIN_AGE;
            if (calculatedAge < minAge) {
                handleManualError("date_of_birth", translation(WORKER_MIN_AGE_MESSAGE_KEYS[minAge] || WORKER_MIN_AGE_MESSAGE_KEYS[WORKER_DEFAULT_MIN_AGE]));
                return;
            }
        }
        clearErrors(["date_of_birth"]);

        /* U-0208: Day Off is multi — `day_off_ids[]` carries every chosen day; the legacy single `day_off` keeps the first for today's reader */
        const dayOffIds = Array.isArray(data.day_off) ? data.day_off.map(Number).filter((n) => !Number.isNaN(n)) : [];
        let payload = {
            ...data,
            worker_id: workerDetail.id,
            /* U-0205: Location is read-only here — the stored value travels unchanged */
            current_location: workerDetail?.current_location?.id ?? data.current_location ?? '',
            date_of_birth: (data.date_of_birth) ? changeDynamicDateFormate(data.date_of_birth, "YYYY-MM-DD") : "",
            experience: updateWorkExperience,
            early_release_date: data?.early_release_date ? changeDynamicDateFormate(data.early_release_date, "YYYY-MM-DD") : '',
            start_date: data.contract_end_date,
            child_care_duty_ids: selectedChildCareDutiesAll,
            elderly_care_duty_ids: selectedElderlyCareDutiesAll,
            household_chores_id: selectedHouseholdChores,
            child_care_age_ids: data.child_care_age_ids ? data.child_care_age_ids : [],
            special_course: data.special_course.length === 1 ? data.special_course[0] === 0 ? [] : data.special_course : data.special_course,
            day_off_ids: dayOffIds,
            day_off: dayOffIds.length ? dayOffIds[0] : '',
            /* W-23: the detail's version travels; a stale one is refused with 409 STALE_VERSION */
            version: serverVersion ?? workerDetail?.version,
            module_key: "worker",
            expect_released_early: (data.expect_released_early === "1" || data.expect_released_early === 1) ? "1" : "0"
        };
        if (workerDetail?.type === 1) {
            payload.visa_expiry_date = getValues("visa_expiry_date");
        }
        let shouldshowError = false;
        payload?.experience.map((experience, index) => {
            const endedStatuses = [2, 3, 4, 5];
            /* Reason for Leaving is contract_status; no separate Termination Reason travels (U-0422, 29 Oct) */
            delete experience.leaving_reason; delete experience.leaving_reason_info; delete experience.terminated_reason; delete experience.terminated_reason_info;

            if (index === 0 && (experience?.contract_status == '1' || experience?.contract_status == '7')) {
                const selectedEndDate = new Date(experience?.end_date);
                const currentDate = new Date();
                const isFuture = selectedEndDate > currentDate;

                if ((isFuture || experience?.current_contract) && payload.visa_expiry_date) {
                    experience.visa_expiry_date = data?.visa_expiry_date?.trim()
                        ? dayjs(data.visa_expiry_date).format("YYYY-MM-DD")
                        : '';
                }

                if (isFuture) {
                    experience.expect_released_early = data?.expect_released_early;
                    experience.early_release_date = data?.early_release_date
                        ? dayjs(data.early_release_date).format("YYYY-MM-DD")
                        : '';
                    payload.contract_end_date = null;
                }
            }

            if (endedStatuses.includes(parseInt(experience?.contract_status))) {
                experience.contract_end_date = experience?.end_date;
            }
            if (experience?.current_contract === 1 && Number(experience?.contract_status) === 1) {
                experience.end_date = payload?.visa_expiry_date;
            }

        });

        if (shouldshowError) return false;

        dispatch(saveWorkerBiodataSlice(payload)).then((res) => {
            showSuccessOrError(res);
            if (res?.error && res?.payload?.code === STALE_VERSION_CODE) {
                /* someone else saved this Biodata: the form keeps the user's edits for re-apply and the next Save carries the
                   current version the 409 handed back (re-reading the record here would overwrite the open form) — never auto-retried */
                setServerVersion(res.payload?.data?.version ?? null);
            }
            if (!res.error && res?.payload?.status) {
                dispatch(fetchWorkerCommonDetailInfo({ "worker_id": workerDetail?.id, type: 'biodata' }));
                dispatch(fetchWorkerDetailTabInfo({ worker_id: workerDetail?.id, type: 'basic' }));
                dispatch(fetchWorkerValidateStatus({ worker_id: workerDetail?.id, type: 'biodata' }));
                dispatch(fetchWorkerActivityLog({ worker_id: workerDetail?.id, type: 'update_biodata', module_key: 'worker' }));
                onClose();
            }
        });
    }, [mainSkillsList, mainSkills, handleManualError, workerDetail, clearErrors, getValues, updateWorkExperience, selectedChildCareDuties, selectedElderlyCareDuties, selectedHouseholdChores, dispatch, onClose, serverVersion]);

    const handleUpdateWorkExperience = useCallback((event) => {
        setUpdateWorkExperience(event)
    }, []);

    const handleUpdateContractEndDate = useCallback((value, key) => {
        if (key === "end_date") {
            setValue("contract_end_date", value);
            setContractEndDateId(value);
        } else if (key === "contract_status") {
            setValue("contract_status", value);
            setContractStatusId(value);
        }
    }, [setValue]);

    /* Finished / Plan to Finish (1) and Plan to renew (7) carry a Visa Expiry Date; every other status a Contract End Date */
    const isFinishedBranch = [1, 7].includes(Number(contractStatusId || workerDetail?.contract_status));

    const handleFamilyUpdate = useCallback((event) => {
        if (event?.children_count) {
            setValue("children_count", event?.children_count);
        } else {
            setValue("children_count", 0);
        }
        if (event?.siblings_count) {
            setValue("siblings_count", event?.siblings_count);
        } else {
            setValue("siblings_count", 0);
        }
    }, [setValue]);

    const handleChangeState = useCallback((name, e) => {
        const { value } = e.target;
        setValue("weight", Number(value));
    }, [setValue]);

    const handleUpdateAge = useCallback((age, dateofbirth) => {
        setValue("date_of_birth", dateofbirth);
        setValue("age", age);
    }, [setValue]);

    const handleGetCanStartDate = useCallback((e) => {
        const { name, value } = e.target;

        // For early_release_date, check if visa_expiry_date exists and is valid for comparison
        if (name === 'early_release_date') {
            const visaExpiryDate = getValues("visa_expiry_date");

            if (visaExpiryDate && new Date(value) >= new Date(visaExpiryDate)) {
                setError("early_release_date", {
                    type: "manual",
                    message: translation('key_early_release_date_less_than_visa_expiry_date')
                });
                return;
            } else {
                clearErrors("early_release_date");
                clearErrors("visa_expiry_date"); // Clear any related error
            }
        }

        setCanStartdateFormData({ ...canStartdateFormData, [name]: value });
        dispatch(fetchWorkerCanStartDate({ ...canStartdateFormData, type: workerDetail.type, [name]: value }));
        setValue(name, value);

        if (name === "contract_status") {
            setContractStatusId(value);

            if (!value) return;

            const numericValue = Number(value);
            const isActiveOrNotice = [1, 7].includes(numericValue);

            // Clear contract end date for active status
            if (numericValue === 1) {
                setValue("contract_end_date", "");
            }

            // Handle early release logic
            if (isActiveOrNotice) {
                const currentEarlyReleaseValue = getValues("expect_released_early");
                setEarlyReleaseDate(currentEarlyReleaseValue === '1');
            } else {
                // Clear all early release related fields
                setValue("expect_released_early", "0");
                setValue("visa_expiry_date", "");
                setValue("early_release_date", "");
                setEarlyReleaseDate(false);
            }
        } else if (name === 'early_release_date') {
            const formattedValue = changeDynamicDateFormate(value, "YYYY-MM-DD");
            setValue("early_release_date", formattedValue, {
                shouldValidate: true,
                shouldDirty: true
            });
        }
    }, [canStartdateFormData, dispatch, getValues, setError, setValue, clearErrors, workerDetail.type]);

    const handleUpdateRefrenceLetter = useCallback((event, type) => {
        if (type === "upload") {
            if (event)
                setValue("reference_letter_file", event.filename);
        } else {
            setValue("reference_letter_file", "");
        }
    }, [setValue]);

    const handleUpdateSetValues = useCallback((name, value) => {
        setValue(name, value);
    }, [setValue]);

    const handleChildCareDuties = useCallback((id) => {
        setSelectedChildCareDuties((prev) =>
            prev.includes(id)
                ? prev.filter((dutyId) => dutyId !== id)
                : [...prev, id]
        );
    }, []);

    const handleElderlyCareDuties = useCallback((id) => {
        setSelectedElderlyCareDuties((prev) =>
            prev.includes(id)
                ? prev.filter((dutyId) => dutyId !== id)
                : [...prev, id]
        );
    }, []);

    const handleHouseholdChores = useCallback((id) => {
        setSelectedHouseholdChores((prev) =>
            prev.includes(id)
                ? prev.filter((dutyId) => dutyId !== id)
                : [...prev, id]
        );
    }, []);

    const handleSetSkills = useCallback((selected) => {
        const skills = selected?.map(skill => skill.value) || [];
        setMainSkillsList(skills);
    }, []);

    const getContractStatusOptions = useCallback((endDate) => {
        if (!endDate) return newContractStatus;

        const selectedDate = new Date(endDate);
        const currentDate = new Date();

        return selectedDate <= currentDate ? oldContractStatus : newContractStatus;
    }, [oldContractStatus, newContractStatus]);

    const dateConstraints = useMemo(() => ({
        min: dayjs().subtract(14, 'days').format('YYYY-MM-DD'),
        max: dayjs().add(1095, 'days').format('YYYY-MM-DD')
    }), []);
    const today = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
    /* WORKER.md Step 3: Earliest Date I Can Start — not in the past, at most 2 years ahead */
    const earliestStartMax = useMemo(() => dayjs().add(EARLIEST_START_MAX_YEARS, 'year').format('YYYY-MM-DD'), []);
    /* WORKER.md Step 2: Open to Working In — Hong Kong, Macau; Macau selectable for Local workers only */
    const workingInOptions = useMemo(
        () => (countries || []).map((item) => ({ id: item?.id, name: item?.name, disabled: workerDetail?.type === 2 && isMacauCountry(item) })),
        [countries, workerDetail?.type]
    );
    /* the date boxes hand back a canonical string; the legacy handlers read e.target.{name,value} */
    const asEvent = (name, value) => ({ target: { name, value } });
    /* U-0205: the detected location is shown, not edited */
    const currentLocationName = workerDetail?.current_location?.name
        || (countriesBiodata || []).find((c) => c.id === workerDetail?.current_location?.id)?.name
        || '';

    return (
        <>
            {loading ? <CustomSpinner /> : <Suspense fallback={<CustomSpinner />}><form onSubmit={handleSubmit(onSubmit)} className="wkd-bio-edit">
                {/* edit head: title + status chip only (no Updated / Edit / Change Status while editing) */}
                <div className="bio-edit-head">
                    <span className="bio-card-title">{translation('key_biodata')}</span>
                    <WkdStatusChip label={translation((DOC_STATUS_META[workerDetail?.biodata_status] || DOC_STATUS_META.in_complete).key)} tone={(DOC_STATUS_META[workerDetail?.biodata_status] || DOC_STATUS_META.in_complete).tone} />
                </div>
                <div data-bio-section="biodata">
                <p className="fz20 fw-700 text-uppercase wkd-fsec-first">{translation('key_biodata')}</p>
                {/* I'm interested in working in — first field, full width */}
                <div className="row">
                    <div className="col-12 mb-3">
                        <label className="form-label required">{ translation('key_wkr_i_m_interested_in_working_in') }</label>
                        <Controller
                            name="open_to_working_in"
                            control={control}
                            render={({ field }) => (
                                <BioCheckGrid
                                    cols={4}
                                    ariaLabel="I'm interested in working in"
                                    options={workingInOptions}
                                    value={Array.isArray(field.value) ? field.value : []}
                                    onChange={field.onChange}
                                    error={Boolean(errors?.open_to_working_in)}
                                />
                            )}
                        />
                        {errors?.open_to_working_in && <small className="text-danger">{errors.open_to_working_in.message}</small>}
                    </div>
                </div>
                <div className="row">
                    <div className="col-6 mb-3">
                        {/* conflict sheet U-0205: Current Location is auto-detected and read-only here; it never re-derives branch or district */}
                        <label className="form-label" htmlFor="current_location"> {translation('key_location')}</label>
                        <input
                            id="current_location"
                            className={`form-control ht44${emptySel(currentLocationName)}`}
                            value={currentLocationName}
                            readOnly
                            aria-readonly="true"
                            placeholder="—"
                        />
                    </div>
                    {workerDetail?.type === 2 && (
                        <div className="col-6 mb-3">
                            <label className="form-label">  {translation('key_earliest_date_you_can_start_work')}</label>
                            <Controller
                                name="earliest_can_start_date"
                                control={control}
                                render={({ field }) => (
                                    <BioDateInput
                                        mode="date"
                                        name={field.name}
                                        ariaLabel={translation('key_earliest_date_you_can_start_work')}
                                        value={field.value || ''}
                                        min={today}
                                        max={earliestStartMax}
                                        onChange={(v) => field.onChange(v || null)}
                                    />
                                )}
                            />
                        </div>
                    )}
                    {workerDetail?.type === 1 && (
                        <>
                            <div className="col-6 mb-3">
                                <label className="form-label required">{translation('key_contract_status')}</label>
                                <select
                                    {...register("contract_status")}
                                    className={`form-control ht44${emptySel(watch('contract_status'))}`}
                                    id="contract_status"
                                    disabled={workerDetail?.type !== 1 || workerDetail?.status === 13}
                                    onChange={handleGetCanStartDate}
                                >
                                    <option value="">{translation('key_please_select')}</option>
                                    {getContractStatusOptions(contractEndDateId)?.map((item) => (
                                        <option key={item.id} value={item.id}>
                                            {item.admin_panel_status}
                                        </option>
                                    ))}
                                </select>
                                {errors.contract_status && (
                                    <small className="text-danger">
                                        {errors.contract_status.message}
                                    </small>
                                )}
                            </div>
                            {!isFinishedBranch && (
                            <div className="col-6 mb-3">
                                <label className="form-label required">{translation('key_contract_end_date')}</label>
                                <Controller
                                    name="contract_end_date"
                                    control={control}
                                    render={({ field }) => (
                                        <BioDateInput
                                            mode="date"
                                            name={field.name}
                                            ariaLabel={translation('key_contract_end_date')}
                                            value={field.value || ''}
                                            {...dateConstraints}
                                            error={Boolean(errors.contract_end_date)}
                                            onChange={(v) => handleCanStartDate(asEvent(field.name, v))}
                                            disabled={
                                                (contractStatusId)
                                                    ? workerDetail?.type !== 1 || workerDetail?.status === 13 || (contractStatusId == 1 || contractStatusId == 7)
                                                    : workerDetail?.type !== 1 || workerDetail?.status === 13 || (workerDetail?.contract_status == 1 || workerDetail?.contract_status == 7)
                                            }
                                        />
                                    )}
                                />
                                {errors.contract_end_date && <small className="text-danger">{errors.contract_end_date.message}</small>}
                            </div>
                            )}
                        </>
                    )}

                    {workerDetail?.type === 1 && isFinishedBranch && <>
                        <div className="col-6 mb-3">
                            <label className="form-label required">{translation('key_visa_expiry_date')}</label>
                            <Controller
                                name="visa_expiry_date"
                                control={control}
                                render={({ field }) => (
                                    <BioDateInput
                                        mode="date"
                                        name={field.name}
                                        ariaLabel={translation('key_visa_expiry_date')}
                                        value={field.value || ''}
                                        {...dateConstraints}
                                        error={Boolean(errors.visa_expiry_date)}
                                        onChange={(v) => handleCanStartDate(asEvent(field.name, v))}
                                        disabled={workerDetail?.type !== 1 || workerDetail?.status === 13 ||
                                            [2, 3, 4, 5, 6].includes(Number(contractStatusId))
                                        }
                                    />
                                )}
                            />
                            {errors.visa_expiry_date && <small className="text-danger">{errors.visa_expiry_date.message}</small>}
                        </div>
                        <div className="col-6 mb-3">
                            <label className="form-label required">{translation('key_early_release_applicable')} </label>
                            {/* v18.6: Yes/No radio group — same name/values/handler chain as the old select */}
                            <Controller
                                name="expect_released_early"
                                control={control}
                                render={({ field }) => {
                                    const isDisabled =
                                        workerDetail?.type !== 1 ||
                                        workerDetail?.status === 13 ||
                                        // Only enable for contract status 1 (Finished) and 7 (Plan to renew)
                                        (contractStatusId && ![1, 7].includes(Number(contractStatusId))) ||
                                        (!contractStatusId && ![1, 7].includes(Number(workerDetail?.contract_status)));
                                    const handlePick = (e) => {
                                        handleGetCanStartDate(e);
                                        // Update earlyReleaseDate state based on selection
                                        if (e.target.value === '1') {
                                            setEarlyReleaseDate(true);
                                        } else {
                                            setEarlyReleaseDate(false);
                                            setValue('early_release_date', ''); // Clear the date when No is selected
                                        }
                                    };
                                    return (
                                        <div className="mode-radio-buttons d-flex align-items-center">
                                            <div className="custom-radio compact">
                                                <input type="radio" name={field.name} value="1" id="expect_released_early_yes"
                                                    checked={String(field.value) === '1'} onChange={handlePick} disabled={isDisabled} />
                                                <label htmlFor="expect_released_early_yes" className="radio-label black">{translation('key_yes')}</label>
                                            </div>
                                            <div className="custom-radio compact">
                                                <input type="radio" name={field.name} value="0" id="expect_released_early_no"
                                                    checked={String(field.value) === '0'} onChange={handlePick} disabled={isDisabled} />
                                                <label htmlFor="expect_released_early_no" className="radio-label black">{translation('key_no')}</label>
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                            {errors.expect_released_early && (
                                <small className="text-danger">{errors.expect_released_early.message}</small>
                            )}
                        </div>
                        {String(watch('expect_released_early')) === '1' && (
                        <div className="col-6 mb-3">
                            <label className="form-label required">{translation('key_early_release_date')}</label>
                            <Controller
                                name="early_release_date"
                                control={control}
                                render={({ field }) => (
                                    <BioDateInput
                                        mode="date"
                                        name={field.name}
                                        ariaLabel={translation('key_early_release_date')}
                                        value={field.value || ''}
                                        {...dateConstraints}
                                        error={Boolean(errors.early_release_date)}
                                        disabled={
                                            workerDetail?.type !== 1 ||
                                            workerDetail?.status === 13 ||
                                            // Disable if contract status is not 1 or 7
                                            (contractStatusId && ![1, 7].includes(Number(contractStatusId))) ||
                                            (!contractStatusId && ![1, 7].includes(Number(workerDetail?.contract_status))) ||
                                            // Disable if Early Release Applicable is not "Yes" (1)
                                            !earlyReleaseDate ||
                                            getValues("expect_released_early") !== '1'
                                        }
                                        onChange={(v) => handleGetCanStartDate(asEvent(field.name, v))}
                                    />
                                )}
                            />
                            {errors.early_release_date && <small className="text-danger">{errors.early_release_date.message}</small>}
                        </div>
                        )}
                    </>}
                </div>
                {workerDetail?.type === 1 && (
                    <p className="bio-hint">{ translation('key_wkr_early_release_date_appears_required_when_early') }</p>
                )}
                <div className="row mb-4">
                    <div className="col-6">
                        <label className="form-label">
                            {translation('key_job') + ' ' + translation('key_status')}
                        </label>
                        <Controller
                            name="job_status"
                            control={control}
                            render={({ field }) => (
                                <select
                                    {...field}
                                    className={`form-control custom-select${emptySel(field.value)}`}
                                    id="job_status"
                                >
                                    <option value="">{translation('key_please_select')}</option>
                                    {workerJobStatus && workerJobStatus.map((item) => {
                                        return <option key={item?.id} value={item?.id}>{item?.name}</option>
                                    })}
                                </select>
                            )}
                        />
                        {errors?.job_status && (
                            <small className="text-danger">{errors.job_status.message}</small>
                        )}
                    </div>
                </div>
                </div>
                <div data-bio-section="profile">
                <BasicPrimaryProfileDetailsForm
                    errors={errors}
                    workerDetail={workerDetail}
                    control={control}
                    roles={workerRoles}
                    nationalities={workerNationalities}
                    religionList={religionList}
                    heightMeasurement={heightList}
                    maritalStatus={maritalStatus}
                    register={register}
                    genderList={genderList}
                    handleChangeState={handleChangeState}
                    handleUpdateAge={handleUpdateAge}
                    getValues={getValues}
                    onUpdateSetValues={handleUpdateSetValues}
                    setError={setError}
                    clearErrors={clearErrors}
                />
                <FamilyBioDataForm
                    errors={errors}
                    workerDetail={workerDetail}
                    control={control}
                    maritalStatus={maritalStatus}
                    register={register}
                    workerBioProfileState={workerBioProfileState}
                    updateFamilyCounter={handleFamilyUpdate}
                    setValue={setValue}
                />
                <EducationBioDataForm
                    errors={errors}
                    watch={watch}
                    workerDetail={workerDetail}
                    control={control}
                    educationList={educationList}
                    mainSkills={mainSkills}
                    courseList={courseList}
                    languages={spokenLanguages}
                    register={register}
                />
                <p className="fz20 fw-700 text-uppercase">
                    {translation('key_domestic_helper_experience')}
                </p>
                <div className="row">
                    <div className="col-lg-6 mb-3">
                        <label className="form-label required">{translation('key_no_of_years_experience')}</label>
                        <Controller
                            control={control}
                            name="work_experience"
                            render={({ field }) => (
                                <select
                                    {...field}
                                    className={`form-control ht44${emptySel(field.value)}`}
                                >
                                    <option value="">{translation('key_please_select')}</option>
                                    {/* conflict sheet U-0206: the list is 2 … 20+; a stored 1 is kept as it is */}
                                    {Number(field.value) === BIODATA_EXPERIENCE_YEARS.legacyMin ? <option value={field.value}>{BIODATA_EXPERIENCE_YEARS.legacyMin}</option> : null}
                                    {Array.from({ length: BIODATA_EXPERIENCE_YEARS.max - BIODATA_EXPERIENCE_YEARS.min + 1 }, (_, i) => (
                                        <option key={i + BIODATA_EXPERIENCE_YEARS.min} value={i + BIODATA_EXPERIENCE_YEARS.min}>{i + BIODATA_EXPERIENCE_YEARS.min}</option>
                                    ))}
                                    <option value={BIODATA_EXPERIENCE_YEARS.plus}>{BIODATA_EXPERIENCE_YEARS.plus}</option>
                                </select>
                            )}
                        />

                        {errors.work_experience && <small className="text-danger">{errors.work_experience.message}</small>}
                    </div>
                </div>
                </div>
                <div data-bio-section="skills">
                <MainSkillsBiodataForm
                    workerDetail={workerDetail}
                    control={control}
                    mainSkills={mainSkills}
                    onSetSkills={handleSetSkills}
                    watch={watch}
                    setValue={setValue}
                />
                <CookingBiodataForm
                    workerDetail={workerDetail}
                    control={control}
                    cookingList={cookingList}
                    childCareAgeList={childCareAgeList}
                    childCareDuties={childCareDuties}
                    elderlyCareDuties={elderlyCareDuties}
                    householdChores={householdChores}
                    handleSelectedChildCareDuties={handleChildCareDuties}
                    handleSelectedElderlyCareDuties={handleElderlyCareDuties}
                    selectedChildCareDuties={selectedChildCareDuties}
                    selectedElderlyCareDuties={selectedElderlyCareDuties}
                    selectedHouseholdChores={selectedHouseholdChores}
                    handleSelectedHouseholdChores={handleHouseholdChores}
                    mainSkillsList={mainSkillsList}
                    mainSkills={mainSkills}
                />
                </div>
                <div data-bio-section="work">
                <WorkExperienceBiodataForm
                    // errors={ errors }
                    onSubmit={onSubmit}
                    workerDetail={workerDetail}
                    control={control}
                    roles={workerRoles}
                    countries={countriesBiodata}
                    getDistrictList={getDistrictList}
                    district={districtsByCountryCode}
                    employerNationalities={employerNationalities}
                    spokenLanguages={spokenLanguages}
                    mainSkills={mainSkills}
                    register={register}
                    updateWorkExperience={handleUpdateWorkExperience}
                    updateWorkExperienceData={updateWorkExperience}
                    getValues={getValues}
                    onUpdateContractEndDate={handleUpdateContractEndDate}
                    parentContractStatus={contractStatusId}
                    parentContractEndDate={contractEndDateId}
                    newContractStatus={newContractStatus}
                    oldContractStatus={oldContractStatus}
                    watch={watch}
                />
                </div>
                <div data-bio-section="expectations">
                <ExpectationsBiodataForm
                    control={control}
                    dayOffList={dayOffList}
                    interviewDayList={interviewDayList}
                    register={register}
                    onUpdateRefrenceLetter={handleUpdateRefrenceLetter}
                    workerDetail={workerDetail}
                    mappingBranches={mappingBranches}
                />
                </div>
                {/* v18.6 sticky action bar — same handlers as the old top-right buttons */}
                <div className="wkd-bioedit-footer">
                    <button type="button" className="btn  mr12 btn-outline " onClick={onClose}>
                        {translation('key_cancel')}
                    </button>
                    <SubmitSpinnerButton submitText={translation('key_save')} status={statusData} buttonClass="btn filled-btn" />
                </div>
            </form></Suspense>}

        </>
    );
};
BiodataForm.propTypes = {
    onClose: PropTypes.func,
    workerDetail: PropTypes.any,
    statusData: PropTypes.any,
    focusSection: PropTypes.string,
};
export default memo(BiodataForm);