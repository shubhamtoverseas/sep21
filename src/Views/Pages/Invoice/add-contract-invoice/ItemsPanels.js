import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import Modal from "../../../../components/ui/Modal";
import { Checkbox, Field, FormGrid, RadioGroup, TextInput } from "../../../../components/ui/FormControls";
import { interpolate } from "../../../../i18n/interpolate";
import { hk } from "./contractSetup";
import { supplementChoice, withDeductions, withSupplement } from "./invoiceItems";
import "../new-ui-shared.css";
import "../new-ui-create.css";

/*
 * Contract Invoice · Invoice items · the focused panels (27 Oct package, INV-C3; the reference page's pDisc, Correct
 * Examples "Supplement promotion control", Preview Limitations PV-02 / PV-03). Each opens in the admin Modal; Cancel (or
 * Esc) creates nothing. The panels never price: a Result preview is the engine's answer for the panel's choices (`ask`,
 * the same POST /invoices/price). Add Item and Add Custom Item are rows in the table, not panels (ITEMS-ROW-1).
 */

const minus = (n) => `−${ hk(n) }`;
const promoValue = (p) => (p.kind === "percent" ? `${ p.value }%` : hk(p.value));

/** The engine's answer for a panel's choices, asked again (debounced) as they change; null while there is none. */
const usePreview = (ask, choices, lineId) => {
    const key = choices ? JSON.stringify(choices) : "";
    const [answer, setAnswer] = useState(null);
    useEffect(() => {
        if (!key) { setAnswer(null); return undefined; }
        let live = true;
        const timer = setTimeout(() => {
            /* a panel is where deductions are entered: one that does not fit is refused here (R-D3); on the invoice it blocks (R-D4) */
            ask(JSON.parse(key), { entry: true })
                .then((r) => { if (live) setAnswer({ result: r, line: r.lines.find((l) => l.id === lineId) || null }); })
                .catch(() => { if (live) setAnswer({ failed: true }); });
        }, 250);
        return () => { live = false; clearTimeout(timer); };
    }, [ask, key, lineId]);
    return answer;
};

const Foot = ({ onClose, children }) => {
    const { t } = useTranslation();
    return (
        <>
            <button type="button" className="btn btn-secondary md" onClick={ onClose }>{ t("key_cancel") }</button>
            { children }
        </>
    );
};
Foot.propTypes = { onClose: PropTypes.func.isRequired, children: PropTypes.node };

const LineHead = ({ line }) => (
    <div className="pid"><span className="n">{ line.itemType } <span>· { line.label }</span></span><span className="a">{ hk(line.original) }</span></div>
);
LineHead.propTypes = { line: PropTypes.object.isRequired };

/** The panel's Result: the line's amount, its steps in order (numbered on a supplement), refusals, total. */
const Preview = ({ answer, original, numbered }) => {
    const { t } = useTranslation();
    if (!answer) return null;
    if (answer.failed || !answer.line) return <div className="callout danger" role="alert"><span className="ico"><i className="ri-error-warning-line" /></span><span>{ t("key_inv_pricing_not_read") }</span></div>;
    const l = answer.line;
    return (
        <div className="preview">
            <div className="ph">{ t("key_inv_result") }</div>
            <div className="pr"><span>{ t("key_amount") }</span><span className="a">{ hk(original) }</span></div>
            { l.steps.map((s, i) => (
                <div key={ i } className="pr"><span>{ numbered ? `${ i + 1 } · ` : "" }{ s.label }{ s.locked ? ` · ${ t("key_inv_locked") }` : "" }</span><span className="a">{ minus(s.amount) }</span></div>
            )) }
            { (l.refusedSteps || []).map((s, i) => (
                <div key={ `x${ i }` } className="pr refused"><span>{ interpolate(t("key_inv_refused_remaining"), s.label, hk(s.remaining)) }</span><span className="a">—</span></div>
            )) }
            <div className="pr tot"><span>{ t("key_total") }</span><span className="a">{ l.net == null ? "—" : hk(l.net) }</span></div>
        </div>
    );
};
Preview.propTypes = { answer: PropTypes.object, original: PropTypes.number, numbered: PropTypes.bool };

/* ---------------- Discount / Promo ---------------- */

// @migration-unspecified(invoice): the package gives no fields or copy for the manual discount: Type (Flat amount /
// Percentage), Label (default "Manual discount") and a required Reason, one per line as on the reference panel; and no
// copy for the waiver confirmation, which uses the engine's own note. Confirm with product before release (OP-27-51).

const MANUAL = { kind: "flat", value: "", label: "", reason: "" };
const isManual = (s) => s.kind === "flat" || s.kind === "percent";
const manualReady = (s) => Number(s.value) > 0 && (s.kind !== "percent" || Number(s.value) <= 100) && String(s.label).trim() && String(s.reason).trim();
/** the steps the engine is asked about: a manual discount only once it is complete */
const stepsToAsk = (steps) => steps.filter((s) => !isManual(s) || manualReady(s)).map((s) => (isManual(s) ? { ...s, value: Number(s.value), label: s.label.trim(), reason: s.reason.trim() } : s));

/**
 * A line's promotions and manual discount, in the order staff add them (R-D1): the locked replacement discount stays first;
 * ticking appends, unticking removes, editing keeps the place. A selected promotion that no longer matches this invoice is
 * shown so it can be removed. A step the engine refuses is shown refused and cannot be applied (PV-03).
 */
export const DiscountPromoPanel = ({ line, result, choices, ask, onApply, onClose }) => {
    const { t } = useTranslation();
    const [steps, setSteps] = useState(() => (choices.deductions[line.id] || []).map((s) => (isManual(s) ? { ...s, value: String(s.value) } : s)));
    const promotions = result?.promotions || [];
    const asked = useMemo(() => withDeductions(choices, line.id, stepsToAsk(steps)), [choices, line.id, steps]);
    const answer = usePreview(ask, asked, line.id);
    const manualAt = steps.findIndex(isManual);
    const manual = manualAt >= 0 ? steps[manualAt] : null;
    const togglePromo = (id) => setSteps((cur) => (cur.some((s) => s.kind === "promo" && s.id === id) ? cur.filter((s) => !(s.kind === "promo" && s.id === id)) : [...cur, { kind: "promo", id }]));
    const toggleManual = () => setSteps((cur) => (cur.some(isManual) ? cur.filter((s) => !isManual(s)) : [...cur, { ...MANUAL, label: t("key_inv_manual_discount") }]));
    const editManual = (patch) => setSteps((cur) => cur.map((s, i) => (i === manualAt ? { ...s, ...patch } : s)));
    const stale = steps.filter((s) => s.kind === "promo" && !promotions.some((p) => p.id === s.id));
    const refused = Boolean(answer?.line?.refusedSteps?.length);
    const canApply = answer && !answer.failed && answer.line && !refused && (!manual || manualReady(manual));
    const promoAmount = (id) => answer?.line?.steps.find((s) => s.promo === id)?.amount;
    const manualAmount = manual ? answer?.line?.steps.find((s) => s.promo == null && !s.locked && s.label === manual.label.trim())?.amount : null;
    return (
        <Modal title={ t("key_inv_discount_promo") } width={ 620 } onClose={ onClose } footer={
            <Foot onClose={ onClose }>
                <button type="button" className="btn btn-primary md" disabled={ !canApply } onClick={ () => onApply(withDeductions(choices, line.id, stepsToAsk(steps))) }>{ t("key_apply") }</button>
            </Foot>
        }>
            <LineHead line={ line } />
            <Field label={ t("key_inv_discounts_in_order") }>
                <div className="chlist">
                    { line.steps.filter((s) => s.locked).map((s, i) => (
                        <div key={ `l${ i }` } className="choice locked" aria-disabled="true"><span className="t">{ s.label } · { t("key_inv_locked") }</span><span className="a">{ minus(s.amount) }</span></div>
                    )) }
                    { promotions.map((p) => {
                        const on = steps.some((s) => s.kind === "promo" && s.id === p.id);
                        const amt = on ? promoAmount(p.id) : null;
                        return (
                            <div key={ p.id } className={ `choice${ on ? " on" : "" }` }>
                                <Checkbox label={ <><span className="t">{ p.name }</span><span className="d">{ t("key_promotion") }</span></> } checked={ on } onChange={ () => togglePromo(p.id) } />
                                <span className="a">{ amt != null ? minus(amt) : promoValue(p) }</span>
                            </div>
                        );
                    }) }
                    { stale.map((s) => (
                        <div key={ `s${ s.id }` } className="choice on">
                            <Checkbox label={ <><span className="t">{ t("key_inv_promo_no_longer_in_list") }</span><span className="d">{ t("key_inv_promo_untick") }</span></> } checked onChange={ () => togglePromo(s.id) } />
                            <span className="a">—</span>
                        </div>
                    )) }
                    <div className={ `choice${ manual ? " on" : "" }` }>
                        <Checkbox label={ <span className="t">{ t("key_inv_manual_discount") }</span> } checked={ Boolean(manual) } onChange={ toggleManual } />
                        <span className="a">{ manualAmount != null ? minus(manualAmount) : "" }</span>
                    </div>
                </div>
            </Field>
            { !promotions.length && <p className="pnote">{ t("key_inv_no_promotion_matches") }</p> }
            { manual && (
                <FormGrid columns={ 2 }>
                    <Field label={ t("key_type") }>
                        <RadioGroup name="inv-manual-kind" ariaLabel={ t("key_type") } value={ manual.kind } onChange={ (kind) => editManual({ kind }) }
                            options={ [{ value: "flat", label: t("key_inv_flat_amount") }, { value: "percent", label: t("key_percentage") }] } />
                    </Field>
                    <Field label={ manual.kind === "percent" ? t("key_percentage") : t("key_amount") } htmlFor="inv-manual-value" required>
                        <TextInput id="inv-manual-value" type="number" min="0" step="0.01" inputMode="decimal" value={ manual.value } onChange={ (e) => editManual({ value: e.target.value }) } />
                    </Field>
                    <Field label={ t("key_inv_label") } htmlFor="inv-manual-label" required>
                        <TextInput id="inv-manual-label" value={ manual.label } maxLength={ 120 } onChange={ (e) => editManual({ label: e.target.value }) } />
                    </Field>
                    <Field label={ t("key_reason") } htmlFor="inv-manual-reason" required>
                        <TextInput id="inv-manual-reason" value={ manual.reason } maxLength={ 255 } onChange={ (e) => editManual({ reason: e.target.value }) } />
                    </Field>
                </FormGrid>
            ) }
            { refused && (
                <div className="callout warn" role="note"><span className="ico"><i className="ri-information-line" /></span>
                    <span>{ (answer.result.notes || []).filter((n) => n.startsWith(`${ line.label }:`)).map((n, i) => <span key={ i } className="svc-problem">{ n }</span>) }</span>
                </div>
            ) }
            <Preview answer={ answer } original={ line.original } />
        </Modal>
    );
};
DiscountPromoPanel.propTypes = {
    line: PropTypes.object.isRequired, result: PropTypes.object, choices: PropTypes.object.isRequired,
    ask: PropTypes.func.isRequired, onApply: PropTypes.func.isRequired, onClose: PropTypes.func.isRequired,
};

/* ---------------- Adjust supplement ---------------- */

/**
 * The experience line or a selected skill (never another line that carries the Conditional item type): Keep, Reduce by an
 * amount with a reason, or Waive with a reason, and the eligible promotions in the order staff add them, Reduce keeping its
 * place among them (PV-02). Waiving replaces the line's other deductions only once staff confirm it.
 */
export const AdjustSupplementPanel = ({ line, result, choices, ask, onApply, onClose }) => {
    const { t } = useTranslation();
    const [draft, setDraft] = useState(() => {
        const d = supplementChoice(choices, line);
        return { ...d, by: d.by === "" ? "" : String(d.by) };
    });
    const [confirmed, setConfirmed] = useState(false);
    const promotions = result?.promotions || [];
    const promos = draft.steps.filter((s) => s.kind === "promo");
    const pick = (decision) => {
        setConfirmed(false);
        setDraft((cur) => {
            const others = cur.steps.filter((s) => s.kind !== "reduce");
            return { ...cur, decision, steps: decision === "reduce" ? (cur.steps.some((s) => s.kind === "reduce") ? cur.steps : [...others, { kind: "reduce" }]) : others };
        });
    };
    const togglePromo = (id) => {
        setConfirmed(false);
        setDraft((cur) => ({ ...cur, steps: cur.steps.some((s) => s.kind === "promo" && s.id === id) ? cur.steps.filter((s) => !(s.kind === "promo" && s.id === id)) : [...cur.steps, { kind: "promo", id }] }));
    };
    const reasonNeeded = draft.decision !== "keep";
    const byValue = draft.by === "" ? NaN : Number(draft.by);
    /* the panel's choices as the engine is asked about them: a waiver is asked with the promotions still selected, so its
       answer says what the waiver replaces */
    const asked = useMemo(() => {
        const chosen = { decision: draft.decision, by: byValue, reason: draft.reason.trim(), steps: draft.steps };
        const next = withSupplement(choices, line, { ...chosen, decision: draft.decision === "waive" ? "keep" : draft.decision });
        const decided = line.kind === "experience"
            ? { ...next, experience: { decision: draft.decision, ...(draft.decision === "reduce" ? { by: byValue } : {}), ...(reasonNeeded && draft.reason.trim() ? { reason: draft.reason.trim() } : {}) } }
            : next;
        return line.kind === "experience" ? decided : {
            ...decided,
            skills: decided.skills.map((s) => (s.skill === line.skill ? { skill: s.skill, decision: draft.decision, ...(draft.decision === "reduce" ? { by: byValue } : {}), ...(reasonNeeded && draft.reason.trim() ? { reason: draft.reason.trim() } : {}) } : s)),
        };
    }, [choices, line, draft, byValue, reasonNeeded]);
    /* the server refuses a Reduce or Waive with no reason (R-K1, QA-27-035), so it is asked once the reason is there */
    const answer = usePreview(ask, (draft.decision === "reduce" && !(byValue > 0)) || (reasonNeeded && !draft.reason.trim()) ? null : asked, line.id);
    const lineProblems = (answer?.result?.problems || []).filter((p) => p.scope === line.kind || p.scope === "experience" || p.scope === "skill").map((p) => p.text);
    const replaces = draft.decision === "waive" ? (answer?.result?.notes || []).find((n) => n.includes("waiver replaces")) : null;
    const canApply = answer && !answer.failed && answer.line && !lineProblems.length
        && (!reasonNeeded || draft.reason.trim()) && (draft.decision !== "reduce" || byValue > 0) && (!replaces || confirmed);
    const apply = () => onApply(withSupplement(choices, line, { decision: draft.decision, by: byValue, reason: draft.reason.trim(), steps: draft.steps }));
    return (
        <Modal title={ t("key_inv_adjust_supplement") } width={ 620 } onClose={ onClose } footer={
            <Foot onClose={ onClose }>
                <button type="button" className="btn btn-primary md" disabled={ !canApply } onClick={ apply }>{ t("key_apply") }</button>
            </Foot>
        }>
            <LineHead line={ line } />
            <Field label={ t("key_inv_keep_reduce_waive") }>
                <RadioGroup name="inv-supplement" ariaLabel={ t("key_inv_keep_reduce_waive") } value={ draft.decision } onChange={ pick }
                    options={ [{ value: "keep", label: t("key_inv_keep") }, { value: "reduce", label: t("key_inv_reduce") }, { value: "waive", label: t("key_inv_waive") }] } />
            </Field>
            { draft.decision !== "keep" && (
                <FormGrid columns={ 2 }>
                    { draft.decision === "reduce"
                        ? <Field label={ t("key_inv_reduce_by") } htmlFor="inv-reduce-by" required>
                            <TextInput id="inv-reduce-by" type="number" min="0" step="0.01" inputMode="decimal" value={ draft.by } onChange={ (e) => setDraft((cur) => ({ ...cur, by: e.target.value })) } />
                        </Field>
                        : <Field label={ t("key_inv_waived_amount") } htmlFor="inv-waived"><TextInput id="inv-waived" value={ hk(line.original) } readOnly /></Field> }
                    <Field label={ t("key_reason") } htmlFor="inv-supplement-reason" required>
                        <TextInput id="inv-supplement-reason" value={ draft.reason } maxLength={ 255 } onChange={ (e) => setDraft((cur) => ({ ...cur, reason: e.target.value })) } />
                    </Field>
                </FormGrid>
            ) }
            { draft.decision !== "waive" && (
                <Field label={ t("key_inv_eligible_promotions") }>
                    <div className="chlist">
                        { promotions.map((p) => {
                            const on = promos.some((s) => s.id === p.id);
                            const amt = on ? answer?.line?.steps.find((s) => s.promo === p.id)?.amount : null;
                            return (
                                <div key={ p.id } className={ `choice${ on ? " on" : "" }` }>
                                    <Checkbox label={ <span className="t">{ p.name }</span> } checked={ on } onChange={ () => togglePromo(p.id) } />
                                    <span className="a">{ amt != null ? minus(amt) : promoValue(p) }</span>
                                </div>
                            );
                        }) }
                    </div>
                    { !promotions.length && <p className="pnote">{ t("key_inv_no_promotion_matches") }</p> }
                </Field>
            ) }
            { replaces && (
                <div className={ `choice confirmrow${ confirmed ? " on" : "" }` }>
                    <Checkbox label={ replaces } checked={ confirmed } onChange={ () => setConfirmed((c) => !c) } />
                </div>
            ) }
            { lineProblems.length > 0 && (
                <div className="callout danger" role="alert"><span className="ico"><i className="ri-error-warning-line" /></span>
                    <span>{ lineProblems.map((p, i) => <span key={ i } className="svc-problem">{ p }</span>) }</span>
                </div>
            ) }
            <Preview answer={ answer } original={ line.original } numbered />
        </Modal>
    );
};
AdjustSupplementPanel.propTypes = DiscountPromoPanel.propTypes;
