import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import { addAgency, fetchAgencyById, updateAgency } from "../../../../../redux/Slices/settings/agencies/AgenciesSlice";
import { fetchDistrictByCountryCode } from "../../../../../redux/Slices/common/district/DistrictSlice";
import { fetchCountries } from "../../../../../redux/Slices/common/countries/CountriesSlice";
import { fetchLocations } from "../../../../../redux/Slices/common/locations/LocationsSlice";
import { fetchTimeZone } from "../../../../../redux/Slices/common/CommonSlice";
import { addAgencySchema } from "../../agencies/add-agency/addAgencySchema";
import { updateAgencySchema } from "../../agencies/add-agency/updateAgencySchema";
import { addAgencyBranchFormState, addAgencyFormState } from "../../../../../components/ReusableComponents/form-states";
import configData from "../../../../../components/ReusableComponents/app-configs";
import { formatTime, showSuccessOrError, useQuery } from "../../../../../services/commonService";
import routes from "../../../routes/routesConfig";
import { AGENCY_CATEGORY, API_TIME_FORMAT, COUNTRY_LOOKUP_TYPE, OPERATING_TIME_SUFFIX } from "../settingsNewUiConstants";

const BRANCH_DEFAULTS = addAgencyBranchFormState.branch_data[0];

/** Legacy contract: operating times go to the API as HH:mm strings (null when unset). */
const formatBranchHours = (branches = []) => branches.map((branch) => {
    const formatted = { ...branch };
    configData.daysOfWeek.forEach((day) => {
        const startKey = `${day}${OPERATING_TIME_SUFFIX.START}`;
        const endKey = `${day}${OPERATING_TIME_SUFFIX.END}`;
        formatted[startKey] = branch[startKey] ? formatTime(branch[startKey], API_TIME_FORMAT) : null;
        formatted[endKey] = branch[endKey] ? formatTime(branch[endKey], API_TIME_FORMAT) : null;
    });
    return formatted;
});

const useAgencyForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const query = useQuery();
    const id = query.get("id");
    const isEdit = Boolean(id);

    const { currentAgency } = useSelector((state) => state.agencies);
    const { timeZones } = useSelector((state) => state.common);

    const [districts, setDistricts] = useState({});
    const [selectedLocations, setSelectedLocations] = useState({});
    const [countries, setCountries] = useState([]);
    const [branchCountries, setBranchCountries] = useState([]);
    const [agencyStatus, setAgencyStatus] = useState(true);
    const [isLoading, setIsLoading] = useState(isEdit);
    const [isSaving, setIsSaving] = useState(false);
    const districtsRef = useRef(districts);

    const form = useForm({
        resolver: yupResolver(isEdit ? updateAgencySchema : addAgencySchema),
        defaultValues: {
            ...addAgencyFormState,
            branch_data: [{ ...BRANCH_DEFAULTS }],
        },
    });
    const { control, reset, setValue, watch } = form;
    const { fields: branches, append } = useFieldArray({ control, name: "branch_data" });

    const agencyCategory = watch("agency_category");
    const agencyCountryId = watch("country_id");

    useEffect(() => {
        districtsRef.current = districts;
    }, [districts]);

    useEffect(() => {
        if (!isEdit) {
            reset({ ...addAgencyFormState, branch_data: [{ ...BRANCH_DEFAULTS }] });
            return;
        }
        let active = true;
        setIsLoading(true);
        dispatch(fetchAgencyById(id)).then((res) => {
            if (!active) return;
            const agency = !res.error ? (res.payload?.data ?? currentAgency) : null;
            if (agency) {
                setAgencyStatus(agency.status);
                reset({ ...agency });
            }
            setIsLoading(false);
        });
        return () => { active = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, id, isEdit, reset]);

    useEffect(() => {
        dispatch(fetchLocations({ type: COUNTRY_LOOKUP_TYPE.EMPLOYER }));
        dispatch(fetchTimeZone());
        dispatch(fetchCountries({ type: COUNTRY_LOOKUP_TYPE.WORKER_HOME })).then((res) => {
            if (!res.error) setCountries(Array.isArray(res?.payload) ? res.payload : []);
        });
    }, [dispatch]);

    useEffect(() => {
        if (!Object.values(selectedLocations).some(Boolean)) return;
        const loadDistricts = async () => {
            const loaded = {};
            for (const countryCode of Object.values(selectedLocations)) {
                const known = districtsRef.current[countryCode];
                if (countryCode && (!known || known.length === 0) && !loaded[countryCode]) {
                    const response = await dispatch(fetchDistrictByCountryCode(countryCode));
                    if (!response.error) loaded[countryCode] = response.payload?.data ?? [];
                }
            }
            if (Object.keys(loaded).length > 0) setDistricts((prev) => ({ ...prev, ...loaded }));
        };
        loadDistricts();
    }, [dispatch, selectedLocations]);

    useEffect(() => {
        if (agencyCategory === AGENCY_CATEGORY.HOST) {
            dispatch(fetchCountries({ type: COUNTRY_LOOKUP_TYPE.EMPLOYER })).then((res) => {
                if (!res.error) setBranchCountries(Array.isArray(res?.payload) ? res.payload : []);
            });
        } else if (agencyCategory === AGENCY_CATEGORY.PARTNER) {
            setBranchCountries(countries);
        }
    }, [dispatch, agencyCategory, countries]);

    const timezoneOptions = useMemo(
        () => (Array.isArray(timeZones) ? timeZones : []).map((tz) => ({
            value: tz.timezone_name,
            label: `${tz.timezone_name} (${tz.utc_offset})`,
        })),
        [timeZones]
    );

    /* Status is only editable on an existing agency (new agencies are always active). */
    const toggleStatus = useCallback(() => {
        if (!isEdit) return;
        setAgencyStatus((prev) => {
            const next = !prev;
            setValue("status", next ? 1 : 0);
            return next;
        });
    }, [isEdit, setValue]);

    const setBranchLocation = useCallback((index, countryCode) => {
        setSelectedLocations((prev) => ({ ...prev, [index]: countryCode }));
    }, []);

    const appendBranch = useCallback(() => append({ ...BRANCH_DEFAULTS }), [append]);

    const onCancel = useCallback(() => navigate(-1), [navigate]);

    const onSubmit = useCallback((formData) => {
        const payload = { ...formData, status: agencyStatus ? 1 : 0 };
        const action = isEdit
            ? updateAgency({ ...payload, agency_id: id })
            : addAgency({ ...payload, branch_data: formatBranchHours(formData.branch_data) });

        setIsSaving(true);
        dispatch(action)
            .then((res) => {
                showSuccessOrError(res);
                if (!res.error) navigate(`/${routes.agencies}`);
            })
            .finally(() => setIsSaving(false));
    }, [agencyStatus, dispatch, id, isEdit, navigate]);

    return {
        form,
        branches,
        isEdit,
        isLoading,
        isSaving,
        agencyStatus: Boolean(agencyStatus),
        agencyCategory,
        agencyCountryId,
        countries,
        branchCountries,
        districts,
        selectedLocations,
        timezoneOptions,
        toggleStatus,
        setBranchLocation,
        appendBranch,
        onSubmit,
        onCancel,
    };
};

export default useAgencyForm;
