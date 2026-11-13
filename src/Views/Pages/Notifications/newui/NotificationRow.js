import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../utils/translation";
import { NOTIFICATION_COPY } from "../notificationConstants";
import { categoryOf, isReadOnly, isUnread, linkLabelOf, relativeTime, stampOf } from "./notificationModel";

/*
 * One notification (prototype rowHTML / full-view row): unread dot · category tag · text (600 while unread) · link
 * label in mono (blue only when the destination opens) · relative time (full HKT stamp on hover) · read toggle.
 * `compact` is the bell panel layout. The toggle marks read / unread (hrms mark-read · mark-as-unread, 14 Oct).
 */
const NotificationRow = ({ item, available, highlighted, compact, onOpen, onMarkRead, onMarkUnread }) => {
    const unread = isUnread(item);
    const category = categoryOf(item);
    const label = linkLabelOf(item);
    const readOnly = isReadOnly(item);   /* L-3: a delivered legacy follow-up — kept, never edited */
    const rel = relativeTime(item?.created_at);
    const stamp = stampOf(item?.created_at);
    return (
        <div className={ `nf-row${ compact ? ' compact' : '' }${ highlighted ? ' hl' : '' }${ unread ? '' : ' is-read' }` } data-nf-row={ item?.id } data-nf-read={ unread ? '0' : '1' }>
            <span className="nf-dot" aria-label={ unread ? translation('key_unread') : NOTIFICATION_COPY.read } />
            { /* an unregistered `type` (e.g. a legacy row of a switched-off family, U-0184) has no category: the tag cell stays so the text, time and toggle keep their columns */ }
            { !compact && (category
                ? <span className={ `nf-cat-tag nf-cat-${ category.id }` }>{ category.label }</span>
                : <span className="nf-cat-empty" aria-hidden="true" data-nf-no-category="" />) }
            <div className="nf-main">
                { compact && (
                    <div className="nf-compact-meta">
                        { category && <span className={ `nf-cat-text nf-cat-${ category.id }` }>{ category.label }</span> }
                        <span className="nf-rel" title={ stamp }>{ rel }</span>
                    </div>
                ) }
                <button type="button" className="nf-text" onClick={ () => onOpen(item) }>{ item?.message || '' }</button>
                { label && <button type="button" className={ `nf-link mono${ available ? ' on' : '' }` } onClick={ () => onOpen(item) }>{ label }</button> }
                { readOnly && <span className="nf-ro" data-nf-read-only="">{ NOTIFICATION_COPY.readOnly }</span> }
            </div>
            { !compact && <span className="nf-rel" title={ stamp }>{ rel }</span> }
            { unread
                ? <button type="button" className="nf-toggle" onClick={ () => onMarkRead(item) }>{ compact ? '●' : NOTIFICATION_COPY.markRead }</button>
                : <button type="button" className="nf-toggle" title={ NOTIFICATION_COPY.markUnread } onClick={ () => onMarkUnread?.(item) }>{ compact ? '○' : NOTIFICATION_COPY.markUnread }</button> }
        </div>
    );
};

NotificationRow.propTypes = {
    item: PropTypes.object.isRequired,
    available: PropTypes.bool,
    highlighted: PropTypes.bool,
    compact: PropTypes.bool,
    onOpen: PropTypes.func.isRequired,
    onMarkRead: PropTypes.func.isRequired,
    onMarkUnread: PropTypes.func,
};

export default React.memo(NotificationRow);
