import { useCallback, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { getAccessToken, getCurrentUser, uploadChatFile } from "../../../../services/commonService";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { setChatMediaLoading, clearChatMediaLoading } from "../../../../redux/Slices/chat/ChatSlice";
import translation from "../../../../utils/translation";
import userImg from "../../../../assets/img/user-icon.png";
import { formatTo12HourTime, formatToRailTime, formatToRailDay } from "../hooks/useChatMessages";
import { VALID_IMAGE_TYPES, VALID_FILE_EXTENSIONS } from "./gcConstants";

const useGcComposer = ({
    socket,
    userDetailInfo,
    platform,
    isRestricted,
    isSendDisabled,
    message,
    setMessage,
    appendMsg,
    setMessageList,
    scrollToBottom,
    guardMessage,
    onBlocked,
    onSent,
    attachment,
    clearAttachment,
}) => {
    const dispatch = useDispatch();
    const fileInputRef = useRef(null);
    const [previewFileUrl, setPreviewFileUrl] = useState(null);

    const buildOptimisticMsg = useCallback((body, mediaType, extra = {}) => {
        const nowIso = new Date().toISOString();
        return {
            conversation_sid: userDetailInfo?.conversation_sid,
            id: "",
            body,
            vector: "send",
            media_type: mediaType,
            media_link: null,
            read_status: "unread",
            profile_image: userImg,
            full_name: platform === "whatsapp" ? (getCurrentUser()?.data?.staff?.first_name || "") : "",
            email: platform === "whatsapp" ? (getCurrentUser()?.data?.email || "") : "",
            chatDateTime: formatTo12HourTime(nowIso),
            timeHM: formatToRailTime(nowIso),
            dayLabel: formatToRailDay(nowIso),
            createdAtRaw: nowIso,
            status: "sending",
            ...extra,
        };
    }, [userDetailInfo?.conversation_sid, platform]);

    const sendTextBody = useCallback((body) => {
        const staff = getCurrentUser()?.data?.staff;
        const msg = {
            conversation_sid: userDetailInfo?.conversation_sid,
            token: getAccessToken(),
            /* backend request: logged-in staff identity for the messaged flag */
            staff_id: staff?.id || "",
            staff_type: staff?.staff_type || "",
            body,
            message_type: "text",
            media_type: "text",
            media_link: "",
            entity_id: null,
            profile_image: userImg,
            full_name: platform === "whatsapp" ? (getCurrentUser()?.data?.staff?.first_name || "") : "",
            email: platform === "whatsapp" ? (getCurrentUser()?.data?.email || "") : "",
            platform,
            ...(platform === "whatsapp" && {
                whatsapp_mobile_number: userDetailInfo?.whatsapp_number || "",
                friend_id: userDetailInfo?.user_id || "",
            }),
        };
        /* Never emit on a dead socket: socket.io would BUFFER the event and
         * flush every queued copy on reconnect (duplicate sends). Offline
         * sends fail instantly instead, so Retry is the only resend path. */
        const isConnected = Boolean(socket && socket.connected);
        appendMsg(buildOptimisticMsg(body, "text", isConnected ? {} : { status: "failed" }));
        if (userDetailInfo?.entity_id) msg.entity_id = userDetailInfo.entity_id;
        if (userDetailInfo?.entity_type) msg.entity_type = userDetailInfo.entity_type;
        if (isConnected) {
            socket.emit("send_message", msg);
            if (onSent) onSent(body);
        }
        requestAnimationFrame(() => scrollToBottom());
    }, [userDetailInfo, socket, platform, appendMsg, scrollToBottom, buildOptimisticMsg, onSent]);

    const handleSendMessage = useCallback(() => {
        const text = message.trim();
        if (text === "" && !attachment) return;
        if (isSendDisabled) return;

        if (text && guardMessage) {
            const hit = guardMessage(message);
            if (hit) {
                if (onBlocked) onBlocked(hit);
                return;
            }
        }
        if (onBlocked) onBlocked(null);

        if (attachment) {
            sendTextBody(text ? `${ text }<br/>${ attachment.body }` : attachment.body);
            if (clearAttachment) clearAttachment();
        } else if (text) {
            sendTextBody(message);
        }
        setMessage("");
    }, [message, attachment, clearAttachment, isSendDisabled, setMessage, sendTextBody, guardMessage, onBlocked]);

    const handleSendMediaMessage = useCallback((mediaType, url, fileName) => {
        const staff = getCurrentUser()?.data?.staff;
        const msg = {
            conversation_sid: userDetailInfo?.conversation_sid,
            token: getAccessToken(),
            staff_id: staff?.id || "",
            staff_type: staff?.staff_type || "",
            body: fileName,
            message_type: mediaType,
            media_type: mediaType,
            media_link: url,
            entity_id: null,
            profile_image: userImg,
            full_name: "",
            platform,
            ...(platform === "whatsapp" && {
                whatsapp_mobile_number: userDetailInfo?.whatsapp_number || "",
                friend_id: userDetailInfo?.user_id || "",
            }),
        };
        setMessage("");
        if (socket && socket.connected) {
            socket.emit("send_message", msg);
            if (onSent) onSent(fileName);
        }
    }, [userDetailInfo, socket, platform, setMessage, onSent]);

    const handleAttachmentClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const fileType = file.type.split("/")[0];
        const fileExtension = file.name.split(".").pop().toLowerCase();

        if (fileType === "image" && !VALID_IMAGE_TYPES.includes(file.type)) {
            ShowToast("error", translation("key_invalid_image_file_type"));
            return;
        }
        if (fileType !== "image" && !VALID_FILE_EXTENSIONS.includes(fileExtension)) {
            ShowToast("error", translation("key_invalid_file_type"));
            return;
        }

        try {
            const mediaType = fileType === "image" ? "image" : "file";
            dispatch(setChatMediaLoading());
            appendMsg(buildOptimisticMsg(file.name, mediaType));

            const uploadedFileResponse = await uploadChatFile([{ file, name: "chat" }]);
            if (fileInputRef.current) fileInputRef.current.value = "";
            dispatch(clearChatMediaLoading());
            handleSendMediaMessage(mediaType, uploadedFileResponse.url, file.name);
        } catch (error) {
            dispatch(clearChatMediaLoading());
            ShowToast("error", String(error));
        }
    }, [dispatch, appendMsg, buildOptimisticMsg, handleSendMediaMessage]);

    const handleKeyDown = useCallback((e) => {
        if (isRestricted) return;
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    }, [isRestricted, handleSendMessage]);

    const handleDownload = useCallback((url, mediaType) => {
        if (mediaType === "file") {
            const link = document.createElement("a");
            link.href = url;
            link.download = "file";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else if (mediaType === "image") {
            const newWindow = window.open(url, "_blank");
            if (newWindow) {
                setTimeout(() => {
                    const link = newWindow.document.createElement("a");
                    link.href = url;
                    link.download = url.split("/").pop();
                    newWindow.document.body.appendChild(link);
                    link.click();
                    newWindow.document.body.removeChild(link);
                    newWindow.close();
                }, 200);
            }
        }
    }, []);

    const handleDelete = useCallback((id) => {
        socket?.emit("delete_message", {
            conversation_sid: userDetailInfo?.conversation_sid,
            token: getAccessToken(),
            message_id: id,
        });
        setMessageList((prevList) => prevList.filter((el) => el.id !== id));
    }, [userDetailInfo, socket, setMessageList]);

    return {
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
    };
};

export default useGcComposer;
