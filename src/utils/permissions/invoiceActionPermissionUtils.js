import { getPermissionValue, isAdminUser } from '../../services/commonService';

/* PK-01 P1-19 (INVOICE-017, register #82; owner 5 Nov 2026): an Invoice Detail action is shown only to a holder of the key the
   contract API checks for it (contract 18a6258); hiding is the convenience, the server's refusal is the rule. A payment proof
   takes the catalogue's multi-value form (a CSV of view / upload / replace / delete) on top of the route's key; a Cash deposit
   receipt and refund documentation keep the route's key alone. */
const GRANTED = 'y';
const ALL_TOKENS = 'all';

export const INVOICE_REMARKS_PERMISSION_KEYS = Object.freeze([['invoice', 'invoice_remarks']]);

/** The invoice_payment_proof tokens held */
export const paymentProofTokens = (permissionList) =>
  new Set(String(getPermissionValue(permissionList?.data, 'invoice', 'invoice_payment_proof') || '').split(',').map((token) => token.trim()).filter(Boolean));

export const getInvoiceActionPermissions = (permissionList) => {
  if (isAdminUser()) {
    return { canPrintCustomerPrintout: true, canRemark: true, canPayRemainingBalance: true, canApprovePayment: true, proofTokens: ALL_TOKENS, canViewPaymentProof: true };
  }
  const granted = (key) => getPermissionValue(permissionList?.data, 'invoice', key) === GRANTED;
  const proofTokens = paymentProofTokens(permissionList);
  return {
    canPrintCustomerPrintout: granted('invoice_print_customer_printout'),
    canRemark: granted('invoice_remarks'),
    canPayRemainingBalance: granted('invoice_pay_remaining_balance'),
    canApprovePayment: granted('invoice_approve_payment'),
    proofTokens,
    /* OP-PK01-03: a payment proof's file, as the contract detail hands it out — Invoice Access AND (view token OR Approve Payment) */
    canViewPaymentProof: granted('invoice_access') && (proofTokens.has('view') || granted('invoice_approve_payment')),
  };
};

/** Upload / Replace under Pay Remaining Balance, Delete under Approve Payment (OP-V2-05); a proof also needs that token */
export const paymentDocumentActions = (permissions, isProof) => {
  /* OP-PK01-03: without the right to view proofs nothing is offered for a proof: the server hides whether one is on file */
  if (isProof && !permissions.canViewPaymentProof) return { canUpload: false, canReplace: false, canDelete: false };
  const holds = (token) => !isProof || permissions.proofTokens === ALL_TOKENS || permissions.proofTokens.has(token);
  return {
    canUpload: permissions.canPayRemainingBalance && holds('upload'),
    canReplace: permissions.canPayRemainingBalance && holds('replace'),
    canDelete: permissions.canApprovePayment && holds('delete'),
  };
};

export const useInvoiceActionPermissions = (permissionList) =>
  getInvoiceActionPermissions(permissionList);
