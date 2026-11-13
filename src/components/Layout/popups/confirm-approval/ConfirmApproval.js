import React  from 'react';
import PropTypes from "prop-types";

import translation from '../../../../utils/translation';

function ConfirmApproval(props) {
    return <div
        className="modal fade modalCustom confirmApproval show"
        id="newRegistrationJO"
        tabIndex={ -1 }
        aria-labelledby="exampleModalCenterTitle"
        style={ {
            display: "block",
            paddingRight: "15px",
            background: "rgba(0, 0, 0, 0.7)",
        } }
        aria-modal="true"
        role="dialog"
    >
        <div className="modal-dialog modal-lg" role="document" style={ { maxWidth: '503px' } }>
            <div className="modal-content">
                <div className="modal-body p-4">
                    <h5 className="fz20 fw-800 black mb-3" id="exampleModalLabel">{ props.title }</h5>
                    <p className='fz16 fw-400 black'>{ props.description }?</p>
                    <div className='d-flex'>
                        <button type="button" className="btn btn-outline mr-2 justify-content-center" style={ { flex: 1 } } onClick={ props.onClose } data-dismiss="modal">
                            { translation('key_no') }
                        </button>
                        <button type="button" className="btn filled-btn" style={ { flex: 1 } } onClick={ props.handleConfirmation }>
                            { translation('key_yes') }
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
}
ConfirmApproval.propTypes = {
    title: PropTypes.string,
    description: PropTypes.string,
    onClose: PropTypes.func,
    handleConfirmation: PropTypes.func
};
export default React.memo(ConfirmApproval);