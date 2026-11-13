import React, { useEffect, useState, useRef, lazy } from "react";
import { sanitizeHtml } from "../../../utils/sanitize";
import { useDispatch, useSelector } from 'react-redux';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { useInfiniteQuery } from '@tanstack/react-query';
import userImg from "../../../assets/img/user-icon.png";
import userPdf from "../../../assets/img/pdf.png";
import userDocs from "../../../assets/img/docs.png";
import { getCurrentUser } from "../../../services/commonService";
import { Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { fetchMessageListAction } from '../../../redux/Slices/chat/ChatSlice';
import "./chat.css";
const CustomSpinner = lazy(() => import("../../../components/ReusableComponents/chatLoader"));
import translation from "../../../utils/translation";
const FilePreviewModal = lazy(() => import("../../../components/popups/FilePreviewModal"));
import { getSocket } from "../../../socket/socket";
import notificationSound from "../../../assets/sounds/chat-sound.wav";

/*
 * The worker's Action Required conversation as the record's read-only history (10 Nov 2026 package UP02; prototype
 * Worker_Details.html actionHistoryPanelHTML: "Read-only history … does not … expose resolve, verify, or on-behalf
 * controls"). Messages load and arrive live; files open and download. Nothing is sent or deleted from here — a correction
 * is raised through the section's Change Status → Action Required.
 */
const ActionRequiredTab = ({ socket = getSocket(), userDetailInfo }) => {
    const [messageList, setMessageList] = useState([]);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewFileUrl, setPreviewFileUrl] = useState(null);
    const lastScrollTop = useRef(0);
    const dispatch = useDispatch();
    // const queryClient = useQueryClient();
    const { messageStatus } = useSelector((state) => state.chat);

    const messagesContainerRef = useRef(null); // Add this ref for the scroll container
    // Helper to get scroll height and scrollTop before fetching
    const [prevScrollHeight, setPrevScrollHeight] = useState(0);


    const messagesEndRef = useRef(null);
    //const isFetching = useRef(false);
    const debounceTimeout = useRef(null);

    // Scroll helper
    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: 'end' });
        } else {
            console.warn("messagesEndRef is not set yet.");
        }
    };

    // Play chat notification sound
    const playNotification = () => {
        const audio = new Audio(notificationSound);
        audio.play().catch(err => {
            console.log("Autoplay prevented:", err);
        });
    };

    useEffect(() => {
        const element = messagesEndRef.current;
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [messagesEndRef]);

    // ------------------ React Query Infinite Fetch ------------------
    // queryKey: messages + conversation + platform
    const conversationSid = userDetailInfo?.conversation_sid;
    const platform = "action_required";

    const infiniteQuery = useInfiniteQuery(
        ['messages', conversationSid, platform],
        // queryFn: receives { pageParam } as ExclusiveStartKey (LastEvaluatedKey)
        async ({ pageParam = "" }) => {
            // build params similar to original
            const parameters = {
                sid: conversationSid,
                limit: 10,
                ExclusiveStartKey: pageParam,
                platform
            };
            // call redux thunk (so you keep your existing logic)
            const res = await dispatch(fetchMessageListAction(parameters)).unwrap();
            // return the same object shape expected: { data: [...], LastEvaluatedKey: ... }
            return res;
        },
        {
            // only enable when conversation exists
            enabled: !!conversationSid,
            // provide next page param based on LastEvaluatedKey
            getNextPageParam: (lastPage) => {
                // lastPage.LastEvaluatedKey should be the cursor for next call (older messages)
                return lastPage?.LastEvaluatedKey || undefined;
            },
            refetchOnWindowFocus: false,
            staleTime: 1000 * 60 // 1 minute, tweak if needed
        }
    );

    const { data, isLoading, isFetchingNextPage, fetchNextPage, hasNextPage } = infiniteQuery;

    // Track whether we've done the initial load (to scroll to bottom only once)
    const initialLoadDone = useRef(false);
    // Track IDs of messages added locally via socket (so they don't get wiped by query sync)
    const localMessageIds = useRef(new Set());

    // Rebuild messageList whenever query data or userDetailInfo changes
    useEffect(() => {
        if (!data || !Array.isArray(data.pages)) {
            setMessageList([]);
            initialLoadDone.current = false;
            return;
        }

        // data.pages is an array of responses: first page = most recent (as in your thunk)
        // We want to present messages with older ones first so that bottom is newest.
        const combined = data.pages
            .slice() // copy
            .reverse() // oldest page first
            .flatMap(page => (page?.data || []));

        // transform server message objects into UI message objects
        const transformed = combined.map(msg => {
            const msgDirection = msg.created_by == userDetailInfo?.user_id ? 'recieve' : 'send';
            return {
                conversation_sid: userDetailInfo?.conversation_sid,
                id: msg?.id,
                body: msg?.content,
                profile_image: msg?.profile_image,
                vector: msgDirection,
                media_type: msg?.media_type,
                media_link: msg?.media_link,
                status: msg?.status,
                read_status: msg?.read_status,
                full_name: msg?.full_name,
                entity_type: msg?.entity_type || "",
                entity_name: msg?.entity_name || "",
                chatDateTime: formatTo12HourTime(msg?.created_at)
            };
        });

        // Collect IDs from the server data
        const serverIds = new Set(transformed.map(m => m.id).filter(Boolean));

        // Merge: keep locally appended messages (via socket) that aren't yet in the server data
        setMessageList((prevList) => {
            const localOnlyMsgs = prevList.filter(
                (m) => localMessageIds.current.has(m.id) && !serverIds.has(m.id)
            );
            // Also keep temporary messages (id === "") that are still "sending"
            const tempMsgs = prevList.filter((m) => m.id === "");
            return [...transformed, ...localOnlyMsgs, ...tempMsgs];
        });

        // after initial load, scroll to bottom (only once)
        if (!initialLoadDone.current) {
            initialLoadDone.current = true;
            setTimeout(() => {
                scrollToBottom();
            }, 200);
        }
    }, [data, userDetailInfo]);

    // ------------------ Message append & handling ------------------
    const appendMsg = React.useCallback((msg) => {
        setMessageList((previousMessage) => [...previousMessage, msg]);
        // Track locally appended messages so they survive query data sync
        if (msg.id) {
            localMessageIds.current.add(msg.id);
        }
    }, []);

    // ------------------ handleReceivedMsg (socket) ------------------
    const handleReceivedMsg = React.useCallback((msg, userDetailInfoChat) => {
        console.log("Socket receiver - receive_message", msg);
        let msgDirection = msg.data.created_by == userDetailInfo?.user_id ? 'recieve' : 'send';
        if (msg.data.created_by == getCurrentUser().data?.id) {
            // Track this message ID so it survives query data sync
            if (msg.data.id) {
                localMessageIds.current.add(msg.data.id);
            }
            // Update temporary message which had empty id
            setMessageList((prevData) => {
                // If msg.entity_type is not empty, append this msg as the last message
                if (msg.data.entity_type && msg.data.entity_type !== "") {
                    // Remove any previous message with empty id (temporary sending message)
                    const filtered = prevData.filter(item => item.id !== "");
                    // Append the new message at the end
                    return [
                        ...filtered,
                        {
                            ...msg.data,
                            conversation_sid: userDetailInfo?.conversation_sid,
                            id: msg.data.id,
                            body: msg.data.content,
                            vector: msg.data.created_by == userDetailInfo?.user_id ? 'recieve' : 'send',
                            media_type: msg.data.media_type,
                            media_link: msg.data.media_link,
                            profile_image: msg.data?.profile_image,
                            full_name: msg.data?.full_name,
                            entity_type: msg.data?.entity_type || "",
                            chatDateTime: formatTo12HourTime(msg.data.created_at),
                            entity_name: msg.data?.entity_name || "",
                        }
                    ];
                }
                // Default: update temporary message with real data
                return prevData.map((item) =>
                    item.id == "" ? {
                        ...item,
                        id: msg.data.id,
                        body: msg.data.content,
                        media_type: msg.data.media_type,
                        media_link: msg.data.media_link,
                        profile_image: msg.data?.profile_image,
                        full_name: msg.data?.full_name,
                        entity_type: msg.data?.entity_type || "",
                        entity_name: msg.data?.entity_name || "",
                    } : item
                );
            });
            setTimeout(() => scrollToBottom(), 100);
        }
        else {
            if (userDetailInfoChat?.user_type === "group_team") {
                if (userDetailInfoChat?.conversation_sid == msg.data.conversation_sid) {
                    let displayMsg = {
                        conversation_sid: userDetailInfoChat?.conversation_sid,
                        id: msg.data.id,
                        body: msg.data.content,
                        vector: msgDirection,
                        media_type: msg.data.media_type,
                        media_link: msg.data.media_link,
                        profile_image: msg.data?.profile_image,
                        full_name: msg.data?.full_name,
                        entity_type: msg.data?.entity_type || "",
                        chatDateTime: formatTo12HourTime(msg.data.created_at),
                        entity_name: msg.data?.entity_name || "",
                    }
                    appendMsg(displayMsg);
                    setTimeout(() => scrollToBottom(), 100);
                }
            } else {
                if (userDetailInfoChat?.user_id == msg.data.sender_id) {
                    let displayMsg = {
                        conversation_sid: userDetailInfoChat?.conversation_sid,
                        id: msg.data.id,
                        body: msg.data.content,
                        vector: msgDirection,
                        media_type: msg.data.media_type,
                        media_link: msg.data.media_link,
                        profile_image: msg.data?.profile_image,
                        full_name: msg.data?.full_name,
                        entity_type: msg.data?.entity_type || "",
                        chatDateTime: formatTo12HourTime(msg.data.created_at),
                        entity_name: msg.data?.entity_name || "",
                    }
                    appendMsg(displayMsg);
                    setTimeout(() => scrollToBottom(), 100);
                }
            }
        }

        if (msgDirection === 'receive') {
            playNotification();
        }
    }, [userDetailInfo, setMessageList, appendMsg]);

    // ------------------ Socket receive_message ------------------
    useEffect(() => {
        const handleMessage = (msg) => handleReceivedMsg(msg, userDetailInfo);
        const handleDeleted = (msg) => {
            const deletedId = msg?.data?.message_id;
            if (!deletedId) return;
            setMessageList(prev => prev.filter(item => String(item.id) !== String(deletedId)));
        };
        if (socket) {
            socket.on('receive_message', handleMessage);
            socket.on('delete_message', handleDeleted);
        }
        return () => {
            if (socket) {
                socket.off('receive_message', handleMessage);
                socket.off('delete_message', handleDeleted);
            }
        };
    }, [socket, userDetailInfo, handleReceivedMsg]);


    // ------------------ fetch previous page (older messages) when scrolled to top ------------------
    // const fetchPreviousPage = async () => {
    //     if (!hasNextPage || isFetchingNextPage) return;
    //     try {
    //         await fetchNextPage();
    //     } catch (err) {
    //         console.error("Error fetching previous page:", err);
    //     }
    // };

    const handleScroll = React.useCallback((e) => {
        // console.log("Scroll event:", e);
        const container = e.target;
        if (container.scrollTop === 0 && hasNextPage && !isFetchingNextPage) {
            setPrevScrollHeight(container.scrollHeight);
            fetchNextPage();
        }
        lastScrollTop.current = container.scrollTop;
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);


    // After fetching previous page, restore scroll position so user doesn't jump to bottom
    useEffect(() => {
        if (!isFetchingNextPage && prevScrollHeight && messagesContainerRef.current) {
            const container = messagesContainerRef.current;
            // Wait for DOM to update
            setTimeout(() => {
                const newScrollHeight = container.scrollHeight;
                container.scrollTop = newScrollHeight - prevScrollHeight;
            }, 50);
        }
        // Reset after handled
        // eslint-disable-next-line
    }, [isFetchingNextPage]);

    useEffect(() => {
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, []);



    // ------------------ download & delete ------------------
    const imageDownloader = (imageUrl) => {
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
        } else {
            console.log('Failed to download');
        }
    };

    const handleDownload = React.useCallback((url, media_type) => {
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
    }, []);

    // ------------------ helpers ------------------
    function formatTo12HourTime(dateString) {
        if (!dateString) return "";
        const date = new Date(dateString);
        const ISTOffset = 5.5 * 60 * 60 * 1000;
        const kolkataTime = new Date(date.getTime() + ISTOffset);
        let hours = kolkataTime.getUTCHours();
        const minutes = kolkataTime.getUTCMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minutesStr = minutes < 10 ? '0' + minutes : minutes;
        const dateStr = dayjs(dateString).format('DD/MM/YYYY');
        const formattedTime = dateStr + " " + hours + ':' + minutesStr + ' ' + ampm;
        return formattedTime;
    }

    const handlePreviewFile = React.useCallback((fileUrl) => {
        setPreviewFileUrl(fileUrl);
        setShowPreviewModal(true);
    }, []);

    return <>
        <div id="messages-container" className="chat-window messages-window p12" onScroll={ handleScroll } ref={ messagesContainerRef }>
            { showPreviewModal && <FilePreviewModal onClose={ () => setShowPreviewModal(false) } filePath={ previewFileUrl } /> }

            { (isLoading || messageStatus === 'loading') ? <CustomSpinner /> : "" }

            { messageList.map((msg, index) => {
                if (msg.vector == 'send') {
                    return (
                        <div className="w-100 d-flex justify-content-end" key={ index }>
                            <div className="message sender mb-3 position-relative ">
                                <img src={ msg.profile_image || userImg } className="rounded-circle sender-avatar" alt="Avatar" />
                                <div className="d-flex justify-content-end">
                                    <div className="message-text p10 lh-22">
                                        {
                                            msg.media_type == 'file' ? (
                                                <>
                                                    <div className="mr-1 w-100">
                                                        <div className="message-sender-name">
                                                            { msg.entity_type ? "" : "" } { msg.entity_type ? `(${ msg.entity_name }) -` : "" } { msg.full_name }</div>
                                                    </div>
                                                    <div className="d-flex">
                                                        <div className="d-flex align-items-center mr24 cursor-pointer" onClick={ () => handlePreviewFile(msg.media_link) }>
                                                            { msg.media_link && <img width="24" src={ msg.media_link.endsWith('.pdf') ? userPdf : userDocs } alt="file" /> }
                                                            <div onClick={ () => handlePreviewFile(msg.media_link) } className="ml-1 wrapped-text" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></div>
                                                        </div>
                                                        { !msg?.id &&
                                                            <div className="d-flex">
                                                                <span className="upload-spinner" style={ {
                                                                    display: "inline-block",
                                                                    width: "20px",
                                                                    height: "20px",
                                                                    border: "4px solid #ccc",
                                                                    borderTop: "4px solid #007bff",
                                                                    borderRadius: "50%",
                                                                    animation: "spin 1s linear infinite",
                                                                } }></span>
                                                                <p>{ translation('key_uploading') }...</p>
                                                            </div> }
                                                    </div>
                                                </>
                                            ) : msg.media_type == 'image' ? (
                                                <div className="d-block">
                                                    <div className="mr-1 w-100">
                                                        <div className="message-sender-name">{ msg.entity_type ? "" : "" } { msg.entity_type ? `(${ msg.entity_name }) -` : "" } { msg.full_name }</div>
                                                    </div>
                                                    <div className="cursor-pointer">
                                                        <div onClick={ () => handlePreviewFile(msg.media_link) }>
                                                            { msg.media_link && <img loading="lazy" src={ msg.media_link } className="chat-responsive-image mb-1" alt="img" /> }
                                                        </div>
                                                        <div>
                                                            <span className="mr24 wrapped-text" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></span>
                                                        </div>
                                                        { !msg?.id && <div>
                                                            <span className="upload-spinner" style={ {
                                                                display: "inline-block",
                                                                width: "20px",
                                                                height: "20px",
                                                                border: "4px solid #ccc",
                                                                borderTop: "4px solid #007bff",
                                                                borderRadius: "50%",
                                                                animation: "spin 1s linear infinite",
                                                            } }></span>
                                                            <p>{ translation('key_uploading') }...</p>
                                                        </div> }
                                                    </div>
                                                </div>

                                            ) : (
                                                <div>
                                                    <div className="message-sender-name-action">{ msg.entity_type ? "" : "" } { msg.entity_type ? `(${ msg.entity_name }) -` : "" } { msg.full_name }</div>
                                                    <span className="mr24 wrapped-text" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></span>
                                                </div>
                                            )
                                        }

                                        { !msg?.id && <i className="ri-check-line fz16 tick-icons"></i> }
                                        { msg?.id && msg?.read_status === "unread" && <i className="ri-check-double-line blue fz16 tick-icons"></i> }
                                        { msg?.read_status === "read" && <i className="ri-check-double-line blue fz16 tick-icons"></i> }

                                        { msg.media_type == 'file' && (
                                            <Dropdown className="menu-btn-dropdown message-options-dropdown">
                                                <Dropdown.Toggle as={ Link } className="menu-btn p-1">
                                                    <i className="ri-arrow-down-s-line grey2 fz24"></i>
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu align="right">
                                                    <Dropdown.Item as={ Link } to="#" onClick={ () => handleDownload(msg.media_link, msg.media_type) }>{ translation('key_download') }</Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        ) }
                                    </div>
                                </div>
                                <small className="chat-time">{ msg.chatDateTime }</small>
                            </div>
                        </div>
                    )
                } else {
                    return (
                        <div className="w-100 d-flex justify-content-end flex-row-reverse" key={ index } >
                            <div className="message receiver mb-3 position-relative w-100 ">
                                <div className="d-flex w-100">
                                    <div className="message-text p10 bg-light wrap-text">
                                        {
                                            msg.media_type == 'file' ? (
                                                <div className="cursor-pointer" onClick={ () => handlePreviewFile(msg.media_link) }>
                                                    <div className="mr-1 w-100">
                                                        <div className="message-sender-name">{ msg.full_name }</div>
                                                    </div>
                                                    <div className="d-flex align-items-center">
                                                        <img width="24" src={ msg.media_link?.endsWith?.('.pdf') ? userPdf : userDocs } alt="file" />
                                                        <div className="ml-1 wrapped-text ellipses-text" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></div>
                                                    </div>
                                                </div>
                                            ) : msg.media_type == 'image' ? (
                                                <div className="cursor-pointer">
                                                    <div onClick={ () => handlePreviewFile(msg.media_link) }>
                                                        <img loading="lazy" src={ msg.media_link } className="chat-responsive-image mb-1" alt="img" />
                                                    </div>
                                                    <div>
                                                        <div className={ `message-sender-name ${ msg.body ? 'mb-1' : 'mb-0' }` }>{ msg.full_name }</div>
                                                        { msg.body && <span className="mr24 wrapped-text" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></span> }
                                                    </div>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="message-sender-name">{ msg.full_name }</div>
                                                    <span className="mr24 wrapped-text" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></span>
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
                                <small className="chat-time">{ msg.chatDateTime }</small>
                                <img src={ msg.profile_image || userImg } className="rounded-circle receiver-avatar" alt="Avatar" />
                            </div>
                        </div>
                    )
                }
            }) }
            <div ref={ messagesEndRef } />
        </div>
    </>
}

ActionRequiredTab.propTypes = {
    socket: PropTypes.any,
    userDetailInfo: PropTypes.object
};

export default ActionRequiredTab;
