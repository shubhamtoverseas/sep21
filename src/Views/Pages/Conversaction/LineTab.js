import React, { useEffect, useState, useRef, lazy, useCallback, useMemo } from "react";
import { sanitizeHtml } from "../../../utils/sanitize";
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
const EmojiPicker = lazy(() => import("emoji-picker-react"));
import userImg from "../../../assets/img/user-icon.png";
import userPdf from "../../../assets/img/svg/pdf-red.svg";
import userDocs from "../../../assets/img/docs.png";
import emojiIcon from "../../../assets/img/svg/emoji-icon.svg";
import closeButton from "../../../assets/img/svg/close-red.svg";
import attachmentIcon from "../../../assets/img/svg/attachment-icon.svg";
import messageSendIcon from "../../../assets/img/paper-plane.png";
import { getAccessToken, getCurrentUser, getMessagesHeight } from "../../../services/commonService";
import { uploadChatFile } from "../../../services/commonService";
import { ShowToast } from "../../../components/show-toast/ShowToast";
import { Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { setChatMediaLoading, clearChatMediaLoading, fetchMessageListWithKey, fetchRestrictedKey } from '../../../redux/Slices/chat/ChatSlice';
import "./chat.css";
import ChatLoader from "../../../components/ReusableComponents/chatLoader";
import translation from "../../../utils/translation";
import MessageInput from "../../../components/chat/MessageInput";
const FilePreviewModal = lazy(() => import("../../../components/popups/FilePreviewModal"));

// --- Helpers moved outside component to avoid re-creation on every render ---

const IST_OFFSET = 5.5 * 60 * 60 * 1000;

function formatTo12HourTime(dateString) {
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

    if (isSameDay) {
        return formattedTime;
    }
    const day = kolkataTime.getUTCDate();
    const month = kolkataTime.getUTCMonth() + 1;
    const year = kolkataTime.getUTCFullYear();
    return `${ day }/${ month }/${ year } ${ formattedTime }`;
}

function isPdf(mediaLink) {
    if (!mediaLink) return false;
    return mediaLink.split('.').pop().toLowerCase() === 'pdf';
}

function isExcel(mediaLink) {
    if (!mediaLink) return false;
    return ['xls', 'xlsx', 'csv'].includes(mediaLink.split('.').pop().toLowerCase());
}

function getTranslatedBody(msg, chatLanguageInfo, direction) {
    if (direction !== 'recieve' || chatLanguageInfo?.chat_translate_view !== "translated") {
        return msg?.content;
    }
    const langMap = {
        id: 'content_id',
        en: 'content_en',
        zh_cn: 'content_zh_cn',
        zh_tw: 'content_zh_tw',
    };
    const key = langMap[chatLanguageInfo?.chat_translate_language];
    return (key && msg?.[key]) || msg?.content;
}

function mapRawMsgToDisplay(msg, userDetailInfo, chatLanguageInfo) {
    const msgDirection = msg?.receiver_id != userDetailInfo?.user_id ? 'recieve' : 'send';
    return {
        conversation_sid: userDetailInfo?.conversation_sid,
        id: msg?.id,
        body: getTranslatedBody(msg, chatLanguageInfo, msgDirection),
        profile_image: msg?.profile_image,
        vector: msgDirection,
        media_type: msg?.media_type,
        media_link: msg?.media_link,
        status: msg?.status,
        read_status: msg?.read_status,
        full_name: msg?.full_name,
        email: msg?.email,
        chatDateTime: formatTo12HourTime(msg?.created_at),
        role_name: msg?.role_name
    };
}

const LineTab = ({ socket, userDetailInfo, isChatOpen, isSocialTab, containerHeight, chatLanguageInfo }) => {
    const [message, setMessage] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const [messageList, setMessageList] = useState([]);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewFileUrl, setPreviewFileUrl] = useState(null);
    const [inputHeight, setInputHeight] = useState(38);
    const lastScrollTop = useRef(0);
    const fileInputRef = useRef(null);
    const dispatch = useDispatch();
    const { allMessageList, messageStatus, restrictedKey } = useSelector((state) => state.chat)
    const [paginateData, setPaginateData] = useState("");
    const [isPaginateDelay, setIsPaginateDelay] = useState(true);
    const messagesEndRef = useRef(null);

    // Stable refs for values used inside socket handlers to avoid re-registering listeners
    const chatLanguageInfoRef = useRef(chatLanguageInfo);
    chatLanguageInfoRef.current = chatLanguageInfo;
    const userDetailInfoRef = useRef(userDetailInfo);
    userDetailInfoRef.current = userDetailInfo;

    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: 'end' });
        }
    }, []);

    useEffect(() => {
        if (!restrictedKey?.original?.data) {
            dispatch(fetchRestrictedKey())
        }
    }, [dispatch, restrictedKey]);

    // Socket event handlers using refs to avoid stale closures and frequent re-subscriptions
    const handleReceivedMsgRef = useRef(null);
    const handleReceiveMessageStatusRef = useRef(null);

    handleReceivedMsgRef.current = useCallback((msg) => {
        const userInfo = userDetailInfoRef.current;
        const langInfo = chatLanguageInfoRef.current;
        scrollToBottom();
        if (!msg?.status) {
            setMessageList(prevList => prevList.filter(item => item.id !== "" && item.id !== null));
            ShowToast("error", translation(msg?.message));
            return;
        }
        const currentUser = getCurrentUser();
        const currentUserId = currentUser?.data?.id;
        const msgDirection = msg.data.created_by == currentUserId ? 'send' : 'recieve';
        const body = getTranslatedBody(msg.data, langInfo, msgDirection);

        if (msg.data.created_by == currentUserId) {
            if (msg.data?.isWhatsTemplate === "yes") {
                setMessageList(prev => [...prev, {
                    conversation_sid: userInfo?.conversation_sid,
                    id: msg.data.id,
                    body,
                    vector: msgDirection,
                    media_type: msg.data.media_type,
                    media_link: msg.data.media_link,
                    profile_image: msg.data?.profile_image,
                    full_name: msg.data?.full_name,
                    email: msg.data?.email,
                    chatDateTime: formatTo12HourTime(msg.data.created_at)
                }]);
            } else {
                setMessageList((prevData) =>
                    prevData.map((item) =>
                        item.id == "" ? {
                            ...item,
                            id: msg.data.id,
                            body,
                            media_type: msg.data.media_type,
                            media_link: msg.data.media_link,
                            profile_image: msg.data?.profile_image,
                            full_name: msg.data?.full_name,
                        } : item
                    )
                );
            }
            scrollToBottom();
        } else {
            let shouldAppend = false;
            if (userInfo?.user_type === "group_team") {
                shouldAppend = userInfo?.conversation_sid == msg.data.conversation_sid;
            } else {
                shouldAppend = userInfo?.user_id == msg.data.sender_id;
            }
            if (shouldAppend) {
                setMessageList(prev => [...prev, {
                    conversation_sid: userInfo?.conversation_sid,
                    id: msg.data.id,
                    body,
                    vector: msgDirection,
                    media_type: msg.data.media_type,
                    media_link: msg.data.media_link,
                    profile_image: msg.data?.profile_image,
                    full_name: msg.data?.full_name,
                    email: msg.data?.email,
                    chatDateTime: formatTo12HourTime(msg.data.created_at),
                    role_name: msg?.role_name
                }]);
                scrollToBottom();
            }
        }
    }, [scrollToBottom]);

    handleReceiveMessageStatusRef.current = useCallback((msg) => {
        scrollToBottom();
        if (!msg?.status) {
            setMessageList(prevList => prevList.filter(item => item.id !== "" && item.id !== null));
            ShowToast("error", translation(msg?.message));
            return;
        }
        if (msg.data && msg.data.id) {
            setMessageList(prevData =>
                prevData.map(item =>
                    item.id === msg.data.id
                        ? { ...item, read_status: msg.data.read_status }
                        : item
                )
            );
        }
    }, [scrollToBottom]);

    // Single socket subscription — only re-runs when socket changes (not on every userDetailInfo/chatLanguageInfo change)
    useEffect(() => {
        if (!socket) return;
        const onMessage = (msg) => handleReceivedMsgRef.current(msg);
        const onStatus = (msg) => handleReceiveMessageStatusRef.current(msg);
        const onDeleted = (msg) => {
            const deletedId = msg?.data?.message_id;
            if (!deletedId) return;
            setMessageList(prev => prev.filter(item => String(item.id) !== String(deletedId)));
        };
        socket.on('receive_message', onMessage);
        socket.on('receive_message_status', onStatus);
        socket.on('delete_message', onDeleted);
        return () => {
            socket.off('receive_message', onMessage);
            socket.off('receive_message_status', onStatus);
            socket.off('delete_message', onDeleted);
        };
    }, [socket]);

    useEffect(() => {
        if (isSocialTab) {
            setMessageList([]);
        }
    }, [isSocialTab]);

    useEffect(() => {
        if (allMessageList) {
            setPaginateData(allMessageList?.LastEvaluatedKey ?? "");
            const tempChatHistory = allMessageList?.data ?? [];
            const tempList = tempChatHistory.map((msg) =>
                mapRawMsgToDisplay(msg, userDetailInfo, chatLanguageInfo)
            );
            setMessageList(tempList);
            setTimeout(scrollToBottom, 500);
        }
    }, [allMessageList, userDetailInfo, chatLanguageInfo, scrollToBottom]);


    useEffect(() => {
        if (userDetailInfo?.entity_id) {
            if (userDetailInfo?.media_type === "job") {
                setMessage(`<a target="_blank" class="blue" href="${ userDetailInfo?.media_link }">#${ userDetailInfo?.entity_job_id }(${ userDetailInfo?.entity_name } )</a>`);
            } else {
                setMessage(`<a target="_blank" class="blue" href="${ userDetailInfo?.media_link }">${ userDetailInfo?.entity_name } ${ userDetailInfo?.entity_job_id }</a>`);
            }
        }
    }, [userDetailInfo]);

    const pushHistoricalChatByPage = useCallback((oldMessages) => {
        const allMessages = oldMessages.map((msg) =>
            mapRawMsgToDisplay(msg, userDetailInfo, chatLanguageInfo)
        );
        setMessageList(prev => [...allMessages, ...prev]);
    }, [userDetailInfo, chatLanguageInfo]);

    const fetchPreviousPage = useCallback(async () => {
        if (paginateData && isPaginateDelay) {
            setIsPaginateDelay(false);
            const parameters = {
                sid: userDetailInfo?.conversation_sid,
                limit: 10,
                ExclusiveStartKey: paginateData,
                platform: "line"
            };
            dispatch(fetchMessageListWithKey(parameters))
                .unwrap()
                .then((messageData) => {
                    if (messageData) {
                        setPaginateData(messageData?.LastEvaluatedKey)
                        if (messageData?.data) {
                            setIsPaginateDelay(true);
                            pushHistoricalChatByPage(messageData?.data);
                        }
                    }
                })
        }
    }, [paginateData, isPaginateDelay, userDetailInfo?.conversation_sid, dispatch, pushHistoricalChatByPage]);

    const isFetching = useRef(false);
    const debounceTimeout = useRef(null);

    const handleScroll = useCallback((e) => {
        const currentScrollTop = e.target.scrollTop;
        if (currentScrollTop === 0 && !isFetching.current) {
            isFetching.current = true;
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
            debounceTimeout.current = setTimeout(async () => {
                await fetchPreviousPage();
                isFetching.current = false;
            }, 300);
        }
        lastScrollTop.current = currentScrollTop;
    }, [fetchPreviousPage]);

    // Clear debounce timeout on unmount to avoid memory leaks
    useEffect(() => {
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, []);

    const handleSendMessage = useCallback(() => {
        if (message.trim() === '') return;
        const currentUser = getCurrentUser();
        const fullName = currentUser?.data?.staff?.first_name || "";
        const email = currentUser?.data?.email || "";
        let msg = {
            conversation_sid: userDetailInfo?.conversation_sid,
            token: getAccessToken(),
            body: message,
            message_type: "text",
            media_type: "text",
            media_link: "",
            entity_id: null,
            profile_image: userImg,
            full_name: fullName,
            email,
            platform: "line",
            whatsapp_mobile_number: userDetailInfo?.whatsapp_number || "",
            friend_id: userDetailInfo?.user_id || "",
        };
        setMessage('');
        setMessageList(prev => [...prev, {
            conversation_sid: userDetailInfo?.conversation_sid,
            id: "",
            body: message,
            vector: 'send',
            media_type: "text",
            media_link: null,
            read_status: "unread",
            profile_image: userImg,
            full_name: fullName,
            email,
            chatDateTime: formatTo12HourTime(new Date().toISOString()),
            status: "sending"
        }]);
        if (userDetailInfo?.entity_id) {
            msg.entity_id = userDetailInfo?.entity_id;
            delete userDetailInfo?.entity_id;
        }
        if (userDetailInfo?.entity_type) {
            msg.entity_type = userDetailInfo?.entity_type;
            delete userDetailInfo?.entity_type;
        }
        if (socket) {
            socket.emit('send_message', msg);
        }
        scrollToBottom();
    }, [message, userDetailInfo, socket, scrollToBottom]);

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
            platform: "line",
            whatsapp_mobile_number: userDetailInfo?.whatsapp_number || "",
            friend_id: userDetailInfo?.user_id || "",
        };
        setMessage('');
        if (socket) {
            socket.emit('send_message', msg);
        }
    }, [userDetailInfo, socket]);

    const imageDownloader = useCallback((imageUrl) => {
        const newWindow = window.open(imageUrl, '_blank');
        if (newWindow) {
            setTimeout(() => {
                const link = newWindow.document.createElement('a');
                link.href = imageUrl;
                const fileName = imageUrl.split('/').pop();
                link.download = fileName;
                newWindow.document.body.appendChild(link);
                link.click();
                newWindow.document.body.removeChild(link);
                newWindow.close();
            }, 200);
        }
    }, []);

    const handleDownload = useCallback((url, media_type) => {
        if (media_type == 'file') {
            const link = document.createElement('a');
            link.href = url;
            link.download = 'file';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (media_type == 'image') {
            imageDownloader(url);
        }
    }, [imageDownloader]);

    const handleDelete = useCallback((id) => {
        const deletePayload = {
            conversation_sid: userDetailInfo?.conversation_sid,
            token: getAccessToken(),
            message_id: id
        };
        socket.emit('delete_message', deletePayload);
        setMessageList(prev => prev.filter((el) => el.id !== id));
    }, [userDetailInfo?.conversation_sid, socket]);

    const handleAttachmentClick = useCallback(() => {
        fileInputRef.current.click();
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
            const filesToUpload = [{ file: file, name: "chat" }];
            const mediaType = fileType === 'image' ? 'image' : 'file';
            dispatch(setChatMediaLoading());
            setMessageList(prev => [...prev, {
                conversation_sid: userDetailInfo?.conversation_sid,
                id: "",
                body: file.name,
                vector: 'send',
                media_type: mediaType,
                media_link: null,
                read_status: "unread",
                profile_image: userImg,
                chatDateTime: formatTo12HourTime(new Date().toISOString()),
                status: "sending"
            }]);
            const uploadedFileResponse = await uploadChatFile(filesToUpload);
            dispatch(clearChatMediaLoading());
            handleSendMediaMessage(mediaType, uploadedFileResponse.url, file.name);
        } catch (error) {
            ShowToast("error", error);
        }
    }, [dispatch, userDetailInfo?.conversation_sid, handleSendMediaMessage]);

    // Check if message contains any restricted keyword
    const isRestricted = useMemo(() => {
        if (!restrictedKey?.original?.data || !Array.isArray(restrictedKey.original.data)) return false;
        const msg = message.toLowerCase();
        return restrictedKey.original.data.some(keyword =>
            keyword && msg.includes(keyword.name.toLowerCase())
        );
    }, [message, restrictedKey]);

    const handleKeyDown = useCallback((e) => {
        if (isRestricted) return;
        if (e.key === "Enter") {
            e.preventDefault();
            handleSendMessage();
        }
    }, [isRestricted, handleSendMessage]);

    const displayEmojiIcons = useCallback(() => {
        if (!isRestricted) {
            setShowPicker(prev => !prev);
        }
    }, [isRestricted]);

    const handleEmojiClick = useCallback((emojiObject) => {
        setMessage((prevInput) => prevInput + emojiObject.emoji);
        setShowPicker(false);
    }, []);

    const handlePreviewFile = useCallback((fileUrl) => {
        setPreviewFileUrl(fileUrl);
        setShowPreviewModal(true);
    }, []);

    const handleClosePreview = useCallback(() => setShowPreviewModal(false), []);
    const handleCloseEmojiPicker = useCallback(() => setShowPicker(false), []);
    const handleInputHeightChange = useCallback((h) => setInputHeight(h), []);

    return <>
        <div id="messages-container" 
        style={ {
            height: getMessagesHeight(containerHeight, inputHeight),
            maxHeight: getMessagesHeight(containerHeight, inputHeight),
            overflowY: 'auto'
        } } className={ `${ !containerHeight ? 'calculated-height' : '' } chat-window messages-window p12` } onScroll={ handleScroll }>
            { showPreviewModal && <FilePreviewModal onClose={ handleClosePreview } filePath={ previewFileUrl } /> }

            { (messageStatus === 'loading' && userDetailInfo?.user_id) ? <ChatLoader /> : "" }
            { messageList.map((msg, index) => {
                if (msg.vector == 'send') {
                    return (
                        <div className="w-100 d-flex justify-content-end" key={ index }>
                            <div className={ `message sender position-relative ${ index !== messageList.length - 1 ? "mb-3" : ""
                                }` } id={ index == 19 ? ('last-message') : ('no${index}') }>
                                <img src={ msg.profile_image } className="rounded-circle sender-avatar" alt="Avatar" />
                                <div className="d-flex justify-content-end">
                                    <div className="message-text p10 lh-22">

                                        {
                                            msg.media_type == 'file' ? (
                                                <div className="d-flex">

                                                    <div className="d-flex align-items-center mr24 cursor-pointer" onClick={ () => handlePreviewFile(msg.media_link) }>
                                                        { msg.media_link && <img width="24" src={ msg.media_link.endsWith('.pdf') ? userPdf : userDocs } /> }
                                                        <div className={ msg.body && msg.body.length > 35 ? "multi-line" : "row m-0 align-items-end" } >
                                                            <div className="mr-1 w-100">
                                                                <div className="message-sender-name">{ msg.full_name }{ " " }({ msg.email })</div>
                                                            </div>
                                                            <div onClick={ () => handlePreviewFile(msg.media_link) } className="ml-1 mr-1 col p-0 text-break" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></div>
                                                            <div className='time-and-ticks col-auto p-0'>
                                                                <small className="chat-time text-nowrap">{ msg.chatDateTime }</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    { !msg?.id &&
                                                        <div className="d-flex">
                                                            <span
                                                                className="mr-1"
                                                                style={ {
                                                                    display: "inline-block",
                                                                    width: "20px",
                                                                    height: "20px",
                                                                    border: "4px solid #ccc",
                                                                    borderTop: "4px solid #007bff",
                                                                    borderRadius: "50%",
                                                                    animation: "spin 1s linear infinite",
                                                                } }
                                                            ></span>
                                                            <p>{ translation('key_uploading') }...</p>
                                                        </div> }
                                                </div>
                                            ) : msg.media_type == 'image' ? (
                                                <div className="cursor-pointer">
                                                    <div className="mr-1 w-100">
                                                        <div className="message-sender-name">{ msg.full_name }{ " " }({ msg.email })</div>
                                                    </div>
                                                    <div onClick={ () => handlePreviewFile(msg.media_link) }>
                                                        { msg.media_link && <img loading="lazy" src={ msg.media_link } className="chat-responsive-image mb-1" /> }
                                                    </div>
                                                    <div className={ msg.body && msg.body.length > 35 ? "multi-line" : "row m-0 align-items-end" } >

                                                        <div className="mr-1 col p-0 text-break" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></div>
                                                        <div className='time-and-ticks col-auto p-0'>
                                                            <small className="chat-time text-nowrap">{ msg.chatDateTime }</small>
                                                        </div>
                                                    </div>
                                                    { !msg?.id && <div>
                                                        <span
                                                            style={ {
                                                                display: "inline-block",
                                                                width: "20px",
                                                                height: "20px",
                                                                border: "4px solid #ccc",
                                                                borderTop: "4px solid #007bff",
                                                                borderRadius: "50%",
                                                                animation: "spin 1s linear infinite",
                                                            } }
                                                        ></span>
                                                        <p>{ translation('key_uploading') }...</p>
                                                    </div> }
                                                </div>
                                            ) : (
                                                <div className={ msg.body && msg.body.length > 35 ? "multi-line" : "row m-0 align-items-end" } >
                                                    <div className="mr-1 w-100">
                                                        <div className="message-sender-name">{ msg.full_name }{ " " }({ msg.email })</div>
                                                    </div>
                                                    <div className="mr-1 col p-0 text-break" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></div>
                                                    { msg.media_link && <>
                                                        { isPdf(msg.media_link) && <img className="cursor-pointer" width="24" src={ userPdf } alt="PDF" onClick={ () => handlePreviewFile(msg.media_link) } /> }
                                                        { isExcel(msg.media_link) && <img width="24" src={ userDocs } alt="Excel" onClick={ () => handlePreviewFile(msg.media_link) } /> }
                                                        { !isPdf(msg.media_link) && !isExcel(msg.media_link) && <img width="24" src={ msg.media_link } alt="Image" onClick={ () => handlePreviewFile(msg.media_link) } /> }
                                                    </> }

                                                    <div className='time-and-ticks col-auto p-0'>
                                                        <small className="chat-time text-nowrap">{ msg.chatDateTime }</small>
                                                    </div>
                                                </div>
                                            )
                                        }

                                        {/* <span><i className="ri-check-double-line blue ml-2 fz16"></i></span> */ }
                                        {/* { !msg?.id && <i className="ri-check-line fz16 tick-icons"></i> }
                                        { msg?.id && msg?.read_status === "unread" && <i className="ri-check-double-line blue fz16 tick-icons"></i> }
                                        { msg?.read_status === "read" && <i className="ri-check-double-line blue fz16 tick-icons"></i> } */}

                                        {/* Message status ticks and dropdown menu */ }
                                        { !msg?.id && (
                                            // Message is sending (show single gray tick)
                                            <i className="ri-check-line fz16 tick-icons" style={ { color: "#bdbdbd" } }></i>
                                        ) }
                                        { msg?.id && msg?.read_status === "sent" && (
                                            // Message sent but not delivered (single gray tick)
                                            <i className="ri-check-line fz16 tick-icons" style={ { color: "#bdbdbd" } }></i>
                                        ) }
                                        { msg?.id && msg?.read_status === "unread" && (
                                            // Message sent but not delivered (single gray tick)
                                            <i className="time-and-ticks ri-check-double-line fz16 tick-icons" style={ { color: "#bdbdbd" } }></i>
                                        ) }
                                        { msg?.id && msg?.read_status === "delivered" && (
                                            // Message delivered (double gray tick)
                                            <i className="time-and-ticks ri-check-double-line fz16 tick-icons" style={ { color: "#bdbdbd" } }></i>
                                        ) }
                                        { msg?.read_status === "read" && (
                                            // Message read (double blue tick)
                                            <i className="time-and-ticks ri-check-double-line fz16 tick-icons" style={ { color: "#2196f3" } }></i>
                                        ) }

                                        <Dropdown className="menu-btn-dropdown message-options-dropdown">
                                            <Dropdown.Toggle as={ Link } className="menu-btn p-1">
                                                <i className="ri-arrow-down-s-line grey2 fz24"></i>
                                            </Dropdown.Toggle>
                                            {
                                                msg.media_type == 'file' ? (
                                                    <Dropdown.Menu align="right">
                                                        <Dropdown.Item as={ Link } to="#" onClick={ () => handleDownload(msg.media_link, msg.media_type) }>{ translation('key_download') }</Dropdown.Item>
                                                        <Dropdown.Item as={ Link } to="#" onClick={ () => handleDelete(msg.id) }>{ translation('key_delete') }</Dropdown.Item>
                                                    </Dropdown.Menu>
                                                ) : (

                                                    <Dropdown.Menu align="right">
                                                        <Dropdown.Item as={ Link } to="#" onClick={ () => handleDelete(msg.id) }>{ translation('key_delete') }</Dropdown.Item>
                                                    </Dropdown.Menu>
                                                )
                                            }
                                        </Dropdown>
                                    </div>
                                </div>
                                {/* <small className="chat-time text-nowrap">{ msg.chatDateTime }</small> */ }
                                {/* <img src={ msg.profile_image } className="rounded-circle receiver-avatar" alt="Avatar" /> */ }
                            </div>
                        </div>
                    )
                } else {
                    // Add support for video and audio messages
                    if (msg.media_type === 'sticker') {
                        return (
                            <div className="w-100 d-flex justify-content-end flex-row-reverse" key={ index }>
                                <div className={ `message receiver position-relative w-100 ${ index !== messageList.length - 1 ? "mb-3" : ""
                                    }` } id={ index == 19 ? ('last-message') : (`no${ index }`) }>
                                    <div className="d-flex w-100">
                                        <div className="message-text p10 bg-light wrap-text">
                                            <div className="cursor-pointer">
                                                { msg.media_link && (
                                                    <img
                                                        src={ msg.media_link }
                                                        alt="Sticker"
                                                        className="chat-responsive-sticker mb-1"
                                                        style={ { maxWidth: "120px", maxHeight: "120px" } }
                                                    />
                                                ) }
                                                <div className={ msg.body && msg.body.length > 35 ? "multi-line" : "row m-0 align-items-end" } >
                                                    { msg.body && (
                                                        <div
                                                            className="mr-1 col p-0 text-break"
                                                            dangerouslySetInnerHTML={sanitizeHtml(msg.body)}
                                                        ></div>
                                                    ) }
                                                    <div className="time-and-ticks col-auto p-0">
                                                        <small className="chat-time text-nowrap">{ msg.chatDateTime }</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <Dropdown className="menu-btn-dropdown message-options-dropdown">
                                                <Dropdown.Toggle as={ Link } className="menu-btn p-1">
                                                    <i className="ri-arrow-down-s-line grey2 fz24"></i>
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu align="right">
                                                    <Dropdown.Item as={ Link } to="#" onClick={ () => handleDownload(msg.media_link, msg.media_type) }>
                                                        { translation('key_download') }
                                                    </Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </div>
                                    </div>
                                    <img src={ msg.profile_image } className="rounded-circle receiver-avatar" alt="Avatar" />
                                </div>
                            </div>
                        );
                    }
                    if (msg.media_type === 'video') {
                        return (
                            <div className="w-100 d-flex justify-content-end flex-row-reverse" key={ index }>
                                <div className={ `message receiver position-relative w-100 ${ index !== messageList.length - 1 ? "mb-3" : ""
                                    }` } id={ index == 19 ? ('last-message') : (`no${ index }`) }>
                                    <div className="d-flex w-100">
                                        <div className="message-text p10 bg-light wrap-text">
                                            <div className="cursor-pointer">
                                                <video
                                                    src={ msg.media_link }
                                                    className="chat-responsive-video mb-1"
                                                    controls
                                                    style={ { maxWidth: "250px", borderRadius: "8px" } }
                                                />
                                                <div className={ msg.body && msg.body.length > 35 ? "multi-line" : "row m-0 align-items-end" } >
                                                    { msg.body && <div className="mr-1 col p-0 text-break" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></div> }
                                                    <div className='time-and-ticks col-auto p-0'>
                                                        <small className="chat-time text-nowrap">{ msg.chatDateTime }</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <Dropdown className="menu-btn-dropdown message-options-dropdown">
                                                <Dropdown.Toggle as={ Link } className="menu-btn p-1">
                                                    <i className="ri-arrow-down-s-line grey2 fz24"></i>
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu align="right">
                                                    <Dropdown.Item as={ Link } to="#" onClick={ () => handleDownload(msg.media_link, msg.media_type) }>{ translation('key_download') }</Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </div>
                                    </div>
                                    <img src={ msg.profile_image } className="rounded-circle receiver-avatar" alt="Avatar" />
                                </div>
                            </div>
                        );
                    }
                    if (msg.media_type === 'audio') {
                        return (
                            <div className="w-100 d-flex justify-content-end flex-row-reverse" key={ index }>
                                <div className={ `message receiver position-relative w-100 ${ index !== messageList.length - 1 ? "mb-3" : ""
                                    }` } id={ index == 19 ? ('last-message') : (`no${ index }`) }>
                                    <div className="d-flex w-100">
                                        <div className="message-text p10 bg-light wrap-text">
                                            <div className="cursor-pointer">
                                                <audio
                                                    src={ msg.media_link }
                                                    controls
                                                    style={ { width: "200px" } }
                                                />
                                                <div className={ msg.body && msg.body.length > 35 ? "multi-line" : "row m-0 align-items-end" } >
                                                    { msg.body && <div className="mr-1 col p-0 text-break" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></div> }
                                                    <div className='time-and-ticks col-auto p-0'>
                                                        <small className="chat-time text-nowrap">{ msg.chatDateTime }</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <Dropdown className="menu-btn-dropdown message-options-dropdown">
                                                <Dropdown.Toggle as={ Link } className="menu-btn p-1">
                                                    <i className="ri-arrow-down-s-line grey2 fz24"></i>
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu align="right">
                                                    <Dropdown.Item as={ Link } to="#" onClick={ () => handleDownload(msg.media_link, msg.media_type) }>{ translation('key_download') }</Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </div>
                                    </div>
                                    <img src={ msg.profile_image } className="rounded-circle receiver-avatar" alt="Avatar" />
                                </div>
                            </div>
                        );
                    }
                    // Default (existing) rendering for file, image, and text
                    return (
                        <div className="w-100 d-flex justify-content-end flex-row-reverse" key={ index } >
                            <div className={ `message receiver position-relative w-100 ${ index !== messageList.length - 1 ? "mb-3" : ""
                                }` } id={ index == 19 ? ('last-message') : (`no${ index }`) }>
                                <div className="d-flex w-100">
                                    <div className="message-text p10 bg-light wrap-text">

                                        {
                                            msg.media_type == 'file' ? (
                                                <div className="cursor-pointer" onClick={ () => handlePreviewFile(msg.media_link) }>
                                                    <div className="d-flex align-items-center">
                                                        <img width="24" src={ msg.media_link.endsWith('.pdf') ? userPdf : userDocs } />
                                                        <div className={ msg.body && msg.body.length > 35 ? "multi-line" : "row m-0 align-items-end" } >
                                                            <div className="ml-1 mr-1 ellipses-text col p-0" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></div>
                                                            <div className='time-and-ticks col-auto p-0'>
                                                                <small className="chat-time text-nowrap">{ msg.chatDateTime }</small>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : msg.media_type == 'image' ? (
                                                <div className="cursor-pointer">
                                                    <div onClick={ () => handlePreviewFile(msg.media_link) }>
                                                        <img loading="lazy" src={ msg.media_link } className="chat-responsive-image mb-1" />
                                                    </div>
                                                    <div className={ msg.body && msg.body.length > 35 ? "multi-line" : "row m-0 align-items-end" } >
                                                        { msg.body && <div className="mr-1 col p-0 text-break" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></div> }
                                                        <div className='time-and-ticks col-auto p-0'>
                                                            <small className="chat-time text-nowrap">{ msg.chatDateTime }</small>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className={ msg.body && msg.body.length > 35 ? "multi-line" : "row m-0 align-items-end" } >
                                                        <div className="mr-1 col p-0 text-break" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></div>
                                                        <div className='time-and-ticks col-auto p-0'>
                                                            <small className="chat-time text-nowrap">{ msg.chatDateTime }</small>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        }
                                        {
                                            msg.media_type == 'file' ? (
                                                <Dropdown className="menu-btn-dropdown message-options-dropdown">
                                                    <Dropdown.Toggle as={ Link } className="menu-btn p-1">
                                                        <i className="ri-arrow-down-s-line grey2 fz24"></i>
                                                    </Dropdown.Toggle>
                                                    <Dropdown.Menu align="right">
                                                        <Dropdown.Item as={ Link } to="#" onClick={ () => handleDownload(msg.media_link, msg.media_type) }>{ translation('key_download') }</Dropdown.Item>
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            ) : null
                                        }
                                    </div>
                                </div>
                                <img src={ msg.profile_image } className="rounded-circle receiver-avatar" alt="Avatar" />
                            </div>
                        </div>
                    )
                }
            }) }
            <div ref={ messagesEndRef } />
        </div>
        <div className="px-3 py-2 border-top d-flex align-items-center sending-bar bg-white position-relative">
            { showPicker && (
                <div
                    style={ {
                        position: "absolute",
                        bottom: "78px",
                        left: "80px",
                        zIndex: "1000",
                        border: "1px solid #ccc",
                        borderRadius: "10px",
                        backgroundColor: "#fff",
                    } }
                >
                    <button
                        onClick={ handleCloseEmojiPicker }
                        className="absolute right-0 top-0  px-2 py-1 rounded-full"
                        style={ {
                            border: "1px solid #fff",
                        } }
                    >
                        <img src={ closeButton } />
                    </button>
                    <EmojiPicker onEmojiClick={ handleEmojiClick } />

                </div>
            ) }

            <img disabled={ isChatOpen } src={ emojiIcon } className="mr-2" onClick={ (isRestricted) ? undefined : displayEmojiIcons } />
            <img src={ attachmentIcon } className="mr-2" style={ { cursor: 'pointer' } } onClick={ handleAttachmentClick } />
            <input type="file" disabled={ isChatOpen } id="file-upload" ref={ fileInputRef } style={ { display: 'none' } } onChange={ handleFileChange } />
            {/* Line tab */}
            {/* <input 
                type="text" 
                disabled={ isChatOpen } 
                className="form-control mr-2" 
                value={ message } 
                placeholder={ translation('key_type_a_message') } 
                onChange={ (e) => setMessage(e.target.value) } 
                onKeyDown={ handleKeyDown } 
            /> */}
            <MessageInput
                message={message}
                setMessage={setMessage}
                handleKeyDown={handleKeyDown}
                placeholder={translation('key_type_a_message')}
                disabled={isChatOpen}
                containerHeight={containerHeight}
                onHeightChange={ handleInputHeightChange }
            />

            {/* <div style={ { cursor: 'pointer' } } onClick={ handleSendMessage } ><img src={ messageSendIcon } /> </div> */ }

            <div style={ { cursor: (isRestricted) ? 'not-allowed' : 'pointer', opacity: isRestricted ? 0.5 : 1 } } onClick={ (isRestricted) ? undefined : handleSendMessage }>
                <img src={ messageSendIcon } />
            </div>

            { isRestricted && (
                <span className="text-danger chat-error-message">{ translation('key_restricted_word_used') || "Restricted words are not permitted." }</span>
            ) }
        </div>
    </>
}

LineTab.propTypes = {
    socket: PropTypes.any,
    userDetailInfo: PropTypes.object,
    isChatOpen: PropTypes.bool,
    isSocialTab: PropTypes.string,
    containerHeight: PropTypes.number,
    isWhatsAppInit: PropTypes.any,
    chatLanguageInfo: PropTypes.object,
};

export default LineTab;