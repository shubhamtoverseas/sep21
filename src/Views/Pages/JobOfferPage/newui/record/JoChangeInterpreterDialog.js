import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import Modal from "../../../../../components/ui/Modal";
import Btn from "../../../../../components/ui/Btn";
import SearchSelect from "../../../../../components/ui/SearchSelect";
import formStyles, { Checkbox, Field, FormGrid, TextInput } from "../../../../../components/ui/FormControls";
import { showSuccessOrError } from "../../../../../services/commonService";
import translation from "../../../../../utils/translation";
import { headingCase } from "../../../../../utils/utils";
import { changeInterpreter, searchInterpreterStaff, validateChangeUserGroupCsInterpreter } from "../../../../../redux/Slices/worker/WorkerSlice";
import { JO_INTERPRETER_CLIENT_FILTER_MAX, JO_INTERPRETER_COPY, JO_INTERPRETER_SEARCH_DEBOUNCE_MS } from "../../jobOfferConstants";

/*
 * Change Interpreter Owner of one applicant (row action; OWNERS "Interpreter Owner") on the kit Modal — work order 26 Oct:
 * the applicant's branch, type and nationality (the eligibility criteria the server applies), the current interpreter
 * read-only, ONE searchable "New Interpreter" select of the server's eligible interpreters (`search-interpreter-staff
 * { search_text, job_id, worker_id }`) with each person's workload as a sub-line — typing filters client-side when the
 * unfiltered list is small, otherwise the server is asked again (debounced); the notification e-mail tick. Logic as
 * before: `change-interpreter { worker_id, job_id, staff_id, send_email }`, then the user-group validation; the caller
 * re-reads the applicant list on close. The current interpreter is never offered (the API leaves them out).
 */
const workloadOf = (s) => `${ JO_INTERPRETER_COPY.assignedFor } ${ s.worker_count ?? 0 } ${ JO_INTERPRETER_COPY.workers.toLowerCase() } ${ JO_INTERPRETER_COPY.from.toLowerCase() } ${ s.job_count ?? 0 } ${ JO_INTERPRETER_COPY.jobOffers.toLowerCase() }`;
const matchesName = (option, input) => !input || String(option.label || "").toLowerCase().includes(String(input).trim().toLowerCase());

const JoChangeInterpreterDialog = ({ row, onClose }) => {
    const dispatch = useDispatch();
    const [query, setQuery] = useState("");
    const [staff, setStaff] = useState(null);           /* the server's list for the current query — null while loading */
    const [serverFiltered, setServerFiltered] = useState(false);   /* true once the unfiltered list was too long to filter here */
    const [target, setTarget] = useState("");
    const [sendEmail, setSendEmail] = useState(false);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const requestSeq = useRef(0);
    const firstLoad = useRef(true);

    const search = useCallback((text) => {
        const seq = ++requestSeq.current;
        return dispatch(searchInterpreterStaff({ search_text: text, job_id: row?.job_id, worker_id: row?.id })).then((res) => {
            if (seq !== requestSeq.current) return;
            const list = Array.isArray(res?.payload) ? res.payload : [];
            setStaff(list);
            if (firstLoad.current) { firstLoad.current = false; setServerFiltered(list.length > JO_INTERPRETER_CLIENT_FILTER_MAX); }
        });
    }, [dispatch, row?.job_id, row?.id]);

    /* the unfiltered list once; then only a long list is re-asked of the server as the user types (300 ms) */
    useEffect(() => { search(""); }, [search]);
    useEffect(() => {
        if (!serverFiltered) return undefined;
        const timer = setTimeout(() => { search(query.trim()); }, JO_INTERPRETER_SEARCH_DEBOUNCE_MS);
        return () => clearTimeout(timer);
    }, [serverFiltered, query, search]);

    const options = useMemo(() => (Array.isArray(staff) ? staff : []).map((s) => ({ value: String(s.id), label: s.name, sub: workloadOf(s) })), [staff]);
    const selected = (Array.isArray(staff) ? staff : []).find((s) => String(s.id) === String(target)) || null;
    const noEligible = staff !== null && staff.length === 0 && !query.trim();
    const currentInterpreter = [row?.existing_interpreter?.first_name, row?.existing_interpreter?.last_name].filter(Boolean).join(" ");
    const current = currentInterpreter ? `${ currentInterpreter }${ row?.existing_interpreter?.email ? ` (${ row.existing_interpreter.email })` : "" }` : "—";

    const submit = useCallback((event) => {
        event.preventDefault();
        if (!target) { setError(JO_INTERPRETER_COPY.required); return; }
        setSaving(true);
        setError("");
        dispatch(changeInterpreter({ worker_id: row?.id, job_id: row?.job_id, staff_id: Number(target), send_email: sendEmail ? 1 : 0 })).then((res) => {
            showSuccessOrError(res);
            if (res?.payload?.status) {
                dispatch(validateChangeUserGroupCsInterpreter({ job_id: row?.job_id, job_stage_id: row?.job_stage_id, user_type: "interpreter", user_id: Number(target) }));
            }
            if (res?.error) { setSaving(false); return; }
            onClose();
        });
    }, [dispatch, row?.id, row?.job_id, row?.job_stage_id, target, sendEmail, onClose]);

    const footer = (
        <>
            <Btn variant="secondary" onClick={ onClose } disabled={ saving }>{ translation("key_cancel") }</Btn>
            <Btn variant="primary" type="submit" form="jo-change-interpreter-form" disabled={ saving || noEligible }>{ saving ? translation("key_loading") : JO_INTERPRETER_COPY.confirm }</Btn>
        </>
    );

    return (
        <Modal title={ headingCase(JO_INTERPRETER_COPY.title) } width={ 560 } onClose={ onClose } footer={ footer } busy={ saving }>
            <form id="jo-change-interpreter-form" onSubmit={ submit } noValidate data-jo-change-interpreter={ row?.id }>
                <FormGrid columns={ 3 }>
                    <Field label={ JO_INTERPRETER_COPY.branch } htmlFor="jo-int-branch"><TextInput id="jo-int-branch" type="text" readOnly value={ row?.branch_name || "" } /></Field>
                    <Field label={ JO_INTERPRETER_COPY.type } htmlFor="jo-int-type"><TextInput id="jo-int-type" type="text" readOnly value={ row?.type_display || "" } /></Field>
                    <Field label={ JO_INTERPRETER_COPY.nationality } htmlFor="jo-int-nat"><TextInput id="jo-int-nat" type="text" readOnly value={ row?.nationality_display || "" } /></Field>
                </FormGrid>
                <FormGrid columns={ 2 }>
                    <Field label={ `${ translation("key_current") } ${ JO_INTERPRETER_COPY.current }` } htmlFor="jo-int-current" full>
                        <TextInput id="jo-int-current" type="text" readOnly value={ current } />
                    </Field>
                    <Field label={ `${ translation("key_new") } ${ JO_INTERPRETER_COPY.newOwner }` } htmlFor="jo-int-new" required full error={ error } hint={ selected ? `${ selected.name } ${ workloadOf(selected) }` : undefined }>
                        <SearchSelect
                            inputId="jo-int-new"
                            value={ target }
                            options={ options }
                            onChange={ (v) => { setTarget(v); setError(""); } }
                            onInputChange={ (text, meta) => { if (meta?.action === "input-change") setQuery(text); } }
                            filterOption={ serverFiltered ? null : matchesName }
                            isLoading={ staff === null }
                            disabled={ saving }
                            invalid={ Boolean(error) }
                            placeholder={ JO_INTERPRETER_COPY.pick }
                            noOptionsMessage={ noEligible ? JO_INTERPRETER_COPY.noEligible : JO_INTERPRETER_COPY.noResults }
                        />
                    </Field>
                    <Field full>
                        <Checkbox label={ JO_INTERPRETER_COPY.sendEmail } checked={ sendEmail } disabled={ saving } onChange={ (event) => setSendEmail(event.target.checked) } />
                    </Field>
                </FormGrid>
                { noEligible && <div role="status" className={ formStyles.hint } data-jo-no-eligible-interpreter="">{ JO_INTERPRETER_COPY.noEligible }</div> }
            </form>
        </Modal>
    );
};

JoChangeInterpreterDialog.propTypes = {
    /* the applicant row (`/get-job-worker-list`): id (worker), job_id, job_stage_id, branch_name, type_display, nationality_display, existing_interpreter */
    row: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default JoChangeInterpreterDialog;
