import React, { useState } from "react";
import PropTypes from "prop-types";
import Btn from "../../../../../../components/ui/Btn";
import Modal from "../../../../../../components/ui/Modal";
import Icon from "../../../../../../components/Icon/Icon";
import FilterSelect from "../../../../../../components/ui/FilterSelect";
import { SelectBox } from "../../../../../../components/ui/FormControls";
import translation from "../../../../../../utils/translation";
import { interpolate } from "../../../../../../i18n/interpolate";
import useItemsByService from "./useItemsByService";
import {
    SERVICES, TREATMENTS, allCodesText, codeName, codesFor, codesLabel, codesText, currentRules, editorItems, editorTypes, isPartnerService,
    issueTexts, itemOf, laterText, missingEffect, nextRuleId, overlaps, retiredDescription, reviewEffects, reviewRows, ruleAmount, serviceName,
    treatName, typeNameOf,
} from "./itemsByServiceConfig";
import { formatMoney, formatNumber, listAnd, parseEntry } from "../shared/priceEntries";
import { DiscardDialog, FootBar, Missing, PageHead, PageLoading, ReviewDialog, SearchField, keepEffect } from "../shared/PriceEntryParts";
import { useFrameLink } from "../shared/priceListFrame";
import { PRICE_LIST_PAGE } from "../../settingsNewUiConstants";
/* after the shared parts, as the other Price List tabs import Btn before these styles (one CSS order in the shared chunk) */
import styles from "../PriceList.module.css";

/*
 * Price List · Items by service (27 Oct package, PL-S5; layout from the package's Items by service page, PL-UI3). The rules
 * by service (band rows), filtered by service or by an item or code; Add item and Edit open the package's editor, whose
 * result goes to the draft; Review changes, then Save changes. The same item, service and code can be set up once only.
 * The amount shows its source: the item's Fixed items amount (named so), the rule's own amount (HK$0 is an amount), or
 * none set (Missing) — never 0 for a missing amount.
 */

/* the editor's state -> the rule it describes (blank "Set amount for this service" = no amount set) */
const editorRule = (edr) => {
    let source = edr.src;
    let fixed = null;
    if (edr.src === "condition") {
        const parsed = parseEntry(edr.raw, "amt");
        fixed = parsed.ok ? parsed.value : null;
        source = fixed == null ? "none" : "fixed";
    }
    return {
        id: edr.id,
        price_list_id: edr.item,
        service: edr.service,
        codes: edr.all ? "all" : [...edr.codes],
        treatment: edr.add,
        amount_source: source,
        fixed_amount: source === "fixed" ? fixed : null,
    };
};

const toEditor = (rule, data) => (rule
    ? {
        id: rule.id,
        type: itemOf(data, rule.price_list_id)?.type_id ?? "",
        item: rule.price_list_id,
        service: rule.service,
        codes: rule.codes === "all" ? [] : [...rule.codes],
        all: rule.codes === "all",
        add: rule.treatment,
        src: rule.amount_source === "catalogue" ? "catalogue" : "condition",
        raw: rule.amount_source === "fixed" && rule.fixed_amount != null ? formatNumber(rule.fixed_amount) : "",
    }
    : { id: null, type: "", item: "", service: "", codes: [], all: false, add: "", src: "", raw: "" });

/** The package's editorIssues: every field, then the overlap with another rule (shown at once, like the amount). */
const editorIssues = (edr, others, data) => {
    const out = {};
    if (!edr.type) out.type = translation("key_pl_choose_item_type_err");
    if (!edr.item) out.item = translation("key_pl_choose_item_err");
    if (!edr.service) out.service = translation("key_pl_choose_service_err");
    if (edr.service && !edr.all && !edr.codes.length) out.codes = translation(isPartnerService(edr.service) ? "key_pl_partner_codes_required" : "key_pl_local_codes_required");
    if (!edr.add) out.add = translation("key_pl_choose_how_added");
    if (!edr.src) out.src = translation("key_pl_choose_amount_source");
    if (edr.src === "condition") {
        const parsed = parseEntry(edr.raw, "amt");
        if (!parsed.ok) out.amount = parsed.err;
    }
    if (edr.item && edr.service && (edr.all || edr.codes.length)) {
        const mine = editorRule(edr);
        const hit = overlaps([mine, ...others], data).find((o) => o.a === mine || o.b === mine);
        if (hit) out.overlap = { codes: hit.codes, other: hit.a === mine ? hit.b : hit.a };
    }
    return out;
};

const overlapText = (overlap, edr, data) => {
    const other = overlap.other;
    const amount = ruleAmount(data, other);
    const detail = [codesText(other), treatName(other.treatment), amount == null ? translation("key_pl_amount_missing_lc") : formatMoney(amount)].join(" · ");
    return interpolate(
        translation(overlap.codes.length === 1 ? "key_pl_overlap_one" : "key_pl_overlap_many"),
        listAnd(overlap.codes), itemOf(data, other.price_list_id)?.description || "", serviceName(edr.service), detail,
    );
};

const RuleEditor = ({ initial, others, data, onApply, onRemove, onClose }) => {
    const [edr, setEdr] = useState(initial);
    const [tried, setTried] = useState(false);
    const set = (patch) => setEdr((current) => ({ ...current, ...patch }));
    const issues = editorIssues(edr, others, data);
    const show = (k) => Boolean(issues[k]) && (tried || k === "overlap" || k === "amount");
    const err = (k) => (show(k) ? <span className={styles.plFieldErr} role="alert">{issues[k]}</span> : null);
    const item = itemOf(data, edr.item);
    const service = edr.service;
    const available = service ? codesFor(service, data).filter((c) => !edr.codes.includes(c)) : [];
    const clash = issues.overlap ? issues.overlap.codes : [];
    const parsed = parseEntry(edr.raw, "amt");
    const apply = () => {
        setTried(true);
        if (Object.keys(issues).length) return;
        onApply(editorRule(edr));
    };
    const catalogueText = item
        ? (item.amount == null ? translation("key_pl_no_fixed_amount_yet") : interpolate(translation("key_pl_follows_item"), formatMoney(item.amount)))
        : translation("key_pl_shown_once_item");
    const footer = (
        <>
            {initial.id != null && <Btn variant="dangerOutline" type="button" onClick={onRemove}>{translation("key_remove")}</Btn>}
            <span className={styles.plSpacer} />
            <Btn variant="secondary" type="button" onClick={onClose}>{translation("key_cancel")}</Btn>
            <Btn variant="primary" type="button" onClick={apply}>{translation(initial.id != null ? "key_apply" : "key_add")}</Btn>
        </>
    );
    return (
        <Modal title={translation(initial.id != null ? "key_pl_edit_item" : "key_pl_add_item")} width={600} onClose={onClose} footer={footer}>
            <div className={styles.plEdRows}>
                <div className={styles.plEdRow}>
                    <label className={styles.plEdLabel} htmlFor="pl-ed-type">{translation("key_pl_item_type")}</label>
                    <div className={styles.plEdValue}>
                        <SelectBox id="pl-ed-type" className={styles.plEdSelect} invalid={show("type")} aria-invalid={show("type") || undefined} value={String(edr.type)} onChange={(event) => set({ type: event.target.value ? Number(event.target.value) : "", item: "" })}>
                            <option value="">{translation("key_pl_choose_item_type")}</option>
                            {editorTypes(data).map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                        </SelectBox>
                        {err("type")}
                    </div>
                </div>
                <div className={styles.plEdRow}>
                    <label className={styles.plEdLabel} htmlFor="pl-ed-item">{translation("key_pl_item")}</label>
                    <div className={styles.plEdValue}>
                        <SelectBox id="pl-ed-item" className={styles.plEdSelect} invalid={show("item")} aria-invalid={show("item") || undefined} value={String(edr.item)} disabled={!edr.type} onChange={(event) => set({ item: event.target.value ? Number(event.target.value) : "" })}>
                            <option value="">{translation(edr.type ? "key_pl_choose_an_item" : "key_pl_choose_item_type_first")}</option>
                            {edr.type !== "" && editorItems(data, edr.type).map((i) => <option key={i.id} value={String(i.id)}>{i.description}</option>)}
                        </SelectBox>
                        {err("item")}
                    </div>
                </div>
                <div className={styles.plEdRow}>
                    <label className={styles.plEdLabel} htmlFor="pl-ed-service">{translation("key_pl_service")}</label>
                    <div className={styles.plEdValue}>
                        <SelectBox id="pl-ed-service" className={styles.plEdSelect} invalid={show("service")} aria-invalid={show("service") || undefined} value={edr.service} onChange={(event) => set({ service: event.target.value, codes: [], all: false })}>
                            <option value="">{translation("key_pl_choose_a_service")}</option>
                            {SERVICES.map((s) => <option key={s.id} value={s.id}>{translation(s.labelKey)}</option>)}
                        </SelectBox>
                        {err("service")}
                    </div>
                </div>
                <div className={styles.plEdRow}>
                    <span className={styles.plEdLabel}>{service ? codesLabel(service) : translation("key_pl_applies_to")}</span>
                    <div className={styles.plEdValue}>
                        {!service ? <span className={styles.plHint}>{translation("key_pl_choose_service_first")}</span> : (
                            <>
                                {!edr.all && (
                                    <div className={`${styles.plChips} ${styles.plEdChips}`}>
                                        {edr.codes.map((code) => (
                                            <span key={code} className={[styles.plChip, clash.includes(code) ? styles.plChipInvalid : ""].filter(Boolean).join(" ")} title={codeName(service, code, data)}>
                                                <b className={styles.plCodeChip}>{code}</b>
                                                <button
                                                    type="button"
                                                    aria-label={interpolate(translation("key_pl_remove_code_aria"), code, codeName(service, code, data))}
                                                    onClick={() => set({ codes: edr.codes.filter((c) => c !== code) })}
                                                >
                                                    <Icon name="x" size={12} />
                                                </button>
                                            </span>
                                        ))}
                                        <SelectBox
                                            className={styles.plEdAdd}
                                            invalid={show("codes")}
                                            aria-label={translation(isPartnerService(service) ? "key_pl_add_partner_code" : "key_pl_add_local_code")}
                                            aria-invalid={show("codes") || undefined}
                                            value=""
                                            onChange={(event) => { if (event.target.value) set({ codes: [...edr.codes, event.target.value] }); }}
                                        >
                                            <option value="">{translation("key_pl_add_a_code")}</option>
                                            {available.map((c) => {
                                                const name = codeName(service, c, data);
                                                return <option key={c} value={c}>{name ? `${c} · ${name}` : c}</option>;
                                            })}
                                        </SelectBox>
                                    </div>
                                )}
                                <div className={styles.plChkRow}>
                                    <label className={styles.plCheck}>
                                        <input type="checkbox" checked={edr.all} onChange={(event) => set({ all: event.target.checked })} />
                                        {allCodesText(service)}
                                    </label>
                                    <span className={styles.plHint}>{laterText(service)}</span>
                                </div>
                                {err("codes")}
                                {show("overlap") && <span className={styles.plFieldErr} role="alert">{overlapText(issues.overlap, edr, data)}</span>}
                            </>
                        )}
                    </div>
                </div>
                <div className={styles.plEdRow}>
                    <span className={styles.plEdLabel}>{translation("key_pl_how_added")}</span>
                    <div className={styles.plEdValue}>
                        <div className={styles.plOpts} role="radiogroup" aria-label={translation("key_pl_how_added")}>
                            {TREATMENTS.map((t) => (
                                <label key={t.id} className={styles.plOpt}>
                                    <input type="radio" name="pl-ed-add" value={t.id} checked={edr.add === t.id} onChange={() => set({ add: t.id })} />
                                    <span><b>{translation(t.nameKey)}</b><small>{translation(t.hintKey)}</small></span>
                                </label>
                            ))}
                        </div>
                        {err("add")}
                    </div>
                </div>
                <div className={styles.plEdRow}>
                    <span className={styles.plEdLabel}>{translation("key_amount")}</span>
                    <div className={styles.plEdValue}>
                        <div className={styles.plOpts} role="radiogroup" aria-label={translation("key_amount")}>
                            <label className={styles.plOpt}>
                                <input type="radio" name="pl-ed-src" value="catalogue" checked={edr.src === "catalogue"} onChange={() => set({ src: "catalogue" })} />
                                <span><b>{translation("key_pl_fixed_items_amount")}</b><small>{catalogueText}</small></span>
                            </label>
                            <label className={styles.plOpt}>
                                <input type="radio" name="pl-ed-src" value="condition" checked={edr.src === "condition"} onChange={() => set({ src: "condition" })} />
                                <span><b>{translation("key_pl_set_amount")}</b><small>{translation("key_pl_set_amount_sub")}</small></span>
                            </label>
                        </div>
                        {err("src")}
                        {edr.src === "condition" && (
                            <div className={styles.plEdAmount}>
                                {/* the field box the Price List uses for a single amount: blank is Missing, 0 is HK$0 */}
                                <span className={[styles.plFbox, show("amount") ? styles.plFboxInvalid : parsed.ok && parsed.value == null ? styles.plFboxMissing : ""].filter(Boolean).join(" ")}>
                                    <span className={styles.plFboxAdorn} aria-hidden="true">HK$</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        autoComplete="off"
                                        className={styles.plFboxInput}
                                        placeholder={translation("key_pl_missing")}
                                        aria-label={translation("key_pl_amount_for_service")}
                                        aria-invalid={show("amount") || undefined}
                                        value={edr.raw}
                                        onChange={(event) => set({ raw: event.target.value })}
                                    />
                                </span>
                                {parsed.ok && parsed.value == null && (
                                    <span className={styles.plHint}>{`${translation("key_pl_can_save_missing")}${edr.add ? ` ${missingEffect(edr.add)}` : ""}`}</span>
                                )}
                                {parsed.ok && parsed.value === 0 && <span className={styles.plHint}>{translation("key_pl_zero_is_set")}</span>}
                                {err("amount")}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

RuleEditor.propTypes = {
    initial: PropTypes.object.isRequired,
    others: PropTypes.arrayOf(PropTypes.object).isRequired,
    data: PropTypes.object.isRequired,
    onApply: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

/* A rule's amount, by its source: the item's Fixed items amount (named so, Missing while the item has none), the rule's
   own amount (HK$0 is an amount), or none set (Missing). */
const RuleAmount = ({ data, rule }) => {
    const amount = ruleAmount(data, rule);
    return (
        <>
            {amount == null ? <Missing /> : <span className={styles.plVal}>{formatMoney(amount)}</span>}
            {/* DELIBERATE DEVIATION from the reference page, which names the source only next to an amount: the note shows
                for every catalogue rule, Missing included, so "catalogue, missing" never reads like "none set" (blank ≠ zero ≠
                none). Accepted with CONFIRM PL-UI3 (28 Oct 2026; pack appendix A8 note). Do not change it back. */}
            {rule.amount_source === "catalogue" && <small className={styles.plAmtSrc}>{translation("key_pl_fixed_items_amount")}</small>}
        </>
    );
};

RuleAmount.propTypes = { data: PropTypes.object.isRequired, rule: PropTypes.object.isRequired };

/* "Fixed items that apply to a Contract Invoice for each service and code. Items and their types are kept in Fixed items." */
const ItemsHelp = ({ onOpenFixedItems }) => {
    const [before, after = ""] = translation("key_pl_ibs_help").split("%s");
    return (
        <p className={styles.plHelp}>
            {before}
            {onOpenFixedItems
                ? <button type="button" className={styles.plLink} onClick={onOpenFixedItems}>{translation("key_pl_fixed_items_link")}</button>
                : translation("key_pl_fixed_items_link")}
            {after}
        </p>
    );
};

ItemsHelp.propTypes = { onOpenFixedItems: PropTypes.func };

const ItemsByServiceSection = () => {
    const pl = useItemsByService();
    const onOpenFixedItems = useFrameLink(PRICE_LIST_PAGE.FIXED_ITEMS);
    const { data } = pl;
    const [serviceFilter, setServiceFilter] = useState("");
    const [query, setQuery] = useState("");
    const [editor, setEditor] = useState(null);
    const findLabel = translation("key_pl_find_item_or_code");

    const rules = currentRules(pl.draft, pl.saved);
    const withRules = (fn) => pl.updateDraft((draft) => ({ ...draft, rules: fn(draft.rules || pl.saved.rules.map((r) => ({ ...r }))) }));
    const open = (rule) => {
        setEditor({ initial: toEditor(rule, data), others: rules.filter((r) => !rule || r.id !== rule.id) });
    };
    const applyRule = (rule) => {
        withRules((list) => (rule.id == null
            ? [...list, { ...rule, id: nextRuleId(list) }]
            : list.map((r) => (r.id === rule.id ? rule : r))));
        setEditor(null);
    };
    const removeRule = () => {
        const id = editor.initial.id;
        withRules((list) => list.filter((r) => r.id !== id));
        setEditor(null);
    };

    const head = (
        <PageHead title={translation("key_pl_items_by_service")}>
            {data && pl.canEdit && (
                <Btn variant="secondary" type="button" onClick={() => open(null)} disabled={pl.isSaving || Boolean(pl.blocked)}>
                    <Icon name="plus" size={14} /> {translation("key_pl_add_item")}
                </Btn>
            )}
        </PageHead>
    );
    if (!data) return <PageLoading pl={pl} toolbar={head} />;

    const editing = pl.isEditMode;
    const scope = translation("key_pl_items_by_service");
    const q = query.trim().toLowerCase();
    const matches = (rule) => {
        if (serviceFilter && rule.service !== serviceFilter) return false;
        if (!q) return true;
        const item = itemOf(data, rule.price_list_id);
        return [typeNameOf(data, item), item?.description || "", codesText(rule)].join(" ").toLowerCase().includes(q);
    };
    const changedIds = new Set(pl.changes.filter((c) => c.kind !== "removed").map((c) => c.rule.id));
    const missing = rules.filter((r) => ruleAmount(data, r) == null).length;
    const issues = issueTexts(data);
    const columns = editing ? 6 : 5;
    const bands = SERVICES.map((s) => ({ s, rows: rules.filter((r) => r.service === s.id && matches(r)) })).filter((b) => b.rows.length);

    return (
        <div>
            {head}
            <ItemsHelp onOpenFixedItems={onOpenFixedItems} />
            {issues.length > 0 && (
                <ul className={styles.plGerr} role="alert">
                    {issues.map((issue) => <li key={issue.key}>{issue.text}</li>)}
                </ul>
            )}
            <section className={styles.plSection} aria-label={scope}>
                {/* the list's tools (the reference page's .list-tools): a service, an item or code, and what is missing */}
                <div className={styles.plListTools}>
                    <FilterSelect
                        id="pl-ibs-service"
                        label={translation("key_pl_service")}
                        value={serviceFilter}
                        options={[{ value: "", label: translation("key_pl_all_services") }, ...SERVICES.map((s) => ({ value: s.id, label: translation(s.labelKey) }))]}
                        onChange={setServiceFilter}
                        menuWidth={200}
                    />
                    <SearchField label={findLabel} value={query} onChange={setQuery} />
                    <div className={styles.plMeta}>
                        {missing > 0 && <span className={styles.plMetaMiss}>{interpolate(translation("key_pl_missing_count"), missing)}</span>}
                    </div>
                </div>
                <div className={styles.plListWrap}>
                    <table className={`${styles.plList} ${styles.plListTall} ${styles.plStack}`} aria-label={scope}>
                        <colgroup>
                            <col className={styles.plColType} />
                            <col />
                            <col className={styles.plColCodes} />
                            <col className={styles.plColAdd} />
                            <col className={styles.plColAmt} />
                            {editing && <col className={styles.plColAct} />}
                        </colgroup>
                        <thead>
                            <tr>
                                <th scope="col">{translation("key_pl_item_type")}</th>
                                <th scope="col">{translation("key_description")}</th>
                                <th scope="col">{translation("key_pl_applies_to")}</th>
                                <th scope="col">{translation("key_pl_how_added")}</th>
                                <th scope="col" className={styles.plNum}>{translation("key_amount")}</th>
                                {editing && <th scope="col"><span className={styles.plVisuallyHidden}>{translation("key_edit")}</span></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {bands.length === 0 ? (
                                <tr><td colSpan={columns} className={styles.plNone}>{translation("key_pl_no_item_matches")}</td></tr>
                            ) : bands.map(({ s, rows }) => (
                                <React.Fragment key={s.id}>
                                    <tr className={styles.plBand}><th scope="colgroup" colSpan={columns}>{translation(s.labelKey)}</th></tr>
                                    {rows.map((rule) => {
                                        const item = itemOf(data, rule.price_list_id);
                                        /* a rule on an item no longer in Fixed items keeps its name, so it can be found and removed (OP-27-39) */
                                        const description = item?.description || retiredDescription(data, rule);
                                        return (
                                            <tr key={rule.id} className={editing && changedIds.has(rule.id) ? styles.plRowChanged : undefined}>
                                                <td className={styles.plKv} data-label={translation("key_pl_item_type")}>{typeNameOf(data, item)}</td>
                                                <td className={styles.plKv} data-label={translation("key_description")}><span className={styles.plNm}>{description}</span></td>
                                                <td className={styles.plKv} data-label={translation("key_pl_applies_to")}>
                                                    <span className={rule.codes === "all" ? styles.plMuted : styles.plCodes}>{codesText(rule)}</span>
                                                </td>
                                                <td className={styles.plKv} data-label={translation("key_pl_how_added")}>{treatName(rule.treatment)}</td>
                                                <td className={`${styles.plNum} ${styles.plKv}`} data-label={translation("key_amount")}><RuleAmount data={data} rule={rule} /></td>
                                                {editing && (
                                                    <td className={styles.plAct}>
                                                        <button
                                                            type="button"
                                                            className={styles.plLink}
                                                            aria-label={interpolate(translation("key_pl_edit_aria"), description, serviceName(rule.service))}
                                                            onClick={() => open(rule)}
                                                        >
                                                            {translation("key_edit")}
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <FootBar pl={pl} scope={scope} />
            <ReviewDialog
                pl={pl}
                scope={scope}
                groups={pl.changes.length ? [{ title: translation("key_pl_items"), rows: reviewRows(pl.changes, data) }] : []}
                effects={pl.reviewOpen ? [...reviewEffects(pl.changes, data), keepEffect()] : []}
            />
            <DiscardDialog pl={pl} scope={scope} />
            {editor && (
                <RuleEditor
                    initial={editor.initial}
                    others={editor.others}
                    data={data}
                    onApply={applyRule}
                    onRemove={removeRule}
                    onClose={() => setEditor(null)}
                />
            )}
        </div>
    );
};


export default ItemsByServiceSection;
