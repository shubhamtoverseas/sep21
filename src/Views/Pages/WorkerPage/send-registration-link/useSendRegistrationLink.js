import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "../../../../services/commonService";
import { getPermissionValue, isAdminUser, isPartnerUser } from "../../../../services/permissionService";
import { addNewWorkerByAdmin, resendWorkerInvitation, revokeWorkerInvitation } from "../../../../services/workers";
import { fetchActiveAgencies } from "../../../../redux/Slices/settings/agencies/AgenciesSlice";
import { fetchBranchesByAgencyId, fetchBranchesByPartnerStaffId } from "../../../../redux/Slices/settings/branches/BranchesSlice";
import routes from "../../routes/routesConfig";
import { absoluteRoute } from "../../../../utils/utils";
import {
    canCreateWorkerByLink,
    SEND_REG_LINK_AGENCIES_QUERY,
    SEND_REG_LINK_CONFLICT_CODE,
    SEND_REG_LINK_CONFLICT_STATUS,
    SEND_REG_LINK_COPY,
    SEND_REG_LINK_EMAIL_RE,
    SEND_REG_LINK_EMPTY,
    SEND_REG_LINK_FAILURE,
    SEND_REG_LINK_PHASE,
} from "../workerModuleConstants";

/* W-01 / OvN #23 (D48): the address is compared case-insensitively on the server and never rewritten — only surrounding whitespace is dropped */
const normalizeEmail = (value) => String(value == null ? "" : value).trim();
const listFrom = (payload) => (Array.isArray(payload) ? payload : (Array.isArray(payload?.data) ? payload.data : []));
const agencyLabel = (agency) => [agency?.agency_code || agency?.code, agency?.agency_name || agency?.name].filter(Boolean).join(" · ");
const toBranchOption = (branch) => ({ value: String(branch.id), label: branch.branch_name || "" });

const useSendRegistrationLink = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const permissionList = useSelector((state) => state.users.permissionList);
    const isAdmin = useMemo(isAdminUser, []);
    const isPartner = useMemo(isPartnerUser, []);
    const staff = useMemo(() => getCurrentUser()?.data?.staff, []);

    /* U-0216: creating a worker through the link needs Create Worker AND Send Link (host); the server rechecks at submission */
    const canSend = useMemo(() => canCreateWorkerByLink({ permissionList: permissionList?.data, isAdmin, isPartner, getPermissionValue }), [isAdmin, isPartner, permissionList?.data]);

    const [phase, setPhase] = useState(canSend ? SEND_REG_LINK_PHASE.FORM : SEND_REG_LINK_PHASE.BLOCKED_PERMISSION);
    const [values, setValues] = useState(SEND_REG_LINK_EMPTY);
    const [errors, setErrors] = useState({});
    const [formError, setFormError] = useState("");
    const [agencies, setAgencies] = useState([]);
    const [branches, setBranches] = useState([]);
    const [agenciesLoading, setAgenciesLoading] = useState(!isPartner);
    const [branchesLoading, setBranchesLoading] = useState(isPartner);
    const [chosenBranch, setChosenBranch] = useState("");
    const [result, setResult] = useState(null);
    const [failure, setFailure] = useState(null);
    const [acting, setActing] = useState(false);   /* Resend / Revoke on a pending invitation in flight */
    /* W-10: one Idempotency-Key per form submission — Retry re-sends the same key, so a timed-out send never creates a second invitation */
    const submissionKey = useRef(null);

    useEffect(() => {
        if (isPartner || !canSend) return undefined;
        let alive = true;
        dispatch(fetchActiveAgencies(SEND_REG_LINK_AGENCIES_QUERY)).then((res) => {
            if (!alive) return;
            setAgencies(listFrom(res?.payload).map((agency) => ({
                value: String(agency.id),
                label: agencyLabel(agency),
                code: agency.agency_code || agency.code || "",
                name: agency.agency_name || agency.name || "",
            })));
            setAgenciesLoading(false);
        });
        return () => { alive = false; };
    }, [dispatch, isPartner, canSend]);

    useEffect(() => {
        if (!isPartner || !canSend) return undefined;
        let alive = true;
        dispatch(fetchBranchesByPartnerStaffId({ partner_staff_id: staff?.id })).then((res) => {
            if (!alive) return;
            const options = listFrom(res?.payload?.data ?? res?.payload).map(toBranchOption);
            setBranches(options);
            setBranchesLoading(false);
            setValues((prev) => ({ ...prev, agency_id: String(staff?.staff_agency_id || "") }));
            if (options.length === 0) setPhase(SEND_REG_LINK_PHASE.BLOCKED_SCOPE);
            else if (options.length === 1) setValues((prev) => ({ ...prev, branch_id: options[0].value }));
            else setPhase(SEND_REG_LINK_PHASE.CHOOSE_BRANCH);
        });
        return () => { alive = false; };
    }, [dispatch, isPartner, canSend, staff?.id, staff?.staff_agency_id]);

    useEffect(() => {
        if (isPartner) return undefined;
        if (!values.agency_id) { setBranches([]); return undefined; }
        let alive = true;
        setBranchesLoading(true);
        dispatch(fetchBranchesByAgencyId({ agency_id: values.agency_id })).then((res) => {
            if (!alive) return;
            const options = listFrom(res?.payload).map(toBranchOption);
            setBranches(options);
            setBranchesLoading(false);
            if (options.length === 1) setValues((prev) => ({ ...prev, branch_id: options[0].value }));
        });
        return () => { alive = false; };
    }, [dispatch, isPartner, values.agency_id]);

    const setField = useCallback((key, value) => {
        setValues((prev) => {
            const next = { ...prev, [key]: value };
            if (key === "agency_id") next.branch_id = "";
            return next;
        });
        setErrors((prev) => ({ ...prev, [key]: undefined }));
        setFormError("");
        submissionKey.current = null;
    }, []);

    const validate = useCallback(() => {
        const next = {};
        if (!values.agency_id) next.agency_id = SEND_REG_LINK_COPY.errorAgency;
        else if (!values.branch_id) next.branch_id = SEND_REG_LINK_COPY.errorBranch;
        const email = normalizeEmail(values.email);
        if (!email) next.email = SEND_REG_LINK_COPY.errorEmailRequired;
        else if (!SEND_REG_LINK_EMAIL_RE.test(email)) next.email = SEND_REG_LINK_COPY.errorEmailInvalid;
        setErrors(next);
        return Object.keys(next).length === 0;
    }, [values]);

    const recheckScope = useCallback(async (payload) => {
        const res = isPartner
            ? await dispatch(fetchBranchesByPartnerStaffId({ partner_staff_id: staff?.id }))
            : await dispatch(fetchBranchesByAgencyId({ agency_id: payload.agency_id }));
        if (res?.error) return true;
        const options = listFrom(isPartner ? (res?.payload?.data ?? res?.payload) : res?.payload).map(toBranchOption);
        setBranches(options);
        if (options.some((branch) => branch.value === String(payload.branch_id))) return true;
        if (isPartner || options.length === 0) {
            setPhase(SEND_REG_LINK_PHASE.BLOCKED_SCOPE);
        } else {
            setValues((prev) => ({ ...prev, branch_id: "" }));
            setFormError(SEND_REG_LINK_COPY.unavailableScope);
            setPhase(SEND_REG_LINK_PHASE.FORM);
        }
        return false;
    }, [dispatch, isPartner, staff?.id]);

    const send = useCallback(async (payload) => {
        setPhase(SEND_REG_LINK_PHASE.SENDING);
        setFormError("");
        setFailure(null);
        if (!canSend) { setPhase(SEND_REG_LINK_PHASE.BLOCKED_PERMISSION); return; }
        if (!(await recheckScope(payload))) return;
        try {
            if (!submissionKey.current) submissionKey.current = uuidv4();
            const res = await addNewWorkerByAdmin(payload, submissionKey.current);
            if (res?.data?.status === false) throw Object.assign(new Error(res.data.message), { response: res });
            /* D50: the success panel is the outcome — no duplicate toast; a `replayed` answer is the same invitation (W-10) */
            setResult({ email: payload.email, data: res?.data?.data || null });
            setPhase(SEND_REG_LINK_PHASE.SENT);
            submissionKey.current = null;
        } catch (err) {
            /* W-9 (backend 248): a 409 is read by `code` — a pending invitation offers Resend / Revoke for that worker (nothing else about
               the other record is shown); an already-registered e-mail / mobile gets the fixed non-disclosing copy; anything else the
               neutral failure copy, never the server's own message */
            const body = err?.response?.data || {};
            const isConflict = err?.response?.status === SEND_REG_LINK_CONFLICT_STATUS;
            const pendingWorkerId = isConflict && body.code === SEND_REG_LINK_CONFLICT_CODE.PENDING ? body?.data?.worker_id ?? null : null;
            setFailure({
                kind: pendingWorkerId != null ? SEND_REG_LINK_FAILURE.CONFLICT_PENDING : (isConflict ? SEND_REG_LINK_FAILURE.CONFLICT : SEND_REG_LINK_FAILURE.ERROR),
                message: "", workerId: pendingWorkerId, email: payload.email,
            });
            setPhase(SEND_REG_LINK_PHASE.FAILED);
        }
    }, [canSend, recheckScope]);

    /* the pending invitation the 409 pointed at: Resend sends the same link again; Revoke withdraws it (the Partner Pending record is deleted) */
    const resendPending = useCallback(async () => {
        if (failure?.workerId == null || acting) return;
        setActing(true);
        try {
            const res = await resendWorkerInvitation({ worker_id: failure.workerId });
            if (res?.data?.status === false) throw new Error(res.data.message);
            setResult({ email: failure.email, data: res?.data?.data || null, resent: true });
            setFailure(null);
            setPhase(SEND_REG_LINK_PHASE.SENT);
        } catch (err) {
            setFormError(err?.response?.data?.message || err?.message || SEND_REG_LINK_COPY.failedText);
            setPhase(SEND_REG_LINK_PHASE.FORM);
            setFailure(null);
        } finally { setActing(false); }
    }, [failure, acting]);
    const revokePending = useCallback(async () => {
        if (failure?.workerId == null || acting) return;
        setActing(true);
        try {
            const res = await revokeWorkerInvitation({ worker_id: failure.workerId });
            if (res?.data?.status === false) throw new Error(res.data.message);
            setFormError(SEND_REG_LINK_COPY.revokedText);
        } catch (err) {
            setFormError(err?.response?.data?.message || err?.message || SEND_REG_LINK_COPY.failedText);
        } finally {
            setActing(false); setFailure(null); submissionKey.current = null;
            setPhase(SEND_REG_LINK_PHASE.FORM);
        }
    }, [failure, acting]);

    const submit = useCallback(() => {
        if (!validate()) { setPhase(SEND_REG_LINK_PHASE.FORM); return; }
        /* backend 271: agency · branch · email only (Idempotency-Key comes from the admin API client); a partner actor sends its own
           staff_id so it is appointed PT as before — a host send leaves the PT unassigned (Assign PT later) */
        send({ agency_id: Number(values.agency_id), branch_id: Number(values.branch_id), email: normalizeEmail(values.email), ...(isPartner && staff?.id ? { staff_id: Number(staff.id) } : {}) });
    }, [validate, values, send, isPartner, staff?.id]);

    const onSubmit = useCallback((event) => {
        event?.preventDefault();
        submit();
    }, [submit]);

    const retry = useCallback(() => { submit(); }, [submit]);

    const sendAnother = useCallback(() => {
        setValues((prev) => ({ ...SEND_REG_LINK_EMPTY, ...(isPartner ? { agency_id: prev.agency_id, branch_id: prev.branch_id } : {}) }));
        setErrors({}); setFormError(""); setResult(null); setFailure(null); submissionKey.current = null;
        setPhase(SEND_REG_LINK_PHASE.FORM);
    }, [isPartner]);

    const backToForm = useCallback(() => { setFailure(null); setPhase(SEND_REG_LINK_PHASE.FORM); }, []);

    const continueWithBranch = useCallback(() => {
        if (!chosenBranch) return;
        setValues((prev) => ({ ...prev, branch_id: chosenBranch }));
        setPhase(SEND_REG_LINK_PHASE.FORM);
    }, [chosenBranch]);

    const exit = useCallback(() => navigate(absoluteRoute(routes.workers)), [navigate]);

    const partnerAgencyLabel = isPartner ? (staff?.agency_name || "") : "";
    const noEligibleAgency = !isPartner && !agenciesLoading && agencies.length === 0;
    const noEligibleBranch = Boolean(values.agency_id) && !branchesLoading && branches.length === 0;
    const isSending = phase === SEND_REG_LINK_PHASE.SENDING;
    const sendDisabled = isSending || noEligibleAgency || noEligibleBranch;

    return {
        phase, isPartner, values, errors, formError, agencies, branches, agenciesLoading, branchesLoading,
        partnerAgencyLabel, noEligibleAgency, noEligibleBranch, isSending, sendDisabled,
        result, failure, chosenBranch, acting,
        setField, onSubmit, retry, sendAnother, backToForm, setChosenBranch, continueWithBranch, exit, resendPending, revokePending,
    };
};

export default useSendRegistrationLink;
