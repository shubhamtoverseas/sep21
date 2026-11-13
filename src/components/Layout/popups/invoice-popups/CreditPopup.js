import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from 'react-router-dom';
import crossCircle from '../../../../assets/img/svg/cross-circle-line.svg';
import PropTypes from 'prop-types';
import { fetchCalculatePrice } from "../../../../redux/Slices/invoices/InvoicesSlice";
import { calculatePrice } from "../../../../utils/utils";
import translation from "../../../../utils/translation";

function CreditPopup({ customDiscountItem, onClose, onUpdateItemAfterDiscount }) {
    const dispatch = useDispatch();
    const [isCheckedvalueData, setIsCheckedvalueData] = useState({ base_price: customDiscountItem?.total, type: "credit", amount: "", amount_after_discount: 0, description: "", index: customDiscountItem?.index, discount_amount: 0 });
    const [error, setError] = useState("");

    const handleUpdate = (e) => {
        console.log("customDiscountItem 1", parseFloat(customDiscountItem?.total));
        console.log("customDiscountItem 2", parseFloat(e.target.value));
        if (e.target.value !== "") {
            if (parseFloat(customDiscountItem?.total) >= parseFloat(e.target.value)) {
                setIsCheckedvalueData({ ...isCheckedvalueData, amount: e.target.value, description: "$" + e.target.value + " Credit Discount", discount_value_type: "value", discount_value: e.target.value });
                setError("");
            } else {
                setError(translation('key_cannot_enter_more_than_item_total_amount'));
            }
        } else {
            setIsCheckedvalueData({ base_price: customDiscountItem?.total, type: "credit", amount: "", amount_after_discount: 0, description: "", index: customDiscountItem?.index, discount_amount: 0 });
            setError("");
        }

    }

    const handleCalculatePrice = async () => {
        try {
            let resp = { final_price: 0 };
            if (isCheckedvalueData.type === "custom_discount" || isCheckedvalueData.type === "credit") {
                resp = await calculatePrice(isCheckedvalueData);
            } else {
                resp = await dispatch(fetchCalculatePrice(isCheckedvalueData)).unwrap();
            }

            if (resp.final_price) {
                setIsCheckedvalueData({ ...isCheckedvalueData, base_price: resp.final_price.toFixed(2), amount_after_discount: resp.final_price.toFixed(2), discount_amount: (isCheckedvalueData.base_price - resp.final_price.toFixed(2)).toFixed(2) });

                onUpdateItemAfterDiscount({ ...isCheckedvalueData, base_price: resp.final_price.toFixed(2), amount_after_discount: resp.final_price.toFixed(2), discount_amount: (isCheckedvalueData.base_price - resp.final_price.toFixed(2)).toFixed(2) });
                onClose();
            } else {
                setError(translation('key_cannot_enter_more_than_item_total_amount'));
            }
        } catch (error) {
            setError('Failed to calculate price ' + error.message);
        }
    }

    return (
        <div className="modal fade show" style={ { display: 'block', background: 'rgba(0, 0, 0, 0.7)' } } role="dialog">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header bg-transparent border-0 p24">
                        <h5 className="modal-title black">{ translation('key_custom_discount') }</h5>
                        <Link to="#" onClick={ onClose }><img src={ crossCircle } alt="close" /></Link>
                    </div>
                    <div className="modal-body p-0">
                        <div className="p24 pt-0">
                            <div className="row justify-content-center">
                                <div className="col-12 text-left">
                                    <label className='form-label required'>{ translation('key_enter_amount') } </label>
                                    <div className="input-group customInputGroup">
                                        <span className="input-group-text" id="basic-addon1">$</span>
                                        <input type="number" className="form-control" value={ isCheckedvalueData?.amount } placeholder={ translation('key_amount') } name="amount" min="0" max={ customDiscountItem?.total } onChange={ handleUpdate } />
                                    </div>
                                </div>
                            </div>
                            { error && <small className="text-danger d-block mb-0 mt-1">{ error }</small> }
                        </div>
                        <div className='p24-32 bg-f7 border-top d-flex align-items-center justify-content-end' >
                            <button className="btn btn-outline mr-3" onClick={ onClose }>{ translation('key_cancel') }</button>
                            <button type="submit" className="btn filled-btn" onClick={ handleCalculatePrice }>{ translation('key_done') }</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

CreditPopup.propTypes = {
    onClose: PropTypes.func.isRequired,
    customDiscountItem: PropTypes.object.isRequired,
    onUpdateItemAfterDiscount: PropTypes.func.isRequired
};

export default CreditPopup;