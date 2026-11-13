import React, {
    useMemo,
} from "react";
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
const InvoiceRefundPdfGenerator = ({ invoiceDetails, totalAmount, parentTotalAmount }) => {
    const { t } = useTranslation();

    const invoiceStatus = invoiceDetails?.status;

    const paymentRows = useMemo(
        () => invoiceDetails?.paymentModel ?? [],
        [invoiceDetails?.paymentModel]
    );
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
                                            { invoiceDetails?.contract_number && <DetailItem title={ t('key_contract_ref') } desc={ invoiceDetails?.contract_number } columnSize='col-auto mr24 px6' /> }

                                            <DetailItem title={ t('key_date') } desc={ dayjs(invoiceDetails?.invoices_date).format('DD/MM/YYYY') } columnSize='col-auto mr24 px6' />
                                            <DetailItem title={ t('key_branch') } desc={ invoiceDetails?.branch_name } columnSize='col-auto mr24 px6' />
                                            <DetailItem title={ t('key_staff') } desc={ invoiceDetails?.staff_name } columnSize='col-auto px6' />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex flex-wrap align-items-center mb40">
                                <div className="entity-detail-wrapper">
                                    <h6 className="mb-0 fz16 fw-400 lh-normal grey75">{ t('key_employer') }</h6>
                                    <p className="fz20 fw-600 lh-20 my-1 black">{ invoiceDetails?.employer_name } ({ invoiceDetails?.employer_reference_id || "N/A" })</p>
                                    <h6 className="mb-0 fz16 fw-400 lh-normal grey75">{ invoiceDetails?.chinese_name }</h6>
                                </div>
                                <div className="entity-detail-wrapper mx-4">
                                    ...........
                                </div>
                                <div className="entity-detail-wrapper">
                                    <h6 className="mb-0 fz16 fw-400 lh-normal grey75">{ t('key_worker') }</h6>
                                    <p className="fz20 fw-600 lh-20 my-1 black">{ invoiceDetails?.worker_name } ({ invoiceDetails?.worker_reference_id || "N/A" })</p>
                                    <h6 className="mb-0 fz16 fw-400 lh-normal grey75">{ invoiceDetails?.reference_id }</h6>
                                </div>
                            </div>


                            {/* ── Items table ── */ }
                            <table className="table mt-4 mb-4 table-borderless invoice-table">
                                <thead className="border-bottom border-dark">
                                    <tr>
                                        <th>{ t("key_item_type") }</th>
                                        <th>{ t("key_description") }</th>
                                        <th>{ t("key_amount") }</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    { invoiceDetails.refund_type === "full" &&
                                        invoiceDetails.refund_origin !== "normal_invoice" &&
                                        invoiceDetails.contractInvoiceRefundItemModel?.map(
                                            (item, index) => (
                                                <tr key={ index }>
                                                    <td>{ item.amount_type }</td>
                                                    <td>{ item.price_item_description }</td>
                                                    <td>${ item.final_amount }</td>
                                                </tr>
                                            )
                                        ) }

                                    { invoiceDetails.refund_type !== "full" &&
                                        invoiceDetails.contractInvoiceRefundItemModel?.map(
                                            (item, index) => (
                                                <tr key={ index }>
                                                    <td>{ item.type }</td>
                                                    <td>{ item.refund_item_description }</td>
                                                    <td>${ item.refund_amount }</td>
                                                </tr>
                                            )
                                        ) }

                                    { invoiceDetails.refund_type === "full" &&
                                        invoiceDetails.subtotal_items?.map((item, index) => (
                                            <tr key={ index }>
                                                <td>{ item?.item_type_key === "custom" ? "Custom" : item?.item_type }</td>
                                                <td>{ item?.item_type_key === "custom" ? item?.item_type : item?.item_description_during_subtotal_show }</td>
                                                <td>(${ item?.item_effective_amount })</td>
                                                {/* <td>{ item.item_type }</td>
                                                <td>{ item.item_description_during_subtotal_show }</td>
                                                <td>(${ item.item_effective_amount })</td> */}
                                            </tr>
                                        )) }

                                    { (invoiceDetails.invoice_type !== "contract_refund" && invoiceDetails.invoice_type !== "general_refund") && (<tr className="border-top border-dark">
                                        <td colSpan="2" className="subtotal">{ t('key_subtotal') }</td>
                                        <td className="subtotal">${ invoiceDetails?.total_amount }</td>
                                    </tr>) }


                                    { invoiceDetails && (invoiceDetails.invoice_type !== "contract_refund" && invoiceDetails.invoice_type !== "general_refund") && invoiceDetails?.contractInvoiceItemModel && invoiceDetails?.contractInvoiceItemModel.map((item, index) => (
                                        <React.Fragment key={ index }>
                                            { item?.discount_amount > 0 && <tr key={ index + 1 }>
                                                <td colSpan="2">{ item.price_item_description }</td>
                                                <td>(${ item?.discount_amount })</td>
                                            </tr> }
                                        </React.Fragment>
                                    )) }
                                    { (invoiceDetails.invoice_type !== "contract_refund" && invoiceDetails.invoice_type !== "general_refund") && (<tr className="border-top border-dark">
                                        <td colSpan="2" className="subtotal-after">{ t('key_subtotal_after_discounts_and_promo') }</td>
                                        <td className="subtotal-after">${ (invoiceDetails?.total_amount) ? invoiceDetails?.total_amount - invoiceDetails?.total_discount : invoiceDetails?.parentInvoice?.final_amount }</td>
                                    </tr>) }

                                </tbody>

                                <tfoot>
                                    { invoiceDetails.refund_origin === "exchange_invoice" &&
                                        invoiceStatus === 9 && (
                                            <tr className="border-top border-dark table-update-original">
                                                <td className="text-update">{ t("key_credit") }</td>
                                                <td className="text-update">
                                                    { t("key_exchange_credit_invoice") } (
                                                    { invoiceDetails.originalInvoice?.invoice_number })
                                                </td>
                                                <td className="text-update">(${ invoiceDetails.originalInvoice?.final_amount })</td>
                                            </tr>
                                        ) }

                                    { invoiceDetails.refund_type === "full" &&
                                        invoiceDetails.refund_origin !== "exchange_invoice" && (
                                            <tr className="border-top border-dark table-update">
                                                <td colSpan="2" className="text-update">
                                                    { t("key_total_refund") }
                                                </td>
                                                <td className="text-update">(${ parentTotalAmount })</td>
                                            </tr>
                                        ) }

                                    { invoiceDetails.refund_type === "partial" &&
                                        invoiceDetails.refund_origin !== "exchange_invoice" && (
                                            <tr className="border-top border-dark table-update">
                                                <td colSpan="2" className="text-update">
                                                    { t("key_total_refund") }
                                                </td>
                                                <td className="text-update">(${ totalAmount })</td>
                                            </tr>
                                        ) }

                                    { invoiceDetails.refund_type !== "full" &&
                                        invoiceDetails.refund_origin === "exchange_invoice" && (
                                            <tr className="border-top border-dark table-update">
                                                <td className="text-update">{ t("key_refund") }</td>
                                                <td className="text-update">
                                                    { t("key_exchange_invoice_refund") }
                                                </td>
                                                <td className="text-update">(${ totalAmount })</td>
                                            </tr>
                                        ) }

                                    { invoiceDetails.refund_type === "full" &&
                                        invoiceDetails.refund_origin !== "normal_invoice" && (
                                            <tr className="border-top border-dark table-update">
                                                <td colSpan="2" className="text-update">
                                                    { t("key_total_refund") }
                                                </td>
                                                <td className="text-update">(${ totalAmount })</td>
                                            </tr>
                                        ) }
                                </tfoot>
                            </table>
                            {/* ── Payment rows ── */ }
                            <div className="col-12">
                                { (invoiceDetails.refund_type === "partial" ||
                                    invoiceDetails.refund_type === "full") &&
                                    paymentRows.map((item, index) => (
                                        <div className="row mb-3" key={ index }>
                                            <div className="col-12 fw-600 px6 text-black mb-1">
                                                { invoiceDetails.payment_type === "partial"
                                                    ? getOrdinalSuffix(index + 1)
                                                    : "" }{ " " }
                                                { t("key_refund") }
                                            </div>

                                            <DetailItem
                                                title={ t("key_payment_date") }
                                                desc={
                                                    item.created_at
                                                        ? dayjs(item.created_at).format("DD/MM/YYYY")
                                                        : ""
                                                }
                                                columnSize="col-auto mr24 px6"
                                            />
                                            <DetailItem
                                                title={ t("key_payment_method") }
                                                desc={
                                                    paymentMethodLabel(item.payment_method) || item.payment_method
                                                }
                                                columnSize="col-auto mr24 px6"
                                            />

                                            { (item.payment_method === "credit_card" ||
                                                item.payment_method === "union_pay") && (
                                                    <>
                                                        <DetailItem
                                                            title={ t('key_approval_code') }
                                                            desc={ item.time_code || "" }
                                                            columnSize="col-auto mr24 px6"
                                                        />
                                                        <DetailItem
                                                            title={ t("key_card_type") }
                                                            desc={ item.card_type || "" }
                                                            columnSize="col-auto mr24 px6"
                                                        />
                                                        <DetailItem
                                                            title={ t("key_card_number") }
                                                            desc={
                                                                item.card_number
                                                                    ? "XXXX" + item.card_number
                                                                    : ""
                                                            }
                                                            columnSize="col-auto mr24 px6"
                                                        />
                                                    </>
                                                ) }

                                            { (item.payment_method === "bank_in" || item.payment_method === "bank_transfer") && (
                                                <>
                                                    <DetailItem
                                                        title={ t("key_bank_name") }
                                                        desc={ item.bank_name || "" }
                                                        columnSize="col-auto mr24 px6"
                                                    />
                                                    <DetailItem
                                                        title={ t("key_bank_in_reference") }
                                                        desc={ item.bank_in_reference || "N/A" }
                                                        columnSize="col-auto mr24 px6"
                                                    />
                                                </>
                                            ) }

                                            { item.payment_method === "cheque" && (
                                                <>
                                                    <DetailItem
                                                        title={ t("key_bank_name") }
                                                        desc={ item.bank_name || "" }
                                                        columnSize="col-auto mr24 px6"
                                                    />
                                                    <DetailItem
                                                        title={ t("key_cheque_number") }
                                                        desc={ item.cheque_number || "N/A" }
                                                        columnSize="col-auto mr24 px6"
                                                    />
                                                </>
                                            ) }

                                            { (item?.payment_method === 'fps_terminal' || item?.payment_method === 'alipay' || item?.payment_method === 'alipay_hk' || item?.payment_method === 'wechat_pay' || item?.payment_method === 'wechat_pay_hk') && <>

                                                <DetailItem title={ t('key_transaction_reference') } desc={ item?.transaction_reference ? item?.transaction_reference : "" } columnSize='col-auto mr24 px6' />

                                            </> }

                                            { (item?.payment_method === 'fps_direct') && <>

                                                <DetailItem title={ t('key_employer_fps_identifier') } desc={ item?.fps_identifier ? item?.fps_identifier : "" } columnSize='col-auto mr24 px6' />
                                                <DetailItem title={ t('key_transfer_reference') } desc={ item?.transaction_reference ? item?.transaction_reference : "" } columnSize='col-auto mr24 px6' />
                                            </> }
                                            <DetailItem title={ t('key_amount') } desc={ item?.amount ? formatHK(Math.abs(item.amount)) : "" } columnSize='col-auto mr24 px6' />
                                        </div>
                                    )) }
                            </div>
                        </div>

                    </div></div>
            </div> }
        </CommonContentContainer >
    );
};

InvoiceRefundPdfGenerator.propTypes = {
    invoiceDetails: PropTypes.object.isRequired,
    totalAmount: PropTypes.number.isRequired,
    parentTotalAmount: PropTypes.number.isRequired,
};

export default InvoiceRefundPdfGenerator;