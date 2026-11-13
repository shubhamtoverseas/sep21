import React from "react";
import PropTypes from "prop-types";
import Modal from "../../../../../../components/ui/Modal";
import translation from "../../../../../../utils/translation";

/* Worker-side JO confirmation on the kit Modal: focus trap, Escape, scrim click and focus restore come from
   useDialogFocus; `loading` locks every control while the action is in flight */
const WkdJoConfirmModal = ({ title, rows = [], note, tone = 'primary', confirmLabel, onConfirm, onClose, loading = false }) => (
    <Modal
        title={ title }
        width={ 480 }
        onClose={ onClose }
        busy={ loading }
        closeLabel={ translation('key_close') }
        footer={ (
            <>
                <span className="wkd-jocm-spacer" />
                <button type="button" className="wkd-jocm-btn back" onClick={ onClose } disabled={ loading }>
                    { translation('key_back') }
                </button>
                <button type="button" className={ `wkd-jocm-btn confirm ${ tone }` } onClick={ onConfirm } disabled={ loading } aria-busy={ loading || undefined }>
                    { loading ? `${ translation('key_processing') }...` : confirmLabel }
                </button>
            </>
        ) }
    >
        <div className="wkd-jocm-body">
            <div className="wkd-jocm-grid">
                { rows.map((row) => (
                    <React.Fragment key={ row.label }>
                        <div className="l">{ row.label }</div>
                        <div className={ row.mono ? 'v mono' : 'v' }>{ row.value }</div>
                    </React.Fragment>
                )) }
            </div>
            <div className={ `wkd-jocm-note ${ tone }` }>{ note }</div>
        </div>
    </Modal>
);

WkdJoConfirmModal.propTypes = {
    title: PropTypes.node.isRequired,
    rows: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.node,
        value: PropTypes.node,
        mono: PropTypes.bool,
    })),
    note: PropTypes.node,
    tone: PropTypes.oneOf(['primary', 'danger']),
    confirmLabel: PropTypes.node.isRequired,
    onConfirm: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    loading: PropTypes.bool,
};

export default WkdJoConfirmModal;
