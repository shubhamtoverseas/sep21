import React, { useEffect, useState, lazy } from "react";
import PropTypes from 'prop-types';
import { useDispatch } from "react-redux";
const ActionRequiredTab = lazy(() => import("../../Views/Pages/Conversaction/ActionRequiredTab"));
import { getAccessToken } from "../../services/commonService";
import "./action-chat.css";
import { dispatchWithHandling } from "../../utils/dispatchHandler";
import { ShowToast } from "../../components/show-toast/ShowToast";
import { setConversation, fetchMessageListAction, clearMessageList } from '../../redux/Slices/chat/ChatSlice';
import { getSocket } from "../../socket/socket";
import translation from "../../utils/translation";
import { fill } from "../mc-dialog/McDialog";
import { AR_HISTORY_COPY, AR_SECTION_LABEL_KEYS } from "../../Views/Pages/WorkerPage/workerModuleConstants";

/* the worker's reply window as chat derives it (UP02): who may write, and which sections keep the conversation open */
export const arWindowNote = (arWindow, name) => {
    if (!arWindow) return null;
    const sections = Array.isArray(arWindow.sections) ? arWindow.sections : [];
    if (arWindow.open && sections.length) {
        const labels = sections.map((key) => (AR_SECTION_LABEL_KEYS[key] ? translation(AR_SECTION_LABEL_KEYS[key]) : key)).join(", ");
        return {
            open: true,
            title: fill(AR_HISTORY_COPY.openTitle, { name }),
            text: fill(sections.length === 1 ? AR_HISTORY_COPY.openTextOne : AR_HISTORY_COPY.openTextOther, { count: String(sections.length), sections: labels }),
        };
    }
    return { open: false, title: fill(AR_HISTORY_COPY.closedTitle, { name }), text: AR_HISTORY_COPY.closedText };
};

/*
 * Action Required History (record rail): the worker's Action Required conversation, read-only (10 Nov 2026 package UP02;
 * prototype Worker_Details.html actionHistoryPanelHTML). Opening it never creates a conversation: chat answers the
 * existing one, or none, with the worker's reply window. Nothing is sent from here.
 */
const ActionChat = ({ entityDetails, user_type }) => {
    const dispatch = useDispatch();
    const socket = getSocket();
    let userInfo = {}
    if (user_type === "worker") {
        userInfo.name = entityDetails?.name;
        userInfo.user_id = entityDetails?.user_id;
        userInfo.user_type = user_type;
        userInfo.employer_worker_id = entityDetails?.worker_id;
        userInfo.conversation_sid = "";
        userInfo.whatsapp_number = entityDetails?.whatsapp_number;
    }
    const [userDetailInfo, setUserDetailInfo] = useState(userInfo);
    const [initState, setInitState] = useState(false);
    const [thread, setThread] = useState(null);      /* null while loading · { exists, arWindow } once chat answered */

    useEffect(() => {
        if (!initState) {
            dispatch(clearMessageList());
            dispatch(setConversation({ "friend_type": userDetailInfo?.user_type, "platform": "action_required", "friend_id": userDetailInfo?.user_id })).then((res) => {
                if (res?.payload?.success) {
                    const sid = res?.payload?.data?.conversation_sid;
                    setThread({ exists: Boolean(sid), arWindow: res?.payload?.ar_window || null });
                    if (sid) {
                        setUserDetailInfo({ ...userDetailInfo, conversation_sid: sid });
                        socket.emit('join_room', { conversation_sid: sid, token: getAccessToken() });
                        socket.emit('chat_message_read', { conversation_sid: sid, token: getAccessToken() });
                        dispatchWithHandling(dispatch, fetchMessageListAction({ sid, "limit": 10, ExclusiveStartKey: "", platform: "action_required" }));
                    }
                    setInitState(true);
                } else {
                    ShowToast("error", res?.payload?.message);
                }
            });
        }
    }, [dispatch]);

    const note = arWindowNote(thread?.arWindow, userDetailInfo?.name || "");
    return (
        <div className="card chat-action">
            { note && (
                <div className="ctx-note" data-mc-ar-window={ note.open ? "open" : "closed" }>
                    <strong>{ note.title }</strong><span>{ note.text }</span>
                </div>
            ) }
            { thread && (
                <div className="ctx-note" data-mc-ar-readonly>
                    <strong>{ AR_HISTORY_COPY.readOnlyTitle }</strong><span>{ AR_HISTORY_COPY.readOnlyText }</span>
                </div>
            ) }
            { thread && !thread.exists ? (
                <div className="ctx-state" data-mc-ar-empty>
                    <strong>{ AR_HISTORY_COPY.emptyTitle }</strong><span>{ AR_HISTORY_COPY.emptyText }</span>
                </div>
            ) : (
                <div className={ ` chat-conversation` }>
                    <ActionRequiredTab socket={ socket } userDetailInfo={ userDetailInfo } />
                </div>
            ) }
        </div>
    );
};

ActionChat.propTypes = {
    marginBottomClass: PropTypes.string,
    entityDetails: PropTypes.object,
    user_type: PropTypes.string
};

export default ActionChat;
