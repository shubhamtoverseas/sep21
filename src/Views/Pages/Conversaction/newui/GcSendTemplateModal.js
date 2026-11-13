import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import GcModal from "./GcModal";
import GcIcon from "./gcIcons";
import translation from "../../../../utils/translation";
import { ShowToast } from "../../../../components/show-toast/ShowToast";
import {
    fetchModuleList, fetchLanguageList,
    sendTemplateMessage, fetchTemplateNameByFilter, sendChatMessage,
} from "../../../../redux/Slices/settings/templates/TemplateSlice";
import { getSendSiteCategories, previewTemplate, reportSendOutcome } from "../../../../services/templates";
import { gcCopyText, gcInitials, GC_CHANNEL_META, gcHtmlToText } from "./gcHelpers";
import { getConfigurationPermissions } from "../../../../utils/permissions/configurationPermissionUtils";
import { SEND_TEMPLATE_NOTES } from "../../WorkerPage/workerModuleConstants";
import { SEND_SITE } from "../../SettingsPage/newui/templates/templateConfiguration";
import userPdf from "../../../../assets/img/pdf.png";
import { GC_TEMPLATE_COPY, ROLE_KEY } from "./gcConstants";
import { gcSendOutcome } from "./gcSendResult";

const isEnglish = (lang) => lang?.code === "en" || /english/i.test(lang?.name_en || "");
const languageLabel = (lang) => (lang?.code ? String(lang.code).toUpperCase() : (lang?.name_en || ""));
/* the server's channel names → this composer's */
const CHANNEL_OF = Object.freeze({ in_app: "chat", whatsapp: "whatsapp" });

/** The record context of a Global Chat send: the conversation's party record, plus what a Share brought (S8). */
export const gcSendContext = (userType, recordId, share) => ({
    ...(userType === "worker" && Number(recordId) > 0 ? { worker_id: Number(recordId) } : {}),
    ...(userType === "employer" && Number(recordId) > 0 ? { employer_id: Number(recordId) } : {}),
    ...(Number(share?.worker_id) > 0 ? { worker_id: Number(share.worker_id) } : {}),
    ...(Number(share?.job_offer_id) > 0 ? { job_offer_id: Number(share.job_offer_id) } : {}),
    ...(share?.links ? { links: share.links } : {}),
});

/**
 * Send Template in Global Chat (X-01; 10 Nov 2026 package F-13, delta row 12): recipient with its channel, the context line,
 * Module + Category, the message-language segment, the template, the server's read-only preview and Copy · Open WhatsApp ·
 * Cancel · Send.
 *   - Categories: only those the server offers this sender for this conversation's party and record (manual, not Action
 *     Required / internal / automatic, a variant for the party, the source section's grant; Contract categories need their
 *     contract and are never offered here). A Share adds its Job Offer / worker and the link it generated.
 *   - Templates: the category's templates written for the party, per language; the English fallback is named, never silent.
 *   - Body: resolved and masked on the server; a field without a value, outside the recipient or unknown blocks Send.
 *   - Send: the server's send (site, template, channel, record) is awaited — it logs what it resolved, with the send time,
 *     no invented schedule — then the chat delivery takes the body and account the server returned.
 */
const GcSendTemplateModal = ({
    onClose,
    userType,
    recipientKind,
    recordId,
    fullname,
    chineseName,
    referenceCode,
    share,
    channels,
    onOpenAddEditTemplatePopup,
    defaultChannel = "chat",
    waWindowOpen = true,
    onUseWhatsAppTemplate,
}) => {
    const dispatch = useDispatch();
    const { moduleList, languageList } = useSelector((state) => state.templates);
    const permissionList = useSelector((state) => state.users.permissionList);
    const templatePerms = useMemo(() => getConfigurationPermissions(permissionList), [permissionList]);
    const context = useMemo(() => gcSendContext(userType, recordId, share), [userType, recordId, share]);
    const contextKey = JSON.stringify(context);

    const [categories, setCategories] = useState(null);
    const [categoryId, setCategoryId] = useState("");
    /* the category's templates per message language: { [languageId]: template[] } */
    const [variantsByLang, setVariantsByLang] = useState({});
    const [templateName, setTemplateName] = useState("");
    const [languageId, setLanguageId] = useState("");
    const [waValidation, setWaValidation] = useState(false);
    const [footNote, setFootNote] = useState(null);
    const [sending, setSending] = useState(false);
    const loadSeq = useRef(0);

    useEffect(() => {
        if (moduleList && moduleList.length === 0) dispatch(fetchModuleList());
        if (languageList && languageList.length === 0) dispatch(fetchLanguageList());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* the categories this sender may send to this party about this record (settings-api /send-site, X-01) */
    useEffect(() => {
        let alive = true;
        const ctx = JSON.parse(contextKey);
        if (!(userType === "worker" || userType === "employer") || !(ctx.worker_id || ctx.employer_id)) { setCategories([]); return undefined; }
        getSendSiteCategories({ code: SEND_SITE.GLOBAL_CHAT, party: userType, worker_id: ctx.worker_id, employer_id: ctx.employer_id, job_offer_id: ctx.job_offer_id })
            .then((res) => { if (alive) setCategories(res?.data?.data?.data?.categories || []); })
            .catch(() => { if (alive) setCategories([]); });
        return () => { alive = false; };
    }, [userType, contextKey]);
    const category = (categories || []).find((c) => String(c.id) === String(categoryId)) || null;

    /* the message language starts on English, the fallback language (row #19); the set is today's (Q5) */
    const englishId = useMemo(() => String((languageList || []).find(isEnglish)?.id || ""), [languageList]);
    useEffect(() => {
        if (!languageId && englishId) setLanguageId(englishId);
    }, [languageId, englishId]);

    const loadTemplates = useCallback((cat) => {
        const seq = ++loadSeq.current;
        setTemplateName("");
        setVariantsByLang({});
        if (!cat || !languageList?.length) return;
        Promise.all(languageList.map((lang) => dispatch(fetchTemplateNameByFilter({ category_id: cat.id, module_key: cat.module_key, language_id: lang.id, recipient_variant: userType }))
            .then((res) => [String(lang.id), !res.error && Array.isArray(res?.payload?.data) ? res.payload.data : []])))
            .then((pairs) => { if (seq === loadSeq.current) setVariantsByLang(Object.fromEntries(pairs)); });
    }, [dispatch, languageList, userType]);

    const handleCategoryChange = useCallback((value) => {
        setCategoryId(value);
        loadTemplates((categories || []).find((c) => String(c.id) === String(value)) || null);
    }, [loadTemplates, categories]);

    /* one entry per template name, in the English list's order first */
    const templateNames = useMemo(() => {
        const names = [];
        [englishId, ...Object.keys(variantsByLang)].forEach((id) => (variantsByLang[id] || []).forEach((t) => {
            if (!names.includes(t.template_name)) names.push(t.template_name);
        }));
        return names;
    }, [variantsByLang, englishId]);

    /* row #19: no variant in the chosen language → the English one, with a warning naming the language; never a silent swap */
    const variantIn = useCallback((langId) => (variantsByLang[langId] || []).find((t) => t.template_name === templateName) || null, [variantsByLang, templateName]);
    const chosen = templateName ? variantIn(languageId) : null;
    const fallback = templateName && !chosen && languageId !== englishId ? variantIn(englishId) : null;
    const template = chosen || fallback;
    const chosenLanguage = (languageList || []).find((lang) => String(lang.id) === String(languageId));

    /* the server's preview of the chosen template for this record */
    const [preview, setPreview] = useState({ status: "idle" });
    useEffect(() => {
        if (!template?.id) { setPreview({ status: "idle" }); return undefined; }
        let alive = true;
        setPreview({ status: "loading" });
        previewTemplate({ site: SEND_SITE.GLOBAL_CHAT, template_content_id: template.id, context: JSON.parse(contextKey) })
            .then((res) => { if (alive) setPreview({ status: "ready", data: res?.data?.data || null }); })
            .catch((error) => { if (alive) setPreview({ status: "refused", message: error?.response?.data?.message || translation("key_server_error") }); });
        return () => { alive = false; };
    }, [template?.id, contextKey]);
    const resolved = preview.status === "ready" ? preview.data : null;
    const bodyText = useMemo(() => gcHtmlToText(resolved?.body), [resolved]);
    const missing = (resolved?.missing || []).map((f) => f.name || f.token);
    const notAllowed = (resolved?.refused || []).filter((f) => f.reason === "not_allowed").map((f) => `{{${ f.token }}}`);
    const unknown = (resolved?.refused || []).filter((f) => f.reason !== "not_allowed").map((f) => `{{${ f.token }}}`);
    const canAct = Boolean(template && bodyText.trim() && resolved?.can_send && resolved?.recipient);

    /* Partner, Team and Group conversations are In-App only (register row #15): the conversation's channels, within the server's */
    const channelOptions = useMemo(() => {
        const conversation = (channels || ["app"]).includes("whatsapp") ? ["chat", "whatsapp"] : ["chat"];
        if (!resolved?.channels) return conversation;
        const server = resolved.channels.map((c) => CHANNEL_OF[c]).filter(Boolean);
        return conversation.filter((c) => server.includes(c));
    }, [channels, resolved]);
    const [channel, setChannel] = useState(defaultChannel === "whatsapp" ? "whatsapp" : "chat");
    useEffect(() => {
        if (channelOptions.length && !channelOptions.includes(channel)) setChannel(channelOptions[0]);
    }, [channelOptions, channel]);

    const mediaFile = useMemo(() => {
        if (!template?.file_path) return null;
        return {
            url: template.file_path,
            fileExtension: template.file_path.split(".").pop().toLowerCase(),
            name: template.file_path.replace(/^.*[\\/]/, ""),
        };
    }, [template]);

    const recipientRef = userType === "worker" ? referenceCode : chineseName;
    const shareLink = share?.links?.job_offer_link || share?.links?.worker_profile_link || "";

    const handleCopy = useCallback(() => {
        if (!canAct) return;
        gcCopyText(bodyText).then((ok) => {
            /* "copied" only when the clipboard took it; a template attachment never reaches the clipboard, so say so */
            if (ok) ShowToast("success", translation(mediaFile ? "key_copy_attachment_note" : "key_template_content_copied_to_clipboard"));
            else ShowToast("error", translation("key_failed_to_copy_template_content"));
        });
    }, [canAct, bodyText, mediaFile]);

    /* Open WhatsApp opens the app only: no recipient, no message, nothing sent or logged */
    const handleOpenWhatsApp = useCallback(() => {
        if (!canAct) return;
        let opened = null;
        try { opened = window.open("whatsapp://", "_blank"); } catch { opened = null; }
        setFootNote(opened ? { kind: "ok", text: SEND_TEMPLATE_NOTES.waOpened } : { kind: "err", text: SEND_TEMPLATE_NOTES.waBlocked });
    }, [canAct]);

    const handleSend = async () => {
        if (!canAct || sending || !channelOptions.includes(channel)) return;
        if (channel === "whatsapp" && !waWindowOpen) {
            setWaValidation(true);
            return;
        }
        setSending(true);
        /* the server's send is awaited: its refusal stops the flow, nothing reaches the chat */
        const sendRes = await dispatch(sendTemplateMessage({
            site: SEND_SITE.GLOBAL_CHAT,
            template_content_id: template.id,
            channel,
            context: JSON.parse(contextKey),
        }));
        const sent = sendRes?.error ? null : sendRes?.payload?.data;
        if (!sent?.recipient) {
            setSending(false);
            ShowToast("error", sendRes?.payload?.data?.data?.message || sendRes?.payload?.message || translation("key_something_went_wrong"));
            return;
        }
        const res = await dispatch(sendChatMessage({
            platform: channel === "chat" ? "app" : "whatsapp",
            friend_id: sent.recipient.user_id,
            entity_id: template.id,
            entity_type: "template",
            friend_type: sent.recipient.friend_type,
            template_file_path: mediaFile?.url,
            template_content: sent.body,
        }));
        setSending(false);
        /* CH-11: the service answers 200 with success:false on a failed send — that is a failure, the dialog stays open */
        const outcome = gcSendOutcome(res);
        /* S9 (F-30): the attempt the server logged gets the chat result — delivery is recorded apart from the attempt */
        reportSendOutcome({ send_id: sent.id, outcome: outcome.failed ? "failed" : "delivered", ...(outcome.failed && outcome.message ? { detail: String(outcome.message).slice(0, 255) } : {}) }).catch(() => {});
        if (outcome.failed) {
            ShowToast("error", outcome.message || translation("key_something_went_wrong"));
        } else {
            ShowToast("success", outcome.message);
            onClose();
        }
    };

    const handleEdit = useCallback(() => {
        if (!template) {
            ShowToast("error", translation("key_select_template_to_edit"));
            return;
        }
        if (onOpenAddEditTemplatePopup) {
            onOpenAddEditTemplatePopup("Edit", JSON.stringify({ ...template, module_key: category?.module_key || userType, category_id: categoryId, language_id: chosen ? languageId : englishId }));
        }
    }, [template, onOpenAddEditTemplatePopup, category, userType, categoryId, chosen, languageId, englishId]);

    const showWarnings = (templateName && !chosen) || missing.length > 0 || notAllowed.length > 0 || unknown.length > 0
        || preview.status === "refused" || (resolved && !resolved.recipient) || (categories !== null && !categories.length);

    return (
        <GcModal
            className="gc-tpl-dialog"
            belowBody={ waValidation && (
                <div className="gc-wa-validate">
                    <div className="gc-wv-t"><GcIcon name="lock" />{ translation("key_wa_window_expired_validation") }</div>
                    <div className="gc-wv-s">{ translation("key_wa_validation_note") }</div>
                    <div className="gc-wv-actions">
                        { onUseWhatsAppTemplate && (
                            <button type="button" className="gc-btn gc-btn-primary sm inline" onClick={ onUseWhatsAppTemplate }>
                                { translation("key_use_whatsapp_template") }
                            </button>
                        ) }
                        <button type="button" className="gc-btn gc-btn-secondary sm inline" onClick={ () => { setChannel("chat"); setWaValidation(false); } }>
                            { translation("key_switch_to_in_app") }
                        </button>
                        <button type="button" className="gc-btn gc-btn-secondary sm inline" onClick={ () => { setWaValidation(false); handleOpenWhatsApp(); } }>
                            { GC_TEMPLATE_COPY.openWhatsApp }
                        </button>
                        <button type="button" className="gc-btn gc-btn-secondary sm inline" onClick={ () => { setWaValidation(false); handleCopy(); } }>
                            { translation("key_copy") }
                        </button>
                        <button type="button" className="gc-btn gc-btn-secondary sm inline" onClick={ () => setWaValidation(false) }>
                            { translation("key_cancel") }
                        </button>
                    </div>
                </div>
            ) }
            title={ translation("key_send_template") }
            onClose={ onClose }
            headActions={ onOpenAddEditTemplatePopup
                && (templatePerms.canAddTemplate || templatePerms.canEditTemplate) && (
                <>
                    { templatePerms.canAddTemplate && (
                        <button type="button" className="gc-btn gc-btn-secondary sm inline" onClick={ () => onOpenAddEditTemplatePopup("Add", null) }>
                            <GcIcon name="plus" />{ translation("key_new") }
                        </button>
                    ) }
                    { templatePerms.canEditTemplate && (
                        <button type="button" className="gc-btn gc-btn-secondary sm inline" onClick={ handleEdit }>
                            { translation("key_edit") }
                        </button>
                    ) }
                </>
            ) }
            footer={ (
                <>
                    { footNote && (
                        <div className={ `gc-tpl-foot-note ${ footNote.kind }` } role="status">
                            <GcIcon name={ footNote.kind === "ok" ? "clock" : "warn" } /><span>{ footNote.text }</span>
                        </div>
                    ) }
                    <button type="button" className="gc-btn gc-btn-secondary inline" disabled={ !canAct } onClick={ handleCopy }>
                        { translation("key_copy") }
                    </button>
                    <button type="button" className="gc-btn gc-btn-secondary inline" disabled={ !canAct } title={ GC_TEMPLATE_COPY.openWhatsAppTitle } onClick={ handleOpenWhatsApp }>
                        <GcIcon name="send" />{ GC_TEMPLATE_COPY.openWhatsApp }
                    </button>
                    <button type="button" className="gc-btn gc-btn-secondary inline" onClick={ onClose }>
                        { translation("key_cancel") }
                    </button>
                    <button type="button" className="gc-btn gc-btn-primary inline" disabled={ !canAct || sending } onClick={ handleSend }>
                        <GcIcon name="send" />
                        { sending ? `${ translation("key_processing") }...` : translation("key_send") }
                    </button>
                </>
            ) }
        >
            <div className="gc-ff full">
                <label>{ GC_TEMPLATE_COPY.sendTo }</label>
                <div className="gc-recip-box">
                    <span className="gc-avatar-sm">{ gcInitials(fullname) }</span>
                    <div className="gc-recip-who">
                        <span className="gc-recip-name"><b>{ fullname }</b>{ recipientRef && <span className="gc-ref-code">{ recipientRef }</span> }</span>
                        <span className="gc-recip-sub">
                            { translation(ROLE_KEY[recipientKind] || ROLE_KEY[userType] || "key_employer") } · { translation("key_recipient_preselected") }
                        </span>
                    </div>
                    <div className="gc-recip-channel">
                        <span className="gc-tpl-label">{ translation("key_channel") }</span>
                        <div className="gc-tpl-seg" role="group" aria-label={ translation("key_channel") }>
                            { channelOptions.map((option) => (
                                <button
                                    key={ option }
                                    type="button"
                                    className={ channel === option ? "on" : "" }
                                    aria-pressed={ channel === option }
                                    onClick={ () => { setChannel(option); setWaValidation(false); } }
                                >
                                    { GC_CHANNEL_META[option === "chat" ? "app" : option].label }
                                </button>
                            )) }
                        </div>
                    </div>
                </div>
            </div>
            <div className="gc-tpl-context">
                { translation("key_context") }: { fullname }
                { share?.ref ? ` · ${ share.ref }` : "" }
                { category?.name ? ` · ${ category.name }` : "" }
            </div>
            <div className="gc-form-grid">
                <div className="gc-ff">
                    <label htmlFor="gc-tpl-module">{ translation("key_module") }</label>
                    <select id="gc-tpl-module" value={ category?.module_key || userType || "" } disabled>
                        <option value="">{ translation("key_please_select") }</option>
                        { moduleList?.map((item) => (
                            <option key={ item.id } value={ item.id }>{ item.name }</option>
                        )) }
                    </select>
                </div>
                <div className="gc-ff">
                    <label htmlFor="gc-tpl-category">{ translation("key_category") }</label>
                    <select id="gc-tpl-category" value={ categoryId } disabled={ sending } onChange={ (e) => handleCategoryChange(e.target.value) }>
                        <option value="">{ translation("key_please_select") }</option>
                        { (categories || []).map((item) => (
                            <option key={ item.id } value={ item.id }>{ item.name }</option>
                        )) }
                    </select>
                </div>
            </div>
            <div className="gc-ff">
                <span className="gc-tpl-label">{ translation("key_message_language") }</span>
                <div className="gc-tpl-seg" role="group" aria-label={ translation("key_message_language") }>
                    { (languageList || []).map((lang) => (
                        <button
                            key={ lang.id }
                            type="button"
                            className={ String(languageId) === String(lang.id) ? "on" : "" }
                            aria-pressed={ String(languageId) === String(lang.id) }
                            title={ lang.name_en }
                            onClick={ () => setLanguageId(String(lang.id)) }
                        >
                            { languageLabel(lang) }
                        </button>
                    )) }
                </div>
            </div>
            <div className="gc-ff full">
                <label htmlFor="gc-tpl-template">{ GC_TEMPLATE_COPY.template }</label>
                <select id="gc-tpl-template" value={ templateName } disabled={ !categoryId || sending } onChange={ (e) => setTemplateName(e.target.value) }>
                    <option value="">{ translation("key_please_select") }</option>
                    { templateNames.map((name) => (
                        <option key={ name } value={ name }>{ name }</option>
                    )) }
                </select>
            </div>
            { shareLink && (
                <div className="gc-deeplink-chip">
                    <GcIcon name="link" />
                    <span className="gc-mono-url">{ shareLink }</span>
                </div>
            ) }
            { template && (
                <div className="gc-ff full">
                    <label htmlFor="gc-tpl-body">{ translation("key_message") }</label>
                    { /* conflict sheet U-0219: the approved body is a preview, never a draft — resolved on the server */ }
                    <textarea id="gc-tpl-body" className="gc-tpl-body-edit" value={ bodyText } readOnly aria-readonly="true" rows={ 5 }
                        placeholder={ preview.status === "loading" ? `${ translation("key_loading") }…` : "" } />
                </div>
            ) }
            { showWarnings && (
                <div className="gc-warn-stack">
                    { categories !== null && !categories.length && (
                        <div className="gc-warn-line info" data-gc-no-category="">
                            <GcIcon name="warn" />
                            <span>{ translation("key_st_no_category") }</span>
                        </div>
                    ) }
                    { templateName && !chosen && (
                        <div className="gc-warn-line info" data-tm-fallback={ languageLabel(chosenLanguage) }>
                            <GcIcon name="globe" />
                            <span><b>{ languageLabel(chosenLanguage) }</b> { fallback ? GC_TEMPLATE_COPY.langFallback : GC_TEMPLATE_COPY.langUnavailable }</span>
                        </div>
                    ) }
                    { missing.length > 0 && (
                        <div className="gc-warn-line danger" data-gc-missing={ missing.join(",") }>
                            <GcIcon name="warn" />
                            <span>{ SEND_TEMPLATE_NOTES.missingValues } <b>{ missing.join(", ") }</b></span>
                        </div>
                    ) }
                    { notAllowed.length > 0 && (
                        <div className="gc-warn-line danger" data-gc-not-allowed="">
                            <GcIcon name="warn" />
                            <span>{ translation("key_st_not_for_recipient") } { notAllowed.join(", ") }</span>
                        </div>
                    ) }
                    { unknown.length > 0 && (
                        <div className="gc-warn-line danger" data-gc-unknown="">
                            <GcIcon name="warn" />
                            <span>{ translation("key_st_unknown_fields") } { unknown.join(", ") }</span>
                        </div>
                    ) }
                    { preview.status === "refused" && (
                        <div className="gc-warn-line danger" data-gc-refused="">
                            <GcIcon name="warn" />
                            <span>{ preview.message }</span>
                        </div>
                    ) }
                    { resolved && !resolved.recipient && (
                        <div className="gc-warn-line danger" data-gc-no-recipient="">
                            <GcIcon name="warn" />
                            <span>{ translation("key_st_recipient_unavailable") }</span>
                        </div>
                    ) }
                </div>
            ) }
            { mediaFile && (
                <div className="gc-ff full">
                    { ["jpg", "jpeg", "png"].includes(mediaFile.fileExtension)
                        ? <img src={ mediaFile.url } alt="media" style={ { width: 100, height: 100, borderRadius: 8, objectFit: "cover" } } />
                        : <span><img src={ userPdf } alt="media" width={ 24 } /> { mediaFile.name }</span> }
                </div>
            ) }
        </GcModal>
    );
};

GcSendTemplateModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    /* the conversation party's module: worker | employer (other conversations have no template category) */
    userType: PropTypes.string,
    recipientKind: PropTypes.string,
    /* the party's own record: the worker id or the employer id of the conversation */
    recordId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    fullname: PropTypes.string,
    chineseName: PropTypes.string,
    referenceCode: PropTypes.string,
    /* a Share from a panel: the shared Job Offer / worker, the link generated for it and its reference */
    share: PropTypes.shape({
        worker_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        job_offer_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        links: PropTypes.shape({ job_offer_link: PropTypes.string, worker_profile_link: PropTypes.string }),
        ref: PropTypes.string,
    }),
    channels: PropTypes.arrayOf(PropTypes.string),
    onOpenAddEditTemplatePopup: PropTypes.func,
    defaultChannel: PropTypes.oneOf(["chat", "whatsapp"]),
    waWindowOpen: PropTypes.bool,
    onUseWhatsAppTemplate: PropTypes.func,
};

export default GcSendTemplateModal;
