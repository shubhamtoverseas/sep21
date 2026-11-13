import React, { useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import Icon from "../../../../../components/Icon/Icon";
import translation from "../../../../../utils/translation";
import WkdStatusChip from "./WkdStatusChip";

const chevDown = (color = '#667080') => (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke={ color } strokeWidth="1.8" aria-hidden="true">
        <path d="M3.5 6 8 10.5 12.5 6" />
    </svg>
);

const editIcon = (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="m11.2 2.6 2.2 2.2L5.6 12.6 2.8 13.2l.6-2.8zM9.6 4.2l2.2 2.2" />
    </svg>
);

const initialsOf = (name) => (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const ownerToneClass = (o, idx) => (o.tone ? `tone-${ o.tone }` : (idx % 2 === 0 ? 'tone-a' : 'tone-b'));

/* popover state: outside click / Escape close it; a keyboard or selection close returns focus to the trigger (P:1595) */
const usePopover = () => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const triggerRef = useRef(null);
    const wasOpen = useRef(false);
    const skipFocusReturn = useRef(false);
    useEffect(() => {
        if (wasOpen.current && !open) {
            if (!skipFocusReturn.current) triggerRef.current?.focus();
            skipFocusReturn.current = false;
        }
        wasOpen.current = open;
    }, [open]);
    useEffect(() => {
        if (!open) return undefined;
        const onOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) { skipFocusReturn.current = true; setOpen(false); }
        };
        const onKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('mousedown', onOutside);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onOutside);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);
    return { open, setOpen, ref, triggerRef };
};

/* arrow-key movement inside a `role=menu` / popover: ArrowDown · ArrowUp · Home · End over the enabled items */
const moveFocusWithin = (container, e, selector) => {
    const items = Array.from(container?.querySelectorAll(selector) || []);
    if (!items.length) return;
    const idx = items.indexOf(document.activeElement);
    let next;
    if (e.key === 'ArrowDown') next = (idx + 1) % items.length;
    else if (e.key === 'ArrowUp') next = (idx - 1 + items.length) % items.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    if (next === undefined) return;
    e.preventDefault();
    items[next].focus();
};

const WorkerIdentityHeader = ({
    name, image, avatarIcon, avatarTitle, code, noCodeLabel, hideCodeCopy, statusLabel, statusTone, statusId,
    typeLabel, nationalityLabel, locationLabel, omitEmptyNationality,
    mobileLabel, mobile, mobile2, whatsapp, email, showContacts = true,
    owners = [], statusActions = [], onPickStatusAction, menuActions = [],
    tabs, activeTab, onSelectTab, onEdit,
    onAvatarClick, editVariant, alwaysShowActions, onOwnersEdit, ownerEmptyLabel, contactTone,
}) => {
    const ownersPop = usePopover();
    const actionsPop = usePopover();
    const ownersPanelRef = useRef(null);
    const menuRef = useRef(null);
    const tabRefs = useRef({});

    /* opening a menu / popover moves focus into it (first enabled item; the owners panel itself when it has no control) */
    useEffect(() => {
        if (!actionsPop.open) return;
        const first = menuRef.current?.querySelector('[role="menuitem"]:not([aria-disabled="true"])');
        first?.focus();
    }, [actionsPop.open]);
    useEffect(() => {
        if (!ownersPop.open) return;
        const first = ownersPanelRef.current?.querySelector('button');
        (first || ownersPanelRef.current)?.focus();
    }, [ownersPop.open]);

    /* tab strip: roving tabindex — only the active tab is in the Tab order; arrows / Home / End move and select (P:1524) */
    const handleTabKeyDown = (e, idx) => {
        const enabled = (i) => !tabs[i]?.disabled;
        let next;
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            const dir = e.key === 'ArrowRight' ? 1 : -1;
            let i = idx;
            for (let step = 0; step < tabs.length; step += 1) {
                i = (i + dir + tabs.length) % tabs.length;
                if (enabled(i)) break;
            }
            next = i;
        } else if (e.key === 'Home') {
            next = tabs.findIndex((t) => !t.disabled);
        } else if (e.key === 'End') {
            for (let i = tabs.length - 1; i >= 0; i -= 1) { if (enabled(i)) { next = i; break; } }
        }
        if (next === undefined || next < 0 || !tabs[next]) return;
        e.preventDefault();
        onSelectTab(tabs[next].eventKey);
        tabRefs.current[tabs[next].eventKey]?.focus();
    };

    const ownerGroups = useMemo(() => {
        const groups = [];
        owners.forEach((o, idx) => {
            const key = o.group || o.role;
            let group = groups.find((g) => g.key === key);
            if (!group) {
                group = { key, label: o.groupLabel || o.role, items: [] };
                groups.push(group);
            }
            group.items.push({ ...o, idx });
        });
        return groups;
    }, [owners]);

    const handleCopy = () => {
        if (!code) return;
        if (navigator.clipboard) navigator.clipboard.writeText(code);
        ShowToast("success", translation('key_copied'));
    };

    const handlePickStatus = (s) => {
        if (s.enable === false) return;
        actionsPop.setOpen(false);
        onPickStatusAction(s);
    };

    return (
        <div className="wkd-header">
            <div className="wkd-id-row">
                { onAvatarClick && image ? (
                    <button type="button" className="wkd-avatar wkd-avatar-btn" title={ avatarTitle } aria-label={ `Open the full-sized approved photo of ${ name || '' }` } onClick={ onAvatarClick }>
                        <img src={ image } alt="" />
                    </button>
                ) : (
                    <div
                        className={ `wkd-avatar${ image ? ' wkd-avatar-photo' : '' }` }
                        title={ avatarTitle }
                        role={ avatarTitle ? 'img' : undefined }
                        aria-label={ avatarTitle }
                    >
                        { avatarIcon
                            ? <Icon name={ avatarIcon } size={ 24 } strokeWidth={ 1.7 } />
                            : image ? <img src={ image } alt="" /> : <Icon name="user" size={ 24 } strokeWidth={ 1.7 } aria-hidden="true" /> }
                    </div>
                ) }
                <div className="wkd-id-main">
                    <div className="wkd-name-row">
                        <span className="wkd-name">{ name || '—' }</span>
                        { statusLabel && <WkdStatusChip label={ statusLabel } tone={ statusTone } statusId={ statusId } /> }
                    </div>
                    <div className="wkd-code-row">
                        { code ? (
                            <>
                                <span className="wkd-code">{ code }</span>
                                { !hideCodeCopy && (
                                    <button type="button" className="wkd-copy" onClick={ handleCopy }>{ translation('key_copy') }</button>
                                ) }
                            </>
                        ) : (
                            <span className="wkd-code-muted">{ noCodeLabel || translation('key_not_issued') }</span>
                        ) }
                    </div>
                </div>
                <div className="wkd-id-actions">
                    { owners.length > 0 && (
                        <div className={ `wkd-owners${ ownersPop.open ? ' open' : '' }` } ref={ ownersPop.ref }>
                            <button
                                ref={ ownersPop.triggerRef }
                                type="button"
                                className="wkd-owners-trigger"
                                aria-haspopup="dialog"
                                aria-expanded={ ownersPop.open }
                                onClick={ () => ownersPop.setOpen((v) => !v) }
                            >
                                <span className="wkd-owner-avs">
                                    { owners.map((o, idx) => (
                                        <span key={ o.role } className={ `wkd-owner-av ${ ownerToneClass(o, idx) }` }>
                                            { initialsOf(o.name) }
                                        </span>
                                    )) }
                                </span>
                                <span className="wkd-owners-lbl">{ translation('key_owners') }</span>
                                <span className="wkd-owners-count">{ owners.length }</span>
                                { chevDown('#676e77') }
                            </button>
                            { ownersPop.open && (
                                <div ref={ ownersPanelRef } className="wkd-owners-pop" role="dialog" aria-label={ translation('key_owners') } tabIndex={ -1 }>
                                    <div className="wkd-owners-pop-head">
                                        <span>{ translation('key_owners') }</span>
                                        { onOwnersEdit && (
                                            <button type="button" className="wkd-owners-edit" onClick={ () => { ownersPop.setOpen(false); onOwnersEdit(); } }>{ translation('key_edit') }</button>
                                        ) }
                                    </div>
                                    { ownerGroups.map((g) => (
                                        <div key={ g.key } className="wkd-owner-section">
                                            <div className="wkd-owner-role">{ String(g.label || '').toUpperCase() }</div>
                                            { g.items.map((o) => (
                                                <div key={ o.role } className="wkd-owner-person">
                                                    <span className={ `wkd-owner-av ${ ownerToneClass(o, o.idx) }` }>{ initialsOf(o.name) }</span>
                                                    <span>
                                                        <span className={ `wkd-owner-nm${ o.name ? '' : ' muted' }` }>{ o.name || ownerEmptyLabel || '—' }</span>
                                                        { o.sub && <span className="wkd-owner-sub">{ o.sub }</span> }
                                                    </span>
                                                </div>
                                            )) }
                                        </div>
                                    )) }
                                </div>
                            ) }
                        </div>
                    ) }
                    { onEdit && (
                        <button type="button" className={ editVariant === 'secondary' ? 'wkd-btn-outline wkd-btn-edit' : 'wkd-btn-primary' } onClick={ onEdit }>{ editIcon }{ translation('key_edit') }</button>
                    ) }
                    { (alwaysShowActions || statusActions.length > 0 || menuActions.length > 0) && (
                        <div className="wkd-actions-wrap" ref={ actionsPop.ref }>
                            <button
                                ref={ actionsPop.triggerRef }
                                type="button"
                                className="wkd-btn-outline"
                                aria-haspopup="menu"
                                aria-expanded={ actionsPop.open }
                                onClick={ () => actionsPop.setOpen((v) => !v) }
                            >
                                { translation('key_actions') }{ chevDown('#667080') }
                            </button>
                            { actionsPop.open && (
                                <div ref={ menuRef } className="wkd-actions-pop" role="menu" aria-label={ translation('key_actions') } onKeyDown={ (e) => moveFocusWithin(menuRef.current, e, '[role="menuitem"]') }>
                                    { statusActions.length === 0 && menuActions.length === 0 && (
                                        <div className="wkd-pop-empty">{ translation('key_jo_applicant_no_actions') }</div>
                                    ) }
                                    { menuActions.map((m) => (
                                        <button
                                            key={ m.id }
                                            type="button"
                                            role="menuitem"
                                            onClick={ () => { actionsPop.setOpen(false); m.onClick(); } }
                                        >
                                            { m.label }
                                        </button>
                                    )) }
                                    { statusActions.map((s) => (
                                        <button
                                            key={ `${ s.id }-${ s.name }` }
                                            type="button"
                                            role="menuitem"
                                            aria-disabled={ s.enable === false }
                                            onClick={ () => handlePickStatus(s) }
                                        >
                                            { s.name }
                                        </button>
                                    )) }
                                </div>
                            ) }
                        </div>
                    ) }
                </div>
            </div>

            <div className="wkd-meta-strip">
                <span>{ typeLabel || '—' }</span>
                { !(omitEmptyNationality && !nationalityLabel) && (
                    <>
                        <span className="sep">·</span>
                        <span>{ nationalityLabel || '—' }</span>
                    </>
                ) }
                { locationLabel && (
                    <>
                        <span className="sep">·</span>
                        <span>{ locationLabel }</span>
                    </>
                ) }
                <span className="grow" />
                { showContacts && (
                    <>
                        <span className="wkd-contact">
                            <span className="k">{ mobileLabel || translation('key_mobile') }</span>
                            <span className={ `v${ mobile ? '' : ' muted' }` }>{ mobile || '—' }</span>
                        </span>
                        { mobile2 && (
                            <span className="wkd-contact">
                                <span className="k">{ translation('key_mobile_2') }</span>
                                <span className="v">{ mobile2 }</span>
                            </span>
                        ) }
                        <span className="wkd-contact">
                            <span className="k">{ translation('key_whatsapp') }</span>
                            <span className={ `v${ whatsapp ? (contactTone === 'link' ? ' link' : '') : ' muted' }` }>{ whatsapp || '—' }</span>
                        </span>
                        <span className="wkd-contact">
                            <span className="k">{ translation('key_email') }</span>
                            <span className={ `v${ email ? (contactTone === 'link' ? ' link' : '') : ' muted' }` }>{ email || '—' }</span>
                        </span>
                    </>
                ) }
            </div>

            <div className="wkd-tabbar" role="tablist">
                { tabs.map((tab, idx) => (
                    <button
                        key={ tab.eventKey }
                        ref={ (el) => { tabRefs.current[tab.eventKey] = el; } }
                        type="button"
                        role="tab"
                        aria-selected={ activeTab === tab.eventKey }
                        tabIndex={ activeTab === tab.eventKey ? 0 : -1 }
                        disabled={ tab.disabled }
                        className={ `wkd-tab${ activeTab === tab.eventKey ? ' on' : '' }` }
                        onClick={ () => onSelectTab(tab.eventKey) }
                        onKeyDown={ (e) => handleTabKeyDown(e, idx) }
                    >
                        { tab.title }
                    </button>
                )) }
            </div>
        </div>
    );
};

WorkerIdentityHeader.propTypes = {
    name: PropTypes.string,
    image: PropTypes.string,
    avatarIcon: PropTypes.string,
    avatarTitle: PropTypes.string,
    code: PropTypes.string,
    noCodeLabel: PropTypes.string,
    hideCodeCopy: PropTypes.bool,
    statusLabel: PropTypes.string,
    statusTone: PropTypes.string,
    /* worker Profile Status id — tone + hollow treatment resolve from the one registry */
    statusId: PropTypes.number,
    typeLabel: PropTypes.string,
    nationalityLabel: PropTypes.string,
    omitEmptyNationality: PropTypes.bool,
    locationLabel: PropTypes.string,
    mobileLabel: PropTypes.string,
    mobile: PropTypes.string,
    /* a second number (the employer's alternate mobile — U-0045) on its own row */
    mobile2: PropTypes.string,
    whatsapp: PropTypes.string,
    email: PropTypes.string,
    showContacts: PropTypes.bool,
    owners: PropTypes.array,
    statusActions: PropTypes.array,
    onPickStatusAction: PropTypes.func,
    menuActions: PropTypes.array,
    tabs: PropTypes.array.isRequired,
    activeTab: PropTypes.string.isRequired,
    onSelectTab: PropTypes.func.isRequired,
    onEdit: PropTypes.func,
    onAvatarClick: PropTypes.func,
    editVariant: PropTypes.oneOf(['primary', 'secondary']),
    alwaysShowActions: PropTypes.bool,
    onOwnersEdit: PropTypes.func,
    ownerEmptyLabel: PropTypes.string,
    contactTone: PropTypes.oneOf(['default', 'link']),
};

export default React.memo(WorkerIdentityHeader);
