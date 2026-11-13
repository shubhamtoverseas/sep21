import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import Btn from "../../../../../components/ui/Btn";
import useOutsideClick from "../../../../../hooks/useOutsideClick";
import translation from "../../../../../utils/translation";

/* the WAI-ARIA menu model shared with the row Action menu: first item focused on open, Arrow / Home / End move,
   Escape closes and returns focus to the trigger; a transition the record does not allow stays listed but inert */
const JoStatusMenu = ({ items, onPick }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapRef = useRef(null);
    const popRef = useRef(null);
    /* the kit Btn does not forward refs: the trigger is found through the wrap */
    const focusTrigger = useCallback(() => wrapRef.current?.querySelector('[aria-haspopup="menu"]')?.focus(), []);
    useOutsideClick(wrapRef, () => setIsOpen(false), isOpen);
    useEffect(() => { if (isOpen) popRef.current?.querySelector('[role="menuitem"]:not([disabled])')?.focus(); }, [isOpen]);

    const onKeyDown = useCallback((event) => {
        const focusables = Array.from(popRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') || []);
        const index = focusables.indexOf(document.activeElement);
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setIsOpen(false); focusTrigger(); return; }
        if (event.key === 'Tab') { setIsOpen(false); return; }
        if (!focusables.length) return;
        if (event.key === 'ArrowDown') { event.preventDefault(); focusables[(index + 1) % focusables.length].focus(); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); focusables[(index - 1 + focusables.length) % focusables.length].focus(); }
        else if (event.key === 'Home') { event.preventDefault(); focusables[0].focus(); }
        else if (event.key === 'End') { event.preventDefault(); focusables[focusables.length - 1].focus(); }
    }, [focusTrigger]);

    if (!Array.isArray(items) || items.length === 0) return null;

    return (
        <div className="jor-statusmenu" ref={ wrapRef }>
            <Btn variant="secondary" aria-haspopup="menu" aria-expanded={ isOpen } aria-controls="jor-statusmenu" onClick={ () => setIsOpen((open) => !open) }>
                { translation('key_change_jo_status') } <Icon name={ isOpen ? 'chev_up' : 'chev_down' } size={ 12 } />
            </Btn>
            { isOpen && (
                <div ref={ popRef } id="jor-statusmenu" className="jor-statusmenu-pop" role="menu" aria-label={ translation('key_change_jo_status') } onKeyDown={ onKeyDown }>
                    { items.map((item) => (
                        <button
                            key={ item.id }
                            type="button"
                            role="menuitem"
                            tabIndex={ -1 }
                            disabled={ item.enable === false }
                            title={ item.enable === false ? (item.reason || item.message || translation('key_jo_status_not_allowed')) : undefined }
                            className={ item.enable === false ? 'is-disabled' : '' }
                            onClick={ () => { setIsOpen(false); focusTrigger(); onPick(item); } }
                        >
                            { item.name }
                        </button>
                    )) }
                </div>
            ) }
        </div>
    );
};

JoStatusMenu.propTypes = {
    items: PropTypes.array,
    onPick: PropTypes.func.isRequired,
};

export default React.memo(JoStatusMenu);
