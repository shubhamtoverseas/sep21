import React, { useCallback, useEffect, useRef } from "react";
import PropTypes from "prop-types";

const ITEM_SELECTOR = 'button:not([aria-disabled="true"]):not(:disabled)';
const GAP = 5;
const EDGE = 8;

/**
 * The dashboard's floating menu layer (prototype #cd-pop): one menu at a time, placed under its trigger in a
 * fixed layer so a scrolling table never clips it. Outside pointer-down, scroll, resize and Escape close it;
 * Escape (and a close requested with `restoreFocus`) returns focus to the trigger. Arrow keys walk the items.
 */
const PopMenu = ({ anchor, onClose, className = "", role = "menu", ariaLabel, children }) => {
    const menuRef = useRef(null);

    const close = useCallback((restoreFocus) => {
        onClose();
        if (restoreFocus && anchor && typeof anchor.focus === "function") anchor.focus();
    }, [onClose, anchor]);

    useEffect(() => {
        const el = menuRef.current;
        if (!el || !anchor) return;
        const rect = anchor.getBoundingClientRect();
        const width = el.offsetWidth;
        const height = el.offsetHeight;
        const viewportW = document.documentElement.clientWidth;
        const viewportH = document.documentElement.clientHeight;
        let left = rect.left;
        if (left + width > viewportW - EDGE) left = Math.max(EDGE, viewportW - width - EDGE);
        let top = rect.bottom + GAP;
        if (top + height > viewportH - EDGE && rect.top - height - GAP > EDGE) top = rect.top - height - GAP;
        el.style.left = `${ Math.round(left) }px`;
        el.style.top = `${ Math.round(top) }px`;
        el.querySelector(ITEM_SELECTOR)?.focus();
    }, [anchor]);

    useEffect(() => {
        const onPointer = (event) => {
            const target = event.target;
            if (menuRef.current?.contains(target) || (anchor && anchor.contains(target))) return;
            close(false);
        };
        const onKey = (event) => { if (event.key === "Escape") { event.preventDefault(); close(true); } };
        const onScroll = (event) => { if (!menuRef.current?.contains(event.target)) close(false); };
        document.addEventListener("mousedown", onPointer);
        document.addEventListener("keydown", onKey);
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", close);
        return () => {
            document.removeEventListener("mousedown", onPointer);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", close);
        };
    }, [close, anchor]);

    const onMenuKey = useCallback((event) => {
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
        const items = Array.from(menuRef.current?.querySelectorAll(ITEM_SELECTOR) || []);
        if (!items.length) return;
        event.preventDefault();
        const index = items.indexOf(document.activeElement);
        let next = 0;
        if (event.key === "ArrowDown") next = (index + 1) % items.length;
        else if (event.key === "ArrowUp") next = (index - 1 + items.length) % items.length;
        else if (event.key === "End") next = items.length - 1;
        items[next].focus();
    }, []);

    if (!anchor) return null;
    return (
        <div className="mcd-pop">
            <div ref={ menuRef } className={ `fmenu ${ className }` } role={ role } aria-label={ ariaLabel } onKeyDown={ onMenuKey }>
                { children }
            </div>
        </div>
    );
};

PopMenu.propTypes = {
    anchor: PropTypes.instanceOf(Element),
    onClose: PropTypes.func.isRequired,
    className: PropTypes.string,
    role: PropTypes.string,
    ariaLabel: PropTypes.string,
    children: PropTypes.node,
};

export default PopMenu;
