import React, { useCallback, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import Icon from "../Icon/Icon";
import useDialogFocus from "../../hooks/useDialogFocus";
import styles from "./Modal.module.css";

/**
 * New-UI modal shell (scrim · card · head · body · foot).
 * Esc and scrim click close; body scroll is locked while open; focus moves into the dialog.
 * `busy` (a submit in flight): no close path works and every control in the body and foot is disabled.
 */
const Modal = ({ title, subtitle, width = 640, onClose, footer, children, className = "", closeLabel = "Close", busy = false }) => {
    const cardRef = useRef(null);
    const busyRef = useRef(busy);
    busyRef.current = busy;
    const requestClose = useCallback(() => { if (!busyRef.current) onClose(); }, [onClose]);
    useDialogFocus(cardRef, requestClose);

    useEffect(() => {
        const { overflow } = document.body.style;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = overflow; };
    }, []);

    const handleScrim = useCallback((event) => {
        if (event.target === event.currentTarget) requestClose();
    }, [requestClose]);

    return (
        <div className={styles.scrim} onClick={handleScrim} role="presentation">
            <div
                ref={cardRef}
                className={`${styles.card} ${className}`}
                style={{ maxWidth: width }}
                role="dialog"
                aria-modal="true"
                aria-busy={busy || undefined}
                aria-label={typeof title === "string" ? title : undefined}
            >
                <div className={styles.head}>
                    <div className={styles.headText}>
                        <div className={styles.title}>{title}</div>
                        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
                    </div>
                    <button type="button" className={styles.close} onClick={requestClose} disabled={busy} aria-label={closeLabel}>
                        <Icon name="x" size={14} strokeWidth={1.8} />
                    </button>
                </div>
                <fieldset className={styles.lock} disabled={busy}>
                    <div className={styles.body}>{children}</div>
                    {footer && <div className={styles.foot}>{footer}</div>}
                </fieldset>
            </div>
        </div>
    );
};

Modal.propTypes = {
    title: PropTypes.node.isRequired,
    subtitle: PropTypes.node,
    width: PropTypes.number,
    onClose: PropTypes.func.isRequired,
    footer: PropTypes.node,
    children: PropTypes.node,
    className: PropTypes.string,
    closeLabel: PropTypes.string,
    busy: PropTypes.bool,
    /* focus is always trapped by useDialogFocus; accepted so existing callers need no change */
    trapFocus: PropTypes.bool,
};

export default React.memo(Modal);
