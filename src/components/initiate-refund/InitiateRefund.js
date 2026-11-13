import React, {
  useState, useMemo,
  useCallback
} from 'react';
import { formatHK } from "../../utils/utils";
import PropTypes from 'prop-types';
import { useDispatch } from "react-redux";
import './InitiateRefund.css';
import { ShowToast } from "../show-toast/ShowToast";
import translation from "../../utils/translation";
import { refundOriginLabel } from "../../Views/Pages/Invoice/payment-method-selector/paymentMethodCatalogue";

/* Refund routes of the original payment (v4 B-10; 10 Oct register #24; the Invoice API's refundOrigin): a card / terminal
   payment returns to its Card Network on the terminal (Apple Pay through its stored network); AlipayHK and WeChat Pay HK
   return to the wallet or by company cheque, the administrator's choice; a Tier 2 payment — or one paid partly by Tier 2
   (OP-PM-36) — by company cheque only. */
function refundRoutes(origin) {
  const cheque = { name: translation('key_company_cheque'), sub: translation('key_issue_company_cheque_note'), value: 'cheque_refund' };
  if (!origin?.originalChannel) {
    return {
      rule: { text: translation('key_tier2_cheque_only'), cls: 'rrb-a', icon: '⚠ ' },
      options: [{ ...cheque, badge: 'AUTO', fixed: true }],
    };
  }
  const methods = origin.methods || [];
  const viaCardNetwork = methods.length > 0 && methods.every((m) => m.method === 'apple_pay');
  const original = {
    name: translation('key_refund_through_original_channel'),
    sub: translation(viaCardNetwork ? 'key_refund_via_card_network_not_apple_pay' : 'key_returns_to_original_channel'),
    badge: 'PRE-SELECTED',
    value: 'direct_refund',
  };
  if (methods.length > 0 && methods.every((m) => m.group === 'wallet')) {
    return { rule: { text: translation('key_refund_original_or_cheque'), cls: 'rrb-b', icon: 'ℹ ' }, options: [original, cheque] };
  }
  return { rule: { text: translation('key_terminal_verified_refund_original_channel'), cls: 'rrb-g', icon: '✓ ' }, options: [original] };
}

// ─── Sub-components ────────────────────────────────────────────────────────

function RuleBox({ icon, text, cls }) {
  return <div className={ `refund-rule-box ${ cls }` }>{ icon }{ text }</div>;
}

RuleBox.propTypes = {
  icon: PropTypes.string.isRequired,
  text: PropTypes.string.isRequired,
  cls: PropTypes.string.isRequired,
};

function RefundOption({ option, onClick, refundedOption }) {
  return (
    <div className={ `rms-opt${ refundedOption === option.value ? ' rms-sel' : '' }${ option.fixed ? ' rms-fixed' : '' }` } onClick={ onClick }>
      <div className="rms-info">
        <span className="rms-nm">
          { option.name }
          { option.badge && <span className="auto-badge">{ option.badge }</span> }
        </span>
        <span className="rms-sub">{ option.sub }</span>
      </div>
    </div>
  );
}

RefundOption.propTypes = {
  option: PropTypes.shape({
    name: PropTypes.string.isRequired,
    sub: PropTypes.string.isRequired,
    badge: PropTypes.string,
    fixed: PropTypes.bool,
    value: PropTypes.string.isRequired,
  }).isRequired,
  onClick: PropTypes.func.isRequired,
  refundedOption: PropTypes.string.isRequired,
};

// ── Build API payload ────────────────────────────────────────────────────────
function filterValidRefundItems(refundItems) {
  return (refundItems || []).filter(item => {
    const amt = parseFloat(item.refund_amount);
    return !isNaN(amt) && amt !== 0;
  });
}

/* The invoice's lines as Refund offers them (the Invoice API's refundable.lines; 10 Oct register #20, #26): each with what
   it may still return — its value after discounts less earlier refunds — and what a full refund takes from it, labelled as
   the invoice screens show it (subtotal_items, by line id). Lines that return nothing (Employer Credit, refund lines) are
   left out. */
export function refundLines(invoiceData) {
  const shown = new Map((invoiceData?.subtotal_items || []).filter((item) => item?.id != null).map((item) => [Number(item.id), item]));
  return (invoiceData?.refundable?.lines || []).filter((line) => Number(line.value) > 0).map((line) => {
    const item = shown.get(Number(line.id)) || {};
    const custom = item.item_type_key === "custom";
    return {
      id: line.id,
      price_id: line.priceId,
      type: line.type,
      item: custom ? "Custom" : item.item_type,
      description: (custom ? item.item_type : item.item_description_during_subtotal_show) || "",
      remaining: Math.max(0, Number(line.remaining) || 0),
      full: Math.max(0, Number(line.full) || 0),
    };
  });
}

/* A full refund returns the whole refundable balance; its lines carry what it takes from each (never the gross line
   amounts). The Invoice API records its own figures. */
function fullRefundItems(invoiceData) {
  return refundLines(invoiceData).filter((line) => line.full > 0).map((line) => ({
    refund_item_description: line.description,
    refund_amount: line.full,
    type: line.type,
    price_id: line.price_id,
    id: line.id,
  }));
}

export function buildPayload(invoiceData, selectionType, contractFormInfo, totalRefundAmount, refundItems, items, refundedOption) {
  const paymentModel = Array.isArray(invoiceData?.paymentModel) && invoiceData.paymentModel.length > 0
    ? invoiceData.paymentModel[0]
    : {};
  const {
    payment_method, card_type, card_number, bank_name,
    bank_in_reference, transaction_reference, fps_identifier, cheque_number, time_code
  } = paymentModel;

  let payload = {
    refund_option: refundedOption,
  };
  const isGeneral = selectionType === "fullRefundGeneral" || selectionType === "partialRefundGeneral";
  const isFull = selectionType === "fullRefund" || selectionType === "fullRefundGeneral";
  const isPartial = selectionType === "partialRefund" || selectionType === "partialRefundGeneral";

  if (selectionType === "overpayment_refund") {
    /* the Remaining Credit refund of an exchange (INV-X4; register #74): the exchange's own submission (invoiceData: the
       priced input, the record shown and the original worker's handling) with the refund's route and the method the
       exchanged invoice was paid with, as stored (v4 B-12). The server prices, settles and sizes the refund itself: no amount,
       line or total is sent. final_amount / invoices_date are shown above, never sent. */
    // eslint-disable-next-line no-unused-vars
    const { final_amount: _shown, invoices_date: _date, ...body } = invoiceData || {};
    const paid = contractFormInfo?.currentInvoiceExchange?.paymentModel?.[0] || paymentModel;
    const stored = (key) => (paid?.[key] ? { [key]: paid[key] } : {});
    return {
      ...body,
      remaining_credit: "refund",
      refund_option: refundedOption,
      payment_method: paid?.payment_method,
      ...stored("card_type"), ...stored("card_number"), ...stored("bank_name"), ...stored("bank_in_reference"),
      ...stored("transaction_reference"), ...stored("fps_identifier"), ...stored("cheque_number"), ...stored("time_code"),
    };
  } else {
    if (isFull) {
      const fullItems = fullRefundItems(invoiceData);
      payload = {
        ...payload,
        ...(isGeneral && { invoice_type: "general" }),
        invoice_id: invoiceData?.id,
        amount: Number(invoiceData?.refundable?.amount) || 0,
        refund_payment_method: payment_method,
        refund_type: "full",
        ...(fullItems.length > 0 && { refund_items: fullItems }),
        ...contractFormInfo,
      };
    } else if (isPartial) {
      const validRefundItems = filterValidRefundItems(refundItems);
      payload = {
        ...payload,
        ...(isGeneral && { invoice_type: "general" }),
        invoice_id: invoiceData?.id,
        amount: totalRefundAmount,
        refund_payment_method: payment_method,
        refund_type: "partial",
        refund_items: [...validRefundItems, ...(items || [])],
        remarks: contractFormInfo?.other_reason,
        ...contractFormInfo,
      };
    }
    payload.payment_method = "credit_card";
    payload.card_type = card_type;
    payload.card_number = card_number;
    payload.bank_name = bank_name;
    payload.bank_in_reference = bank_in_reference;
    payload.transaction_reference = transaction_reference;
    payload.fps_identifier = fps_identifier;
    payload.cheque_number = cheque_number;
    payload.refund_payment_method = payment_method;
    payload.payment_options = invoiceData?.payment_options;
    payload.time_code = time_code;
  }

  return payload;
}

// ─── Main component ────────────────────────────────────────────────────────

const InitiateRefund = ({
  invoiceData,
  selectionType,
  submitAction,
  onSuccess,
  invoiceCurrentJobInfo,
  contractFormInfo,
  totalRefundAmount,
  refundItems,
  items,
  handleCancelSelection,
}) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  // the exchanged invoice's original payment (overpayment refund) — or the invoice's own
  const origin = invoiceData?.refundOrigin || contractFormInfo?.currentInvoiceExchange?.refundOrigin || null;
  const routes = useMemo(() => refundRoutes(origin), [origin]);
  const [refundedOption, setRefundOption] = useState(() => (origin?.originalChannel ? 'direct_refund' : 'cheque_refund'));

  const handleConfirmSubmit = useCallback(() => { 
    setLoading(true);
    if (contractFormInfo && (selectionType === "fullRefund" || selectionType === "partialRefund")) {
      const { cancel_contract, cancellation_date, cancellation_reason } = contractFormInfo;
      if (!cancel_contract) {
        ShowToast("error", translation("key_please_select_contract_cancellation_option"));
        setLoading(false);
        return;
      }
      if (cancel_contract == 1) {
        if (!cancellation_date) {
          ShowToast("error", translation("key_please_select_cancellation_date"));
          setLoading(false);
          return;
        }
        if (!cancellation_reason) {
          ShowToast("error", translation("key_please_select_reason_for_cancellation"));
          setLoading(false);
          return;
        }
      }
    }
    const payload = buildPayload(invoiceData, selectionType, contractFormInfo, totalRefundAmount, refundItems, items, refundedOption);
    dispatch(submitAction(payload)).then((res) => {
      const status = res?.payload?.status;
      /* a refusal the API answers with another code (an exchange's 422, INV-X1) is a refusal too */
      if (status !== 400 && res?.meta?.requestStatus !== "rejected") {
        if (status === undefined && !res?.payload?.data?.status) {
          ShowToast("error", res?.payload?.data?.message);
          setLoading(false);
          return;
        }
        ShowToast("success", res?.payload?.message);
        const invoiceId = (selectionType === "fullRefund" || selectionType === "partialRefund" || selectionType === "fullRefundGeneral" || selectionType === "partialRefundGeneral") ? res?.payload?.data?.id : res?.payload?.data?.invoice?.id;
        if (invoiceId && onSuccess) {
          onSuccess(invoiceId, res);
        }
      } else {
        const resData = res?.payload?.data;
        const details = resData?.details;
        if (Array.isArray(details) && details.length > 0) {
          const msgs = details.map(d => `${ d.instancePath?.replace('/', '') }: ${ d.message }`).join(', ');
          ShowToast("error", `${ resData?.error ?? translation('key_validation_error') } — ${ msgs }`);
        } else {
          const errMsg = resData?.error ?? resData?.message ?? resData?.data ?? translation('key_something_went_wrong');
          ShowToast("error", errMsg);
        }
      }
      setLoading(false);
    });
  }, [invoiceData, selectionType, contractFormInfo, totalRefundAmount, refundItems, items, refundedOption, invoiceCurrentJobInfo, dispatch, submitAction, onSuccess]);

  const initRefundOption = useCallback((opt) => {
    console.log("setRefundOption", opt?.value);
    setRefundOption(opt?.value);
  }, []);
  return (
    <div className="wrap">
      <div className="refund-panel">
        <div className="detail-card">
          <div className="detail-card-hdr">
            <div className="detail-hdr-title">{ translation('key_initiate_refund') }</div>
            <div className="detail-hdr-req">
              { translation('key_requires_refund_permission') }
            </div>
          </div>

          <div className="detail-card-body">
            <div className="refund-inv-summary">
              <div className="refund-inv-row">
                <span className="ril">{ translation('key_original_payment_method') }</span>
                <span className="riv">{ refundOriginLabel(origin) }</span>
              </div>
              <div className="refund-inv-row">
                <span className="ril">{ translation('key_amount_paid') }</span>
                <span className="riv">{ formatHK(invoiceData?.final_amount) }</span>
              </div>
              <div className="refund-inv-row">
                <span className="ril">{ translation('key_payment_date') }</span>
                <span className="riv">{ invoiceData?.invoices_date }</span>
              </div>
              <div className="refund-inv-row">
                <span className="ril">{ translation('key_verification_tier') }</span>
                <span className="riv">
                  { origin?.originalChannel ? translation('key_tier_1_terminal_verified') : translation('key_tier_2_off_terminal') }
                </span>
              </div>
            </div>

            <RuleBox { ...routes.rule } />

            <div className="refund-method-sel">
              <div className="rms-lbl">{ translation('key_refund_method') }</div>
              <div className="rms-opts">
                { routes.options.map((opt) => (
                  <RefundOption key={ opt.name } option={ opt } onClick={ () => initRefundOption(opt) } refundedOption={ refundedOption } />
                )) }
              </div>
            </div>

            <div className="refund-actions">
              <button className="btn btn-secondary md" disabled={ loading } onClick={ handleCancelSelection }>{ translation('key_cancel') }</button>
              <button className="btn btn-primary md" onClick={ handleConfirmSubmit } disabled={ loading }>
                { loading ? translation('key_processing') + '…' : translation('key_submit_refund_request') }
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

InitiateRefund.propTypes = {
  invoiceData: PropTypes.object,
  selectionType: PropTypes.string,
  submitAction: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  disabledValues: PropTypes.arrayOf(PropTypes.string),
  invoiceCurrentJobInfo: PropTypes.any,
  contractFormInfo: PropTypes.any,
  totalRefundAmount: PropTypes.any,
  refundItems: PropTypes.any,
  items: PropTypes.any,
  handleCancelSelection: PropTypes.func
};

InitiateRefund.defaultProps = {
  invoiceData: null,
  selectionType: "",
  onSuccess: null,
  disabledValues: [],
  totalRefundAmount: null,
  refundItems: null,
  items: null,
};

export default React.memo(InitiateRefund);