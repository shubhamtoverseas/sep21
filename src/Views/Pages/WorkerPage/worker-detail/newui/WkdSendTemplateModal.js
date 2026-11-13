import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import PropTypes from "prop-types";
import "./wkd-send-template.css";
import { fetchCategoryList, fetchLanguageList, sendTemplateMessage, fetchTemplateNameByFilter, sendChatMessage, saveActionRequiredLogs } from "../../../../../redux/Slices/settings/templates/TemplateSlice";
import { saveWorkerValidateStatus } from "../../../../../redux/Slices/worker/WorkerSlice";
import { getSendSiteCategories, previewTemplate, reportSendOutcome } from "../../../../../services/templates";
import { setIntConversation } from "../../../../../services/chat";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { getInitials, headingCase, launchWhatsAppApp } from "../../../../../utils/utils";
import translation from "../../../../../utils/translation";
import useDialogFocus from "../../../../../hooks/useDialogFocus";
import { gcHtmlToText } from "../../../Conversaction/newui/gcHelpers";
import { TEMPLATE_MODE, recipientLabel, recipientsOf, useTemplateConfiguration } from "../../../SettingsPage/newui/templates/templateConfiguration";
import { SEND_TEMPLATE_NOTES, WHATSAPP_APP_SCHEME } from "../../workerModuleConstants";

/*
 * The shared Send Template composer (10 Nov 2026 package, delta row 8: TM01 recipient, TM03 missing values, TM05 languages,
 * TM06 content needed, F-21 WhatsApp window, F-24 private templates). Every send site opens it with its site code, the exact
 * record (`context`) and the record's parties; the server does the rest (settings-api S5):
 *   - a site that fixes no category (the Contract rail X-07, a Calendar contract task X-08) chooses among the categories the
 *     site sends by hand (settings-api /send-site; package: "neutral eligible template selection");
 *   - "Send to" offers the category's recipient variants for which the record has a party; payment-purpose variants need an
 *     exact invoice, which no site carries yet (OP-ST-07), so they are never offered;
 *   - the template list is the category's templates for that recipient in each language (private ones only for their creator);
 *   - the body is the server's preview: resolved and masked on the server, read-only here; any field without a value, outside
 *     the recipient or unknown keeps Send disabled and is listed;
 *   - the channels are the ones the server allows (category ∩ site; the record's CS in-app only);
 *   - WhatsApp outside the 24-hour window opened by the recipient is refused before anything is sent (F-21: only an approved
 *     WhatsApp template may go out then, and none is approved yet);
 *   - Send posts only the site, template, channel and record; the server logs what it resolved and names the recipient the
 *     chat delivery goes to. Action Required sites hand the server's body to the Action Required route instead.
 */

/* the server's channel names → the channel the send carries */
const CHANNEL_OF = Object.freeze({ in_app: "chat", whatsapp: "whatsapp" });
const PAYMENT_VARIANTS = new Set(["employer_payment", "cs_payment"]);

const chev = (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#667080" strokeWidth="1.8" aria-hidden="true">
        <path d="M3.5 6 8 10.5 12.5 6" />
    </svg>
);

const infoIcon = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <circle cx="8" cy="8" r="6.4" /><path d="M8 7v4M8 5h.01" />
    </svg>
);

const languageName = (lang) => lang?.name_en || lang?.name || '';
const isEnglish = (lang) => /english/i.test(languageName(lang));

const copyText = (text) => new Promise((resolve) => {
    try {
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(() => resolve(true), () => resolve(false));
            return;
        }
    } catch { /* fall through */ }
    resolve(false);
});

/** The recipients this record can offer for the category: its variants whose party the screen names (TM01). */
export const recipientChoices = (configuration, parties) => recipientsOf(configuration)
    .filter((r) => !PAYMENT_VARIANTS.has(r.key) && parties?.[r.recipient_type])
    .map((r) => ({ key: r.key, type: r.recipient_type, label: recipientLabel(r.key) }));

/** The channels the server allows, as the send names them. */
export const channelChoices = (serverChannels) => (Array.isArray(serverChannels) ? serverChannels : []).map((c) => CHANNEL_OF[c]).filter(Boolean);

/** What keeps a previewed template from being sent (TM03): fields without a value, fields outside the recipient, unknown tokens. */
export const previewProblems = (preview) => {
    const refused = Array.isArray(preview?.refused) ? preview.refused : [];
    return {
        missing: (Array.isArray(preview?.missing) ? preview.missing : []).map((f) => f.name || f.token),
        notAllowed: refused.filter((f) => f.reason === 'not_allowed').map((f) => `{{${ f.token }}}`),
        unknown: refused.filter((f) => f.reason !== 'not_allowed').map((f) => `{{${ f.token }}}`),
    };
};

/**
 * true / false from the recipient's WhatsApp conversation; null when it cannot be read.
 * @migration-unspecified(send-template): the package does not say how a record screen reads the 24-hour window. Chat answers it
 * only through create-conversation (get-or-create), so it is read when Send is pressed — a refused attempt can leave an empty
 * WhatsApp conversation for that contact. Confirm with product before release (OP-ST-14).
 */
const whatsappWindowOpen = (to) => setIntConversation({ friend_type: to.friend_type, platform: 'whatsapp', friend_id: to.user_id })
    .then((res) => Boolean(res?.data?.data?.isActiveSeason))
    .catch(() => null);

const WkdSendTemplateModal = (props) => {
    const { site, context, parties, userType, slug } = props;
    const cardRef = useRef(null);
    useDialogFocus(cardRef, props.onClose);
    const dispatch = useDispatch();
    const isAR = props.status_key === 'action_required';
    const contextKey = JSON.stringify(context || {});

    /* the category: fixed by the screen (module + slug), or chosen among the site's hand-sent categories */
    const [fixedCategoryId, setFixedCategoryId] = useState(null);
    const [categoryMissing, setCategoryMissing] = useState(false);
    useEffect(() => {
        if (!slug) return undefined;
        let alive = true;
        dispatch(fetchCategoryList({ module: userType })).then((res) => {
            if (!alive) return;
            const category = (res?.payload?.data || []).find((c) => c.slug === slug);
            if (category) setFixedCategoryId(category.id);
            else setCategoryMissing(true);
        });
        return () => { alive = false; };
    }, [dispatch, userType, slug]);
    const [siteCategories, setSiteCategories] = useState(null);
    const [chosenCategoryId, setChosenCategoryId] = useState('');
    useEffect(() => {
        if (slug) return undefined;
        let alive = true;
        getSendSiteCategories({ code: site })
            .then((res) => {
                if (!alive) return;
                const list = res?.data?.data?.data?.categories || [];
                setSiteCategories(list);
                if (list.length === 1) setChosenCategoryId(String(list[0].id));
            })
            .catch(() => { if (alive) setSiteCategories([]); });
        return () => { alive = false; };
    }, [slug, site]);
    const chosenCategory = (siteCategories || []).find((c) => String(c.id) === String(chosenCategoryId)) || null;
    const categoryId = slug ? fixedCategoryId : (chosenCategory?.id || null);
    const moduleKey = slug ? userType : chosenCategory?.module_key;
    const categorySlug = slug || chosenCategory?.slug || '';
    const { configuration, error: configurationError } = useTemplateConfiguration(categoryId);
    const mode = configuration?.configuration?.mode;
    const manual = mode === TEMPLATE_MODE.MANUAL;

    const choices = useMemo(() => recipientChoices(configuration, parties), [configuration, parties]);
    const [recipientKey, setRecipientKey] = useState('');
    useEffect(() => {
        if (!choices.some((c) => c.key === recipientKey)) setRecipientKey(choices[0]?.key || '');
    }, [choices, recipientKey]);
    const recipient = choices.find((c) => c.key === recipientKey) || null;
    const party = recipient ? parties?.[recipient.type] : null;

    const [languages, setLanguages] = useState([]);
    useEffect(() => {
        let alive = true;
        dispatch(fetchLanguageList()).then((res) => { if (alive && !res?.error) setLanguages(res?.payload?.data || []); });
        return () => { alive = false; };
    }, [dispatch]);

    /* the category's templates for this recipient, per language; null while loading */
    const [templates, setTemplates] = useState(null);
    useEffect(() => {
        if (!categoryId || !recipientKey || !manual || !languages.length) { setTemplates(null); return undefined; }
        let alive = true;
        setTemplates(null);
        Promise.all(languages.map((lang) =>
            dispatch(fetchTemplateNameByFilter({ category_id: categoryId, module_key: moduleKey, language_id: lang.id, recipient_variant: recipientKey }))
                .then((res) => (res?.payload?.data || []).map((t) => ({ ...t, _language: lang })))
        )).then((lists) => { if (alive) setTemplates(lists.flat()); });
        return () => { alive = false; };
    }, [dispatch, categoryId, recipientKey, manual, languages, moduleKey]);
    const templateList = useMemo(() => templates || [], [templates]);

    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [selectedLanguageId, setSelectedLanguageId] = useState('');
    const [fallbackFrom, setFallbackFrom] = useState('');
    useEffect(() => { setSelectedTemplateId(''); setFallbackFrom(''); }, [recipientKey, categoryId]);
    const templateNames = useMemo(() => {
        const seen = new Map();
        templateList.forEach((t) => { if (!seen.has(t.template_name)) seen.set(t.template_name, t); });
        return [...seen.values()];
    }, [templateList]);
    const languagesFor = useMemo(
        () => templateList.filter((t) => t.template_name === selectedTemplateId).map((t) => t._language).filter(Boolean),
        [templateList, selectedTemplateId]
    );
    const languageNameOf = useCallback(
        (id) => languageName(templateList.find((t) => String(t._language?.id) === String(id))?._language),
        [templateList]
    );
    useEffect(() => {
        if (!languagesFor.length) { setSelectedLanguageId(''); return; }
        if (!languagesFor.some((l) => String(l.id) === String(selectedLanguageId))) {
            const target = languagesFor.find(isEnglish) || languagesFor[0];
            setFallbackFrom(selectedLanguageId && isEnglish(target) ? languageNameOf(selectedLanguageId) : '');
            setSelectedLanguageId(String(target.id));
        }
    }, [languagesFor, selectedLanguageId, languageNameOf]);
    const selected = useMemo(
        () => templateList.find((t) => t.template_name === selectedTemplateId && String(t._language?.id) === String(selectedLanguageId)) || null,
        [templateList, selectedTemplateId, selectedLanguageId]
    );

    /* the server's preview of the chosen template in this record's context */
    const [preview, setPreview] = useState({ status: 'idle' });
    useEffect(() => {
        if (!selected?.id) { setPreview({ status: 'idle' }); return undefined; }
        let alive = true;
        setPreview({ status: 'loading' });
        previewTemplate({ site, template_content_id: selected.id, context: JSON.parse(contextKey) })
            .then((res) => { if (alive) setPreview({ status: 'ready', data: res?.data?.data || null }); })
            .catch((error) => { if (alive) setPreview({ status: 'refused', message: error?.response?.data?.message || translation('key_server_error') }); });
        return () => { alive = false; };
    }, [selected?.id, site, contextKey]);
    const resolved = preview.status === 'ready' ? preview.data : null;
    const sendTo = resolved?.recipient || null;
    const bodyText = useMemo(() => gcHtmlToText(resolved?.body), [resolved]);
    const problems = useMemo(() => previewProblems(resolved), [resolved]);
    const channels = useMemo(() => channelChoices(resolved?.channels), [resolved]);

    const [channel, setChannel] = useState('');
    /* @migration-unspecified(send-template): the package names no default channel. Retained the composer's existing default
       (WhatsApp where offered). Confirm with product before release (OP-ST-15). */
    useEffect(() => {
        if (!channels.includes(channel)) setChannel(channels.includes('whatsapp') && !isAR ? 'whatsapp' : (channels[0] || ''));
    }, [channels, channel, isAR]);
    const [waClosed, setWaClosed] = useState(false);
    useEffect(() => { setWaClosed(false); }, [channel, sendTo?.user_id]);

    const [sending, setSending] = useState(false);
    const [statusNote, setStatusNote] = useState(null);
    const canCopy = Boolean(bodyText.trim()) && Boolean(resolved?.can_send);
    const canSend = canCopy && Boolean(sendTo) && Boolean(channel) && !waClosed;

    /* UP02: the Action Required message, after the decision is saved — chat answers 200 with success:false on a failed
       store, and a rejected request is a failure too */
    const [arUndelivered, setArUndelivered] = useState(null);   /* the decision is saved, its message not delivered: { message } */
    const deliverActionRequired = useCallback(async () => {
        const res = await dispatch(saveActionRequiredLogs({
            user_id: sendTo.user_id,
            entity_id: context?.worker_id,
            entity_type: "worker",
            action_type: categorySlug,
            content: resolved.body,
        }));
        return { failed: Boolean(res?.error) || res?.payload?.success === false, message: res?.payload?.message || res?.payload?.data?.data?.message || "" };
    }, [dispatch, sendTo, context, categorySlug, resolved]);

    /* UP02: the section decision and its explanation are saved together (admin-api); the message is a separate, later step.
       A failed save changes nothing. A saved decision whose message is not delivered says so, apart from a failed save, and
       offers Resend — which sends the message only (the decision is not saved twice). */
    const sendActionRequired = useCallback(async () => {
        const res = await dispatch(saveWorkerValidateStatus({
            worker_id: context?.worker_id,
            type: props.actionStatusType,
            status_key: props.status_key,
            reason: resolved.body,
        }));
        if (!res?.payload?.status) {
            setSending(false);
            ShowToast("error", res?.payload?.message);
            return;
        }
        if (props.handleRefreshProfile) props.handleRefreshProfile(props.actionStatusType);
        const delivery = await deliverActionRequired();
        setSending(false);
        if (delivery.failed) {
            setArUndelivered({ message: delivery.message });
            return;
        }
        ShowToast("success", res?.payload?.message);
        props.onClose();
    }, [dispatch, context, resolved, deliverActionRequired, props]);

    const resendActionRequired = useCallback(async () => {
        if (sending) return;
        setSending(true);
        const delivery = await deliverActionRequired();
        setSending(false);
        if (delivery.failed) {
            setArUndelivered({ message: delivery.message });
            return;
        }
        setArUndelivered(null);
        ShowToast("success", translation('key_st_ar_message_sent'));
        props.onClose();
    }, [sending, deliverActionRequired, props]);

    const handleSend = useCallback(async () => {
        if (!selected || !canSend || sending || arUndelivered) return;
        setSending(true);
        if (isAR) { sendActionRequired(); return; }
        if (channel === 'whatsapp') {
            const open = await whatsappWindowOpen(sendTo);
            if (open !== true) {
                setSending(false);
                if (open === false) setWaClosed(true);
                else ShowToast("error", translation('key_server_error'));
                return;
            }
        }
        /* ONE delivery, two steps: the server's send (gate, resolution, log) is awaited and its refusal stops the flow */
        const tres = await dispatch(sendTemplateMessage({
            site,
            template_content_id: selected.id,
            channel,
            context: JSON.parse(contextKey),
            ...(props.attachmentKey ? { file_path: props.attachmentKey } : {}),
        }));
        const sent = tres?.error ? null : tres?.payload?.data;
        if (!sent?.recipient) {
            setSending(false);
            ShowToast("error", tres?.payload?.data?.data?.message || tres?.payload?.message || translation('key_server_error'));
            return;
        }
        /* the chat payload is what a Share send records afterwards (`onSent`) — the shape the stage share APIs take as `template_data` */
        const messagePayload = {
            platform: channel === 'chat' ? 'app' : 'whatsapp',
            friend_id: sent.recipient.user_id,
            entity_id: selected.id,
            entity_type: 'template',
            friend_type: sent.recipient.friend_type,
            template_file_path: props.attachmentPath || selected?.file_path_name,
            template_content: sent.body,
        };
        const res = await dispatch(sendChatMessage(messagePayload));
        setSending(false);
        const failed = Boolean(res?.error) || res?.payload?.success === false;
        /* S9 (F-30): the attempt the server logged gets the chat result — delivery is recorded apart from the attempt */
        reportSendOutcome({ send_id: sent.id, outcome: failed ? "failed" : "delivered", ...(failed && res?.payload?.message ? { detail: String(res.payload.message).slice(0, 255) } : {}) }).catch(() => {});
        if (failed) {
            ShowToast("error", res?.payload?.message);
            return;
        }
        ShowToast("success", res?.payload?.message);
        props.onSent?.(messagePayload);
        props.onClose();
    }, [dispatch, selected, canSend, sending, arUndelivered, isAR, sendActionRequired, channel, sendTo, site, contextKey, props]);

    const handleCopy = useCallback(() => {
        if (!canCopy) return;
        copyText(bodyText).then((ok) => {
            setStatusNote({ kind: ok ? 'ok' : 'warn', text: ok ? SEND_TEMPLATE_NOTES.copyOk : SEND_TEMPLATE_NOTES.copyFail });
        });
    }, [canCopy, bodyText]);
    const handleOpenWhatsApp = useCallback(() => {
        if (!canCopy) return;
        const { opened } = launchWhatsAppApp(WHATSAPP_APP_SCHEME);
        setStatusNote({ kind: opened ? 'ok' : 'warn', text: opened ? SEND_TEMPLATE_NOTES.waOpened : SEND_TEMPLATE_NOTES.waBlocked });
    }, [canCopy]);

    /* the WhatsApp number is shown only where it is the delivery channel — never for the CS (in-app only) or Action Required */
    const phone = channel === 'whatsapp' && !isAR && recipient?.type !== 'cs' ? (party?.phone || '') : '';
    const recipientName = party?.name || recipient?.label || '';
    const recipientSub = `${ recipient?.label || translation('key_worker') }${ phone ? ' · ' : '' }`;
    const showSelfTools = (props.allowSelfTools ?? true) && !isAR;
    const consequence = isAR
        ? (props.contextLabel
            ? `Sending sets ${ props.contextLabel } to Action Required and opens the Action Required chat thread.`
            : translation('key_ar_send_note'))
        : (props.note || SEND_TEMPLATE_NOTES.defaultNote);

    /* why nothing can be chosen: no configuration, not a manual category, no recipient on this record, no template for the recipient */
    let blocked = '';
    if (!slug && siteCategories !== null && !siteCategories.length) blocked = translation('key_st_no_category');
    else if (categoryMissing || configurationError) blocked = translation('key_st_configuration_unavailable');
    else if (configuration && !manual) blocked = translation(mode === TEMPLATE_MODE.INTERNAL ? 'key_st_mode_internal' : 'key_st_mode_automatic');
    else if (configuration && !choices.length) blocked = translation('key_st_no_recipient');
    const contentNeeded = !blocked && templates !== null && templateNames.length === 0;

    return (
        <div className="wkd-stm-backdrop" role="presentation">
            <div ref={ cardRef } className="wkd-stm-card" role="dialog" aria-modal="true" aria-label={ headingCase(props.title || translation('key_send_template')) }>
                <div className="wkd-stm-head">
                    <span className="wkd-stm-title">{ headingCase(props.title || translation('key_send_template')) }</span>
                    <span className="grow" />
                    <button type="button" className="wkd-stm-x" aria-label={ translation('key_close') } onClick={ () => props.onClose() }>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#667080" strokeWidth="1.8" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>
                    </button>
                </div>
                <div className="wkd-stm-body">
                    <div className="wkd-stm-recipient">
                        <span className="av">{ getInitials(recipientName) }</span>
                        <span className="who">
                            <span className="nm">{ recipientName }</span>
                            <span className="sub">{ recipientSub }{ phone && <span className="mono">{ phone }</span> }</span>
                        </span>
                        { channels.length > 1 && (
                            <span className="wkd-stm-channel">
                                <select value={ channel } onChange={ (e) => setChannel(e.target.value) } aria-label={ translation('key_channel') }>
                                    { channels.includes('whatsapp') && <option value="whatsapp">{ translation('key_gc_channel_meta_whatsapp_label') }</option> }
                                    { channels.includes('chat') && <option value="chat">{ translation('key_wkr_in_app') }</option> }
                                </select>
                                { chev }
                            </span>
                        ) }
                        { channels.length === 1 && (
                            <span className="wkd-stm-channel-static" data-mc-channel={ channels[0] === 'chat' ? 'in-app' : 'whatsapp' }>
                                { channels[0] === 'chat' ? translation('key_wkr_in_app') : translation('key_gc_channel_meta_whatsapp_label') }
                            </span>
                        ) }
                    </div>
                    { !slug && siteCategories !== null && siteCategories.length > 1 && (
                        <div>
                            <label className="wkd-stm-lbl" htmlFor="wkd-stm-category">{ headingCase(translation('key_category')) }</label>
                            <span className="wkd-stm-select">
                                <select id="wkd-stm-category" value={ chosenCategoryId } onChange={ (e) => setChosenCategoryId(e.target.value) } disabled={ sending }>
                                    <option value="">{ translation('key_please_select') }</option>
                                    { siteCategories.map((c) => <option key={ c.id } value={ c.id }>{ c.name }</option>) }
                                </select>
                                { chev }
                            </span>
                        </div>
                    ) }
                    { choices.length > 1 && (
                        <div>
                            <label className="wkd-stm-lbl" htmlFor="wkd-stm-recipient">{ headingCase(translation('key_send_to')) }</label>
                            <span className="wkd-stm-select">
                                <select id="wkd-stm-recipient" value={ recipientKey } onChange={ (e) => setRecipientKey(e.target.value) } disabled={ sending }>
                                    { choices.map((c) => <option key={ c.key } value={ c.key }>{ c.label }</option>) }
                                </select>
                                { chev }
                            </span>
                        </div>
                    ) }
                    { props.contextLabel && (
                        <div className="wkd-stm-ctx">{ translation('key_context') }: { recipientName } · { props.contextLabel }{ isAR ? ` (${ translation('key_action_required') })` : '' }</div>
                    ) }
                    { blocked && (
                        <div className="wkd-stm-fallback" role="status" data-mc-tpl-blocked="1">
                            { infoIcon }
                            <div>{ blocked }</div>
                        </div>
                    ) }
                    <fieldset className="wkd-stm-langs">
                        <legend>{ headingCase(translation('key_message_language')) }</legend>
                        <div className="wkd-stm-lang-row">
                            { languagesFor.map((l) => (
                                <label key={ l.id } className="wkd-stm-lang">
                                    <input
                                        type="radio"
                                        name="wkd-stm-lang"
                                        value={ l.id }
                                        checked={ String(selectedLanguageId) === String(l.id) }
                                        onChange={ () => { setSelectedLanguageId(String(l.id)); setFallbackFrom(''); } }
                                    />
                                    { languageName(l) }
                                </label>
                            )) }
                            { !languagesFor.length && <span className="wkd-stm-lang muted">—</span> }
                        </div>
                    </fieldset>
                    { fallbackFrom && (
                        <div className="wkd-stm-fallback" role="status" data-mc-tpl-fallback="1">
                            { infoIcon }
                            <div>{ translation('key_wkr_no_template_found_for') } { fallbackFrom }{ translation('key_wkr_using_the_english_version_instead') }</div>
                        </div>
                    ) }
                    <div>
                        <label className="wkd-stm-lbl" htmlFor="wkd-stm-template">{ headingCase(translation('key_template')) }</label>
                        { contentNeeded ? (
                            <div className="wkd-stm-fallback" role="status" data-mc-tpl-content-needed="1">
                                { infoIcon }
                                <div>{ translation('key_st_content_needed') }</div>
                            </div>
                        ) : (
                            <span className="wkd-stm-select">
                                <select id="wkd-stm-template" value={ selectedTemplateId } onChange={ (e) => setSelectedTemplateId(e.target.value) } disabled={ Boolean(blocked) || sending }>
                                    <option value="">{ translation('key_please_select') }</option>
                                    { templateNames.map((t) => (
                                        <option key={ t.template_name } value={ t.template_name }>{ t.template_name }</option>
                                    )) }
                                </select>
                                { chev }
                            </span>
                        ) }
                    </div>
                    <div>
                        <label className="wkd-stm-lbl" htmlFor="wkd-stm-body">{ translation('key_message') }</label>
                        <textarea
                            id="wkd-stm-body"
                            className="wkd-stm-textarea"
                            rows={ 5 }
                            value={ bodyText }
                            placeholder={ preview.status === 'loading' ? `${ translation('key_loading') }…` : translation('key_please_select') }
                            disabled={ !selected }
                            readOnly
                            aria-readonly="true"
                        />
                        { problems.missing.length > 0 && (
                            <div className="wkd-stm-fallback" role="alert" data-mc-tpl-missing={ problems.missing.join(',') }>
                                { infoIcon }
                                <div>{ SEND_TEMPLATE_NOTES.missingValues } { problems.missing.join(', ') }</div>
                            </div>
                        ) }
                        { problems.notAllowed.length > 0 && (
                            <div className="wkd-stm-fallback" role="alert" data-mc-tpl-not-allowed="1">
                                { infoIcon }
                                <div>{ translation('key_st_not_for_recipient') } { problems.notAllowed.join(', ') }</div>
                            </div>
                        ) }
                        { problems.unknown.length > 0 && (
                            <div className="wkd-stm-fallback" role="alert" data-mc-tpl-unknown="1">
                                { infoIcon }
                                <div>{ translation('key_st_unknown_fields') } { problems.unknown.join(', ') }</div>
                            </div>
                        ) }
                        { preview.status === 'refused' && (
                            <div className="wkd-stm-fallback" role="alert" data-mc-tpl-refused="1">
                                { infoIcon }
                                <div>{ preview.message }</div>
                            </div>
                        ) }
                        { resolved && !sendTo && (
                            <div className="wkd-stm-fallback" role="alert" data-mc-tpl-no-recipient="1">
                                { infoIcon }
                                <div>{ translation('key_st_recipient_unavailable') }</div>
                            </div>
                        ) }
                        { waClosed && (
                            <div className="wkd-stm-fallback" role="alert" data-mc-tpl-wa-closed="1">
                                { infoIcon }
                                <div>{ translation('key_wa_window_expired_validation') } { channels.includes('chat') ? translation('key_st_wa_window_closed_hint') : '' }</div>
                            </div>
                        ) }
                        { arUndelivered && (
                            <div className="wkd-stm-fallback" role="alert" data-mc-tpl-ar-undelivered="1">
                                { infoIcon }
                                <div>{ translation('key_st_ar_saved_not_delivered') } { arUndelivered.message || translation('key_server_error') }</div>
                            </div>
                        ) }
                    </div>
                    <div className="wkd-stm-note">{ consequence }</div>
                </div>
                { statusNote && (
                    <div className={ `wkd-stm-copynote ${ statusNote.kind }` } role="status" data-mc-tpl-copynote={ statusNote.kind }>{ statusNote.text }</div>
                ) }
                <div className="wkd-stm-foot">
                    { showSelfTools && (
                        <>
                            <button type="button" className="wkd-stm-btn" onClick={ handleCopy } disabled={ !canCopy || sending } title={ translation('key_wkr_copy_the_edited_message_to_the_clipboard') }>
                                { translation('key_copy') }
                            </button>
                            <button type="button" className="wkd-stm-btn" onClick={ handleOpenWhatsApp } disabled={ !canCopy || sending } title={ translation('key_wkr_open_the_whats_app_application_no_recipient') }>
                                { translation('key_wkr_open_whats_app') }
                            </button>
                        </>
                    ) }
                    <button type="button" className="wkd-stm-btn" onClick={ () => props.onClose() } disabled={ sending }>
                        { translation('key_cancel') }
                    </button>
                    { arUndelivered ? (
                        <button type="button" className="wkd-stm-btn primary" onClick={ resendActionRequired } disabled={ sending } data-mc-tpl-ar-resend="1">
                            { translation('key_st_ar_resend') }
                        </button>
                    ) : (
                        <button type="button" className="wkd-stm-btn primary" onClick={ handleSend } disabled={ !canSend || sending }>
                            { translation('key_send') }
                        </button>
                    ) }
                </div>
            </div>
        </div>
    );
};

const partyShape = PropTypes.shape({ name: PropTypes.string, phone: PropTypes.string });

WkdSendTemplateModal.propTypes = {
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string,
    /* the screen's send site (SEND_SITE): the server checks the sender's Send Template grant for it on this record */
    site: PropTypes.string.isRequired,
    /* the exact record the message is about; a contract names its worker, employer and CS, a Job Offer its employer and CS */
    context: PropTypes.shape({
        worker_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        employer_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        contract_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        job_offer_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        /* computed links the screen generated (http(s) only): { worker_profile_link, job_offer_link } */
        links: PropTypes.objectOf(PropTypes.string),
    }).isRequired,
    /* the template catalogue: module + category slug; without a slug the sender chooses among the site's hand-sent categories */
    userType: PropTypes.string,
    slug: PropTypes.string,
    /* the record's parties by recipient type — the only recipients "Send to" may offer (names / numbers are display only) */
    parties: PropTypes.shape({ worker: partyShape, employer: partyShape, cs: partyShape, partner: partyShape }).isRequired,
    /* "action_required" on the Action Required sites: the server's body goes to the Action Required route */
    status_key: PropTypes.string,
    actionStatusType: PropTypes.string,
    handleRefreshProfile: PropTypes.func,
    contextLabel: PropTypes.string,
    note: PropTypes.string,
    allowSelfTools: PropTypes.bool,
    /* called with the delivered chat payload after a successful template send (before onClose) — the stage Share flows record it */
    onSent: PropTypes.func,
    /* a record file sent as the message media instead of the template's own attachment (E-Visa Share): its URL for the chat
       delivery and its storage key for the send log */
    attachmentPath: PropTypes.string,
    attachmentKey: PropTypes.string,
};

export default WkdSendTemplateModal;
