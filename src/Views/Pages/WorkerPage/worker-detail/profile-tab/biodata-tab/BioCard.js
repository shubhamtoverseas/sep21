import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import translation from "../../../../../../utils/translation";
import { toTitleCase } from "../../../../../../utils/utils";

export const emptySel = (value) => (value === '' || value === null || value === undefined ? ' is-empty' : '');

/* ---------- Biodata read-view primitives (prototype bioCard / weField) ---------- */

export const BioCard = ({ title, chip, updated, onEdit, extraHead, dimmed, children, dataSection }) => (
    <div className={ `bio-card${ dimmed ? ' is-dimmed' : '' }` } data-bio-section={ dataSection }>
        <div className="bio-card-head">
            <span className="bio-card-title">{ title }</span>
            { chip }
            { updated && <span className="bio-card-updated">{ translation('key_updated') }: { updated }</span> }
            <span className="grow" />
            { onEdit && (
                <button type="button" className="bio-btn" onClick={ onEdit }>{ translation('key_edit') }</button>
            ) }
            { extraHead }
        </div>
        <div className="bio-card-body">{ children }</div>
    </div>
);
BioCard.propTypes = {
    title: PropTypes.node.isRequired,
    chip: PropTypes.node,
    updated: PropTypes.node,
    onEdit: PropTypes.func,
    extraHead: PropTypes.node,
    dimmed: PropTypes.bool,
    children: PropTypes.node,
    dataSection: PropTypes.string,
};

/* section inside a card: 16/600 heading + 2-col field grid; hairline between sections */
export const BioSection = ({ title, children, grid = true }) => (
    <div className="bio-section">
        { title && <div className="bio-section-title">{ title }</div> }
        { grid ? <div className="det-grid">{ children }</div> : children }
    </div>
);
BioSection.propTypes = { title: PropTypes.node, children: PropTypes.node, grid: PropTypes.bool };

/* `required` marks an empty value as missing (red label + *); an optional empty field just shows the dash */
export const BioField = ({ label, value, span, danger, required }) => {
    const empty = value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length);
    const missing = (empty && Boolean(required)) || Boolean(danger);
    return (
        <div className={ `bio-field${ span ? ` span-${ span }` : '' }` } data-missing={ missing || undefined }>
            <div className={ `bio-lbl${ missing ? ' is-missing' : '' }` }>{ label }{ missing && <span>*</span> }</div>
            <div className={ `bio-val${ empty ? ' is-empty' : '' }${ missing ? ' is-danger' : '' }` }>{ empty ? '—' : value }</div>
        </div>
    );
};
BioField.propTypes = {
    label: PropTypes.node.isRequired,
    value: PropTypes.node,
    required: PropTypes.bool,
    span: PropTypes.number,
    danger: PropTypes.bool,
};

export const BioChips = ({ items, empty = '—' }) => (
    items && items.length
        ? <div className="bio-chips">{ items.map((n, i) => <span key={ `${ n }-${ i }` } className="bio-chip">{ n }</span>) }</div>
        : <span className="bio-val is-empty">{ empty }</span>
);
BioChips.propTypes = { items: PropTypes.array, empty: PropTypes.node };

/* Change Status popover (prototype reviewStatusPopHTML): eyebrow, the current
 * state as a non-clickable row, then the other legal states. */
export const BioStatusPop = ({ current, options, onPick, onOpenChange, direction = 'down', disabled = false, title }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => { if (onOpenChange) onOpenChange(open); }, [open, onOpenChange]);
    useEffect(() => {
        if (!open) return undefined;
        const onOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onOutside);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onOutside); document.removeEventListener('keydown', onKey); };
    }, [open]);
    const cur = options.find((o) => o.id === current);
    const others = options.filter((o) => o.id !== current);
    return (
        <div className="bio-status-wrap" ref={ ref }>
            <button type="button" className={ `bio-btn bio-status-btn${ open ? ' open' : '' }` } aria-haspopup="true" aria-expanded={ open } disabled={ disabled } aria-disabled={ disabled || undefined } title={ title } onClick={ () => setOpen((v) => !v) }>
                { toTitleCase(translation('key_change_status')) }
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={ open ? 'M3.5 10 8 5.5 12.5 10' : 'M3.5 6 8 10.5 12.5 6' } /></svg>
            </button>
            { open && (
                <div className={ `bio-status-pop${ direction === 'up' ? ' up' : '' }` } role="menu">
                    <div className="bio-status-eyebrow">{ toTitleCase(translation('key_change_status')) }:</div>
                    { cur && (
                        <div className="bio-status-row current"><span>{ cur.name }</span><span>{ translation('key_current').toLowerCase() }</span></div>
                    ) }
                    { others.map((o) => (
                        <button
                            key={ o.id }
                            type="button"
                            role="menuitem"
                            className={ `bio-status-row${ o.id === 'action_required' ? ' tint' : '' }` }
                            disabled={ o.enable === false }
                            onClick={ () => { setOpen(false); onPick(o.id, o.name, o.enable); } }
                        >
                            { o.name }
                        </button>
                    )) }
                </div>
            ) }
        </div>
    );
};
BioStatusPop.propTypes = {
    current: PropTypes.string,
    options: PropTypes.array.isRequired,
    onPick: PropTypes.func.isRequired,
    onOpenChange: PropTypes.func,
    direction: PropTypes.oneOf(['down', 'up']),   /* 'up' = opens above the control (prototype docStatusPop) */
    disabled: PropTypes.bool,
    title: PropTypes.string,
};
