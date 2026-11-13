import React, { useEffect, useRef, useCallback, useMemo, forwardRef, memo } from "react";
import { VariableSizeList } from 'react-window';
import { sanitizeHtml } from "../../utils/sanitize";
import PropTypes from 'prop-types';
import './chat-history-item.css';
import avatarImg from '../../assets/img/worker.png';
import whatsappChat from '../../assets/img/svg/whatsapp-chat.svg';
import phoneChat from '../../assets/img/svg/phone-blue.svg';
import weChatGreen from '../../assets/img/svg/we-chat-green.svg';
import userPdf from "../../assets/img/pdf.png";
import downloadicon from '../../assets/img/svg/download-lined-icon.svg';

const LIST_HEIGHT = 300;
const DEFAULT_ROW_HEIGHT = 80;

const rowKeyOf = (chat, index) => chat?.id ?? `idx-${ index }`;

const OuterElement = forwardRef(function OuterElement({ className, ...rest }, ref) {
    return <div ref={ ref } { ...rest } id="messages-container" className={ `chat-history-box bg-white mb-3 ${ className || '' }` } />;
});

OuterElement.propTypes = {
    className: PropTypes.string,
};

const ChatRow = memo(function ChatRow({ index, style, data }) {
    const { chats, reportRowHeight, onPreviewFile, onDownload } = data;
    const chat = chats[index];
    const innerRef = useRef(null);

    const measure = useCallback(() => {
        if (innerRef.current) {
            reportRowHeight(index, chat, innerRef.current.getBoundingClientRect().height);
        }
    }, [index, chat, reportRowHeight]);

    useEffect(() => {
        measure();
    });

    return (
        <div style={ style }>
            <div ref={ innerRef } style={ { display: 'flow-root' } }>
                <div className={ `${ chat.isSender ? 'justify-content-start' : 'justify-content-end' } d-flex` }>
                    <div className={ `chat-item` }>
                        <div className={ `${ chat.isSender ? 'justify-content-start' : 'justify-content-end' } d-flex align-items-center chat-meta mb4` }>
                            <span className={ `${ chat.platform === 'whatsapp' && 'text-success' } fz12 fw-700 lh-normal sender` }>{ chat?.sender }</span>
                            <span className="time fz10 fw-400 lh-normal">{ chat.time }</span>
                        </div>
                        <div className={ `message-wrapper ${ chat.isSender ? 'justify-content-start' : '' }` }>
                            <div className={ `${ chat.platform } chat-message mr10` }>
                                { chat.platform === 'whatsapp' && <img src={ whatsappChat } width={ 23 } height={ 23 } className='mr8' /> }
                                { chat.platform === 'app' &&
                                    <>
                                        {/* <img src={whatsappChat} width={23} height={23} className='mr8' /> */ }
                                        <img src={ phoneChat } width={ 23 } height={ 23 } className='mr8' />
                                    </>
                                }
                                { chat.platform === 'phone' && <img src={ phoneChat } width={ 23 } height={ 23 } className='mr8' /> }
                                { chat.platform === 'wechat' && <img src={ weChatGreen } width={ 23 } height={ 23 } className='mr8' /> }
                                {
                                    chat.media_type == 'file' ? (
                                        <div>
                                            <div onClick={ () => onPreviewFile(chat.media_link) }>
                                                <img src={ userPdf } onLoad={ measure } />
                                            </div>
                                            <div>
                                                <span onClick={ () => onPreviewFile(chat.media_link) } className="wrap-text" dangerouslySetInnerHTML={ sanitizeHtml(chat.message) }></span>
                                            </div>
                                            <a to="#" onClick={ () => onDownload(chat.media_link, chat.media_type) }><img src={ downloadicon } /></a>
                                        </div>
                                    ) : chat.media_type == 'image' ? (
                                        <div>
                                            <div onClick={ () => onPreviewFile(chat.media_link) }>
                                                <img width={ 51 } src={ chat.media_link } className="chat-responsive-image" onLoad={ measure } />
                                            </div>
                                            <div>
                                                <span onClick={ () => onPreviewFile(chat.media_link) } className="wrap-text" dangerouslySetInnerHTML={ sanitizeHtml(chat.message) }></span>
                                            </div>
                                            <a to="#" onClick={ () => onDownload(chat.media_link, chat.media_type) }><img src={ downloadicon } /></a>
                                        </div>
                                    ) : (
                                        <span className='fz14 fw-400' dangerouslySetInnerHTML={ sanitizeHtml(chat.message) }></span>
                                    )
                                }
                            </div>
                            { !chat.isSender && <img src={ avatarImg } height={ 20 } width={ 20 } alt='Avatar' className="avatar" /> }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

ChatRow.propTypes = {
    index: PropTypes.number.isRequired,
    style: PropTypes.object.isRequired,
    data: PropTypes.shape({
        chats: PropTypes.array.isRequired,
        reportRowHeight: PropTypes.func.isRequired,
        onPreviewFile: PropTypes.func.isRequired,
        onDownload: PropTypes.func.isRequired,
    }).isRequired,
};

const ChatHistoryItem = React.memo(({ chats, fetchPreviousPage, onClickPreviewFile }) => {
    const listRef = useRef(null);
    const outerRef = useRef(null);
    const rowHeights = useRef({});

    const isFetching = useRef(false); 
    const debounceTimeout = useRef(null);

    const getRowHeight = useCallback((index) => {
        return rowHeights.current[rowKeyOf(chats[index], index)] || DEFAULT_ROW_HEIGHT;
    }, [chats]);

    const reportRowHeight = useCallback((index, chat, height) => {
        const key = rowKeyOf(chat, index);
        const h = Math.ceil(height);
        if (h > 0 && rowHeights.current[key] !== h) {
            rowHeights.current[key] = h;
            if (listRef.current) listRef.current.resetAfterIndex(index, true);
        }
    }, []);

    useEffect(() => {
        if (listRef.current) listRef.current.resetAfterIndex(0, true);
    }, [chats]);

    const imageDownloader = useCallback((imageUrl) => {
        const newWindow = window.open(imageUrl, '_blank');

        if (newWindow) {
            // Use a timer to trigger the download after the tab opens
            setTimeout(() => {
                const link = newWindow.document.createElement('a');
                link.href = imageUrl;

                // Extract file name from URL
                const fileName = imageUrl.split('/').pop();
                link.download = fileName;

                newWindow.document.body.appendChild(link);
                link.click();
                newWindow.document.body.removeChild(link);
                newWindow.close();
            }, 200); // Adjust the delay as needed
        } else {
            console.log('Failed to download');
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

    const handlePreviewFile = useCallback((url) => {
        onClickPreviewFile(url);
    }, [onClickPreviewFile]);

   
    const handleListScroll = useCallback(() => {
        const el = outerRef.current;
        if (!el) return;
        if (el.scrollHeight <= el.clientHeight) return;
        // Use a small threshold to account for floating point errors and subpixel rendering
        const threshold = 2;
        const isAtBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) <= threshold;
        if (isAtBottom && !isFetching.current) {
            isFetching.current = true;
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
            debounceTimeout.current = setTimeout(async () => {
                await fetchPreviousPage();
                isFetching.current = false;
            }, 100);
        }
    }, [fetchPreviousPage]);

    // Clear debounce timeout on unmount to avoid memory leaks
    useEffect(() => {
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, []);

    const itemData = useMemo(() => ({
        chats,
        reportRowHeight,
        onPreviewFile: handlePreviewFile,
        onDownload: handleDownload,
    }), [chats, reportRowHeight, handlePreviewFile, handleDownload]);

    return (
        <VariableSizeList
            ref={ listRef }
            outerRef={ outerRef }
            outerElementType={ OuterElement }
            height={ LIST_HEIGHT }
            width={ '100%' }
            itemCount={ chats.length }
            itemSize={ getRowHeight }
            estimatedItemSize={ DEFAULT_ROW_HEIGHT }
            itemData={ itemData }
            itemKey={ (index, data) => rowKeyOf(data.chats[index], index) }
            overscanCount={ 10 }
            onScroll={ handleListScroll }
        >
            { ChatRow }
        </VariableSizeList>
    );

});

ChatHistoryItem.displayName = 'ChatHistoryItem';

ChatHistoryItem.propTypes = {
    fetchPreviousPage: PropTypes.func.isRequired,
    chats: PropTypes.arrayOf(
        PropTypes.shape({
            sender: PropTypes.string.isRequired,
            time: PropTypes.string.isRequired,
            message: PropTypes.string.isRequired,
            platform: PropTypes.oneOf(['whatsapp', 'system', 'phone', 'wechat']).isRequired,
            type: PropTypes.oneOf(['admin', 'system', 'cs', 'employer']).isRequired,
            isSender: PropTypes.bool.isRequired,

        })
    ).isRequired,
    onClickPreviewFile: PropTypes.func,
};

export default ChatHistoryItem;
