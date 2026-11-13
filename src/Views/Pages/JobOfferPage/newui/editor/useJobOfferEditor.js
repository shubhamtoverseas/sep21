import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import constData from "../../../../../components/ReusableComponents/constants";
import { addJobOffer } from "../../../../../redux/Slices/job-offer/JobOfferSlice";
import { showSuccessOrError } from "../../../../../services/commonService";
import { getJobOfferPermissions } from "../../../../../utils/permissions/jobPermissionsUtils";
import useJobOfferCopy from "../../../../../components/job-offer/copy-generator/useJobOfferCopy";
import { buildCopySource } from "../../../../../components/job-offer/copy-generator/buildCopyInput";
import useJobOfferMasterLists from "./useJobOfferMasterLists";
import {
    JOB_OFFER_FORM_DEFAULTS, buildJobOfferPayload, hydrateJobOfferForm, isMacauEmployer, jobOfferSchema, recordedBelowFloor as recordedBelowFloorOf, seedFromEmployer,
} from "./jobOfferFormSchema";
import { JO_COPY_REQUIRED, JO_EDITOR_COPY, JO_NO_PREFERENCE_ID, JO_OPEN_STATUS_IDS, JO_SALARY, JO_SAVE_ACTION } from "../../jobOfferConstants";

const SUNDAY = /^sunday$/i;
const FIXED_DATE = /^fixed\s*date$/i;

const useJobOfferEditor = ({ mode, detail, employer, moduleKey, onSaved }) => {
    const dispatch = useDispatch();
    const { permissionList, ownerOnboardingList } = useSelector((state) => state.users);
    const lists = useJobOfferMasterLists(employer);
    const employerId = employer?.employer_id ?? employer?.id ?? detail?.employer_id;
    /* Approve & Open (D-10) rides on the Change JO Status grant — the spec names no separate approve key (@migration-unspecified) */
    const canApprove = useMemo(
        () => getJobOfferPermissions(permissionList, ownerOnboardingList, employerId, typeof detail?.is_owner === 'boolean' ? detail.is_owner : undefined).canChangeJoStatus,
        [permissionList, ownerOnboardingList, employerId, detail?.is_owner]
    );
    const isMacau = useMemo(() => isMacauEmployer(employer, lists.countries), [employer, lists.countries]);
    const recordedBelowFloor = useMemo(() => (mode === 'edit' ? recordedBelowFloorOf(detail) : null), [mode, detail]);
    const context = useMemo(() => ({ isMacau, recordedBelowFloor }), [isMacau, recordedBelowFloor]);

    const form = useForm({ resolver: yupResolver(jobOfferSchema), defaultValues: JOB_OFFER_FORM_DEFAULTS, context, mode: 'onBlur' });
    const { control, setValue, reset, handleSubmit, getValues, formState } = form;

    const hydratedFor = useRef(null);
    useEffect(() => {
        if (mode === 'edit') {
            if (!detail?.id || hydratedFor.current === detail.id) return;
            hydratedFor.current = detail.id;
            reset(hydrateJobOfferForm(detail));
        } else if (employer && hydratedFor.current !== 'add') {
            hydratedFor.current = 'add';
            reset({ ...JOB_OFFER_FORM_DEFAULTS, ...seedFromEmployer(employer) });
        }
    }, [mode, detail, employer, reset]);

    const defaultsApplied = useRef(false);
    useEffect(() => {
        if (mode !== 'add' || defaultsApplied.current || hydratedFor.current !== 'add') return;
        const roles = lists.workerRoles || []; const days = lists.dayOffList || []; const salaries = lists.expectedSalaryList || []; const flex = lists.flexibleDates || [];
        if (!roles.length || !days.length || !salaries.length || !flex.length) return;
        defaultsApplied.current = true;
        if (!getValues('role_id')) { const helper = roles.find((r) => Number(r.id) !== constData.DRIVER_ROLE_ID); if (helper) setValue('role_id', String(helper.id)); }
        /* "How flexible is the start date?" opens on Fixed Date (prototype) */
        if (!getValues('flexible_start_date')) { const fixed = flex.find((f) => FIXED_DATE.test(f.name || '')); if (fixed) setValue('flexible_start_date', String(fixed.id)); }
        if (!(getValues('day_off') || []).length) { const sunday = days.find((d) => SUNDAY.test(d.name || '')); if (sunday) setValue('day_off', [String(sunday.id)]); }
        if (!getValues('expected_salary')) { const tbd = salaries.find((s) => ![JO_SALARY.RANGE_ID, JO_SALARY.FIXED_ID].includes(String(s.id))); if (tbd) setValue('expected_salary', String(tbd.id)); }
    }, [mode, lists.workerRoles, lists.dayOffList, lists.expectedSalaryList, lists.flexibleDates, getValues, setValue]);

    const watched = useWatch({ control, name: ['role_id', 'skills', 'responsibilities', 'cooking', 'care_recipients', 'pets', 'employer_nationality', 'employer_district', 'helper_accommadation', 'day_off', 'coworker_status', 'detailed_description', 'start_date', 'asap', 'helper_nationality'] });
    const [role_id, skills, responsibilities, cooking, care_recipients, pets, employer_nationality, employer_district, helper_accommadation, day_off, coworker_status, detailed_description, start_date, asap, helper_nationality] = watched;

    const copySource = useMemo(() => buildCopySource({
        role_id, skills, responsibilities, cooking, care_recipients, pets,
        employer_nationality, employer_district, helper_accommadation, day_off, coworker_status, detailed_description,
    }, {
        workerRoles: lists.workerRoles, mainSkills: lists.mainSkills, cookingList: lists.cookingList, dayOffList: lists.dayOffList,
        accommodations: lists.accommodations, employerNationalities: lists.employerNationalities, districts: lists.districts, employerCountryCode: lists.employerCountryCode,
    }), [role_id, skills, responsibilities, cooking, care_recipients, pets, employer_nationality, employer_district, helper_accommadation, day_off, coworker_status, detailed_description, lists]);

    const applyCopyPackage = useCallback((text) => {
        setValue('head_line', text.en.headline, { shouldDirty: true });
        setValue('job_description_english', text.en.description, { shouldDirty: true });
        setValue('indonesian_head_line', text.id.headline, { shouldDirty: true });
        setValue('indonesian_job_description', text.id.description, { shouldDirty: true });
    }, [setValue]);
    /* a saved package (D-09) seeds the version history; generation posts to the real endpoint (D-08) */
    const copy = useJobOfferCopy({ copySource, onPackageApplied: applyCopyPackage, jobId: mode === 'edit' ? detail?.id : null, initialPackage: mode === 'edit' ? detail?.copy : null });

    const copyMissing = useMemo(() => JO_COPY_REQUIRED.filter((key) => {
        if (key === 'start_date') return asap !== 1 && !start_date;
        if (key === 'skills') return !(Array.isArray(skills) && skills.length);
        if (key === 'helper_nationality') return !(Array.isArray(helper_nationality) && helper_nationality.length) && !(Array.isArray(helper_nationality) && helper_nationality.includes(JO_NO_PREFERENCE_ID));
        if (key === 'employer_district') return !isMacau && !employer_district;
        if (key === 'helper_accommadation') return !helper_accommadation;
        return false;
    }), [asap, start_date, skills, helper_nationality, isMacau, employer_district, helper_accommadation]);
    const salaryOk = !formState.errors?.min_salary && !formState.errors?.max_salary && !formState.errors?.fixed_salary;
    const canGenerate = copyMissing.length === 0 && salaryOk && copy.copyState !== 'pending' && copy.copyState !== 'ready' && copy.copyState !== 'review';
    /* "Still needed" appears once the CS has started (one required fact filled) or has tried to generate — never on a pristine form */
    const [tried, setTried] = useState(false);
    const generate = useCallback(() => {
        if (!canGenerate) { setTried(true); return; }
        copy.generate();
    }, [canGenerate, copy]);
    const showStillNeeded = copyMissing.length > 0 && (copyMissing.length < JO_COPY_REQUIRED.length || tried);

    const [isSaving, setIsSaving] = useState(false);
    const persist = useCallback((values, action) => {
        const current = copy.currentVersion;
        const copyPackage = current?.text ? {
            version: current.number, headline_en: current.text.en.headline, description_en: current.text.en.description,
            headline_id: current.text.id.headline, description_id: current.text.id.description,
        } : null;
        setIsSaving(true);
        dispatch(addJobOffer(buildJobOfferPayload(values, { jobId: mode === 'edit' ? detail?.id : null, employerId, moduleKey, action, copy: copyPackage }))).then((res) => {
            setIsSaving(false);
            showSuccessOrError(res);
            if (!res?.error) onSaved?.(res?.payload?.data);
        });
    }, [dispatch, copy.currentVersion, mode, detail?.id, employerId, moduleKey, onSaved]);
    /* Save as Draft: no validation, the record stays a Draft */
    const saveDraft = useCallback(() => persist(getValues(), JO_SAVE_ACTION.DRAFT), [persist, getValues]);
    /* Approve & Open: the current copy is approved with the save and the Job Offer opens; an approved package on an
       already-Open record is not re-approved (prototype setApprove) */
    const approveOpen = handleSubmit((values) => persist(values, JO_SAVE_ACTION.APPROVE_OPEN));
    const approved = mode === 'edit' && Boolean(copy.currentVersion?.approved) && JO_OPEN_STATUS_IDS.includes(Number(detail?.status));
    /* OD05 (10 Nov package, supersedes r3 PD05): an unassigned In Review record never reaches Approve & Open —
       the open needs an accountable, eligible CS on the record; the server enforces the same */
    const hasAccountableCs = mode !== 'edit' || Boolean(detail?.cs_owner_id || detail?.cs_owner_name || detail?.cs_name);
    const canApproveOpen = canApprove && copy.copyState === 'ready' && !approved && hasAccountableCs;
    const approveTitle = copy.copyState !== 'ready' ? JO_EDITOR_COPY.approveWaitsCopy : (!hasAccountableCs ? JO_EDITOR_COPY.approveNeedsCs : undefined);
    /* U-0243: an Open record saves its changed fields with no status action (`action: save`) */
    const isOpenRecord = mode === 'edit' && JO_OPEN_STATUS_IDS.includes(Number(detail?.status));
    const saveChanges = handleSubmit((values) => persist(values, JO_SAVE_ACTION.SAVE));

    return {
        form, control, setValue, errors: formState.errors, isDirty: formState.isDirty,
        lists, isMacau, recordedBelowFloor, copy, copyMissing, showStillNeeded, canGenerate, generate,
        saveDraft, approveOpen, canApproveOpen, approveAllowed: canApprove, approved, approveTitle, isSaving, isOpenRecord, saveChanges,
    };
};

export default useJobOfferEditor;
