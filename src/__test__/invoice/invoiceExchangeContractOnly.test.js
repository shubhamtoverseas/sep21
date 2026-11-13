import fs from "fs";
import path from "path";

/* Exchange is a Contract invoice action only (user 13 Oct: "standalone invoice does not allow exchange … contract invoice
   will allow exchange"; domain APPLIES.exchange). The Standalone detail screen offered its own Exchange button. */

const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
const STANDALONE = "Views/Pages/Invoice/general/PaymentTypeInvoice.js";
const CONTRACT = "Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js";

describe("Exchange is offered on Contract invoices only", () => {
    test("the Standalone detail screen has no Exchange button, popup or worker picker", () => {
        const src = read(STANDALONE);
        for (const gone of ["canExchange", "InitiateExchangePopup", "setIsInitiateExchangePopup", "handleSelectWorker",
            "select-contract-exchange", "currentInvoiceInfo", "key_blocked_exchange_refund_pending"]) {
            expect(src).not.toContain(gone);
        }
        // Refund and Void stay in the Lifecycle group
        expect(src).toMatch(/if \(!canRefund && !voidAction\) return null;/);
        expect(src).toContain("setOnRefundPopup(true)");
    });

    test("the Contract detail screen still starts an Exchange", () => {
        const src = read(CONTRACT);
        expect(src).toContain("InitiateExchangePopup");
        expect(src).toContain("select-contract-exchange");
    });
});
