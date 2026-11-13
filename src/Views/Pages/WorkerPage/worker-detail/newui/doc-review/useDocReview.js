import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { indonesiaId, workerMinAgeByNationalityId, workerTypeList } from "../../../../../../components/ReusableComponents/constants";
import { saveWorkerOverseasDetailSlice, saveWorkerValidateStatus } from "../../../../../../redux/Slices/worker/WorkerSlice";
import translation from "../../../../../../utils/translation";
import { gateVerifyOnCentral, getStatusTransitionError, sectionStatusOptions } from "../../statusTransition";
import { SEND_SITE } from "../../../../SettingsPage/newui/templates/templateConfiguration";
import {
    DOC_COMPARE_REFS, DOC_FIELD_KIND, DOC_REVIEW_ROLE, DOC_REVIEW_SPEC, DOC_STATUS_META,
    PASSPORT_NEVER_APPLIED_REASON, WORKER_DEFAULT_MIN_AGE, WORKER_MIN_AGE_MESSAGE_KEYS,
} from "../../../workerModuleConstants";

/* ---------------------------------------------------------------------------
 * Doc Upload review — the one logic for the eight documents (WORKER.md §9.1 / §9.3,
 * prototype docsHTML review card). Everything the server contract fixes per document
 * (type, field names, slug, module_key, worker_id source, transition refusal key) lives
 * in DOC_REVIEW_SPEC; the rules below read it. The helpers are pure so the tests can
 * pin the payload shapes and the compare / verify / holding rules per document.
 * ------------------------------------------------------------------------- */

const OVERSEAS_TYPE_ID = workerTypeList().find((t) => t.key === 'overseas')?.id;
const lower = (v) => String(v ?? '').toLowerCase();
const sameText = (a, b) => lower(a) === lower(b);
const hasAll = (record, ref) => Boolean(record?.[ref.name] && record?.[ref.birth_date] && record?.[ref.birth_place]);
const isPathA = (overseas) => overseas?.passport_lost_reason === PASSPORT_NEVER_APPLIED_REASON;

export const docSpec = (docKey) => DOC_REVIEW_SPEC[docKey];

/* the stored values the form starts from; Save is offered only when something differs (SR-03) */
export const docStoredFields = (spec, overseas) => (spec?.fields || []).reduce((acc, f) => {
    acc[f.name] = overseas?.[f.name] || "";
    return acc;
}, {});

/* the reference record the match tags read (legacy storeMatchData): a dependent compares with the KTP once all
   three KTP values exist, else with the Passport; the KTP itself compares with the Passport unless the passport
   was never applied for (Path A — it is then the central document and compares with nothing) */
export const docMatchRef = (spec, overseas) => {
    if (!overseas) return null;
    if (spec.role === DOC_REVIEW_ROLE.KTP) return isPathA(overseas) ? null : DOC_COMPARE_REFS.passport;
    if (spec.role === DOC_REVIEW_ROLE.DEPENDENT) return hasAll(overseas, DOC_COMPARE_REFS.ktp) ? DOC_COMPARE_REFS.ktp : DOC_COMPARE_REFS.passport;
    return null;
};
export const docMatchFlags = (spec, overseas) => {
    const ref = docMatchRef(spec, overseas);
    const flags = {};
    (spec?.fields || []).forEach((f) => {
        if (!ref || !f.compare) { flags[f.name] = false; return; }
        const refValue = overseas?.[ref[f.compare]];
        if (!refValue) { flags[f.name] = false; return; }
        flags[f.name] = f.kind === DOC_FIELD_KIND.TEXT ? sameText(overseas?.[f.name], refValue) : overseas?.[f.name] === refValue;
    });
    return { ref, flags };
};

/* the reference record Verify checks against (legacy commonVerifyInfo): Path A → KTP, else Passport; the KTP
   itself is checked against the Passport unless Path A. Returns the refusal key, or null when the stored values match. */
export const docVerifyMismatch = (spec, overseas) => {
    if (!overseas) return null;
    let ref = null;
    if (spec.role === DOC_REVIEW_ROLE.KTP) ref = isPathA(overseas) ? null : DOC_COMPARE_REFS.passport;
    if (spec.role === DOC_REVIEW_ROLE.DEPENDENT) ref = isPathA(overseas) ? DOC_COMPARE_REFS.ktp : DOC_COMPARE_REFS.passport;
    if (!ref) return null;
    const ok = (spec.fields || []).filter((f) => f.compare).every((f) => (
        f.kind === DOC_FIELD_KIND.TEXT ? sameText(overseas?.[f.name], overseas?.[ref[f.compare]]) : overseas?.[f.name] === overseas?.[ref[f.compare]]
    ));
    if (ok) return null;
    return ref === DOC_COMPARE_REFS.ktp ? 'key_details_not_matched_with_indonesian_id' : 'key_details_not_matched_with_passport';
};

/* W-27 holding state (§5.3 admin view: Pending Central Doc Verification): a dependent at Uploaded waits for the central
   document — KTP waits for the Passport unless Path A; the others wait for the KTP on Path A, else the Passport */
export const docIsHolding = (spec, overseas, status) => {
    if (status !== 'uploaded') return false;
    if (spec.role === DOC_REVIEW_ROLE.KTP) return !isPathA(overseas) && overseas?.passport_status !== 'verified';
    if (spec.role === DOC_REVIEW_ROLE.DEPENDENT) return (isPathA(overseas) ? overseas?.indonesian_id_status : overseas?.passport_status) !== 'verified';
    return false;
};

/* the Save body, exactly as each legacy tab sent it: worker_id from the route or the record, module_key only where it was sent */
export const docSavePayload = (spec, { routeWorkerId, workerId }, form) => {
    const payload = { worker_id: spec.workerIdFromRoute ? routeWorkerId : workerId, type: spec.type };
    (spec.fields || []).forEach((f) => { payload[f.name] = form?.[f.name]; });
    if (spec.saveModuleKey) payload.module_key = "worker";
    return payload;
};

/* the Action Required template: the Birth Certificate on an Indonesian overseas record sends its "date not matched" variant */
export const docTemplateSlug = (spec, record) => (
    spec.slugIndonesianOverseas && indonesiaId == record?.nationality?.id && record?.type === OVERSEAS_TYPE_ID ? spec.slugIndonesianOverseas : spec.slug
);

/* the Action Required send site: the Doc Upload of the worker's journey (Overseas Indonesia ST-05, Overseas Philippines ST-03) */
export const docSendSite = (record) => (indonesiaId == record?.nationality?.id ? SEND_SITE.WORKER_DOCS_ID_AR : SEND_SITE.WORKER_DOCS_PH_AR);

/* required-on-Save rules the Birth / Family / Education forms carried (yup): the field's own refusal key, or none */
export const docSaveErrors = (spec, form) => {
    const errors = {};
    if (!spec?.requiredOnSave) return errors;
    (spec.fields || []).forEach((f) => {
        if (f.requiredKey && !String(form?.[f.name] ?? '').trim()) errors[f.name] = f.requiredKey;
    });
    return errors;
};

const emptyTemplate = { slug: "", site: "", title: "", userType: "", statusKey: "", actionStatusType: "" };

const useDocReview = (docKey, { uploadDocPermission, isAdmin, onRefreshActivity, centralVerified }) => {
    const spec = docSpec(docKey);
    const dispatch = useDispatch();
    const { worker_id: routeWorkerId } = useParams();
    const mountedRef = useRef(true);
    useEffect(() => () => { mountedRef.current = false; }, []);

    const { workerDocumentUploadInfo, allStatusList, status, activityLogList } = useSelector((state) => state.worker);
    const record = workerDocumentUploadInfo;
    const overseas = record?.worker_overseas_detail_info;
    const updateStatus = overseas?.[spec.statusField];
    const fileUrl = overseas?.[spec.fileField];
    const uploadedAt = overseas?.[spec.uploadedAtField];

    const perms = Array.isArray(uploadDocPermission) ? uploadDocPermission : [];
    /* PERM §5.9.3: the edit sub-verb (or admin) edits; Action Required needs send_template; the footer needs change_status */
    const canEdit = perms.includes('edit') || Boolean(isAdmin);
    const canSendTemplate = perms.includes('send_template') || Boolean(isAdmin);
    const canChangeStatus = perms.includes('change_status') || Boolean(isAdmin);
    /* a locked section (Incomplete / Verified / unknown) is read-only for everyone (§16.2: unknown reads as Incomplete) */
    const isLocked = updateStatus === "in_complete" || updateStatus === "verified" || !updateStatus;
    const loading = status === 'loading';
    const isReadOnly = !canEdit || isLocked || loading;

    const storedFields = useMemo(() => docStoredFields(spec, overseas), [spec, overseas]);
    const [form, setForm] = useState(storedFields);
    const [errors, setErrors] = useState({});
    useEffect(() => { setForm(storedFields); setErrors({}); }, [storedFields]);
    const isDirty = Object.keys(storedFields).some((k) => String(form[k] ?? '') !== String(storedFields[k] ?? ''));

    const minAge = workerMinAgeByNationalityId[record?.nationality?.id] || 0;
    const match = useMemo(() => docMatchFlags(spec, overseas), [spec, overseas]);
    const holding = docIsHolding(spec, overseas, updateStatus);
    const pathA = isPathA(overseas);

    const [template, setTemplate] = useState(emptyTemplate);
    const [templateOpen, setTemplateOpen] = useState(false);

    const handleChange = useCallback((name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
        setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
    }, []);

    const afterWrite = useCallback((res) => {
        if (!mountedRef.current) return;
        if (res?.payload?.status) {
            onRefreshActivity(docKey);
            ShowToast("success", res?.payload?.message);
        } else {
            ShowToast("error", res?.payload?.message);
        }
    }, [docKey, onRefreshActivity]);

    /* explicit Save (SR-03 / audit P38): nothing is written on blur, nothing when nothing changed */
    const handleSave = useCallback(() => {
        if (isReadOnly || !isDirty) return;
        const required = docSaveErrors(spec, form);
        if (Object.keys(required).length) { setErrors(required); return; }
        if (spec.validateBirthAge) {
            const birthField = spec.fields.find((f) => f.kind === DOC_FIELD_KIND.BIRTH_DATE);
            const raw = birthField && form[birthField.name];
            if (raw) {
                const birthDate = new Date(raw);
                const today = new Date();
                if (birthDate >= today.setHours(0, 0, 0, 0)) { ShowToast("error", translation('key_birth_date_in_passport_must_be_before_today')); return; }
                if (minAge > 0) {
                    const now = new Date();
                    const minBirthDate = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
                    if (birthDate > minBirthDate) { ShowToast("error", translation(WORKER_MIN_AGE_MESSAGE_KEYS[minAge] || WORKER_MIN_AGE_MESSAGE_KEYS[WORKER_DEFAULT_MIN_AGE])); return; }
                }
            }
        }
        dispatch(saveWorkerOverseasDetailSlice(docSavePayload(spec, { routeWorkerId, workerId: record?.id }, form))).then(afterWrite);
    }, [isReadOnly, isDirty, spec, form, minAge, dispatch, routeWorkerId, record?.id, afterWrite]);

    const handleChangeStatus = useCallback((id) => {
        const transitionError = getStatusTransitionError(updateStatus, id, { normalizeEmpty: false, incompleteCurrentKey: spec.incompleteCurrentKey });
        if (transitionError) { ShowToast("error", translation(transitionError)); return; }
        if (id === 'action_required') {
            if (!canSendTemplate) return;
            setTemplate({ slug: docTemplateSlug(spec, record), site: docSendSite(record), title: translation('key_send_template_action_required'), userType: "worker", actionStatusType: spec.actionStatusType, statusKey: id });
            setTemplateOpen(true);
            return;
        }
        if (id === 'verified') {
            const mismatch = docVerifyMismatch(spec, overseas);
            if (mismatch) { ShowToast("error", translation(mismatch)); return; }
        }
        dispatch(saveWorkerValidateStatus({ worker_id: record?.id, type: spec.type, status_key: id })).then(afterWrite);
    }, [updateStatus, spec, canSendTemplate, record, overseas, dispatch, afterWrite]);

    const closeTemplate = useCallback(() => setTemplateOpen(false), []);
    const handleTemplateSent = useCallback(() => { onRefreshActivity(docKey); setTemplateOpen(false); }, [onRefreshActivity, docKey]);

    /* the popover lists the current state first (prototype reviewStatusPopHTML), then the legal targets; Verify on a
       dependent stays listed but disabled until the central document is Verified (W-27) */
    const statusOptions = useMemo(() => {
        const current = DOC_STATUS_META[updateStatus] ? [{ id: updateStatus, name: translation(DOC_STATUS_META[updateStatus].key) }] : [];
        const targets = sectionStatusOptions(allStatusList, updateStatus).filter((o) => canSendTemplate || o.id !== 'action_required');
        return current.concat(gateVerifyOnCentral(targets, centralVerified));
    }, [allStatusList, updateStatus, canSendTemplate, centralVerified]);

    return {
        spec, record, overseas, updateStatus, fileUrl, uploadedAt, pathA,
        canEdit, canSendTemplate, canChangeStatus, isLocked, isReadOnly, loading,
        form, errors, isDirty, minAge, match, holding,
        handleChange, handleSave, handleChangeStatus, statusOptions,
        activityLogList,
        template, templateOpen, closeTemplate, handleTemplateSent,
    };
};

export default useDocReview;
