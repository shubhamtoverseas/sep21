import React, { useEffect, useRef, useState, lazy } from "react";
import PropTypes from 'prop-types';
// import socketIO from "socket.io-client"
import { useDispatch, useSelector } from "react-redux";
// import { API_CHAT_URL } from "../../services/apiPath";
import Pills from "../pills/Pills";
import mobileWhite from "../../assets/img/svg/white-phone.svg"
import { getAccessToken } from "../../services/commonService";
import "../../Views/Pages/Conversaction/chat.css";
import { dispatchWithHandling } from "../../utils/dispatchHandler";
import { setConversation, fetchMessageList, clearMessageList, createGroupConversation, saveTranslationLanguage, getLanguageTranslate } from '../../redux/Slices/chat/ChatSlice';
import { ShowToast } from "../../components/show-toast/ShowToast";
const MobileTab = lazy(() => import("../../Views/Pages/Conversaction/MobileTab"));
const WhatsAppTab = lazy(() => import("../../Views/Pages/Conversaction/WhatsAppTab"));
const LineTab = lazy(() => import("../../Views/Pages/Conversaction/LineTab"));
const ChatConversation = lazy(() => import("../../Views/Pages/Conversaction/ChatConversation"));
const ChatBoxResizers = lazy(() => import("../chat-box-resizers/ChatBoxResizers"));
const SendTemplateWhatsApp = lazy(() => import("../../components/Layout/popups/template-whatsapp/SendTemplatePopup"));
import { getSocket } from "../../socket/socket";

const CommonIndividualChat = ({ entityDetails, user_type, handleOnCloseChat }) => {
    const dispatch = useDispatch();
    const socket = getSocket();
    const [isSocialTab, setIsSocialTab] = useState('mobile');
    const [size, setSize] = useState({ width: 500, height: 500, top: null, left: null });
    const chatRef = useRef(null);
    const [isWhatsAppTemplateopen, setIsWhatsAppTemplateopen] = useState(false);
    const [commonTemplateData, setCommonTemplateData] = useState({ slug: "", title: "", userType: "", actionStatusType: "", statusKey: "", action: "", actionLocation: "" });
    const [tabsKey, setTabsKey] = useState(0);
    const chatLanguageInfo = useSelector((state) => state.chat.chatLanguageInfo);

    let userInfo = {}
    if (user_type === "worker") {
        userInfo.name = entityDetails?.worker_name;
        userInfo.user_id = entityDetails?.worker_user_id;
        userInfo.user_type = user_type;
        userInfo.employer_worker_id = entityDetails?.worker_id;
        userInfo.conversation_sid = "";
        userInfo.whatsapp_number = entityDetails?.whatsapp_number;
        userInfo.receiver_lastMessage = false;
        userInfo.isActiveSeason = false;
    }
    if (user_type === "employer") {
        userInfo.name = entityDetails?.employer_name;
        userInfo.user_id = entityDetails?.employer_user_id;
        userInfo.user_type = user_type;
        userInfo.employer_worker_id = entityDetails?.employer_id;
        userInfo.conversation_sid = "";
        userInfo.whatsapp_number = entityDetails?.whatsapp_number;
        userInfo.receiver_lastMessage = false;
        userInfo.isActiveSeason = false;
    }
    if (user_type === "user") {
        userInfo.name = entityDetails?.name;
        userInfo.user_id = entityDetails?.user_id;
        userInfo.user_type = user_type;
        userInfo.employer_worker_id = entityDetails?.cs_owner_id;
        userInfo.conversation_sid = "";
        userInfo.whatsapp_number = entityDetails?.whatsapp_number;
        userInfo.receiver_lastMessage = false;
        userInfo.isActiveSeason = false;
    }
    if (user_type === "group_team") {
        userInfo.name = "";
        userInfo.user_id = "";
        userInfo.user_type = user_type;
        userInfo.employer_worker_id = "";
        userInfo.conversation_sid = "";
        userInfo.id = entityDetails?.id;
        userInfo.receiver_lastMessage = false;
        userInfo.isActiveSeason = false;
        userInfo.job_worker_id = entityDetails?.job_worker_id;
        userInfo.job_interview_id = entityDetails?.job_interview_id;
    }
    if (entityDetails?.entity_id) {
        userInfo.media_type = entityDetails?.media_type;
        userInfo.entity_id = entityDetails?.entity_id;
        userInfo.media_link = entityDetails?.media_link;
        userInfo.entity_name = entityDetails?.entity_name;
        userInfo.entity_job_id = entityDetails?.entity_job_id;
        userInfo.entity_type = entityDetails?.entity_type;
        userInfo.whatsapp_number = entityDetails?.whatsapp_number;
    }

    const [userDetailInfo, setUserDetailInfo] = useState(userInfo);
    const [initState, setInitState] = useState(false);

    useEffect(() => {
        dispatch(getLanguageTranslate());
    }, [dispatch]);

    const handleUpdateConversactionListUnread = () => {};   /* the conversation list lives on the Global Chat page; nothing to refresh here */

    const handleUpdateConversactionList = () => {};   /* the conversation list lives on the Global Chat page; nothing to refresh here */

    const handleUpdateConversactionListWhatsapp = () => {};   /* the conversation list lives on the Global Chat page; nothing to refresh here */

    const socialMediaTabs = user_type === "group_team"
        ? [
            {
                eventKey: 'mobile',
                title: <div className="mobile-icon-blue-bg"><img src={ mobileWhite } className="w12 h12" /></div>,
                content: <MobileTab socket={ socket } userDetailInfo={ userDetailInfo } isChatOpen={ false }
                    isSocialTab={ isSocialTab }
                    containerHeight={ size.height } chatLanguageInfo={ chatLanguageInfo } handleUpdateConversactionList={ (msg) => { handleUpdateConversactionList(msg) } }
                    handleUpdateConversactionListUnread={ (msg) => { handleUpdateConversactionListUnread(msg) } } />
            }
        ]
        : [
            {
                eventKey: 'mobile',
                title: <div className="mobile-icon-blue-bg"><img src={ mobileWhite } className="w12 h12" /></div>,
                content: <MobileTab socket={ socket } userDetailInfo={ userDetailInfo } isChatOpen={ false } isSocialTab={ isSocialTab }
                    containerHeight={ size.height } chatLanguageInfo={ chatLanguageInfo } handleUpdateConversactionList={ (msg) => { handleUpdateConversactionList(msg) } }
                    handleUpdateConversactionListUnread={ (msg) => { handleUpdateConversactionListUnread(msg) } } />
            },
            {
                eventKey: 'whatsapp',
                title: <><span title={ userInfo.whatsapp_number }>{ userDetailInfo?.receiver_lastMessage ? <i className="ri-whatsapp-fill fz20 grey2 whatsapp-color"></i> : <i className="ri-whatsapp-fill fz20 grey2"></i> }</span></>,
                content: <WhatsAppTab socket={ socket } userDetailInfo={ userDetailInfo } isChatOpen={ false } isSocialTab={ isSocialTab }
                    containerHeight={ size.height } chatLanguageInfo={ chatLanguageInfo } handleUpdateConversactionListWhatsapp={ (msg) => { handleUpdateConversactionListWhatsapp(msg) } } />
            },
            {
                eventKey: 'line',
                title: <><span title={ userInfo.whatsapp_number }>{ userDetailInfo?.receiver_lastMessage ? <i className="ri-line-fill fz20 grey2"></i> : <i className="ri-line-fill fz20 grey2"></i> }</span></>,
                content: <LineTab socket={ socket } userDetailInfo={ userDetailInfo } isChatOpen={ false } isSocialTab={ isSocialTab }
                    containerHeight={ size.height } chatLanguageInfo={ chatLanguageInfo } />
            },
        ];

    useEffect(() => {
        if (!initState) {
            dispatch(clearMessageList());
            if (user_type === "group_team") {
                dispatch(createGroupConversation({ "friend_type": "group", "platform": "app", "group_type": "job", "id": entityDetails?.id, "job_worker_id": entityDetails?.job_worker_id, "job_interview_id": entityDetails?.job_interview_id })).then((res) => {
                    if (res?.payload?.success) {
                        setUserDetailInfo({ ...userDetailInfo, conversation_sid: res?.payload?.data?.conversation_sid, name: res?.payload?.data?.friendly_name, friend_type: res?.payload?.data?.friend_type, friendly_name: res?.payload?.data?.friendly_name, receiver_lastMessage: res?.payload?.data?.receiver_lastMessage, isActiveSeason: res?.payload?.data?.isActiveSeason });
                        socket.emit('join_room', { conversation_sid: res?.payload?.data?.conversation_sid, token: getAccessToken() });
                        socket.emit('chat_message_read', { conversation_sid: res?.payload?.data?.conversation_sid, token: getAccessToken() });
                        dispatchWithHandling(dispatch, fetchMessageList({ sid: res?.payload?.data?.conversation_sid, "limit": 10, ExclusiveStartKey: "", platform: "app" }));
                        setInitState(true);
                    } else {
                        if (res?.error?.message) {
                            ShowToast("error", res?.error?.message);
                        } else {
                            ShowToast("error", res?.payload?.message);
                        }
                    }
                });
            } else {
                dispatch(setConversation({ "friend_type": userDetailInfo?.user_type, "platform": "app", "friend_id": userDetailInfo?.user_id })).then((res) => {
                    if (res?.payload?.success) {
                        setUserDetailInfo({ ...userDetailInfo, conversation_sid: res?.payload?.data?.conversation_sid, friendly_name: res?.payload?.data?.friendly_name, receiver_lastMessage: res?.payload?.data?.receiver_lastMessage, isActiveSeason: res?.payload?.data?.isActiveSeason });
                        socket.emit('join_room', { conversation_sid: res?.payload?.data?.conversation_sid, token: getAccessToken() });
                        socket.emit('chat_message_read', { conversation_sid: res?.payload?.data?.conversation_sid, token: getAccessToken() });
                        dispatchWithHandling(dispatch, fetchMessageList({ sid: res?.payload?.data?.conversation_sid, "limit": 10, ExclusiveStartKey: "", platform: "app" }));
                        setInitState(true);
                    } else {
                        if (res?.error?.message) {
                            ShowToast("error", res?.error?.message);
                        } else {
                            ShowToast("error", res?.payload?.message);
                        }
                    }
                });
            }
        }
    }, [dispatch]);

    const onSetActiveTab = (eventKey) => {
        dispatch(clearMessageList());
        setIsSocialTab(eventKey)
        if (eventKey === 'mobile') {
            if (user_type === "group_team") {
                dispatch(createGroupConversation({ "friend_type": "group", "platform": "app", "group_type": "job", "id": entityDetails?.id, "job_worker_id": entityDetails?.job_worker_id, "job_interview_id": entityDetails?.job_interview_id })).then((res) => {
                    if (res?.payload?.success) {
                        setUserDetailInfo({ ...userDetailInfo, conversation_sid: res?.payload?.data?.conversation_sid, name: res?.payload?.data?.friendly_name, friend_type: res?.payload?.data?.friend_type, friendly_name: res?.payload?.data?.friendly_name, receiver_lastMessage: res?.payload?.data?.receiver_lastMessage, isActiveSeason: res?.payload?.data?.isActiveSeason });
                        socket.emit('join_room', { conversation_sid: res?.payload?.data?.conversation_sid, token: getAccessToken() });
                        socket.emit('chat_message_read', { conversation_sid: res?.payload?.data?.conversation_sid, token: getAccessToken() });
                        dispatchWithHandling(dispatch, fetchMessageList({ sid: res?.payload?.data?.conversation_sid, "limit": 10, ExclusiveStartKey: "", platform: "app" }));
                        setInitState(true);
                    } else {
                        if (res?.error?.message) {
                            ShowToast("error", res?.error?.message);
                        } else {
                            ShowToast("error", res?.payload?.message);
                        }
                    }
                });
            } else {
                dispatch(setConversation({ "friend_type": userDetailInfo?.user_type, "platform": "app", "friend_id": userDetailInfo?.user_id })).then((res) => {
                    if (res?.payload?.success) {
                        setUserDetailInfo({ ...userDetailInfo, conversation_sid: res?.payload?.data?.conversation_sid, friendly_name: res?.payload?.data?.friendly_name, receiver_lastMessage: res?.payload?.data?.receiver_lastMessage, isActiveSeason: res?.payload?.data?.isActiveSeason });
                        socket.emit('join_room', { conversation_sid: res?.payload?.data?.conversation_sid, token: getAccessToken() });
                        socket.emit('chat_message_read', { conversation_sid: res?.payload?.data?.conversation_sid, token: getAccessToken() });
                        dispatchWithHandling(dispatch, fetchMessageList({ sid: res?.payload?.data?.conversation_sid, "limit": 10, ExclusiveStartKey: "", platform: "app" }));
                        setInitState(true);
                    } else {
                        dispatch(clearMessageList());
                        if (res?.error?.message) {
                            ShowToast("error", res?.error?.message);
                        } else {
                            ShowToast("error", res?.payload?.message);
                        }
                    }
                });
            }

        } else if (eventKey === 'whatsapp') {
            dispatch(setConversation({ "friend_type": userDetailInfo?.user_type, "platform": "whatsapp", "friend_id": userDetailInfo?.user_id })).then((res) => {
                if (res?.payload?.success) {
                    setUserDetailInfo({ ...userDetailInfo, conversation_sid: res?.payload?.data?.id, friendly_name: res?.payload?.data?.friendly_name, receiver_lastMessage: res?.payload?.data?.receiver_lastMessage, isActiveSeason: res?.payload?.data?.isActiveSeason });
                    socket.emit('join_room', { conversation_sid: res?.payload?.data?.id, token: getAccessToken() });
                    socket.emit('chat_message_read', { conversation_sid: res?.payload?.data?.id, token: getAccessToken() });
                    dispatchWithHandling(dispatch, fetchMessageList({ sid: res?.payload?.data?.id, "limit": 10, ExclusiveStartKey: "", platform: "whatsapp" }));
                    setInitState(true);
                } else {
                    dispatch(clearMessageList());
                    if (res?.error?.message) {
                        ShowToast("error", res?.error?.message);
                    } else {
                        ShowToast("error", res?.payload?.message);
                    }
                }
            });
        } else if (eventKey === 'line') {
            dispatch(setConversation({ "friend_type": userDetailInfo?.user_type, "platform": "line", "friend_id": userDetailInfo?.user_id })).then((res) => {
                if (res?.payload?.success) {
                    setUserDetailInfo({ ...userDetailInfo, conversation_sid: res?.payload?.data?.id, friendly_name: res?.payload?.data?.friendly_name, receiver_lastMessage: res?.payload?.data?.receiver_lastMessage, isActiveSeason: res?.payload?.data?.isActiveSeason });
                    socket.emit('join_room', { conversation_sid: res?.payload?.data?.id, token: getAccessToken() });
                    socket.emit('chat_message_read', { conversation_sid: res?.payload?.data?.id, token: getAccessToken() });
                    dispatchWithHandling(dispatch, fetchMessageList({ sid: res?.payload?.data?.id, "limit": 10, ExclusiveStartKey: "", platform: "line" }));
                    setInitState(true);
                } else {
                    dispatch(clearMessageList());
                    if (res?.error?.message) {
                        ShowToast("error", res?.error?.message);
                    } else {
                        ShowToast("error", res?.payload?.message);
                    }
                }
            });
        }
    }

    const startResize = (e, direction) => {
        e.preventDefault();
        e.stopPropagation();

        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = chatRef.current.offsetWidth;
        const startHeight = chatRef.current.offsetHeight;
        const startLeft = chatRef.current.offsetLeft;
        const startTop = chatRef.current.offsetTop;

        const onMouseMove = (e) => {
            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // Handle horizontal resizing
            if (direction.includes("right")) {
                newWidth = startWidth + deltaX;
            }
            if (direction.includes("left")) {
                newWidth = startWidth - deltaX;
                newLeft = startLeft + deltaX;
            }

            // Handle vertical resizing
            if (direction.includes("bottom")) {
                newHeight = startHeight + deltaY;
            }
            if (direction.includes("top")) {
                newHeight = startHeight - deltaY;
                newTop = startTop + deltaY;
            }

            // For edge resizers (not corners)
            if (direction === "right") {
                newWidth = startWidth + deltaX;
            }
            if (direction === "left") {
                newWidth = startWidth - deltaX;
                newLeft = startLeft + deltaX;
            }
            if (direction === "bottom") {
                newHeight = startHeight + deltaY;
            }
            if (direction === "top") {
                newHeight = startHeight - deltaY;
                newTop = startTop + deltaY;
            }

            // Apply constraints
            const minWidth = 250;
            const minHeight = 200;
            const maxWidth = window.innerWidth - 47;
            const maxHeight = window.innerHeight;

            // Constrain width
            newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

            // Constrain height
            newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

            // Adjust position if width constraint was applied for left resize
            if (direction.includes("left") && newWidth === minWidth) {
                newLeft = startLeft + startWidth - minWidth;
            }

            // Adjust position if height constraint was applied for top resize
            if (direction.includes("top") && newHeight === minHeight) {
                newTop = startTop + startHeight - minHeight;
            }

            setSize({
                width: newWidth,
                height: newHeight,
                top: newTop,
                left: newLeft,
            });
        };

        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    };

    const onOpenMessageTemplate = () => {
        setIsWhatsAppTemplateopen(true);
        setCommonTemplateData({ slug: "whatsapp", title: "Send Template", userType: user_type, actionStatusType: "whatsapp", statusKey: "", action: "whatsapp" });
    }

    const handleSaveTranslationLanguage = (payload) => {
        dispatch(saveTranslationLanguage(payload)).then((res) => {
            if (res?.payload?.success) {
                dispatch(getLanguageTranslate());
                setTimeout(() => {
                    setTabsKey(prev => prev + 1); // force remount
                    onSetActiveTab(isSocialTab);
                }, 500);
            }
        });
    }

    return <div ref={ chatRef } className="chat-page processing-page"
        style={ {
            width: size.width,
            height: size.height,
            top: size.top ?? undefined,
            left: size.left ?? undefined,
        } }>

        { isWhatsAppTemplateopen && <SendTemplateWhatsApp onClose={ () => setIsWhatsAppTemplateopen(false) } userType={ commonTemplateData.userType } userId={ userDetailInfo?.user_id } slug={ commonTemplateData.slug } send_to={ userDetailInfo?.whatsapp_number } title={ commonTemplateData.title } employee_worker_id={ userDetailInfo?.employer_worker_id } status_key={ commonTemplateData.statusKey } actionStatusType={ commonTemplateData.actionStatusType } action={ commonTemplateData.action } fullname={ userDetailInfo?.name } workerInfoDetails={ userDetailInfo } actionLocation={ commonTemplateData.actionLocation } workerInfoMapping={ userDetailInfo } isCategoryRequired={ false }
            whatsAppTemplatesRequired='welcome_message_template' custom_content_params={ { name: userDetailInfo.name } } /> }

        <div className="chat-conversation">
            <ChatConversation userDetailInfo={ userDetailInfo } viewFrom={ isSocialTab } onCloseChat={ handleOnCloseChat } onOpenMessageTemplate={ onOpenMessageTemplate } chatLanguageInfo={ chatLanguageInfo } handleSaveTranslationLanguageMessage={ handleSaveTranslationLanguage } />
            <Pills tabs={ socialMediaTabs } isLinedPills={ true } activeTab={ isSocialTab }
                onTabSelect={ (eventKey) => onSetActiveTab(eventKey) } marginBottom="mb-0" key={ tabsKey } />
        </div>

        <ChatBoxResizers onResizeStart={ startResize } />
    </div>
}
CommonIndividualChat.propTypes = {
    entityDetails: PropTypes.object,
    handleOnCloseChat: PropTypes.func,
    user_type: PropTypes.string,
};

export default CommonIndividualChat;