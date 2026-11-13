import fs from "fs";
import path from "path";

/* The payment method selector records payments only (Step 8 F7; CLAUDE.md §5). Its refund branches (fullRefund,
   partialRefund, fullRefundGeneral, partialRefundGeneral) were dead: no screen passed those selection types — refunds go
   through the Refund modal and the exchange refund panel — and the payloads they built (gross line amounts, no
   refund_option) would now be refused by /add-refund. */

const selector = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/Invoice/payment-method-selector/PaymentMethodSelector.js"), "utf8");

test("the refund branches, their props and the proof-linking path they needed are gone", () => {
    for (const dead of ["fullRefund", "partialRefund", "fullRefundGeneral", "partialRefundGeneral", "refund_payment_method", "LINK_PROOF_AFTER_FLOWS",
        "isCreateFlow", "totalRefundAmount", "refundItems", "uploadInvoicePaymentAttachment"]) {
        expect([dead, selector.includes(dead)]).toEqual([dead, false]);
    }
    // every flow it serves carries the proof in its own request (the shared payment entry form uploads it first)
    expect(selector).toMatch(/entry\.submit\(\{/);
    const entry = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/Invoice/payment-method-selector/PaymentEntry.js"), "utf8");
    expect(entry).toMatch(/payload\.payment_attachment = uploadedAttachment;/);
});

test("no screen passes a refund selection type to it", () => {
    const pages = path.resolve(__dirname, "../../Views");
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
    const hosts = walk(pages).filter((f) => f.endsWith(".js") && fs.readFileSync(f, "utf8").includes("<PaymentMethodSelector"));
    expect(hosts.length).toBeGreaterThan(0);
    for (const host of hosts) {
        const text = fs.readFileSync(host, "utf8");
        expect([host, /selectionType=\{?\s*"(fullRefund|partialRefund|fullRefundGeneral|partialRefundGeneral)"/.test(text)]).toEqual([host, false]);
    }
});
