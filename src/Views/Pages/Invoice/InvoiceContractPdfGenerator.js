import React from "react";
import dayjs from 'dayjs';
import { useTranslation } from "react-i18next";
import PropTypes from "prop-types";
import CommonContentContainer from "../../../components/common-content-container/CommonContentContainer";
import DetailItem from "../Employer/employer-details/basic-details/DetailItem";
import logo from '../../../assets/img/svg/maidmatch-logo.svg';
import './file.css';
import configData from '../../../components/ReusableComponents/app-configs';
import { formatHK, getOrdinalSuffix } from "../../../utils/utils";
import { paymentMethodLabel } from "./payment-method-selector/paymentMethodCatalogue";
import SavedPrintoutRows, { savedPrintoutRecord } from "./general/SavedPrintoutRows";
const InvoiceContractPdfGenerator = ({ invoiceDetails, totalAmount, adjustTotalAmount }) => {
    const { t } = useTranslation(); // Access translations
    /* an invoice with a frozen record prints that record (QA-27-033) */
    const saved = savedPrintoutRecord(invoiceDetails);
    // Helper to format amount with comma as thousands separator and 2 decimals
    // const formatAmount = (amount) => {
    //     if (typeof amount !== 'number') return amount;
    //     return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // };

    return (
        <CommonContentContainer isBoxShadow={ false }>

            { Object.keys(invoiceDetails).length !== 0 && invoiceDetails !== undefined && invoiceDetails && <div className="payment-type-invoice" style={ { boxShadow: 'none' } }>

                <div className="invoice-container">
                    <img src={ logo } alt="MaidMatch" className="brand-logo invoice-wrapper" />
                    <div className="mt-4">
                        <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                                <div className="mr12">
                                    <h5 className="mb-1 black">{ t('key_invoice') }</h5>
                                    {/* <span>{ invoiceDetails?.contract_number }</span> */ }
                                </div>

                                <button className={ `btn invoice-chip chip small compact ${ configData.invoiceStatusIdMapping[invoiceDetails?.status]?.className || 'default-status' }` }> { configData.invoiceStatusIdMapping[invoiceDetails?.status]?.label }</button>
                            </div>
                        </div>
                    </div>

                    <div className="row">
                        <div className={ `${ ((invoiceDetails?.payment_type === 'partial' || invoiceDetails?.payment_type === 'reservation_fee') && invoiceDetails?.remaining_balance > 0) ? 'col-md-7 table-adjusts' : 'col-md-12 table-adjusts' }` } >
                            <div className="dp-flex justify-content-end mt-4">
                                <div className="d-flex flex-wrap align-items-center mb40">
                                    <div className="d-flex ">
                                        <div className="me-3 text-end d-flex">
                                            <DetailItem title={ t('key_invoice_no') } desc={ invoiceDetails?.invoice_number } columnSize='col-auto mr24 px6' />
                                            { invoiceDetails?.contract_number && !(invoiceDetails?.payment_type === 'reservation_fee' && Number(invoiceDetails?.status) === 4) && <DetailItem title={ t('key_contract_ref') } desc={ invoiceDetails?.contract_number } columnSize='col-auto mr24 px6' /> }

                                            <DetailItem title={ t('key_date') } desc={ dayjs(invoiceDetails?.invoices_date).format('DD/MM/YYYY') } columnSize='col-auto mr24 px6' />
                                            <DetailItem title={ t('key_branch') } desc={ invoiceDetails?.branch_name } columnSize='col-auto mr24 px6' />
                                            <DetailItem title={ t('key_staff') } desc={ invoiceDetails?.staff_name } columnSize='col-auto px6' />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex flex-wrap align-items-center mb40">
                                {/* a worker-party invoice has no employer: its worker takes the first card (QA-27-034) */}
                                { invoiceDetails?.employer_name && <>
                                <div className="entity-detail-wrapper">
                                    <h6 className="mb-0 fz16 fw-400 lh-normal grey75">{ t('key_employer') }</h6>
                                    <p className="fz20 fw-600 lh-20 my-1 black">{ invoiceDetails?.employer_name } ({ invoiceDetails?.employer_reference_id || "N/A" })</p>
                                    <h6 className="mb-0 fz16 fw-400 lh-normal grey75">{ invoiceDetails?.chinese_name }</h6>
                                </div>
                                <div className="entity-detail-wrapper mx-4">
                                    ...........
                                </div>
                                </> }
                                <div className="entity-detail-wrapper">
                                    <h6 className="mb-0 fz16 fw-400 lh-normal grey75">{ t('key_worker') }</h6>
                                    <p className="fz20 fw-600 lh-20 my-1 black">{ invoiceDetails?.worker_name } ({ invoiceDetails?.worker_reference_id || "N/A" })</p>
                                    <h6 className="mb-0 fz16 fw-400 lh-normal grey75">{ invoiceDetails?.reference_id }</h6>
                                </div>
                            </div>

                            <table className="table mt-4 mb-4 table-borderless invoice-table">
                                <thead className="border-bottom border-dark">
                                    <tr>
                                        <th>{ t('key_item_type') }</th>
                                        <th>{ t('key_description') }</th>
                                        <th>{ t('key_amount') }</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { saved ? <SavedPrintoutRows invoice={ invoiceDetails } /> : invoiceDetails?.parentInvoice && invoiceDetails?.parentInvoice?.status === 11
                                        ?
                                        invoiceDetails && invoiceDetails?.parentInvoice?.contractInvoiceItemModel && invoiceDetails?.parentInvoice?.contractInvoiceItemModel.map((item, index) => (
                                            item.amount_type !== "refund" &&
                                            <React.Fragment key={ item.item_type }>
                                                <tr key={ index }>
                                                        <td>{ item.amount_type }</td>
                                                        <td>{ (item.price_item_description.split("|").length > 1 && item.amount_type === "base") ? item.price_item_description.split(" on")?.[1] ? item.price_item_description.split(" on")?.[1] : item.price_item_description : item.price_item_description }</td>
                                                        <td>${ item.amount }</td>
                                                    </tr>
                                            </React.Fragment>
                                        ))
                                        :
                                        invoiceDetails && invoiceDetails?.contractInvoiceItemSelectModel && invoiceDetails.contractInvoiceItemSelectModel.map((item, index) => (
                                            <React.Fragment key={ item.item_type }>
                                                <tr key={ index }>
                                                    <td>{ item.item_name }</td>
                                                    <td>{ item.item_model_name }</td>
                                                    <td>${ item.amount }</td>
                                                </tr>
                                            </React.Fragment>
                                        )) }
                                </tbody>
                                <tfoot>
                                    { !saved && <>
                                    { invoiceDetails && invoiceDetails?.parentInvoice && invoiceDetails?.parentInvoice?.status === 10
                                        ?
                                        <tr className="border-top border-dark">
                                            <td className="blue">{ t('key_underpaid_amount') }</td>
                                            <td className="blue">{ t('key_underpaid_invoice_of_exchange') } ({ invoiceDetails?.parentInvoice?.invoice_number })</td>
                                            <td className="blue">${ invoiceDetails?.total_amount }</td>
                                        </tr>
                                        :
                                        <tr className="border-top border-dark">
                                            <td colSpan="2" className="subtotal">{ t('key_subtotal') }</td>
                                            <td className="subtotal">${ invoiceDetails?.total_amount }</td>
                                        </tr> }

                                    { invoiceDetails && invoiceDetails?.contractInvoiceItemModel && invoiceDetails?.contractInvoiceItemModel.map((item, index) => (
                                        <React.Fragment key={ index }>
                                            { item?.discount_amount > 0 && <tr key={ index + 1 }>
                                                <td colSpan="2">{ item.price_item_description }</td>
                                                <td>(${ item?.discount_amount })</td>
                                            </tr> }
                                        </React.Fragment>
                                    )) }

                                    { invoiceDetails?.parentInvoice && invoiceDetails?.parentInvoice?.status === 11 && invoiceDetails?.parentInvoice?.contractInvoiceItemModel.map((item, index) => (
                                        <React.Fragment key={ index }>
                                            { item?.discount_amount > 0 && <tr key={ index + 1 }>
                                                <td colSpan="2">{ item.amount_type === "custom" && item.discount_amount > 0 ? `Discount $${ item.discount_amount } on ${ item.price_item_description.split("on")[0] } ` : item?.price_item_description }</td>
                                                <td>(${ item?.discount_amount })</td>
                                            </tr> }
                                        </React.Fragment>
                                    )) }

                                    { invoiceDetails && invoiceDetails?.adjusted_amouts.length > 0 ? <tr className="border-top border-dark">
                                        <td colSpan="2" className="subtotal-after">{ t('key_subtotal_after_discounts_and_promo') }</td>
                                        <td className="subtotal-after">${ (invoiceDetails?.total_amount) ? Number(invoiceDetails?.total_amount) - Number(invoiceDetails?.total_discount) : Number(invoiceDetails?.parentInvoice?.paid_amount) }</td>
                                    </tr>
                                        :

                                        (invoiceDetails?.status === 10 || invoiceDetails?.status === 11) && invoiceDetails?.exchange_type === "overpayment_refund"

                                            ? <tr className="border-top border-dark">
                                                <td colSpan="2" className="subtotal-after">{ t('key_subtotal_after_discounts_and_promo') }</td>
                                                <td className="subtotal-after">${ (invoiceDetails?.total_amount) ? Number(invoiceDetails?.total_amount) - Number(invoiceDetails?.total_discount) : Number(invoiceDetails?.parentInvoice?.final_amount) }</td>
                                            </tr> :

                                            <tr className="border-top border-dark">
                                                <td colSpan="2" className="subtotal-after">{ t('key_subtotal_after_discounts_and_promo') }</td>
                                                <td className="subtotal-after">
                                                    { invoiceDetails?.parentInvoice && invoiceDetails?.parentInvoice?.status === 11 ?
                                                        `$${ (invoiceDetails?.total_amount ? Number(invoiceDetails?.total_amount) - Number(invoiceDetails?.total_discount) : Number(invoiceDetails?.parentInvoice?.final_amount)) }`
                                                        :
                                                        `$${ (invoiceDetails?.final_amount ? Number(invoiceDetails?.final_amount) : Number(invoiceDetails?.parentInvoice?.final_amount)) }`
                                                    }
                                                </td>
                                            </tr>
                                    }
                                    { (invoiceDetails?.payment_type === 'reservation_fee') && <tr>
                                        <td colSpan="2" >{ t('key_reservation_fee_paid') }</td>
                                        <td>${ (invoiceDetails?.paymentModel.length > 1) ? Number(invoiceDetails.paid_amount) - Number(invoiceDetails?.paymentModel[1]?.amount) : Number(invoiceDetails.paid_amount) }</td>
                                    </tr> }

                                    { (invoiceDetails?.payment_type === 'partial') && <tr>
                                        <td colSpan="2" className=" fw-700">{ t('key_partial_payment_paid') }</td>
                                        <td className=" fw-700">${ (invoiceDetails?.paymentModel.length > 1) ? Number(invoiceDetails.paid_amount) - Number(invoiceDetails?.paymentModel[1]?.amount) : Number(invoiceDetails.paid_amount) }</td>
                                    </tr> }

                                    { ((invoiceDetails?.payment_type === 'reservation_fee' || invoiceDetails?.payment_type === 'partial') && invoiceDetails?.remaining_balance > 0) && <tr className="table-custom">
                                        <td colSpan="2" className="text-custom bold">{ t('key_remaining_balance') }</td>
                                        <td className="text-custom bold">${ invoiceDetails?.remaining_balance }</td>
                                    </tr> }

                                    { ((invoiceDetails?.payment_type === 'reservation_fee' || invoiceDetails?.payment_type === 'partial') && invoiceDetails?.remaining_balance == null) && <tr>
                                        <td colSpan="2">{ t('key_remaining_balance_paid') }</td>
                                        <td >${ (invoiceDetails?.paymentModel.length > 1) ? Number(invoiceDetails?.paymentModel[1]?.amount) : 0 }</td>
                                    </tr> }


                                    { (invoiceDetails?.status === 10 || invoiceDetails?.status === 11) && <tr>
                                        <td colSpan="2">{ t('key_exchange_credit_invoice_ref') }({ invoiceDetails?.parentInvoice?.invoice_number })</td>
                                        <td >(${ invoiceDetails?.parentInvoice?.final_amount })</td>
                                    </tr> }

                                    { (invoiceDetails?.status === 10 || invoiceDetails?.status === 11) && invoiceDetails?.childInvoices && invoiceDetails?.childInvoices.length > 0 && invoiceDetails?.childInvoices.map((action, index) => (
                                        <>
                                            <tr>
                                                <td colSpan="2" key={ index } className="bold"> { t('key_refund_overpayment_invoice_ref') }({ action?.invoice_number })</td>
                                                <td key={ index } className="bold">${ Math.abs(action?.final_amount) }</td>
                                            </tr>
                                        </>
                                    )) }

                                    { invoiceDetails?.adjusted_amouts && invoiceDetails?.adjusted_amouts.length > 0 && invoiceDetails?.adjusted_amouts.map((action, index) => (
                                        <>
                                            { action?.adjustment_type === 'plus' ?
                                                <tr>
                                                    <td colSpan="2" key={ index + 1 } >{ t('key_positive_adjustment') } ({ action?.reason })</td>
                                                    <td key={ index } >${ Math.abs(Number(action?.adjusted_amount)) }</td>
                                                </tr>
                                                :
                                                <tr>
                                                    <td colSpan="2" key={ index + 99 } >{ action?.type === "adjust_amount" ? t('key_negative_adjustment') + "(" + action?.reason + ")" : t('key_write_off') + "(" + action?.reason + ")" }</td>
                                                    <td key={ index } >
                                                        (${ Math.abs(Number(action?.adjusted_amount)) })
                                                    </td>
                                                </tr>
                                            }
                                        </>
                                    )) }

                                    {
                                        invoiceDetails?.parentInvoice && invoiceDetails?.parentInvoice?.status === 11 && invoiceDetails?.originalInvoice && (
                                            <tr>
                                                <td colSpan="2" className="blue">{ t('key_exchange_credit') } | { t('key_invoice_reference') } ({ invoiceDetails?.originalInvoice?.invoice_number })</td>
                                                <td className="blue">(${ Number(invoiceDetails?.originalInvoice?.final_amount) - Number(invoiceDetails?.originalInvoice?.refund_amount) })</td>
                                            </tr>
                                        )
                                    }

                                    { invoiceDetails?.remaining_balance > 0 ? <tr>
                                        <td colSpan="2" className="total ">{ t('key_total') }</td>
                                        <td className="total ">${ Number(invoiceDetails?.final_amount) }</td>
                                    </tr> : <tr className="total ">
                                        <td colSpan="2" className="black fz17 fw-600">{ t('key_total') }</td>
                                        { (invoiceDetails?.status === 10 || invoiceDetails?.status === 11) ?
                                                invoiceDetails?.exchange_type === "additional_payment" ? <td className="total ">${ adjustTotalAmount }</td> : <td className="total ">$0</td>
                                                : <td className="total ">${ invoiceDetails?.status === 6 ? 0 : totalAmount }</td> }
                                    </tr> }
                                    </> }

                                    { (invoiceDetails?.status !== 1 && invoiceDetails?.payment_type === 'reservation_fee' || invoiceDetails?.payment_type === 'partial') &&
                                        <tr >
                                            <td colSpan="2" >{ t('key_payment_deadline_before_automatic_cancellation') }
                                                <div className="text-custom">{ invoiceDetails?.due_date && dayjs(invoiceDetails?.due_date).format('DD/MM/YYYY HH:mm') }</div>
                                            </td>
                                        </tr>
                                    }
                                </tfoot>
                            </table>
                            <div className="col-12">
                                { (invoiceDetails?.payment_type === 'partial' || invoiceDetails?.payment_type === 'full') && invoiceDetails?.paymentModel && invoiceDetails?.paymentModel.length > 0 && invoiceDetails?.paymentModel.map((item, index) => (
                                    <div className="row mb-3" key={ index + 1 }>
                                        <div className="col-12 fw-600 px6 text-black mb-1">{ invoiceDetails?.payment_type === 'partial' ? getOrdinalSuffix(index + 1) : "" } { t('key_payment') } Information</div>

                                        <DetailItem title={ t('key_payment_date') } desc={ item?.created_at && dayjs(item?.created_at).format('DD/MM/YYYY') } columnSize='col-auto mr24 px6' />
                                        <DetailItem title={ t('key_payment_method') } desc={ paymentMethodLabel(item?.payment_method) || item?.payment_method } columnSize='col-auto mr24 px6' />

                                        { (item?.payment_method === 'credit_card' || item?.payment_method === 'union_pay') && <>
                                            <DetailItem title={ t('key_approval_code') } desc={ (item?.time_code) ? item?.time_code : "" } columnSize='col-auto mr24 px6' />
                                            <DetailItem title={ t('key_card_type') } desc={ item?.card_type ? item?.card_type : "" } columnSize='col-auto mr24 px6' />
                                            <DetailItem title={ t('key_card_number') } desc={ item?.card_number ? "XXXX" + item?.card_number : "" } columnSize='col-auto mr24 px6' />
                                        </> }

                                        { (item?.payment_method === 'bank_in' || item?.payment_method === 'bank_transfer') && <>

                                            <DetailItem title={ t('key_bank_name') } desc={ item?.bank_name ? item?.bank_name : "" } columnSize='col-auto mr24 px6' />
                                            <DetailItem title={ t('key_bank_in_reference') } desc={ item?.bank_in_reference ? "" + item?.bank_in_reference : "" } columnSize='col-auto mr24 px6' />
                                        </> }

                                        { item?.payment_method === 'cheque' && <>

                                            <DetailItem title={ t('key_bank_name') } desc={ item?.bank_name ? item?.bank_name : "" } columnSize='col-auto mr24 px6' />
                                            <DetailItem title={ t('key_cheque_number') } desc={ item?.cheque_number ? "" + item?.cheque_number : "" } columnSize='col-auto mr24 px6' />
                                        </> }

                                        { (item?.payment_method === 'fps_direct') && <>
                                            <DetailItem title={ t('key_employer_fps_identifier') } desc={ item?.fps_identifier ? item?.fps_identifier : "" } columnSize='col-auto mr24 px6' />
                                            <DetailItem title={ t('key_transfer_reference') } desc={ item?.transaction_reference ? item?.transaction_reference : "" } columnSize='col-auto mr24 px6' />
                                        </> }
                                        { (item?.payment_method === 'fps_terminal' || item?.payment_method === 'alipay' || item?.payment_method === 'alipay_hk' || item?.payment_method === 'wechat_pay' || item?.payment_method === 'wechat_pay_hk') && <>

                                            <DetailItem title={ t('key_transaction_reference') } desc={ item?.transaction_reference ? item?.transaction_reference : "" } columnSize='col-auto mr24 px6' />

                                        </> }

                                        { (item?.payment_method === 'fps_direct') && <>

                                            <DetailItem title={ t('key_employer_fps_identifier') } desc={ item?.fps_identifier ? item?.fps_identifier : "" } columnSize='col-auto mr24 px6' />
                                            <DetailItem title={ t('key_transfer_reference') } desc={ item?.transaction_reference ? item?.transaction_reference : "" } columnSize='col-auto mr24 px6' />
                                        </> }

                                        <DetailItem title={ t('key_amount') } desc={ item?.amount ? formatHK(item.amount) : "" } columnSize='col-auto mr24 px6' />
                                    </div>
                                )) }
                                {/* R-P2 (OP-27-54): Amount due now was HK$0 at creation (the frozen record), so no payment was made */}
                                { invoiceDetails?.no_payment_required && (
                                    <div className="row mb-3">
                                        <div className="col-12 fw-600 px6 text-black mb-1">{ t('key_payment') } Information</div>
                                        <DetailItem title={ t('key_payment_method') } desc={ t('key_inv_no_payment_required') } columnSize='col-auto mr24 px6' />
                                    </div>
                                ) }
                            </div>
                        </div>

                    </div></div>
            </div> }
        </CommonContentContainer >
    );
};

InvoiceContractPdfGenerator.propTypes = {
    invoiceDetails: PropTypes.object.isRequired,
    totalAmount: PropTypes.number.isRequired,
    adjustTotalAmount: PropTypes.number.isRequired
};

export default InvoiceContractPdfGenerator;