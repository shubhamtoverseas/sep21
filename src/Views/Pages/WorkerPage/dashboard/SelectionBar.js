import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import WgdIcon from "./WgdIcon";
import translation from "../../../../utils/translation";


const BULK_ICONS = { onb1: 'user', onb2: 'user', partner: 'link', owner: 'user', checkout: 'pin' };

const SelectionBar = ({
    count, actions, canChangeStatus, statusOptions,
    onPickStatus, onAction, onClear, onDone,
}) => {
    const [statusMenuOpen, setStatusMenuOpen] = useState(false);
    const wrapRef = useRef(null);
    const triggerRef = useRef(null);

    /* a11y (worker_AUDIT D29): first enabled item takes focus, arrows move, Escape closes and returns focus to the trigger */
    useEffect(() => {
        if (!statusMenuOpen) return undefined;
        const items = () => Array.from(wrapRef.current?.querySelectorAll('.selmenu button.item:not(:disabled)') || []);
        items()[0]?.focus();
        const handleOutside = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setStatusMenuOpen(false);
        };
        const handleKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); setStatusMenuOpen(false); triggerRef.current?.focus(); return; }
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
            const list = items();
            if (!list.length) return;
            e.preventDefault();
            const idx = list.indexOf(document.activeElement);
            list[e.key === 'ArrowDown' ? (idx + 1) % list.length : (idx - 1 + list.length) % list.length].focus();
        };
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, [statusMenuOpen]);

    useEffect(() => {
        if (!canChangeStatus) setStatusMenuOpen(false);
    }, [canChangeStatus]);

    return (
        <div className="selbar" role="region" aria-label={ translation('key_wkr_selection_actions') }>
            <span className="c"><strong>{ count }</strong> { translation('key_selected').toLowerCase() }</span>
            <div className="acts">
                <span className="actwrap" ref={ wrapRef }>
                    <button
                        ref={ triggerRef }
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={ statusMenuOpen }
                        disabled={ !canChangeStatus }
                        title={ canChangeStatus ? undefined : translation('key_wkr_select_exactly_one_worker_to_change_status') }
                        onClick={ () => setStatusMenuOpen((open) => !open) }
                    >
                        <WgdIcon name="edit" size={ 13 } />{ translation('key_wkr_change_status') }
                    </button>
                    { statusMenuOpen && (
                        <div className="menu selmenu" role="menu">
                            { statusOptions.length === 0 ? (
                                <span className="item muted">{ translation('key_wkr_no_statuses_available') }</span>
                            ) : statusOptions.map((s) => (
                                <button
                                    key={ s.id }
                                    type="button"
                                    className="item"
                                    role="menuitem"
                                    disabled={ s.enable === false }
                                    onClick={ () => { setStatusMenuOpen(false); onPickStatus(s.id); } }
                                >
                                    { s.name }
                                </button>
                            )) }
                        </div>
                    ) }
                </span>
                { actions.map((a) => {
                    if (a.deferred) {
                        return (
                            <button
                                key={ a.kind }
                                type="button"
                                disabled
                                aria-disabled="true"
                                data-mc-honest="deferred"
                                title={ translation('key_wkr_deferred_control_tip') }
                            >
                                <WgdIcon name={ BULK_ICONS[a.kind] || 'user' } size={ 13 } />{ a.label }
                            </button>
                        );
                    }
                    if (!a.allowed) return null;
                    return (
                        <button key={ a.kind } type="button" disabled={ !count } onClick={ () => onAction(a.kind) }>
                            <WgdIcon name={ BULK_ICONS[a.kind] || 'user' } size={ 13 } />{ a.label }
                        </button>
                    );
                }) }
                <button type="button" className="ghost" disabled={ !count } onClick={ onClear }>{ translation('key_clear') }</button>
                <button type="button" onClick={ onDone }>{ translation('key_done') }</button>
            </div>
        </div>
    );
};

SelectionBar.propTypes = {
    count: PropTypes.number.isRequired,
    actions: PropTypes.arrayOf(PropTypes.shape({
        kind: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        allowed: PropTypes.bool,
        deferred: PropTypes.bool,
    })).isRequired,
    canChangeStatus: PropTypes.bool,
    statusOptions: PropTypes.array,
    onPickStatus: PropTypes.func,
    onAction: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    onDone: PropTypes.func.isRequired,
};

SelectionBar.defaultProps = {
    canChangeStatus: false,
    statusOptions: [],
};

export default React.memo(SelectionBar);
