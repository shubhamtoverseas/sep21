import React, { useState } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import Btn from "../../../../../../components/ui/Btn";
import Modal from "../../../../../../components/ui/Modal";
import Icon from "../../../../../../components/Icon/Icon";
import { Checkbox, Field, FormGrid, SelectBox, TextInput } from "../../../../../../components/ui/FormControls";
import translation from "../../../../../../utils/translation";
import usePromotions from "./usePromotions";
import {
    KINDS, WORKER_TYPES, branchName, codesFor, currentPromotions, datesText, issueTexts, nextPromotionId, promotionIssues, promotionReviewRows,
    servicesFor, valueText,
} from "./promotionsConfig";
import { serviceName } from "../items-by-service/itemsByServiceConfig";
import { formatNumber, parseEntry } from "../shared/priceEntries";
import { DiscardDialog, FootBar, PageHead, PageLoading, ReviewDialog, keepEffect } from "../shared/PriceEntryParts";
/* after the shared parts, as the other Price List tabs import Btn before these styles (one CSS order in the shared chunk) */
import styles from "../PriceList.module.css";

/*
 * Price List · Promotions (27 Oct package, PL-S6; layout from the package's Promotions page, PL-UI3). The promotions with
 * their value, what they apply to, Worker codes, branches and dates; Add Promotion and Edit open the package's dialog
 * (its two columns; the choice groups full width), whose result goes to the draft; Review changes, then Save changes.
 * There is no delete.
 */

const toggle = (list, value) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
/* a selection in the order its options are listed */
const inOrder = (selected, options) => options.filter((o) => selected.includes(o));

/* a group of choices; a wide one takes both columns of the dialog */
const Checks = ({ legend, name, options, selected, onToggle, hint = null, wide = false }) => (
    <fieldset className={wide ? `${styles.plFieldset} ${styles.plFieldsetWide}` : styles.plFieldset}>
        <legend>{legend}</legend>
        {options.length === 0 ? <p className={styles.plHint}>{hint}</p> : (
            <div className={styles.plCheckGrid}>
                {options.map((o) => (
                    <Checkbox key={String(o.value)} name={name} label={o.label} checked={selected.includes(o.value)} onChange={() => onToggle(o.value)} />
                ))}
            </div>
        )}
    </fieldset>
);

Checks.propTypes = {
    legend: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(PropTypes.object).isRequired,
    selected: PropTypes.array.isRequired,
    onToggle: PropTypes.func.isRequired,
    hint: PropTypes.string,
    wide: PropTypes.bool,
};

/* Add Promotion / Edit Promotion: the package's dialog (pl_retained.js drawRetained 'promo') */
const PromotionDialog = ({ value, data, onApply, onClose }) => {
    const [form, setForm] = useState({
        ...value,
        value: value.value == null ? "" : formatNumber(value.value),
        start: value.start || "",
        end: value.end || "",
        indefinite: value.end == null,
    });
    const [error, setError] = useState("");
    const set = (patch) => setForm((current) => ({ ...current, ...patch }));
    const services = servicesFor(form.worker_types);
    const codes = codesFor(form.worker_types, data);
    const apply = () => {
        const parsed = parseEntry(form.value, form.kind === "percent" ? "pct" : "amt");
        if (!parsed.ok || parsed.value == null) {
            setError(parsed.ok ? translation("key_pl_promo_value_required") : parsed.err);
            return;
        }
        /* only what the dialog shows is kept (the package reads its checked boxes) */
        const next = {
            id: value.id,
            name: form.name,
            kind: form.kind,
            value: parsed.value,
            worker_types: inOrder(form.worker_types, WORKER_TYPES.map((w) => w.id)),
            services: inOrder(form.services, services.map((s) => s.id)),
            codes: inOrder(form.codes, codes),
            branch_ids: inOrder(form.branch_ids, (data.branches || []).map((b) => b.id)),
            start: form.start,
            end: form.indefinite ? null : form.end,
        };
        const issues = promotionIssues(next, data);
        if (issues.length) {
            setError(issues[0].err);
            return;
        }
        onApply(next);
    };
    const footer = (
        <>
            <span className={styles.plSpacer} />
            <Btn variant="secondary" type="button" onClick={onClose}>{translation("key_cancel")}</Btn>
            <Btn variant="primary" type="button" onClick={apply}>{translation("key_apply")}</Btn>
        </>
    );
    const workerHint = translation("key_pl_choose_worker_type_first");
    return (
        <Modal title={translation(value.isNew ? "key_pl_add_promotion" : "key_pl_edit_promotion")} width={680} onClose={onClose} footer={footer}>
            <FormGrid columns={2}>
                <Field label={translation("key_promo_name")} htmlFor="pl-promo-name">
                    <TextInput id="pl-promo-name" value={form.name} autoComplete="off" onChange={(event) => set({ name: event.target.value })} />
                </Field>
                <Checks
                    legend={translation("key_pl_worker_type")}
                    name="pl-promo-types"
                    options={WORKER_TYPES.map((w) => ({ value: w.id, label: translation(w.labelKey) }))}
                    selected={form.worker_types}
                    onToggle={(id) => set({ worker_types: toggle(form.worker_types, id) })}
                />
                <Checks
                    legend={translation("key_pl_applies_to")}
                    name="pl-promo-services"
                    options={services.map((s) => ({ value: s.id, label: translation(s.labelKey) }))}
                    selected={form.services}
                    onToggle={(id) => set({ services: toggle(form.services, id) })}
                    hint={workerHint}
                    wide
                />
                <Checks
                    legend={translation("key_pl_worker_codes")}
                    name="pl-promo-codes"
                    options={codes.map((c) => ({ value: c, label: c }))}
                    selected={form.codes}
                    onToggle={(code) => set({ codes: toggle(form.codes, code) })}
                    hint={workerHint}
                    wide
                />
                <Checks
                    legend={translation("key_pl_branches")}
                    name="pl-promo-branches"
                    options={(data.branches || []).map((b) => ({ value: b.id, label: b.name }))}
                    selected={form.branch_ids}
                    onToggle={(id) => set({ branch_ids: toggle(form.branch_ids, id) })}
                    wide
                />
                <Field label={translation("key_pl_start_date")} htmlFor="pl-promo-start">
                    <TextInput id="pl-promo-start" type="date" value={form.start} onChange={(event) => set({ start: event.target.value })} />
                </Field>
                <Field label={translation("key_pl_end_date")} htmlFor="pl-promo-end">
                    <TextInput id="pl-promo-end" type="date" value={form.indefinite ? "" : form.end} disabled={form.indefinite} onChange={(event) => set({ end: event.target.value })} />
                    <Checkbox label={translation("key_indefinite")} checked={form.indefinite} onChange={(event) => set({ indefinite: event.target.checked })} />
                </Field>
                <Field label={translation("key_value")} htmlFor="pl-promo-value">
                    <TextInput id="pl-promo-value" inputMode="decimal" autoComplete="off" value={form.value} onChange={(event) => set({ value: event.target.value })} />
                </Field>
                <Field label={translation("key_discount")} htmlFor="pl-promo-kind">
                    <SelectBox id="pl-promo-kind" value={form.kind} onChange={(event) => set({ kind: event.target.value })}>
                        {KINDS.map((k) => <option key={k.id} value={k.id}>{translation(k.labelKey)}</option>)}
                    </SelectBox>
                </Field>
            </FormGrid>
            {error && <p className={`${styles.plFieldErr} ${styles.plFieldErrBlock}`} role="alert">{error}</p>}
        </Modal>
    );
};

PromotionDialog.propTypes = { value: PropTypes.object.isRequired, data: PropTypes.object.isRequired, onApply: PropTypes.func.isRequired, onClose: PropTypes.func.isRequired };

const blankPromotion = (id) => ({
    id, name: "", kind: "percent", value: null, worker_types: [], services: [], codes: [], branch_ids: [],
    /* today, as the package opens a new promotion */
    start: dayjs().format("YYYY-MM-DD"), end: null, isNew: true,
});

const PromotionsTab = () => {
    const pl = usePromotions();
    const { data } = pl;
    const [dialog, setDialog] = useState(null);
    const promotions = currentPromotions(pl.draft, pl.saved);

    const open = (value) => setDialog(value);
    const apply = (next) => {
        pl.updateDraft((draft) => {
            const list = draft.promotions || pl.saved.promotions.map((p) => ({ ...p }));
            const at = list.findIndex((p) => p.id === next.id);
            return { ...draft, promotions: at < 0 ? [...list, next] : list.map((p, i) => (i === at ? next : p)) };
        });
        setDialog(null);
    };

    const scope = translation("key_promotions");
    const head = (
        <PageHead title={scope}>
            {data && pl.canEdit && (
                <Btn variant="secondary" type="button" onClick={() => open(blankPromotion(nextPromotionId(promotions)))} disabled={pl.isSaving || Boolean(pl.blocked)}>
                    <Icon name="plus" size={14} /> {translation("key_pl_add_promotion")}
                </Btn>
            )}
        </PageHead>
    );
    if (!data) return <PageLoading pl={pl} toolbar={head} />;

    const editing = pl.isEditMode;
    const shown = editing ? promotions : pl.saved.promotions;
    const issues = issueTexts(data);

    return (
        <div>
            {head}
            <p className={styles.plHelp}>{translation("key_pl_promotions_help")}</p>
            {issues.length > 0 && (
                <ul className={styles.plGerr} role="alert">
                    {issues.map((issue) => <li key={issue.key}>{issue.text}</li>)}
                </ul>
            )}
            <section className={styles.plSection} aria-label={scope}>
                <div className={styles.plListWrap}>
                    <table className={`${styles.plList} ${styles.plPromos} ${styles.plStack}`} aria-label={scope}>
                        <thead>
                            <tr>
                                <th scope="col">{translation("key_pl_promotion")}</th>
                                <th scope="col" className={styles.plNum}>{translation("key_value")}</th>
                                <th scope="col">{translation("key_pl_applies_to")}</th>
                                <th scope="col">{translation("key_pl_worker_codes")}</th>
                                <th scope="col">{translation("key_pl_branches")}</th>
                                <th scope="col">{translation("key_pl_dates")}</th>
                                {editing && <th scope="col"><span className={styles.plVisuallyHidden}>{translation("key_edit")}</span></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {shown.map((p) => (
                                <tr key={p.id}>
                                    <td><span className={styles.plNm}>{p.name}</span></td>
                                    <td className={styles.plNum}><span className={styles.plVal}>{valueText(p)}</span></td>
                                    <td>{p.services.map(serviceName).join(", ")}</td>
                                    <td><span className={styles.plCodes}>{p.codes.join(", ")}</span></td>
                                    <td>{p.branch_ids.map((id) => branchName(data, id)).join(", ")}</td>
                                    <td>{datesText(p.start, p.end)}</td>
                                    {editing && (
                                        <td>
                                            <button type="button" className={styles.plLink} onClick={() => open({ ...p })}>{translation("key_edit")}</button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <FootBar pl={pl} scope={scope} />
            <ReviewDialog
                pl={pl}
                scope={scope}
                groups={pl.changes.length ? [{ title: "", rows: promotionReviewRows(pl.changes) }] : []}
                effects={pl.reviewOpen ? [keepEffect()] : []}
            />
            <DiscardDialog pl={pl} scope={scope} />
            {dialog && <PromotionDialog value={dialog} data={data} onApply={apply} onClose={() => setDialog(null)} />}
        </div>
    );
};

export default PromotionsTab;
