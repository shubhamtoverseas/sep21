import React, { useState, useCallback, useRef, lazy, memo } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import emojiIcon from "../../../../assets/img/svg/emoji-icon.svg";
import closeButton from "../../../../assets/img/svg/close-red.svg";
import attachmentIcon from "../../../../assets/img/svg/attachment-icon.svg";
import messageSendIcon from "../../../../assets/img/paper-plane.png";
import userImg from "../../../../assets/img/user-icon.png";
import arrowDownDoubleIcon from "../../../../assets/img/svg/arrow-down-double.svg";
import { getAccessToken, getCurrentUser, getMessagesHeight } from "../../../../services/commonService";
import { uploadChatFile } from "../../../../services/commonService";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { setChatMediaLoading, clearChatMediaLoading } from '../../../../redux/Slices/chat/ChatSlice';
import ChatLoader from "../../../../components/ReusableComponents/chatLoader";
import translation from "../../../../utils/translation";
import MessageInput from "../../../../components/chat/MessageInput";
import MessageBubble from "./MessageBubble";
import useChatAutoScroll from "../hooks/useChatAutoScroll";
import useChatMessages from "../hooks/useChatMessages";
import { formatTo12HourTime, formatToRailTime, formatToRailDay } from "../hooks/useChatMessages";
import "../chat.css";

const EmojiPicker = lazy(() => import("emoji-picker-react"));
const FilePreviewModal = lazy(() => import("../../../../components/popups/FilePreviewModal"));

// Static styles (avoid re-creation)
const emojiPickerContainerStyle = {
    position: "absolute",
    bottom: "41px",
    left: "80px",
    zIndex: "1000",
    border: "1px solid #ccc",
    borderRadius: "10px",
    backgroundColor: "#fff",
};
const emojiCloseButtonStyle = { border: "1px solid #fff" };
const newMessageIconStyle = { fontSize: 18, display: 'flex', alignItems: 'center' };

/**
 * ChatMessagePanel - Unified message display panel for all platforms.
 * Replaces MobileTab, WhatsAppTab, and LineTab with a single component.
 * 
 * @param {Object} props
 * @param {Object} props.socket - Socket.io instance
 * @param {Object} props.userDetailInfo - Current conversation/user info
 * @param {boolean} props.isChatOpen - Whether input should be disabled
 * @param {Object} props.chatLanguageInfo - Translation settings
 * @param {string} props.platform - "app" | "whatsapp" | "line"
 * @param {string} props.activePlatformTab - Currently active social tab ("mobile" | "whatsapp" | "line")
 * @param {Function} props.onConversationListUpdate - Callback for conversation list updates
 * @param {Function} props.onConversationListUnread - Callback to clear unread count
 * @param {number|string} props.containerHeight - Optional container height override
 * @param {boolean} props.isSentMessageDisabled - Whether to disable send (WhatsApp session expired)
 */
const ChatMessagePanel = ({
    socket,
    userDetailInfo,
    isChatOpen,
    chatLanguageInfo,
    platform,
    activePlatformTab,
    onConversationListUpdate,
    onConversationListUnread,
    containerHeight,
    isSentMessageDisabled = false,
}) => {
    const dispatch = useDispatch();
    const [showPicker, setShowPicker] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewFileUrl, setPreviewFileUrl] = useState(null);
    const [inputHeight, setInputHeight] = useState(38);
    const fileInputRef = useRef(null);

    // Auto-scroll hook
    const {
        messagesEndRef,
        containerRef,
        scrollToBottom,
        scrollToBottomIfNeeded,
        preserveScrollPosition,
    } = useChatAutoScroll();

    // Message management hook
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
        activePlatformTab,
        onConversationListUpdate,
        onConversationListUnread,
        scrollToBottomIfNeeded,
        scrollToBottom,
        preserveScrollPosition,
    });

    // --- Send message ---
    const handleSendMessage = useCallback(() => {
        if (message.trim() === '') return;
        if (isSentMessageDisabled && platform === 'whatsapp') return;

        const msg = {
            conversation_sid: userDetailInfo?.conversation_sid,
            token: getAccessToken(),
            body: message,
            message_type: "text",
            media_type: "text",
            media_link: "",
            entity_id: null,
            profile_image: userImg,
            full_name: platform === 'whatsapp' ? (getCurrentUser()?.data?.staff?.first_name || "") : "",
            email: platform === 'whatsapp' ? (getCurrentUser()?.data?.email || "") : "",
            platform: platform === 'app' ? 'app' : platform,
            ...(platform === 'whatsapp' && {
                whatsapp_mobile_number: userDetailInfo?.whatsapp_number || "",
                friend_id: userDetailInfo?.user_id || "",
            }),
        };

        setMessage('');

        const displayMsg = {
            conversation_sid: userDetailInfo?.conversation_sid,
            id: "",
            body: message,
            vector: 'send',
            media_type: "text",
            media_link: null,
            read_status: "unread",
            profile_image: userImg,
            full_name: platform === 'whatsapp' ? (getCurrentUser()?.data?.staff?.first_name || "") : "",
            email: platform === 'whatsapp' ? (getCurrentUser()?.data?.email || "") : "",
            chatDateTime: formatTo12HourTime(new Date().toISOString()),
            timeHM: formatToRailTime(new Date().toISOString()),
            dayLabel: formatToRailDay(new Date().toISOString()),
            status: "sending"
        };

        appendMsg(displayMsg);

        if (userDetailInfo?.entity_id) {
            msg.entity_id = userDetailInfo.entity_id;
        }
        if (userDetailInfo?.entity_type) {
            msg.entity_type = userDetailInfo.entity_type;
        }

        if (socket) {
            socket.emit('send_message', msg);
        }
        // Defer scroll so React renders the new message first
        requestAnimationFrame(() => scrollToBottom());
    }, [message, userDetailInfo, socket, platform, isSentMessageDisabled, appendMsg, setMessage, scrollToBottom]);

    // --- Send media ---
    const handleSendMediaMessage = useCallback((mediaType, url, fileName) => {
        const msg = {
            conversation_sid: userDetailInfo?.conversation_sid,
            token: getAccessToken(),
            body: fileName,
            message_type: mediaType,
            media_type: mediaType,
            media_link: url,
            entity_id: null,
            profile_image: userImg,
            full_name: "",
            platform: platform === 'app' ? 'app' : platform,
            ...(platform === 'whatsapp' && {
                whatsapp_mobile_number: userDetailInfo?.whatsapp_number || "",
                friend_id: userDetailInfo?.user_id || "",
            }),
        };
        setMessage('');
        if (socket) {
            socket.emit('send_message', msg);
        }
    }, [userDetailInfo, socket, platform, setMessage]);

    // --- File handling ---
    const handleAttachmentClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fileType = file.type.split('/')[0];
        const fileExtension = file.name.split('.').pop().toLowerCase();
        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
        const validFileExtensions = ['pdf', 'doc', 'docx'];

        if (fileType === 'image' && !validImageTypes.includes(file.type)) {
            ShowToast("error", translation('key_invalid_image_file_type'));
            return;
        }
        if (fileType !== 'image' && !validFileExtensions.includes(fileExtension)) {
            ShowToast("error", translation('key_invalid_file_type'));
            return;
        }

        try {
            const mediaType = fileType === 'image' ? 'image' : 'file';
            dispatch(setChatMediaLoading());

            const displayMsg = {
                conversation_sid: userDetailInfo?.conversation_sid,
                id: "",
                body: file.name,
                vector: 'send',
                media_type: mediaType,
                media_link: null,
                read_status: "unread",
                profile_image: userImg,
                chatDateTime: formatTo12HourTime(new Date().toISOString()),
                timeHM: formatToRailTime(new Date().toISOString()),
                dayLabel: formatToRailDay(new Date().toISOString()),
                status: "sending"
            };
            appendMsg(displayMsg);

            const filesToUpload = [{ file: file, name: "chat" }];
            const uploadedFileResponse = await uploadChatFile(filesToUpload);
            if (fileInputRef.current) fileInputRef.current.value = '';
            dispatch(clearChatMediaLoading());
            handleSendMediaMessage(mediaType, uploadedFileResponse.url, file.name);
        } catch (error) {
            dispatch(clearChatMediaLoading());
            ShowToast("error", String(error));
        }
    }, [dispatch, userDetailInfo, appendMsg, handleSendMediaMessage]);

    // --- Keyboard ---
    const handleKeyDown = useCallback((e) => {
        if (isRestricted) return;
        if (e.key === "Enter") {
            e.preventDefault();
            handleSendMessage();
        }
    }, [isRestricted, handleSendMessage]);

    // --- Emoji ---
    const displayEmojiIcons = useCallback(() => {
        setShowPicker((prev) => !prev);
    }, []);

    const handleEmojiClick = useCallback((emojiObject) => {
        setMessage((prev) => prev + emojiObject.emoji);
        setShowPicker(false);
    }, [setMessage]);

    // --- File preview ---
    const handlePreviewFile = useCallback((fileUrl) => {
        setPreviewFileUrl(fileUrl);
        setShowPreviewModal(true);
    }, []);

    // --- Download ---
    const handleDownload = useCallback((url, media_type) => {
        if (media_type === 'file') {
            const link = document.createElement('a');
            link.href = url;
            link.download = 'file';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (media_type === 'image') {
            const newWindow = window.open(url, '_blank');
            if (newWindow) {
                setTimeout(() => {
                    const link = newWindow.document.createElement('a');
                    link.href = url;
                    link.download = url.split('/').pop();
                    newWindow.document.body.appendChild(link);
                    link.click();
                    newWindow.document.body.removeChild(link);
                    newWindow.close();
                }, 200);
            }
        }
    }, []);

    // --- Delete ---
    const handleDelete = useCallback((id) => {
        const deletePayload = {
            conversation_sid: userDetailInfo?.conversation_sid,
            token: getAccessToken(),
            message_id: id
        };
        socket?.emit('delete_message', deletePayload);
        setMessageList((prevList) => prevList.filter((el) => el.id !== id));
    }, [userDetailInfo, socket, setMessageList]);

    // --- Combined scroll handler ---
    const onScroll = useCallback((e) => {
        handleMessagesScroll(e);
    }, [handleMessagesScroll]);

    const isInputDisabled = isChatOpen || (isSentMessageDisabled && platform === 'whatsapp');

    return (
        <>
            <div
                ref={ containerRef }
                id="messages-container"
                style={ {
                    height: getMessagesHeight(containerHeight, inputHeight),
                    maxHeight: getMessagesHeight(containerHeight, inputHeight),
                    overflowY: 'auto'
                } }
                className={ `${ !containerHeight ? 'calculated-height' : '' } chat-window messages-window p12` }
                onScroll={ onScroll }
            >
                { showPreviewModal && (
                    <FilePreviewModal onClose={ () => setShowPreviewModal(false) } filePath={ previewFileUrl } />
                ) }
                { (messageStatus === 'loading' && userDetailInfo?.user_id) && <ChatLoader /> }
                { messageList.map((msg, index) => (
                    <React.Fragment key={ msg.id || `${ msg.vector }-${ index }` }>
                        { msg?.dayLabel && msg.dayLabel !== messageList[index - 1]?.dayLabel && (
                            // hidden by default (chat.css); shown only inside the worker rail chat
                            <div className="wkd-day-divider"><span>{ msg.dayLabel }</span></div>
                        ) }
                        <MessageBubble
                            msg={ msg }
                            index={ index }
                            totalMessages={ messageList.length }
                            userDetailInfo={ userDetailInfo }
                            chatLanguageInfo={ chatLanguageInfo }
                            onPreviewFile={ handlePreviewFile }
                            onDownload={ handleDownload }
                            onDelete={ handleDelete }
                        />
                    </React.Fragment>
                )) }
                <div ref={ messagesEndRef } />
            </div>

            {/* Input bar */ }
            <div className="px-3 py-2 border-top d-flex align-items-center sending-bar bg-white position-relative">
                {/* Restricted word warning */ }
                { isRestricted && (
                    <span className="text-danger chat-error-message">
                        { translation('key_restricted_word_used') || "Restricted words are not permitted." }
                    </span>
                ) }

                {/* New message badge */ }
                { newMessageCount > 0 && (
                    <div className="message-notification-badge" onClick={ handleScrollToBottom }>
                        <span style={ newMessageIconStyle }>
                            <img src={ arrowDownDoubleIcon } width={ 20 } alt="scroll down" />
                        </span>
                        <span>{ newMessageCount }</span>
                    </div>
                ) }

                {/* Emoji picker */ }
                { showPicker && (
                    <div style={ emojiPickerContainerStyle }>
                        <button
                            onClick={ () => setShowPicker(false) }
                            className="absolute right-0 top-0 px-2 py-1 rounded-full"
                            style={ emojiCloseButtonStyle }
                        >
                            <img src={ closeButton } alt="close" />
                        </button>
                        <EmojiPicker onEmojiClick={ handleEmojiClick } />
                    </div>
                ) }

                <img src={ emojiIcon } className="mr-2" onClick={ displayEmojiIcons } alt="emoji" />
                <img src={ attachmentIcon } className="mr-2" style={ { cursor: 'pointer' } } onClick={ handleAttachmentClick } alt="attach" />
                <input type="file" disabled={ isInputDisabled } id="file-upload" ref={ fileInputRef } style={ { display: 'none' } } onChange={ handleFileChange } />

                <MessageInput
                    message={ message }
                    setMessage={ setMessage }
                    handleKeyDown={ handleKeyDown }
                    placeholder={ translation('key_type_a_message') }
                    disabled={ isInputDisabled }
                    containerHeight={ containerHeight }
                    onHeightChange={ (h) => setInputHeight(h) }
                />

                <div
                    style={ { cursor: (isRestricted || isInputDisabled) ? 'not-allowed' : 'pointer', opacity: (isRestricted || isInputDisabled) ? 0.5 : 1 } }
                    onClick={ (isRestricted || isInputDisabled) ? undefined : handleSendMessage }
                >
                    <img src={ messageSendIcon } alt="send" />
                </div>
            </div>
        </>
    );
};

ChatMessagePanel.propTypes = {
    socket: PropTypes.any,
    userDetailInfo: PropTypes.object,
    isChatOpen: PropTypes.bool,
    chatLanguageInfo: PropTypes.object,
    platform: PropTypes.oneOf(['app', 'whatsapp', 'line']).isRequired,
    activePlatformTab: PropTypes.string.isRequired,
    onConversationListUpdate: PropTypes.func,
    onConversationListUnread: PropTypes.func,
    containerHeight: PropTypes.any,
    isSentMessageDisabled: PropTypes.bool,
};

export default memo(ChatMessagePanel);
