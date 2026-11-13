import React, { useCallback, useRef, useState } from "react";
import PropTypes from "prop-types";
import useOutsideClick from "../../../../../../hooks/useOutsideClick";
import translation from "../../../../../../utils/translation";

const plusIcon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
    </svg>
);

/* "+ New" over a record listing. Absent without a target (U-0056: hidden, never disabled). One target → direct;
   several → a small Create menu under the button. */
const WkdNewTop = ({ ariaLabel, onClick, menu, menuHeading }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    useOutsideClick(wrapRef, () => setOpen(false), open);
    const items = Array.isArray(menu) ? menu.filter(Boolean) : [];
    const single = items.length === 1 ? items[0].onClick : onClick;
    const handleClick = useCallback(() => { if (single) single(); else setOpen((o) => !o); }, [single]);
    if (!single && items.length === 0) return null;
    return (
        <div ref={ wrapRef } className="mc-newtop">
            <button type="button" className="mc-newbtn" aria-label={ ariaLabel } aria-haspopup={ single ? undefined : 'menu' } aria-expanded={ single ? undefined : open } onClick={ handleClick }>
                { plusIcon }{ translation('key_new') }
            </button>
            { open && !single && (
                <div className="mc-newmenu" role="menu" aria-label={ ariaLabel }>
                    { menuHeading && <div className="hd">{ menuHeading }</div> }
                    { items.map((item) => (
                        <button key={ item.id } type="button" role="menuitem" onClick={ () => { setOpen(false); item.onClick(); } }>{ item.label }</button>
                    )) }
                </div>
            ) }
        </div>
    );
};

WkdNewTop.propTypes = {
    ariaLabel: PropTypes.string.isRequired,
    onClick: PropTypes.func,
    menu: PropTypes.arrayOf(PropTypes.shape({ id: PropTypes.string.isRequired, label: PropTypes.string.isRequired, onClick: PropTypes.func.isRequired })),
    menuHeading: PropTypes.string,
};

export default React.memo(WkdNewTop);
