import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import QrCodeImg from "../../../../assets/img/qr-code.png";
import { qrBranchGenerateCode, workerCheckoutAtBranch } from "../../../../redux/Slices/worker/WorkerSlice";
import { getBranchCheckinSessions, extendBranchCheckinSession } from "../../../../services/workers";
import { dispatchWithHandling } from "../../../../utils/dispatchHandler";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { CHECKIN_SESSION_STEP_MIN, CHECKIN_SESSION_CAP_MIN } from "../workerModuleConstants";
import { extendRefusalReloads, isSessionCapped, utcToLocalClock } from "./checkinUtils";
import translation from "../../../../utils/translation";


const copyText = (text) => {
    if (navigator.clipboard) return navigator.clipboard.writeText(text);
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return Promise.resolve();
};

const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

const CheckInDrawer = ({ locations, onClose, onChanged }) => {
    const dispatch = useDispatch();
    const qrState = useSelector((state) => state.worker.branchQRCodeData);
    const [branch, setBranch] = useState(null);
    const [confirmRegen, setConfirmRegen] = useState(false);
    const [sessions, setSessions] = useState({ rows: [], available: true, loading: false, error: "" });
    const dialogRef = useRef(null);
    const confirmRegenRef = useRef(confirmRegen);
    confirmRegenRef.current = confirmRegen;

    const hk = locations.filter((l) => !l.isMacau);
    const macau = locations.filter((l) => l.isMacau);

    /* a11y (worker_AUDIT D30): the dialog takes focus on open, Tab stays inside it, focus returns to the opener on close;
       Escape dismisses the regenerate confirm first and closes the drawer only when no confirm is open */
    useEffect(() => {
        const opener = document.activeElement;
        const focusables = () => Array.from(dialogRef.current?.querySelectorAll(FOCUSABLE) || []);
        focusables()[0]?.focus();
        const onKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (confirmRegenRef.current) setConfirmRegen(false); else onClose();
                return;
            }
            if (e.key !== 'Tab') return;
            const list = focusables();
            if (!list.length) return;
            const first = list[0];
            const last = list[list.length - 1];
            if (e.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            opener?.focus?.();
        };
    }, [onClose]);

    /* backend 374: rows oldest first — checkin_id · worker · reference_id · checked_in_at / valid_until (UTC) · minutes_used ·
       minutes_left · day_cap_minutes · day_minutes_remaining · can_extend; a refusal shows the server message */
    const loadSessions = useCallback((b) => {
        setSessions({ rows: [], available: true, loading: true, error: "" });
        getBranchCheckinSessions({ branch_id: b.id })
            .then((res) => {
                const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
                setSessions({ rows, available: true, loading: false, error: "" });
            })
            .catch((err) => setSessions({ rows: [], available: false, loading: false, error: err?.response?.data?.message || "" }));
    }, []);

    const openBranch = useCallback((b) => {
        setBranch(b);
        setConfirmRegen(false);
        dispatch(qrBranchGenerateCode({ branch_id: b.id, action_type: 'generate' }));
        loadSessions(b);
    }, [dispatch, loadSessions]);

    const regenerate = useCallback(() => {
        if (!branch) return;
        dispatch(qrBranchGenerateCode({ branch_id: branch.id, action_type: 'regenerate' }));
        setConfirmRegen(false);
    }, [dispatch, branch]);

    const extend = useCallback(async (row) => {
        try {
            await extendBranchCheckinSession({ branch_id: branch.id, worker_id: row.worker_id, minutes: CHECKIN_SESSION_STEP_MIN });
            loadSessions(branch);
        } catch (err) {
            ShowToast('error', err?.response?.data?.message || translation('key_wkr_the_session_could_not_be_extended'));
            /* 404 the session already ended · 409 the day cap is reached: the list is stale either way */
            if (extendRefusalReloads(err?.response?.data?.code)) loadSessions(branch);
        }
    }, [branch, loadSessions]);

    const checkOut = useCallback(async (row) => {
        try {
            await dispatchWithHandling(dispatch, workerCheckoutAtBranch({ worker_ids: [row.worker_id], branch_id: branch.id }));
            loadSessions(branch);
            if (onChanged) onChanged();
        } catch (err) {
            ShowToast('error', err.message);
        }
    }, [dispatch, branch, loadSessions, onChanged]);

    const qrDetails = qrState?.qr_details;
    const link = qrDetails?.qr_token ? `${ window.location.origin }/qr-code/?q=${ qrDetails.qr_token }` : '';

    /* "N in" = workers checked in right now (prototype); the count comes with the branch row (`checkin_count`), em dash until it does */
    const tile = (b) => (
        <button key={ b.id } type="button" className="mc-ci-branch" aria-pressed={ branch?.id === b.id } onClick={ () => openBranch(b) }>
            <span>{ b.name }</span>
            <span className="n mono" data-ci-count={ b.checkinCount ?? '' }>{ b.checkinCount != null ? `${ b.checkinCount } ${ translation('key_wkr_in') }` : '—' }</span>
        </button>
    );

    return (
        <div className="mc-ci-ov open" role="dialog" aria-modal="true" aria-label={ translation('key_wkr_branch_check_in') } onClick={ (e) => { if (e.target === e.currentTarget) onClose(); } }>
            <div className="mc-ci" ref={ dialogRef }>
                <div className="mc-ci-bar">
                    <b>{ translation('key_wkr_check_in') }</b>
                    <span className="sub">{ branch ? branch.name : translation('key_wkr_select_a_location') }</span>
                    <span className="sp" />
                    { branch && <button type="button" className="mc-ci-btn" onClick={ () => setBranch(null) }>{ translation('key_wkr_all_locations') }</button> }
                    <button type="button" className="mc-ci-btn" onClick={ onClose }>{ translation('key_close') }</button>
                </div>
                <div className="mc-ci-body">
                    { !branch ? (
                        <div className="mc-ci-card">
                            { !locations.length ? (
                                <>
                                    <div className="mc-ci-sect">{ translation('key_wkr_check_in') }</div>
                                    <div className="mc-ci-empty">{ translation('key_wkr_your_account_has_no_branch_level_check') }</div>
                                    <div className="mc-ci-rules">{ translation('key_wkr_check_in_access_is_granted_per_branch') }</div>
                                </>
                            ) : (
                                <>
                                    { hk.length > 0 && (
                                        <>
                                            <div className="mc-ci-sect">{ translation('key_wkr_hong_kong_oec_branch') }</div>
                                            <div className="mc-ci-branches">{ hk.map(tile) }</div>
                                        </>
                                    ) }
                                    { macau.length > 0 && (
                                        <>
                                            <div className="mc-ci-sect mc-ci-sect-gap">{ translation('key_macau') }</div>
                                            <div className="mc-ci-branches">{ macau.map(tile) }</div>
                                            <div className="mc-ci-grouplbl">{ translation('key_wkr_macau_issues_its_own_check_in_qr') }</div>
                                        </>
                                    ) }
                                    <div className="mc-ci-rules">{ translation('key_wkr_only_the_locations_you_have_check_in') } { CHECKIN_SESSION_STEP_MIN } { translation('key_wkr_minutes_and_checks_out_automatically_it_can') } { CHECKIN_SESSION_STEP_MIN }{ translation('key_wkr_minute_steps_to_a_maximum_of') } { CHECKIN_SESSION_CAP_MIN / 60 } { translation('key_wkr_hours_on_one_date_at_one_location') }</div>
                                </>
                            ) }
                        </div>
                    ) : (
                        <>
                            <div className="mc-ci-card">
                                <div className="mc-ci-sect">{ translation('key_wkr_reception_qr') } { branch.name }</div>
                                <div className="mc-ci-qrwrap">
                                    <div className="mc-ci-qr" role="img" aria-label={ `Check-in QR code for ${ branch.name }` }>
                                        { qrState?.loading ? <span className="mc-ci-empty">{ translation('key_wkr_loading') }</span> : <img src={ qrDetails?.qr_image || QrCodeImg } alt="" /> }
                                    </div>
                                    <div className="mc-ci-meta">
                                        <div className="mc-ci-link">
                                            <span>{ link || '—' }</span>
                                            <button type="button" className="mc-ci-btn mc-ci-btn-sm" disabled={ !link } onClick={ () => copyText(link).then(() => ShowToast('success', translation('key_wkr_link_copied'))) }>{ translation('key_copy') }</button>
                                        </div>
                                        <div className="mc-ci-rules">{ translation('key_wkr_the_worker_scans_this_code_at_reception') }</div>
                                        <div><button type="button" className="mc-ci-btn danger" onClick={ () => setConfirmRegen(true) }>{ translation('key_wkr_regenerate_qr_and_link') }</button></div>
                                        { confirmRegen && (
                                            <div className="mc-ci-confirm open">
                                                <span>{ translation('key_wkr_regenerate_now_anyone_part_way_through_scanning') }</span>
                                                <button type="button" className="mc-ci-btn" onClick={ () => setConfirmRegen(false) }>{ translation('key_wkr_keep_current') }</button>
                                                <button type="button" className="mc-ci-btn danger" onClick={ regenerate }>{ translation('key_regenerate') }</button>
                                            </div>
                                        ) }
                                    </div>
                                </div>
                            </div>
                            <div className="mc-ci-card">
                                <div className="mc-ci-sect">{ translation('key_wkr_checked_in_now') }</div>
                                { sessions.loading ? (
                                    <div className="mc-ci-empty">{ translation('key_wkr_loading') }</div>
                                ) : !sessions.available ? (
                                    <div className="mc-ci-empty">{ sessions.error || translation('key_wkr_the_check_in_session_list_is_not') }</div>
                                ) : !sessions.rows.length ? (
                                    <div className="mc-ci-empty">{ translation('key_wkr_no_one_is_checked_in_at') } { branch.name } { translation('key_wkr_right_now') }</div>
                                ) : (
                                    <>
                                        <div className="mc-ci-row head"><span>{ translation('key_worker') }</span><span>{ translation('key_code') }</span><span>{ translation('key_wkr_checked_in') }</span><span>{ translation('key_wkr_left') }</span><span /></div>
                                        { sessions.rows.map((r) => {
                                            const used = Number(r.minutes_used ?? CHECKIN_SESSION_STEP_MIN);
                                            const left = Number(r.minutes_left ?? 0);
                                            const capMin = Number(r.day_cap_minutes ?? CHECKIN_SESSION_CAP_MIN);
                                            const capped = isSessionCapped(r);
                                            const extendTip = capped
                                                ? `At the ${ capMin / 60 }-hour cap for this date at ${ branch.name } — no further extension`
                                                : `Extend by ${ CHECKIN_SESSION_STEP_MIN } minutes (${ Math.round((used / 60) * 10) / 10 }h of ${ capMin / 60 }h used today${ r.day_minutes_remaining != null ? `, ${ r.day_minutes_remaining } min left today` : '' })`;
                                            return (
                                                <div key={ r.checkin_id || r.worker_id } className="mc-ci-row">
                                                    <span>{ r.worker_name }</span>
                                                    <span className="mono">{ r.reference_id || '—' }</span>
                                                    <span className="mono" title={ r.checked_in_at || undefined }>{ utcToLocalClock(r.checked_in_at) || '—' }</span>
                                                    <span className={ `left${ capped ? ' cap' : left <= 10 ? ' low' : '' }` } title={ r.valid_until ? `${ translation('key_wkr_left') } ${ utcToLocalClock(r.valid_until) }` : undefined }>{ left } min{ capped ? ` · ${ capMin / 60 }h cap` : '' }</span>
                                                    <span className="mc-ci-acts">
                                                        <button type="button" className="mc-ci-btn mc-ci-btn-sm" title={ extendTip } aria-label={ extendTip } disabled={ capped } onClick={ () => extend(r) }>{ translation('key_wkr_extend') }</button>
                                                        <button type="button" className="mc-ci-btn mc-ci-btn-sm" title={ `Check this worker out of ${ branch.name }` } onClick={ () => checkOut(r) }>{ translation('key_wkr_check_out') }</button>
                                                    </span>
                                                </div>
                                            );
                                        }) }
                                    </>
                                ) }
                            </div>
                        </>
                    ) }
                </div>
            </div>
        </div>
    );
};

CheckInDrawer.propTypes = {
    locations: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
        name: PropTypes.string.isRequired,
        isMacau: PropTypes.bool,
        checkinCount: PropTypes.number,
    })).isRequired,
    onClose: PropTypes.func.isRequired,
    onChanged: PropTypes.func,
};

export default CheckInDrawer;
