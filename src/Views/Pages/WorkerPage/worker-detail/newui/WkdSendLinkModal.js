import React, { useCallback, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";
import { sendWorkerRegistrationLink } from "../../../../../services/workers";
import { getPermissionValue, isAdminUser, isPartnerUser } from "../../../../../services/permissionService";
import useDialogFocus from "../../../../../hooks/useDialogFocus";
import { SEND_LINK_MODAL_COPY, SEND_LINK_MODAL_TEXT, SEND_LINK_PAYLOAD, SEND_LINK_CHANNEL } from "../../workerModuleConstants";
import translation from "../../../../../utils/translation";


const resolveWorkerType = (type) => {
    const key = String(type ?? '').trim().toLowerCase();
    if (key === '2' || key === 'overseas') return 'overseas';
    if (key === '1' || key === 'local') return 'local';
    return null;
};

const WkdSendLinkModal = ({ worker, onClose }) => {
    const workerType = resolveWorkerType(worker?.type);
    const isOverseas = workerType === 'overseas';
    const permissionList = useSelector((state) => state.users.permissionList);
    const email = worker?.email || '';
    const phone = worker?.mobile_number ? `${ worker.country_code ? `${ worker.country_code } ` : '' }${ worker.mobile_number }` : '';

    /* recipients: the recorded worker-controlled contacts — Overseas by email only (KD-02); an unresolved type gets no link */
    const contacts = useMemo(() => {
        const list = [];
        if (!workerType) return list;
        if (email) list.push({ kind: SEND_LINK_CHANNEL.EMAIL, value: email, label: `${ translation('key_email') } · ${ email }` });
        if (phone && !isOverseas) list.push({ kind: SEND_LINK_CHANNEL.SMS, value: phone, label: `${ translation('key_mobile') } · ${ phone } (${ translation('key_sms') })` });
        return list;
    }, [email, phone, isOverseas, workerType]);

    const [selected, setSelected] = useState(contacts[0]?.value || '');
    const [note, setNote] = useState(null);
    const [sending, setSending] = useState(false);
    const cardRef = useRef(null);
    useDialogFocus(cardRef, onClose);

    const handleSend = useCallback(async () => {
        const pick = contacts.find((c) => c.value === selected);
        if (!pick) { setNote({ kind: 'warn', text: translation('key_please_select') }); return; }
        const canSend = isAdminUser() || (isPartnerUser()
            ? getPermissionValue(permissionList?.data, 'partner', 'partner_send_link') === 'y'
            : getPermissionValue(permissionList?.data, 'worker', 'worker_send_link') === 'y');
        if (!canSend) { setNote({ kind: 'warn', text: SEND_LINK_MODAL_COPY.noPermission }); return; }
        setSending(true);
        try {
            const res = await sendWorkerRegistrationLink({
                [SEND_LINK_PAYLOAD.WORKER_ID]: worker.id,
                [SEND_LINK_PAYLOAD.CHANNEL]: pick.kind,
                [SEND_LINK_PAYLOAD.RECIPIENT]: pick.value,
            });
            setNote({ kind: 'ok', text: res?.data?.message || `${ translation('key_registration_link_sent') } · ${ pick.value }` });
        } catch (err) {
            setNote({ kind: 'warn', text: err?.response?.data?.message || translation('key_wkr_send_reg_link_failed_text') });
        } finally {
            setSending(false);
        }
    }, [contacts, selected, worker?.id, permissionList?.data]);

    const emptyText = !workerType
        ? SEND_LINK_MODAL_COPY.unresolvedType
        : isOverseas
        ? SEND_LINK_MODAL_TEXT.noEmailOverseas
        : SEND_LINK_MODAL_TEXT.noContactLocal;

    return (
        <div className="wkd-rl-backdrop" role="presentation" onClick={ (e) => { if (e.target === e.currentTarget) onClose(); } }>
            <div ref={ cardRef } className="wkd-rl-card" role="dialog" aria-modal="true" aria-labelledby="wkd-rl-title">
                <div className="wkd-rl-head">
                    <h2 id="wkd-rl-title">{ translation('key_wkr_send_registration_link') }</h2>
                    <span className="wkd-rl-sub">{ worker?.name }{ worker?.code ? ` · ${ worker.code }` : '' }</span>
                    <span className="grow" />
                    <button type="button" className="wkd-rl-btn" onClick={ onClose }>{ translation('key_close') }</button>
                </div>
                <div className="wkd-rl-body">
                    <p>{ translation('key_wkr_the_link_lets_the_worker_claim') } <strong>{ translation('key_wkr_this_existing_record') }</strong> { translation('key_wkr_in_the_worker_app_with_a_one') } { isOverseas ? translation('key_wkr_email_address') : translation('key_contact').toLowerCase() }{ translation('key_wkr_it_creates_no_new_worker_issues_no') }</p>
                    <fieldset className="wkd-rl-fieldset">
                        <legend>{ translation('key_wkr_recipient_recorded_worker_controlled_contacts_on') }</legend>
                        { !contacts.length ? (
                            <div className="wkd-rl-muted">{ emptyText }</div>
                        ) : contacts.length === 1 && isOverseas ? (
                            <div>{ translation('key_wkr_email') } <strong>{ contacts[0].value }</strong></div>
                        ) : contacts.map((c) => (
                            <label key={ c.value } className="wkd-rl-option">
                                <input type="radio" name="wkd-rl-recipient" value={ c.value } checked={ selected === c.value } onChange={ () => setSelected(c.value) } />
                                <span>{ c.label }</span>
                            </label>
                        )) }
                    </fieldset>
                    { note && <div className={ `wkd-rl-note ${ note.kind }` } role="status">{ note.text }</div> }
                    <div className="wkd-rl-actions">
                        <button type="button" className="wkd-rl-btn lg" onClick={ onClose } disabled={ sending }>{ translation('key_cancel') }</button>
                        <button type="button" className="wkd-rl-btn primary" onClick={ handleSend } disabled={ !contacts.length || sending || note?.kind === 'ok' }>{ translation('key_wkr_send_registration_link') }</button>
                    </div>
                    <p className="wkd-rl-fine">{ translation('key_wkr_resend_issues_a_new_one_time_code') }</p>
                </div>
            </div>
        </div>
    );
};

WkdSendLinkModal.propTypes = {
    worker: PropTypes.shape({
        id: PropTypes.any.isRequired,
        name: PropTypes.string,
        code: PropTypes.string,
        type: PropTypes.any,
        email: PropTypes.string,
        country_code: PropTypes.string,
        mobile_number: PropTypes.string,
    }).isRequired,
    onClose: PropTypes.func.isRequired,
};

export default WkdSendLinkModal;
