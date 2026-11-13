import io from "socket.io-client";
import { API_CHAT_URL, HOST_TYPE, REACT_APP_X_API_KEY } from '../services/apiPath';
import { getAccessToken } from '../services/commonService';

let socket = null;

export const getSocket = () => {
    if (!socket) {
        const token = getAccessToken();
        socket = io(API_CHAT_URL, {
            path: "/socket.io",
            transports: ["polling", "websocket"],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            autoConnect: true,
            auth: (cb) => cb({ token: getAccessToken() }),
            query: {
                token: token,
            },
            extraHeaders: {
                "hosttype": HOST_TYPE,
                "device": navigator.userAgent,
                "x-api-key": REACT_APP_X_API_KEY,
                "language": localStorage.getItem('i18nextLng'),
                "Accept-Language": localStorage.getItem('i18nextLng'),
                "authorization": `Bearer ${ token }`,
            }
        });

        socket.on("connect", () => {
            console.log("✅ Socket connected:", socket.id);
        });

        socket.on("connect_error", (err) => {
            console.log("❌ Socket connect error:", err.message);
        });

        socket.on("disconnect", (reason) => {
            console.log("❌ Socket disconnected:", reason);
        });
    }

    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
