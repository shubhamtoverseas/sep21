import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import "./global-chat.css";
import GcMessagePanel from "./GcMessagePanel";
import GcThreadHeader from "./GcThreadHeader";
import translation from "../../../../utils/translation";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import { dispatchWithHandling } from "../../../../utils/dispatchHandler";
import { getAccessToken } from "../../../../services/commonService";
import { setConversation, fetchMessageList, clearMessageList, clearMessages, getLanguageTranslate } from "../../../../redux/Slices/chat/ChatSlice";
import { getSocket } from "../../../../socket/socket";
import { gcChatLanguage } from "./gcHelpers";
import { GC_COMPOSER_COPY, GC_LIST_LIMIT } from "./gcConstants";

const SendTemplateWhatsApp = React.lazy(() => import("../../../../components/Layout/popups/template-whatsapp/SendTemplatePopup"));

/* Scoped chat beside a record (prototype .scoped-chat): the scoped thread header (tag, name, channel pills —
   no translation segment, no search), the timeline and the composer. `rail` is the Contract record's rail thread
   (Contract_Details chatThreadHTML): the host draws the back row with the name, so the header carries only the
   Original · Translated · Both segment and the channel pills, and the composer shows its template / attach icons. */
const GcMiniChat = ({ entityDetails, user_type, initialDraft, rail = false, showTranslate = false }) => {
    const dispatch = useDispatch();
    const socket = getSocket();
    const chatLanguageInfo = useSelector((state) => state.chat.chatLanguageInfo);
    const { i18n } = useTranslation();
    const chatLanguage = gcChatLanguage(i18n.language);
    const chatLanguageInfoForApp = useMemo(
        () => ({ ...chatLanguageInfo, chat_translate_language: chatLanguage }),
        [chatLanguageInfo, chatLanguage]
    );

    const baseInfo = useMemo(() => {
        const info = {
            user_type,
            conversation_sid: "",
            receiver_lastMessage: false,
            isActiveSeason: false,
            whatsapp_number: entityDetails?.whatsapp_number,
        };
        if (user_type === "worker") {
            info.name = entityDetails?.worker_name;
            info.user_id = entityDetails?.worker_user_id;
            info.employer_worker_id = entityDetails?.worker_id;
        } else if (user_type === "employer") {
            info.name = entityDetails?.employer_name;
            info.user_id = entityDetails?.employer_user_id;
            info.employer_worker_id = entityDetails?.employer_id;
        } else {
            info.name = entityDetails?.name;
            info.user_id = entityDetails?.user_id;
            info.employer_worker_id = entityDetails?.cs_owner_id;
        }
        if (entityDetails?.entity_id) {
            info.media_type = entityDetails?.media_type;
            info.entity_id = entityDetails?.entity_id;
            info.media_link = entityDetails?.media_link;
            info.entity_name = entityDetails?.entity_name;
            info.entity_job_id = entityDetails?.entity_job_id;
            info.entity_type = entityDetails?.entity_type;
        }
        return info;
    }, [entityDetails, user_type]);

    const [userDetailInfo, setUserDetailInfo] = useState(baseInfo);
    const [activeChannel, setActiveChannel] = useState("app");
    const [isWaTemplateOpen, setIsWaTemplateOpen] = useState(false);
    /* a host may seed the composer (Job Offer "Add link": the link is drafted, never sent or copied) */
    const [pendingDraft, setPendingDraft] = useState(initialDraft || "");
    /* U-0303: the Original / Translated / Both switch is a view choice for this thread only — opens on Both, never read from or saved to a preference */
    const [translateMode, setTranslateMode] = useState("both");

    /* `notice` is shown once the channel has opened */
    const openChannel = useCallback((channelId, notice) => {
        dispatch(clearMessageList());
        dispatch(clearMessages());
        setActiveChannel(channelId);
        dispatch(setConversation({ friend_type: baseInfo.user_type, platform: channelId, friend_id: baseInfo.user_id })).then((res) => {
            if (res?.payload?.success) {
                const conv = res.payload.data;
                const sid = conv?.conversation_sid || conv?.id;
                setUserDetailInfo({
                    ...baseInfo,
                    conversation_sid: sid,
                    receiver_lastMessage: conv?.receiver_lastMessage ?? false,
                    isActiveSeason: conv?.isActiveSeason ?? false,
                    wa_window_expires_at: conv?.wa_window_expires_at ?? null,
                });
                socket.emit("join_room", { conversation_sid: sid, token: getAccessToken() });
                socket.emit("chat_message_read", { conversation_sid: sid, token: getAccessToken() });
                dispatchWithHandling(dispatch, fetchMessageList({ sid, limit: GC_LIST_LIMIT, ExclusiveStartKey: "", platform: channelId }));
                if (notice) ShowToast("success", notice);
            } else {
                dispatch(clearMessageList());
                dispatch(clearMessages());
                ShowToast("error", res?.error?.message || res?.payload?.message);
            }
        });
    }, [dispatch, socket, baseInfo]);

    useEffect(() => {
        dispatch(getLanguageTranslate());
        if (baseInfo.user_id) openChannel("app");
        return () => {
            dispatch(clearMessageList());
            dispatch(clearMessages());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseInfo.user_id]);

    /* room membership does not survive a socket reconnect */
    useEffect(() => {
        if (!userDetailInfo?.conversation_sid) return undefined;
        const rejoinRoom = () => {
            socket.emit("join_room", { conversation_sid: userDetailInfo.conversation_sid, token: getAccessToken() });
        };
        socket.on("connect", rejoinRoom);
        return () => socket.off("connect", rejoinRoom);
    }, [socket, userDetailInfo?.conversation_sid]);

    const handleChannelSwitch = useCallback((channelId, notice) => {
        if (channelId !== activeChannel) openChannel(channelId, notice);
    }, [activeChannel, openChannel]);

    /* lock panel "Use <channel>": switches only — nothing is sent automatically, and the notice says so */
    const handleUseChannel = useCallback(
        (channelId) => handleChannelSwitch(channelId, GC_COMPOSER_COPY.switchedTo[channelId]),
        [handleChannelSwitch]
    );

    const handleFailedDraftToInApp = useCallback((body) => {
        setPendingDraft(body || "");
        handleChannelSwitch("app");
    }, [handleChannelSwitch]);
    /* the panel remounts once the conversation sid resolves (key = sid|channel): a draft consumed by the sid-less first mount is
       seeded again on the real thread, so the Add-link draft is not lost (U-0132) */
    const handlePendingDraftConsumed = useCallback(() => { if (userDetailInfo?.conversation_sid) setPendingDraft(""); }, [userDetailInfo?.conversation_sid]);

    const handleOpenTemplate = useCallback(() => setIsWaTemplateOpen(true), []);

    /* the scoped header reads the same shape as a Global Chat conversation group */
    const headerFriendType = user_type === "worker" || user_type === "employer" ? user_type : "user";
    const headerGroup = useMemo(() => ({
        friendType: headerFriendType,
        latestRow: { name: baseInfo.name, friend_type: headerFriendType },
    }), [headerFriendType, baseInfo.name]);

    /* Team conversations are In-App only (register row #15) */
    const channels = useMemo(() => (
        headerFriendType !== "user" && baseInfo.whatsapp_number ? ["app", "whatsapp"] : ["app"]
    ), [headerFriendType, baseInfo.whatsapp_number]);

    return (
        <div className={ `gcp gc-mini${ rail ? " gc-rail" : "" }` }>
            <GcThreadHeader
                scoped
                hideIdentity={ rail }
                showTranslate={ rail || showTranslate }
                translateMode={ translateMode }
                onTranslateMode={ setTranslateMode }
                group={ headerGroup }
                channels={ channels }
                activeChannel={ activeChannel }
                onChannelSwitch={ handleChannelSwitch }
                waSource={ activeChannel === "whatsapp" ? userDetailInfo : null }
            />
            <GcMessagePanel
                compactMeta
                key={ `${ userDetailInfo?.conversation_sid }|${ activeChannel }` }
                socket={ socket }
                userDetailInfo={ userDetailInfo }
                group={ null }
                platform={ activeChannel }
                isChatOpen={ false }
                chatLanguageInfo={ chatLanguageInfoForApp }
                translateMode={ rail || showTranslate ? translateMode : "original" }
                emptyLabel={ translation("key_no_messages_in_this_channel") }
                onOpenMessageTemplate={ handleOpenTemplate }
                channels={ channels }
                onUseChannel={ handleUseChannel }
                onFailedDraftToInApp={ handleFailedDraftToInApp }
                initialDraft={ pendingDraft }
                onInitialDraftConsumed={ handlePendingDraftConsumed }
            />
            { isWaTemplateOpen && createPortal(
                <Suspense fallback={ <div className="gc-lazy-scrim"><span className="gc-lazy-spin" /></div> }>
                    <div className="gc-skin">
                        <SendTemplateWhatsApp
                            onClose={ () => setIsWaTemplateOpen(false) }
                            userType={ userDetailInfo?.user_type }
                            userId={ userDetailInfo?.user_id }
                            slug="whatsapp"
                            send_to={ userDetailInfo?.whatsapp_number }
                            title={ translation('key_send_template') }
                            employee_worker_id={ userDetailInfo?.employer_worker_id }
                            status_key=""
                            actionStatusType="whatsapp"
                            action="whatsapp"
                            fullname={ userDetailInfo?.name }
                            workerInfoDetails={ userDetailInfo }
                            workerInfoMapping={ userDetailInfo }
                            isCategoryRequired={ false }
                            whatsAppTemplatesRequired="welcome_message_template"
                            custom_content_params={ { name: userDetailInfo?.name } }
                        />
                    </div>
                </Suspense>,
                document.body
            ) }
        </div>
    );
};

GcMiniChat.propTypes = {
    /* the translate segment on a host rail that keeps its own header (Worker / Employer records) */
    showTranslate: PropTypes.bool,
    entityDetails: PropTypes.object,
    handleOnCloseChat: PropTypes.func,
    user_type: PropTypes.string,
    initialDraft: PropTypes.string,
    rail: PropTypes.bool,
};

export default GcMiniChat;
