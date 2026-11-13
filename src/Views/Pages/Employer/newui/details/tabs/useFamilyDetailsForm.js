import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useFieldArray, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { FamilyDetailValidationSchema } from "../../../employer-details/family-details/FamilyDetailValidationSchema";
import { fetchEmployerDetail, saveEmployerFamilyInfo } from "../../../../../../redux/Slices/employer/EmployerSlice";
import { getCalculatedAge, showSuccessOrError } from "../../../../../../services/commonService";
import { validateHKID } from "../../../../../../utils/utils";
import translation from "../../../../../../utils/translation";
import { EMPTY_FAMILY_MEMBER, ADULT_AGE, CHILD_AGE } from "../../employerNewUiConstants";

/* audit D-13: one age rule for read and edit (exact years from a date, year difference for year-only) — the counts posted
   on save derive from the same value the table shows */
export const memberAge = (member) => {
    if (!member) return null;
    if (member.year_only === 'y' && member.year) return getCalculatedAge(String(member.year), 'y');
    if (member.year_only === 'n' && member.dob) return getCalculatedAge(member.dob, 'n');
    return null;
};

const countsFor = (members) => members.reduce((acc, member) => {
    const age = memberAge(member);
    if (age === null) return acc;
    if (age >= ADULT_AGE) acc.adults += 1;
    else if (age < CHILD_AGE) acc.childrenBelow5 += 1;
    else acc.children5To18 += 1;
    return acc;
}, { adults: 0, childrenBelow5: 0, children5To18: 0 });

const toFormMembers = (members) => (members || []).map((member) => ({
    id: member.id,
    name: member.name,
    dob: member.dob,
    year: member.dob,
    relation: String(member.relation ?? ''),
    hk_id: member.hk_id,
    year_only: member.year_only,
    action: 'edit',
}));

const useFamilyDetailsForm = ({ employer, onSaved }) => {
    const dispatch = useDispatch();
    const [deletedMembers, setDeletedMembers] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm({
        defaultValues: {
            expecting_baby_count: employer?.expecting_baby_count || 0,
            special_needs_count: employer?.special_needs_count || 0,
            family_member_info: toFormMembers(employer?.family_members),
        },
        resolver: yupResolver(FamilyDetailValidationSchema),
        mode: 'onChange',
    });
    const { control, watch, setValue, setError, clearErrors, handleSubmit, reset } = form;
    const { fields, append, remove } = useFieldArray({ control, name: 'family_member_info' });

    useEffect(() => {
        reset({
            expecting_baby_count: employer?.expecting_baby_count || 0,
            special_needs_count: employer?.special_needs_count || 0,
            family_member_info: toFormMembers(employer?.family_members),
        });
        setDeletedMembers([]);
    }, [employer, reset]);

    const watchedMembers = watch('family_member_info');
    const members = useMemo(() => watchedMembers || [], [watchedMembers]);
    const counts = useMemo(() => countsFor(members), [members]);

    const setYearOnly = useCallback((index, value) => {
        setValue(`family_member_info.${ index }.year_only`, value);
        setValue(`family_member_info.${ index }.${ value === 'y' ? 'dob' : 'year' }`, '');
    }, [setValue]);

    const setHkid = useCallback((index, value) => {
        const res = validateHKID(value);
        setValue(`family_member_info.${ index }.hk_id`, res?.hkid || value);
        if (!res.valid) setError(`family_member_info.${ index }.hk_id`, { type: 'manual', message: res?.error });
        else clearErrors(`family_member_info.${ index }.hk_id`);
    }, [setValue, setError, clearErrors]);

    const removeMember = useCallback((index) => {
        const member = members[index];
        if (member?.id) setDeletedMembers((prev) => [...prev, { ...member, action: 'delete' }]);
        remove(index);
    }, [members, remove]);

    const addMember = useCallback(() => append({ ...EMPTY_FAMILY_MEMBER }), [append]);

    const onValid = useCallback((data) => {
        let hasErrors = false;
        const processed = data.family_member_info.map((member, index) => {
            if (member.year_only === 'n' && !member.dob) {
                setError(`family_member_info.${ index }.dob`, { type: 'manual', message: translation('key_date_of_birth_is_required') });
                hasErrors = true;
            }
            if (member.year_only === 'y' && !member.year) {
                setError(`family_member_info.${ index }.year`, { type: 'manual', message: translation('key_year_is_required') });
                hasErrors = true;
            }
            let hkid = member.hk_id;
            if (hkid) {
                const res = validateHKID(hkid);
                if (!res.valid) {
                    setError(`family_member_info.${ index }.hk_id`, { type: 'manual', message: res?.error });
                    hasErrors = true;
                } else hkid = res.hkid;
            }
            const next = { ...member, hk_id: (hkid || '').replace(/[()]/g, '') };
            if (next.year_only === 'y' && next.year) next.dob = next.year;
            return next;
        });
        if (hasErrors) return;

        const derived = countsFor(processed);
        setIsSaving(true);
        dispatch(saveEmployerFamilyInfo({
            expecting_baby_count: data.expecting_baby_count,
            special_needs_count: data.special_needs_count,
            adult_count: derived.adults,
            child_age_below_5_count: derived.childrenBelow5,
            child_age_5_8_count: derived.children5To18,
            family_member_info: [...processed, ...deletedMembers],
            employer_id: employer?.employer_id || null,
        })).then((res) => {
            setIsSaving(false);
            showSuccessOrError(res);
            if (res?.error) return;
            dispatch(fetchEmployerDetail({ employer_id: employer?.employer_id }));
            onSaved();
        });
    }, [dispatch, deletedMembers, employer?.employer_id, onSaved, setError]);

    return {
        form,
        fields,
        members,
        counts,
        errors: form.formState.errors,
        isSaving,
        addMember,
        removeMember,
        setYearOnly,
        setHkid,
        save: handleSubmit(onValid),
    };
};

export default useFamilyDetailsForm;
