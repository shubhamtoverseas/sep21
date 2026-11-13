import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getCurrentUser } from '../../../../services/commonService';
import { fetchMessageListWithKey, fetchRestrictedKey } from '../../../../redux/Slices/chat/ChatSlice';
import { ShowToast } from '../../../../components/show-toast/ShowToast';
import translation from '../../../../utils/translation';
import notificationSound from '../../../../assets/sounds/chat-sound.wav';
import { loadChatDraft, saveChatDraft } from '../chatDraftStorage';

// --- Helpers (static, no re-creation) ---

const IST_OFFSET = 5.5 * 60 * 60 * 1000;

export function formatTo12HourTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const kolkataTime = new Date(date.getTime() + IST_OFFSET);
    const todayIST = new Date(now.getTime() + IST_OFFSET);
    const isSameDay =
        kolkataTime.getUTCFullYear() === todayIST.getUTCFullYear() &&
        kolkataTime.getUTCMonth() === todayIST.getUTCMonth() &&
        kolkataTime.getUTCDate() === todayIST.getUTCDate();

    let hours = kolkataTime.getUTCHours();
    const minutes = kolkataTime.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    const formattedTime = hours + ':' + minutesStr + ' ' + ampm;

    if (isSameDay) return formattedTime;
    const day = kolkataTime.getUTCDate();
    const month = kolkataTime.getUTCMonth() + 1;
    const year = kolkataTime.getUTCFullYear();
    return `${ day }/${ month }/${ year } ${ formattedTime }`;
}

const RAIL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "08:35" — 24h time in the same IST conversion as formatTo12HourTime
export function formatToRailTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const kolkataTime = new Date(date.getTime() + IST_OFFSET);
    const h = kolkataTime.getUTCHours();
    const m = kolkataTime.getUTCMinutes();
    return `${ h < 10 ? '0' + h : h }:${ m < 10 ? '0' + m : m }`;
}

// "22 Aug" — day-divider label in the same IST conversion
export function formatToRailDay(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const kolkataTime = new Date(date.getTime() + IST_OFFSET);
    return `${ kolkataTime.getUTCDate() } ${ RAIL_MONTHS[kolkataTime.getUTCMonth()] }`;
}

export function getTranslatedBody(msg, chatLanguageInfo, direction) {
    const body = msg?.content;
    if (direction !== 'recieve' || chatLanguageInfo?.chat_translate_view !== "translated") return body;
    const langMap = { id: 'content_id', en: 'content_en', zh_cn: 'content_zh_cn', zh_tw: 'content_zh_tw' };
    const key = langMap[chatLanguageInfo?.chat_translate_language];
    return (key && msg?.[key]) || body;
}

export function buildDisplayMsg({ msg, conversationSid, msgDirection, body, extraFields = {} }) {
    return {
        conversation_sid: conversationSid,
        id: msg?.id,
        body: body,
        content_id: msg?.content_id,
        content_en: msg?.content_en,
        content_zh_cn: msg?.content_zh_cn,
        content_zh_tw: msg?.content_zh_tw,
        source_language: msg?.source_language,
        vector: msgDirection,
        media_type: msg?.media_type,
        media_link: msg?.media_link,
        profile_image: msg?.profile_image,
        full_name: msg?.full_name,
        /* what the message carries (e.g. entity_type "template", entity_id = WhatsApp template name or template id) */
        entity_type: msg?.entity_type,
        entity_id: msg?.entity_id,
        chatDateTime: formatTo12HourTime(msg?.created_at),
        timeHM: formatToRailTime(msg?.created_at),
        dayLabel: formatToRailDay(msg?.created_at),
        createdAtRaw: msg?.created_at,
        ...extraFields,
    };
}

/* a WhatsApp delivery status (receive_message_status) applied to the timeline: the message's read_status follows the
   provider (sent → delivered → read); "failed" also marks the bubble Failed (CH-2) */
export function applyMessageStatus(list, data) {
    if (!data?.id) return list;
    return list.map((item) => (item.id === data.id
        ? { ...item, read_status: data.read_status, ...(data.read_status === "failed" ? { status: "failed" } : {}) }
        : item));
}

/* the latest text message still waiting for the server (no id yet, not failed) — the send a refusal answers */
export function findRefusedMessage(list) {
    return [...(list || [])].reverse().find((item) => (
        (item?.id === "" || item?.id === null) && item?.status !== "failed" && (item?.media_type || "text") === "text"
    )) || null;
}

/**
 * Shared hook for chat message handling across platforms.
 * Manages: message list, pagination, socket receive, send, restricted keys, notifications.
 * 
 * @param {Object} params
 * @param {Object} params.socket - Socket.io instance
 * @param {Object} params.userDetailInfo - Current user/conversation info
 * @param {Object} params.chatLanguageInfo - Translation settings
 * @param {string} params.platform - "app" | "whatsapp" | "line"
 * @param {string} params.activePlatformTab - Currently active social tab
 * @param {Function} params.onConversationListUpdate - Callback when received message updates list
 * @param {Function} params.onConversationListUnread - Callback to clear unread for current conversation
 * @param {Function} params.scrollToBottomIfNeeded - From useChatAutoScroll
 * @param {Function} params.scrollToBottom - Force scroll to bottom
 * @param {Function} params.preserveScrollPosition - Preserve scroll on pagination prepend
 * @param {Function} [params.onSendRefused] - (refusal) => boolean: a send the server refused with a `code`; true when
 *   the screen explains it, then the refused message leaves the timeline and its text returns to an empty composer
 */
const useChatMessages = ({
    socket,
    userDetailInfo,
    chatLanguageInfo,
    platform,
    activePlatformTab,
    onConversationListUpdate,
    onConversationListUnread,
    scrollToBottomIfNeeded,
    scrollToBottom,
    preserveScrollPosition,
    /* GC-020: keep failed sends in the list marked status "failed" instead of
     * silently removing them (opt-in; legacy screens keep the old behaviour). */
    keepFailedMessages = false,
    onSendRefused,
}) => {
    const [messageList, setMessageList] = useState([]);
    const messageListRef = useRef(messageList);
    useEffect(() => { messageListRef.current = messageList; }, [messageList]);
    const [message, setMessage] = useState('');
    const [paginateData, setPaginateData] = useState('');

    const draftSid = userDetailInfo?.conversation_sid;
    const skipDraftSaveRef = useRef(false);
    useEffect(() => {
        skipDraftSaveRef.current = true;
        if (!draftSid) return;
        const stored = loadChatDraft(draftSid, platform);
        if (stored) setMessage((prev) => prev || stored);
    }, [draftSid, platform]);
    useEffect(() => {
        if (skipDraftSaveRef.current) { skipDraftSaveRef.current = false; return; }
        if (draftSid) saveChatDraft(draftSid, platform, message);
    }, [draftSid, platform, message]);
    const [isPaginateDelay, setIsPaginateDelay] = useState(true);
    const [newMessageCount, setNewMessageCount] = useState(0);
    const dispatch = useDispatch();
    const { allMessageList, messageStatus, restrictedKey } = useSelector((state) => state.chat);

    const isFetchingRef = useRef(false);
    const debounceTimeoutRef = useRef(null);
    const audioRef = useRef(null);

    // Restricted keyword check
    const isRestricted = useMemo(() => {
        if (!restrictedKey?.original?.data || !Array.isArray(restrictedKey.original.data)) return false;
        const msg = message.toLowerCase();
        return restrictedKey.original.data.some(keyword =>
            keyword && msg.includes(keyword.name.toLowerCase())
        );
    }, [message, restrictedKey]);

    // Fetch restricted keywords once
    useEffect(() => {
        if (!restrictedKey?.original?.data) {
            dispatch(fetchRestrictedKey());
        }
    }, [dispatch, restrictedKey?.original?.data]);

    // Play notification sound (single audio instance)
    const playNotification = useCallback(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio(notificationSound);
        }
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => { });
    }, []);

    // Append a single message to the end
    const appendMsg = useCallback((msg) => {
        setMessageList((prev) => [...prev, msg]);
    }, []);

    // Map raw API messages to display format
    const mapRawMessages = useCallback((rawMessages) => {
        const currentUserId = getCurrentUser()?.data?.id;
        return rawMessages.map((msg) => {
            const msgDirection = String(msg?.sender_id) === String(currentUserId) ? 'send' : 'recieve';
            const body = getTranslatedBody(msg, chatLanguageInfo, msgDirection);
            return buildDisplayMsg({
                msg,
                conversationSid: userDetailInfo?.conversation_sid,
                msgDirection,
                body,
                extraFields: {
                    status: msg?.status,
                    read_status: msg?.read_status,
                    role_name: msg?.type === "GROUP" ? msg?.role_type : msg?.role_name,
                    email: msg?.email,
                },
            });
        });
    }, [chatLanguageInfo, userDetailInfo?.conversation_sid]);

    // Process allMessageList from Redux when it changes
    useEffect(() => {
        if (allMessageList) {
            setPaginateData(allMessageList?.LastEvaluatedKey ?? '');
            const tempList = mapRawMessages(allMessageList?.data ?? []);
            setMessageList(tempList);
            // Use rAF for scroll after React renders
            requestAnimationFrame(() => {
                scrollToBottom('auto');
            });
        }
    }, [allMessageList, mapRawMessages, scrollToBottom]);

    // Set entity link message
    useEffect(() => {
        if (userDetailInfo?.entity_id) {
            if (userDetailInfo?.media_type === "job") {
                setMessage(`<a target="_blank" class="blue" href="${ userDetailInfo?.media_link }">#${ userDetailInfo?.entity_job_id }(${ userDetailInfo?.entity_name } )</a>`);
            } else {
                setMessage(`<a target="_blank" class="blue" href="${ userDetailInfo?.media_link }">${ userDetailInfo?.entity_name } ${ userDetailInfo?.entity_job_id }</a>`);
            }
        }
    }, [userDetailInfo?.entity_id, userDetailInfo?.media_type, userDetailInfo?.media_link, userDetailInfo?.entity_job_id, userDetailInfo?.entity_name]);

    // Prepend historical messages (pagination scroll-up) with scroll preservation
    const pushHistoricalChatByPage = useCallback((oldMessages) => {
        const currentUserId = getCurrentUser()?.data?.id;
        const allMessages = oldMessages.map((msg) => {
            const msgDirection = String(msg?.sender_id) === String(currentUserId) ? 'send' : 'recieve';
            const body = getTranslatedBody(msg, chatLanguageInfo, msgDirection);
            return buildDisplayMsg({
                msg,
                conversationSid: userDetailInfo?.conversation_sid,
                msgDirection,
                body,
                extraFields: {
                    role_name: msg?.type === "GROUP" ? msg?.role_type : msg?.role_name,
                },
            });
        });
        // Capture scroll position before prepending
        const restoreScroll = preserveScrollPosition ? preserveScrollPosition() : () => {};
        setMessageList((prev) => {
            // Schedule restore after React commits the DOM update
            requestAnimationFrame(() => restoreScroll());
            return [...allMessages, ...prev];
        });
    }, [userDetailInfo?.conversation_sid, chatLanguageInfo, preserveScrollPosition]);

    // Fetch previous page of messages
    const fetchPreviousPage = useCallback(async () => {
        if (paginateData && isPaginateDelay) {
            setIsPaginateDelay(false);
            try {
                const messageData = await dispatch(fetchMessageListWithKey({
                    sid: userDetailInfo?.conversation_sid,
                    limit: 10,
                    ExclusiveStartKey: paginateData,
                    platform: platform,
                })).unwrap();
                if (messageData) {
                    setPaginateData(messageData?.LastEvaluatedKey);
                    if (messageData?.data) {
                        pushHistoricalChatByPage(messageData?.data);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch previous messages:", err);
            } finally {
                setIsPaginateDelay(true);
            }
        }
    }, [paginateData, isPaginateDelay, userDetailInfo?.conversation_sid, dispatch, platform, pushHistoricalChatByPage]);

    // Scroll handler: fetch older messages when scrolled to top
    const handleMessagesScroll = useCallback((e) => {
        const currentScrollTop = e.target.scrollTop;
        if (currentScrollTop === 0 && !isFetchingRef.current) {
            isFetchingRef.current = true;
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
            debounceTimeoutRef.current = setTimeout(async () => {
                try {
                    await fetchPreviousPage();
                } finally {
                    isFetchingRef.current = false;
                }
            }, 300);
        }
    }, [fetchPreviousPage]);

    // Handle received message from socket
    const handleReceivedMsg = useCallback((msg, userDetailInfoChat) => {
        if (!msg?.status) {
            /* CH-1: a coded refusal (e.g. CONTACT_SHARING_BLOCKED) means the message was not stored */
            if (msg?.code && onSendRefused && onSendRefused(msg)) {
                const refused = findRefusedMessage(messageListRef.current);
                if (refused) {
                    setMessageList(prev => prev.filter(item => item !== refused));
                    if (refused.body) setMessage(prev => prev || refused.body);
                }
                return;
            }
            if (keepFailedMessages) {
                setMessageList(prev => prev.map(item => (
                    (item.id === "" || item.id === null) ? { ...item, status: "failed" } : item
                )));
            } else {
                setMessageList(prev => prev.filter(item => item.id !== "" && item.id !== null));
                ShowToast("error", translation(msg?.message));
            }
            return;
        }
        const currentUserId = getCurrentUser()?.data?.id;
        const msgDirection = String(msg.data.created_by) === String(currentUserId) ? 'send' : 'recieve';
        const body = getTranslatedBody(msg.data, chatLanguageInfo, msgDirection);

        if (String(msg.data.created_by) === String(currentUserId)) {
            // Own message - update placeholder or append (template messages)
            const isTemplate = platform === 'app'
                ? msg.data?.isInAppTemplates === "yes"
                : msg.data?.isWhatsTemplate === "yes";

            if (isTemplate) {
                const displayMsg = buildDisplayMsg({
                    msg: msg.data,
                    conversationSid: userDetailInfoChat?.conversation_sid,
                    msgDirection,
                    body,
                    extraFields: { email: msg.data?.email },
                });
                appendMsg(displayMsg);
            } else {
                setMessageList((prevData) =>
                    prevData.map((item) =>
                        item.id === "" ? {
                            ...item,
                            id: msg.data.id,
                            body: body,
                            content_id: msg.data?.content_id,
                            content_en: msg.data?.content_en,
                            content_zh_cn: msg.data?.content_zh_cn,
                            content_zh_tw: msg.data?.content_zh_tw,
                            source_language: msg.data?.source_language,
                            media_type: msg.data.media_type,
                            media_link: msg.data.media_link,
                            profile_image: msg.data?.profile_image,
                            full_name: msg.data?.full_name,
                            role_name: msg?.type === "GROUP" ? msg?.role_type : msg?.role_name,
                        } : item
                    )
                );
            }
            scrollToBottom();
        } else {
            // Received message - append if it belongs to current conversation
            const shouldAppend = userDetailInfoChat?.user_type === "group_team"
                ? String(userDetailInfoChat?.conversation_sid) === String(msg.data.conversation_sid)
                : String(userDetailInfoChat?.user_id) === String(msg.data.sender_id);

            if (shouldAppend) {
                const displayMsg = buildDisplayMsg({
                    msg: msg.data,
                    conversationSid: userDetailInfoChat?.conversation_sid,
                    msgDirection,
                    body,
                    extraFields: {
                        role_name: msg.data?.type === "GROUP" ? msg.data?.role_type : msg.data?.role_name,
                        email: msg.data?.email,
                    },
                });
                appendMsg(displayMsg);
                scrollToBottomIfNeeded();
            }
        }

        if (msgDirection === 'recieve') {
            playNotification();
            if (userDetailInfoChat?.conversation_sid === msg.data.conversation_sid) {
                setNewMessageCount(prev => prev + 1);
            }
        }
    }, [chatLanguageInfo, platform, appendMsg, scrollToBottom, scrollToBottomIfNeeded, playNotification, keepFailedMessages, onSendRefused]);

    // Handle broadcast message (receive_message_all)
    const handleMessageAll = useCallback((msg) => {
        if (getCurrentUser()?.data?.id === msg?.receiver_id) {
            playNotification();
        }
        if (onConversationListUpdate) {
            onConversationListUpdate(msg);
        }
    }, [playNotification, onConversationListUpdate]);

    // Handle message status update (WhatsApp read receipts)
    const handleReceiveMessageStatus = useCallback((msg) => {
        if (!msg?.status) {
            if (keepFailedMessages) {
                setMessageList(prev => prev.map(item => (
                    (item.id === "" || item.id === null) ? { ...item, status: "failed" } : item
                )));
            } else {
                setMessageList(prev => prev.filter(item => item.id !== "" && item.id !== null));
                ShowToast("error", translation(msg?.message));
            }
            return;
        }
        if (msg.data?.id) {
            setMessageList(prev => applyMessageStatus(prev, msg.data));
        }
    }, [keepFailedMessages]);

    // Socket listeners - only active for current platform tab
    useEffect(() => {
        if (activePlatformTab !== platform) return;
        if (!socket) return;

        const handleMessage = (msg) => handleReceivedMsg(msg, userDetailInfo);
        const handleAllMsg = (msg) => handleMessageAll(msg.data);
        const handleStatus = (msg) => handleReceiveMessageStatus(msg, userDetailInfo);
        const handleDeleted = (msg) => {
            const deletedId = msg?.data?.message_id;
            if (!deletedId) return;
            setMessageList(prev => prev.filter(item => String(item.id) !== String(deletedId)));
        };

        socket.on('receive_message', handleMessage);
        socket.on('delete_message', handleDeleted);
        socket.on('receive_message_all', handleAllMsg);
        if (platform === 'whatsapp') {
            socket.on('receive_message_status', handleStatus);
        }

        return () => {
            socket.off('receive_message', handleMessage);
            socket.off('delete_message', handleDeleted);
            socket.off('receive_message_all', handleAllMsg);
            if (platform === 'whatsapp') {
                socket.off('receive_message_status', handleStatus);
            }
        };
    }, [socket, userDetailInfo, activePlatformTab, platform, handleReceivedMsg, handleMessageAll, handleReceiveMessageStatus]);

    // Clear messages when switching tabs
    useEffect(() => {
        if (activePlatformTab !== platform) {
            setMessageList([]);
            setNewMessageCount(0);
        }
    }, [activePlatformTab, platform]);

    // Cleanup debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    // Scroll to bottom and clear new message count
    const handleScrollToBottom = useCallback(() => {
        setNewMessageCount(0);
        scrollToBottom();
        if (onConversationListUnread) {
            onConversationListUnread(userDetailInfo?.conversation_sid);
        }
    }, [userDetailInfo?.conversation_sid, scrollToBottom, onConversationListUnread]);

    return {
        messageList,
        message,
        setMessage,
        messageStatus,
        isRestricted,
        newMessageCount,
        paginateData,
        appendMsg,
        handleMessagesScroll,
        handleScrollToBottom,
        setNewMessageCount,
        setMessageList,
    };
};

export default useChatMessages;
