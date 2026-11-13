import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import Modal from "../../../../components/ui/Modal";
import Btn from "../../../../components/ui/Btn";
import { Field, TextArea } from "../../../../components/ui/FormControls";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { getCurrentUser } from "../../../../services/commonService";
import { addEditInsuranceRemarks, removeInsuranceRemarks } from "../../../../services/remarks";
import { fmtDateTime, translation } from "../dashboard/insuranceDashboardConfig";
import formStyles from "../shared/InsuranceForms.module.css";
import styles from "./InsuranceRecord.module.css";

/* the server's limit (insurance-api insuranceSaveRemarks, CHT #43) */
export const REMARK_MAX_LENGTH = 1000;
/* counted as the server counts it (JSON-schema maxLength counts code points, so an emoji is one character) */
export const remarkLength = (text) => Array.from(String(text ?? "")).length;
/* P7-2 (owner, 11 Nov 2026): over the limit, the error stands beside the field and nothing is sent; the box does not cut the
   text silently.
   @migration-unspecified(insurance): the package gives no copy for an over-limit remark; "Remark must be 1,000 characters or
   fewer." follows the app's existing "… must be N characters or fewer." wording. On the wording review list (PROMPT6_CARRY). */
export const remarkLengthError = (text) => (remarkLength(text) > REMARK_MAX_LENGTH ? translation("key_ins_remark_too_long") : "");

/* one submission key per draft: a double click or a retry of the same draft cannot add it twice (prototype remarks.js, F2) */
export const remarkSubmissionKey = () => `remark-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const OPERATION_KEY = { Added: "key_ins_remark_op_added", Edited: "key_ins_remark_op_edited", Deleted: "key_ins_remark_op_deleted" };
const who = (name) => name || translation("key_ins_system");
/* "Edited by Ann Lee · 03/11/26 10:15" */
const operationLine = (v) => translation("key_ins_remark_op_by", { op: translation(OPERATION_KEY[v.operation]), who: who(v.actorName), at: fmtDateTime(v.at) });

const serverMessage = (error) => error?.response?.data?.message || translation("key_something_went_wrong");
const mustRefresh = (error) => [403, 404, 409].includes(error?.response?.status);

/* remarks.js row: author and time; the last change when it is not the add; the text, or the tombstone of a deleted remark;
   Edit / Delete for the author (with Insurance Remarks); otherwise the author note; the version history, newest first. */
const RemarkRow = ({ remark, mine, onEdit, onDelete }) => {
    const history = remark.history || [];
    const last = history[history.length - 1];
    return (
        <article className={styles.remarkRow} data-remark={remark.id} data-deleted={remark.deleted ? "true" : undefined}>
            <div className={styles.remarkMeta}>
                <b>{who(remark.remarks_by_name)}</b>
                <span className={styles.remarkMuted}>{fmtDateTime(remark.created_at)}</span>
            </div>
            {last && last.operation !== "Added" && <div className={`${styles.remarkMuted} ${styles.remarkEdited}`} data-remark-last>{operationLine(last)}</div>}
            {/* staff-authored text: shown exactly as stored (SR-07) */}
            <div className={styles.remarkText} data-remark-text translate="no">
                {remark.deleted ? translation("key_ins_remark_deleted_tombstone") : remark.remarks}
            </div>
            {mine && !remark.deleted && (
                <div className={styles.remarkActions}>
                    <Btn variant="ghost" className={styles.btnSm} data-action="edit-remark" onClick={() => onEdit(remark)}>{translation("key_edit")}</Btn>
                    <Btn variant="ghost" className={styles.btnSm} data-action="delete-remark" onClick={() => onDelete(remark)}>{translation("key_delete")}</Btn>
                </div>
            )}
            {!mine && !remark.deleted && <div className={`${styles.remarkMuted} ${styles.remarkAuthorNote}`}>{translation("key_ins_remark_author_only_note")}</div>}
            {history.length > 0 && (
                <details className={styles.remarkHistory}>
                    <summary>{translation("key_ins_remark_history_count", { n: history.length })}</summary>
                    {[...history].reverse().map((v) => (
                        <div key={v.id} className={styles.remarkVersion} data-remark-event={v.id}>
                            <div className={styles.remarkMuted}>{operationLine(v)}</div>
                            {v.old != null && v.old !== "" && (
                                <div>
                                    <b className={styles.remarkLabel}>{translation(v.operation === "Deleted" ? "key_ins_remark_deleted_text" : "key_ins_remark_before")}</b>
                                    <div className={styles.remarkText} translate="no">{v.old}</div>
                                </div>
                            )}
                            {v.new != null && (
                                <div>
                                    <b className={styles.remarkLabel}>{translation(v.operation === "Added" ? "key_ins_remark_text" : "key_ins_remark_after")}</b>
                                    <div className={styles.remarkText} translate="no">{v.new}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </details>
            )}
        </article>
    );
};
RemarkRow.propTypes = { remark: PropTypes.object.isRequired, mine: PropTypes.bool, onEdit: PropTypes.func.isRequired, onDelete: PropTypes.func.isRequired };

/* remarks.js edit(): the version the dialog was opened on travels with the save; a newer one is refused by the server.
   A stale conflict (409), no answer or a server failure keeps the dialog open with the text and shows the message above it;
   closing it then reloads the remarks (PROMPT 9 F-1 / F-2, as useKeptDraft does for the request dialogs). A remark that is gone
   or no longer the actor's to edit (404 / 403) still closes the dialog and reloads. */
const EditRemarkDialog = ({ record, remark, onClose, onDone }) => {
    const version = useRef(remark.version);
    const [text, setText] = useState(remark.remarks);
    const [error, setError] = useState("");
    const [kept, setKept] = useState("");
    const reload = useRef(false);
    const [busy, setBusy] = useState(false);
    const tooLong = remarkLengthError(text);
    const close = () => (reload.current ? onDone(remark.id) : onClose());
    const save = () => {
        if (busy) return;
        if (!text.trim()) { setError(translation("key_ins_remark_required")); return; }
        if (tooLong) return;
        setBusy(true);
        setKept("");
        addEditInsuranceRemarks({ insurance_id: record.id, remark_id: remark.id, version: version.current, remarks: text })
            .then((res) => {
                const data = res?.data?.data || {};
                ShowToast("success", data.unchanged ? translation("key_ins_remark_no_changes") : (res?.data?.message || translation("key_ins_remark_saved")));
                setBusy(false);
                onDone(remark.id);
            })
            .catch((e) => {
                setBusy(false);
                const status = e?.response?.status;
                if (status === 409 || !status || status >= 500) { reload.current = true; setKept(serverMessage(e)); return; }
                ShowToast("error", serverMessage(e));
                if (mustRefresh(e)) onDone(remark.id);
            });
    };
    return (
        <Modal busy={busy} title={translation("key_ins_edit_remark")} subtitle={record.ref} width={640} onClose={close}
            footer={(
                <>
                    <span className={formStyles.spacer} />
                    <Btn variant="secondary" onClick={close}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" data-action="save-remark" onClick={save} disabled={busy}>{busy ? translation("key_saving") : translation("key_ins_save_remark")}</Btn>
                </>
            )}>
            <div className={formStyles.form}>
                {kept && <div className={formStyles.notice} data-tone="danger" role="alert" data-kept-draft>{kept}</div>}
                <Field label={translation("key_ins_remark")} required htmlFor="ins-remark-text" error={error || tooLong}>
                    <TextArea id="ins-remark-text" rows={5} value={text} invalid={!!(error || tooLong)} translate="no"
                        onChange={(e) => { setText(e.target.value); setError(""); }} />
                </Field>
            </div>
        </Modal>
    );
};
EditRemarkDialog.propTypes = { record: PropTypes.object.isRequired, remark: PropTypes.object.isRequired, onClose: PropTypes.func.isRequired, onDone: PropTypes.func.isRequired };

/* remarks.js remove(): narrow confirmation showing the text; the deleted text stays in the remark's history */
const DeleteRemarkDialog = ({ remark, onClose, onDone }) => {
    const version = useRef(remark.version);
    const [busy, setBusy] = useState(false);
    const confirm = () => {
        if (busy) return;
        setBusy(true);
        removeInsuranceRemarks({ remark_id: remark.id, version: version.current })
            .then((res) => {
                ShowToast("success", res?.data?.message || translation("key_ins_remark_deleted"));
                setBusy(false);
                onDone(remark.id);
            })
            .catch((e) => {
                setBusy(false);
                ShowToast("error", serverMessage(e));
                if (mustRefresh(e)) onDone(remark.id);
            });
    };
    return (
        <Modal busy={busy} title={translation("key_ins_delete_remark_title")} subtitle={translation("key_ins_delete_remark_sub")} width={480} onClose={onClose}
            footer={(
                <>
                    <span className={formStyles.spacer} />
                    <Btn variant="secondary" onClick={onClose}>{translation("key_cancel")}</Btn>
                    <Btn variant="danger" data-action="confirm-delete-remark" onClick={confirm} disabled={busy}>{translation("key_ins_delete_remark")}</Btn>
                </>
            )}>
            <div className={styles.remarkText} translate="no">{remark.remarks}</div>
        </Modal>
    );
};
DeleteRemarkDialog.propTypes = { remark: PropTypes.object.isRequired, onClose: PropTypes.func.isRequired, onDone: PropTypes.func.isRequired };

/*
 * The Remarks drawer's body (Insurance.html screens/remarks.js; Insurance.txt INS09; PM U-0080): Add an Insurance remark for a
 * holder of Insurance Remarks (the server's grant, meta.caps.writeRemarks), then every remark newest first, deleted ones as
 * tombstones, each with its version history. The author edits or deletes their own remark with no time limit; everyone else
 * sees the author note. Request details stay on their request and are never copied here (C4).
 * Without the grant, one line stands in place of the composer: the user can read remarks but may not add them (owner, 12 Nov
 * 2026; an addition to Insurance.html, whose remarks.js shows nothing there: OPEN_QUESTIONS P9-R1, wording on the review list).
 */
const InsuranceRemarks = ({ record, remarks, loading = false, canWrite = false, onChanged }) => {
    const [draft, setDraft] = useState("");
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [focusId, setFocusId] = useState(null);
    const draftKey = useRef(remarkSubmissionKey());
    const composerRef = useRef(null);
    const listRef = useRef(null);
    const me = getCurrentUser()?.data?.id;
    const items = [...(remarks || [])].sort((a, b) => b.id - a.id);

    const draftTooLong = remarkLengthError(draft);
    const add = useCallback(() => {
        if (busy || !draft.trim() || remarkLengthError(draft)) return;
        setBusy(true);
        addEditInsuranceRemarks({ insurance_id: record.id, remarks: draft, submission_key: draftKey.current })
            .then((res) => {
                ShowToast("success", res?.data?.message || translation("key_ins_remark_added"));
                setDraft("");
                draftKey.current = remarkSubmissionKey();
                setBusy(false);
                onChanged();
                composerRef.current?.focus();
            })
            .catch((e) => {
                setBusy(false);
                ShowToast("error", serverMessage(e));
            });
    }, [busy, draft, onChanged, record.id]);

    const done = useCallback((id) => {
        setEditing(null);
        setDeleting(null);
        setFocusId(id);
        onChanged();
    }, [onChanged]);

    /* after a save or delete the row keeps focus: its Edit button, else its history (remarks.js draw(focusId)) */
    useEffect(() => {
        if (!focusId || !listRef.current) return;
        const row = listRef.current.querySelector(`[data-remark="${focusId}"]`);
        const target = row && (row.querySelector('[data-action="edit-remark"]') || row.querySelector("summary"));
        if (target) { target.focus(); setFocusId(null); }
    }, [focusId, remarks]);

    return (
        <div className={styles.remarksPanel} data-panel="remarks">
            {canWrite ? (
                <div className={styles.remarkComposer}>
                    <Field label={translation("key_ins_add_insurance_remark")} htmlFor="ins-remark-draft" error={draftTooLong}>
                        <TextArea ref={composerRef} id="ins-remark-draft" rows={3} value={draft} invalid={!!draftTooLong} translate="no"
                            placeholder={translation("key_ins_remark_placeholder")} data-ctl="remark-draft" onChange={(e) => setDraft(e.target.value)} />
                    </Field>
                    <div className={styles.remarkComposerActions}>
                        <Btn variant="primary" className={styles.btnSm} data-action="add-remark" disabled={busy || !draft.trim() || !!draftTooLong} onClick={add}>{translation("key_ins_add_remark")}</Btn>
                    </div>
                </div>
            ) : (
                <div className={styles.remarkReadOnly} data-remarks-read-only>{translation("key_ins_remarks_read_only")}</div>
            )}
            <div ref={listRef} className={styles.remarkList}>
                {items.length ? items.map((r) => (
                    <RemarkRow key={r.id} remark={r} mine={canWrite && me != null && Number(r.remarks_by) === Number(me)} onEdit={setEditing} onDelete={setDeleting} />
                )) : (
                    <div className={styles.remarksEmpty}>{loading ? translation("key_loading") : translation("key_no_remarks_yet")}</div>
                )}
            </div>
            {/* the dialogs open over the drawer (remarks.js nests them): their own layer above the drawer's */}
            {editing && createPortal(<div className={styles.remarkDialogLayer}><EditRemarkDialog record={record} remark={editing} onClose={() => setEditing(null)} onDone={done} /></div>, document.body)}
            {deleting && createPortal(<div className={styles.remarkDialogLayer}><DeleteRemarkDialog remark={deleting} onClose={() => setDeleting(null)} onDone={done} /></div>, document.body)}
        </div>
    );
};

InsuranceRemarks.propTypes = {
    record: PropTypes.shape({ id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired, ref: PropTypes.string }).isRequired,
    remarks: PropTypes.array,
    loading: PropTypes.bool,
    canWrite: PropTypes.bool,
    onChanged: PropTypes.func.isRequired,
};

export default InsuranceRemarks;
