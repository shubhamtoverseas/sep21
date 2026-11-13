import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import GcIcon from "./gcIcons";
import GcEntityCodeLink from "./GcEntityCodeLink";
import translation from "../../../../utils/translation";
import { GC_CHANNEL_META, gcGroupName, gcGroupParts, gcGroupMemberKeys, gcWaWindow } from "./gcHelpers";
import { GC_HEADER_COPY, ROLE_KEY, TRANSLATE_MODES } from "./gcConstants";


/**
 * Thread header (prototype .thread-head): name + sub-line, the conversation's channel pills, then the
 * Original · Translated · Both segment and the search toggle. `scoped` is the chat beside a record: it shows
 * the "Scoped chat" tag, a plain (non-clickable) name, and no segment or search. A record rail that already
 * names the party in its own back row passes `hideIdentity`; `showTranslate` keeps the segment while scoped
 * (Contract_Details chatThreadHTML: Original · Translated · Both above the channel pills).
 */
const GcThreadHeader = ({
    group,
    channels,
    activeChannel,
    onChannelSwitch,
    waSource,
    translateMode,
    onTranslateMode,
    onOpenSummary,
    headerIdentity,
    scoped,
    searchOpen,
    onToggleSearch,
    hideIdentity,
    showTranslate,
}) => {
    const name = gcGroupName(group);
    const roleKey = ROLE_KEY[group?.friendType];
    const groupParts = gcGroupParts(group?.latestRow);
    const memberKeys = gcGroupMemberKeys(group?.latestRow);
    const teamBranch = group?.friendType === "user" ? group?.latestRow?.staff_branch_name : null;
    const nameNode = groupParts ? (
        <>
            { groupParts.employer }
            { groupParts.zh && <span className="gc-zh-inline"> · { groupParts.zh }</span> }
            { groupParts.worker && ` x ${ groupParts.worker }` }
        </>
    ) : name;
    const nameClickable = !scoped && (group?.friendType === "employer" || group?.friendType === "worker"
        || (group?.friendType === "group_team" && Boolean(group?.latestRow?.job_id)));

    /* the WhatsApp pill carries the window state whichever channel is open; it ticks every minute */
    const showsWhatsApp = channels.includes("whatsapp");
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!showsWhatsApp) return undefined;
        const timer = setInterval(() => setTick((n) => n + 1), 60000);
        return () => clearInterval(timer);
    }, [showsWhatsApp]);
    const waWin = showsWhatsApp && waSource ? gcWaWindow(waSource) : null;

    const waChip = () => {
        if (!waWin) return null;
        if (waWin.state === "expired") return <span className="gc-wa-clock off">{ translation("key_window_closed") }</span>;
        if (waWin.state === "unverified") return <span className="gc-wa-clock off">{ translation("key_no_reply_yet") }</span>;
        if (waWin.label) return <span className={ `gc-wa-clock ${ waWin.state === "warn" ? "warn" : "" }` }>{ waWin.label }</span>;
        return null;
    };

    return (
        <div className="gc-thread-head">
            { !hideIdentity && <div className="gc-th-id">
                <div className="gc-th-name-row">
                    { scoped && <span className="gc-scoped-tag">{ GC_HEADER_COPY.scopedChat }</span> }
                    { nameClickable ? (
                        <button
                            type="button"
                            className="gc-participant-name clickable"
                            title={ GC_HEADER_COPY.viewSummary[group.friendType] }
                            onClick={ onOpenSummary }
                        >
                            { nameNode }
                            { headerIdentity?.zh && <span className="gc-zh-inline"> · { headerIdentity.zh }</span> }
                        </button>
                    ) : (
                        <span className="gc-participant-name">{ nameNode }</span>
                    ) }
                </div>
                <div className="gc-th-sub">
                    <span className="gc-sub-id">
                        { headerIdentity?.code && (
                            <>
                                <GcEntityCodeLink
                                    kind={ headerIdentity.kind }
                                    id={ headerIdentity.id }
                                    code={ headerIdentity.code }
                                    titleKey={ headerIdentity.kind === "worker" ? "key_worker_details" : "key_employer_details" }
                                />
                                { " · " }
                            </>
                        ) }
                        { group?.friendType === "partner" && (group?.latestRow?.partner_code || group?.latestRow?.agency_code) && (
                            <>
                                <span className="gc-pcode">{ group.latestRow.partner_code || group.latestRow.agency_code }</span>
                                { " · " }
                            </>
                        ) }
                        { group?.friendType === "group_team" && group?.latestRow?.reference_id && (
                            <>
                                <span className="gc-pcode">{ group.latestRow.reference_id }</span>
                                { " · " }
                            </>
                        ) }
                        { teamBranch && `${ teamBranch } · ` }
                        { memberKeys.length
                            ? memberKeys.map((k) => translation(k)).join(" · ")
                            : (roleKey ? translation(roleKey) : "") }
                    </span>
                </div>
            </div> }
            { scoped && showTranslate && onTranslateMode && (
                <div className="gc-th-actions gc-th-translate">
                    <div className="gc-seg gc-translate-seg" role="group">
                        { TRANSLATE_MODES.map((mode) => (
                            <button key={ mode } type="button" className={ translateMode === mode ? "sel" : "" } aria-pressed={ translateMode === mode } onClick={ () => onTranslateMode(mode) }>
                                { translation(`key_${ mode }`) }
                            </button>
                        )) }
                    </div>
                </div>
            ) }
            { channels.length > 0 && (
                <div className="gc-chan-switch">
                    { channels.map((channelId) => {
                        const meta = GC_CHANNEL_META[channelId];
                        return (
                            <button
                                key={ channelId }
                                type="button"
                                className={ `gc-chan-tab ${ activeChannel === channelId ? "sel" : "" }` }
                                onClick={ () => onChannelSwitch(channelId) }
                            >
                                <GcIcon name={ meta.icon } className={ meta.cls } />
                                { meta.label }
                                { channelId === "whatsapp" && waChip() }
                            </button>
                        );
                    }) }
                </div>
            ) }
            { !scoped && (
                <div className="gc-th-actions">
                    <div className="gc-seg gc-translate-seg">
                        { TRANSLATE_MODES.map((mode) => (
                            <button
                                key={ mode }
                                type="button"
                                className={ translateMode === mode ? "sel" : "" }
                                onClick={ () => onTranslateMode(mode) }
                            >
                                { translation(`key_${ mode }`) }
                            </button>
                        )) }
                    </div>
                    <button
                        type="button"
                        className={ `gc-icon-btn gc-th-search-btn ${ searchOpen ? "on" : "" }` }
                        onClick={ onToggleSearch }
                        title={ GC_HEADER_COPY.searchInConversation }
                        aria-label={ GC_HEADER_COPY.searchInConversation }
                        aria-pressed={ Boolean(searchOpen) }
                    >
                        <GcIcon name="search" />
                    </button>
                </div>
            ) }
        </div>
    );
};

GcThreadHeader.propTypes = {
    group: PropTypes.object,
    channels: PropTypes.array.isRequired,
    activeChannel: PropTypes.string.isRequired,
    onChannelSwitch: PropTypes.func.isRequired,
    waSource: PropTypes.object,
    translateMode: PropTypes.string,
    onTranslateMode: PropTypes.func,
    onOpenSummary: PropTypes.func,
    headerIdentity: PropTypes.object,
    scoped: PropTypes.bool,
    searchOpen: PropTypes.bool,
    onToggleSearch: PropTypes.func,
    hideIdentity: PropTypes.bool,
    showTranslate: PropTypes.bool,
};

export default React.memo(GcThreadHeader);
