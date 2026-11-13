import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import translation from "../../../../../utils/translation";
import ConfirmModal from "../../../../../components/ui/ConfirmModal";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { getWorkerInvitation, resendWorkerInvitation, revokeWorkerInvitation } from "../../../../../services/workers";
import { getPermissionValue, isAdminUser, isPartnerUser } from "../../../../../services/permissionService";
import WkdDetCardHead from "./details/WkdDetCardHead";
import WkdReadField from "./details/WkdReadField";
import { SEND_REG_LINK_COPY, WORKER_INVITATION_NOT_PENDING, WORKER_INVITATION_STATUS } from "../../workerModuleConstants";

/*
 * Registration invitation of a worker created by a link (backend 248 W-10; reply 26 Oct §1):
 * GET /worker-invitations?worker_id → { worker_id, status: pending | accepted | revoked, email, invited_at, invited_by, last_sent_at,
 * send_count, expires_at: null, can_resend, can_revoke, history[] } — null when the worker was not created by a link (the card stays
 * away). Resend sends the same static link again; Revoke withdraws a pending invitation (the Partner Pending record is deleted) after a
 * confirm. Either answers 409 INVITATION_NOT_PENDING once the invitation moved on — the card re-reads itself. No expiry is rendered.
 */
const when = (at) => (at ? dayjs(at).format("DD MMM YYYY · HH:mm") : "");
const STATUS_KEY = { [WORKER_INVITATION_STATUS.PENDING]: "key_pending", [WORKER_INVITATION_STATUS.ACCEPTED]: "key_wkr_invitation_accepted", [WORKER_INVITATION_STATUS.REVOKED]: "key_wkr_invitation_revoked_status" };
const invitationOf = (body) => {
    const d = body?.data;
    const inv = d && typeof d === "object" && "invitation" in d ? d.invitation : d;
    return inv && typeof inv === "object" && inv.status ? inv : null;
};

const WkdInvitationCard = ({ workerId }) => {
    const permissionList = useSelector((state) => state.users.permissionList);
    const [invitation, setInvitation] = useState(null);
    const [busy, setBusy] = useState(false);
    const [revoking, setRevoking] = useState(false);
    /* the send grants gate the actions (host `worker_send_link`, partner `partner_send_link`); the server's can_* flags gate the state */
    const canAct = isAdminUser() || (isPartnerUser()
        ? getPermissionValue(permissionList?.data, "partner", "partner_send_link") === "y"
        : getPermissionValue(permissionList?.data, "worker", "worker_send_link") === "y");

    const load = useCallback(async () => {
        try {
            const res = await getWorkerInvitation({ worker_id: workerId });
            setInvitation(invitationOf(res?.data));
        } catch { setInvitation(null); }
    }, [workerId]);
    useEffect(() => { if (workerId) load(); }, [workerId, load]);

    const run = useCallback(async (call, okText) => {
        if (busy) return;
        setBusy(true);
        try {
            const res = await call();
            if (res?.data?.status === false) throw Object.assign(new Error(res.data.message), { response: res });
            ShowToast("success", okText);
        } catch (err) {
            const body = err?.response?.data || {};
            ShowToast("error", body.code === WORKER_INVITATION_NOT_PENDING ? body.message : (body.message || err?.message || translation("key_something_went_wrong")));
        } finally {
            setBusy(false);
            load();
        }
    }, [busy, load]);
    const resend = useCallback(() => run(() => resendWorkerInvitation({ worker_id: workerId }), `${ SEND_REG_LINK_COPY.resentText } ${ invitation?.email || "" }`), [run, workerId, invitation?.email]);
    const revoke = useCallback(async () => { await run(() => revokeWorkerInvitation({ worker_id: workerId }), SEND_REG_LINK_COPY.revokedText); setRevoking(false); }, [run, workerId]);

    if (!invitation) return null;
    const pending = invitation.status === WORKER_INVITATION_STATUS.PENDING;
    const history = Array.isArray(invitation.history) ? invitation.history : [];
    return (
        <div className="g2-card wkd-det-card" data-mc-invitation={ invitation.status }>
            <WkdDetCardHead title={ translation("key_wkr_invitation_title") }>
                <span className={ `g2-status-tag g2-assignment-state${ pending ? "" : " assigned" }` }>{ translation(STATUS_KEY[invitation.status] || "key_pending") }</span>
            </WkdDetCardHead>
            <div className="wkd-det-sec is-last">
                <div className="det-grid">
                    <WkdReadField det label={ translation("key_email") } value={ invitation.email || "" } />
                    <WkdReadField det label={ translation("key_wkr_invitation_invited") } value={ [when(invitation.invited_at), invitation.invited_by_name || invitation.invited_by || ""].filter(Boolean).join(" · ") } />
                    <WkdReadField det label={ translation("key_wkr_invitation_last_sent") } value={ when(invitation.last_sent_at) } />
                    <WkdReadField det label={ translation("key_wkr_invitation_send_count") } value={ String(invitation.send_count ?? 0) } mono />
                </div>
                { history.length > 0 && (
                    <div className="wkd-inv-history">
                        <div className="g2-field-label">{ translation("key_history") }</div>
                        <ul>
                            { history.map((h, i) => (
                                <li key={ h.id || i }><time>{ when(h.at || h.created_at || h.sent_at) }</time> <span>{ h.event || h.action || h.status || "" }</span>{ (h.by_name || h.by) ? <span className="by"> · { h.by_name || h.by }</span> : null }</li>
                            )) }
                        </ul>
                    </div>
                ) }
                { canAct && pending && (invitation.can_resend || invitation.can_revoke) && (
                    <div className="wkd-g2-stagebar">
                        { invitation.can_revoke && <button type="button" className="g2-button" disabled={ busy } onClick={ () => setRevoking(true) }>{ SEND_REG_LINK_COPY.revoke }</button> }
                        { invitation.can_resend && <button type="button" className="g2-button primary" disabled={ busy } aria-disabled={ busy } onClick={ resend }>{ SEND_REG_LINK_COPY.resend }</button> }
                    </div>
                ) }
            </div>
            { revoking && (
                <ConfirmModal title={ SEND_REG_LINK_COPY.revokeConfirmTitle } body={ SEND_REG_LINK_COPY.revokeConfirmText } danger busy={ busy }
                    confirmLabel={ SEND_REG_LINK_COPY.revoke } cancelLabel={ translation("key_cancel") } onConfirm={ revoke } onClose={ () => setRevoking(false) } />
            ) }
        </div>
    );
};

WkdInvitationCard.propTypes = { workerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired };

export default React.memo(WkdInvitationCard);
