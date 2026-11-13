import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { updateEmployerFormState } from "../../../../../../components/ReusableComponents/form-states";
import { fetchEmployerDetail, updateEmployerBasic } from "../../../../../../redux/Slices/employer/EmployerSlice";
import { fetchDistrictByCountryCode } from "../../../../../../redux/Slices/common/district/DistrictSlice";
import { getEmployerNationalityList } from "../../../../../../redux/Slices/common/nationalities/NationalitiesSlice";
import { fetchGetGenderList } from "../../../../../../redux/Slices/common/CommonSlice";
import { showSuccessOrError } from "../../../../../../services/commonService";
import { validateHKID } from "../../../../../../utils/utils";
import usePrimaryLanguages, { legacyLanguageOption, loadedPrimaryLanguage } from "../../usePrimaryLanguages";
import { DETAILS_CARDS, EMPLOYER_CARD_META_FIELDS, EMPLOYER_EDIT_TYPE, EMPLOYER_GENDER_LEGACY_UNSET, OTHER_CONTACT_FIELDS } from "../../employerNewUiConstants";

const stripHkidParens = (value) => (value || '').replace(/[()]/g, '');

/* backend 334: one endpoint, two cards — each card's Save posts ONLY its own fields (+ `employer_id`; Other Contact names
   itself with `edit_type`), so an identity rule never blocks a telephone and a telephone save never carries the other card */
const BASIC_CARD_FIELDS = Object.freeze(Object.keys(updateEmployerFormState).filter((field) => !EMPLOYER_CARD_META_FIELDS.includes(field) && !OTHER_CONTACT_FIELDS.includes(field)));
const CARD_FIELDS = Object.freeze({ [DETAILS_CARDS.BASIC]: BASIC_CARD_FIELDS, [DETAILS_CARDS.OTHER_CONTACT]: OTHER_CONTACT_FIELDS });
const CARD_EDIT_TYPE = Object.freeze({ [DETAILS_CARDS.OTHER_CONTACT]: EMPLOYER_EDIT_TYPE.OTHER_CONTACT });
const pick = (values, fields) => fields.reduce((acc, field) => { acc[field] = values[field]; return acc; }, {});
const sameValue = (a, b) => JSON.stringify(a ?? '') === JSON.stringify(b ?? '');
const failureMessage = (res) => res?.payload?.data?.data?.message || res?.payload?.data?.message || res?.payload?.message || '';

/* E-6 / U-0039: the new UI edits `primary_language` (id, else the legacy text as a placeholder) and never sends `spoken_language` */
const employerToFormValues = (employer, workers) => {
    const values = { ...updateEmployerFormState, primary_language: loadedPrimaryLanguage(employer) };
    delete values.spoken_language;
    Object.keys(updateEmployerFormState).forEach((field) => {
        if (field === 'current_worker' || field === 'spoken_language') return;
        if (field === 'nationality') values.nationality = employer.nationality_info?.id ?? '';
        else if (field === 'residential_address_line_1') {
            values.residential_address_line_1 = employer.primary_residential_address?.address_line_1 ?? '';
            values.residential_address_id = employer.primary_residential_address?.id ?? updateEmployerFormState.residential_address_id;
        } else if (field === 'correspondence_address_line_1') {
            values.correspondence_address_line_1 = employer.primary_correspondence_address?.address_line_1 ?? '';
            values.correspondence_address_id = employer.primary_correspondence_address?.id ?? '';
        } else if (field === 'location') {
            values.location = employer.location_info?.id ?? '';
            values.location_country_code = employer.location_info?.country_code ?? '';
        } else if (field === 'district') values.district = employer.district ?? null;
        /* audit D-02: the detail carries the branch as `office_location`; never post a blank `branch_id` */
        else if (field === 'branch_id') values.branch_id = employer.office_location ?? employer.branch_id ?? '';
        /* work order 27 Oct: a stored 0 (legacy unset) starts unselected — a Save must never write a gender the user did not choose */
        else if (field === 'gender') values.gender = employer.gender === null || employer.gender === undefined || employer.gender === EMPLOYER_GENDER_LEGACY_UNSET ? '' : String(employer.gender);
        else if (!['residential_address_id', 'correspondence_address_id', 'location_country_code'].includes(field)) values[field] = employer[field] || '';
    });
    values.current_worker = (workers || []).map((worker) => ({
        id: worker.id,
        worker_name: worker.worker_name,
        hk_id: worker.hk_id,
        staying_till_date_in_hk: worker.staying_till_date_in_hk,
        employer_name: worker.employer_name,
        action: 'edit',
    }));
    return values;
};

const useEmployerBasicForm = ({ employer, employerId }) => {
    const dispatch = useDispatch();
    const { genderList } = useSelector((state) => state.common);
    const languages = usePrimaryLanguages();
    const legacyLanguage = useMemo(() => legacyLanguageOption(employer), [employer]);
    const { employerNationalities } = useSelector((state) => state.nationalities);
    const { districtsByCountryCode } = useSelector((state) => state.district);
    const workers = useSelector((state) => state.employer.currentWorkers);
    const [isSaving, setIsSaving] = useState(false);
    /* the server's refusal, shown on the card that saved (never page-level, never on the other card) */
    const [cardErrors, setCardErrors] = useState({});
    const justSaved = useRef(null);
    /* the record as last loaded into the form — what Cancel restores and what an unsaved edit is measured against */
    const loadedRef = useRef(null);

    const form = useForm({ defaultValues: updateEmployerFormState });
    const { reset, setValue, setError, clearErrors, trigger, getValues } = form;

    useEffect(() => {
        dispatch(getEmployerNationalityList({ type: 'employer' }));
        dispatch(fetchGetGenderList({ type: 'employer' }));
    }, [dispatch]);

    const countryCode = employer?.location_info?.country_code;
    useEffect(() => {
        if (countryCode) dispatch(fetchDistrictByCountryCode(countryCode));
    }, [dispatch, countryCode]);

    /* the record re-read (after a save, an address or current-worker change) refreshes the form but keeps the other card's
       unsaved edits (a field whose value differs from the last load, and that was not just saved); the fields a card has
       just saved take the server's values. Done by value, not by RHF's dirty registry: a card's inputs unmount when the
       other card enters edit mode */
    useEffect(() => {
        if (!employer) return;
        const values = employerToFormValues(employer, workers);
        const previous = loadedRef.current;
        const current = getValues();
        const saved = new Set(justSaved.current || []);
        const kept = previous ? Object.keys(values).filter((field) => !saved.has(field) && !sameValue(current[field], previous[field])) : [];
        reset(values);
        kept.forEach((field) => setValue(field, current[field], { shouldDirty: true }));
        loadedRef.current = values;
        justSaved.current = null;
    }, [employer, workers, reset, setValue, getValues]);

    const postCard = useCallback((card, data) => {
        const fields = CARD_FIELDS[card];
        if ('hk_id' in data && data.hk_id) {
            const res = validateHKID(data.hk_id);
            if (!res.valid) {
                setError('hk_id', { type: 'manual', message: res?.error });
                return Promise.resolve(false);
            }
            data.hk_id = res?.hkid || data.hk_id;
        }
        const payload = { employer_id: getValues('employer_id') ?? employerId, ...data };
        if ('hk_id' in payload) payload.hk_id = stripHkidParens(payload.hk_id);
        if ('current_worker' in payload) payload.current_worker = (payload.current_worker || []).map((worker) => ({ ...worker, hk_id: stripHkidParens(worker.hk_id) }));
        if ('branch_id' in payload && !payload.branch_id) delete payload.branch_id;
        /* E-6: `primary_language` not sent = unchanged — an untouched legacy placeholder or the loaded id is omitted */
        if ('primary_language' in payload && (!payload.primary_language || payload.primary_language === loadedPrimaryLanguage(employer))) delete payload.primary_language;
        if (CARD_EDIT_TYPE[card]) payload.edit_type = CARD_EDIT_TYPE[card];
        setIsSaving(true);
        setCardErrors((prev) => ({ ...prev, [card]: '' }));
        return dispatch(updateEmployerBasic(payload)).then((res) => {
            setIsSaving(false);
            showSuccessOrError(res);
            if (res.error || res.payload?.status === false) {
                setCardErrors((prev) => ({ ...prev, [card]: failureMessage(res) }));
                return false;
            }
            justSaved.current = fields;
            dispatch(fetchEmployerDetail({ employer_id: employerId }));
            return true;
        });
    }, [dispatch, employerId, employer, setError, getValues]);

    /* audit W88: a card validates only its own fields before saving — a legacy record failing a Basic rule (no Title / DOB)
       could never save its telephones, and the Basic errors rendered only inside the closed Basic edit mode */
    const saveCard = useCallback((card) => {
        const fields = CARD_FIELDS[card];
        if (!fields) return Promise.resolve(false);
        return trigger(fields).then((valid) => (valid ? postCard(card, pick(getValues(), fields)) : false));
    }, [trigger, getValues, postCard]);

    /* Cancel restores only that card's fields to the last load — the other card's edits stay */
    const cancelCard = useCallback((card) => {
        const fields = CARD_FIELDS[card] || [];
        fields.forEach((field) => setValue(field, loadedRef.current ? loadedRef.current[field] : updateEmployerFormState[field]));
        clearErrors(fields);
        setCardErrors((prev) => ({ ...prev, [card]: '' }));
    }, [setValue, clearErrors]);

    return {
        form,
        errors: form.formState.errors,
        cardErrors,
        setValue,
        lookups: { languages, legacyLanguage, genderList, employerNationalities, districts: districtsByCountryCode },
        isSaving,
        saveCard,
        cancelCard,
    };
};

export default useEmployerBasicForm;
