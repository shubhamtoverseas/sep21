import React, { useCallback } from 'react';
import { sanitizeHtml } from "../../../../utils/sanitize";
import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import userPdf from "../../../../assets/img/svg/pdf-red.svg";
import userDocs from "../../../../assets/img/docs.png";
import translation from "../../../../utils/translation";

const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

const spinnerStyle = {
    display: "inline-block",
    width: "20px",
    height: "20px",
    border: "4px solid #ccc",
    borderTop: "4px solid #007bff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
};

// --- Sub-components for message content types ---

const FileContent = React.memo(({ msg, onPreview, isSender }) => (
    <div className="d-flex">
        <div className="d-flex align-items-center cursor-pointer" onClick={ () => onPreview(msg.media_link) }>
            { msg.media_link && <img className="mr-2" width="24" src={ msg.media_link.endsWith('.pdf') ? userPdf : userDocs } alt="file" /> }
            <div className="row m-0 align-items-end w-100">
                <div className="mr-1 col p-0 text-truncate mw132" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></div>
                <div className='time-and-ticks col-auto p-0'>
                    <small className="chat-time text-nowrap" data-hm={ msg.timeHM }>{ msg.chatDateTime }</small>
                </div>
            </div>
        </div>
        { isSender && !msg?.id && (
            <div className="d-flex">
                <span className="mr-1" style={ spinnerStyle }></span>
                <p>{ translation('key_uploading') }...</p>
            </div>
        ) }
    </div>
));
FileContent.displayName = 'FileContent';
FileContent.propTypes = {
    msg: PropTypes.shape({
        media_link: PropTypes.string,
        body: PropTypes.string,
        chatDateTime: PropTypes.string,
        timeHM: PropTypes.string,
        id: PropTypes.any,
    }).isRequired,
    onPreview: PropTypes.func.isRequired,
    isSender: PropTypes.bool.isRequired,
};

const ImageContent = React.memo(({ msg, onPreview, isSender }) => (
    <div className="cursor-pointer">
        <div onClick={ () => onPreview(msg.media_link) }>
            { msg.media_link && <img loading="lazy" src={ msg.media_link } className="chat-responsive-image mb-1" alt="chat" /> }
        </div>
        <div className={ msg.body && msg.body.length > 35 ? "multi-line" : "row m-0 align-items-end w-100" }>
            { msg.body && <div className="mr-1 col p-0 message-box-text" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></div> }
            <div className='time-and-ticks col-auto p-0'>
                <small className="chat-time text-nowrap" data-hm={ msg.timeHM }>{ msg.chatDateTime }</small>
                { isSender && !msg?.id && <i className="ri-check-line fz16 tick-icons"></i> }
                { isSender && msg?.id && msg?.read_status === "unread" && <i className="ri-check-double-line blue fz16 tick-icons"></i> }
                { isSender && msg?.read_status === "read" && <i className="ri-check-double-line blue fz16 tick-icons"></i> }
            </div>
        </div>
        { isSender && !msg?.id && (
            <div>
                <span style={ spinnerStyle }></span>
                <p>{ translation('key_uploading') }...</p>
            </div>
        ) }
    </div>
));
ImageContent.displayName = 'ImageContent';
ImageContent.propTypes = {
    msg: PropTypes.shape({
        media_link: PropTypes.string,
        body: PropTypes.string,
        chatDateTime: PropTypes.string,
        timeHM: PropTypes.string,
        id: PropTypes.any,
        read_status: PropTypes.string,
    }).isRequired,
    onPreview: PropTypes.func.isRequired,
    isSender: PropTypes.bool.isRequired,
};

const TextContent = React.memo(({ msg, isSender, chatLanguageInfo, onViewTranslation }) => {
    const isLong = msg.body && msg.body.length > 35;
    return (
        <div className={ isLong ? "multi-line" : "row m-0 align-items-end w-100" }>
            { !isSender && (
                <div id={ `msg-${ msg.id }` }>
                    <div className="original-content" style={ { display: "block" } }>
                        <div className="mr-1 col p-0 message-box-text" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></div>
                    </div>
                    <div className="translated-content" style={ { display: "none" } }>
                        { chatLanguageInfo?.chat_translate_language === "id" && <div className="mr-1 col p-0 message-box-text" dangerouslySetInnerHTML={sanitizeHtml(msg.content_id)}></div> }
                        { chatLanguageInfo?.chat_translate_language === "en" && <div className="mr-1 col p-0 message-box-text" dangerouslySetInnerHTML={sanitizeHtml(msg.content_en)}></div> }
                        { chatLanguageInfo?.chat_translate_language === "zh_cn" && <div className="mr-1 col p-0 message-box-text" dangerouslySetInnerHTML={sanitizeHtml(msg.content_zh_cn)}></div> }
                        { chatLanguageInfo?.chat_translate_language === "zh_tw" && <div className="mr-1 col p-0 message-box-text" dangerouslySetInnerHTML={sanitizeHtml(msg.content_zh_tw)}></div> }
                    </div>
                    { chatLanguageInfo?.chat_translate_view === "original" && !EMOJI_REGEX.test(msg.body) && (
                        <div className="blue fz12 fw-400 toggle-translation-btn" style={ { cursor: "pointer" } } onClick={ () => onViewTranslation(msg) }>
                            { translation('key_view_translation') }
                        </div>
                    ) }
                </div>
            ) }
            { isSender && <div className="mr-1 p-0 col message-box-text" dangerouslySetInnerHTML={sanitizeHtml(msg.body)}></div> }
            <div className={ isSender ? "time-and-ticks w-100 justify-content-end p-0" : "time-and-ticks col-auto p-0" }>
                <small className="chat-time text-nowrap" data-hm={ msg.timeHM }>{ msg.chatDateTime }</small>
                { isSender && !msg?.id && <i className="ri-check-line fz16 tick-icons"></i> }
                { isSender && msg?.id && msg?.read_status === "unread" && <i className="ri-check-double-line blue fz16 tick-icons"></i> }
                { isSender && msg?.read_status === "read" && <i className="ri-check-double-line blue fz16 tick-icons"></i> }
            </div>
        </div>
    );
});
TextContent.displayName = 'TextContent';
TextContent.propTypes = {
    msg: PropTypes.shape({
        body: PropTypes.string,
        id: PropTypes.any,
        content_id: PropTypes.string,
        content_en: PropTypes.string,
        content_zh_cn: PropTypes.string,
        content_zh_tw: PropTypes.string,
        chatDateTime: PropTypes.string,
        timeHM: PropTypes.string,
        read_status: PropTypes.string,
    }).isRequired,
    isSender: PropTypes.bool.isRequired,
    chatLanguageInfo: PropTypes.shape({
        chat_translate_language: PropTypes.string,
        chat_translate_view: PropTypes.string,
    }),
    onViewTranslation: PropTypes.func.isRequired,
};

// --- Main MessageBubble component ---

const MessageBubble = React.memo(({ msg, index, totalMessages, userDetailInfo, chatLanguageInfo, onPreviewFile, onDownload, onDelete }) => {
    const isSender = msg.vector === 'send';
    const isGroupTeam = userDetailInfo?.friend_type === "group_team";
    const isLastMessage = index === totalMessages - 1;

    const handleViewTranslation = useCallback((msgItem) => {
        const parent = document.getElementById(`msg-${ msgItem.id }`);
        if (!parent) return;
        const originalContent = parent.querySelector('.original-content');
        const translatedContent = parent.querySelector('.translated-content');
        const toggleBtn = parent.querySelector('.toggle-translation-btn');
        if (originalContent && translatedContent && toggleBtn) {
            if (translatedContent.style.display === 'none') {
                translatedContent.style.display = 'block';
                originalContent.style.display = 'none';
                toggleBtn.textContent = 'View Original';
            } else {
                translatedContent.style.display = 'none';
                originalContent.style.display = 'block';
                toggleBtn.textContent = 'View Translation';
            }
        }
    }, []);

    const renderContent = () => {
        if (msg.media_type === 'file') {
            return <FileContent msg={ msg } onPreview={ onPreviewFile } isSender={ isSender } />;
        }
        if (msg.media_type === 'image') {
            return <ImageContent msg={ msg } onPreview={ onPreviewFile } isSender={ isSender } />;
        }
        return <TextContent msg={ msg } isSender={ isSender } chatLanguageInfo={ chatLanguageInfo } onViewTranslation={ handleViewTranslation } />;
    };

    const renderDropdown = () => {
        if (!isSender && msg.media_type !== 'file') return null;
        return (
            <Dropdown className="menu-btn-dropdown message-options-dropdown">
                <Dropdown.Toggle as={ Link } className="menu-btn p-1">
                    <i className="ri-arrow-down-s-line grey2 fz24"></i>
                </Dropdown.Toggle>
                <Dropdown.Menu align="right">
                    { msg.media_type === 'file' && (
                        <Dropdown.Item as={ Link } to="#" onClick={ () => onDownload(msg.media_link, msg.media_type) }>
                            { translation('key_download') }
                        </Dropdown.Item>
                    ) }
                    { isSender && (
                        <Dropdown.Item as={ Link } to="#" onClick={ () => onDelete(msg.id) }>
                            { translation('key_delete') }
                        </Dropdown.Item>
                    ) }
                </Dropdown.Menu>
            </Dropdown>
        );
    };

    if (isSender) {
        return (
            <div className="w-100 d-flex justify-content-end" key={ msg.id || `send-${ index }` }>
                <div className={ `message sender position-relative ${ !isLastMessage ? "mb-3" : "" }` }>
                    <img src={ msg.profile_image } className="rounded-circle sender-avatar" alt="Avatar" />
                    <div className="d-flex justify-content-end w-100">
                        <div className="message-text p10 lh-22">
                            { renderContent() }
                            { renderDropdown() }
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Receiver message
    return (
        <div className="w-100 d-flex justify-content-end flex-row-reverse" key={ msg.id || `recv-${ index }` }>
            <div className={ `message receiver position-relative w-100 ${ !isLastMessage ? "mb-3" : "" }` }>
                <div className="d-flex w-100">
                    <div className="message-text p10 bg-light wrap-text">
                        { isGroupTeam && (
                            <div className="mr-1 w-100">
                                <div className="message-sender-name">{ msg.full_name } ({ msg.role_name })</div>
                            </div>
                        ) }
                        { renderContent() }
                        { renderDropdown() }
                    </div>
                </div>
                <img src={ msg.profile_image } className="rounded-circle receiver-avatar" alt="Avatar" />
            </div>
        </div>
    );
});

MessageBubble.displayName = 'MessageBubble';

MessageBubble.propTypes = {
    msg: PropTypes.object.isRequired,
    index: PropTypes.number.isRequired,
    totalMessages: PropTypes.number.isRequired,
    userDetailInfo: PropTypes.object,
    chatLanguageInfo: PropTypes.object,
    onPreviewFile: PropTypes.func.isRequired,
    onDownload: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};

export default MessageBubble;
