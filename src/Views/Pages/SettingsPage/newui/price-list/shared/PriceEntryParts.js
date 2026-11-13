import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import Btn from "../../../../../../components/ui/Btn";
import Modal from "../../../../../../components/ui/Modal";
import ConfirmModal from "../../../../../../components/ui/ConfirmModal";
import Badge from "../../../../../../components/ui/Badge";
import Icon from "../../../../../../components/Icon/Icon";
import translation from "../../../../../../utils/translation";
import { interpolate } from "../../../../../../i18n/interpolate";
import shared from "../../settings-newui.module.css";
import styles from "../PriceList.module.css";
import { completeness, entryState, formatMoney, formatNumber, formatPercent, isPercentKey, missingCount, rawValue } from "./priceEntries";
import { usePriceListFrame } from "./priceListFrame";

/*
 * The parts every Price List page (27 Oct package) is built from, so the pages look and behave the same: "Missing" for
 * not entered, the entry input (a grid cell, or a field box with its HK$ / %), the section status, the grid and its
 * errors, the page head, the footer bar and the Review changes / Discard dialogs — the reference Price List page's .cell,
 * .fbox, .sec-meta, .gwrap and .gerr (PL-UI2). `pl` is a usePriceListEditor page.
 */

const plural = (n, one, many) => interpolate(translation(n === 1 ? one : many), n);

export const Missing = () => <span className={styles.plMissing}>{translation("key_pl_missing")}</span>;

/* The entry input: a grid cell with its state (missing, changed, to correct), or the bare input of a field box. */
export const EntryInput = ({ entryKey, ariaLabel, pl, inBox = false, describedBy = undefined }) => {
    const state = entryState(entryKey, pl.draft, pl.saved);
    const cls = inBox ? styles.plFboxInput : [
        styles.plCell,
        state.invalid ? styles.plCellInvalid : "",
        !state.invalid && state.missing ? styles.plCellMissing : "",
        !state.invalid && state.changed ? styles.plCellChanged : "",
    ].filter(Boolean).join(" ");
    return (
        <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            className={cls}
            value={rawValue(entryKey, pl.draft, pl.saved)}
            placeholder={translation("key_pl_missing")}
            aria-label={ariaLabel}
            aria-invalid={state.invalid || undefined}
            aria-describedby={describedBy}
            data-key={entryKey}
            data-kind={isPercentKey(entryKey) ? "pct" : "amt"}
            disabled={pl.isSaving}
            onChange={(event) => pl.setEntry(entryKey, event.target.value)}
        />
    );
};

EntryInput.propTypes = {
    entryKey: PropTypes.string.isRequired,
    ariaLabel: PropTypes.string.isRequired,
    pl: PropTypes.object.isRequired,
    inBox: PropTypes.bool,
    describedBy: PropTypes.string,
};

/* One grid price: an input while editing; otherwise the saved value, or Missing when not entered. */
export const PriceCell = ({ entryKey, ariaLabel, pl }) => {
    if (pl.isEditMode) return <EntryInput entryKey={entryKey} pl={pl} ariaLabel={ariaLabel} />;
    const value = pl.saved[entryKey];
    return value == null ? <Missing /> : <span className={styles.plVal}>{formatNumber(value)}</span>;
};

PriceCell.propTypes = { entryKey: PropTypes.string.isRequired, ariaLabel: PropTypes.string.isRequired, pl: PropTypes.object.isRequired };

/* A section's status: entries to correct and changed entries (while editing), entries missing, and the unit. */
export const SectionMeta = ({ keys, pl, unit = "HK$" }) => {
    const inSection = (k) => keys.includes(k);
    const toCorrect = pl.isEditMode ? pl.invalid.filter(inSection).length : 0;
    const changedCount = pl.isEditMode ? pl.changes.filter((k) => inSection(k) && !entryState(k, pl.draft, pl.saved).invalid).length : 0;
    const missing = missingCount(keys, pl.draft, pl.saved);
    return (
        <div className={styles.plMeta}>
            {toCorrect > 0 && <span className={styles.plMetaErr}>{interpolate(translation("key_pl_to_correct"), toCorrect)}</span>}
            {changedCount > 0 && <span className={styles.plMetaChg}>{interpolate(translation("key_pl_changed"), changedCount)}</span>}
            {missing > 0 && <span className={styles.plMetaMiss}>{interpolate(translation("key_pl_missing_count"), missing)}</span>}
            {unit && <span className={styles.plMetaUnit}>{unit}</span>}
        </div>
    );
};

SectionMeta.propTypes = { keys: PropTypes.arrayOf(PropTypes.string).isRequired, pl: PropTypes.object.isRequired, unit: PropTypes.string };

/* The entry an error names, focused (an entry input carries its key in data-key). */
const focusEntry = (key) => {
    const input = document.querySelector(`input[data-key="${String(key).replace(/["\\]/g, "\\$&")}"]`);
    if (input) input.focus();
};

/* The grid entries of a section that cannot be saved: each label takes staff to its entry, then the reason. */
export const GridErrors = ({ keys, pl, labelOf }) => {
    const errors = pl.isEditMode ? pl.invalid.filter((k) => keys.includes(k)) : [];
    if (!errors.length) return null;
    return (
        <ul className={styles.plGerr}>
            {errors.map((k) => (
                <li key={k}>
                    <button type="button" className={styles.plGerrLink} onClick={() => focusEntry(k)}>{labelOf(k)}</button>
                    <span>{entryState(k, pl.draft, pl.saved).err}</span>
                </li>
            ))}
        </ul>
    );
};

GridErrors.propTypes = { keys: PropTypes.arrayOf(PropTypes.string).isRequired, pl: PropTypes.object.isRequired, labelOf: PropTypes.func.isRequired };

/* A block of labelled single values (the package's ".rows"); above a grid (a shared rate) it ends with a rule. */
export const Rows = ({ aboveGrid = false, children }) => <div className={aboveGrid ? `${styles.plRows} ${styles.plRowsShared}` : styles.plRows}>{children}</div>;

Rows.propTypes = { aboveGrid: PropTypes.bool, children: PropTypes.node };

/* A labelled row with a value: read-only content, or one entry (a field box with its HK$ or %) with its hint and error. */
export const FieldRow = ({ label, note = null, hint = null, entryKey = null, pl = null, children = null }) => {
    let value = children;
    let error = null;
    if (entryKey && pl) {
        const pct = isPercentKey(entryKey);
        const state = entryState(entryKey, pl.draft, pl.saved);
        if (pl.isEditMode) {
            const errorId = state.invalid ? `pl-err-${entryKey.replace(/[^a-z0-9]/gi, "-")}` : undefined;
            const box = [
                styles.plFbox,
                pct ? styles.plFboxPct : "",
                state.invalid ? styles.plFboxInvalid : state.missing ? styles.plFboxMissing : "",
                state.changed && !state.invalid ? styles.plFboxChanged : "",
            ].filter(Boolean).join(" ");
            value = (
                <span className={box}>
                    {!pct && <span className={styles.plFboxAdorn} aria-hidden="true">HK$</span>}
                    <EntryInput entryKey={entryKey} pl={pl} ariaLabel={label} inBox describedBy={errorId} />
                    {pct && <span className={`${styles.plFboxAdorn} ${styles.plFboxAdornAfter}`} aria-hidden="true">%</span>}
                </span>
            );
            if (state.invalid) error = <span className={styles.plFieldErr} id={errorId} role="alert">{state.err}</span>;
        } else {
            const saved = pl.saved[entryKey];
            value = saved == null ? <Missing /> : <span className={styles.plVal}>{pct ? formatPercent(saved) : formatMoney(saved)}</span>;
        }
    }
    return (
        <div className={styles.plRow}>
            <div className={styles.plRowLabel}>
                {label}
                {note && <small>{note}</small>}
            </div>
            <div className={styles.plRowValue}>
                {value}
                {hint && <span className={styles.plHint}>{hint}</span>}
                {error}
            </div>
        </div>
    );
};

FieldRow.propTypes = {
    label: PropTypes.string.isRequired,
    note: PropTypes.node,
    hint: PropTypes.node,
    entryKey: PropTypes.string,
    pl: PropTypes.object,
    children: PropTypes.node,
};

/* Configuration status of an agency schedule (requirements section 15): Complete, or Incomplete with what is left (the
   admin's status tag, as the reference page's). */
export const StatusTag = ({ missing = 0, invalid = 0 }) => (missing === 0 && invalid === 0
    ? <Badge variant="success">{translation("key_pl_complete")}</Badge>
    : (
        <span className={styles.plStat}>
            <Badge variant="warning">{translation("key_pl_incomplete")}</Badge>
            {invalid > 0 && <span className={styles.plMetaErr}>{interpolate(translation("key_pl_to_correct"), invalid)}</span>}
            {missing > 0 && <span className={styles.plMetaMiss}>{interpolate(translation("key_pl_missing_count"), missing)}</span>}
        </span>
    ));

StatusTag.propTypes = { missing: PropTypes.number, invalid: PropTypes.number };

/* The status of a set of entries as currently drafted. */
export const DraftStatus = ({ keys, pl }) => {
    const status = completeness(keys, pl.draft, pl.saved);
    return <StatusTag missing={status.missing} invalid={status.invalid} />;
};

DraftStatus.propTypes = { keys: PropTypes.arrayOf(PropTypes.string).isRequired, pl: PropTypes.object.isRequired };

/*
 * A price grid's scroller (the reference page's .gwrap): a grid wider than its card scrolls inside it with its first
 * columns kept in view; a grid that fits keeps its heading and column names in view while its rows scroll (stickyHead,
 * the Local grids).
 */
export const GridWrap = ({ stickyHead = false, style = undefined, children }) => {
    const ref = useRef(null);
    const [scrolls, setScrolls] = useState(false);
    useEffect(() => {
        const node = ref.current;
        if (!node || typeof ResizeObserver === "undefined") return undefined;
        const measure = () => setScrolls(node.scrollWidth > node.clientWidth + 1);
        const observer = new ResizeObserver(measure);
        observer.observe(node);
        measure();
        return () => observer.disconnect();
    }, []);
    const cls = [styles.plGridWrap, stickyHead ? styles.plGridWrapHead : "", scrolls ? styles.plScrolls : ""].filter(Boolean).join(" ");
    return <div ref={ref} className={cls} style={style}>{children}</div>;
};

GridWrap.propTypes = { stickyHead: PropTypes.bool, style: PropTypes.object, children: PropTypes.node };

/* A search over a page's list (the reference page's .search): the field with its icon; the label is its placeholder. */
export const SearchField = ({ label, value, onChange }) => (
    <span className={styles.plSearchField}>
        <Icon name="search" size={15} />
        <input type="search" placeholder={label} aria-label={label} value={value} autoComplete="off" onChange={(event) => onChange(event.target.value)} />
    </span>
);

SearchField.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.string.isRequired, onChange: PropTypes.func.isRequired };

/* The page's head (the reference page's .mod-head): its name, and its actions on the right. */
export const PageHead = ({ title, children = null }) => (
    <div className={styles.plPageHead}>
        <h2 className={styles.plPageTitle}>{title}</h2>
        {children && <div className={styles.plPageActions}>{children}</div>}
    </div>
);

PageHead.propTypes = { title: PropTypes.string.isRequired, children: PropTypes.node };

/* The footer bar of a page staff may edit (the reference page's .foot): the refusal, the unsaved changes and their scope,
   or the last result; Cancel and Review changes. Staff who may only view the page have no bar. */
export const FootBar = ({ pl, scope }) => {
    const frame = usePriceListFrame();
    if (!pl.canEdit) return null;
    const unsaved = pl.changes.length;
    let status;
    if (pl.footErr) status = <p className={`${styles.plFootStatus} ${styles.plFootError}`} role="alert">{pl.footErr}</p>;
    else if (pl.blocked && unsaved) status = <p className={`${styles.plFootStatus} ${styles.plFootError}`}>{pl.blocked}</p>;
    else if (unsaved) {
        status = (
            <p className={`${styles.plFootStatus} ${styles.plFootDirty}`} role="status">
                {plural(unsaved, "key_pl_unsaved_change", "key_pl_unsaved_changes")}
                <span className={styles.plFootScope}>{` · ${scope}`}</span>
            </p>
        );
    } else status = <p className={styles.plFootStatus} role="status">{pl.footMsg || translation("key_pl_no_unsaved_changes")}</p>;
    const bar = (
        <div className={styles.plFootBar}>
            {status}
            <div className={styles.plFootActions}>
                <Btn variant="secondary" type="button" onClick={pl.cancel} disabled={!unsaved || pl.isSaving}>{translation("key_cancel")}</Btn>
                <Btn variant="primary" type="button" onClick={pl.review} disabled={!unsaved || pl.isSaving || Boolean(pl.blocked)}>
                    {translation("key_review_changes")}
                </Btn>
            </div>
        </div>
    );
    /* inside the Price List frame the bar spans the page, under the nav and the page */
    return frame?.footNode ? createPortal(bar, frame.footNode) : bar;
};

FootBar.propTypes = { pl: PropTypes.object.isRequired, scope: PropTypes.string.isRequired };

/* Review changes: every changed value old -> new by group, then what saving means for invoices. */
export const ReviewDialog = ({ pl, scope, groups, effects, lead = null }) => {
    if (!pl.reviewOpen) return null;
    const show = (value, pct) => (value == null ? <span className={styles.plMissing}>{translation("key_pl_missing")}</span> : pct ? formatPercent(value) : formatMoney(value));
    return (
        <Modal
            title={translation("key_review_changes")}
            width={560}
            onClose={pl.closeReview}
            busy={pl.isSaving}
            footer={(
                <>
                    <span className={styles.plSpacer} />
                    <Btn variant="secondary" type="button" onClick={pl.closeReview} disabled={pl.isSaving}>{translation("key_keep_editing")}</Btn>
                    <Btn variant="primary" type="button" onClick={pl.save} disabled={pl.isSaving}>
                        {pl.isSaving ? translation("key_saving") : translation("key_save_changes")}
                    </Btn>
                </>
            )}
        >
            <div className={styles.plReview}>
                <p className={styles.plReviewWho}>{interpolate(translation("key_pl_changes_to"), scope)}</p>
                {lead}
                {groups.map((group) => (
                    <div key={group.title}>
                        {/* a page with one kind of change (Fixed items) names each row instead */}
                        {group.title && <h4>{group.title}</h4>}
                        {group.rows.map((row) => (
                            <div key={row.key} className={styles.plReviewRow}>
                                <span className={styles.plReviewLabel}>{row.label}</span>
                                {row.text ? (
                                    /* a text change (a group name, a country's group) or a single fact ("2 countries") */
                                    <span className={styles.plReviewText}>
                                        {row.before != null && <>{row.before}<span className={styles.plArrow} aria-hidden="true">→</span></>}
                                        {row.after}
                                    </span>
                                ) : (
                                    <span className={styles.plReviewValue}>{show(row.before, row.pct)}<span className={styles.plArrow} aria-hidden="true">→</span>{show(row.after, row.pct)}</span>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
                <div className={styles.plEffects}>
                    {effects.map((effect) => <p key={effect.key} className={effect.warn ? styles.plWarn : undefined}>{effect.text}</p>)}
                </div>
            </div>
        </Modal>
    );
};

ReviewDialog.propTypes = {
    pl: PropTypes.object.isRequired,
    scope: PropTypes.string.isRequired,
    groups: PropTypes.arrayOf(PropTypes.object).isRequired,
    effects: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string, text: PropTypes.string, warn: PropTypes.bool })).isRequired,
    lead: PropTypes.node,
};

/* "Invoices that need it can't be created until it is entered again" for every entry the save clears. */
export const clearedEffect = (count) => (count
    ? [{ key: "cleared", text: plural(count, "key_pl_effect_cleared_one", "key_pl_effect_cleared"), warn: true }]
    : []);
export const keepEffect = () => ({ key: "keep", text: translation("key_pl_effect_keep") });

/* "Discard unsaved changes?" — Cancel, leaving the page, or leaving the Price List page shown */
export const DiscardConfirm = ({ scope, unsaved, onConfirm, onClose }) => (
    <ConfirmModal
        title={translation("key_pl_discard_title")}
        body={`${interpolate(translation(unsaved === 1 ? "key_pl_discard_body_one" : "key_pl_discard_body"), scope, unsaved)} ${translation("key_pl_discard_note")}`}
        confirmLabel={translation("key_pl_discard_changes")}
        cancelLabel={translation("key_keep_editing")}
        danger
        onConfirm={onConfirm}
        onClose={onClose}
    />
);

DiscardConfirm.propTypes = { scope: PropTypes.string.isRequired, unsaved: PropTypes.number.isRequired, onConfirm: PropTypes.func.isRequired, onClose: PropTypes.func.isRequired };

/* Cancel with unsaved changes: never discarded silently. */
export const DiscardDialog = ({ pl, scope }) => (pl.discardOpen
    ? <DiscardConfirm scope={scope} unsaved={pl.changes.length} onConfirm={pl.discard} onClose={pl.closeDiscard} />
    : null);

DiscardDialog.propTypes = { pl: PropTypes.object.isRequired, scope: PropTypes.string.isRequired };

/* Leaving the page (another agency, back to Overseas) with unsaved changes asks first, like Cancel. */
export const LeaveDialog = ({ pl, scope, pending, onClose }) => (pending
    ? <DiscardConfirm scope={scope} unsaved={pl.changes.length} onConfirm={() => { onClose(); pl.discard(); pending(); }} onClose={onClose} />
    : null);

LeaveDialog.propTypes = { pl: PropTypes.object.isRequired, scope: PropTypes.string.isRequired, pending: PropTypes.func, onClose: PropTypes.func.isRequired };

/* Loading, or the reason saved prices could not be loaded (saving is then unavailable): inside the Price List frame the
   reason is the alert under the title, and the page keeps Retry. */
export const PageLoading = ({ pl, toolbar }) => {
    const inFrame = Boolean(usePriceListFrame());
    return (
        <div>
            {toolbar}
            {pl.loadError ? (
                <div className={styles.emptyState} role={inFrame ? undefined : "alert"}>
                    {!inFrame && <p>{pl.loadError}</p>}
                    <Btn variant="secondary" type="button" onClick={pl.load}>{translation("key_retry")}</Btn>
                </div>
            ) : (
                <div className={shared.loadingState}>{translation("key_loading")}…</div>
            )}
        </div>
    );
};

PageLoading.propTypes = { pl: PropTypes.object.isRequired, toolbar: PropTypes.node };
