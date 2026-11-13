import React, { useCallback } from "react";
import PropTypes from "prop-types";
import GcIcon from "./gcIcons";
import translation from "../../../../utils/translation";

const GcModal = ({ title, size, className, onClose, footer, children, belowBody, headActions }) => {
    const handleScrim = useCallback((e) => {
        if (e.target === e.currentTarget) onClose();
    }, [onClose]);

    return (
        <div className="gc-modal-scrim" onClick={ handleScrim } role="dialog" aria-modal="true" aria-label={ title }>
            <div className={ `gc-modal ${ size || "" } ${ className || "" }` }>
                <div className="gc-modal-head">
                    <div className="gc-modal-title">{ title }</div>
                    <span className="gc-spacer" />
                    { headActions }
                    <button type="button" className="gc-panel-back" onClick={ onClose } aria-label={ translation('key_close') }>
                        <GcIcon name="close" />
                    </button>
                </div>
                <div className="gc-modal-body">{ children }</div>
                { belowBody }
                { footer && <div className="gc-modal-foot">{ footer }</div> }
            </div>
        </div>
    );
};

GcModal.propTypes = {
    title: PropTypes.node,
    size: PropTypes.oneOf(["sm", "lg", ""]),
    className: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    footer: PropTypes.node,
    children: PropTypes.node,
    belowBody: PropTypes.node,
    headActions: PropTypes.node,
};

export const GcConfirmModal = ({ title, body, confirmLabel, cancelLabel, danger, busy, onConfirm, onClose, spreadFooter }) => (
    <GcModal
        title={ title }
        size="sm"
        onClose={ onClose }
        footer={ (
            <>
                { !spreadFooter && <span className="gc-spacer" /> }
                <button type="button" className="gc-btn gc-btn-secondary inline" onClick={ onClose }>
                    { cancelLabel || translation("key_cancel") }
                </button>
                { spreadFooter && <span className="gc-spacer" /> }
                <button
                    type="button"
                    className={ `gc-btn gc-btn-primary inline ${ danger ? "danger-solid" : "" }` }
                    disabled={ busy }
                    onClick={ onConfirm }
                >
                    { confirmLabel }
                </button>
            </>
        ) }
    >
        <div className="gc-confirm-body">{ body }</div>
    </GcModal>
);

GcConfirmModal.propTypes = {
    title: PropTypes.node,
    body: PropTypes.node,
    confirmLabel: PropTypes.node,
    cancelLabel: PropTypes.node,
    danger: PropTypes.bool,
    busy: PropTypes.bool,
    onConfirm: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    spreadFooter: PropTypes.bool,
};

export default GcModal;
