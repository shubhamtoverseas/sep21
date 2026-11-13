import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import Icon from "../../../../components/Icon/Icon";
import useOutsideClick from "../../../../hooks/useOutsideClick";
import translation from "../../../../utils/translation";
import { initialsOf, ownerRows } from "./contractRecordUtils";
import { EM_DASH } from "./contractRecordUtils";

export const Avatar = ({ name, role, size = "md" }) => (
    <span className={ `mcdt-av ${ size } ${ name ? role : "none" }` } aria-hidden="true">{ name ? initialsOf(name) : EM_DASH }</span>
);
Avatar.propTypes = { name: PropTypes.string, role: PropTypes.string.isRequired, size: PropTypes.oneOf(["sm", "md", "lg"]) };

/**
 * The Owners pill and its popover (prototype ownersButtonHTML / OWNER_ROWS): Customer Service · CS Assistant ·
 * Prepared owner / Ready owner. An empty register reads Unassigned with the neutral avatar; an inactive holder keeps its
 * name with the Inactive badge.
 */
const OwnersPill = ({ row }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const close = useCallback(() => setOpen(false), []);
    useOutsideClick(wrapRef, close, open);
    const rows = ownerRows(row);
    const staff = translation("key_staff").toLowerCase();
    return (
        <div className="mcdt-ownwrap" ref={ wrapRef } onKeyDown={ (event) => { if (event.key === "Escape") close(); } }>
            <button type="button" className={ `mcdt-ownpill${ open ? " on" : "" }` } aria-haspopup="true" aria-expanded={ open } onClick={ () => setOpen((v) => !v) }>
                <span className="avs">{ rows.map((o) => <Avatar key={ o.role } name={ o.name } role={ o.role } size="sm" />) }</span>
                <span className="t">{ translation("key_owners") }</span>
                <span className="n" title={ `${ rows.length } ${ translation("key_roles").toLowerCase() }` }>{ rows.length }</span>
                <Icon name="chev_down" size={ 10 } strokeWidth={ 1.8 } />
            </button>
            { open && (
                <div className="mcdt-ownpop" role="group" aria-label={ translation("key_owners") }>
                    <div className="hd"><span>{ translation("key_owners") }</span><span className="r">{ rows.length } { translation("key_roles") }</span></div>
                    <div className="bd">
                        <div className="k">{ translation("key_processing") }</div>
                        { rows.map((o) => (
                            <div key={ o.role } className="orow">
                                <Avatar name={ o.name } role={ o.role } size="md" />
                                <div>
                                    <div className={ `nm${ o.name ? "" : " unassigned" }` }>{ o.name || translation("key_unassigned") }{ o.inactive && <span className="inactive">{ translation("key_inactive") }</span> }</div>
                                    <div className="rl">{ translation(o.labelKey) }{ o.name ? ` · (${ staff })` : "" }</div>
                                </div>
                            </div>
                        )) }
                    </div>
                </div>
            ) }
        </div>
    );
};

OwnersPill.propTypes = { row: PropTypes.object.isRequired };

export default React.memo(OwnersPill);
