import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import Icon from "../Icon/Icon";
import translation from "../../utils/translation";
import styles from "./StaffAccountCue.module.css";

/* Shared inactive-staff cue (Insurance_UI_Correction_20261106 C3; Insurance.html MC.staffStatus).
   Shown only where CURRENT responsibility is displayed (an owner, an owner filter option), never on historical authors.
   Only an account explicitly known to be inactive (active === false) gets it; true is active, anything else is unknown and
   shows nothing. The name keeps its normal treatment; the small symbol sits beside the avatar and explains itself
   ("Inactive staff account") on hover and on keyboard focus, with an accessible text equivalent.
   standalone: its own focus stop (role="img"). embedded: inside a host control (a filter option); the symbol is hidden from
   assistive technology, the host's name carries ", Inactive staff account", and the host's hover / focus shows the tooltip. */
export const staffAccountState = (active) => (active === false ? "inactive" : active === true ? "active" : "unknown");

const HOST = 'button, a, [role="option"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]';

const StaffAccountCue = ({ active, embedded = false }) => {
    const ref = useRef(null);
    const tipRef = useRef(null);
    const id = useId();
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState(null);
    const inactive = staffAccountState(active) === "inactive";
    const show = useCallback(() => setOpen(true), []);
    const hide = useCallback(() => { setOpen(false); setPos(null); }, []);

    useEffect(() => {
        if (!inactive || !embedded || !ref.current) return undefined;
        const host = ref.current.closest(HOST);
        if (!host) return undefined;
        host.addEventListener("mouseenter", show);
        host.addEventListener("mouseleave", hide);
        host.addEventListener("focus", show);
        host.addEventListener("blur", hide);
        return () => {
            host.removeEventListener("mouseenter", show);
            host.removeEventListener("mouseleave", hide);
            host.removeEventListener("focus", show);
            host.removeEventListener("blur", hide);
        };
    }, [inactive, embedded, show, hide]);

    /* under the symbol, centred and kept inside the viewport; above it near the bottom edge */
    useLayoutEffect(() => {
        if (!open || !ref.current || !tipRef.current) return;
        const r = ref.current.getBoundingClientRect();
        const w = tipRef.current.offsetWidth;
        const h = tipRef.current.offsetHeight;
        const top = r.bottom + 6 + h > window.innerHeight - 8 ? Math.max(8, r.top - 6 - h) : r.bottom + 6;
        setPos({ left: Math.max(8, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8)), top });
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        window.addEventListener("scroll", hide, true);
        return () => window.removeEventListener("scroll", hide, true);
    }, [open, hide]);

    if (!inactive) return null;
    const label = translation("key_staff_inactive_account");
    const tip = open && createPortal(
        <div ref={ tipRef } id={ id } role="tooltip" className={ styles.tip } style={ pos || { visibility: "hidden" } }>{ label }</div>,
        document.body,
    );
    if (embedded) {
        return (
            <>
                <span ref={ ref } className={ styles.cue } data-staff-inactive="embedded" aria-hidden="true">
                    <Icon name="user_off" size={ 10 } strokeWidth={ 2.2 } />
                </span>
                <span className={ styles.sr }>{ `, ${ label }` }</span>
                { tip }
            </>
        );
    }
    return (
        <>
            <span
                ref={ ref }
                className={ styles.cue }
                data-staff-inactive="standalone"
                role="img"
                tabIndex={ 0 }
                aria-label={ label }
                aria-describedby={ open ? id : undefined }
                onMouseEnter={ show }
                onMouseLeave={ hide }
                onFocus={ show }
                onBlur={ hide }
            >
                <Icon name="user_off" size={ 10 } strokeWidth={ 2.2 } />
            </span>
            { tip }
        </>
    );
};

StaffAccountCue.propTypes = {
    /* the account's explicit status: true active, false inactive, anything else unknown */
    active: PropTypes.oneOfType([PropTypes.bool, PropTypes.oneOf([null])]),
    embedded: PropTypes.bool,
};

export default React.memo(StaffAccountCue);
