import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import { useTranslation } from "react-i18next";
import "./global-chat.css";
import GcIcon from "./gcIcons";
import GcConversationList from "./GcConversationList";
import GcThreadHeader from "./GcThreadHeader";
import GcMessagePanel from "./GcMessagePanel";
import translation from "../../../../utils/translation";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { dispatchWithHandling } from "../../../../utils/dispatchHandler";
import {
    getAccessToken, getWorkerPermissionAccess, getCurrentUser, isAdminUser,
} from "../../../../services/commonService";
import {
    setConversation, fetchMessageList, clearMessageList, clearMessages,
    updateChatUserInfo, fetchConversactionListAll, fetchConversactionListAllByTeam,
    fetchConversactionListAllByTeamScroll, saveTranslationLanguage, getLanguageTranslate,
    updateUnreadChatCount, setConversationCounts,
} from "../../../../redux/Slices/chat/ChatSlice";
import { fetchWorkerCommonDetailInfo, fetchWorkerJobOfferList } from "../../../../redux/Slices/worker/WorkerSlice";
import { fetchEmployerJobOffers, fetchEmployerDetail } from "../../../../redux/Slices/employer/EmployerSlice";
import { fetchJobDetail, fetchWorkerJobEncriptedID } from "../../../../redux/Slices/job-offer/JobOfferSlice";
import { getJobOfferPermissions } from "../../../../utils/permissions/jobPermissionsUtils";
import { showErrorMessage } from "../../../../services/commonService";
import { REACT_WORKER_VIEW_URL, REACT_JOB_VIEW_URL } from "../../../../services/apiPath";
import { getSocket } from "../../../../socket/socket";
import GcPanel from "./GcPanel";
import { GcConfirmModal } from "./GcModal";
import useGcInterviewActions from "./useGcInterviewActions";
import { groupConversations, gcWaWindowState, gcChatLanguage } from "./gcHelpers";
import { GC_COMPOSER_COPY, GC_LIST_LIMIT, GC_PANEL_COPY } from "./gcConstants";

const GcSendTemplateModal = React.lazy(() => import("./GcSendTemplateModal"));
const GcAddEditTemplateModal = React.lazy(() => import("./GcAddEditTemplateModal"));
const SendTemplateWhatsApp = React.lazy(() => import("../../../../components/Layout/popups/template-whatsapp/SendTemplatePopup"));
const GcScheduleInterview = React.lazy(() => import("./GcScheduleInterview"));
const InstantInterviewGenerated = React.lazy(() => import("../../../../components/popups/InstantInterviewGenerated"));
const GcInstantStatus = React.lazy(() => import("./GcInstantStatus"));
const GcInterviewReport = React.lazy(() => import("./GcInterviewReport"));

const LAZY_FALLBACK = <div className="gc-lazy-scrim"><span className="gc-lazy-spin" /></div>;

const GlobalChat = () => {
    const dispatch = useDispatch();
    const socket = getSocket();
    const { user_id } = useParams();
    const { i18n } = useTranslation();
    /* "Translated" shows the staff member's app language (top-bar EN / 中文), not a chat-only setting */
    const chatLanguage = gcChatLanguage(i18n.language);

    const {
        conversactionUserList, conversactionLoadingStatus, conversactionStatus,
        conversactionScrollStatus, chatLanguageInfo, ownerOnboardingList,
        permissionList, unreadChatCount, currentEmployer, workerProfileInfo,
        conversationCounts,
    } = useSelector((state) => ({
        conversactionUserList: state.chat.conversactionUserList,
        conversactionLoadingStatus: state.chat.conversactionLoadingStatus,
        conversactionStatus: state.chat.conversactionStatus,
        conversactionScrollStatus: state.chat.conversactionScrollStatus,
        chatLanguageInfo: state.chat.chatLanguageInfo,
        ownerOnboardingList: state.users.ownerOnboardingList,
        permissionList: state.users.permissionList,
        unreadChatCount: state.chat.unreadChatCount,
        conversationCounts: state.chat.conversationCounts,
        currentEmployer: state.employer.currentEmployer,
        workerProfileInfo: state.worker.workerProfileInfo,
    }), shallowEqual);

    const [rows, setRows] = useState([]);
    const [selectedKey, setSelectedKey] = useState(null);
    const [activeChannel, setActiveChannel] = useState("app");
    const [userDetailInfo, setUserDetailInfo] = useState({});
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [stakeFilter, setStakeFilter] = useState("");
    const [translateMode, setTranslateMode] = useState("original");
    const [isWorkerPermissionAccessInfo, setIsWorkerPermissionAccessInfo] = useState({});
    const [panelStack, setPanelStack] = useState([]);
    const [panelLoading, setPanelLoading] = useState(false);
    const [commonTemplateData, setCommonTemplateData] = useState({ slug: "", title: "", userType: "", action: "", statusKey: "", actionStatusType: "" });
    const [isSendTemplatePopup, setIsSendTemplatePopup] = useState(false);
    const [isAddEditTemplatePopup, setIsAddEditTemplatePopup] = useState(false);
    const [isWhatsAppTemplateOpen, setIsWhatsAppTemplateOpen] = useState(false);
    const [isAddEditTemplateFormActionType, setIsAddEditTemplateFormActionType] = useState("");
    const [currentTemplateData, setCurrentTemplateData] = useState(null);
    /* search in conversation (prototype Gap 14b): stays open across conversations until closed */
    const [threadSearch, setThreadSearch] = useState({ open: false, q: "" });

    const appendNextRef = useRef(false);
    const pageNoRef = useRef(1);
    const searchTimeout = useRef(null);
    const filterRef = useRef({});
    const unreadChatCountRef = useRef(0);
    const conversationCountsRef = useRef(null);
    const initDoneRef = useRef(false);

    useEffect(() => {
        unreadChatCountRef.current = unreadChatCount;
    }, [unreadChatCount]);

    useEffect(() => {
        conversationCountsRef.current = conversationCounts;
    }, [conversationCounts]);

    useEffect(() => {
        setTranslateMode(chatLanguageInfo?.chat_translate_view || "original");
    }, [chatLanguageInfo?.chat_translate_view]);

    useEffect(() => {
        dispatch(clearMessageList());
        dispatch(clearMessages());
        dispatch(getLanguageTranslate());
        const handleBeforeUnload = () => {
            dispatch(clearMessageList());
            dispatch(clearMessages());
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
        };
    }, [dispatch]);

    /* Socket recovery: the shared socket stops retrying after 5 attempts, so
     * a longer offline spell kills it — revive it when the browser comes back
     * online, and re-join the open conversation's room on every (re)connect
     * (server-side room membership does not survive a reconnect). */
    useEffect(() => {
        const reviveSocket = () => {
            if (socket && socket.disconnected) socket.connect();
        };
        window.addEventListener("online", reviveSocket);
        return () => window.removeEventListener("online", reviveSocket);
    }, [socket]);

    useEffect(() => {
        if (!userDetailInfo?.conversation_sid) return undefined;
        const rejoinRoom = () => {
            socket.emit("join_room", { conversation_sid: userDetailInfo.conversation_sid, token: getAccessToken() });
        };
        socket.on("connect", rejoinRoom);
        return () => socket.off("connect", rejoinRoom);
    }, [socket, userDetailInfo?.conversation_sid]);

    /* Redux list → local rows (replace on fresh loads, append on scroll pages). */
    useEffect(() => {
        if (!conversactionUserList) return;
        if (appendNextRef.current) {
            appendNextRef.current = false;
            setRows((prev) => {
                const seen = new Set(prev.map((r) => r.conversation_sid));
                return [...prev, ...conversactionUserList.filter((r) => !seen.has(r.conversation_sid))];
            });
        } else {
            setRows(conversactionUserList);
        }
    }, [conversactionUserList]);

    const groups = useMemo(() => groupConversations(rows), [rows]);

    const visibleGroups = useMemo(() => {
        let list = groups;
        if (stakeFilter) list = list.filter((g) => g.friendType === stakeFilter);
        if (statusFilter === "unread") list = list.filter((g) => g.unread > 0);
        return list;
    }, [groups, stakeFilter, statusFilter]);

    /* Status-chip counts come from the server only, never from counting the loaded page; null until it answers. */
    const counts = useMemo(() => ({
        all: conversationCounts?.all ?? null,
        notReplied: conversationCounts?.not_replied ?? null,
        unread: conversationCounts?.unread ?? null,
    }), [conversationCounts]);

    const selectedGroup = useMemo(
        () => groups.find((g) => g.key === selectedKey) || null,
        [groups, selectedKey]
    );

    const buildUserInfo = useCallback((row) => ({
        name: row?.friend_type === "group_team" ? row?.friendly_name : row?.name,
        user_id: row?.friend_type === "group_team" ? null : row?.user_id,
        employer_worker_id: row?.friend_type === "group_team" ? null : row?.employer_worker_staff_common_id,
        user_type: row?.friend_type,
        friend_type: row?.friend_type,
        conversation_sid: row?.conversation_sid,
        mobile_number: row?.friend_type === "group_team" ? null : row?.mobile_number,
        friendly_name: row?.friendly_name,
        receiver_lastMessage: row?.receiver_lastMessage,
        isActiveSeason: row?.isActiveSeason,
        wa_window_expires_at: row?.wa_window_expires_at ?? null,
        chinese_name: row?.friend_type === "group_team" ? "" : (row?.chinese_name || ""),
        person_reference_id: row?.friend_type === "group_team" ? "" : (row?.person_reference_id || row?.reference_id || ""),
        whatsapp_number: row?.country_code && row?.mobile_number ? `${ row?.country_code }${ row?.mobile_number }` : "",
        employer_id: row?.employer_worker_staff_common_id,
        unread_message: row?.unread_message,
        created_at: row?.created_at,
        role_id: row?.role_id,
        last_message: row?.last_message,
        last_message_ceated_at: row?.last_message_ceated_at,
    }), []);

    const fetchEntityContext = useCallback((row) => {
        if (row?.friend_type === "worker") {
            dispatch(fetchWorkerCommonDetailInfo({ worker_id: row?.employer_worker_staff_common_id, type: "biodata" }));
            setIsWorkerPermissionAccessInfo(getWorkerPermissionAccess(ownerOnboardingList, row?.employer_worker_staff_common_id, permissionList?.data));
            dispatchWithHandling(dispatch, fetchWorkerJobOfferList({ worker_id: row?.employer_worker_staff_common_id }));
        } else if (row?.guard_name === "employer" || row?.friend_type === "employer") {
            dispatchWithHandling(dispatch, fetchEmployerJobOffers({ emp_id: row?.employer_worker_staff_common_id }));
            /* identity for the thread header (chinese name + code) */
            dispatch(fetchEmployerDetail({ employer_id: row?.employer_worker_staff_common_id }));
        }
    }, [dispatch, ownerOnboardingList, permissionList?.data]);

    const clearGroupUnread = useCallback((group) => {
        if (!group || group.unread <= 0) return;
        const sids = new Set(group.rows.map((r) => r.conversation_sid));
        const currentUnreadCount = unreadChatCountRef.current;
        if (currentUnreadCount > 0) {
            dispatch(updateUnreadChatCount({ count: Math.max(0, currentUnreadCount - group.unread) }));
        }
        /* the server's Unread count drops by the one conversation just read; the next list fetch re-confirms it */
        const serverCounts = conversationCountsRef.current;
        if (serverCounts?.unread > 0) {
            dispatch(setConversationCounts({ ...serverCounts, unread: serverCounts.unread - 1 }));
        }
        setRows((prev) => prev.map((r) => (sids.has(r.conversation_sid) ? { ...r, unread_message: 0 } : r)));
    }, [dispatch]);

    const openConversationRow = useCallback((row, { markRead = true } = {}) => {
        if (!row) return;
        const info = buildUserInfo(row);
        setUserDetailInfo(info);
        dispatch(updateChatUserInfo(info));
        setActiveChannel(row.platform || "app");
        setIsChatOpen(false);
        if (row.conversation_sid) {
            socket.emit("join_room", { conversation_sid: row.conversation_sid, token: getAccessToken() });
            if (markRead) socket.emit("chat_message_read", { conversation_sid: row.conversation_sid, token: getAccessToken() });
            dispatchWithHandling(dispatch, fetchMessageList({ sid: row.conversation_sid, limit: GC_LIST_LIMIT, ExclusiveStartKey: "", platform: row.platform || "app" }));
        }
        fetchEntityContext(row);
    }, [buildUserInfo, dispatch, socket, fetchEntityContext]);

    const handleSelectGroup = useCallback((group) => {
        setPanelStack([]);
        if (statusFilter === "unread") {
            clearGroupUnread(group);
            const remaining = groups.filter((g) => g.unread > 0 && g.key !== group.key);
            if (remaining.length) {
                setSelectedKey(remaining[0].key);
                openConversationRow(remaining[0].latestRow, { markRead: false });
            } else {
                setSelectedKey(null);
                setUserDetailInfo({});
            }
            return;
        }
        setSelectedKey(group.key);
        clearGroupUnread(group);
        openConversationRow(group.latestRow);
    }, [statusFilter, groups, clearGroupUnread, openConversationRow]);

    useEffect(() => {
        if (initDoneRef.current) return;
        initDoneRef.current = true;
        const loadInitial = () => {
            dispatch(fetchConversactionListAll({ platform: "app", limit: GC_LIST_LIMIT, page: 1, user_id }))
                .unwrap()
                .then((conversactionInfo) => {
                    if (conversactionInfo.length > 0) {
                        const grouped = groupConversations(conversactionInfo);
                        setSelectedKey(grouped[0].key);
                        openConversationRow(grouped[0].latestRow);
                    }
                })
                .catch(() => { });
        };
        if (user_id) {
            dispatch(setConversation({ friend_type: "worker", platform: "app", friend_id: user_id })).then(loadInitial);
        } else {
            loadInitial();
        }
    }, [dispatch, user_id, openConversationRow]);

    const refreshList = useCallback((extra = {}) => {
        pageNoRef.current = 1;
        appendNextRef.current = false;
        filterRef.current = { ...filterRef.current, ...extra };
        dispatch(fetchConversactionListAllByTeam({
            platform: "app", limit: GC_LIST_LIMIT, page: 1, user_id, ...filterRef.current,
        }))
            .unwrap()
            .then((conversactionInfo) => {
                const grouped = groupConversations(conversactionInfo);
                const want = filterRef.current.friend_type;
                const first = want ? grouped.find((g) => g.friendType === want) : grouped[0];
                if (first) {
                    setSelectedKey(first.key);
                    openConversationRow(first.latestRow);
                } else {
                    setSelectedKey(null);
                }
            })
            .catch(() => { });
    }, [dispatch, user_id, openConversationRow]);

    const handleSearch = useCallback((e) => {
        const searchValue = e.target.value;
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => refreshList({ search: searchValue }), 500);
    }, [refreshList]);

    const handleStakeFilter = useCallback((team) => {
        setStakeFilter(team);
        refreshList({ friend_type: team || undefined });
    }, [refreshList]);

    const handleStatusFilter = useCallback((chipId) => {
        setStatusFilter(chipId);
        refreshList({ actionType: chipId === "notreplied" ? "not_replied" : chipId });
    }, [refreshList]);

    const handleLoadMore = useCallback(() => {
        pageNoRef.current += 1;
        appendNextRef.current = true;
        const filters = { ...filterRef.current };
        delete filters.user_id;
        dispatchWithHandling(dispatch, fetchConversactionListAllByTeamScroll({
            ...filters, platform: "app", limit: GC_LIST_LIMIT, page: pageNoRef.current,
        }));
    }, [dispatch]);

    /* Channel switch — get/create the platform conversation, then load it. `notice` is shown once the switch succeeds. */
    const handleChannelSwitch = useCallback((channelId, notice) => {
        if (channelId === activeChannel) return;
        if (!userDetailInfo?.user_id) return;
        dispatch(clearMessageList());
        dispatch(clearMessages());
        setActiveChannel(channelId);
        dispatch(setConversation({ friend_type: userDetailInfo?.user_type, platform: channelId, friend_id: userDetailInfo?.user_id })).then((res) => {
            if (res?.payload?.success) {
                setUserDetailInfo((prev) => ({
                    ...prev,
                    conversation_sid: res?.payload?.data?.id,
                    receiver_lastMessage: res?.payload?.data?.receiver_lastMessage ?? prev.receiver_lastMessage,
                    isActiveSeason: res?.payload?.data?.isActiveSeason ?? prev.isActiveSeason,
                    wa_window_expires_at: res?.payload?.data?.wa_window_expires_at ?? prev.wa_window_expires_at,
                }));
                socket.emit("join_room", { conversation_sid: res?.payload?.data?.id, token: getAccessToken() });
                socket.emit("chat_message_read", { conversation_sid: res?.payload?.data?.id, token: getAccessToken() });
                dispatchWithHandling(dispatch, fetchMessageList({ sid: res?.payload?.data?.id, limit: GC_LIST_LIMIT, ExclusiveStartKey: "", platform: channelId }));
                if (notice) ShowToast("success", notice);
            } else {
                dispatch(clearMessageList());
                dispatch(clearMessages());
                ShowToast("error", res?.error?.message || res?.payload?.message);
            }
        });
    }, [activeChannel, userDetailInfo, dispatch, socket]);

    /* Realtime: a message arrived for any conversation (receive_message_all). */
    const handleConversationListUpdate = useCallback((receiverMsg) => {
        const conversation_sid = receiverMsg?.conversation_sid;
        if (!conversation_sid) return;
        if (receiverMsg?.sender_id === getCurrentUser()?.data?.id) return;

        setRows((prevList) => {
            const idx = prevList.findIndex((item) => item.conversation_sid === conversation_sid);
            if (idx === -1) {
                if (getCurrentUser()?.data?.id !== receiverMsg?.receiver_id) return prevList;
                const newItem = {
                    id: receiverMsg?.conversation_sid,
                    platform: receiverMsg?.platform,
                    job_description: null,
                    unique_name: receiverMsg?.groupInfo?.unique_name,
                    friendly_name: receiverMsg?.groupInfo?.friendly_name,
                    friend_type: receiverMsg?.groupInfo?.friend_type,
                    last_message_ceated_at: receiverMsg?.created_at,
                    last_msgtype: receiverMsg?.message_type,
                    last_message: receiverMsg?.content,
                    role_id: "",
                    employer_worker_staff_common_id: receiverMsg?.employer_worker_staff_common_id || "1",
                    user_id: receiverMsg?.sender_id,
                    name: receiverMsg?.full_name,
                    guard_name: receiverMsg?.guard_name,
                    profile_image: receiverMsg?.profile_image,
                    mobile_number: receiverMsg?.mobile_number,
                    country_code: receiverMsg?.country_code,
                    conversation_sid: receiverMsg?.conversation_sid,
                    created_at: receiverMsg?.created_at,
                    unread_message: receiverMsg?.platform === "app" ? 0 : 1,
                    receiver_lastMessage: false,
                    reference_id: null,
                    isActiveSeason: true,
                };
                return [newItem, ...prevList];
            }
            const updatedItem = {
                ...prevList[idx],
                unread_message: (prevList[idx].unread_message || 0) + 1,
                last_message: receiverMsg?.content,
                last_message_ceated_at: receiverMsg?.created_at,
                ...(receiverMsg?.platform === "whatsapp" ? { isActiveSeason: true, receiver_lastMessage: true } : {}),
            };
            return [updatedItem, ...prevList.slice(0, idx), ...prevList.slice(idx + 1)];
        });
        if (receiverMsg?.platform === "whatsapp") {
            setUserDetailInfo((prev) => (
                prev?.conversation_sid === conversation_sid
                    ? { ...prev, isActiveSeason: true, receiver_lastMessage: true }
                    : prev
            ));
        }
    }, []);

    const handleOutboundListUpdate = useCallback((previewText) => {
        const conversationSid = userDetailInfo?.conversation_sid;
        if (!conversationSid) return;
        const nowIso = new Date().toISOString();
        setRows((prevList) => {
            const idx = prevList.findIndex((item) => item.conversation_sid === conversationSid);
            if (idx === -1) return prevList;
            const updatedItem = {
                ...prevList[idx],
                last_message: previewText,
                last_message_ceated_at: nowIso,
                receiver_lastMessage: false,
            };
            return [updatedItem, ...prevList.slice(0, idx), ...prevList.slice(idx + 1)];
        });
    }, [userDetailInfo?.conversation_sid]);

    const handleConversationListUnread = useCallback((conversation_sid) => {
        if (!conversation_sid) return;
        setRows((prevList) => prevList.map((item) => (
            item.conversation_sid === conversation_sid ? { ...item, unread_message: 0 } : item
        )));
    }, []);

    /* Translation view (Original / Translated / Both) is saved per user, together with the app language it reads in. */
    const chatLanguageInfoForApp = useMemo(
        () => ({ ...chatLanguageInfo, chat_translate_language: chatLanguage }),
        [chatLanguageInfo, chatLanguage]
    );

    const persistTranslation = useCallback((view) => {
        dispatch(saveTranslationLanguage({ chat_translate_view: view, chat_translate_language: chatLanguage })).then((res) => {
            if (res?.payload?.success) {
                dispatch(getLanguageTranslate());
                if (userDetailInfo?.conversation_sid) {
                    dispatchWithHandling(dispatch, fetchMessageList({
                        sid: userDetailInfo.conversation_sid, limit: GC_LIST_LIMIT, ExclusiveStartKey: "", platform: activeChannel,
                    }));
                }
            }
        });
    }, [dispatch, chatLanguage, userDetailInfo?.conversation_sid, activeChannel]);

    const handleTranslateMode = useCallback((mode) => {
        setTranslateMode(mode);
        if ((chatLanguageInfo?.chat_translate_view || "original") !== mode) {
            persistTranslation(mode);
        }
    }, [chatLanguageInfo, persistTranslation]);

    const handleToggleSearch = useCallback(() => {
        setThreadSearch((prev) => (prev.open ? { open: false, q: "" } : { open: true, q: prev.q }));
    }, []);
    const handleSearchChange = useCallback((q) => setThreadSearch({ open: true, q }), []);
    const handleSearchClose = useCallback(() => setThreadSearch({ open: false, q: "" }), []);

    const handleOpenMessageTemplate = useCallback(() => {
        if (activeChannel === "whatsapp") {
            setCommonTemplateData({ slug: "whatsapp", title: translation('key_send_template'), userType: userDetailInfo?.user_type, actionStatusType: "whatsapp", statusKey: "", action: "whatsapp" });
        } else {
            setCommonTemplateData({ slug: "", title: translation('key_send_template'), userType: userDetailInfo?.user_type, actionStatusType: "", statusKey: "", action: "normal", label: translation('key_template_message') });
        }
        setTimeout(() => setIsSendTemplatePopup(true), 100);
    }, [activeChannel, userDetailInfo]);

    const handleUseWhatsAppTemplate = useCallback(() => {
        setIsSendTemplatePopup(false);
        setShareContext(null);
        setIsWhatsAppTemplateOpen(true);
    }, []);

    const handleOpenAddEditTemplatePopup = useCallback((action, data) => {
        setIsAddEditTemplatePopup(true);
        setIsSendTemplatePopup(false);
        setIsAddEditTemplateFormActionType(action);
        if (data) setCurrentTemplateData(JSON.parse(data));
    }, []);

    const handleCloseAddEditOpenSend = useCallback(() => {
        setIsAddEditTemplatePopup(false);
        setIsSendTemplatePopup(true);
        setCurrentTemplateData(null);
    }, []);

    /* lock panel "Use <channel>": switches only — nothing is sent automatically, and the notice says so */
    const handleUseChannel = useCallback(
        (channelId) => handleChannelSwitch(channelId, GC_COMPOSER_COPY.switchedTo[channelId]),
        [handleChannelSwitch]
    );

    const [pendingDraft, setPendingDraft] = useState("");
    const handleFailedDraftToInApp = useCallback((body) => {
        setPendingDraft(body || "");
        handleChannelSwitch("app");
    }, [handleChannelSwitch]);
    const handlePendingDraftConsumed = useCallback(() => setPendingDraft(""), []);

    /* ---------- stakeholder side panel ---------- */
    const panelTimerRef = useRef(null);
    const foreignBiodataRef = useRef(false);

    const pushPanel = useCallback((frame) => {
        if (frame.view === "emp-sum" && userDetailInfo?.employer_worker_id) {
            dispatch(fetchEmployerDetail({ employer_id: userDetailInfo.employer_worker_id }));
        }
        if (frame.view === "profile" && frame.workerId
            && String(frame.workerId) !== String(userDetailInfo?.employer_worker_id)) {
            foreignBiodataRef.current = true;
        }
        setPanelStack((prev) => [...prev, frame]);
        setPanelLoading(true);
        if (panelTimerRef.current) clearTimeout(panelTimerRef.current);
        panelTimerRef.current = setTimeout(() => setPanelLoading(false), 260);
    }, [dispatch, userDetailInfo?.employer_worker_id]);

    const restoreConversationBiodata = useCallback(() => {
        if (foreignBiodataRef.current && userDetailInfo?.user_type === "worker" && userDetailInfo?.employer_worker_id) {
            dispatch(fetchWorkerCommonDetailInfo({ worker_id: userDetailInfo.employer_worker_id, type: "biodata" }));
        }
        foreignBiodataRef.current = false;
    }, [dispatch, userDetailInfo?.user_type, userDetailInfo?.employer_worker_id]);

    const popPanel = useCallback(() => {
        setPanelStack((prev) => {
            const popped = prev[prev.length - 1];
            if (popped?.view === "profile") restoreConversationBiodata();
            return prev.slice(0, -1);
        });
    }, [restoreConversationBiodata]);

    const closePanel = useCallback(() => {
        restoreConversationBiodata();
        setPanelStack([]);
    }, [restoreConversationBiodata]);

    const handleOpenSummary = useCallback(() => {
        if (!selectedGroup) return;
        if (selectedGroup.friendType === "employer") {
            setPanelStack([]);
            pushPanel({ view: "emp-sum" });
        } else if (selectedGroup.friendType === "worker") {
            setPanelStack([]);
            pushPanel({ view: "wkr-sum" });
        } else if (selectedGroup.friendType === "group_team" && selectedGroup.latestRow?.job_id) {
            setPanelStack([]);
            pushPanel({
                view: "jo-app-details",
                focusApplicantId: selectedGroup.latestRow.job_worker_id || undefined,
                job: {
                    id: selectedGroup.latestRow.job_id,
                    reference_id: selectedGroup.latestRow.job_description || selectedGroup.latestRow.reference_id,
                },
            });
        }
    }, [selectedGroup, pushPanel]);

    /* `/get-encoded-hashids` takes numeric ids: the Job Offer (worker conversation → Applicant View) or the worker (employer
       conversation → applicant profile, `ctx.jobId` is the applicant's Job Offer) — the same shape Job Offer Details sends */
    const linkPayload = useCallback((detailInfo, ctx) => (ctx?.job
        ? { job_id: detailInfo?.id, worker_id: userDetailInfo?.employer_worker_id, employer_id: detailInfo?.employer_id }
        : { worker_id: detailInfo?.id, job_id: ctx?.jobId, employer_id: userDetailInfo?.employer_worker_id }
    ), [userDetailInfo?.employer_worker_id]);
    const handleShareToChat = useCallback((detailInfo, ctx) => {
        if (!detailInfo) return;
        dispatch(fetchWorkerJobEncriptedID(linkPayload(detailInfo, ctx))).then((res) => {
            showErrorMessage(res);
            if (res.error) return;
            const data = res?.payload?.data;
            const entityFields = userDetailInfo?.user_type === "worker"
                ? {
                    media_type: "job",
                    entity_id: detailInfo?.id,
                    media_link: `${ REACT_JOB_VIEW_URL }?job_id=${ data?.job_id }`,
                    entity_name: detailInfo?.head_line,
                    entity_job_id: detailInfo?.reference_id,
                    entity_type: "job",
                }
                : {
                    media_type: "link",
                    entity_id: detailInfo?.id,
                    media_link: `${ REACT_WORKER_VIEW_URL }?worker_id=${ data?.worker_id }&&job_id=${ data?.job_id }&&employer_id=${ data?.employer_id }&&token=${ data?.token }`,
                    entity_name: detailInfo?.fullname,
                    entity_job_id: detailInfo?.reference_id,
                    entity_type: "worker",
                };
            setUserDetailInfo((prev) => {
                const next = { ...prev, ...entityFields };
                dispatch(updateChatUserInfo(next));
                return next;
            });
        });
    }, [dispatch, linkPayload, userDetailInfo?.user_type]);

    /* worker conversations: the Worker grid's Send Link grant, absent = denied; employer conversations gate on the Job Offer's
       own Share grant inside each panel (PERM §4.12) */
    const canShareLink = userDetailInfo?.user_type === "worker"
        ? isWorkerPermissionAccessInfo?.worker_send_link === "y"
        : true;

    /* Share → Send Template (S8): the entity link is generated first and travels with the shared Job Offer / worker as the
       send's record context; the server resolves the link field and the worker / Job Offer values from the records. */
    const [shareContext, setShareContext] = useState(null);
    const handleOpenShareTemplate = useCallback((detailInfo, ctx) => {
        if (!detailInfo) return;
        dispatch(fetchWorkerJobEncriptedID(linkPayload(detailInfo, ctx))).then((res) => {
            showErrorMessage(res);
            if (res.error) return;
            const data = res?.payload?.data;
            const isWorkerConversation = userDetailInfo?.user_type === "worker";
            const link = isWorkerConversation
                ? `${ REACT_JOB_VIEW_URL }?job_id=${ data?.job_id }`
                : `${ REACT_WORKER_VIEW_URL }?worker_id=${ data?.worker_id }&&job_id=${ data?.job_id }&&employer_id=${ data?.employer_id }&&token=${ data?.token }`;
            /* a worker conversation shares a Job Offer (the panel's row is the Job Offer); an employer conversation shares a
               worker for one of its Job Offers (`ctx.jobId`) */
            setShareContext(isWorkerConversation
                ? { job_offer_id: detailInfo?.id, links: { job_offer_link: link }, ref: detailInfo?.reference_id || "" }
                : { worker_id: detailInfo?.id, job_offer_id: ctx?.jobId, links: { worker_profile_link: link }, ref: detailInfo?.reference_id || "" });
            setCommonTemplateData({ slug: "", title: translation('key_send_template'), userType: userDetailInfo?.user_type, actionStatusType: "", statusKey: "", action: "normal" });
            setIsSendTemplatePopup(true);
        });
    }, [dispatch, linkPayload, userDetailInfo]);

    const handleChatWithWorker = useCallback((workerId) => {
        const target = groups.find((g) => g.friendType === "worker"
            && String(g.latestRow?.employer_worker_staff_common_id) === String(workerId));
        if (target) {
            closePanel();
            handleSelectGroup(target);
        } else {
            ShowToast("error", translation("key_no_worker_conversation"));
        }
    }, [groups, closePanel, handleSelectGroup]);

    const openTeamConversation = useCallback((staff, entityFields) => {
        dispatch(setConversation({ friend_type: "user", platform: "app", friend_id: staff.user_id })).then((convRes) => {
            if (!convRes?.payload?.success) {
                ShowToast("error", convRes?.error?.message || convRes?.payload?.message);
                return;
            }
            const conv = convRes?.payload?.data;
            const info = {
                name: staff.name,
                user_id: staff.user_id,
                employer_worker_id: null,
                user_type: "user",
                friend_type: "user",
                conversation_sid: conv?.id,
                mobile_number: null,
                friendly_name: staff.name,
                receiver_lastMessage: conv?.receiver_lastMessage,
                isActiveSeason: conv?.isActiveSeason,
                whatsapp_number: "",
                employer_id: null,
                unread_message: 0,
                ...(entityFields || {}),
            };
            setPanelStack([]);
            setActiveChannel("app");
            setIsChatOpen(false);
            setUserDetailInfo(info);
            dispatch(updateChatUserInfo(info));
            if (conv?.id) {
                socket.emit("join_room", { conversation_sid: conv.id, token: getAccessToken() });
                socket.emit("chat_message_read", { conversation_sid: conv.id, token: getAccessToken() });
                dispatchWithHandling(dispatch, fetchMessageList({ sid: conv.id, limit: GC_LIST_LIMIT, ExclusiveStartKey: "", platform: "app" }));
            }
            const exists = groups.some((g) => g.friendType === "user"
                && String(g.latestRow?.user_id) === String(staff.user_id));
            if (!exists) {
                setRows((prev) => [{
                    conversation_sid: conv?.id,
                    friend_type: "user",
                    user_id: staff.user_id,
                    name: staff.name,
                    platform: "app",
                    unread_message: 0,
                    last_message: "",
                    created_at: new Date().toISOString(),
                    employer_worker_staff_common_id: null,
                    mobile_number: null,
                }, ...prev.filter((r) => r.conversation_sid !== conv?.id)]);
            }
            setSelectedKey(`user:${ staff.user_id }`);
            if (entityFields) ShowToast("success", translation("key_applicant_link_attached"));
        });
    }, [dispatch, socket, groups]);

    /* Team chat from a record line (register row #14). Refuses: no Team chat identity; the actor's own account; and, from a Job
       Offer's CS Owner line (`ownerOf.jobId`), re-checked at click — the Job Offer no longer open to the actor (neutral) or
       the CS Owner changed since the line was rendered. Nothing is sent. */
    const handleOpenTeamChat = useCallback((staff, applicant, ownerOf) => {
        if (!staff?.user_id) {
            ShowToast("error", translation("key_team_member_unreachable"));
            return;
        }
        if (String(staff.user_id) === String(getCurrentUser()?.data?.id)) {
            ShowToast("error", GC_PANEL_COPY.teamChatSelf);
            return;
        }
        const openChat = () => {
            if (!applicant?.workerId) {
                if (userDetailInfo?.user_type === "user"
                    && String(userDetailInfo?.user_id) === String(staff.user_id)) return;
                openTeamConversation(staff, null);
                return;
            }
            if (userDetailInfo?.user_type === "user"
                && String(userDetailInfo?.user_id) === String(staff.user_id)
                && String(userDetailInfo?.entity_id || "") === String(applicant?.workerId || "")) {
                ShowToast("error", translation("key_applicant_link_already_attached"));
                return;
            }
            dispatch(fetchWorkerJobEncriptedID({
                worker_id: applicant?.workerId,
                job_id: applicant?.jobId,
                employer_id: applicant?.employerId,
            })).then((res) => {
                showErrorMessage(res);
                if (res.error) return;
                const data = res?.payload?.data;
                openTeamConversation(staff, {
                    media_type: "link",
                    entity_id: applicant?.workerId,
                    media_link: `${ REACT_WORKER_VIEW_URL }?worker_id=${ data?.worker_id }&&job_id=${ data?.job_id }&&employer_id=${ data?.employer_id }&&token=${ data?.token }`,
                    entity_name: applicant?.workerName,
                    entity_job_id: applicant?.workerRef,
                    entity_type: "worker",
                });
            });
        };
        if (!ownerOf?.jobId) {
            openChat();
            return;
        }
        dispatch(fetchJobDetail(ownerOf.jobId)).then((res) => {
            if (res?.error) {
                const code = Number(res?.payload?.data?.status ?? res?.payload?.httpStatus ?? 0);
                if (code === 401 || code === 403) ShowToast("error", `${ GC_PANEL_COPY.deniedTitle } — ${ GC_PANEL_COPY.deniedText }`);
                else showErrorMessage(res);
                return;
            }
            const detail = res?.payload?.data;
            const isOwner = typeof detail?.is_owner === "boolean" ? detail.is_owner : undefined;
            if (!getJobOfferPermissions(permissionList, ownerOnboardingList, detail?.employer_id, isOwner).canViewDetails) {
                ShowToast("error", `${ GC_PANEL_COPY.deniedTitle } — ${ GC_PANEL_COPY.deniedText }`);
            } else if (String(detail?.cs_owner_user_id || "") !== String(staff.user_id)) {
                ShowToast("error", GC_PANEL_COPY.teamChatOwnerChanged);
            } else {
                openChat();
            }
        });
    }, [dispatch, openTeamConversation, userDetailInfo?.user_type, userDetailInfo?.user_id, userDetailInfo?.entity_id, permissionList, ownerOnboardingList]);

    /* ---------- interview actions (confirms + ScheduleInterview reuse) ---------- */
    const [refreshNonce, setRefreshNonce] = useState(0);
    /* refreshNonce re-fetches the applicant list AND the single-job detail
     * (get-job-detail now carries the *_stages_count fields), so stage counts
     * refresh without reloading the employer's whole JO list. */
    const handleActionRefresh = useCallback(() => {
        setRefreshNonce((n) => n + 1);
    }, []);

    const {
        confirm: actionConfirm,
        schedule: actionSchedule,
        report: actionReport,
        instant: actionInstant,
        busy: actionBusy,
        requestAction,
        confirmAction,
        closeConfirm,
        closeSchedule,
        closeReport,
        editReport,
        closeInstant,
    } = useGcInterviewActions({
        workerId: userDetailInfo?.user_type === "worker" ? userDetailInfo?.employer_worker_id : null,
        employerId: userDetailInfo?.user_type === "employer" ? userDetailInfo?.employer_worker_id : null,
        onRefresh: handleActionRefresh,
    });

    /* Stable handlers — InstantInterviewGenerated lists its callbacks in the
     * effect deps that dispatch the create call; fresh identities would
     * re-fire creation on every render. onRefreshJobWorkerList must refresh
     * only (never close), so the generated meeting link stays visible. */
    const closeInstantKeepOpenRefresh = useCallback(() => {
        setRefreshNonce((n) => n + 1);
    }, []);
    const closeInstantNoRefresh = useCallback(() => closeInstant(false), [closeInstant]);
    const closeInstantWithRefresh = useCallback(() => closeInstant(true), [closeInstant]);

    const panelProps = useMemo(() => ({
        onShareToChat: handleShareToChat,
        canShareLink,
        onOpenMessageTemplate: handleOpenMessageTemplate,
        onAction: requestAction,
        refreshNonce,
        workerPermissionAccessInfo: isWorkerPermissionAccessInfo,
        isAdmin: isAdminUser(),
        onChatWithWorker: handleChatWithWorker,
        conversationType: userDetailInfo?.user_type,
        onShareTemplate: handleOpenShareTemplate,
        onOpenTeamChat: handleOpenTeamChat,
    }), [handleShareToChat, canShareLink, handleOpenMessageTemplate, requestAction, refreshNonce, isWorkerPermissionAccessInfo, handleChatWithWorker, userDetailInfo?.user_type, handleOpenShareTemplate, handleOpenTeamChat]);

    /* Thread-header identity (chinese name + entity code) — sourced from the
     * detail records fetched on selection, guarded against stale data from a
     * previously selected conversation. */
    const confirmCopy = useMemo(() => {
        if (!actionConfirm) return {};
        const workerName = actionConfirm.row?.name || actionConfirm.row?.employers_fullname || "";
        const jobRef = actionConfirm.ctx?.jobRef;
        const ref = jobRef ? <span className="gc-mono">{ jobRef }</span> : null;
        switch (actionConfirm.actionId) {
            case "e_remove_applicant":
                return {
                    titleKey: "key_mark_as_not_suitable", confirmKey: "key_mark_as_not_suitable",
                    spreadFooter: true,
                    body: (
                        <>
                            <div className="gc-warn-line">
                                <GcIcon name="warn" />
                                <span>
                                    <b>{ workerName }</b> { translation("key_is_currently_at") } <b>{ translation("key_applied_stage") }</b>. { translation("key_remove_applicant_note") }
                                </span>
                            </div>
                            <p className="gc-confirm-para">{ translation("key_history_retained_note") }</p>
                        </>
                    ),
                };
            case "e_cancel_invite":
                return {
                    titleKey: "key_cancel_invite", confirmKey: "key_cancel_invite", cancelKey: "key_keep_invite",
                    body: (
                        <>
                            { translation("key_cancel_invitation_for") } <b>{ workerName }</b>
                            { ref && <> { translation("key_on") } <b>{ ref }</b></> }?
                        </>
                    ),
                };
            case "e_cancel_interview":
                return {
                    titleKey: "key_cancel_interview", confirmKey: "key_cancel_interview", cancelKey: "key_keep_interview",
                    body: (
                        <>
                            { translation("key_cancel_interview_with") } <b>{ workerName }</b>?
                            <br /><br />{ translation("key_cancel_interview_note") }
                        </>
                    ),
                };
            default:
                return {
                    titleKey: actionConfirm.confirmKey, confirmKey: actionConfirm.confirmKey,
                    body: (
                        <>
                            <b>{ translation("key_are_you_sure") }</b><br />
                            { translation(actionConfirm.messageKey || "key_action_confirm_note") }
                            { workerName && (
                                <>
                                    <br />
                                    <b>{ workerName }</b>
                                    { ref && <> · { ref }</> }
                                </>
                            ) }
                        </>
                    ),
                };
        }
    }, [actionConfirm]);

    const headerIdentity = useMemo(() => {
        const entityId = userDetailInfo?.employer_worker_id;
        if (!entityId) return null;
        
        if (userDetailInfo?.user_type === "employer") {
            const detailCurrent = String(currentEmployer?.employer_id || currentEmployer?.id) === String(entityId);
            return {
                kind: "employer",
                id: entityId,
                zh: userDetailInfo?.chinese_name || (detailCurrent ? currentEmployer?.chinese_name : "") || "",
                code: userDetailInfo?.person_reference_id || (detailCurrent ? currentEmployer?.reference_id : "") || "",
            };
        }
        if (userDetailInfo?.user_type === "worker") {
            const detailCurrent = String(workerProfileInfo?.id) === String(entityId);
            return {
                kind: "worker",
                id: entityId,
                zh: userDetailInfo?.chinese_name || "",
                code: userDetailInfo?.person_reference_id || (detailCurrent ? workerProfileInfo?.reference_id : "") || "",
            };
        }
        return null;
    }, [userDetailInfo?.user_type, userDetailInfo?.employer_worker_id, userDetailInfo?.chinese_name, userDetailInfo?.person_reference_id, currentEmployer, workerProfileInfo]);

    const channels = useMemo(() => {
        if (!selectedGroup) return ["app"];
        const type = selectedGroup.friendType;
        /* Group, Team and Partner conversations are In-App only, whatever the data says (register row #15) */
        if (type === "group_team" || type === "user" || type === "partner") return ["app"];
        /* The API now says which channels the contact has enabled; the old
         * heuristics stay as fallback for rows without the key. */
        const rowChannels = selectedGroup.latestRow?.channels;
        if (Array.isArray(rowChannels) && rowChannels.length) {
            return ["app", "whatsapp", "line"].filter((c) => c === "app" || rowChannels.includes(c));
        }
        const list = ["app"];
        if (selectedGroup.byPlatform?.whatsapp || userDetailInfo?.whatsapp_number) list.push("whatsapp");
        if (selectedGroup.byPlatform?.line || activeChannel === "line") list.push("line");
        return list;
    }, [selectedGroup, userDetailInfo?.whatsapp_number, activeChannel]);

    /* the WhatsApp pill's window state: the open WhatsApp conversation, else the contact's WhatsApp row */
    const waSource = activeChannel === "whatsapp" ? userDetailInfo : (selectedGroup?.byPlatform?.whatsapp || null);

    const listStatus = conversactionLoadingStatus === "loading" || conversactionStatus === "loading"
        ? "loading"
        : conversactionLoadingStatus === "failed" ? "failed" : "succeeded";

    return (
        <div className="gcp gcp-page">
            <GcConversationList
                groups={ visibleGroups }
                selectedKey={ selectedKey }
                statusFilter={ statusFilter }
                stakeFilter={ stakeFilter }
                counts={ counts }
                listStatus={ listStatus }
                scrollStatus={ conversactionScrollStatus }
                stakeCounts={ conversationCounts }
                onSelect={ handleSelectGroup }
                onSearch={ handleSearch }
                onStatusFilter={ handleStatusFilter }
                onStakeFilter={ handleStakeFilter }
                onLoadMore={ handleLoadMore }
            />
            <section className="gc-thread-col">
                { selectedGroup ? (
                    <>
                        <GcThreadHeader
                            group={ selectedGroup }
                            channels={ channels }
                            activeChannel={ activeChannel }
                            onChannelSwitch={ handleChannelSwitch }
                            waSource={ waSource }
                            translateMode={ translateMode }
                            onTranslateMode={ handleTranslateMode }
                            onOpenSummary={ handleOpenSummary }
                            headerIdentity={ headerIdentity }
                            searchOpen={ threadSearch.open }
                            onToggleSearch={ handleToggleSearch }
                        />
                        <GcMessagePanel
                            key={ `${ userDetailInfo?.conversation_sid }|${ activeChannel }` }
                            socket={ socket }
                            userDetailInfo={ userDetailInfo }
                            group={ selectedGroup }
                            platform={ activeChannel }
                            isChatOpen={ isChatOpen }
                            chatLanguageInfo={ chatLanguageInfoForApp }
                            translateMode={ translateMode }
                            searchOpen={ threadSearch.open }
                            searchQuery={ threadSearch.q }
                            onSearchChange={ handleSearchChange }
                            onSearchClose={ handleSearchClose }
                            onConversationListUpdate={ handleConversationListUpdate }
                            onConversationListUnread={ handleConversationListUnread }
                            onOutboundSent={ handleOutboundListUpdate }
                            onOpenMessageTemplate={ handleOpenMessageTemplate }
                            channels={ channels }
                            onUseChannel={ handleUseChannel }
                            onFailedDraftToInApp={ handleFailedDraftToInApp }
                            initialDraft={ pendingDraft }
                            onInitialDraftConsumed={ handlePendingDraftConsumed }
                        />
                    </>
                ) : (
                    <div className="gc-thread-empty">
                        <GcIcon name="chat" />
                        <div>{ translation("key_no_conversation_selected") }</div>
                    </div>
                ) }
            </section>
            <GcPanel
                stack={ panelStack }
                loading={ panelLoading }
                onBack={ popPanel }
                onClose={ closePanel }
                onPush={ pushPanel }
                panelProps={ panelProps }
            />

            { isSendTemplatePopup && (
                <Suspense fallback={ LAZY_FALLBACK }>
                    <GcSendTemplateModal
                        onClose={ () => { setIsSendTemplatePopup(false); setShareContext(null); } }
                        userType={ commonTemplateData.userType }
                        recipientKind={ selectedGroup?.friendType }
                        recordId={ userDetailInfo?.employer_worker_id }
                        fullname={ userDetailInfo?.name }
                        chineseName={ userDetailInfo?.chinese_name }
                        referenceCode={ userDetailInfo?.person_reference_id }
                        channels={ channels }
                        share={ shareContext }
                        waWindowOpen={ gcWaWindowState(userDetailInfo) === "open" }
                        onUseWhatsAppTemplate={ handleUseWhatsAppTemplate }
                        defaultChannel={ activeChannel === "whatsapp" ? "whatsapp" : "chat" }
                        onOpenAddEditTemplatePopup={ handleOpenAddEditTemplatePopup }
                    />
                </Suspense>
            ) }
            { isAddEditTemplatePopup && (
                <Suspense fallback={ LAZY_FALLBACK }>
                    <GcAddEditTemplateModal
                        title={ `${ isAddEditTemplateFormActionType } ${ commonTemplateData.title }` }
                        onClose={ () => setIsAddEditTemplatePopup(false) }
                        userType={ commonTemplateData.userType }
                        userId={ userDetailInfo?.user_id }
                        slug={ commonTemplateData.slug }
                        sendTo={ userDetailInfo?.mobile_number }
                        employeeWorkerId={ userDetailInfo?.employer_worker_id }
                        statusKey={ commonTemplateData.statusKey }
                        onCloseAddEditTemplateOpenSendTemplatePopup={ handleCloseAddEditOpenSend }
                        currentTemplateData={ currentTemplateData }
                    />
                </Suspense>
            ) }
            { isWhatsAppTemplateOpen && (
                <Suspense fallback={ LAZY_FALLBACK }>
                    <div className="gc-skin">
                        <SendTemplateWhatsApp onClose={ () => setIsWhatsAppTemplateOpen(false) } userType={ userDetailInfo?.user_type } userId={ userDetailInfo?.user_id } slug="whatsapp" send_to={ userDetailInfo?.whatsapp_number } title={ translation('key_send_template') } employee_worker_id={ userDetailInfo?.employer_worker_id } status_key="" actionStatusType="whatsapp" action="whatsapp" fullname={ userDetailInfo?.name } workerInfoDetails={ userDetailInfo } workerInfoMapping={ userDetailInfo } isCategoryRequired={ false } whatsAppTemplatesRequired="welcome_message_template" custom_content_params={ { name: userDetailInfo?.name } } />
                    </div>
                </Suspense>
            ) }
            { actionConfirm && (
                <GcConfirmModal
                    title={ translation(confirmCopy.titleKey) }
                    body={ confirmCopy.body }
                    confirmLabel={ translation(confirmCopy.confirmKey) }
                    cancelLabel={ confirmCopy.cancelKey ? translation(confirmCopy.cancelKey) : undefined }
                    spreadFooter={ confirmCopy.spreadFooter }
                    danger={ actionConfirm.danger }
                    busy={ actionBusy }
                    onConfirm={ confirmAction }
                    onClose={ closeConfirm }
                />
            ) }
            { actionInstant?.mode === "generate" && (
                <Suspense fallback={ LAZY_FALLBACK }>
                    <div className="gc-skin">
                        <InstantInterviewGenerated
                            interviewId={ actionInstant.row?.interview?.id || actionInstant.row?.interview_id }
                            selectedjobWorkerObj={ actionInstant.row }
                            onClose={ closeInstantNoRefresh }
                            onRefreshJobWorkerList={ closeInstantKeepOpenRefresh }
                        />
                    </div>
                </Suspense>
            ) }
            { actionInstant?.mode === "status" && (
                <Suspense fallback={ LAZY_FALLBACK }>
                    <GcInstantStatus
                        jobId={ actionInstant.ctx?.jobId }
                        selectedjobWorkerObj={ actionInstant.row }
                        interviewId={ actionInstant.row?.interview?.id || actionInstant.row?.interview_id }
                        onClose={ closeInstantWithRefresh }
                    />
                </Suspense>
            ) }
            { actionReport && (
                <Suspense fallback={ LAZY_FALLBACK }>
                    <GcInterviewReport
                        mode={ actionReport.mode }
                        interviewId={ actionReport.row?.interview?.id || actionReport.row?.interview_id }
                        jobStageStatusName={ actionReport.row?.job_stage_status_name || "" }
                        onClose={ () => closeReport(false) }
                        onEdit={ editReport }
                        onSubmitted={ () => closeReport(true) }
                    />
                </Suspense>
            ) }
            { actionSchedule && (
                <Suspense fallback={ LAZY_FALLBACK }>
                    <GcScheduleInterview
                        handleOnClose={ () => closeSchedule(true) }
                        jobId={ actionSchedule.jobId }
                        selectedjobWorkerObj={ actionSchedule.selectedjobWorkerObj }
                        interviewType={ actionSchedule.interviewType }
                        scheduleInterviewFrom={ actionSchedule.scheduleInterviewFrom }
                    />
                </Suspense>
            ) }
        </div>
    );
};

export default GlobalChat;
