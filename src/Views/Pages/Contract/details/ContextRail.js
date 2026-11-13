import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import Icon from "../../../../components/Icon/Icon";
import Btn from "../../../../components/ui/Btn";
import DateInput from "../../../../components/ui/DateInput";
import translation from "../../../../utils/translation";
import routes from "../../routes/routesConfig";
import { updateProcessingDetails } from "../../../../redux/Slices/processing/ProcessingSlice";
import { showSuccessOrError } from "../../../../services/commonService";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { FU_COPY_KEY } from "../../Calendar/newui/calendarConstants";
import ContextPanelSections from "./ContextPanelSections";
import EmployerContactDialog from "./EmployerContactDialog";
import { Avatar } from "./OwnersPill";
import { EM_DASH, dateOrDash, delayLabel, delayOf, isoOf, money } from "./contractRecordUtils";
import { invoiceRecordPath } from "../../Invoice/invoiceRecordPath";
import { CR_FOLLOW_UP_QUERY, CR_FOLLOW_UP_SEND_ON, CR_OWNER_ROLE, CR_RAIL } from "../contractConstants";
import { recordEditRules } from "./recordEditRules";

const GcMiniChat = lazy(() => import("../../Conversaction/newui/GcMiniChat"));

/* Chat segment (prototype railChatHTML / chatThreadHTML): the parties with a permitted conversation, then the scoped thread in the
   rail (the Global Chat mini thread — channel pills, timeline, composer) behind a back row. Partner (K-20): the worker's partner
   agency chat user from the record (`partner`, `can.partner_chat`) — `friend_type: partner` on the conversation */
const ChatParties = ({ row, contractDetails, permissions }) => {
    const [chat, setChat] = useState(null);
    const d = contractDetails || {};
    const parties = [];
    if (permissions?.isViewEmpChatPermission && (d.employer_user_id || row.employer_id)) {
        parties.push({ key: "employer", name: row.employer_name, zh: row.employer_chinese_name, role: translation("key_employer"), tint: CR_OWNER_ROLE.CS,
            info: { employer_name: row.employer_name, employer_user_id: d.employer_user_id, user_type: "employer", employer_id: row.employer_id, conversation_sid: "", whatsapp_number: (d.employer_whatsapp_country_code || "") + (d.employer_whatsapp_number || "") } });
    }
    if (permissions?.isViewWorkerChatPermission && row.worker_user_id) {
        parties.push({ key: "worker", name: row.worker_name, role: translation("key_worker"), tint: CR_OWNER_ROLE.PREPARED,
            info: { worker_name: row.worker_name, worker_user_id: row.worker_user_id, user_type: "worker", worker_id: row.worker_id, conversation_sid: "", whatsapp_number: (d.whatsapp_country_code || "") + (d.whatsapp_number || "") } });
    }
    if (d.can?.partner_chat && d.partner?.chat_user?.user_id) {
        const pu = d.partner.chat_user;
        parties.push({ key: "partner", name: d.partner.agency?.name || pu.name || "", zh: d.partner.agency?.name && pu.name ? pu.name : "", role: translation("key_partner"), tint: CR_OWNER_ROLE.READY, inactive: pu.active === false,
            info: { name: pu.name || d.partner.agency?.name || "", user_id: pu.user_id, cs_owner_id: pu.staff_id, conversation_sid: "", whatsapp_number: "" } });
    }
    if (chat) {
        return (
            <div className="mcdt-railchat">
                <div className="mcdt-chathead">
                    <button type="button" className="mcdt-chatback" onClick={ () => setChat(null) } aria-label={ translation("key_back") }>
                        <Icon name="chev_left" size={ 14 } strokeWidth={ 1.8 } /><span className="nm">{ chat.name }</span>
                    </button>
                    <Link className="mcdt-gclink" to={ routes.chat }>{ translation("key_global_chat") }</Link>
                </div>
                <Suspense fallback={ null }><GcMiniChat rail entityDetails={ chat.info } user_type={ chat.key } /></Suspense>
            </div>
        );
    }
    return (
        <div className="mcdt-chatlist">
            { parties.length === 0 && <div className="mcdt-card mcdt-note">{ translation("key_cr_no_chat_available") }</div> }
            { parties.map((p) => (
                <button key={ p.key } type="button" className="mcdt-card mcdt-chatrow" onClick={ () => setChat(p) }>
                    <Avatar name={ p.name } role={ p.tint } size="lg" />
                    <div className="b"><div className="nm">{ p.name }{ p.zh ? ` · ${ p.zh }` : "" }{ p.inactive && <span className="inactive"> · { translation("key_inactive") }</span> }</div><div className="rl">{ p.role }</div></div>
                    <Icon name="msg" size={ 14 } strokeWidth={ 1.5 } />
                </button>
            )) }
        </div>
    );
};
ChatParties.propTypes = { row: PropTypes.object.isRequired, contractDetails: PropTypes.object, permissions: PropTypes.object };

/**
 * The context rail (prototype railHTML): Context · Chat segments (Chat only with a permitted conversation); Employer
 * card (the employer code opens Employer Details when permitted), Requested Start Date (editable with Stage Actions
 * Edit) and the Delay card, then Remarks · Follow Up · Chat History. The Follow Up pane replaces the rail body.
 */
const ContextRail = ({ contractId, row, contractDetails, permissions, railAccess, canOpenEmployer, editOpen = false, onRailEdit, onChanged }) => {
    const dispatch = useDispatch();
    const [segment, setSegment] = useState(CR_RAIL.CONTEXT);
    const [reqEdit, setReqEdit] = useState(null);           /* Requested Start Date draft (ISO) while editing */
    const [followUpOpen, setFollowUpOpen] = useState(false);
    const [contactEdit, setContactEdit] = useState(false);     /* Employer Contact Details · Edit (K-14) */
    const [arrival, setArrival] = useState(null);          /* { taskId, send } from ?followup=<task>[&send=1], once per arrival */
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();
    const arrivalKeyRef = useRef(null);
    const canSendTemplate = Boolean(permissions?.stageActionPermissions?.includes("send_template"));
    /* prototype v29ApplyFollowup: the routed Follow Up lands on the Context pane, on its task; without the Follow Up grant the
       neutral notice (RecordFollowUp) and the record stays as it is */
    const taskParam = searchParams.get(CR_FOLLOW_UP_QUERY.TASK);
    const sendParam = searchParams.get(CR_FOLLOW_UP_QUERY.SEND) === CR_FOLLOW_UP_SEND_ON;
    useEffect(() => {
        if (!taskParam || arrivalKeyRef.current === location.key) return;
        arrivalKeyRef.current = location.key;
        /* consumed once: the address loses the arrival keys, so a later in-record navigation (Documents open / close) does not replay it */
        const next = new URLSearchParams(searchParams); next.delete(CR_FOLLOW_UP_QUERY.TASK); next.delete(CR_FOLLOW_UP_QUERY.SEND);
        setSearchParams(next, { replace: true, state: location.state });
        if (!railAccess.followUp) { ShowToast("error", `${ translation(FU_COPY_KEY.notAvailableTitle) } · ${ translation(FU_COPY_KEY.notAvailable) }`); return; }
        setSegment(CR_RAIL.CONTEXT);
        setArrival({ taskId: taskParam, send: sendParam });
        setFollowUpOpen(true);
    }, [taskParam, sendParam, location.key, location.state, railAccess.followUp, searchParams, setSearchParams]);
    const anyChat = Boolean(permissions?.isViewEmpChatPermission || permissions?.isViewWorkerChatPermission || (contractDetails?.can?.partner_chat && contractDetails?.partner?.chat_user?.user_id));
    const showChat = anyChat && segment === CR_RAIL.CHAT;
    const delay = delayOf(row);
    /* the Edit record dialog and this inline editor are two entry points to one field, never two states at once (B14-24) */
    useEffect(() => { if (editOpen) setReqEdit(null); }, [editOpen]);
    /* the pencil: Stage Actions `edit` and a status where Requested Start may still change (Processing / Active) */
    const canPencil = Boolean(permissions?.isEditContractPermission) && recordEditRules(row?.contract_status).requestedEditable;
    /* PROCESS §3.3.1 tiles (U-0278; K-15): Expected Start is the projection of the recorded start; Invoice Balance and the invoice link come
       from the record (`can_view_invoice`, `invoice_balance` null = em dash, `invoice` only when permitted) */
    const expectedStart = row?.expected_start_date || row?.requested_start_date || null;
    const canViewInvoice = (contractDetails?.can_view_invoice ?? row?.can_view_invoice) !== false;
    const invoiceBalance = canViewInvoice ? (contractDetails?.invoice_balance ?? row?.invoice_balance ?? null) : null;
    const invoiceLink = canViewInvoice && contractDetails?.invoice?.id ? contractDetails.invoice : null;
    /* PERM §6.7 Employer Contact Details (K-14): the record composes the grant; the permission CSV until a record carries `can` */
    const canViewContact = contractDetails?.can?.employer_contact_view ?? Boolean(permissions?.canViewEmployerContact);
    const canEditContact = canViewContact && (contractDetails?.can?.employer_contact_edit ?? Boolean(permissions?.canEditEmployerContact)) && Boolean(contractDetails?.employer_id);
    const employerLink = canOpenEmployer && row.employer_id ? routes.employerDetails.replace(":employer_id", row.employer_id) : null;

    const saveRequestedStart = useCallback(() => {
        /* /processing-details-update writes both dates: the recorded Expected Start Date goes back unchanged */
        const expected = row?.expected_start_date ? isoOf(row.expected_start_date) : null;
        dispatch(updateProcessingDetails({ contract_id: Number(contractId), requested_start_date: reqEdit || null, ...(row && "expected_start_date" in row ? { expected_start_date: expected } : {}) }))
            .then((res) => { showSuccessOrError(res); if (!res.error) { setReqEdit(null); onChanged(); } });
    }, [dispatch, contractId, reqEdit, row, onChanged]);

    return (
        <aside className="mcdt-side" data-mc-context-rail="" aria-label={ translation("key_context") }>
            <div className="seg">
                <button type="button" className={ !showChat ? "on" : "" } onClick={ () => setSegment(CR_RAIL.CONTEXT) }>{ translation("key_context") }</button>
                { anyChat && <button type="button" className={ showChat ? "on" : "" } onClick={ () => setSegment(CR_RAIL.CHAT) }>{ translation("key_chat") }</button> }
            </div>
            <div className="body">
                { showChat ? <ChatParties row={ row } contractDetails={ contractDetails } permissions={ permissions } /> : (
                    <>
                        { !followUpOpen && (
                            <>
                                <div className="mcdt-card">
                                    <div className="lbl">{ translation("key_employer") }</div>
                                    <div className="val">{ row.employer_name }{ row.employer_chinese_name && ` · ${ row.employer_chinese_name }` }</div>
                                    { row.employer_reference_id && (
                                        <div className="ref">{ employerLink ? <Link to={ employerLink }>{ row.employer_reference_id }</Link> : <span className="plain">{ row.employer_reference_id }</span> }</div>
                                    ) }
                                    { /* PERM §6.7 Employer Contact Details — View (U-0276) · Edit through update-contact-details on the contract ladder (K-14) */ }
                                    { canViewContact && (canEditContact || contractDetails?.employer_mobile_number || contractDetails?.employer_email || contractDetails?.employer_whatsapp_number) && (
                                        <div className="mcdt-contact" data-employer-contact="">
                                            { canEditContact && (
                                                <div className="hd"><span className="lbl">{ translation("key_employer_contact_details") }</span>
                                                    <button type="button" className="ctx-icon-btn" aria-label={ translation("key_edit") } title={ translation("key_edit") } onClick={ () => setContactEdit(true) }><Icon name="edit" size={ 12 } strokeWidth={ 1.5 } /></button>
                                                </div>
                                            ) }
                                            { contractDetails?.employer_mobile_number && <div><span className="lbl">{ translation("key_mobile_number") }</span><span className="mono">{ (contractDetails.employer_country_code || "") + contractDetails.employer_mobile_number }</span></div> }
                                            { contractDetails?.employer_whatsapp_number && <div><span className="lbl">{ translation("key_whatsapp_number") }</span><span className="mono">{ (contractDetails.employer_whatsapp_country_code || "") + contractDetails.employer_whatsapp_number }</span></div> }
                                            { contractDetails?.employer_email && <div><span className="lbl">{ translation("key_email") }</span><span className="mono">{ contractDetails.employer_email }</span></div> }
                                        </div>
                                    ) }
                                </div>
                                <div className="mcdt-two">
                                    <div className="mcdt-card tint-green" data-expected-start="">
                                        <div className="lbl"><Icon name="calendar" size={ 12 } strokeWidth={ 1.6 } /> { translation("key_expected_start_date") }</div>
                                        <div className={ `val${ expectedStart ? "" : " empty" }` }>{ dateOrDash(expectedStart) }</div>
                                    </div>
                                    <div className="mcdt-card tint-blue" data-invoice-balance="">
                                        <div className="lbl"><Icon name="receipt" size={ 12 } strokeWidth={ 1.6 } /> { translation("key_invoice_balance") }</div>
                                        <div className={ `val${ invoiceBalance != null && invoiceBalance !== "" ? "" : " empty" }` }>{ invoiceBalance != null && invoiceBalance !== "" ? money(invoiceBalance) : EM_DASH }</div>
                                        { invoiceLink && <div className="ref"><Link to={ invoiceRecordPath(invoiceLink.invoice_number || invoiceLink.id) }>{ invoiceLink.invoice_number || invoiceLink.id }</Link></div> }
                                    </div>
                                </div>
                                <div className="mcdt-two">
                                    <div className="mcdt-card" data-req-start="">
                                        <div className="lbl">{ translation("key_requested_start_date") }</div>
                                        { reqEdit !== null ? (
                                            <div className="mcdt-reqedit">
                                                <DateInput id="cr-req-start" name="cr-req-start" value={ reqEdit } onChange={ setReqEdit } />
                                                <div className="bt">
                                                    <Btn variant="secondary" onClick={ () => setReqEdit(null) }>{ translation("key_cancel") }</Btn>
                                                    <Btn variant="primary" onClick={ saveRequestedStart }>{ translation("key_save") }</Btn>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="mcdt-reqrow">
                                                <span className={ `val${ row.requested_start_date ? "" : " empty" }` }>{ dateOrDash(row.requested_start_date) }</span>
                                                { canPencil && (
                                                    <button type="button" className="ctx-icon-btn" aria-label={ translation("key_cr_edit_requested_start") } onClick={ () => { onRailEdit?.(); setReqEdit(isoOf(row.requested_start_date)); } }>
                                                        <Icon name="edit" size={ 12 } strokeWidth={ 1.5 } />
                                                    </button>
                                                ) }
                                            </div>
                                        ) }
                                    </div>
                                    <div className={ `mcdt-card${ delay?.warn ? " warn" : "" }` } data-delay="">
                                        <div className="lbl">{ translation("key_delay") }</div>
                                        { (() => { const text = delayLabel(delay); return <div className={ `val${ delay ? "" : " empty" }${ text.length > 14 ? " small" : "" }` }>{ delay ? text : EM_DASH }</div>; })() }
                                    </div>
                                </div>
                            </>
                        ) }
                        <ContextPanelSections contractId={ contractId } row={ row } contractDetails={ contractDetails } access={ railAccess } followUpOpen={ followUpOpen } onFollowUpOpen={ setFollowUpOpen } arrival={ arrival } canSendTemplate={ canSendTemplate } />
                    </>
                ) }
            </div>
            { contactEdit && <EmployerContactDialog contractId={ contractId } contractDetails={ contractDetails } onClose={ () => setContactEdit(false) } onSaved={ onChanged } /> }
        </aside>
    );
};

ContextRail.propTypes = {
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    row: PropTypes.object.isRequired,
    contractDetails: PropTypes.object,
    permissions: PropTypes.object,
    railAccess: PropTypes.shape({ remarks: PropTypes.bool, followUp: PropTypes.bool, chatHistory: PropTypes.bool }).isRequired,
    canOpenEmployer: PropTypes.bool,
    /* the Edit record dialog is open: the inline editor closes (one state at a time) */
    editOpen: PropTypes.bool,
    /* the pencil opened the inline editor: the host closes the dialog */
    onRailEdit: PropTypes.func,
    onChanged: PropTypes.func.isRequired,
};

export default ContextRail;
