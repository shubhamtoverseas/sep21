const invoiceRoutes = {
  invoices: "/invoices",
  /* S10 (D7): the deep-link entry by reference (or record id); resolves to the record's screen */
  invoiceRecord: "invoices/:invoice_ref",
  addContractInvoice: "invoices/add-contract-invoice",
  selectEmployer: "invoices/add-contract-invoice/select-employer",
  editEmployerDetailsOfInvoice: "invoices/add-contract-invoice/select-employer/employer-details/:employer_id",
  addEmployerDetailsOfInvoice: "invoices/add-contract-invoice/select-employer/employer-details/",
  invoiceReview: "invoices/add-contract-invoice/invoice-review",
  paymentTypeInvoice: "invoices/add-contract-invoice/payment-type-invoice/:invoice_id",
  addContractInvoiceForm: "invoices/add-contract-invoice/form",
  selectWorker: "invoices/add-contract-invoice/select-worker",
  editWorkerDetailsOfInvoice: "invoices/add-contract-invoice/select-worker/worker-details/:worker_id",
  addWorkerDetailsOfInvoice: "invoices/add-contract-invoice/select-employer/worker-details/",
  refundInvoice: "invoices/add-contract-invoice/refund-invoice/:invoice_id",
  selectContractExchange: "invoices/exchange/select-contract-exchange",
  addContractInvoiceExchange: "invoices/exchange/add-contract-invoice-exchange",
  exchangeInvoiceReview: "invoices/exchange/exchange-invoice-review",
  exchangePaymentInvoice: "invoices/add-contract-invoice/exchange-payment-review/:invoice_id",
  exchangePaymentTypeInvoice: "invoices/add-contract-invoice/exchange-payment-type-invoice/:invoice_id",
  /**general routes */
  addContractInvoiceGeneral: "invoices/general/add-contract-invoice/:selection_type",

  invoiceReviewGeneral: "invoices/general/invoice-review",
  paymentTypeInvoiceGeneral: "invoices/general/payment-type-invoice/:invoice_id",
  addContractInvoiceFormGeneral: "invoices/general/form",

  refundInvoiceGeneral: "invoices/general/refund-invoice/:invoice_id",
  exchangePaymentInvoiceGeneral: "invoices/general/exchange-payment-review/:invoice_id",
  invoiceGeneralPDFGenerator: "invoices/general/invoice-pdf-generator/:invoice_id",
  invoiceContractPDFGenerator: "invoices/contract/invoice-pdf-generator/:invoice_id",
};

export default invoiceRoutes;
