import React from "react";
import PropTypes from "prop-types";
import crossCircle from "../../../assets/img/svg/cross-circle.svg";
import translation from "../../../utils/translation";
import { Link } from "react-router-dom";

function ActionConfirmationPopup({
    title,
    message,
    onYes,
    onClose
}) {

    return (
        <div className="modal fade show"
            style={{ display: 'block', background: 'rgba(0, 0, 0, 0.7)' }}
            role="dialog"
        >
            <div className="modal-dialog">
                <div className="modal-content">

                    {/* Header */}
                    <div className="modal-header bg-transparent border-0 p24 align-items-center justify-content-between pb-0">
                        <h5 className="modal-title pb-0 black">
                            {title}
                        </h5>
                        <Link to="#" onClick={onClose}><img src={crossCircle} alt="close" width={20} height={20} /></Link>
                    </div>

                    {/* Body */}
                    <div className="modal-body p-0 generate-jo-heading-desc-popup-body">
                        <div className="p24-32">
                            {message}
                        </div>

                        <div className='p24-32 bg-f7 border-top d-flex align-items-center justify-content-end'>
                            <button
                                    type="button"
                                    className="btn btn-outline mr-3"
                                    onClick={onClose}
                                >
                                    {translation("key_no")}
                                </button>

                                <button
                                    type="button"
                                    className="btn filled-btn"
                                    onClick={onYes}
                                >
                                    {translation("key_yes")}
                                </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

ActionConfirmationPopup.propTypes = {
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    onYes: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired
};

export default ActionConfirmationPopup;
