import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import styles from "./InsuranceDashboard.module.css";

/* An exact value disclosed on pointer hover AND keyboard focus, not by a mouse-only title (prototype ui/dom.js discloseValue,
   v2.5 §1; ACT #80): a page-level tooltip under the value (above it near the bottom edge), hidden on leave, blur and scroll. */
const DiscloseValue = ({ full, label, className, children }) => {
    const ref = useRef(null);
    const tipRef = useRef(null);
    const id = useId();
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState(null);
    const show = useCallback(() => setOpen(true), []);
    const hide = useCallback(() => { setOpen(false); setPos(null); }, []);

    useLayoutEffect(() => {
        if (!open || !ref.current || !tipRef.current) return;
        const r = ref.current.getBoundingClientRect();
        const w = tipRef.current.offsetWidth;
        const h = tipRef.current.offsetHeight;
        setPos({
            left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)),
            top: r.bottom + 4 + h > window.innerHeight - 8 ? r.top - 4 - h : r.bottom + 4,
        });
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        window.addEventListener("scroll", hide, true);
        return () => window.removeEventListener("scroll", hide, true);
    }, [open, hide]);

    return (
        <>
            <span
                ref={ref}
                className={`${className || ""} ${styles.disclose}`}
                title={full}
                tabIndex={0}
                aria-label={label ? `${label}: ${full}` : full}
                aria-describedby={open ? id : undefined}
                onMouseEnter={show}
                onMouseLeave={hide}
                onFocus={show}
                onBlur={hide}
            >
                {children}
            </span>
            {open && createPortal(
                <div ref={tipRef} id={id} role="tooltip" className={styles.tip} style={pos || { visibility: "hidden" }}>{full}</div>,
                document.body,
            )}
        </>
    );
};

DiscloseValue.propTypes = {
    full: PropTypes.string.isRequired,
    label: PropTypes.string,
    className: PropTypes.string,
    children: PropTypes.node,
};

export default DiscloseValue;
