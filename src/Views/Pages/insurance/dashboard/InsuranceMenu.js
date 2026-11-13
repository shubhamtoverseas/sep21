import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import useOutsideClick from "../../../../hooks/useOutsideClick";
import styles from "./InsuranceDashboard.module.css";

/* Menu popover (INDEX §5A dom:62-97): Escape closes, ArrowUp/Down cycle, Tab past either end closes,
   outside mousedown closes, focus goes to the first item and returns to the trigger. */
const InsuranceMenu = ({ id, label, trigger, active, align = "left", children }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const btnRef = useRef(null);
    const menuRef = useRef(null);

    const close = useCallback((refocus = true) => {
        setOpen(false);
        if (refocus) btnRef.current?.focus();
    }, []);
    const closeOutside = useCallback(() => setOpen(false), []);
    useOutsideClick(wrapRef, closeOutside, open);

    const items = () => Array.from(menuRef.current?.querySelectorAll('[role^="menuitem"]') || []);

    useEffect(() => {
        if (open) items()[0]?.focus();
    }, [open]);

    const onMenuKey = useCallback((event) => {
        const list = items();
        const index = list.indexOf(document.activeElement);
        if (event.key === "Escape") { event.preventDefault(); close(); return; }
        if (event.key === "ArrowDown") { event.preventDefault(); list[(index + 1) % list.length]?.focus(); return; }
        if (event.key === "ArrowUp") { event.preventDefault(); list[(index - 1 + list.length) % list.length]?.focus(); return; }
        if (event.key === "Tab" && ((event.shiftKey && index === 0) || (!event.shiftKey && index === list.length - 1))) close(false);
    }, [close]);

    return (
        <div ref={wrapRef} className={styles.menuWrap}>
            <button
                ref={btnRef}
                type="button"
                id={id}
                className={`${styles.menuBtn} ${active ? styles.menuBtnOn : ""}`}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
            >
                {trigger}
                <Icon name="chev_down" size={11} />
            </button>
            {open && (
                <div
                    ref={menuRef}
                    className={`${styles.menu} ${align === "right" ? styles.menuRight : styles.menuLeft}`}
                    role="menu"
                    aria-labelledby={id}
                    onKeyDown={onMenuKey}
                >
                    {label && <div className={styles.menuLabel}>{label}</div>}
                    {typeof children === "function" ? children(close) : children}
                </div>
            )}
        </div>
    );
};

InsuranceMenu.propTypes = {
    id: PropTypes.string.isRequired,
    label: PropTypes.string,
    trigger: PropTypes.node.isRequired,
    active: PropTypes.bool,
    align: PropTypes.oneOf(["left", "right"]),
    children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
};

/* A checkable menu item; disabled items stay focusable and announce aria-disabled. `sub` is a second line under the label
   (a disabled entry's reason, Insurance.html menuItem `why`); `trailing` sits at the right end of the row. */
export const MenuItem = ({ role = "menuitem", checked, disabled, radio, danger, onSelect, onRefused, trailing, sub, children }) => (
    <button
        type="button"
        role={role}
        aria-checked={role === "menuitem" ? undefined : Boolean(checked)}
        aria-disabled={disabled || undefined}
        className={styles.menuItem}
        onClick={() => { if (disabled) onRefused?.(); else onSelect?.(); }}
        data-danger={danger || undefined}
    >
        {role !== "menuitem" && (
            <span className={`${styles.menuCheck} ${radio ? styles.menuRadio : ""} ${checked ? styles.menuCheckOn : ""}`} aria-hidden="true">
                {checked && <Icon name="check" size={10} strokeWidth={2.6} />}
            </span>
        )}
        {sub ? (
            <span className={styles.menuItemBody}>
                <span>{children}</span>
                <span className={styles.menuSub} data-menu-sub="">{sub}</span>
            </span>
        ) : <span>{children}</span>}
        {trailing}
    </button>
);

MenuItem.propTypes = {
    role: PropTypes.oneOf(["menuitem", "menuitemcheckbox", "menuitemradio"]),
    checked: PropTypes.bool,
    disabled: PropTypes.bool,
    radio: PropTypes.bool,
    danger: PropTypes.bool,
    onSelect: PropTypes.func,
    onRefused: PropTypes.func,
    trailing: PropTypes.node,
    sub: PropTypes.node,
    children: PropTypes.node,
};

export default InsuranceMenu;
