import React, { memo } from "react";
import PropTypes from 'prop-types';
import ChatMessagePanel from "./components/ChatMessagePanel";

/**
 * MobileTab - Thin wrapper for in-app chat messages.
 * All core logic (message handling, scrolling, real-time updates)
 * is managed by the shared ChatMessagePanel + hooks.
 */
const MobileTab = ({ socket, userDetailInfo, isChatOpen, containerHeight, chatLanguageInfo, handleUpdateConversactionList, isSocialTab, handleUpdateConversactionListUnread }) => {
    return (
        <ChatMessagePanel
            socket={ socket }
            userDetailInfo={ userDetailInfo }
            isChatOpen={ isChatOpen }
            chatLanguageInfo={ chatLanguageInfo }
            platform="app"
            activePlatformTab={ isSocialTab === "mobile" ? "app" : isSocialTab }
            onConversationListUpdate={ handleUpdateConversactionList }
            onConversationListUnread={ handleUpdateConversactionListUnread }
            containerHeight={ containerHeight }
        />
    );
};

MobileTab.propTypes = {
    socket: PropTypes.any,
    userDetailInfo: PropTypes.object,
    isChatOpen: PropTypes.bool,
    containerHeight: PropTypes.any,
    chatLanguageInfo: PropTypes.object,
    handleUpdateConversactionList: PropTypes.func,
    isSocialTab: PropTypes.string,
    handleUpdateConversactionListUnread: PropTypes.func,
};

export default memo(MobileTab);