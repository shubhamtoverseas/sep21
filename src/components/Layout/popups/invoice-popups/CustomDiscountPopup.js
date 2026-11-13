import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from 'react-router-dom';
import crossCircle from '../../../../assets/img/svg/cross-circle-line.svg';
import PropTypes from 'prop-types';
import { fetchCalculatePrice } from "../../../../redux/Slices/invoices/InvoicesSlice";
import { calculatePrice } from "../../../../utils/utils";
import t from "../../../../utils/translation";
function CustomDiscountPopup({ customDiscountItem, onClose, onUpdateItemAfterDiscount }) {
    const dispatch = useDispatch();
    const [isCheckedvalueData, setIsCheckedvalueData] = useState({ base_price: customDiscountItem?.total, type: "custom_discount", amount_type: "", amount: "", amount_after_discount: 0, description: "", index: customDiscountItem?.index, discount_amount: 0 });
    const [error, setError] = useState("");

    const handleChecked = (value) => {
        setIsCheckedvalueData({ ...isCheckedvalueData, amount_type: value, amount: "" });
    }
    const handleUpdate = (e) => {
        if (isCheckedvalueData?.amount_type === "percentage") {
            if (/^\d*$/.test(e.target.value)) {
                if (e.target.value <= 100) {
                    setIsCheckedvalueData({ ...isCheckedvalueData, amount: e.target.value, description: e.target.value + "% Custom Discount", discount_value_type: "percentage", discount_value: e.target.value });
                    setError("");
                } else {
                    setError(t('key_enter_valid_percentage'));
                }
            }
        } else {
            const value = parseFloat(e.target.value);
            if (e.target.value !== "") {
                if (!isNaN(value) && value <= parseFloat(customDiscountItem?.total)) {
                    setIsCheckedvalueData({ ...isCheckedvalueData, amount: value, description: "$" + value + " Custom Discount", discount_value_type: "value", discount_value: value });
                    setError("");
                } else {
                    setError(t('key_cannot_enter_more_than_item_total_amount'));
                }
            } else {
                setIsCheckedvalueData({ base_price: customDiscountItem?.total, type: "custom_discount", amount_type: isCheckedvalueData?.amount_type, amount: "", amount_after_discount: 0, description: "", index: customDiscountItem?.index, discount_amount: 0 });
            }

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
                setIsCheckedvalueData({ ...isCheckedvalueData, base_price: resp.final_price.toFixed(2), amount_after_discount: resp.final_price.toFixed(2), discount_amount: (isCheckedvalueData.base_price - resp.final_price.toFixed(2)).toFixed(2), });

                onUpdateItemAfterDiscount({ ...isCheckedvalueData, base_price: resp.final_price.toFixed(2), amount_after_discount: resp.final_price.toFixed(2), discount_amount: (isCheckedvalueData.base_price - resp.final_price.toFixed(2)).toFixed(2) });
                onClose();
            }
        } catch (error) {
            setError(t('key_failed_to_calculate_price') + "" + error.message);
        }
    }

    return (
        <div className="modal fade show" style={ { display: 'block', background: 'rgba(0, 0, 0, 0.7)' } } role="dialog">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header bg-transparent border-0 p24">
                        <h5 className="modal-title black">{ t('key_custom_discount') }</h5>
                        <Link to="#" onClick={ onClose }><img src={ crossCircle } alt="close" /></Link>
                    </div>
                    <div className="modal-body p-0">
                        <div className="text-center p24 pt-0">
                            <p className='black mb24'>{ t('key_total_amount') } = ${ customDiscountItem?.total }</p>
                            <div className="mode-radio-buttons d-flex mb24 justify-content-center">
                                <div className="custom-radio compact">
                                    <input type="radio" value="value" name="amount_type" id="amount" onClick={ () => { handleChecked("value") } } />
                                    <label htmlFor="amount" className="radio-label black">{ t('key_amount') }</label>
                                </div>
                                <div className="custom-radio compact">
                                    <input type="radio" value="percentage" name="amount_type" id="percentage" onClick={ () => { handleChecked("percentage") } } />
                                    <label htmlFor="percentage" className="radio-label black">{ t('key_percentage') }</label>
                                </div>
                            </div>
                            <div className="row justify-content-center">
                                { (isCheckedvalueData?.amount_type === "percentage") ? <div className="col-8 text-left">
                                    <label className='form-label required'>{ t('key_enter_percentage') }</label>
                                    <div className="input-group customInputGroup">
                                        <span className="input-group-text" id="basic-addon1">%</span>
                                        <input type="number" className="form-control input-text" value={ isCheckedvalueData?.amount } placeholder="" min="1" max="100" name="amount" onChange={ handleUpdate } />
                                    </div>
                                </div> : (isCheckedvalueData?.amount_type === "value") ? <div className="col-8 text-left">
                                    <label className='form-label required'>{ t('key_enter_amount') }</label>
                                    <div className="input-group customInputGroup">
                                        <span className="input-group-text" id="basic-addon1">$</span>
                                        <input type="number" className="form-control input-text" value={ isCheckedvalueData?.amount } placeholder={ t('key_amount') } name="amount" min="0" max={ customDiscountItem?.total } onChange={ handleUpdate } />
                                    </div>
                                </div> : "" }
                                { error && <p className="text-danger">{ error }</p> }
                            </div>
                            {/* <p className='mb-0 black'>Amount after discount = <b>${isCheckedvalueData?.amount_after_discount}</b></p> */ }
                        </div>
                        <div className='p24-32 bg-f7 border-top d-flex align-items-center justify-content-end' >
                            <button className="btn btn-outline mr-3" onClick={ onClose }>{ t('key_cancel') }</button>
                            <button type="submit" className="btn filled-btn" onClick={ handleCalculatePrice }>{ t('key_done') }</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

CustomDiscountPopup.propTypes = {
    onClose: PropTypes.func.isRequired,
    customDiscountItem: PropTypes.object.isRequired,
    onUpdateItemAfterDiscount: PropTypes.func.isRequired
};

export default CustomDiscountPopup;