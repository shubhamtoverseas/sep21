import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import { addUserDetailFormState } from "../../../../../components/ReusableComponents/form-states";
import {
    addUser,
    fetchPermissionSpecificUser,
    fetchUserById,
    savePermissions,
    updateUser,
} from "../../../../../redux/Slices/settings/users/UsersSlice";
import { fetchPermissionsWithoutStaff } from "../../../../../redux/Slices/settings/user-permissions/UserPermissionSlice";
import { fetchLanguageList } from "../../../../../redux/Slices/common/CommonSlice";
import { fetchActiveBranches } from "../../../../../redux/Slices/settings/branches/BranchesSlice";
import { fetchWorkerNationalities } from "../../../../../redux/Slices/common/nationalities/NationalitiesSlice";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { formatDate, showErrorMessage, showSuccessOrError, useQuery } from "../../../../../services/commonService";
import translation from "../../../../../utils/translation";
import routes from "../../../routes/routesConfig";
import { basicInformationFormSchema } from "../../users/add-user/basicInformationFormSchema";
import { salaryBenefitsFormSchema } from "../../users/add-user/salaryBenefitsFormSchema";
import { securityFormSchema } from "../../users/add-user/securityFormSchema";
import { permissionFormSchema } from "../../users/add-user/permissionFormSchema";
import { getPermissionValue, isAdminUser } from "../../../../../services/permissionService";
import { MANAGER_SELF_VALUE, STAFF_TYPE, USER_FORM_TAB, USER_FORM_TABS, userPermissionsPath } from "../settingsNewUiConstants";
import { PERM_API, PERM_ASSIGNMENT_MODULE, PERM_AUTHORITY_KEYS, PERM_COPY_KEYS, PERM_HISTORY_GATE, PERM_OWN_LOOKUPS, PERM_SAVE, t } from "./permissions/permissionCatalogue";
import { createPermissionEngine } from "./permissions/permissionEngine";
import { audienceOf, buildRows, EMPTY_TEMPLATE, grantsToTemplate, ownershipFromGrants, templateToGrants } from "./permissions/permissionAdapter";

const SCHEMA_BY_TAB = {
    [USER_FORM_TAB.BASIC]: () => basicInformationFormSchema,
    [USER_FORM_TAB.SALARY]: () => salaryBenefitsFormSchema,
    [USER_FORM_TAB.SECURITY]: (isEdit) => securityFormSchema(!isEdit),
    [USER_FORM_TAB.PERMISSION]: () => permissionFormSchema,
};

const isEmptyList = (value) => !Array.isArray(value) || value.length === 0;

/* the staff details carry the eligibility as CSV ("1,2"); the form holds int arrays and sends them back as arrays */
const csvToGroups = (value) => (Array.isArray(value) ? value.map(Number) : String(value || "").split(",").map((v) => Number(v.trim())).filter(Boolean));

/* CS ownership needs branches and employer languages (legacy guard); priority languages are optional since backend 264 (a subset of the languages). */
const csRequiredErrorKey = (payload) => {
    const csEnabled = payload.is_cs || payload.cs_assign_type;
    if (!csEnabled) return null;
    if (isEmptyList(payload.cs_branches)) return "key_cs_branch_required";
    if (isEmptyList(payload.cs_employer_language)) return "key_cs_employer_language_required";
    return null;
};
/* the ownership-eligibility payload keys the update carries only when they changed (backend 267: changing them needs manage_assignment_eligibility) */
const sameOwnership = (a, b) => JSON.stringify(a, Object.keys(a).sort()) === JSON.stringify(b, Object.keys(b).sort());
const errorBody = (res) => res?.payload?.data?.data || null;
const errorStatus = (res) => res?.payload?.data?.status || null;

/* lookup thunks return either { data: [...] } or the list itself */
const listOf = (res) => (Array.isArray(res?.payload) ? res.payload : (Array.isArray(res?.payload?.data) ? res.payload.data : []));
const LOOKUP_THUNK = { languages: fetchLanguageList, branches: fetchActiveBranches, nationalities: fetchWorkerNationalities, onboarding2Nationalities: fetchWorkerNationalities };
const EMPTY_LISTS = Object.freeze({ languages: [], branches: [], nationalities: [], onboarding2Nationalities: [] });

/**
 * Add / Edit User wizard: 4 tabs, per-tab schema, submit payload. Tab 4 holds the account scope (user type, partner
 * scope, direct manager). The client's permission editor is its own page (U-0357, `permissionsOnly`): the same hook
 * loads the account, reads the API template into engine grants (draft / saved), reviews before Save and writes back
 * into the same template; ownership eligibility and Prepared / Ready groups are derived from the same grants.
 */
const useUserForm = ({ permissionsOnly = false } = {}) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const query = useQuery();
    const id = query.get("id");
    const isEdit = Boolean(id);
    const requestedTab = query.get("tab");
    const initialTab = permissionsOnly ? USER_FORM_TAB.PERMISSION : (isEdit && USER_FORM_TABS.some((tab) => tab.key === requestedTab) && requestedTab !== USER_FORM_TAB.PERMISSION ? requestedTab : USER_FORM_TAB.BASIC);

    const [activeKey, setActiveKey] = useState(initialTab);
    /* U-0357: the old `?tab=user-permission` address opens the Permissions page; the page itself needs an existing account */
    useEffect(() => {
        if (!permissionsOnly && isEdit && requestedTab === USER_FORM_TAB.PERMISSION) navigate(userPermissionsPath(id), { replace: true });
        if (permissionsOnly && !isEdit) navigate(`/${ routes.users }`, { replace: true });
    }, [permissionsOnly, isEdit, requestedTab, id, navigate]);
    const [userStatus, setUserStatus] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);
    const [mfaEnabled, setMfaEnabled] = useState(false);
    const [isAssignEmployer, setIsAssignEmployer] = useState(false);
    const [isAssignWorker, setIsAssignWorker] = useState(false);
    const [isAssignContract, setIsAssignContract] = useState(false);
    const [workerStaffAssign, setWorkerStaffAssign] = useState([]);
    const [contractStaffAssign, setContractStaffAssign] = useState([]);
    const [isLoading, setIsLoading] = useState(isEdit);
    const [isSaving, setIsSaving] = useState(false);
    /* edit: true once the loaded user is in the form, so the permission template is fetched for the user's own type */
    const [formReady, setFormReady] = useState(!isEdit);
    /* permissions: the API template for the current staff type, the ownership lookup lists, the engine grants */
    const [permTemplate, setPermTemplate] = useState(EMPTY_TEMPLATE);
    const [permLists, setPermLists] = useState(EMPTY_LISTS);
    const [permDraft, setPermDraftState] = useState({});
    const [permSaved, setPermSaved] = useState({});
    const [reviewOpen, setReviewOpen] = useState(false);
    /* backend 263: the account's permission version read with the template, sent on every save; `source: copy` when the
       draft is an unedited Copy; a 409 STALE_VERSION keeps the draft and opens the stale-review dialog */
    const [permVersion, setPermVersion] = useState(null);
    const [permCan, setPermCan] = useState({});
    const [permError, setPermError] = useState("");   /* the list answered with an error body instead of modules (e.g. "This is an Admin Account") */
    const [draftSource, setDraftSource] = useState(null);
    const [stale, setStale] = useState(null);
    const mergeAfterReload = useRef(null);
    const { permissionList } = useSelector((state) => state.users);

    /* Picker lookups: fetched the first time a tab needs them and reused for the rest of this wizard open (the tabs
       unmount on switch). A failed fetch is not kept, so the next entry retries. */
    const lookups = useRef(new Map());
    const loadOnce = useCallback((key, fetch) => {
        if (!lookups.current.has(key)) {
            const pending = Promise.resolve(fetch()).then((res) => {
                if (res?.error) lookups.current.delete(key);
                return res;
            }, (error) => {
                lookups.current.delete(key);
                throw error;
            });
            lookups.current.set(key, pending);
        }
        return lookups.current.get(key);
    }, []);
    const templates = useRef(new Map());

    const resolver = useMemo(() => yupResolver(SCHEMA_BY_TAB[activeKey](isEdit)), [activeKey, isEdit]);

    const methods = useForm({
        defaultValues: addUserDetailFormState,
        resolver,
        mode: "onChange",
        context: { worker_staff_assign: workerStaffAssign, contract_staff_assign: contractStaffAssign },
    });
    const { reset, trigger, watch } = methods;
    const staffType = watch("staff_type");
    const audience = audienceOf(staffType);

    useEffect(() => {
        if (!isEdit) {
            reset(addUserDetailFormState);
            return undefined;
        }
        let active = true;
        setIsLoading(true);
        dispatch(fetchUserById({ staff_id: id })).then((res) => {
            if (!active) return;
            if (!res.error) {
                const data = res?.payload?.data;
                /* the backend stores Self as the user's own user_id (Priyanka, 11 Nov), so both null and own-id load as Self */
                setCurrentUser(data && (data.manager_id === null || String(data.manager_id) === String(data.user_id)) ? { ...data, manager_id: MANAGER_SELF_VALUE } : data);
            } else {
                setFormReady(true);
            }
            setIsLoading(false);
        });
        return () => { active = false; };
    }, [dispatch, id, isEdit, reset]);

    useEffect(() => {
        if (!currentUser || !isEdit) return;
        reset({ ...currentUser, prepared_groups: csvToGroups(currentUser.prepared_groups), ready_groups: csvToGroups(currentUser.ready_groups) });
        setUserStatus(Boolean(currentUser.status));
        setMfaEnabled(Boolean(currentUser.multifactor_email_authentication));
        setIsAssignEmployer(Boolean(currentUser.is_assign_employer));
        setIsAssignWorker(Boolean(currentUser.is_assign_worker));
        setIsAssignContract(Boolean(currentUser.is_assign_contract));
        setWorkerStaffAssign(currentUser.worker_assign_data ?? []);
        setContractStaffAssign(currentUser.contract_assign_data ?? []);
        setFormReady(true);
    }, [currentUser, isEdit, reset]);

    /* Permission template follows the staff type: the user's own set when editing the same type, else the blank set.
       Edit waits for the loaded user (no template for the default type first); each template is fetched once per open
       and handed out as a fresh copy; a response for a type no longer selected is dropped. */
    useEffect(() => {
        if (!staffType || !formReady) return undefined;
        let active = true;
        const ownType = isEdit && currentUser?.staff_type === staffType;
        const key = ownType ? `own:${id}` : `blank:${staffType}`;
        const apply = (template) => {
            if (!active) return;
            /* an error body (no `data` array) must not pass as an empty set: say so and never write it back */
            const unavailable = !Array.isArray(template?.data);
            setPermError(unavailable ? String(template?.error || template?.message || translation("key_something_went_wrong")) : "");
            if (unavailable) ShowToast("error", String(template?.error || template?.message || translation("key_something_went_wrong")));
            setPermTemplate(!unavailable ? JSON.parse(JSON.stringify(template)) : EMPTY_TEMPLATE);
            setPermVersion(ownType && Number.isInteger(template?.version) ? template.version : null);
            setPermCan(template?.can && typeof template.can === "object" ? template.can : {});
        };
        if (templates.current.has(key)) {
            apply(templates.current.get(key));
        } else {
            const action = ownType
                ? fetchPermissionSpecificUser({ staff_id: id })
                : fetchPermissionsWithoutStaff({ staff_type: staffType });
            dispatch(action).then((res) => {
                if (res?.error) {
                    /* backend 364: another user's set answers 403 without the right grants — say so instead of an empty form */
                    const body = res.payload?.data?.data;
                    apply({ message: body?.message || body?.error || res.payload?.data?.statusText });
                    return;
                }
                templates.current.set(key, res.payload || EMPTY_TEMPLATE);
                apply(res.payload || EMPTY_TEMPLATE);
            });
        }
        return () => { active = false; };
    }, [dispatch, staffType, id, isEdit, currentUser, formReady]);

    /* ownership eligibility option lists (internal staff): the same lookups the legacy engines panel used */
    useEffect(() => {
        if (staffType !== STAFF_TYPE.INTERNAL) return undefined;
        let active = true;
        Promise.all(Object.entries(PERM_OWN_LOOKUPS).map(([name, { key, params }]) => loadOnce(key, () => dispatch(LOOKUP_THUNK[name](params))).then((res) => [name, res?.error ? [] : listOf(res)], () => [name, []])))
            .then((entries) => { if (active) setPermLists(Object.fromEntries(entries)); });
        return () => { active = false; };
    }, [dispatch, loadOnce, staffType]);

    const perm = useMemo(() => {
        const { rows, bindingOf } = buildRows(permTemplate, permLists, audience);
        return { rows, bindingOf, engine: createPermissionEngine(rows) };
    }, [permTemplate, permLists, audience]);

    /* the baseline grants: template + the loaded staff record (edit) — every template / list / type change restarts the draft */
    useEffect(() => {
        const user = isEdit && currentUser?.staff_type === staffType ? currentUser : null;
        const grants = templateToGrants({ template: permTemplate, rows: perm.rows, bindingOf: perm.bindingOf, audience, user, form: user ? { prepared_groups: csvToGroups(user.prepared_groups), ready_groups: csvToGroups(user.ready_groups) } : null });
        setPermSaved(grants);
        /* after a stale reload: keep the admin's draft except where the other save changed the same key (AT-032 "Reload and review") */
        const merge = mergeAfterReload.current;
        mergeAfterReload.current = null;
        if (merge) {
            const changed = new Set(merge.changedKeys);
            const next = { ...merge.draft };
            perm.rows.forEach((r) => (r.contexts_by_audience?.[audience] || []).forEach((c) => {
                const b = perm.bindingOf(r.id, c);
                const k = `${r.id}|${c}`;
                if (b?.apiKey && changed.has(b.apiKey)) next[k] = grants[k];
                else if (!(k in next)) next[k] = grants[k];
            }));
            setPermDraftState(next);
            setDraftSource(null);
        } else {
            setPermDraftState(grants);
            setDraftSource(null);
        }
    }, [permTemplate, perm, audience, isEdit, currentUser, staffType]);

    const permissionsDirty = useMemo(() => perm.engine.diff(permSaved, permDraft, audience).some((d) => d.before !== d.after), [perm, permSaved, permDraft, audience]);
    const setPermDraft = useCallback((grants) => { setDraftSource(null); setPermDraftState(grants); }, []);
    const discardPermissions = useCallback(() => { setDraftSource(null); setPermDraftState(permSaved); }, [permSaved]);
    const applyCopiedGrants = useCallback((grants) => { setDraftSource(PERM_SAVE.SOURCE_COPY); setPermDraftState(grants); }, []);

    /* who the actor is: History opens on one gate (view_user today → view_permission_history later); eligibility is read-only without its authority */
    const isAdmin = useMemo(isAdminUser, []);
    /* backend 272: GET /permission/list carries `can` for the acting user (view_permission_history · view_user · …) computed as the gates
       enforce; the actor's own grant is the fallback for an older API */
    const canFlag = permCan[PERM_AUTHORITY_KEYS.VIEW_HISTORY] ?? permCan[PERM_HISTORY_GATE.key];
    const canViewHistory = isEdit && (isAdmin || (typeof canFlag === "boolean" ? canFlag : getPermissionValue(permissionList?.data, PERM_HISTORY_GATE.module, PERM_HISTORY_GATE.key) === PERM_API.YES));
    const canManageEligibility = isAdmin || permCan[PERM_AUTHORITY_KEYS.MANAGE_ELIGIBILITY] !== false;
    const readOnlyModules = useMemo(() => (canManageEligibility ? [] : [PERM_ASSIGNMENT_MODULE]), [canManageEligibility]);

    /* the account's own template again (after a 409): the draft is re-applied around the other save's keys, or dropped */
    const reloadPermissions = useCallback(async ({ keepDraft }) => {
        const res = await dispatch(fetchPermissionSpecificUser({ staff_id: id }));
        if (res?.error || !res?.payload) { ShowToast("error", translation("key_something_went_wrong")); return false; }
        templates.current.set(`own:${id}`, res.payload);
        if (keepDraft) mergeAfterReload.current = { changedKeys: (stale?.changedSince || []).map((e) => e.key_value), draft: permDraft };
        setPermTemplate(res.payload.data ? JSON.parse(JSON.stringify(res.payload)) : EMPTY_TEMPLATE);
        setPermVersion(Number.isInteger(res.payload.version) ? res.payload.version : null);
        setPermCan(res.payload.can && typeof res.payload.can === "object" ? res.payload.can : {});
        setStale(null);
        return true;
    }, [dispatch, id, stale, permDraft]);
    const reloadAndReview = useCallback(async () => { if (await reloadPermissions({ keepDraft: true })) setReviewOpen(true); }, [reloadPermissions]);
    const discardMine = useCallback(() => reloadPermissions({ keepDraft: false }), [reloadPermissions]);
    const closeStale = useCallback(() => setStale(null), []);

    /** grants of another user of the same type, read against this template's rows (copy source) */
    const loadUserGrants = useCallback(async (sourceUserId) => {
        const [permRes, userRes] = await Promise.all([dispatch(fetchPermissionSpecificUser({ staff_id: sourceUserId })), dispatch(fetchUserById({ staff_id: sourceUserId }))]);
        if (permRes?.error || !permRes?.payload) return null;
        const user = userRes?.error ? null : userRes?.payload?.data || null;
        return templateToGrants({ template: permRes.payload, rows: perm.rows, bindingOf: perm.bindingOf, audience, user, form: user ? { prepared_groups: csvToGroups(user.prepared_groups), ready_groups: csvToGroups(user.ready_groups) } : null });
    }, [dispatch, perm, audience]);

    const tabIndex = useMemo(() => USER_FORM_TABS.findIndex((tab) => tab.key === activeKey), [activeKey]);
    const isLastTab = tabIndex === USER_FORM_TABS.length - 1;

    const goToPrev = useCallback(() => {
        if (tabIndex > 0) setActiveKey(USER_FORM_TABS[tabIndex - 1].key);
    }, [tabIndex]);

    const goToNext = useCallback(async () => {
        const isValid = await trigger();
        if (isValid && tabIndex + 1 < USER_FORM_TABS.length) setActiveKey(USER_FORM_TABS[tabIndex + 1].key);
    }, [trigger, tabIndex]);

    const selectTab = useCallback(async (key) => {
        if (key === activeKey) return;
        const isValid = await trigger();
        if (isValid) setActiveKey(key);
        else ShowToast("error", translation("key_fill_required_fields_before_proceeding"));
    }, [activeKey, trigger]);

    const toggleUserStatus = useCallback(() => {
        if (!isEdit) return;
        setUserStatus((prev) => {
            const next = !prev;
            methods.setValue("status", next);
            return next;
        });
    }, [isEdit, methods]);

    const toggleMfa = useCallback(() => {
        setMfaEnabled((prev) => {
            const next = !prev;
            methods.setValue("multifactor_email_authentication", next);
            return next;
        });
    }, [methods]);

    const onCancel = useCallback(() => navigate(-1), [navigate]);

    const onSubmit = useCallback(async (data) => {
        const internal = data.staff_type === STAFF_TYPE.INTERNAL;
        /* the computed eligibility always travels (update-staff requires is_cs & co.); backend 267 gates on a *changed* value,
           so unchanged arrays need no authority. The CS guard runs only when the eligibility changed. */
        const ownership = internal ? ownershipFromGrants({ grants: permDraft, rows: perm.rows, bindingOf: perm.bindingOf, audience, engine: perm.engine }) : {};
        const ownershipChanged = internal && !(isEdit && sameOwnership(ownership, ownershipFromGrants({ grants: permSaved, rows: perm.rows, bindingOf: perm.bindingOf, audience, engine: perm.engine })));
        const payload = {
            ...data,
            date_of_joining: data.date_of_joining ? formatDate(data.date_of_joining) : null,
            status: userStatus ? 1 : 0,
            multifactor_email_authentication: mfaEnabled ? 1 : 0,
            is_assign_employer: isAssignEmployer ? 1 : 0,
            employer_assign_type: isAssignEmployer ? data.employer_assign_type : null,
            is_assign_worker: isAssignWorker ? 1 : 0,
            worker_assign_type: isAssignWorker ? data.worker_assign_type : null,
            worker_staff_assign: isAssignWorker ? workerStaffAssign : [],
            is_assign_contract: isAssignContract ? 1 : 0,
            contract_assign_type: isAssignContract ? data.contract_assign_type : null,
            contract_staff_assign: isAssignContract ? contractStaffAssign : [],
            manager_id: data.manager_id === MANAGER_SELF_VALUE ? null : data.manager_id,
            ...ownership,
        };
        /* Prepared / Ready eligibility is an internal-staff attribute: int arrays, absent for partner staff */
        if (!internal) { delete payload.prepared_groups; delete payload.ready_groups; }

        /* the CS guard checks the eligibility being sent, not the stored record (its CSV strings are not lists) */
        const csError = ownershipChanged ? csRequiredErrorKey(ownership) : null;
        if (csError) {
            setReviewOpen(false);
            if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
            ShowToast("error", translation(csError));
            return;
        }

        try {
            setIsSaving(true);
            /* mixed save = two calls (backend 267): the staff record first; a 403 MISSING_AUTHORITY on either stops here with the draft kept */
            const response = await dispatch(isEdit ? updateUser({ staff_id: id, ...payload }) : addUser(payload));
            if (response?.error) { setReviewOpen(false); showAuthorityOrError(response); return; }
            if (response?.payload?.data && permError) {
                /* the staff record is saved; the permission set was never loaded, so nothing is written over it */
                setReviewOpen(false);
                ShowToast("error", permError);
            } else if (response?.payload?.data && isEdit && !permissionsDirty) {
                /* U-0357: the wizard no longer carries the editor — an unchanged set is not written back (no second call) */
                setReviewOpen(false);
                showSuccessOrError(response);
                navigate(`/${routes.users}`);
            } else if (response?.payload?.data) {
                const template = grantsToTemplate({ template: permTemplate, grants: permDraft, rows: perm.rows, bindingOf: perm.bindingOf, audience });
                const body = { data: template.data, staff_id: response.payload.data.id };
                if (Number.isInteger(permVersion)) body.version = permVersion;
                if (draftSource === PERM_SAVE.SOURCE_COPY) body.source = PERM_SAVE.SOURCE_COPY;
                const permResponse = await dispatch(savePermissions(body));
                if (permResponse.error) {
                    setReviewOpen(false);
                    const err = errorBody(permResponse);
                    if (errorStatus(permResponse) === 409 && err?.code === PERM_SAVE.STALE) {
                        setStale({ changedSince: Array.isArray(err.changed_since) ? err.changed_since : [], currentVersion: err.current_version, message: err.message });
                        return;
                    }
                    showAuthorityOrError(permResponse);
                    return;
                }
                const saved = permResponse.payload || {};
                if (Number.isInteger(saved.version)) setPermVersion(saved.version);
                if (process.env.NODE_ENV !== "production" && Array.isArray(saved.ignored_keys) && saved.ignored_keys.length) console.warn("save-permissions ignored keys:", saved.ignored_keys);
                setPermSaved(permDraft);
                setDraftSource(null);
                setReviewOpen(false);
                if (saved.changed === 0 && isEdit) ShowToast("info", t(PERM_COPY_KEYS.noChange));
                else showSuccessOrError(response);
                navigate(`/${routes.users}`);
            }
        } catch (error) {
            ShowToast("error", translation("key_something_went_wrong"));
        } finally {
            setIsSaving(false);
        }
    }, [
        dispatch, id, isEdit, navigate, userStatus, mfaEnabled, isAssignEmployer, isAssignWorker, isAssignContract,
        workerStaffAssign, contractStaffAssign, permDraft, permSaved, permTemplate, perm, audience, permVersion, draftSource, permError, permissionsDirty,
    ]);

    /** Save on the last tab: validate, then review the permission changes before anything is written */
    const requestSubmit = useCallback(async () => {
        const isValid = await trigger();
        if (!isValid) { ShowErrorToast(); return; }
        if (permissionsDirty) setReviewOpen(true);
        else methods.handleSubmit(onSubmit)();
    }, [trigger, permissionsDirty, methods, onSubmit]);
    const confirmReview = useCallback(() => methods.handleSubmit(onSubmit)(), [methods, onSubmit]);
    const closeReview = useCallback(() => setReviewOpen(false), []);

    const mappingIds = useMemo(() => (
        isEdit && currentUser?.mapping_data
            ? currentUser.mapping_data.map((item) => (currentUser.mapped_by === "agency" ? item.agency_id : item.branch_id))
            : []
    ), [isEdit, currentUser]);

    const permissionDiffs = useMemo(() => perm.engine.diff(permSaved, permDraft, audience), [perm, permSaved, permDraft, audience]);

    return {
        methods,
        id,
        isEdit,
        permissionsOnly,
        isLoading,
        isSaving,
        activeKey,
        tabIndex,
        isLastTab,
        selectTab,
        goToPrev,
        goToNext,
        onSubmit,
        onCancel,
        userStatus,
        toggleUserStatus,
        mfaEnabled,
        toggleMfa,
        currentUser,
        mappingIds,
        loadOnce,
        /* permissions editor */
        perm,
        permTemplate,
        permVersion,
        canViewHistory,
        canManageEligibility,
        readOnlyModules,
        stale,
        closeStale,
        reloadAndReview,
        discardMine,
        audience,
        permDraft,
        permSaved,
        permissionsDirty,
        permissionDiffs,
        setPermDraft,
        discardPermissions,
        applyCopiedGrants,
        loadUserGrants,
        requestSubmit,
        reviewOpen,
        confirmReview,
        closeReview,
    };
};

const ShowErrorToast = () => ShowToast("error", translation("key_fill_required_fields_before_proceeding"));
/* 403 MISSING_AUTHORITY (backend 267) names the missing authority; any other refusal shows the server's message */
const showAuthorityOrError = (res) => {
    const err = errorBody(res);
    if (err?.code === PERM_SAVE.MISSING_AUTHORITY) { ShowToast("error", err.message || t(PERM_COPY_KEYS.missingAuthority, { authority: err.authority || "" })); return; }
    showErrorMessage(res);
};

export default useUserForm;
