import notificationSound from "../../assets/sounds/chat-sound.wav";
import { getSocket, disconnectSocket } from "../../socket/socket";
import { incrementUnreadChatCount } from '../../redux/Slices/chat/ChatSlice';
import { getAccessToken } from "../../services/commonService";

// Reuse a single Audio instance instead of creating one per notification
let cachedAudio = null;
const playNotification = () => {
    if (!cachedAudio) {
        cachedAudio = new Audio(notificationSound);
    }
    cachedAudio.currentTime = 0;
    cachedAudio.play().catch((err) => {
        console.log("Autoplay prevented:", err);
    });
};

export const chatSocketHandle = (currentUser, dispatch) => {

    const socket = getSocket();

    const handleCommonMessageGet = (data) => {
        playNotification();
        dispatch(incrementUnreadChatCount());
        console.log("Message received socket handler", data);
    };

    const handleInvalidAccess = (data) => {
        console.warn('Socket INVALID_ACCESS:', data?.message || data);
    };

    const connectSocketChat = () => {
        if (socket) {
            socket.emit('join_room_user', { userId: currentUser?.id, token: getAccessToken() });
            socket.on('check_message_event', handleCommonMessageGet);
            socket.on('INVALID_ACCESS', handleInvalidAccess);
        }
        return () => {
            if (socket) {
                socket.off('check_message_event', handleCommonMessageGet);
                socket.off('INVALID_ACCESS', handleInvalidAccess);
            }
        };
    };

    const disconnectSocketChat = () => {
        disconnectSocket();
    };

    return {
        connectSocketChat,
        disconnectSocketChat
    };
};