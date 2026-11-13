import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import translation from "../../../../../utils/translation";
import { JO_ACTION_MENU_WIDTH, JO_APPLICANT_COPY } from "../../jobOfferConstants";

const MENU_GAP = 6;
const EDGE = 8;

const JoActionMenu = ({ items, trigger, label, onPick, onClose, focusLast = false }) => {
    const menuRef = useRef(null);
    const [pos, setPos] = useState(null);

    useLayoutEffect(() => {
        if (!trigger || !menuRef.current) return;
        const r = trigger.getBoundingClientRect();
        const left = Math.max(EDGE, Math.min(window.innerWidth - JO_ACTION_MENU_WIDTH - EDGE, r.right - JO_ACTION_MENU_WIDTH));
        const height = menuRef.current.offsetHeight;
        let top = r.bottom + MENU_GAP;
        if (top + height > window.innerHeight - EDGE) top = Math.max(EDGE, r.top - height - MENU_GAP);
        setPos({ left, top });
    }, [trigger, items]);

    useEffect(() => {
        const focusables = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') || []);
        const target = focusLast ? focusables[focusables.length - 1] : focusables[0];
        if (target) target.focus(); else menuRef.current?.focus();
    }, [focusLast]);

    useEffect(() => {
        const onDoc = (event) => {
            if (menuRef.current?.contains(event.target) || trigger?.contains(event.target)) return;
            onClose(false);
        };
        const onScroll = (event) => { if (event.target !== document && event.target?.contains?.(trigger)) onClose(false); };
        const onResize = () => onClose(false);
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        return () => {
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
        };
    }, [trigger, onClose]);

    const onKeyDown = useCallback((event) => {
        const focusables = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]:not([disabled])') || []);
        const index = focusables.indexOf(document.activeElement);
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onClose(true); return; }
        if (event.key === 'Tab') { onClose(false); return; }
        if (!focusables.length) return;
        if (event.key === 'ArrowDown') { event.preventDefault(); focusables[(index + 1) % focusables.length].focus(); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); focusables[(index - 1 + focusables.length) % focusables.length].focus(); }
        else if (event.key === 'Home') { event.preventDefault(); focusables[0].focus(); }
        else if (event.key === 'End') { event.preventDefault(); focusables[focusables.length - 1].focus(); }
    }, [onClose]);

    return createPortal(
        <div
            ref={ menuRef }
            id="jor-menu"
            className="jor-menu"
            role="menu"
            aria-label={ `${ JO_APPLICANT_COPY.actionsFor } ${ label }` }
            tabIndex={ -1 }
            data-ready={ pos ? 'true' : 'false' }
            style={ pos ? { left: pos.left, top: pos.top } : undefined }
            onKeyDown={ onKeyDown }
        >
            { items.length === 0 && <div className="none">{ JO_APPLICANT_COPY.noActions }</div> }
            { items.map((entry) => (
                <button
                    key={ entry.id }
                    type="button"
                    role="menuitem"
                    tabIndex={ -1 }
                    className={ entry.danger ? 'danger' : undefined }
                    onClick={ () => onPick(entry.id) }
                >
                    { translation(entry.labelKey) }
                </button>
            )) }
        </div>,
        document.body
    );
};

JoActionMenu.propTypes = {
    items: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string, labelKey: PropTypes.string, danger: PropTypes.bool })).isRequired,
    trigger: PropTypes.instanceOf(Element),
    label: PropTypes.string,
    onPick: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    focusLast: PropTypes.bool,
};

export default JoActionMenu;
