import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import Icon from "../../../../components/Icon/Icon";
import constData from "../../../../components/ReusableComponents/constants";
import { fetchProcessingRemarks } from "../../../../redux/Slices/remarks/RemarkSlice";
import { getSourceTasksAPI } from "../../../../services/calendar";
import { getConversactionsHistory } from "../../../../services/chat";
import { hasAnyModulePermission, isAdminUser } from "../../../../services/commonService";
import { CAL_TASK_SOURCE } from "../../Calendar/newui/calendarConstants";
import { SEND_SITE } from "../../SettingsPage/newui/templates/templateConfiguration";
import translation from "../../../../utils/translation";
import { toTitleCase } from "../../../../utils/utils";
import { statusKeyOf } from "./contractRecordUtils";
import { CD_STATUS_LABEL_KEYS } from "../contractConstants";
import StageSendTemplate from "../../../../components/Processing/newui/StageSendTemplate";

const FollowUpSheet = lazy(() => import("../../../../components/follow-up/FollowUpSheet"));
const ContractRemarksDrawer = lazy(() => import("./ContractRemarksDrawer"));
const ContractChatHistoryDrawer = lazy(() => import("./ContractChatHistoryDrawer"));

/**
 * Contract record → Context panel: Remarks · Follow Up · Chat History (prototype rail cards — the whole card is the
 * button), each shown only with its own owner / non-owner toggle (`access`). Same data as the Processing screen:
 *   Remarks      — the card (count · latest remark / "No remarks yet") opens the Remarks drawer (ContractRemarksDrawer:
 *                  /get-processing-remarks-list, save, delete); adding needs the processing remarks permission
 *   Follow Up    — FollowUpSheet on source { contract, id }: GET /hrms/task/list?source_type=contract&source_id=…;
 *                  an arrival (?followup=<task>[&send=1]) opens the pane on that task and, with Stage Actions — Send
 *                  Template, the Contract stage Send Template modal (U-0013; prototype v29ApplyFollowup / v29Fusend)
 *   Chat History — the card (count = the worker's conversations) opens the Chat History drawer (the shared panel)
 */
const Row = ({ title, count, sub, onOpen, testId }) => {
    const key = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } };
    return (
        <div className="mcdt-card mcdt-rail act" role="button" tabIndex={ 0 } onClick={ onOpen } onKeyDown={ key } data-rail-card={ testId }>
            <div className="rh">
                <span className="rt">{ title }</span>{ count != null && <span className="rc">{ count }</span> }
                <span className="rv" aria-hidden="true"><Icon name="chev_right" size={ 12 } strokeWidth={ 1.6 } /></span>
            </div>
            { sub && <div className="rs">{ sub }</div> }
        </div>
    );
};
Row.propTypes = { title: PropTypes.string, count: PropTypes.number, sub: PropTypes.node, onOpen: PropTypes.func.isRequired, testId: PropTypes.string };

const ContextPanelSections = ({ contractId, row, contractDetails, access, followUpOpen = false, onFollowUpOpen, arrival = null, canSendTemplate = false }) => {
    const dispatch = useDispatch();
    const { processingRemarks } = useSelector((s) => s.remarks || {}, shallowEqual);
    const { permissionList } = useSelector((s) => s.users || {}, shallowEqual);
    const [remarksOpen, setRemarksOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [remarksLoaded, setRemarksLoaded] = useState(false);   /* the list in the store is this record's */
    const [followCount, setFollowCount] = useState(null);
    const [chatCount, setChatCount] = useState(null);
    const [denied, setDenied] = useState(false);
    /* the Contract stage Send Template modal, by its send site: X-07 from the rail's Follow Up, X-08 on a Calendar task arrival */
    const [sendSite, setSendSite] = useState(null);
    /* the remarks API's own gate (save / list need the processing remarks permission) */
    const canAddRemark = isAdminUser() || hasAnyModulePermission(permissionList?.data, constData.REMARKS_PERMISSION_KEYS.processing);
    /* "Update else's Remarks" (processing owner / non-owner key): Edit / Delete on other authors' remarks — the only non-author path */
    const canUpdateOthersRemarks = isAdminUser() || hasAnyModulePermission(permissionList?.data, constData.REMARKS_UPDATE_ELSE_PERMISSION_KEYS.processing);

    useEffect(() => {
        let alive = true;
        setRemarksLoaded(false);
        if (access.remarks) Promise.resolve(dispatch(fetchProcessingRemarks({ contract_id: Number(contractId) }))).then((res) => { if (alive && !res?.error) setRemarksLoaded(true); });
        return () => { alive = false; };
    }, [dispatch, contractId, access.remarks]);
    const loadFollowCount = useCallback(() => {
        if (!access.followUp) return;
        getSourceTasksAPI({ source_type: CAL_TASK_SOURCE.CONTRACT, source_id: Number(contractId) })
            .then((res) => { const d = res?.data?.data; const list = Array.isArray(d) ? d : (d?.data || d?.tasks || []); setFollowCount(list.filter((t) => Number(t.status) !== 0).length); })
            .catch(() => setFollowCount(null));
    }, [contractId, access.followUp]);
    useEffect(() => { loadFollowCount(); }, [loadFollowCount]);
    /* prototype rowHead('Chat History', n): the count is always shown — 0 without a worker account or conversations */
    useEffect(() => {
        let alive = true;
        if (!access.chatHistory) return undefined;
        if (!row?.worker_user_id) { setChatCount(0); return undefined; }
        getConversactionsHistory({ limit: 10, page: 1, user_id: row.worker_user_id })
            /* CH-7: the API total (all of the worker's conversations); the page length only while the API sends none */
            .then((res) => { if (!alive) return; const total = res?.data?.total; const d = res?.data?.data; setChatCount(typeof total === "number" ? total : (Array.isArray(d) ? d.length : 0)); })
            .catch(() => { if (alive) setChatCount(null); });
        return () => { alive = false; };
    }, [row?.worker_user_id, access.chatHistory]);
    /* &send=1 on arrival: the modal opens over the pane when Send Template is granted (prototype v29ApplyFollowup) */
    useEffect(() => { if (arrival?.send && followUpOpen && canSendTemplate) setSendSite(SEND_SITE.CALENDAR_TASK); }, [arrival, followUpOpen, canSendTemplate]);

    const closeSheet = useCallback(() => { onFollowUpOpen?.(false); setDenied(false); loadFollowCount(); }, [onFollowUpOpen, loadFollowCount]);
    const onCountStable = useCallback((n) => setFollowCount(n), []);
    const onDeniedStable = useCallback(() => setDenied(true), []);
    const closeRemarks = useCallback(() => setRemarksOpen(false), []);
    const closeChat = useCallback(() => setChatOpen(false), []);
    const openSend = useCallback(() => setSendSite(SEND_SITE.CONTRACT_RAIL), []);
    const closeSend = useCallback(() => setSendSite(null), []);
    const remarksCount = remarksLoaded && Array.isArray(processingRemarks) ? processingRemarks.length : null;
    /* the card's second line: "No remarks yet" or the latest remark, two lines at most */
    const latest = useMemo(() => (remarksLoaded && Array.isArray(processingRemarks) && processingRemarks.length ? [...processingRemarks].sort((a, b) => Number(b.id) - Number(a.id))[0] : null), [processingRemarks, remarksLoaded]);
    const remarksSub = remarksCount === 0 ? translation("key_cr_no_remarks_yet") : (latest?.remarks ? <span className="prev">{ latest.remarks }</span> : null);
    const reference = row?.worker_code || row?.contract_number || "";
    const source = useMemo(() => ({
        /* the record's reference as the page header shows it, the contract number as a fallback */
        type: CAL_TASK_SOURCE.CONTRACT, id: Number(contractId), ref: reference, sub: [row?.worker_name, row?.employer_name].filter(Boolean).join(" · "),
        kindLabel: translation("key_contract"), facts: { worker_name: row?.worker_name || null, employer_name: row?.employer_name || null }, from: "contract",
        /* prototype task-editor sourceHTML (src.contract): "<ref> · <status>" · Employer · Worker <code> */
        contract: { ref: reference, status: translation(CD_STATUS_LABEL_KEYS[statusKeyOf(row?.contract_status)]), employer: [row?.employer_name, row?.employer_chinese_name].filter(Boolean).join(" · "), worker: row?.worker_name || "", wcode: row?.worker_code || "" },
    }), [contractId, row, reference]);

    /* the Contract Send Template modal under this composer's site; no fixed category — the sender chooses among the site's
       hand-sent categories (package X-07 / X-08: "neutral eligible template selection") */
    const composerNode = sendSite && <StageSendTemplate contractDetails={ contractDetails } site={ sendSite } onClose={ closeSend } />;

    /* prototype v29FuOpen: the Follow Up pane replaces the whole rail body */
    if (followUpOpen && access.followUp) {
        return (
            <div className="mcdt-fupane">
                <Suspense fallback={ null }>
                    <FollowUpSheet inline source={ source } initialTaskId={ arrival?.taskId || null } onClose={ closeSheet } onCount={ onCountStable } onDenied={ onDeniedStable } onSendTemplate={ canSendTemplate ? openSend : undefined } />
                    { denied && <div className="mcdt-fu-note">{ translation("key_cr_follow_up_unavailable") }</div> }
                </Suspense>
                { composerNode }
            </div>
        );
    }

    return (
        <>
            { access.remarks && <Row title={ translation("key_remarks") } count={ remarksCount } sub={ remarksSub } onOpen={ () => setRemarksOpen(true) } testId="remarks" /> }
            { access.followUp && <Row title={ toTitleCase(translation("key_follow_up")) } count={ followCount } onOpen={ () => onFollowUpOpen?.(true) } testId="follow-up" /> }
            { access.chatHistory && <Row title={ translation("key_chat_history") } count={ chatCount } onOpen={ () => setChatOpen(true) } testId="chat-history" /> }
            { remarksOpen && (
                <Suspense fallback={ null }>
                    <ContractRemarksDrawer contractId={ contractId } row={ row } canAdd={ canAddRemark } canUpdateOthers={ canUpdateOthersRemarks } loaded={ remarksLoaded } onClose={ closeRemarks } onChanged={ () => setRemarksLoaded(true) } />
                </Suspense>
            ) }
            { chatOpen && (
                <Suspense fallback={ null }>
                    <ContractChatHistoryDrawer row={ row } onClose={ closeChat } />
                </Suspense>
            ) }
            { composerNode }
        </>
    );
};

ContextPanelSections.propTypes = {
    contractId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    row: PropTypes.object,
    contractDetails: PropTypes.object,
    access: PropTypes.shape({ remarks: PropTypes.bool, followUp: PropTypes.bool, chatHistory: PropTypes.bool }).isRequired,
    followUpOpen: PropTypes.bool,
    onFollowUpOpen: PropTypes.func,
    /* ?followup=<task>[&send=1] arrival: { taskId, send } */
    arrival: PropTypes.shape({ taskId: PropTypes.string, send: PropTypes.bool }),
    /* Stage Actions — Send Template in this record's owner / non-owner context */
    canSendTemplate: PropTypes.bool,
};

export default ContextPanelSections;
