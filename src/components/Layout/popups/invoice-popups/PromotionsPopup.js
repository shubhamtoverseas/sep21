import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from 'react-router-dom';
import CustomCheckbox from '../../../custom-checkbox/CustomCheckbox';
import crossCircle from '../../../../assets/img/svg/cross-circle-line.svg';
import PropTypes from 'prop-types';
import { fetchCalculatePrice } from "../../../../redux/Slices/invoices/InvoicesSlice";
import translation from "../../../../utils/translation";
function PromotionsPopup({ customDiscountItem, onClose, onUpdateItemAfterDiscount, promos }) {
    const dispatch = useDispatch();
    const [isCheckedvalueData, setIsCheckedvalueData] = useState({ base_price: customDiscountItem?.total, type: "promotion", promotion_id: "", amount_after_discount: 0, description: "", index: customDiscountItem?.index, discount_amount: 0 });
    const [error, setError] = useState("");
    const [selectedPromo, setSelectedPromo] = useState(null);

    const handleCalculatePrice = async () => {
        try {
            const resp = await dispatch(fetchCalculatePrice(isCheckedvalueData)).unwrap();
            if (resp.final_price) {

                setIsCheckedvalueData({ ...isCheckedvalueData, base_price: resp.final_price.toFixed(2), amount_after_discount: resp.final_price.toFixed(2), discount_amount: (isCheckedvalueData.base_price - resp.final_price.toFixed(2)).toFixed(2) });

                onUpdateItemAfterDiscount({ ...isCheckedvalueData, base_price: resp.final_price.toFixed(2), amount_after_discount: resp.final_price.toFixed(2), discount_amount: (isCheckedvalueData.base_price - resp.final_price.toFixed(2)).toFixed(2) });
                onClose();
            }
        } catch (error) {
            setError('Failed to calculate price ' + error.message);
        }
    }

    const handleSelect = (id) => {
        setSelectedPromo(id);
        let promo = promos.find((promo) => promo.id === id);
        let description = promo.promo_value_type === "percentage" ? promo.promo_value + "%" : "$" + promo.promo_value;
        setIsCheckedvalueData({ ...isCheckedvalueData, promotion_id: id, description: description + " promotion " + promo.promo_name, discount_value: promo.promo_value, discount_value_type: promo.promo_value_type, promotion_name: promo.promo_name, promo_value_type: promo.promo_value_type, promo_value: promo.promo_value });
    };
    return (
        <div className="modal fade show" style={ { display: 'block', background: 'rgba(0, 0, 0, 0.7)' } } role="dialog">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header bg-transparent border-0 p24">
                        <h5 className="modal-title black">{ translation('key_promotions')}</h5>
                        <Link to="#" onClick={ onClose }><img src={ crossCircle } alt="close" /></Link>
                    </div>
                    <div className="modal-body p-0">
                        <div className="p24 pt-0">
                            <p className='black'>{ translation('key_select_promo_apply') } </p>
                            <table className="table table-bordered table-hover mb-0">
                                <thead>
                                    <tr>
                                        <th style={ { width: "50px" } }></th>
                                        <th>{ translation('key_promo_name') } </th>
                                        <th>{ translation('key_value') }</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { promos.map((promo) => (
                                        <tr
                                            key={ promo.id }
                                            className={ selectedPromo === promo.id ? "table-primary" : "" }
                                        >
                                            <td className="text-center">
                                                <CustomCheckbox
                                                    checkId="asap"
                                                    checked={ selectedPromo === promo.id }
                                                    onChange={ (e) => handleSelect(e.target.checked ? promo.id : null) }
                                                    labelClasses={ 'grey-border' }
                                                    inputClasses={ 'checkbox-input' }
                                                />
                                            </td>
                                            <td>{ promo.promo_name }</td>
                                            <td>{ promo.promo_value_type === "percentage" ? promo.promo_value + "%" : "$" + promo.promo_value }</td>
                                        </tr>
                                    )) }
                                </tbody>
                            </table>
                            { error && <small className="text-danger d-block mb-0 mt-1">{ error }</small> }
                        </div>
                        <div className='p24-32 bg-f7 border-top d-flex align-items-center justify-content-end' >
                            <button className="btn btn-outline mr-3" onClick={ onClose }>{translation('key_cancel')}</button>
                            <button type="submit" className="btn filled-btn" onClick={ handleCalculatePrice }>{translation('key_done')}</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

PromotionsPopup.propTypes = {
    onClose: PropTypes.func.isRequired,
    customDiscountItem: PropTypes.object.isRequired,
    onUpdateItemAfterDiscount: PropTypes.func.isRequired,
    promos: PropTypes.array.isRequired
};

export default PromotionsPopup;