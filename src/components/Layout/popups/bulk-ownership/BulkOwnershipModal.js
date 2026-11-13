import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import Modal from "../../../ui/Modal";
import Btn from "../../../ui/Btn";
import { Field, RadioGroup, SelectBox, TextInput } from "../../../ui/FormControls";
import translation from "../../../../utils/translation";
import { getCurrentUser } from "../../../../services/commonService";
import { getOtherCsStaff } from "../../../../services/cs";
import { bulkOwnershipPreviewAPI, bulkOwnershipCommitAPI, bulkOwnershipHoldersAPI, getPrepReadyEligibleAPI } from "../../../../services/processings";
import { CD_ASSISTANT_UNASSIGNED, CD_BULK_REGISTER_COPY, CD_OWNER_REGISTER, CD_OWNER_ROW_KEYS } from "../../../../Views/Pages/Contract/contractConstants";
import "./bulk-ownership.css";
import { apiErrorMessage as apiError, byName } from "../../../../Views/Pages/Contract/details/contractRecordUtils";

/**
 * "Change Processing CS Owner" / "Change CS Assistant" — the Contracts dashboard's bulk-ownership run (prototype
 * bulkDialogHTML) on the kit Modal: one register per run, a Records scope (the selected records, or every record
 * assigned to one person — management only), the server's live review of every record (Change / Skip / Cannot
 * update with the reason), the "New <register>" select of eligible staff (plus Unassigned for the assistant register),
 * the audit reason, one confirmation and a result step with the operation id.
 *
 * The review is the server's preview (POST /processing/global/bulk-ownership/preview); the commit re-checks every
 * record (…/commit); eligible staff come from POST /settings/employer/search-other-cs-staff — one call per distinct
 * branch among the selected records. The server requires a reason for both scopes, so the review runs once a reason
 * is entered (audit Q4 open).
 */
const SCOPE = Object.freeze({ SELECTED: "selected", PORTFOLIO: "portfolio" });
const OUTCOME = Object.freeze({ CHANGE: "change", SKIP: "skip", CANNOT: "cannot_update" });
const PREVIEW_DELAY_MS = 350;
const REASON_MAX = 500;

const pad2 = (n) => String(n).padStart(2, "0");
const stampNow = () => { const d = new Date(); return `${ pad2(d.getDate()) }/${ pad2(d.getMonth() + 1) }/${ d.getFullYear() } ${ pad2(d.getHours()) }:${ pad2(d.getMinutes()) }`; };
const actorName = () => {
    const me = getCurrentUser()?.data;
    return [me?.staff?.first_name, me?.staff?.last_name].filter(Boolean).join(" ") || me?.name || me?.email || "";
};
/* the server's own words when it has any: validation `errors`, a `message`, or the gateway / hook `{ error }` shape */
/* prep-ready-owners/eligible rows carry `is_current` (the disabled row's reason); `is_other_register_holder` is display-only since
   backend 298 — the same person may hold both registers */
const asPerson = (raw) => { const id = Number(raw?.id); return id > 0 ? { id, name: raw.name || "", selectable: raw?.selectable !== false, current: Boolean(raw?.is_current) } : null; };

const BulkOwnershipModal = ({ contractIds, records, holders, defaultRegister, canPortfolio, onClose, onDone }) => {
    const register = CD_BULK_REGISTER_COPY[defaultRegister] ? defaultRegister : CD_OWNER_REGISTER.CS_OWNER;
    const copy = CD_BULK_REGISTER_COPY[register];
    const isPrepReady = register === CD_OWNER_REGISTER.PREPARED || register === CD_OWNER_REGISTER.READY;
    const allowsUnassigned = register !== CD_OWNER_REGISTER.CS_OWNER;
    /* the server's reason for a row it refuses: the current holder */
    const reasonOf = (p) => (!isPrepReady ? "" : p.current ? translation("key_current").toLowerCase() : "");
    const label = translation(copy.label);
    const title = translation(copy.title);

    const [scope, setScope] = useState(SCOPE.SELECTED);
    const [portfolioOf, setPortfolioOf] = useState("");
    const [pick, setPick] = useState("");
    const [reason, setReason] = useState("");
    const [staff, setStaff] = useState(null);            /* eligible staff — null while loading */
    const [staffError, setStaffError] = useState("");
    const [review, setReview] = useState(null);          /* the server's preview for the current inputs */
    const [reviewing, setReviewing] = useState(false);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);          /* the commit response → result step */
    const previewSeq = useRef(0);
    const reasonRef = useRef("");
    reasonRef.current = reason;

    const ids = useMemo(() => Array.from(new Set((contractIds || []).map(Number).filter((n) => n > 0))), [contractIds]);
    const recordById = useMemo(() => {
        const map = {};
        (records || []).forEach((r) => { if (r && r.id != null) map[Number(r.id)] = r; });
        return map;
    }, [records]);
    const single = scope === SCOPE.SELECTED && ids.length === 1 && Boolean(recordById[ids[0]]);

    /* eligible staff: CS registers — one search per distinct branch among the selected records (the server scopes the list
       to the record's branch and leaves out its CS Owner); Prepared / Ready — the register's eligible list per distinct
       Group (GET prep-ready-owners/eligible; a non-selectable person stays listed, disabled) */
    const seedKey = useMemo(() => {
        const seen = new Set(); const seeds = [];
        (records || []).forEach((r) => {
            const bucket = isPrepReady ? (r?.group ?? "-") : (r?.branch_id ?? "-");
            if (r?.id != null && !seen.has(bucket)) { seen.add(bucket); seeds.push([Number(r.id), r.employer_id ?? null]); }
        });
        if (!seeds.length && ids.length) seeds.push([ids[0], null]);
        return JSON.stringify(seeds);
    }, [records, ids, isPrepReady]);
    useEffect(() => {
        let alive = true;
        const seeds = JSON.parse(seedKey);
        if (!seeds.length) { setStaff([]); return undefined; }
        setStaff(null); setStaffError("");
        const fetchOne = ([relId, empId]) => (isPrepReady
            ? getPrepReadyEligibleAPI({ contract_id: relId, register }).then((res) => (Array.isArray(res?.data?.data?.staff) ? res.data.data.staff : []))
            : getOtherCsStaff({ type: "contract", rel_id: relId, search_text: "", employer_id: empId }).then((res) => (Array.isArray(res?.data?.data) ? res.data.data : [])))
            .catch((e) => ({ error: apiError(e) }));
        Promise.all(seeds.map(fetchOne))
            .then((lists) => {
                if (!alive) return;
                const map = new Map();
                lists.forEach((list) => { if (Array.isArray(list)) list.forEach((raw) => { const p = asPerson(raw); if (!p) return; const prev = map.get(p.id); map.set(p.id, prev ? { ...prev, selectable: prev.selectable || p.selectable, current: prev.current || p.current } : p); }); });
                setStaff(Array.from(map.values()).sort(byName));
                const failed = lists.filter((list) => list && list.error);
                if (failed.length && failed.length === lists.length) setStaffError(failed[0].error);
            });
        return () => { alive = false; };
    }, [seedKey, isPrepReady, register]);

    /* portfolio scope: whose records — the register's holders over the caller's accessible Processing population with their
       record counts (POST bulk-ownership/holders); the holders seen in the loaded page until the call returns */
    const [apiHolders, setApiHolders] = useState(null);
    useEffect(() => {
        if (scope !== SCOPE.PORTFOLIO || apiHolders !== null) return undefined;
        let alive = true;
        bulkOwnershipHoldersAPI({ register })
            .then((res) => { if (alive) setApiHolders(res?.data?.status && Array.isArray(res.data.data?.holders) ? res.data.data.holders : []); })
            .catch(() => { if (alive) setApiHolders([]); });
        return () => { alive = false; };
    }, [scope, register, apiHolders]);
    const people = useMemo(() => {
        const map = new Map();
        (apiHolders && apiHolders.length ? apiHolders : (holders || [])).forEach((raw) => { const p = asPerson(raw); if (p && !map.has(p.id)) map.set(p.id, { ...p, count: Number(raw?.count) || 0, inactive: Boolean(raw?.inactive) }); });
        return Array.from(map.values()).sort(byName);
    }, [apiHolders, holders]);

    const toStaffId = pick === CD_ASSISTANT_UNASSIGNED ? null : (Number(pick) > 0 ? Number(pick) : null);
    const fromStaffId = Number(portfolioOf) > 0 ? Number(portfolioOf) : null;
    const reasonText = reason.trim();
    const pickOk = pick === CD_ASSISTANT_UNASSIGNED ? allowsUnassigned : toStaffId !== null;
    const inputsReady = pickOk && (scope !== SCOPE.PORTFOLIO || fromStaffId !== null);
    const canPreview = inputsReady && reasonText.length > 0;

    const requestBody = useCallback((reasonValue) => ({
        register,
        scope,
        ...(scope === SCOPE.SELECTED ? { contract_ids: ids } : { from_staff_id: fromStaffId }),
        to_staff_id: toStaffId,
        reason: reasonValue,
    }), [register, scope, ids, fromStaffId, toStaffId]);

    /* the live review: the server's preview whenever the scope / recipient changes (debounced); the reason text itself
       does not change the outcome, so it only matters once it exists */
    const previewKey = `${ register }|${ scope }|${ ids.join(",") }|${ fromStaffId }|${ toStaffId === null ? pick : toStaffId }|${ reasonText ? 1 : 0 }`;
    useEffect(() => {
        if (result) return undefined;
        if (!canPreview) { setReview(null); setReviewing(false); return undefined; }
        const seq = ++previewSeq.current;
        setReviewing(true); setError("");
        const timer = setTimeout(() => {
            bulkOwnershipPreviewAPI(requestBody(reasonRef.current.trim()))
                .then((res) => {
                    if (seq !== previewSeq.current) return;
                    const data = res?.data;
                    if (!data?.status || !data?.data) { setReview(null); setError(data?.message || translation("key_something_went_wrong")); }
                    else setReview(data.data);
                })
                .catch((e) => { if (seq === previewSeq.current) { setReview(null); setError(apiError(e)); } })
                .finally(() => { if (seq === previewSeq.current) setReviewing(false); });
        }, PREVIEW_DELAY_MS);
        return () => { clearTimeout(timer); previewSeq.current += 1; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewKey, canPreview, result]);

    const changeCount = Number(review?.summary?.change) || 0;
    const reviewRows = useMemo(() => {
        const rows = Array.isArray(review?.records) ? review.records : [];
        return { all: rows, skip: rows.filter((r) => r.outcome === OUTCOME.SKIP), fail: rows.filter((r) => r.outcome === OUTCOME.CANNOT) };
    }, [review]);
    const ok = canPreview && !reviewing && !busy && Boolean(review) && changeCount > 0;

    const handleConfirm = useCallback(async () => {
        if (!ok) return;
        setBusy(true); setError("");
        try {
            const res = await bulkOwnershipCommitAPI(requestBody(reasonRef.current.trim()));
            const data = res?.data;
            if (!data?.status || !data?.data) { setError(data?.message || translation("key_something_went_wrong")); return; }
            setResult({ ...data.data, stamp: stampNow(), actor: actorName() });
        } catch (e) {
            setError(apiError(e));
        } finally { setBusy(false); }
    }, [ok, requestBody]);

    /* after a commit every way out (Done, ×, Esc, scrim) reports the result so the list reloads */
    const finish = useCallback(() => {
        if (busy) return;
        if (result && onDone) onDone(result); else onClose();
    }, [busy, result, onDone, onClose]);

    const pickName = pick === CD_ASSISTANT_UNASSIGNED ? translation("key_unassigned") : (people.find((p) => p.id === toStaffId)?.name || "");
    const currentOf = (rec) => rec?.[CD_OWNER_ROW_KEYS[register][1]] || translation("key_unassigned");
    const codeOf = (rec, row) => rec?.worker_code || rec?.contract_number || row?.contract_number || (row ? `#${ row.contract_id }` : "");
    const lineOf = (row) => { const rec = recordById[Number(row.contract_id)]; const code = codeOf(rec, row); return rec?.worker_name ? `${ rec.worker_name } · ${ code }` : code; };
    /* `withWhy` = the Cannot-update lines: the record, then the server's reason */
    const renderCodes = (rows, withWhy) => (rows.length ? (
        <div className={ withWhy ? "bulk-codes bulk-codes--fail" : "bulk-codes" } role={ withWhy ? "alert" : undefined }>
            { rows.map((row, i) => (
                <React.Fragment key={ row.contract_id ?? i }>
                    { i > 0 && <br /> }
                    { lineOf(row) }{ withWhy && row.reason ? <> — <b>{ row.reason }</b></> : "" }
                </React.Fragment>
            )) }
        </div>
    ) : null);

    /* ---- result step (after the commit) ---- */
    if (result) {
        const rows = Array.isArray(result.records) ? result.records : [];
        const changed = rows.filter((r) => r.outcome === OUTCOME.CHANGE);
        const skipped = rows.filter((r) => r.outcome === OUTCOME.SKIP);
        const failed = rows.filter((r) => r.outcome === OUTCOME.CANNOT);
        return (
            <Modal title={ title } width={ 560 } onClose={ finish } closeLabel={ translation("key_close") } className="bulk-modal"
                footer={ <><span className="bulk-grow" /><Btn variant="primary" type="button" onClick={ finish }>{ translation("key_done") }</Btn></> }>
                <div className="bulk-note bulk-note--result">
                    <div><b>{ translation("key_bulk_changed") } { changed.length }</b> — { label } { translation("key_bulk_is_now") } { pickName }.</div>
                    { renderCodes(changed) }
                    { skipped.length > 0 && <div className="bulk-sub"><b>{ translation("key_bulk_skipped") } { skipped.length }</b> — { translation("key_bulk_no_change_needed") }</div> }
                    { renderCodes(skipped) }
                    { failed.length > 0 && <div className="bulk-sub"><b>{ translation("key_cannot_update") } { failed.length }</b> — { translation("key_bulk_nothing_changed") }</div> }
                    { renderCodes(failed, true) }
                    <div className="bulk-op">{ translation("key_bulk_operation") } { result.operation_id || "—" } · { result.actor || "—" } · { result.stamp }</div>
                </div>
            </Modal>
        );
    }

    /* ---- review step ---- */
    const singleRec = single ? recordById[ids[0]] : null;
    const scopeCount = scope === SCOPE.PORTFOLIO ? (review ? reviewRows.all.length : null) : ids.length;
    let reviewNote = null;
    if (pick) {
        if (scope === SCOPE.PORTFOLIO && fromStaffId === null) {
            reviewNote = <div className="bulk-note" data-bulk-review="">{ translation("key_bulk_select_person_to_review") }</div>;
        } else if (!reasonText) {
            reviewNote = <div className="bulk-note" data-bulk-review="">{ translation("key_bulk_enter_reason_to_review") }</div>;
        } else if (review) {
            reviewNote = (
                <div className={ changeCount === 0 ? "bulk-note bulk-note--danger" : "bulk-note" } data-bulk-review="">
                    <div>
                        <b>{ changeCount } { translation("key_of") } { reviewRows.all.length }</b> { translation("key_bulk_will_change") }
                        { reviewRows.skip.length > 0 && <> <b>{ reviewRows.skip.length }</b> { translation("key_bulk_skipped_no_change") }</> }
                        { reviewRows.fail.length > 0 && <> <b>{ reviewRows.fail.length }</b> { translation("key_bulk_cannot_be_updated") }</> }
                    </div>
                    { renderCodes(reviewRows.skip) }
                    { renderCodes(reviewRows.fail, true) }
                </div>
            );
        } else if (reviewing) {
            reviewNote = <div className="bulk-note" data-bulk-review="" aria-live="polite">{ translation("key_bulk_reviewing") }</div>;
        }
    }
    const primaryLabel = `${ pick === CD_ASSISTANT_UNASSIGNED ? translation(copy.unassignedVerb) : title }${ pick && !single && review ? ` ${ translation("key_for") } ${ changeCount }` : "" }`;
    const staffHint = staffError || (staff && staff.length === 0 && !allowsUnassigned ? translation("key_bulk_no_eligible_staff") : "");

    return (
        <Modal
            title={ title }
            width={ 560 }
            onClose={ finish }
            closeLabel={ translation("key_close") }
            busy={ busy }
            className="bulk-modal"
            footer={ (
                <>
                    <span className="bulk-grow" />
                    <Btn variant="secondary" type="button" onClick={ finish } disabled={ busy }>{ translation("key_cancel") }</Btn>
                    <Btn variant="primary" type="button" aria-disabled={ !ok } disabled={ !ok } onClick={ handleConfirm }>
                        { busy ? `${ translation("key_loading") }…` : primaryLabel }
                    </Btn>
                </>
            ) }
        >
            { singleRec ? (
                <p className="bulk-intro">
                    { [singleRec.worker_name, codeOf(singleRec), singleRec.group ? `${ translation("key_group") } ${ singleRec.group }` : null, singleRec.branch_name].filter(Boolean).join(" · ") }.
                    { " " }{ translation("key_current") } { label }: <b>{ currentOf(singleRec) }</b>.
                </p>
            ) : (
                <p className="bulk-intro">
                    { scopeCount === null
                        ? translation("key_bulk_portfolio_in_scope")
                        : `${ scopeCount } ${ scopeCount === 1 ? translation("key_bulk_record_in_scope") : translation("key_bulk_records_in_scope") }` }
                    { " " }{ translation("key_bulk_intro_rule") }
                </p>
            ) }

            { canPortfolio && !isPrepReady && (
                <Field label={ translation("key_bulk_records") } full className="bulk-field" hint={ scope === SCOPE.PORTFOLIO ? translation("key_bulk_portfolio_help") : undefined }>
                    <RadioGroup
                        name="bulk-scope"
                        value={ scope }
                        options={ [
                            { value: SCOPE.SELECTED, label: `${ translation("key_bulk_selected_records") } (${ ids.length })` },
                            { value: SCOPE.PORTFOLIO, label: translation("key_bulk_all_records_of_person") },
                        ] }
                        onChange={ setScope }
                        disabled={ busy }
                        ariaLabel={ translation("key_bulk_records") }
                    />
                    { scope === SCOPE.PORTFOLIO && (
                        <SelectBox id="bulk-portfolio" className="bulk-select" aria-label={ translation("key_bulk_assigned_person") } value={ portfolioOf } disabled={ busy } onChange={ (e) => setPortfolioOf(e.target.value) }>
                            <option value="">{ translation("key_bulk_select_assigned_person") }</option>
                            { people.map((p) => <option key={ p.id } value={ p.id }>{ p.name }{ p.inactive ? ` · ${ translation("key_inactive") }` : "" }{ p.count ? ` (${ p.count })` : "" }</option>) }
                        </SelectBox>
                    ) }
                </Field>
            ) }

            { reviewNote }

            <Field label={ translation(copy.pickLabel) } htmlFor="bulk-pick" required full className="bulk-field"
                error={ staffHint } hint={ translation(copy.note) }>
                <SelectBox id="bulk-pick" value={ pick } disabled={ busy || staff === null } onChange={ (e) => setPick(e.target.value) }>
                    <option value="">{ staff === null ? `${ translation("key_loading") }…` : translation("key_select") }</option>
                    { (staff || []).map((p) => <option key={ p.id } value={ p.id } disabled={ p.selectable === false }>{ p.name }{ reasonOf(p) ? ` · ${ reasonOf(p) }` : "" }</option>) }
                    { allowsUnassigned && <option value={ CD_ASSISTANT_UNASSIGNED }>{ translation("key_bulk_unassigned_option") }</option> }
                </SelectBox>
            </Field>

            <Field label={ translation(scope === SCOPE.PORTFOLIO ? "key_bulk_reason_portfolio_label" : "key_bulk_reason_label") } htmlFor="bulk-reason" required full className="bulk-field">
                <TextInput id="bulk-reason" value={ reason } maxLength={ REASON_MAX } disabled={ busy } placeholder={ translation("key_bulk_required") } onChange={ (e) => setReason(e.target.value) } />
            </Field>

            { error && <div className="bulk-note bulk-note--danger" role="alert">{ error }</div> }
        </Modal>
    );
};

const idType = PropTypes.oneOfType([PropTypes.number, PropTypes.string]);
BulkOwnershipModal.propTypes = {
    contractIds: PropTypes.arrayOf(idType).isRequired,
    records: PropTypes.arrayOf(PropTypes.object),
    holders: PropTypes.arrayOf(PropTypes.shape({ id: idType, name: PropTypes.string })),
    defaultRegister: PropTypes.oneOf(Object.values(CD_OWNER_REGISTER)),
    canPortfolio: PropTypes.bool,
    onClose: PropTypes.func.isRequired,
    onDone: PropTypes.func,
};

export default BulkOwnershipModal;
