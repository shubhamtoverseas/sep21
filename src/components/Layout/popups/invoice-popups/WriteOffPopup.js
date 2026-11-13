import React from 'react';
import { Link } from 'react-router-dom';
import crossCircle from '../../../../assets/img/svg/cross-circle-line.svg';
import PropTypes from 'prop-types';
import translation from '../../../../utils/translation';

function WriteOffPopup({ onClose }) {

    return (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0, 0, 0, 0.7)' }} role="dialog">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header bg-transparent border-0 p24">
                        <h5 className="modal-title black">{ translation('key_adjust_to_zero_write_off') }</h5>
                        <Link to="#" onClick={onClose}><img src={crossCircle} alt="close" /></Link>
                    </div>
                    <div className="modal-body p-0">
                        <div className="p24 pt-0">
                            <p className='black mb-0'>
                            You are about to adjust the remaining credit of <b>$340</b> to <b>zero</b>. This action cannot be reversed. Do you wish to proceed?
                            </p>
                        </div>
                        <div className='p24-32 bg-f7 border-top d-flex align-items-center justify-content-end' >
                            <button className="btn btn-outline mr-3" onClick={onClose}>{translation('key_cancel')}</button>
                            <button type="submit" className="btn filled-btn">{ translation('key_confirm_adjustment_to_zero') }</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

WriteOffPopup.propTypes = {
    onClose: PropTypes.func.isRequired,
};

export default WriteOffPopup;