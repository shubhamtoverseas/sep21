import React, { useRef } from "react";
import PropTypes from 'prop-types';
import translation from "../../../../../utils/translation";
import { headingCase } from "../../../../../utils/utils";
import useDialogFocus from "../../../../../hooks/useDialogFocus";
import "./wkd-edit-drawer.css";

const WkdEditWorkerDrawer = ({ onClose, children, workerName, workerCode, statusText, title }) => {
    const heading = headingCase(title || translation('key_edit_worker'));
    const panelRef = useRef(null);
    useDialogFocus(panelRef, onClose);

    return (
        <>
            <div className="ctx-backdrop wkd-ew-backdrop" onClick={ onClose } role="presentation" />
            <div ref={ panelRef } className="ctx-drawer wkd-edit-drawer wkd-ew-panel" role="dialog" aria-modal="true" aria-label={ heading }>
                <div className="wkd-ew-head">
                    <div>
                        <h2 className="wkd-ew-title">{ heading }</h2>
                        { workerName && (
                            <div className="wkd-ew-sub">{ workerName } · <span className="mono">{ workerCode || '—' }</span>{ statusText ? <> · <span>{ statusText }</span></> : null }</div>
                        ) }
                    </div>
                    <button type="button" className="wkd-ew-x" aria-label={ translation('key_close') } onClick={ onClose }>✕</button>
                </div>
                <div className="ctx-drawer-body wkd-edit-drawer-body">
                    { children }
                </div>
            </div>
        </>
    );
};

WkdEditWorkerDrawer.propTypes = {
    onClose: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired,
    workerName: PropTypes.string,
    workerCode: PropTypes.string,
    statusText: PropTypes.string,
    title: PropTypes.string,
};

export default React.memo(WkdEditWorkerDrawer);
