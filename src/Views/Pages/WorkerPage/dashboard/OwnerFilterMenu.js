import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import WgdIcon from "./WgdIcon";
import translation from "../../../../utils/translation";


const ITEM_SELECTOR = 'button.item, .mfoot button';

/* `locked` ids (PERM §5.7 Onboarding = Owner) render checked and disabled: the viewer's own scope cannot be unticked */
const OwnerFilterMenu = ({ anchorRect, options, selected, locked, onToggle, onClear, onClose }) => {
    const menuRef = useRef(null);

    /* a11y (worker_AUDIT D29): focus the first item on open, arrow keys move, Escape closes and returns focus to the opener */
    useEffect(() => {
        const opener = document.activeElement;
        const items = () => Array.from(menuRef.current?.querySelectorAll(ITEM_SELECTOR) || []);
        items()[0]?.focus();
        const handleOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
        };
        const handleKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); onClose(); opener?.focus?.(); return; }
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
            const list = items();
            if (!list.length) return;
            e.preventDefault();
            const idx = list.indexOf(document.activeElement);
            const next = e.key === 'ArrowDown' ? (idx + 1) % list.length : (idx - 1 + list.length) % list.length;
            list[next].focus();
        };
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, [onClose]);

    useEffect(() => {
        const el = menuRef.current;
        if (!el || !anchorRect) return;
        const width = el.offsetWidth;
        el.style.top = `${ anchorRect.bottom + 6 }px`;
        el.style.left = `${ Math.max(8, Math.min(anchorRect.left - 8, document.documentElement.clientWidth - width - 12)) }px`;
    }, [anchorRect]);

    if (!anchorRect) return null;

    return (
        <div ref={ menuRef } className="menu" role="menu">
            { options.map((opt) => (
                <button
                    key={ opt.id }
                    type="button"
                    className="item"
                    role="menuitemcheckbox"
                    aria-checked={ selected.has(opt.id) }
                    disabled={ Boolean(locked?.includes(opt.id)) }
                    onClick={ () => onToggle(opt.id) }
                >
                    <span className={ `cb${ selected.has(opt.id) ? ' on' : '' }` }>
                        <WgdIcon name="check" size={ 10 } strokeWidth={ 2.6 } />
                    </span>
                    <span>{ opt.name }</span>
                </button>
            )) }
            <div className="mfoot">
                <button type="button" onClick={ onClear }>{ translation('key_clear') }</button>
            </div>
        </div>
    );
};

OwnerFilterMenu.propTypes = {
    anchorRect: PropTypes.object,
    options: PropTypes.array.isRequired,
    selected: PropTypes.instanceOf(Set).isRequired,
    locked: PropTypes.array,
    onToggle: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default OwnerFilterMenu;
