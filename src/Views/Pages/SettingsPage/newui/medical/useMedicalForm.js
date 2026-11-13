import { useCallback, useEffect, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import { saveMedicalClinic, viewMedicalClinic } from "../../../../../redux/Slices/settings/medical/MedicalSlice";
import { fetchActiveAgencies } from "../../../../../redux/Slices/settings/agencies/AgenciesSlice";
import { fetchCountries } from "../../../../../redux/Slices/common/countries/CountriesSlice";
import { clinicFormSchema } from "../../medical/clinicFormSchema";
import { clinicFormState } from "../../../../../components/ReusableComponents/form-states";
import { showSuccessOrError, useQuery } from "../../../../../services/commonService";
import { COUNTRY_LOOKUP_TYPE, HOST_AGENCIES_QUERY } from "../settingsNewUiConstants";

const selectLookups = (state) => ({
    countries: state.countries.countries,
    agencies: state.agencies.activeAgencies,
});

/* Legacy prefill: ids stringified so the native selects match option values. */
const toFormValues = (clinic) => ({
    clinic_name: clinic.clinic_name || "",
    agency_id: clinic.agency_id?.toString() || "",
    country_id: clinic.country_id?.toString() || "",
    clinic_address: clinic.clinic_address || "",
    clinic_map_link: clinic.clinic_map_link || "",
    clinic_email: clinic.clinic_email || "",
    id: clinic.id || "",
});

/** Ports AddMedicalList.js: host agencies + employer countries lookups, view → reset, save. */
const useMedicalForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const query = useQuery();
    const id = query.get("id");
    const isEdit = Boolean(id);
    const { countries, agencies } = useSelector(selectLookups, shallowEqual);

    const [isLoading, setIsLoading] = useState(isEdit);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm({ defaultValues: clinicFormState, resolver: yupResolver(clinicFormSchema) });
    const { reset } = form;

    useEffect(() => {
        dispatch(fetchActiveAgencies(HOST_AGENCIES_QUERY));
        dispatch(fetchCountries({ type: COUNTRY_LOOKUP_TYPE.EMPLOYER }));
    }, [dispatch]);

    useEffect(() => {
        if (!isEdit) return undefined;
        let active = true;
        setIsLoading(true);
        dispatch(viewMedicalClinic(id)).then((res) => {
            if (!active) return;
            const clinic = !res.error ? res.payload?.data : null;
            if (clinic) reset(toFormValues(clinic));
            setIsLoading(false);
        });
        return () => { active = false; };
    }, [dispatch, id, isEdit, reset]);

    const onCancel = useCallback(() => navigate(-1), [navigate]);

    const onSubmit = useCallback((data) => {
        const payload = isEdit ? { ...data, id } : { ...data };
        setIsSaving(true);
        dispatch(saveMedicalClinic(payload))
            .then((res) => {
                showSuccessOrError(res);
                if (!res.error) navigate(-1);
            })
            .finally(() => setIsSaving(false));
    }, [dispatch, id, isEdit, navigate]);

    return {
        form,
        isEdit,
        isLoading,
        isSaving,
        countries: Array.isArray(countries) ? countries : [],
        agencies: Array.isArray(agencies) ? agencies : [],
        onSubmit,
        onCancel,
    };
};

export default useMedicalForm;
