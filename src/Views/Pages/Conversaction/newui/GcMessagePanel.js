import React, { lazy, memo, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import GcIcon from "./gcIcons";
import GcMessageBubble from "./GcMessageBubble";
import ChatLoader from "../../../../components/ReusableComponents/chatLoader";
import translation from "../../../../utils/translation";
import useChatAutoScroll from "../hooks/useChatAutoScroll";
import useChatMessages from "../hooks/useChatMessages";
import useGcComposer from "./useGcComposer";
import { GC_CHANNEL_META, gcBlockCheck, gcDayLabel, gcGroupName, gcGroupParts, gcWaWindow, gcParseShareLink, gcMessageMatches } from "./gcHelpers";
import { GC_COMPOSER_COPY, GC_SEARCH_COPY, LANG_FIELD } from "./gcConstants";
import { gcRefusalBlockedHit } from "./gcRefusal";

const FilePreviewModal = lazy(() => import("./GcFilePreview"));

/**
 * Unified timeline + composer for the Global Chat new UI. All message
 * behaviour (socket receive, pagination, restricted words, notifications)
 * comes from the shared useChatMessages hook, unchanged.
 */
const GcMessagePanel = ({
    socket,
    userDetailInfo,
    group,
    platform,
    isChatOpen,
    chatLanguageInfo,
    translateMode,
    onConversationListUpdate,
    onConversationListUnread,
    onOutboundSent,
    onOpenMessageTemplate,
    channels,
    onUseChannel,
    onFailedDraftToInApp,
    initialDraft,
    onInitialDraftConsumed,
    emptyLabel,
    compactMeta,
    searchOpen,
    searchQuery,
    onSearchChange,
    onSearchClose,
}) => {
    const {
        messagesEndRef,
        containerRef,
        scrollToBottom,
        scrollToBottomIfNeeded,
        preserveScrollPosition,
    } = useChatAutoScroll();

    const [blockedHit, setBlockedHit] = useState(null);
    const handleBlocked = useCallback((hit) => {
        setBlockedHit(hit);
        if (hit) requestAnimationFrame(() => scrollToBottom());
    }, [scrollToBottom]);
    /* CH-1: the server refused a group send (GC-016) — the same banner the client-side check shows */
    const handleSendRefused = useCallback((refusal) => {
        const hit = gcRefusalBlockedHit(refusal);
        if (hit) handleBlocked(hit);
        return Boolean(hit);
    }, [handleBlocked]);

    const {
        messageList,
        message,
        setMessage,
        messageStatus,
        isRestricted,
        newMessageCount,
        handleMessagesScroll,
        handleScrollToBottom,
        appendMsg,
        setMessageList,
    } = useChatMessages({
        socket,
        userDetailInfo,
        chatLanguageInfo,
        platform,
        activePlatformTab: platform,
        onConversationListUpdate,
        onConversationListUnread,
        scrollToBottomIfNeeded,
        scrollToBottom,
        preserveScrollPosition,
        keepFailedMessages: true,
        onSendRefused: handleSendRefused,
    });

    const [attachment, setAttachment] = useState(null);
    useEffect(() => {
        const parsed = gcParseShareLink(message);
        if (!parsed) return;
        setAttachment({ body: message, ...parsed });
        setMessage("");
    }, [message, setMessage]);
    useEffect(() => { setAttachment(null); }, [userDetailInfo?.conversation_sid]);
    const clearAttachment = useCallback(() => setAttachment(null), []);
    /* the unsent draft is kept per conversation inside useChatMessages (SH-07) */

    const waWin = platform === "whatsapp" ? gcWaWindow(userDetailInfo) : { state: "open", label: null };
    const waState = waWin.state === "warn" ? "open" : waWin.state;
    const isWaLocked = platform === "whatsapp" && waState !== "open";

    /* A failed WhatsApp message moved to In-App arrives as the opening draft. */
    useEffect(() => {
        if (initialDraft) {
            setMessage(initialDraft);
            if (onInitialDraftConsumed) onInitialDraftConsumed();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setMessageList((prev) => {
                let changed = false;
                const next = prev.map((item) => {
                    if ((item.id === "" || item.id === null)
                        && item.media_type === "text"
                        && item.status !== "failed"
                        && item.createdAtRaw
                        && Date.now() - new Date(item.createdAtRaw).getTime() > 20000) {
                        changed = true;
                        return { ...item, status: "failed" };
                    }
                    return item;
                });
                return changed ? next : prev;
            });
        }, 5000);
        return () => clearInterval(timer);
    }, [setMessageList]);

    const [, setWaTick] = useState(0);
    useEffect(() => {
        if (platform !== "whatsapp") return undefined;
        const timer = setInterval(() => setWaTick((n) => n + 1), 60000);
        return () => clearInterval(timer);
    }, [platform]);
    const isInputDisabled = isChatOpen || isWaLocked;
    const isGroupTeam = group?.friendType === "group_team";

    const {
        fileInputRef,
        previewFileUrl,
        setPreviewFileUrl,
        handleSendMessage,
        sendTextBody,
        handleAttachmentClick,
        handleFileChange,
        handleKeyDown,
        handleDownload,
        handleDelete,
    } = useGcComposer({
        socket,
        userDetailInfo,
        platform,
        isRestricted,
        isSendDisabled: isRestricted || isInputDisabled,
        message,
        setMessage,
        appendMsg,
        setMessageList,
        scrollToBottom,
        guardMessage: isGroupTeam ? gcBlockCheck : undefined,
        onBlocked: handleBlocked,
        onSent: onOutboundSent,
        attachment,
        clearAttachment,
    });

    const handlePreviewFile = useCallback((fileUrl) => {
        if (!fileUrl) return;
        setPreviewFileUrl(fileUrl);
    }, [setPreviewFileUrl]);

    const removeFailedMsg = useCallback((msg) => {
        setMessageList((prev) => prev.filter((item) => !(
            item.status === "failed" && item.createdAtRaw === msg.createdAtRaw
        )));
    }, [setMessageList]);

    const handleRetryFailed = useCallback((msg) => {
        removeFailedMsg(msg);
        sendTextBody(msg.body);
    }, [removeFailedMsg, sendTextBody]);

    const handleFailedUseInApp = useCallback((msg) => {
        removeFailedMsg(msg);
        if (onFailedDraftToInApp) onFailedDraftToInApp(msg.body);
    }, [removeFailedMsg, onFailedDraftToInApp]);

    const chanMeta = GC_CHANNEL_META[platform];
    const hasDraft = message.trim().length > 0 || Boolean(attachment);
    /* "Write to <name>…": the contact's name (prototype c.name), the employer's for a group conversation */
    const writeToName = group
        ? (gcGroupParts(group.latestRow)?.employer || gcGroupName(group))
        : userDetailInfo?.name;
    /* the lock panel offers every other channel this contact has (prototype "Use <channel>") */
    const fallbackChannels = (channels || ["app"]).filter((channelId) => channelId !== platform && GC_COMPOSER_COPY.useChannel[channelId]);

    /* search in conversation: filters the loaded messages by original text, translation and sender;
     * a day separator survives only above a message that survives */
    const searchTerm = searchOpen ? String(searchQuery || "").trim().toLowerCase() : "";
    const translationField = LANG_FIELD[chatLanguageInfo?.chat_translate_language];
    const visibleMessages = useMemo(
        () => (searchTerm ? messageList.filter((msg) => gcMessageMatches(msg, searchTerm, translationField)) : messageList),
        [messageList, searchTerm, translationField]
    );
    const searchCount = searchTerm
        ? `${ visibleMessages.length } ${ visibleMessages.length === 1 ? GC_SEARCH_COPY.messageOne : GC_SEARCH_COPY.messageOther }`
        : "";

    const renderComposer = () => {
        if (isWaLocked) {
            return (
                <div className="gc-composer">
                    <div className="gc-wa-required">
                        <span className="gc-wr-t">
                            <GcIcon name="lock" />
                            { waState === "expired"
                                ? translation("key_wa_template_required")
                                : translation("key_wa_first_contact_template") }
                        </span>
                        { hasDraft && (
                            <span className="gc-wr-draft"><GcIcon name="check" />{ translation("key_draft_preserved") }</span>
                        ) }
                        <div className="gc-wr-actions">
                            <button type="button" className="gc-btn gc-btn-primary" onClick={ onOpenMessageTemplate }>
                                <GcIcon name="template" />{ translation("key_send_template") }
                            </button>
                            { fallbackChannels.map((channelId) => (
                                <button key={ channelId } type="button" className="gc-btn gc-btn-secondary" onClick={ () => onUseChannel(channelId) }>
                                    { GC_COMPOSER_COPY.useChannel[channelId] }
                                </button>
                            )) }
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className="gc-composer">
                <textarea
                    className="gc-composer-input"
                    rows={ 1 }
                    disabled={ isInputDisabled }
                    value={ message }
                    placeholder={ writeToName
                        ? `${ translation("key_write_to") } ${ writeToName }…`
                        : translation("key_type_a_message") }
                    onChange={ (e) => setMessage(e.target.value) }
                    onKeyDown={ handleKeyDown }
                />
                <button
                    type="button"
                    className="gc-send-btn"
                    disabled={ isRestricted || isInputDisabled }
                    onClick={ handleSendMessage }
                    aria-label={ translation("key_send") }
                >
                    <GcIcon name="send" />
                </button>
            </div>
        );
    };

    return (
        <>
            { searchOpen && (
                <div className="gc-th-search">
                    <GcIcon name="search" />
                    <input
                        type="text"
                        autoFocus
                        autoComplete="off"
                        spellCheck={ false }
                        placeholder={ GC_SEARCH_COPY.placeholder }
                        aria-label={ GC_SEARCH_COPY.placeholder }
                        value={ searchQuery }
                        onChange={ (e) => onSearchChange(e.target.value) }
                        onKeyDown={ (e) => { if (e.key === "Escape") onSearchClose(); } }
                    />
                    <span className="gc-th-search-count">{ searchCount }</span>
                    <button type="button" className="gc-icon-btn" onClick={ onSearchClose } title={ GC_SEARCH_COPY.close } aria-label={ GC_SEARCH_COPY.close }>
                        <GcIcon name="close" />
                    </button>
                </div>
            ) }
            <div
                ref={ containerRef }
                className="gc-timeline"
                onScroll={ handleMessagesScroll }
            >
                { messageStatus === "loading" && userDetailInfo?.conversation_sid && <ChatLoader /> }
                { emptyLabel && messageStatus !== "loading" && messageList.length === 0 && (
                    <div className="gc-empty-channel">{ emptyLabel }</div>
                ) }
                { searchTerm && visibleMessages.length === 0 && (
                    <div className="gc-th-search-empty">
                        <GcIcon name="search" />
                        { `${ GC_SEARCH_COPY.noMatch } “${ String(searchQuery).trim() }”.` }
                    </div>
                ) }
                { visibleMessages.map((msg, index) => {
                    const day = gcDayLabel(msg.createdAtRaw);
                    const prevDay = index > 0 ? gcDayLabel(visibleMessages[index - 1]?.createdAtRaw) : null;
                    return (
                        <React.Fragment key={ msg.id || `${ msg.vector }-${ index }` }>
                            { day && day !== prevDay && <div className="gc-day-sep">{ day }</div> }
                            <GcMessageBubble
                                msg={ msg }
                                platform={ platform }
                                isGroupTeam={ isGroupTeam }
                                translateMode={ translateMode }
                                chatLanguageInfo={ chatLanguageInfo }
                                onPreviewFile={ handlePreviewFile }
                                onDownload={ handleDownload }
                                onDelete={ handleDelete }
                                waWindowClosed={ isWaLocked }
                                compactMeta={ compactMeta }
                                onRetryFailed={ handleRetryFailed }
                                onFailedUseInApp={ platform === "whatsapp" ? handleFailedUseInApp : undefined }
                                onOpenMessageTemplate={ onOpenMessageTemplate }
                                highlight={ searchTerm }
                            />
                        </React.Fragment>
                    );
                }) }
                { blockedHit && (
                    /* immediate client-side guidance; the server stays the authority. The draft is kept. */
                    <div className="gc-sys-banner">
                        <GcIcon name="warn" />
                        <div>
                            <b>
                                { translation("key_group_msg_blocked") } { blockedHit.reasonKey ? translation(blockedHit.reasonKey) : "" }
                                { blockedHit.snippet ? ` (“${ blockedHit.snippet }”)` : "" }.
                            </b>{ " " }
                            { translation("key_group_blocked_note") }
                            <br />
                            <span className="gc-sys-zh">{ GC_COMPOSER_COPY.blockedNoteZh }</span>
                            <br />
                            <span className="gc-sys-fine">{ GC_COMPOSER_COPY.blockedServerNote }</span>
                        </div>
                    </div>
                ) }
                <div ref={ messagesEndRef } />
            </div>

            { newMessageCount > 0 && (
                <button type="button" className="gc-new-msg-badge" onClick={ handleScrollToBottom }>
                    <GcIcon name="arrowDownDouble" />
                    { newMessageCount }
                </button>
            ) }

            <div className="gc-composer-zone">
                { /* @migration-unspecified(chat): spec is silent on the server restricted-words check (get-restricted-Key) and its strip.
                     Retained existing behaviour. Confirm with product before release. */ }
                { isRestricted && (
                    <div className="gc-restricted-note">{ translation("key_restricted_word_used") }</div>
                ) }
                { platform === "whatsapp" && waWin.state === "warn" && (
                    <div className="gc-wa-notice">
                        <GcIcon name="clock" />
                        { translation("key_wa_window_closes_in") } { waWin.label ? waWin.label.replace(/^0h /, "").replace(/m$/, ` ${ translation("key_minutes") }`) : "" }
                    </div>
                ) }
                { attachment && !isWaLocked && (
                    <div className="gc-composer-attach gc-attach-block">
                        <span className="gc-al-ico"><GcIcon name="job" /></span>
                        <span className="gc-al-main">
                            <span className="gc-al-t">{ translation(attachment.titleKey) }</span>
                            <span className="gc-al-s">{ attachment.label }</span>
                        </span>
                        <button type="button" className="gc-attach-remove gc-attach-remove-text" onClick={ clearAttachment }>
                            { translation("key_remove") }
                        </button>
                    </div>
                ) }
                <div className="gc-composer-toolbar">
                    <button type="button" className="gc-icon-btn tip" onClick={ onOpenMessageTemplate } data-tip={ translation("key_send_template") } aria-label={ translation("key_send_template") }>
                        <GcIcon name="template" />
                    </button>
                    <button type="button" className="gc-icon-btn tip" onClick={ handleAttachmentClick } disabled={ isInputDisabled } data-tip={ translation("key_attach_file") } aria-label={ translation("key_attach_file") }>
                        <GcIcon name="attach" />
                    </button>
                    <input type="file" ref={ fileInputRef } className="d-none" onChange={ handleFileChange } disabled={ isInputDisabled } />
                    <span className="gc-via">
                        { platform === "whatsapp" && waState === "open" && (
                            <span className={ `gc-wa-window-chip ${ waWin.state === "warn" ? "warn" : "open" }` }>
                                <GcIcon name="clock" />
                                { waWin.state === "warn" ? translation("key_window_closing") : translation("key_free_text_open") }
                                { waWin.label && ` · ${ waWin.label } ${ translation("key_left") }` }
                            </span>
                        ) }
                        { platform === "whatsapp" && isWaLocked && (
                            <span className="gc-wa-window-chip closed">
                                <GcIcon name="lock" />
                                { waState === "expired" ? translation("key_window_expired") : translation("key_awaiting_first_reply") }
                            </span>
                        ) }
                        { translation("key_sending_via") } <GcIcon name={ chanMeta.icon } /><b>{ chanMeta.label }</b>
                    </span>
                </div>
                { renderComposer() }
            </div>

            { previewFileUrl && (
                <Suspense fallback={ null }>
                    <FilePreviewModal onClose={ () => setPreviewFileUrl(null) } filePath={ previewFileUrl } />
                </Suspense>
            ) }
        </>
    );
};

GcMessagePanel.propTypes = {
    emptyLabel: PropTypes.node,
    compactMeta: PropTypes.bool,
    searchOpen: PropTypes.bool,
    searchQuery: PropTypes.string,
    onSearchChange: PropTypes.func,
    onSearchClose: PropTypes.func,
    onFailedDraftToInApp: PropTypes.func,
    initialDraft: PropTypes.string,
    onInitialDraftConsumed: PropTypes.func,
    socket: PropTypes.any,
    userDetailInfo: PropTypes.object,
    group: PropTypes.object,
    platform: PropTypes.oneOf(["app", "whatsapp", "line"]).isRequired,
    isChatOpen: PropTypes.bool,
    chatLanguageInfo: PropTypes.object,
    translateMode: PropTypes.string.isRequired,
    onConversationListUpdate: PropTypes.func,
    onConversationListUnread: PropTypes.func,
    onOutboundSent: PropTypes.func,
    onOpenMessageTemplate: PropTypes.func.isRequired,
    channels: PropTypes.arrayOf(PropTypes.string),
    onUseChannel: PropTypes.func.isRequired,
};

export default memo(GcMessagePanel);
