import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import useOutsideClick from "../../../../hooks/useOutsideClick";
import translation from "../../../../utils/translation";

/**
 * The header Actions menu (prototype actionsMenuHTML): "Change Status:" with the current phase and the phase targets,
 * then Manage owners, then Start Extend Visa / Open Extend Visa (EXTEND.md §15.2: Start only when the contract is
 * Active, no case is open and the viewer holds `processing_start_extend_visa`; one open case replaces Start with Open).
 * When nothing is permitted there is no Actions control at all.
 */
const ActionsMenu = ({ currentName, targets, canChangeStatus, canManageOwners, onPickStatus, onManageOwners, extendVisa, onExtendVisa }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const close = useCallback(() => setOpen(false), []);
    useOutsideClick(wrapRef, close, open);
    const showStatus = canChangeStatus && targets.length > 0;
    const showXv = Boolean(extendVisa);
    if (!showStatus && !canManageOwners && !showXv) return null;
    return (
        <div className="mcdt-actwrap" ref={ wrapRef } onKeyDown={ (event) => { if (event.key === "Escape") close(); } }>
            <button type="button" className={ `g1-btn mcdt-g1 mcdt-actbtn${ open ? " on" : "" }` } aria-haspopup="menu" aria-expanded={ open } onClick={ () => setOpen((v) => !v) }>
                { translation("key_actions") }<Icon name="chev_down" size={ 10 } strokeWidth={ 1.8 } />
            </button>
            { open && (
                <div className="mcdt-menu" role="menu" aria-label={ translation("key_contract_actions") }>
                    { showStatus && (
                        <>
                            <div className="k">{ translation("key_change_status") }:</div>
                            <div className="cur"><span>{ currentName }</span><span className="cur-tag">{ translation("key_current") }</span></div>
                            { targets.map((t) => (
                                <button key={ t.id } type="button" role="menuitem" className="it" onClick={ () => { close(); onPickStatus(t.id); } }>{ t.name }</button>
                            )) }
                        </>
                    ) }
                    { showStatus && canManageOwners && <div className="sep" /> }
                    { canManageOwners && (
                        <button type="button" role="menuitem" className="it it-owners" onClick={ () => { close(); onManageOwners(); } }>{ translation("key_manage_owners") }</button>
                    ) }
                    { (showStatus || canManageOwners) && showXv && <div className="sep" /> }
                    { showXv && (
                        <button type="button" role="menuitem" className="it it-xv" data-xv-action={ extendVisa } disabled={ extendVisa === "starting" } onClick={ () => { close(); onExtendVisa(); } }>
                            { translation(extendVisa === "open" ? "key_open_extend_visa" : "key_start_extend_visa") }
                        </button>
                    ) }
                </div>
            ) }
        </div>
    );
};

ActionsMenu.propTypes = {
    currentName: PropTypes.string.isRequired,
    targets: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.number.isRequired, name: PropTypes.string.isRequired })).isRequired,
    canChangeStatus: PropTypes.bool.isRequired,
    canManageOwners: PropTypes.bool.isRequired,
    onPickStatus: PropTypes.func.isRequired,
    onManageOwners: PropTypes.func.isRequired,
    /* "start" · "starting" · "open" · null */
    extendVisa: PropTypes.oneOf(["start", "starting", "open"]),
    onExtendVisa: PropTypes.func,
};

export default React.memo(ActionsMenu);
