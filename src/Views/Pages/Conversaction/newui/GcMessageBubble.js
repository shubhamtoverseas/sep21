import React, { useCallback, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { sanitizeHtml } from "../../../../utils/sanitize";
import GcIcon from "./gcIcons";
import translation from "../../../../utils/translation";
import userPdf from "../../../../assets/img/svg/pdf-red.svg";
import userDocs from "../../../../assets/img/docs.png";
import { gcHighlightHtml, gcInitials, gcLinkify, gcParseShareMessage } from "./gcHelpers";
import { GC_CHANNEL_META, GC_TIMELINE_COPY, LANG_FIELD } from "./gcConstants";

const statusMeta = (msg) => {
    if (msg.status === "failed") return <span className="gc-st-failed">{ translation("key_failed") }</span>;
    if (!msg.id) return <span>{ translation("key_sending") }…</span>;
    if (msg.read_status === "read") return <span className="gc-st-read">{ translation("key_read") }</span>;
    if (msg.read_status === "delivered") return <span>{ translation("key_delivered") }</span>;
    return <span>{ translation("key_sent") }</span>;
};

const GcMessageBubble = React.memo(function GcMessageBubble({
    msg,
    platform,
    isGroupTeam,
    translateMode,
    chatLanguageInfo,
    onPreviewFile,
    onDownload,
    onDelete,
    waWindowClosed,
    compactMeta,
    onRetryFailed,
    onFailedUseInApp,
    onOpenMessageTemplate,
    highlight,
}) {
    const isSender = msg.vector === "send";
    /* body HTML: links made clickable, then the thread-search term marked (text only), then sanitised */
    const bodyHtml = (html) => sanitizeHtml(gcHighlightHtml(gcLinkify(html), highlight));
    const [menuOpen, setMenuOpen] = useState(false);
    const [msgMode, setMsgMode] = useState(null);

    const translatedText = useMemo(() => {
        const field = LANG_FIELD[chatLanguageInfo?.chat_translate_language];
        return (field && msg?.[field]) || null;
    }, [msg, chatLanguageInfo?.chat_translate_language]);

    const mode = msgMode || translateMode;
    const hasDistinctTranslation = translatedText && translatedText !== msg.body;

    const toggleMsgMode = useCallback(() => {
        setMsgMode((prev) => ((prev || translateMode) === "original" ? "translated" : "original"));
    }, [translateMode]);

    const handleMenuToggle = useCallback((e) => {
        e.stopPropagation();
        setMenuOpen((v) => !v);
    }, []);

    const renderTextBody = () => {
        const shareLink = msg.media_type !== "image" && msg.media_type !== "file" ? gcParseShareMessage(msg.body) : null;
        if (shareLink) {
            return (
                <>
                    { shareLink.text && <div className="gc-orig">{ shareLink.text }</div> }
                    <button
                        type="button"
                        className="gc-applink-card"
                        onClick={ () => window.open(shareLink.href, "_blank", "noopener") }
                    >
                        <span className="gc-al-ico"><GcIcon name="job" /></span>
                        <span className="gc-al-main">
                            <span className="gc-al-t">{ translation(shareLink.titleKey) }</span>
                            <span className="gc-al-s">{ shareLink.label }</span>
                        </span>
                    </button>
                </>
            );
        }
        if (msg.media_type === "image" || msg.media_type === "file") {
            return msg.body ? <div className="gc-orig" dangerouslySetInnerHTML={ bodyHtml(msg.body) } /> : null;
        }
        if (mode === "translated") {
            if (translatedText) return <div className="gc-orig" dangerouslySetInnerHTML={ bodyHtml(translatedText) } />;
            return (
                <>
                    <div className="gc-orig" dangerouslySetInnerHTML={ bodyHtml(msg.body) } />
                    <div className="gc-tr-unavail"><GcIcon name="globe" />{ translation("key_translation_unavailable") }</div>
                </>
            );
        }
        if (mode === "both" && hasDistinctTranslation) {
            return (
                <>
                    <div className="gc-orig" dangerouslySetInnerHTML={ bodyHtml(msg.body) } />
                    <div className="gc-trans-sep" />
                    <div className="gc-trans" dangerouslySetInnerHTML={ bodyHtml(translatedText) } />
                </>
            );
        }
        return <div className="gc-orig" dangerouslySetInnerHTML={ bodyHtml(msg.body) } />;
    };

    const renderContent = () => {
        if (msg.media_type === "image") {
            return (
                <>
                    { msg.media_link && (
                        <img
                            loading="lazy"
                            src={ msg.media_link }
                            className="gc-chat-image"
                            alt=""
                            onClick={ () => onPreviewFile(msg.media_link) }
                        />
                    ) }
                    { renderTextBody() }
                    { isSender && !msg.id && (
                        <div className="gc-uploading"><span className="gc-spin" />{ translation("key_uploading") }…</div>
                    ) }
                </>
            );
        }
        if (msg.media_type === "file") {
            return (
                <>
                    <div className="gc-file-line" onClick={ () => onPreviewFile(msg.media_link) }>
                        { msg.media_link && (
                            <img src={ msg.media_link.endsWith(".pdf") ? userPdf : userDocs } alt="" />
                        ) }
                        <span className="gc-file-name" dangerouslySetInnerHTML={ sanitizeHtml(msg.body) } />
                    </div>
                    { isSender && !msg.id && (
                        <div className="gc-uploading"><span className="gc-spin" />{ translation("key_uploading") }…</div>
                    ) }
                </>
            );
        }
        return renderTextBody();
    };

    const chanLabel = GC_CHANNEL_META[platform]?.label;
    const showMenu = isSender || msg.media_type === "file";
    /* template messages carry entity_type "template"; WhatsApp templates name themselves in entity_id
       (an in-app template's entity_id is its numeric id, so its strip reads "Template" alone) */
    const isTemplate = msg.entity_type === "template";
    const templateName = isTemplate && typeof msg.entity_id === "string" && !/^\d+$/.test(msg.entity_id) ? msg.entity_id : "";
    const senderLabel = isGroupTeam && !isSender && msg.full_name && (
        <div className="gc-sender-name">{ msg.full_name }{ msg.role_name ? ` (${ String(msg.role_name).charAt(0).toUpperCase() }${ String(msg.role_name).slice(1) })` : "" }</div>
    );

    return (
        <div className={ `gc-msg-row ${ isSender ? "out" : "in" }` }>
            <span className={ `gc-msg-av ${ isSender ? "me" : "" }` }>
                { isSender
                    ? gcInitials(msg.full_name) || <GcIcon name="worker" />
                    : (msg.profile_image
                        ? <img src={ msg.profile_image } alt="" />
                        : gcInitials(msg.full_name)) }
            </span>
            <div className="gc-msg-stack">
                <div className={ `gc-bubble${ isTemplate ? " template" : "" }` }>
                    { isTemplate ? (
                        <>
                            <div className="gc-tpl-head">
                                <GcIcon name="template" />
                                { GC_TIMELINE_COPY.template }{ templateName && ` · ${ templateName }` }
                            </div>
                            <div className="gc-tpl-body">{ senderLabel }{ renderContent() }</div>
                        </>
                    ) : (
                        <>{ senderLabel }{ renderContent() }</>
                    ) }
                    { showMenu && (
                        <span className="gc-msg-menu">
                            <button type="button" onClick={ handleMenuToggle } aria-label={ translation('key_gc_message_options') }>
                                <GcIcon name="chevDown" />
                            </button>
                            { menuOpen && (
                                <span className="gc-msg-menu-pop" onMouseLeave={ () => setMenuOpen(false) }>
                                    { msg.media_type === "file" && (
                                        <button type="button" onClick={ () => { setMenuOpen(false); onDownload(msg.media_link, msg.media_type); } }>
                                            { translation("key_download") }
                                        </button>
                                    ) }
                                    { isSender && (
                                        <button type="button" className="danger" onClick={ () => { setMenuOpen(false); onDelete(msg.id); } }>
                                            { translation("key_delete") }
                                        </button>
                                    ) }
                                </span>
                            ) }
                        </span>
                    ) }
                </div>
                <div className="gc-msg-meta">
                    { compactMeta ? (
                        <>
                            { msg.timeHM && <span>{ msg.timeHM }</span> }
                            { chanLabel && <span>· { chanLabel }</span> }
                            { isSender && msg.status === "failed" && <span>· </span> }
                            { isSender && msg.status === "failed" && statusMeta(msg) }
                        </>
                    ) : (
                        <>
                            { chanLabel && <span>{ chanLabel }</span> }
                            { msg.timeHM && <span>· { msg.timeHM }</span> }
                            { isSender && <span>· </span> }
                            { isSender && statusMeta(msg) }
                            { hasDistinctTranslation && mode !== "both" && (
                                <button type="button" className="gc-per-msg-toggle" onClick={ toggleMsgMode }>
                                    { mode === "original" ? translation("key_show_translation") : translation("key_show_original") }
                                </button>
                            ) }
                        </>
                    ) }
                </div>
                { msg.status === "failed" && (
                    /* GC-020: a closed WhatsApp window cannot be retried; any other failure can */
                    <div className="gc-fail-note">
                        <GcIcon name="warn" />
                        { platform === "whatsapp" && waWindowClosed ? (
                            <>
                                <span>{ translation("key_wa_expired_no_retry") } ·</span>
                                { onOpenMessageTemplate && (
                                    <button type="button" onClick={ onOpenMessageTemplate }>{ translation("key_send_as_template") }</button>
                                ) }
                            </>
                        ) : (
                            <>
                                <span>{ GC_TIMELINE_COPY.deliveryFailedTemporary } ·</span>
                                { onRetryFailed && (
                                    <button type="button" onClick={ () => onRetryFailed(msg) }>{ translation("key_retry") }</button>
                                ) }
                            </>
                        ) }
                        { platform === "whatsapp" && onFailedUseInApp && (
                            <button type="button" onClick={ () => onFailedUseInApp(msg) }>{ translation("key_use_in_app_instead") }</button>
                        ) }
                    </div>
                ) }
            </div>
        </div>
    );
});

GcMessageBubble.propTypes = {
    highlight: PropTypes.string,
    waWindowClosed: PropTypes.bool,
    compactMeta: PropTypes.bool,
    onRetryFailed: PropTypes.func,
    onFailedUseInApp: PropTypes.func,
    onOpenMessageTemplate: PropTypes.func,
    msg: PropTypes.object.isRequired,
    platform: PropTypes.string.isRequired,
    isGroupTeam: PropTypes.bool,
    translateMode: PropTypes.string.isRequired,
    chatLanguageInfo: PropTypes.object,
    onPreviewFile: PropTypes.func.isRequired,
    onDownload: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};

export default GcMessageBubble;
