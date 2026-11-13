import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import PropTypes from 'prop-types';
import dayjs from "dayjs";
import { CHAT_HISTORY_PAGE_LIMIT, fetchConversactionsHistory, fetchChatHistoryList } from "../../../../../../redux/Slices/chat/ChatSlice";
import translation from "../../../../../../utils/translation";
import { sanitizeHtml } from "../../../../../../utils/sanitize";
import { CHAT_HISTORY_RANGES, CHANNEL_LABELS } from "../../../workerModuleConstants";
import { tr } from "../../../../../../components/mc-dialog/McDialog";

const toPlainText = (html) => String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const channelLabel = (platform) => CHANNEL_LABELS[platform] || CHANNEL_LABELS.app;
/* the conversation's last activity — the field chats/get-conversactions-history returns */
const lastActivity = (conv) => conv?.last_message_ceated_at || null;

const searchIcon = (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" />
    </svg>
);

const ALL = 'all';
const chevron = <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#667080" strokeWidth="1.8" aria-hidden="true"><path d="M3.5 6 8 10.5 12.5 6" /></svg>;
/* one filter (prototype chatHistoryDropdownHTML): "Label · value" trigger, listbox menu; opening one closes the others */
const FilterDropdown = ({ kind, label, value, options, open, onToggle, onSelect }) => (
    <div className="chat-history-dropdown">
        <button type="button" id={ `chat-history-${ kind }-trigger` } className="chat-history-dropdown-trigger" aria-haspopup="listbox" aria-expanded={ open } aria-controls={ `chat-history-${ kind }-options` } onClick={ onToggle }>
            <span>{ label } · { options.find((o) => o.key === value)?.label ?? value }</span>
            { chevron }
        </button>
        { open && (
            <div id={ `chat-history-${ kind }-options` } className="chat-history-dropdown-menu" role="listbox" aria-label={ label }>
                { options.map((o) => (
                    <button key={ o.key } type="button" role="option" aria-selected={ value === o.key } onClick={ () => onSelect(o.key) }>{ o.label }</button>
                )) }
            </div>
        ) }
    </div>
);
FilterDropdown.propTypes = { kind: PropTypes.string.isRequired, label: PropTypes.node, value: PropTypes.string, options: PropTypes.array.isRequired, open: PropTypes.bool, onToggle: PropTypes.func.isRequired, onSelect: PropTypes.func.isRequired };

/*
 * Chat History drawer panel (prototype Worker_Details.html chatHistoryPanelHTML / chatHistoryTimelineHTML, shared by the
 * Worker, Employer and Contract Details rails): read-only conversation list — search, User · Channel (only when more
 * than one channel is present) · Date range filters, "n of m conversations" — then the read-only message timeline
 * with the thread head and Back link. Same chat-slice endpoints the legacy ChatHistoryCollapseView used.
 */
const WkdChatHistoryPanel = ({ userId, workerName, entityLabelKey = 'key_worker', totalCount }) => {
    const dispatch = useDispatch();
    const { conversactionsListHistory, allChatHistoryList } = useSelector((state) => state.chat);
    const [selected, setSelected] = useState(null);
    const [search, setSearch] = useState('');
    const [range, setRange] = useState(ALL);
    const [user, setUser] = useState(ALL);
    const [channel, setChannel] = useState(ALL);
    const [openMenu, setOpenMenu] = useState(null);   /* 'user' | 'channel' | 'range' */
    const [loadingThread, setLoadingThread] = useState(false);

    /* the rail fetched the first page already; the panel loads only when it opens without one */
    useEffect(() => {
        if (userId && !conversactionsListHistory) {
            dispatch(fetchConversactionsHistory({ "limit": CHAT_HISTORY_PAGE_LIMIT, "page": 1, "user_id": userId }));
        }
    }, [dispatch, userId, conversactionsListHistory]);

    const conversations = useMemo(() => (Array.isArray(conversactionsListHistory) ? conversactionsListHistory : []), [conversactionsListHistory]);
    /* "n of m": m is the API total when known, else the loaded page */
    const totalConversations = Number.isFinite(Number(totalCount)) && Number(totalCount) > conversations.length ? Number(totalCount) : conversations.length;

    /* the User options are the conversations' own admin names; Channel only when more than one channel is present */
    const userOptions = useMemo(() => [{ key: ALL, label: tr('key_ch_all_users', 'All users') }, ...[...new Set(conversations.map((c) => c?.name).filter(Boolean))].sort().map((n) => ({ key: n, label: n }))], [conversations]);
    const channelOptions = useMemo(() => [{ key: ALL, label: tr('key_ch_all_channels', 'All channels') }, ...[...new Set(conversations.map((c) => channelLabel(c?.platform)))].map((n) => ({ key: n, label: n }))], [conversations]);
    const rangeOptions = useMemo(() => CHAT_HISTORY_RANGES.map((r) => ({ key: r.key, label: translation(r.labelKey) })), []);
    const channelShown = channelOptions.length > 2;
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const rangeDef = CHAT_HISTORY_RANGES.find((r) => r.key === range);
        return conversations.filter((c) => {
            if (q) {
                const hay = `${ c?.name || '' } ${ c?.role_name || '' } ${ c?.guard_name || '' } ${ toPlainText(c?.last_message) }`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (user !== ALL && c?.name !== user) return false;
            if (channelShown && channel !== ALL && channelLabel(c?.platform) !== channel) return false;
            if (rangeDef?.days) {
                const ts = lastActivity(c);
                if (ts && dayjs().diff(dayjs(ts), 'day') > rangeDef.days) return false;
            }
            return true;
        });
    }, [conversations, search, range, user, channel, channelShown]);
    const toggleMenu = useCallback((kind) => setOpenMenu((cur) => (cur === kind ? null : kind)), []);

    const openThread = useCallback((conv) => {
        setSelected(conv);
        setLoadingThread(true);
        dispatch(fetchChatHistoryList({
            group_id: conv.id,
            limit: 50,
            user_id: userId,
            ExclusiveStartKey: "",
        })).finally(() => setLoadingThread(false));
    }, [dispatch, userId]);

    const messages = useMemo(() => {
        if (!selected) return [];
        const data = allChatHistoryList?.data ?? [];
        return [...data].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }, [allChatHistoryList, selected]);

    if (selected) {
        return (
            <div className="chat-history-detail">
                <button type="button" className="chat-history-back" onClick={ () => setSelected(null) }>
                    ← { translation('key_back_to_chat_history') }
                </button>
                <div className="chat-history-thread-head">
                    <span className="channel-badge">{ channelLabel(selected.platform) }</span>
                    <div>
                        <strong className="chat-admin-name">{ selected.name }</strong>
                        <span className="chat-admin-role">{ selected.role_name || selected.guard_name }</span>
                    </div>
                    <div>
                        <strong>{ workerName }</strong>
                        <span>{ translation(entityLabelKey) }</span>
                    </div>
                </div>
                <div className="ctx-note">
                    <strong>{ translation('key_read_only_timeline') }</strong>
                    <span>{ translation('key_read_only_timeline_note') }</span>
                </div>
                { loadingThread ? (
                    <div className="ctx-state"><span className="ctx-spinner" /></div>
                ) : (
                    <div className="chat-history-timeline">
                        { messages.map((msg) => {
                            const isWorker = msg?.user_id == userId;
                            return (
                                <div key={ msg.id } className={ `chat-history-message ${ isWorker ? 'worker' : 'admin' }` }>
                                    <div className="chat-history-message-meta">
                                        <strong>{ msg?.full_name }</strong>
                                        <span>{ isWorker ? translation(entityLabelKey) : (msg?.guard_name || '') }</span>
                                        <time>{ dayjs(msg?.created_at).format('DD MMM YYYY · HH:mm') }</time>
                                    </div>
                                    <div className="chat-history-bubble" dangerouslySetInnerHTML={ sanitizeHtml(msg?.content) } />
                                </div>
                            );
                        }) }
                        { messages.length === 0 && (
                            <div className="chat-history-filtered-empty ctx-state">
                                <span>{ translation('key_no_messages_in_this_conversation') }</span>
                            </div>
                        ) }
                    </div>
                ) }
            </div>
        );
    }

    return (
        <>
            <div className="ctx-note">
                <strong>{ translation('key_read_only_conversation_history') }</strong>
                <span>{ translation('key_read_only_conversation_history_note') }</span>
            </div>
            <div className="chat-history-controls">
                <div className="chat-history-search">
                    { searchIcon }
                    <input
                        type="text"
                        value={ search }
                        placeholder={ translation('key_search_chat_history') }
                        onChange={ (e) => setSearch(e.target.value) }
                    />
                </div>
                <FilterDropdown kind="user" label={ tr('key_ch_user', 'User') } value={ user } options={ userOptions } open={ openMenu === 'user' } onToggle={ () => toggleMenu('user') } onSelect={ (v) => { setUser(v); setOpenMenu(null); } } />
                { channelShown && <FilterDropdown kind="channel" label={ translation('key_channel') } value={ channel } options={ channelOptions } open={ openMenu === 'channel' } onToggle={ () => toggleMenu('channel') } onSelect={ (v) => { setChannel(v); setOpenMenu(null); } } /> }
                <FilterDropdown kind="range" label={ translation('key_date_range') } value={ range } options={ rangeOptions } open={ openMenu === 'range' } onToggle={ () => toggleMenu('range') } onSelect={ (v) => { setRange(v); setOpenMenu(null); } } />
                <span className="chat-history-count" role="status" aria-live="polite">{ filtered.length } of { totalConversations } { translation('key_conversations') }</span>
            </div>
            <div className="chat-history-list">
                { filtered.map((conv) => (
                    <button key={ conv.id } type="button" className="chat-history-row" onClick={ () => openThread(conv) }>
                        <div className="chat-history-top">
                            <span className="channel-badge">{ channelLabel(conv.platform) }</span>
                            { lastActivity(conv) && (
                                <time>{ dayjs(lastActivity(conv)).format('DD MMM YYYY · HH:mm') }</time>
                            ) }
                        </div>
                        <strong>{ conv.name }</strong>
                        <span className="chat-admin-role">{ conv.role_name || conv.guard_name }</span>
                        { conv.last_message && <span className="chat-preview">{ toPlainText(conv.last_message) }</span> }
                    </button>
                )) }
                { filtered.length === 0 && (
                    <div className="chat-history-filtered-empty ctx-state">
                        <span>{ translation('key_no_conversations_to_display') }</span>
                    </div>
                ) }
            </div>
        </>
    );
};

WkdChatHistoryPanel.propTypes = {
    userId: PropTypes.any,
    workerName: PropTypes.string,
    entityLabelKey: PropTypes.string,
    totalCount: PropTypes.number,
};

export default React.memo(WkdChatHistoryPanel);
