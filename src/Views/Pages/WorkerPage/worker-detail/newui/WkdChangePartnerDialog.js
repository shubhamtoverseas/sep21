import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import Modal from "../../../../../components/ui/Modal";
import Btn from "../../../../../components/ui/Btn";
import { Field, TextInput } from "../../../../../components/ui/FormControls";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import translation from "../../../../../utils/translation";
import { headingCase } from "../../../../../utils/utils";
import { fetchMappingAgencies } from "../../../../../redux/Slices/settings/agencies/AgenciesSlice";
import { searchPartnerStaff } from "../../../../../redux/Slices/common/cs/CsSlice";
import { saveAssignPTWorker } from "../../../../../redux/Slices/worker/WorkerSlice";
import { ASSIGN_PT_PAYLOAD, PARTNER_BRANCHES_QUERY, PARTNER_STAFF_QUERY_TYPE, WKD_OWNER_SEARCH_DEBOUNCE_MS } from "../../workerModuleConstants";
import { hasPartnerInquiry, sendPartnerAssignedMessage } from "./partnerInquiry";
import "./wkd-dialogs.css";

const WkdPartnerInquiryDialog = lazy(() => import("./WkdPartnerInquiryDialog"));

/**
 * Change Partner from the record header (prototype Worker_Details.html reassign-confirm for the partner owner; WORKER §16.3 /
 * U-0203): two picks in one dialog — the partner branch (active branches eligible for this worker, a typed PT code narrows
 * them), then the PT at that branch — and the action. Logic as the Assign Partner section (same APIs, same payload):
 * `saveAssignPTWorker { pt_staff_id, worker_id, pt_staff_agency_id, pt_staff_branch_id }`; a successful assignment tells the
 * worker in-app (category 65, ruling A). The pre-assignment inquiry (the approved WhatsApp template to the proposed PT,
 * Filipino / Indonesian only, with the journey's Assign Partner — Send Template grant — §16.15, P-77, ST-04 / ST-06, ruling
 * Q5) is its own button and never assigns. Chat opens the record's chat with the picked PT. The record is re-read by the
 * caller (`onChanged`).
 */
const Pick = ({ on, disabled, label, em, onPick }) => (
    <button type="button" className={ `ctx-pick${ on ? " on" : "" }` } role="radio" aria-checked={ on } aria-disabled={ disabled ? "true" : undefined } onClick={ () => { if (!disabled) onPick(); } }>
        <span className="ctx-pick-dot" aria-hidden="true" /><span className="lbl">{ label }</span>{ em ? <em>{ em }</em> : null }
    </button>
);
Pick.propTypes = { on: PropTypes.bool, disabled: PropTypes.bool, label: PropTypes.node, em: PropTypes.node, onPick: PropTypes.func };

const STEP = Object.freeze({ BRANCH: "branch", STAFF: "staff" });

const WkdChangePartnerDialog = ({ worker, onClose, onChanged, onOpenChat }) => {
    const dispatch = useDispatch();
    const title = translation("key_change_partner");
    const [step, setStep] = useState(STEP.BRANCH);
    const [query, setQuery] = useState("");
    const [agencies, setAgencies] = useState(null);     /* the server's branches — null while loading */
    const [branch, setBranch] = useState(null);         /* { agencyId, agencyName, code, branchId, branchName, branchCode } */
    const [staff, setStaff] = useState(null);           /* the branch's PTs — null while loading */
    const [pt, setPt] = useState(null);
    const [busy, setBusy] = useState(false);
    const [inquiryOpen, setInquiryOpen] = useState(false);
    const [inquiredPt, setInquiredPt] = useState(null);  /* the PT already sent an inquiry from this dialog (one send per PT) */
    const requestSeq = useRef(0);

    /* the eligible partner branches (same query as the Assign Partner section); the PT code search narrows them */
    useEffect(() => {
        if (step !== STEP.BRANCH) return undefined;
        const seq = ++requestSeq.current;
        const timer = setTimeout(() => {
            dispatch(fetchMappingAgencies({ ...PARTNER_BRANCHES_QUERY, worker_id: worker?.worker_id, ...(query.trim() ? { search_text: query.trim() } : {}) })).then((res) => {
                if (seq !== requestSeq.current) return;
                setAgencies(Array.isArray(res?.payload) ? res.payload : []);
            });
        }, query ? WKD_OWNER_SEARCH_DEBOUNCE_MS : 0);
        return () => clearTimeout(timer);
    }, [dispatch, step, worker?.worker_id, query]);

    const branchPicks = useMemo(() => (agencies || []).flatMap((agency) => (agency?.branch_list || []).map((b) => ({
        key: `${ agency.id }-${ b.id }`, agencyId: agency.id, agencyName: agency.name, code: agency.code,
        branchId: b.id, branchName: b.branch_name, branchCode: b.branch_code,
    }))), [agencies]);

    const toStaff = useCallback(() => {
        if (!branch) return;
        setStaff(null); setPt(null); setStep(STEP.STAFF);
        dispatch(searchPartnerStaff({ type: PARTNER_STAFF_QUERY_TYPE, branch_id: branch.branchId })).then((res) => {
            const rows = res?.payload?.data;
            setStaff(Array.isArray(rows) ? rows : []);
        });
    }, [dispatch, branch]);
    const back = useCallback(() => { setStep(STEP.BRANCH); setStaff(null); setPt(null); }, []);
    const selectedPt = (staff || []).find((s) => String(s.id) === String(pt)) || null;

    const assign = useCallback(() => {
        if (!branch || !selectedPt || busy) return;
        setBusy(true);
        dispatch(saveAssignPTWorker({
            [ASSIGN_PT_PAYLOAD.STAFF]: selectedPt.id, [ASSIGN_PT_PAYLOAD.WORKER]: worker?.worker_id,
            [ASSIGN_PT_PAYLOAD.AGENCY]: branch.agencyId, [ASSIGN_PT_PAYLOAD.BRANCH]: branch.branchId,
        })).then((res) => {
            setBusy(false);
            if (res?.payload?.status) {
                ShowToast("success", res?.payload?.message);
                /* the actual assignment: the worker is told in-app (category 65, ruling A) */
                sendPartnerAssignedMessage(dispatch, { workerUserId: worker?.user_id, workerName: worker?.name, senderUserId: worker?.onboarding2_user_id });
                onChanged?.();
                onClose();
            } else {
                ShowToast("error", res?.payload?.message);
            }
        });
    }, [dispatch, branch, selectedPt, busy, worker?.worker_id, worker?.user_id, worker?.name, worker?.onboarding2_user_id, onChanged, onClose]);

    const canInquire = Boolean(selectedPt?.whatsapp_country_code && selectedPt?.whatsapp) && hasPartnerInquiry(worker?.nationality_id)
        && Boolean(worker?.canSendPartnerInquiry) && String(inquiredPt) !== String(selectedPt?.id);
    const currentPartner = [worker?.partner_agency, worker?.partner_branch].filter(Boolean).join(" · ");
    const footer = step === STEP.BRANCH ? (
        <>
            <span className="grow" />
            <Btn variant="secondary" type="button" onClick={ onClose }>{ translation("key_cancel") }</Btn>
            <Btn variant="primary" type="button" disabled={ !branch } onClick={ toStaff }>{ translation("key_next_select_agent") }</Btn>
        </>
    ) : (
        <>
            <Btn variant="secondary" type="button" disabled={ busy } onClick={ back }>{ translation("key_back") }</Btn>
            <span className="grow" />
            { selectedPt && onOpenChat && <Btn variant="secondary" type="button" disabled={ busy } onClick={ () => { onOpenChat(selectedPt); onClose(); } }>{ translation("key_chat") }</Btn> }
            { canInquire && <Btn variant="secondary" type="button" disabled={ busy } onClick={ () => setInquiryOpen(true) }>{ translation("key_wkr_send_inquiry") }</Btn> }
            <Btn variant="primary" type="button" disabled={ !selectedPt || busy } onClick={ assign }>{ busy ? `${ translation("key_loading") }…` : title }</Btn>
        </>
    );

    return (
        <>
            <Modal title={ headingCase(title) } width={ 560 } onClose={ onClose } closeLabel={ translation("key_close") } busy={ busy } className="wkd-dlg" footer={ footer }>
                { step === STEP.BRANCH ? (
                    <>
                        <p className="intro">
                            { [worker?.name, worker?.type, worker?.nationality].filter(Boolean).join(" · ") }. { translation("key_current") } { translation("key_partner").toLowerCase() }: <b>{ currentPartner || translation("key_not_assigned") }</b>.
                        </p>
                        <Field label={ translation("key_search_pt_code") } htmlFor="wkd-cp-search" className="wkd-dlg-search">
                            <TextInput id="wkd-cp-search" type="search" value={ query } autoComplete="off" onChange={ (e) => setQuery(e.target.value) } />
                        </Field>
                        { agencies === null && <div className="ctx-empty">{ translation("key_loading") }…</div> }
                        { agencies !== null && branchPicks.length === 0 && <div className="ctx-empty">{ translation("key_no_results_found") }</div> }
                        { branchPicks.length > 0 && (
                            <div className="ctx-picks" role="radiogroup" aria-label={ translation("key_select_branch") }>
                                { branchPicks.map((b) => (
                                    <Pick key={ b.key } on={ branch?.key === b.key } label={ `${ b.agencyName } · ${ b.branchName }${ b.branchCode ? ` (${ b.branchCode })` : "" }` } em={ b.code } onPick={ () => setBranch(b) } />
                                )) }
                            </div>
                        ) }
                    </>
                ) : (
                    <>
                        <p className="intro">
                            { translation("key_assign_agent_from") } <b>{ branch.agencyName } ({ branch.code })</b> · { translation("key_branch") } <b>{ branch.branchName }{ branch.branchCode ? ` (${ branch.branchCode })` : "" }</b>.
                        </p>
                        { staff === null && <div className="ctx-empty">{ translation("key_loading") }…</div> }
                        { staff !== null && staff.length === 0 && <div className="ctx-empty">{ translation("key_no_results_found") }</div> }
                        { staff !== null && staff.length > 0 && (
                            <div className="ctx-picks" role="radiogroup" aria-label={ translation("key_pt") }>
                                { staff.map((s) => (
                                    <Pick key={ String(s.id) } on={ String(pt) === String(s.id) } disabled={ busy } label={ [s.name, s.email].filter(Boolean).join(" · ") }
                                        em={ `${ s.worker_count ?? 0 } ${ translation("key_workers").toLowerCase() }` } onPick={ () => setPt(s.id) } />
                                )) }
                            </div>
                        ) }
                        { currentPartner && <p className="note">{ translation("key_wkr_confirming_versions_the_relationship_and_issues_") }</p> }
                    </>
                ) }
            </Modal>
            { inquiryOpen && selectedPt && (
                <Suspense fallback={ null }>
                    <WkdPartnerInquiryDialog
                        pt={ selectedPt }
                        agencyName={ branch?.agencyName }
                        branchName={ branch?.branchName }
                        worker={ { name: worker?.name, nationality: worker?.nationality, code: worker?.reference_id } }
                        onClose={ () => setInquiryOpen(false) }
                        onSent={ () => { setInquiryOpen(false); setInquiredPt(selectedPt.id); } }
                    />
                </Suspense>
            ) }
        </>
    );
};

WkdChangePartnerDialog.propTypes = {
    /* the header's worker (WorkerDetail currentWorker): worker_id, user_id, name, type, nationality, nationality_id, reference_id,
       partner_agency / partner_branch, onboarding2_user_id, canSendPartnerInquiry */
    worker: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onChanged: PropTypes.func,
    /* opens the record's chat with the picked PT (WorkerDetail handleOpenChatPT) */
    onOpenChat: PropTypes.func,
};

export default WkdChangePartnerDialog;
