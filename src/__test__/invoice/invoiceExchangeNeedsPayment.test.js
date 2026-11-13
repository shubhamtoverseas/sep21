import fs from "fs";
import path from "path";
import { exchangeNeedsPayment } from "../../utils/utils";

/* Exchange needs a confirmed payment on the original invoice (10 Oct register #71): while the Invoice API's Paid for it
   (`refundable.paid`, the figure the exchange credit is reckoned from) is HK$0, the contract detail screen shows Exchange
   blocked with its reason, and /add-exchange refuses it. */

const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));

test("blocked only when the API reports Paid HK$0", () => {
    expect(exchangeNeedsPayment({ refundable: { paid: 0, amount: 0 } })).toBe(true);
    expect(exchangeNeedsPayment({ refundable: { paid: 1000, amount: 0 } })).toBe(false); // fully refunded: Paid stays, the credit is HK$0
    expect(exchangeNeedsPayment({ refundable: { paid: 1000, amount: 1000 } })).toBe(false);
    expect(exchangeNeedsPayment({})).toBe(false); // no figure from the API: the API still decides
    expect(exchangeNeedsPayment(null)).toBe(false);
});

test("the contract detail screen blocks Exchange with the reason", () => {
    const src = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js"), "utf8");
    expect(src).toMatch(/const noPayment = exchangeNeedsPayment\(invoiceDetails\);\s+const exchangeBlocked = isExchange \|\| hasPendingRefund \|\| noPayment;/);
    expect(src).toMatch(/: t\('key_blocked_exchange_no_confirmed_payment'\);/);
    expect(EN.key_blocked_exchange_no_confirmed_payment).toBe("Blocked — no confirmed payment on this invoice");
});
