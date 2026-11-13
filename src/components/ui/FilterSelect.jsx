import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import Icon from "../Icon/Icon";
import useOutsideClick from "../../hooks/useOutsideClick";
import translation from "../../utils/translation";
import styles from "./FilterSelect.module.css";

const ALL_VALUE = "";

/**
 * Filter trigger ("Label · Value") with a listbox menu.
 * Matches the MaidMatch filter-bar control contract: 36px, radius 8, #dfe4ea border.
 * Single-select by default; `multiple` turns it into a checkbox list (value = array,
 * the "All" option — value "" — clears the selection and the menu stays open on toggle).
 */
const FilterSelect = ({ id, label, value, options, onChange, menuWidth = 180, className = "", multiple = false }) => {
    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const wrapRef = useRef(null);
    const menuRef = useRef(null);

    const close = useCallback(() => setOpen(false), []);
    useOutsideClick(wrapRef, close, open);


    useEffect(() => {
        if (!open) return undefined;
        const onScroll = (event) => {
            if (menuRef.current && menuRef.current.contains(event.target)) return;
            close();
        };
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", close);
        return () => {
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", close);
        };
    }, [open, close]);

    const selectedValues = useMemo(() => (
        multiple ? (Array.isArray(value) ? value.map(String) : []) : []
    ), [multiple, value]);

    const isOptionSelected = useCallback((option) => (
        multiple
            ? (String(option.value) === ALL_VALUE ? selectedValues.length === 0 : selectedValues.includes(String(option.value)))
            : String(option.value) === String(value)
    ), [multiple, selectedValues, value]);

    const triggerText = useMemo(() => {
        if (!multiple) {
            const selected = options.find((option) => String(option.value) === String(value)) || options[0];
            return selected?.label;
        }
        if (selectedValues.length === 0) return translation("key_all");
        /* a selection never reads "All": an applied id the options no longer carry shows as a count, so it can be cleared */
        if (selectedValues.length === 1) {
            const match = options.find((option) => String(option.value) === selectedValues[0]);
            if (match) return match.label;
        }
        /* every dashboard prototype writes "N selected" in lowercase */
        return `${ selectedValues.length } ${ translation("key_selected").toLowerCase() }`;
    }, [multiple, options, value, selectedValues]);

    useEffect(() => {
        if (!open) return;
        const index = options.findIndex((option) => isOptionSelected(option));
        setActiveIndex(index < 0 ? 0 : index);
    }, [open, options, isOptionSelected]);

    useEffect(() => {
        if (!open || activeIndex < 0) return;
        menuRef.current?.children?.[activeIndex]?.focus();
    }, [open, activeIndex]);

    const select = useCallback((option) => {
        if (!multiple) {
            onChange(option.value);
            setOpen(false);
            return;
        }
        if (String(option.value) === ALL_VALUE) {
            onChange([]);
            return;
        }
        const key = String(option.value);
        onChange(selectedValues.includes(key)
            ? selectedValues.filter((item) => item !== key)
            : [...selectedValues, key]);
    }, [multiple, onChange, selectedValues]);

    const handleTriggerKey = useCallback((event) => {
        if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen(true);
        }
    }, []);

    const handleMenuKey = useCallback((event) => {
        if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
        if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((i) => Math.min(i + 1, options.length - 1)); return; }
        if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); return; }
        if (event.key === "Home") { event.preventDefault(); setActiveIndex(0); return; }
        if (event.key === "End") { event.preventDefault(); setActiveIndex(options.length - 1); }
    }, [options.length]);

    const menuId = `${id}-listbox`;

    return (
        <div ref={wrapRef} className={`${styles.wrap} ${className}`}>
            <button
                type="button"
                id={id}
                className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={menuId}
                onClick={() => setOpen((o) => !o)}
                onKeyDown={handleTriggerKey}
            >
                <span className={styles.triggerText}>
                    {label} · {triggerText}
                </span>
                <Icon name="chev_down" size={12} strokeWidth={1.8} className={styles.chevron} />
            </button>
            {open && (
                <div
                    ref={menuRef}
                    id={menuId}
                    className={styles.menu}
                    role="listbox"
                    aria-labelledby={id}
                    aria-multiselectable={multiple || undefined}
                    style={{ minWidth: menuWidth }}
                    onKeyDown={handleMenuKey}
                >
                    {options.map((option, index) => {
                        const isSelected = isOptionSelected(option);
                        return (
                            <button
                                key={String(option.value)}
                                type="button"
                                role="option"
                                tabIndex={index === activeIndex ? 0 : -1}
                                aria-selected={isSelected}
                                className={`${styles.option} ${isSelected ? styles.optionSelected : ""}`}
                                onClick={() => select(option)}
                            >
                                {multiple && (
                                    <span className={`${styles.check} ${isSelected ? styles.checkOn : ""}`} aria-hidden="true">
                                        {isSelected && <Icon name="check" size={10} strokeWidth={2.6} />}
                                    </span>
                                )}
                                <span className={styles.optionText}>
                                    {option.menuLabel || option.label}
                                    {option.adornment && <span className={styles.optionAdornment}>{option.adornment}</span>}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

FilterSelect.propTypes = {
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.array]),
    options: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        label: PropTypes.string.isRequired,
        /* menu only, the trigger always shows `label`: `menuLabel` replaces the label in the option (e.g. a coloured tag
           carrying the same words), `adornment` follows it (e.g. the shared inactive-staff cue) */
        menuLabel: PropTypes.node,
        adornment: PropTypes.node,
    })).isRequired,
    onChange: PropTypes.func.isRequired,
    menuWidth: PropTypes.number,
    className: PropTypes.string,
    multiple: PropTypes.bool,
};

export default React.memo(FilterSelect);
