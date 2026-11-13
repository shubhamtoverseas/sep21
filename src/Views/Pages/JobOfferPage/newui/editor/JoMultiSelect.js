import React, { useCallback, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../../components/Icon/Icon";
import useOutsideClick from "../../../../../hooks/useOutsideClick";
import translation from "../../../../../utils/translation";
import { JO_EDITOR_COPY, JO_NO_PREFERENCE_ID } from "../../jobOfferConstants";

const JoMultiSelect = ({ id, value, options, onChange, placeholder, cap, capNote, excluded = [], excludedNote, locked = [], lockedBadge, invalid, disabled, ariaLabel }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    useOutsideClick(wrapRef, () => setOpen(false), open);
    const selected = useMemo(() => (Array.isArray(value) ? value : []), [value]);
    const byId = useMemo(() => Object.fromEntries(options.map((o) => [String(o.value), o])), [options]);
    const full = Boolean(cap) && selected.length >= cap;

    const toggle = useCallback((optionValue) => {
        const v = optionValue;
        const isOn = selected.some((s) => String(s) === String(v));
        if (isOn) { if (!locked.some((l) => String(l) === String(v))) onChange(selected.filter((s) => String(s) !== String(v))); return; }
        if (Number(v) === JO_NO_PREFERENCE_ID) { onChange([JO_NO_PREFERENCE_ID]); return; }
        const next = selected.filter((s) => Number(s) !== JO_NO_PREFERENCE_ID);
        if (cap && next.length >= cap) return;
        onChange([...next, v]);
    }, [selected, onChange, cap, locked]);

    const remove = useCallback((event, v) => {
        event.stopPropagation();
        if (locked.some((l) => String(l) === String(v))) return;
        onChange(selected.filter((s) => String(s) !== String(v)));
    }, [selected, onChange, locked]);

    const note = full && capNote ? capNote : (excluded.length && excludedNote ? excludedNote : '');

    return (
        <div ref={ wrapRef } className={ `joe-selwrap${ open ? ' open' : '' }` }>
            <div
                id={ id }
                className={ `joe-ctl joe-chipbox${ selected.length ? '' : ' empty' }${ invalid ? ' bad' : '' }${ disabled ? ' disabled' : '' }` }
                role="button"
                tabIndex={ disabled ? -1 : 0 }
                aria-label={ ariaLabel }
                aria-haspopup="listbox"
                aria-expanded={ open }
                aria-disabled={ disabled || undefined }
                onClick={ () => { if (!disabled) setOpen((o) => !o); } }
                onKeyDown={ (event) => { if (disabled) return; if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); } if (event.key === 'Escape') setOpen(false); } }
            >
                { selected.length === 0 && <span className="ph">{ placeholder || JO_EDITOR_COPY.select }</span> }
                { selected.map((v) => {
                    const option = byId[String(v)];
                    const isLocked = locked.some((l) => String(l) === String(v));
                    return (
                        <span key={ String(v) } className={ `chip${ isLocked ? ' auto' : '' }` }>
                            { option?.label ?? String(v) }
                            { isLocked && lockedBadge ? <span className="autotag">{ lockedBadge }</span> : null }
                            { /* read-only (prototype): chips show without their remove control */ }
                            { !isLocked && !disabled && <button type="button" className="chipx" aria-label={ `${ translation('key_remove') } ${ option?.label ?? v }` } onClick={ (event) => remove(event, v) }>×</button> }
                        </span>
                    );
                }) }
                <Icon name="chev_down" size={ 10 } className="chev" />
            </div>
            { open && (
                <div className="joe-menu multi" role="listbox" aria-multiselectable="true" aria-label={ ariaLabel }>
                    { note && <div className="menunote">{ note }</div> }
                    { options.map((option) => {
                        const on = selected.some((s) => String(s) === String(option.value));
                        const isNoPref = Number(option.value) === JO_NO_PREFERENCE_ID;
                        const blocked = !on && ((full && !isNoPref) || excluded.some((e) => String(e) === String(option.value)));
                        const isLocked = on && locked.some((l) => String(l) === String(option.value));
                        return (
                            <button key={ String(option.value) } type="button" role="option" aria-selected={ on } aria-disabled={ blocked || isLocked || undefined } disabled={ blocked || isLocked } onClick={ () => toggle(option.value) }>
                                <span className={ `tick${ on ? ' on' : '' }` }>{ on && <Icon name="check" size={ 10 } strokeWidth={ 2.6 } /> }</span>
                                { option.label }
                            </button>
                        );
                    }) }
                </div>
            ) }
        </div>
    );
};

JoMultiSelect.propTypes = {
    id: PropTypes.string,
    value: PropTypes.array,
    options: PropTypes.arrayOf(PropTypes.shape({ value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired, label: PropTypes.string.isRequired })).isRequired,
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    cap: PropTypes.number,
    capNote: PropTypes.string,
    excluded: PropTypes.array,
    excludedNote: PropTypes.string,
    locked: PropTypes.array,
    lockedBadge: PropTypes.string,
    invalid: PropTypes.bool,
    disabled: PropTypes.bool,
    ariaLabel: PropTypes.string,
};

export default React.memo(JoMultiSelect);
