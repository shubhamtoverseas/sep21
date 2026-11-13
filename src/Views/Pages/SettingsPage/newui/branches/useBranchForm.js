import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import { addBranch, fetchBranchById, updateBranch } from "../../../../../redux/Slices/settings/branches/BranchesSlice";
import { fetchActiveAgencies } from "../../../../../redux/Slices/settings/agencies/AgenciesSlice";
import { fetchCountries } from "../../../../../redux/Slices/common/countries/CountriesSlice";
import { fetchDistrictByCountryCode } from "../../../../../redux/Slices/common/district/DistrictSlice";
import { fetchTimeZone } from "../../../../../redux/Slices/common/CommonSlice";
import { getBranchSchema } from "../../branches/branchSchema";
import { addBranchFormState } from "../../../../../components/ReusableComponents/form-states";
import { MACAU_LOCATION_ID } from "../../../../../components/ReusableComponents/constants";
import configData from "../../../../../components/ReusableComponents/app-configs";
import { formatTime, showSuccessOrError, useQuery } from "../../../../../services/commonService";
import routes from "../../../routes/routesConfig";
import {
    ACTIVE_AGENCIES_QUERY,
    AGENCY_CATEGORY,
    API_TIME_FORMAT,
    COUNTRY_LOOKUP_TYPE,
    OPERATING_TIME_SUFFIX,
} from "../settingsNewUiConstants";

const startKey = (day) => `${day}${OPERATING_TIME_SUFFIX.START}`;
const endKey = (day) => `${day}${OPERATING_TIME_SUFFIX.END}`;

/* API sends "HH:mm[:ss]"; the pickers work on Date objects for today. */
const parseApiTime = (value) => {
    if (!value || typeof value !== "string") return null;
    const [hours, minutes, seconds] = value.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    const date = new Date();
    date.setHours(hours, minutes, seconds || 0, 0);
    return date;
};

/* Legacy prefill: a day is "operating" when both times exist. */
const toFormValues = (branch) => {
    const values = { ...addBranchFormState, ...branch };
    const offDays = [];
    configData.daysOfWeek.forEach((day, dayIndex) => {
        const start = parseApiTime(branch[startKey(day)]);
        const end = parseApiTime(branch[endKey(day)]);
        values[startKey(day)] = start;
        values[endKey(day)] = end;
        if (start && end) offDays.push(dayIndex + 1);
    });
    values.off_days = offDays;
    return values;
};

const formatHours = (formData) => configData.daysOfWeek.reduce((acc, day) => {
    acc[startKey(day)] = formData[startKey(day)] ? formatTime(formData[startKey(day)], API_TIME_FORMAT) : null;
    acc[endKey(day)] = formData[endKey(day)] ? formatTime(formData[endKey(day)], API_TIME_FORMAT) : null;
    return acc;
}, {});

const useBranchForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const query = useQuery();
    const id = query.get("id");
    const isEdit = Boolean(id);

    const { activeAgencies } = useSelector((state) => state.agencies);
    const { timeZones } = useSelector((state) => state.common);

    const [loadedBranch, setLoadedBranch] = useState(null);
    const [selectedAgency, setSelectedAgency] = useState(null);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [countries, setCountries] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [branchStatus, setBranchStatus] = useState(true);
    const [isLoading, setIsLoading] = useState(isEdit);
    const [isSaving, setIsSaving] = useState(false);

    const isPartner = selectedAgency?.agency_category === AGENCY_CATEGORY.PARTNER;
    const isMacau = Number(selectedCountry?.id) === MACAU_LOCATION_ID;

    const resolver = useMemo(() => yupResolver(getBranchSchema(isPartner, isMacau)), [isPartner, isMacau]);
    const form = useForm({ resolver, defaultValues: addBranchFormState });
    const { reset, setValue } = form;

    useEffect(() => {
        dispatch(fetchActiveAgencies(ACTIVE_AGENCIES_QUERY));
        dispatch(fetchTimeZone());
    }, [dispatch]);

    useEffect(() => {
        if (!isEdit) {
            reset(addBranchFormState);
            return undefined;
        }
        let active = true;
        setIsLoading(true);
        dispatch(fetchBranchById(id)).then((res) => {
            if (!active) return;
            const branch = !res.error ? res.payload?.data : null;
            if (branch) {
                reset(toFormValues(branch));
                setBranchStatus(Boolean(branch.status));
                setLoadedBranch(branch);
            }
            setIsLoading(false);
        });
        return () => { active = false; };
    }, [dispatch, id, isEdit, reset]);

    /* Edit: resolve the agency once the active agencies arrive. */
    useEffect(() => {
        if (!loadedBranch?.agency_id || !Array.isArray(activeAgencies) || activeAgencies.length === 0) return;
        const agency = activeAgencies.find((item) => String(item.id) === String(loadedBranch.agency_id));
        if (agency) setSelectedAgency(agency);
    }, [loadedBranch, activeAgencies]);

    /* Country list depends on the agency category (host → employer countries, partner → worker home countries). */
    useEffect(() => {
        if (!selectedAgency) return;
        const type = selectedAgency.agency_category === AGENCY_CATEGORY.HOST ? COUNTRY_LOOKUP_TYPE.EMPLOYER : COUNTRY_LOOKUP_TYPE.WORKER_HOME;
        dispatch(fetchCountries({ type })).then((res) => {
            if (!res.error) setCountries(Array.isArray(res?.payload) ? res.payload : []);
        });
    }, [dispatch, selectedAgency]);

    /* Edit: resolve the country once the list for the agency's category is loaded. */
    useEffect(() => {
        if (!loadedBranch?.branch_country_code || countries.length === 0) return;
        const country = countries.find((item) => String(item.id) === String(loadedBranch.branch_country_code));
        if (country) setSelectedCountry(country);
    }, [loadedBranch, countries]);

    useEffect(() => {
        if (selectedCountry?.country_code && !isPartner) {
            dispatch(fetchDistrictByCountryCode(selectedCountry.country_code)).then((res) => {
                if (!res.error) setDistricts(Array.isArray(res.payload?.data) ? res.payload.data : []);
            });
            return;
        }
        setDistricts([]);
        if (isPartner) setValue("branch_provinces", "");
    }, [dispatch, setValue, selectedCountry, isPartner]);

    /* Edit: re-apply the saved province once its options exist (legacy parity). */
    useEffect(() => {
        if (loadedBranch?.branch_provinces && districts.length > 0 && !isPartner) {
            setValue("branch_provinces", loadedBranch.branch_provinces);
        }
    }, [loadedBranch, districts, isPartner, setValue]);

    const timezoneOptions = useMemo(
        () => (Array.isArray(timeZones) ? timeZones : []).map((tz) => ({
            value: tz.timezone_name,
            label: `${tz.timezone_name} (${tz.utc_offset})`,
        })),
        [timeZones]
    );

    const handleAgencyChange = useCallback((event) => {
        const agency = (activeAgencies || []).find((item) => String(item.id) === event.target.value) || null;
        setSelectedAgency(agency);
        setSelectedCountry(null);
        setValue("branch_country_code", "");
        setValue("branch_provinces", "");
        setDistricts([]);
    }, [activeAgencies, setValue]);

    const handleCountryChange = useCallback((event) => {
        const country = countries.find((item) => String(item.id) === event.target.value) || null;
        setSelectedCountry(country);
        setValue("branch_provinces", "");
    }, [countries, setValue]);

    /* bug log #5 (fixed 2026-10-18): the switch now drives `status` on add and edit (the payload always carried it) */
    const toggleStatus = useCallback(() => {
        setBranchStatus((prev) => {
            const next = !prev;
            setValue("status", next);
            return next;
        });
    }, [setValue]);

    const onCancel = useCallback(() => navigate(-1), [navigate]);

    const onSubmit = useCallback((formData) => {
        const payload = { ...formData, status: branchStatus ? 1 : 0, ...formatHours(formData) };
        const action = isEdit
            ? updateBranch({ ...payload, branch_id: parseInt(id, 10) })
            : addBranch(payload);

        setIsSaving(true);
        dispatch(action)
            .then((res) => {
                showSuccessOrError(res);
                if (!res?.error) navigate(`/${routes.branches}`);
            })
            .finally(() => setIsSaving(false));
    }, [branchStatus, dispatch, id, isEdit, navigate]);

    return {
        form,
        isEdit,
        isLoading,
        isSaving,
        branchStatus,
        agencies: Array.isArray(activeAgencies) ? activeAgencies : [],
        selectedAgency,
        isPartner,
        isMacau,
        countries,
        districts,
        selectedCountry,
        timezoneOptions,
        handleAgencyChange,
        handleCountryChange,
        toggleStatus,
        onSubmit,
        onCancel,
    };
};

export default useBranchForm;
