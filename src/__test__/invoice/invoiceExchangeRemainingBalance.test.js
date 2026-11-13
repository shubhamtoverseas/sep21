import fs from "fs";
import path from "path";

/* The exchange screens collect a remaining balance with the one Pay Remaining Balance action (v4 B-8) and the same
   modal as the invoice payment screen (its payload is the Payment Method Selector's), so the API receives the E4 methods,
   the Approval Code and payment_attachment for proof methods. */

const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/Invoice", rel), "utf8");
const SCREENS = [
    "add-contract-invoice/exchangePaymentReview.js",
    "add-contract-invoice/ExchangePaymentInvoice.js",
    "general/exchangePaymentReview.js",
];

test.each(SCREENS)("%s pays the remaining balance through Pay Remaining Balance", (rel) => {
    const src = read(rel);
    expect(src).toMatch(/<PayRemainingBalanceAction invoiceData=\{ invoiceDetails \}[^>]*submitAction=\{ payRemainingBalance \}/);
    expect(src).not.toMatch(/PaymentMethodSelector/);
    expect(src).not.toMatch(/TransactionTimeCodePopup|invoiePaymentTypesTrans|handleSubmitInvoiceForm/);
});
