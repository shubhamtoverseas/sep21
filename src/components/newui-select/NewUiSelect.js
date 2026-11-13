import React, { useState, useRef, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import "./newui-select.css";

const chev = (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3.5 6 8 10.5 12.5 6" />
    </svg>
);

/*
 * Custom select with the new-UI popover menu (invoice-module menu spec:
 * #e3e3e7 border, 8px radius, soft shadow, 4px padded 12.5px rows with
 * #f3f3f7 hover). Replaces native <select> so the open menu matches the
 * design instead of the browser default.
 *
 * variant "bordered" (default) renders its own chip trigger;
 * variant "bare" renders an unstyled trigger to sit inside a host
 * control (e.g. the dashboard .fctl pill).
 */
const NewUiSelect = ({ label, value, options, onChange, variant, className, menuAlign }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
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

    const selected = useMemo(
        () => options.find((o) => String(o.value) === String(value)),
        [options, value]
    );

    return (
        <div className={ `nus${ className ? ` ${ className }` : '' }` } ref={ ref }>
            <button
                type="button"
                className={ variant === 'bare' ? 'nus-bare' : 'nus-trigger' }
                aria-haspopup="listbox"
                aria-expanded={ open }
                onClick={ () => setOpen((v) => !v) }
            >
                { label ? `${ label } · ` : '' }{ selected?.label ?? '' }
                { chev }
            </button>
            { open && (
                <div className={ `nus-menu${ menuAlign === 'right' ? ' right' : '' }` } role="listbox">
                    { options.map((o) => (
                        <button
                            key={ String(o.value) }
                            type="button"
                            role="option"
                            aria-selected={ String(o.value) === String(value) }
                            className={ `nus-item${ String(o.value) === String(value) ? ' on' : '' }` }
                            onClick={ () => { setOpen(false); onChange(o.value); } }
                        >
                            { o.label }
                        </button>
                    )) }
                </div>
            ) }
        </div>
    );
};

NewUiSelect.propTypes = {
    label: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    options: PropTypes.arrayOf(PropTypes.shape({
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        label: PropTypes.node,
    })).isRequired,
    onChange: PropTypes.func.isRequired,
    variant: PropTypes.oneOf(['bordered', 'bare']),
    className: PropTypes.string,
    menuAlign: PropTypes.oneOf(['left', 'right']),
};

NewUiSelect.defaultProps = {
    variant: 'bordered',
    menuAlign: 'left',
};

export default React.memo(NewUiSelect);
