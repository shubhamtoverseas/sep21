import React, { useState, useEffect, memo } from "react";
import PropTypes from 'prop-types';
import ChatMessagePanel from "./components/ChatMessagePanel";

/**
 * WhatsAppTab - Optimized wrapper for WhatsApp chat messages.
 * Delegates all core logic to the shared ChatMessagePanel component.
 *
 * Optimizations via reusable hooks/components:
 * - useChatAutoScroll: requestAnimationFrame-based smooth scrolling, auto-scroll only when near bottom
 * - useChatMessages: flicker-free data loading, scroll-position preservation on pagination
 * - MessageBubble: React.memo'd sub-components for each message type (text, image, file, video, audio, sticker)
 * - Single Audio instance reuse for notification sounds
 */
const WhatsAppTab = memo(({ socket, userDetailInfo, isChatOpen, isSocialTab, containerHeight, chatLanguageInfo, handleUpdateConversactionListWhatsapp, handleUpdateConversactionListUnread }) => {
    const [isSentMessageDisabled, setIsSentMessageDisabled] = useState(false);

    useEffect(() => {
        setIsSentMessageDisabled(!userDetailInfo?.isActiveSeason);
    }, [userDetailInfo?.isActiveSeason]);

    return (
        <ChatMessagePanel
            socket={ socket }
            userDetailInfo={ userDetailInfo }
            isChatOpen={ isChatOpen }
            chatLanguageInfo={ chatLanguageInfo }
            platform="whatsapp"
            activePlatformTab={ isSocialTab === "mobile" ? "app" : isSocialTab }
            onConversationListUpdate={ handleUpdateConversactionListWhatsapp }
            onConversationListUnread={ handleUpdateConversactionListUnread }
            containerHeight={ containerHeight }
            isSentMessageDisabled={ isSentMessageDisabled }
        />
    );
});

WhatsAppTab.displayName = 'WhatsAppTab';

WhatsAppTab.propTypes = {
    socket: PropTypes.any,
    userDetailInfo: PropTypes.object,
    isChatOpen: PropTypes.bool,
    isSocialTab: PropTypes.string,
    containerHeight: PropTypes.number,
    chatLanguageInfo: PropTypes.object,
    handleUpdateConversactionListWhatsapp: PropTypes.func,
    handleUpdateConversactionListUnread: PropTypes.func,
};

export default WhatsAppTab;
