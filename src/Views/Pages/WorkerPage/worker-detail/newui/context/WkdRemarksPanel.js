import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from 'prop-types';
import dayjs from "dayjs";
import { getRemarkEntityApi, REMARK_EDIT_POLICY } from "./remarkEntityApi";
import { getCurrentUser, hasAnyModulePermission, isAdminUser } from "../../../../../../services/commonService";
import constData from "../../../../../../components/ReusableComponents/constants";
import { getInitials } from "../../../../../../utils/utils";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import translation from "../../../../../../utils/translation";
import { REMARK_MAX_LEN } from "../../../workerModuleConstants";

const lockIcon = (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="4" y="7" width="8" height="6.5" rx="1.5" /><path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" />
    </svg>
);

/* Remarks drawer body. The rail owns the list fetch (`onRefetch`); the panel only refetches after its own writes. */
const WkdRemarksPanel = ({ worker_id, entityType = 'worker', entityId, onRefetch }) => {
    const dispatch = useDispatch();
    const api = getRemarkEntityApi(entityType);
    const id = entityId ?? worker_id;
    const workerRemarks = useSelector(api.select);
    const hostRemarksHidden = useSelector((state) => (api.selectHostHidden ? api.selectHostHidden(state) : false));
    const [draft, setDraft] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editDraft, setEditDraft] = useState('');
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [busy, setBusy] = useState(false);
    const currentUserId = getCurrentUser()?.data?.id;
    const permissionList = useSelector((state) => state.users.permissionList);
    const canManageOwnRemarks =
        isAdminUser() ||
        !constData.REMARKS_PERMISSION_KEYS[entityType] ||
        hasAnyModulePermission(permissionList?.data, constData.REMARKS_PERMISSION_KEYS[entityType]);
    /* U-0048: the elevation over another author's remarks exists only where the entity's policy grants it (Worker) */
    const editPolicy = api.editPolicy || REMARK_EDIT_POLICY.worker;
    const canUpdateOthersRemarks = editPolicy.othersGrant && (
        isAdminUser() ||
        hasAnyModulePermission(permissionList?.data, constData.REMARKS_UPDATE_ELSE_PERMISSION_KEYS[entityType])
    );

    const refetch = useCallback(() => {
        if (onRefetch) { onRefetch(); return; }
        dispatch(api.fetch(id)).then((res) => {
            if (res?.error) ShowToast('error', res?.payload?.data?.message || res?.payload?.message || translation('key_remarks_could_not_be_loaded'));
        });
    }, [dispatch, api, id, onRefetch]);

    /* without a rail-owned fetch (standalone use) the panel loads its own list once */
    useEffect(() => { if (!onRefetch) refetch(); }, [refetch, onRefetch]);

    const remarks = useMemo(
        () => [...(workerRemarks || [])].sort((a, b) => b.id - a.id),
        [workerRemarks]
    );

    const handleAdd = useCallback(() => {
        const remarks_text = draft.trim();
        if (!remarks_text || busy) return;
        setBusy(true);
        dispatch(api.add(id, remarks_text)).then((res) => {
            setBusy(false);
            if (res?.error || res?.payload?.status === false) {
                ShowToast('error', res?.payload?.data?.message || res?.payload?.message);
            } else {
                setDraft('');
                refetch();
            }
        });
    }, [draft, busy, dispatch, api, id, refetch]);

    const handleSaveEdit = useCallback((remark) => {
        const remarks_text = editDraft.trim();
        if (!remarks_text || busy) return;
        setBusy(true);
        dispatch(api.update(id, remarks_text, remark.id)).then((res) => {
            setBusy(false);
            if (res?.error || res?.payload?.status === false) {
                ShowToast('error', res?.payload?.data?.message || res?.payload?.message);
            } else {
                setEditingId(null);
                refetch();
            }
        });
    }, [editDraft, busy, dispatch, api, id, refetch]);

    const handleDelete = useCallback((remark) => {
        if (busy) return;
        setBusy(true);
        dispatch(api.remove(id, remark.id)).then((res) => {
            setBusy(false);
            setConfirmDeleteId(null);
            if (res?.error || res?.payload?.status === false) {
                ShowToast('error', res?.payload?.data?.message || res?.payload?.message);
            } else {
                ShowToast('success', res?.payload?.message);
                refetch();
            }
        });
    }, [busy, dispatch, api, id, refetch]);

    /* the author is who wrote the remark; a later editor (`updated_by`) never becomes its author (OvN 57).
       W-19 (backend 248): the server says `is_own` per remark — that flag decides when present; the author id is the fallback.
       A refused edit / delete arrives as 403 NOT_OWN_REMARK and its message is shown as any other error. */
    const isAuthorOf = useCallback((remark) => (typeof remark?.is_own === "boolean" ? remark.is_own : currentUserId === remark?.remarks_by), [currentUserId]);

    const canEditOrDelete = useCallback((remark) => {
        const isEndorsement = remark?.category === "endorsement";
        return !isEndorsement && ((editPolicy.authorEdit && isAuthorOf(remark) && canManageOwnRemarks) || canUpdateOthersRemarks);
    }, [isAuthorOf, canManageOwnRemarks, canUpdateOthersRemarks, editPolicy.authorEdit]);

    return (
        <>
            { canManageOwnRemarks && <div className="remark-composer">
                <label htmlFor="wkd-remark-draft">{ translation(api.composerLabelKey) }</label>
                <textarea
                    id="wkd-remark-draft"
                    value={ draft }
                    maxLength={ REMARK_MAX_LEN }
                    placeholder={ translation('key_add_operational_context') }
                    onChange={ (e) => setDraft(e.target.value) }
                />
                <div className="remark-compose-foot">
                    <span>{ draft.length }/{ REMARK_MAX_LEN }</span>
                    <button
                        type="button"
                        className="ctx-btn primary"
                        disabled={ !draft.trim() || busy }
                        onClick={ handleAdd }
                    >
                        { translation('key_add_remark') }
                    </button>
                </div>
            </div> }

            <div className="remark-list">
                { hostRemarksHidden && <div className="remark-lock">{ lockIcon } { translation('key_wkr_host_remarks_hidden') }</div> }
                { remarks.map((remark) => {
                    const editable = canEditOrDelete(remark);
                    const authorName = remark?.remarksby_info || remark?.remarks_by_name || '';
                    const authorRole = remark?.remarksby_role || '';
                    return (
                        <div key={ remark.id } className="remark-item">
                            <div className="remark-head">
                                <span className="role-avatar">{ getInitials(authorName) }</span>
                                <span className="ctx-grow">
                                    <span className="person-name">{ authorName }</span>
                                    { authorRole && <span className="person-role">({ authorRole })</span> }
                                </span>
                                <time>{ dayjs(remark.created_at).format('DD MMM YYYY · HH:mm') }</time>
                            </div>
                            { editingId === remark.id ? (
                                <div className="remark-composer">
                                    <textarea
                                        value={ editDraft }
                                        maxLength={ REMARK_MAX_LEN }
                                        onChange={ (e) => setEditDraft(e.target.value) }
                                    />
                                    <div className="remark-compose-foot">
                                        <span>{ editDraft.length }/{ REMARK_MAX_LEN }</span>
                                        <button type="button" className="ctx-btn secondary" onClick={ () => setEditingId(null) }>{ translation('key_cancel') }</button>
                                        <button type="button" className="ctx-btn primary" disabled={ !editDraft.trim() || busy } onClick={ () => handleSaveEdit(remark) }>{ translation('key_save_remark') }</button>
                                    </div>
                                </div>
                            ) : (
                                <p className="remark-body">{ remark.remarks }</p>
                            ) }
                            { editable ? (
                                <div className="remark-actions">
                                    { isAuthorOf(remark) && <span>{ translation('key_authored_by_you') }</span> }
                                    { confirmDeleteId === remark.id ? (
                                        <>
                                            <button type="button" className="danger-text" onClick={ () => handleDelete(remark) }>{ translation('key_delete') }?</button>
                                            <button type="button" onClick={ () => setConfirmDeleteId(null) }>{ translation('key_cancel') }</button>
                                        </>
                                    ) : (
                                        <>
                                            <button type="button" onClick={ () => { setEditingId(remark.id); setEditDraft(remark.remarks || ''); setConfirmDeleteId(null); } }>{ translation('key_edit') }</button>
                                            <button type="button" className="danger-text" onClick={ () => setConfirmDeleteId(remark.id) }>{ translation('key_delete') }</button>
                                        </>
                                    ) }
                                </div>
                            ) : (
                                <div className="remark-lock">{ lockIcon } { translation(editPolicy.authorEdit ? 'key_remark_permission_note' : 'key_unavailable') }</div>
                            ) }
                        </div>
                    );
                }) }
                { remarks.length === 0 && (
                    <div className="wkd-wx-empty">{ translation('key_no_remarks') }</div>
                ) }
            </div>
        </>
    );
};

WkdRemarksPanel.propTypes = {
    worker_id: PropTypes.any,
    entityType: PropTypes.oneOf(['worker', 'employer']),
    entityId: PropTypes.any,
    onRefetch: PropTypes.func,
};

export default React.memo(WkdRemarksPanel);
