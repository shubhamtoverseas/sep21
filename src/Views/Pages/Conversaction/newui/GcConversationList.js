import React, { useCallback, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import GcIcon from "./gcIcons";
import CustomSpinner from "../../../../components/ReusableComponents/CustomSpinner";
import translation from "../../../../utils/translation";
import { GC_CHANNEL_META, gcGroupName, gcGroupParts, gcListTime, gcSnippet, gcStakeAvatar, gcStakeClass } from "./gcHelpers";
import { GC_LIST_COPY, STAKE_OPTIONS } from "./gcConstants";


const GcConversationRow = React.memo(function GcConversationRow({ group, selected, onSelect }) {
    const row = group.latestRow;
    const name = gcGroupName(group);
    const zh = group.friendType !== "group_team" ? row?.chinese_name : "";
    const groupParts = gcGroupParts(row);
    const chanMeta = GC_CHANNEL_META[row?.platform];
    const handleClick = useCallback(() => onSelect(group), [onSelect, group]);
    return (
        <button type="button" className={ `gc-convo-row ${ selected ? "sel" : "" }` } title={ name } onClick={ handleClick }>
            <span className={ `gc-avatar ${ gcStakeClass(group.friendType) }` }>
                <GcIcon name={ gcStakeAvatar(group.friendType) } />
            </span>
            <span className="gc-convo-body">
                <span className="gc-convo-line1">
                    <span className="gc-convo-ident">
                        { groupParts ? (
                            <>
                                { groupParts.employer }
                                { groupParts.zh && <span className="gc-convo-zh"> · { groupParts.zh }</span> }
                                { groupParts.worker && ` x ${ groupParts.worker }` }
                            </>
                        ) : name }
                        { zh && <span className="gc-convo-zh"> · { zh }</span> }
                    </span>
                </span>
                <span className="gc-convo-line3">
                    <span className="gc-convo-preview">
                        { group.friendType === "group_team" && row?.last_message_sender_name && `«${ row.last_message_sender_name }» ` }
                        { gcSnippet(row?.last_message) }
                    </span>
                </span>
            </span>
            <span className="gc-convo-meta-right">
                <span className="gc-convo-time">{ gcListTime(row?.last_message_ceated_at) }</span>
                <span className="gc-meta-icons">
                    { group.unread > 0 && <span className="gc-unread-pill">{ group.unread }</span> }
                    { chanMeta && <GcIcon name={ chanMeta.icon } className={ `gc-chan-mini ${ row.platform === "whatsapp" ? "wa" : row.platform === "line" ? "line" : "" }` } /> }
                </span>
            </span>
        </button>
    );
});

GcConversationRow.propTypes = {
    group: PropTypes.object.isRequired,
    selected: PropTypes.bool,
    onSelect: PropTypes.func.isRequired,
};

const GcConversationList = ({
    groups,
    selectedKey,
    statusFilter,
    stakeFilter,
    counts,
    stakeCounts,
    listStatus,
    scrollStatus,
    onSelect,
    onSearch,
    onStatusFilter,
    onStakeFilter,
    onLoadMore,
}) => {
    const [stakeOpen, setStakeOpen] = useState(false);
    const lastScrollTop = useRef(0);
    const isFetchingRef = useRef(false);
    const fetchTimeout = useRef(null);

    const stakeLabel = useMemo(() => {
        const opt = STAKE_OPTIONS.find((o) => o.id === stakeFilter);
        return translation(opt ? opt.labelKey : "key_all");
    }, [stakeFilter]);

    const chips = useMemo(() => ([
        { id: "all", label: translation("key_all"), n: counts.all },
        { id: "notreplied", label: translation("key_not_replied"), n: counts.notReplied },
        { id: "unread", label: translation("key_unread"), n: counts.unread },
    ]), [counts]);

    const handleScroll = useCallback((e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollTop + clientHeight >= scrollHeight - 2 && scrollTop > lastScrollTop.current && !isFetchingRef.current) {
            isFetchingRef.current = true;
            if (fetchTimeout.current) clearTimeout(fetchTimeout.current);
            fetchTimeout.current = setTimeout(() => {
                onLoadMore();
                isFetchingRef.current = false;
            }, 800);
        }
        lastScrollTop.current = scrollTop;
    }, [onLoadMore]);

    const handleStakePick = useCallback((id) => {
        setStakeOpen(false);
        onStakeFilter(id);
    }, [onStakeFilter]);

    return (
        <section className="gc-convo-col">
            <div className="gc-convo-head">
                <div className="gc-convo-title-row">
                    <span className="gc-convo-title">{ GC_LIST_COPY.title }</span>
                    { /* @migration-unspecified(chat): spec is silent on what + (New conversation) and Advanced filters do,
                       and no create or advanced-filter flow exists, so both render disabled with a reason.
                       Confirm with product before release (OP-CHAT-UI-09). */ }
                    <button
                        type="button"
                        className="gc-icon-btn tip"
                        aria-disabled="true"
                        data-tip={ `${ GC_LIST_COPY.newConversation }: ${ GC_LIST_COPY.newConversationUnavailable }` }
                        aria-label={ `${ GC_LIST_COPY.newConversation }. ${ GC_LIST_COPY.newConversationUnavailable }` }
                    >
                        <GcIcon name="plus" />
                    </button>
                    <button
                        type="button"
                        className="gc-icon-btn tip"
                        aria-disabled="true"
                        data-tip={ `${ GC_LIST_COPY.advancedFilters }: ${ GC_LIST_COPY.advancedFiltersUnavailable }` }
                        aria-label={ `${ GC_LIST_COPY.advancedFilters }. ${ GC_LIST_COPY.advancedFiltersUnavailable }` }
                    >
                        <GcIcon name="sliders" />
                    </button>
                </div>
                <div className="gc-stake-wrap">
                    <button type="button" className="gc-stake-select" onClick={ () => setStakeOpen((v) => !v) }>
                        <GcIcon name="filter" />
                        <span>{ stakeLabel }</span>
                        <GcIcon name="chevD" className="gc-chev" />
                    </button>
                    { stakeOpen && (
                        <div className="gc-stake-menu">
                            { STAKE_OPTIONS.map((o) => (
                                <button
                                    key={ o.id || "all" }
                                    type="button"
                                    className={ `gc-stake-item ${ stakeFilter === o.id ? "sel" : "" }` }
                                    onClick={ () => handleStakePick(o.id) }
                                >
                                    { translation(o.labelKey) }
                                    { stakeCounts && (
                                        <span className="gc-cnt">{ stakeCounts[o.id || "all"] ?? 0 }</span>
                                    ) }
                                </button>
                            )) }
                        </div>
                    ) }
                </div>
                <div className="gc-search-mini">
                    <GcIcon name="search" />
                    <input placeholder={ translation("key_search_name_code_message") } onChange={ onSearch } aria-label={ translation("key_search") } />
                </div>
                <div className="gc-chip-row">
                    { chips.map((chip) => (
                        <button
                            key={ chip.id }
                            type="button"
                            className={ `gc-chip ${ statusFilter === chip.id ? "sel" : "" }` }
                            onClick={ () => onStatusFilter(chip.id) }
                        >
                            { chip.label }{ typeof chip.n === "number" && <span className="gc-n">{ chip.n }</span> }
                        </button>
                    )) }
                </div>
            </div>
            <div className="gc-convo-scroll" onScroll={ handleScroll }>
                { listStatus === "loading" && <div className="gc-list-loader"><CustomSpinner /></div> }
                { listStatus === "failed" && <div className="gc-list-error">{ translation("key_failed_to_load_data") }</div> }
                { listStatus === "succeeded" && groups.length === 0 && (
                    <div className="gc-list-empty">{ translation("key_no_conversations_match_filters") }</div>
                ) }
                { listStatus === "succeeded" && groups.map((group) => (
                    <GcConversationRow
                        key={ group.key }
                        group={ group }
                        selected={ group.key === selectedKey }
                        onSelect={ onSelect }
                    />
                )) }
                { scrollStatus === "loading" && <div className="gc-list-loader"><CustomSpinner /></div> }
            </div>
        </section>
    );
};

GcConversationList.propTypes = {
    groups: PropTypes.array.isRequired,
    selectedKey: PropTypes.string,
    statusFilter: PropTypes.string.isRequired,
    stakeFilter: PropTypes.string.isRequired,
    counts: PropTypes.object.isRequired,
    stakeCounts: PropTypes.object,
    listStatus: PropTypes.string,
    scrollStatus: PropTypes.string,
    onSelect: PropTypes.func.isRequired,
    onSearch: PropTypes.func.isRequired,
    onStatusFilter: PropTypes.func.isRequired,
    onStakeFilter: PropTypes.func.isRequired,
    onLoadMore: PropTypes.func.isRequired,
};

export default React.memo(GcConversationList);
