import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../../../../components/ui/Modal";
import Btn from "../../../../../components/ui/Btn";
import SearchSelect from "../../../../../components/ui/SearchSelect";
import formStyles, { Checkbox, Field, FormGrid, TextArea, TextInput } from "../../../../../components/ui/FormControls";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import translation from "../../../../../utils/translation";
import { headingCase } from "../../../../../utils/utils";
import { changeJobOfferCsOwnerAPI, getJobOfferEligibleCsAPI } from "../../../../../services/jobOffers";
import { CAL_HTTP, FU_COPY_KEY } from "../../../Calendar/newui/calendarConstants";
import { JO_CS_REQUEST_APPROVAL_CODE, JO_INTERPRETER_CLIENT_FILTER_MAX, JO_INTERPRETER_SEARCH_DEBOUNCE_MS, JO_OWNER_ASSISTANT_ACTION, JO_OWNER_COLLISION_CODE, JO_OWNER_COPY, JO_OWNER_REASON_MAX } from "../../jobOfferConstants";

/*
 * Change CS Owner of ONE Job Offer (PERM §4.13; OWNERS.md CS Owner; prototype Contract_Details owner-change dialog — work
 * order 26 Oct): Current (read-only) → New CS Owner = ONE searchable select of the eligible CS staff (`POST
 * /get-eligible-cs-staff { job_id, search }` — active, allowed branch, required language: the server decides; the current
 * owner comes back `is_current_owner` and stays listed, disabled) with the prototype help note → Reason (optional) →
 * Cancel / Change → `POST /change-job-owner`. Choosing the Job Offer's current CS Assistant is never silent: the dialog
 * asks for the explicit "Also set CS Assistant to Unassigned" tick and sends the clear with the change (prototype B27-15,
 * CMATRIX); the server also refuses the pair (422 JO_OWNER_IS_ASSISTANT). A 403 (grant withdrawn while open) shows the
 * neutral notice and closes; any other refusal stays in the form — including backend 333's CS_REQUEST_APPROVAL_REQUIRED
 * (a pending employer request needs Approve CS Request too) and the 422s JO_OWNER_STAFF_NOT_MANUAL / _BRANCH / _LANGUAGE.
 * Opened from a "CS change requested" cell the dialog shows the employer's request (`requestReason`); the transfer
 * approves and clears it in the same commit (backend 332).
 */
const matchesNameOrBranch = (option, input) => {
    const q = String(input || "").trim().toLowerCase();
    return !q || String(option.label || "").toLowerCase().includes(q) || String(option.sub || "").toLowerCase().includes(q);
};

const JoChangeOwnerDialog = ({ jobId, currentOwnerName, currentAssistant = null, requestReason = "", onClose, onDone }) => {
    /* the assistant the server named in a 422 ASSISTANT_COLLISION (backend 283) when the record on screen was stale */
    const [serverAssistant, setServerAssistant] = useState(null);
    const [query, setQuery] = useState("");
    const [eligible, setEligible] = useState(null);     /* the server's list for the current query — null while loading */
    const [serverFiltered, setServerFiltered] = useState(false);
    const [target, setTarget] = useState("");
    const [reason, setReason] = useState("");
    const [clearAssistant, setClearAssistant] = useState(false);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const requestSeq = useRef(0);
    const firstLoad = useRef(true);

    const search = useCallback((text) => {
        const seq = ++requestSeq.current;
        return getJobOfferEligibleCsAPI({ job_id: jobId, ...(text ? { search: text } : {}) })
            .then((res) => {
                if (seq !== requestSeq.current) return;
                const rows = res?.data?.data;
                const list = Array.isArray(rows) ? rows : (Array.isArray(rows?.data) ? rows.data : []);
                setEligible(list);
                if (firstLoad.current) { firstLoad.current = false; setServerFiltered(list.length > JO_INTERPRETER_CLIENT_FILTER_MAX); }
            })
            .catch((err) => {
                if (seq !== requestSeq.current) return;
                setEligible([]);
                setError(err?.response?.data?.message || "");
            });
    }, [jobId]);
    /* the unfiltered list once; a long list is re-asked of the server as the user types (300 ms) */
    useEffect(() => { search(""); }, [search]);
    useEffect(() => {
        if (!serverFiltered) return undefined;
        const timer = setTimeout(() => { search(query.trim()); }, JO_INTERPRETER_SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [serverFiltered, query, search]);

    const assistant = serverAssistant || currentAssistant;
    const assistantId = assistant?.id != null ? String(assistant.id) : null;
    const options = useMemo(() => (Array.isArray(eligible) ? eligible : []).map((row) => {
        const isCurrent = Boolean(row.is_current_owner);
        const isAssistant = assistantId !== null && String(row.id) === assistantId;
        const sub = [row.branch_name, row.workload, isCurrent ? translation("key_current").toLowerCase() : "", isAssistant ? translation("key_cs_assistant") : ""].filter(Boolean).join(" · ");
        return { value: String(row.id), label: row.name, sub, isDisabled: isCurrent };
    }), [eligible, assistantId]);
    const noEligible = eligible !== null && eligible.length === 0 && !query.trim();
    const collide = Boolean(target) && assistantId !== null && String(target) === assistantId;
    const canChange = Boolean(target) && !saving && !noEligible && (!collide || clearAssistant);

    const submit = (event) => {
        event.preventDefault();
        if (!target) { setError(JO_OWNER_COPY.pick); return; }
        if (collide && !clearAssistant) return;
        setSaving(true);
        setError("");
        changeJobOfferCsOwnerAPI({
            job_id: jobId, cs_owner_staff_id: Number(target),
            ...(reason.trim() ? { reason: reason.trim() } : {}),
            /* the assistant register is cleared in the same audited operation (the Contract register's contract) */
            ...(collide ? { cs_assistant_action: JO_OWNER_ASSISTANT_ACTION.REMOVE } : {}),
        })
            .then((res) => {
                if (res?.data?.status === false) {
                    if (res?.data?.code === JO_OWNER_COLLISION_CODE) { setServerAssistant({ id: res.data.cs_assistant_staff_id, name: assistant?.name || "" }); setSaving(false); return; }
                    setError(res?.data?.message || JO_OWNER_COPY.failed); setSaving(false); return;
                }
                ShowToast("success", res?.data?.message || JO_OWNER_COPY.changed);
                onDone?.();
                onClose();
            })
            .catch((err) => {
                setSaving(false);
                if (err?.response?.data?.code === JO_OWNER_COLLISION_CODE) { setServerAssistant({ id: err.response.data.cs_assistant_staff_id, name: assistant?.name || "" }); return; }
                if (err?.response?.status === CAL_HTTP.FORBIDDEN && err?.response?.data?.code !== JO_CS_REQUEST_APPROVAL_CODE) {
                    ShowToast("error", `${ translation(FU_COPY_KEY.notAvailableTitle) } · ${ translation(FU_COPY_KEY.notAvailable) }`);
                    onClose();
                    return;
                }
                setError(err?.response?.data?.message || JO_OWNER_COPY.failed);
            });
    };

    const footer = (
        <>
            <Btn variant="secondary" onClick={ onClose } disabled={ saving }>{ translation("key_cancel") }</Btn>
            <Btn variant="primary" type="submit" form="jo-change-owner-form" disabled={ !canChange }>{ saving ? translation("key_loading") : JO_OWNER_COPY.confirm }</Btn>
        </>
    );

    return (
        <Modal title={ headingCase(JO_OWNER_COPY.title) } width={ 520 } onClose={ onClose } footer={ footer } busy={ saving }>
            <form id="jo-change-owner-form" onSubmit={ submit } noValidate data-jo-change-owner={ jobId }>
                <FormGrid columns={ 2 }>
                    <Field label={ JO_OWNER_COPY.current } htmlFor="jo-owner-current" full>
                        <TextInput id="jo-owner-current" type="text" value={ currentOwnerName || "—" } readOnly />
                    </Field>
                    { requestReason && (
                        <Field label={ translation("key_cs_change_request") } htmlFor="jo-owner-request" full>
                            <TextArea id="jo-owner-request" rows={ 2 } readOnly value={ requestReason } data-jo-owner-request="" />
                        </Field>
                    ) }
                    <Field label={ JO_OWNER_COPY.newOwner } htmlFor="jo-owner-new" required full error={ error } hint={ JO_OWNER_COPY.help }>
                        <SearchSelect
                            inputId="jo-owner-new"
                            value={ target }
                            options={ options }
                            onChange={ (v) => { setTarget(v); setClearAssistant(false); setError(""); } }
                            onInputChange={ (text, meta) => { if (meta?.action === "input-change") setQuery(text); } }
                            filterOption={ serverFiltered ? null : matchesNameOrBranch }
                            isLoading={ eligible === null }
                            disabled={ saving }
                            invalid={ Boolean(error) }
                            placeholder={ JO_OWNER_COPY.pick }
                            noOptionsMessage={ noEligible ? JO_OWNER_COPY.noEligible : translation("key_no_results_found") }
                        />
                    </Field>
                    { collide && (
                        <div className={ `${ formStyles.fieldFull } ${ formStyles.hint }` } role="alert" data-jo-owner-collision="">
                            <b>{ assistant?.name || "" } { translation("key_is_this_records_cs_assistant") }</b> { translation("key_owner_assistant_collision_note") }
                            <Checkbox label={ translation("key_also_set_cs_assistant_unassigned") } checked={ clearAssistant } disabled={ saving } onChange={ (e) => setClearAssistant(e.target.checked) } />
                        </div>
                    ) }
                    <Field label={ `${ JO_OWNER_COPY.reason } (${ translation("key_optional") })` } htmlFor="jo-owner-reason" full>
                        <TextArea id="jo-owner-reason" rows={ 3 } value={ reason } maxLength={ JO_OWNER_REASON_MAX } disabled={ saving } onChange={ (event) => setReason(event.target.value) } />
                    </Field>
                </FormGrid>
                { noEligible && <div role="status" className={ formStyles.hint } data-jo-no-eligible-cs="">{ JO_OWNER_COPY.noEligible }</div> }
            </form>
        </Modal>
    );
};

JoChangeOwnerDialog.propTypes = {
    jobId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    currentOwnerName: PropTypes.string,
    /* the Job Offer's current CS Assistant ({ id: staff id, name }) — the collision case */
    currentAssistant: PropTypes.shape({ id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]), name: PropTypes.string }),
    /* the employer's pending CS-change request shown read-only (dashboard / duplicates cell) */
    requestReason: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func,
};

export default JoChangeOwnerDialog;
