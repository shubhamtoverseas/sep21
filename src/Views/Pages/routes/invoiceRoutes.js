import { createElement, lazy } from "react";
import routes from "./routesConfig/index";
import { withInvoiceCreateGate, withInvoiceRecordGate, withInvoiceViewGate } from "../Invoice/InvoiceRecordGate";

/* A Standalone Invoice is created by the Contract Invoice creation stages in their Standalone mode (INV-G2 … G4), at the
   /invoices/general/ routes (route segment unchanged, register #27). */
const standalone = (load) => lazy(() => load().then((m) => ({ default: (props) => createElement(m.default, { ...props, mode: "standalone" }) })));
/* An Exchange is created by the same stages in their Exchange mode (INV-X2 … X4), at the /invoices/exchange/ routes (route
   segments unchanged): no second wizard, items table or review. */
const exchange = (load) => lazy(() => load().then((m) => ({ default: (props) => createElement(m.default, { ...props, mode: "exchange" }) })));

const Invoice = lazy(() => import("../Invoice/Invoice"));
/* QA-27 ruling 10: the keys POST /invoices/price and /add check for each kind of invoice */
const CONTRACT_CREATE_KEYS = ["contract_invoice_add_from_invoice_global", "contract_invoice_add_from_contract_global"];
const STANDALONE_CREATE_KEYS = ["general_invoice_add_from_contract_global"];
const EXCHANGE_CREATE_KEYS = ["invoice_exchange"];

const AddContractInvoice = withInvoiceCreateGate(lazy(() => import("../Invoice/add-contract-invoice/AddContractInvoice")), CONTRACT_CREATE_KEYS);
const SelectEmployer = lazy(() => import("../Invoice/add-contract-invoice/SelectEmployer"));
const AddWorkerDetailsOfInvoice = lazy(() => import("../Invoice/add-contract-invoice/AddWorkerDetailsOfInvoice"));
const AddEmployerDetailsOfInvoice = lazy(() => import("../Invoice/add-contract-invoice/AddEmployerDetailsOfInvoice"));
const InvoiceReview = withInvoiceCreateGate(lazy(() => import("../Invoice/add-contract-invoice/InvoiceReview")), CONTRACT_CREATE_KEYS);
const PaymentTypeInvoice = withInvoiceViewGate(lazy(() => import("../Invoice/add-contract-invoice/PaymentTypeInvoice")), { insuranceCard: true });
const ContractInvoiceItems = withInvoiceCreateGate(lazy(() => import("../Invoice/add-contract-invoice/ContractInvoiceItems")), CONTRACT_CREATE_KEYS);
const SelectWorker = lazy(() => import("../Invoice/add-contract-invoice/SelectWorker"));
const RefundInvoice = withInvoiceViewGate(lazy(() => import("../Invoice/add-contract-invoice/RefundInvoice")));
const SelectContractExchange = withInvoiceCreateGate(exchange(() => import("../Invoice/add-contract-invoice/AddContractInvoice")), EXCHANGE_CREATE_KEYS);
const AddContractInvoiceExchange = withInvoiceCreateGate(exchange(() => import("../Invoice/add-contract-invoice/ContractInvoiceItems")), EXCHANGE_CREATE_KEYS);
const ExchangeInvoiceReview = withInvoiceCreateGate(exchange(() => import("../Invoice/add-contract-invoice/InvoiceReview")), EXCHANGE_CREATE_KEYS);
const ExchangePaymentReview = withInvoiceViewGate(lazy(() => import("../Invoice/add-contract-invoice/exchangePaymentReview")));
const ExchangePaymentTypeInvoice = withInvoiceViewGate(lazy(() => import("../Invoice/add-contract-invoice/ExchangePaymentInvoice")), { insuranceCard: true });
/**general routes */
const AddContractInvoiceGeneral = withInvoiceCreateGate(standalone(() => import("../Invoice/add-contract-invoice/AddContractInvoice")), STANDALONE_CREATE_KEYS);
const InvoiceReviewGeneral = withInvoiceCreateGate(standalone(() => import("../Invoice/add-contract-invoice/InvoiceReview")), STANDALONE_CREATE_KEYS);
const PaymentTypeInvoiceGeneral = withInvoiceViewGate(lazy(() => import("../Invoice/general/PaymentTypeInvoice")), { insuranceCard: true });
const AddContractInvoiceFormGeneral = withInvoiceCreateGate(standalone(() => import("../Invoice/add-contract-invoice/ContractInvoiceItems")), STANDALONE_CREATE_KEYS);
const RefundInvoiceGeneral = withInvoiceViewGate(lazy(() => import("../Invoice/general/RefundInvoice")));
const ExchangePaymentReviewGeneral = withInvoiceViewGate(lazy(() => import("../Invoice/general/exchangePaymentReview")));
const InvoiceGeneralPdfGenerator = withInvoiceRecordGate(lazy(() => import("../Invoice/InvoiceGeneralPdfGenerator")));
const InvoiceContractPdfGenerator = withInvoiceRecordGate(lazy(() => import("../Invoice/InvoiceContractPdfGenerator")));
const InvoiceRecordResolver = lazy(() => import("../Invoice/InvoiceRecordResolver"));

/* Screens addressed by :invoice_id open through withInvoiceRecordGate (sheet row 8: a direct URL to a record this user
   may not open shows "This record is not available."); the seven detail screens through withInvoiceViewGate, which reads
   their view (performance track A-10; insuranceCard: the screen shows the Insurance card, read in parallel). */
const invoiceRoutes = [
  { path: routes.invoices, component: Invoice, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.invoiceRecord, component: InvoiceRecordResolver, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.addContractInvoice, component: AddContractInvoice, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.selectEmployer, component: SelectEmployer, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.addWorkerDetailsOfInvoice, component: AddWorkerDetailsOfInvoice, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.editWorkerDetailsOfInvoice, component: AddWorkerDetailsOfInvoice, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.editEmployerDetailsOfInvoice, component: AddEmployerDetailsOfInvoice, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.addEmployerDetailsOfInvoice, component: AddEmployerDetailsOfInvoice, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.invoiceReview, component: InvoiceReview, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.paymentTypeInvoice, component: PaymentTypeInvoice, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.exchangePaymentTypeInvoice, component: ExchangePaymentTypeInvoice, moduleKey: "invoice", permissionKey: "invoice_access" },

  { path: routes.addContractInvoiceForm, component: ContractInvoiceItems, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.selectWorker, component: SelectWorker, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.refundInvoice, component: RefundInvoice, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.selectContractExchange, component: SelectContractExchange, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.addContractInvoiceExchange, component: AddContractInvoiceExchange, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.exchangeInvoiceReview, component: ExchangeInvoiceReview, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.exchangePaymentInvoice, component: ExchangePaymentReview, moduleKey: "invoice", permissionKey: "invoice_access" },

  /**general routes */
  { path: routes.addContractInvoiceGeneral, component: AddContractInvoiceGeneral, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.invoiceGeneralPDFGenerator, component: InvoiceGeneralPdfGenerator, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.invoiceContractPDFGenerator, component: InvoiceContractPdfGenerator, moduleKey: "invoice", permissionKey: "invoice_access" },

  { path: routes.invoiceReviewGeneral, component: InvoiceReviewGeneral, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.paymentTypeInvoiceGeneral, component: PaymentTypeInvoiceGeneral, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.addContractInvoiceFormGeneral, component: AddContractInvoiceFormGeneral, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.refundInvoiceGeneral, component: RefundInvoiceGeneral, moduleKey: "invoice", permissionKey: "invoice_access" },
  { path: routes.exchangePaymentInvoiceGeneral, component: ExchangePaymentReviewGeneral, moduleKey: "invoice", permissionKey: "invoice_access" },

];

export default invoiceRoutes;
