import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

/* The invoice-list payment-method filter (Payment Method Rules v4 C-3, B-11, B-12; OP-PM-03; Step 8 F1): it offers the
   Invoice API catalogue's 11 methods under their current names (was: 11 stored values with retired labels — "FPS
   Terminal", "WeChat Pay", "Alipay", "Union Pay", "Credit Card" — and no Visa, Mastercard or Apple Pay). The API matches
   each method to what invoice rows store (maidmatch-contract tests/invoice.list.payment.filter.test.ts). */

const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
const ZH_HK = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/zh_HK/translation.json"), "utf8"));
const contractDir = process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract");
const hasContract = fs.existsSync(path.join(contractDir, "src/domain/invoice/paymentMethods.ts"));

jest.mock("../../utils/translation", () => {
    const copy = JSON.parse(require("fs").readFileSync(require("path").resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
    const t = (key) => copy[key] ?? key;
    return { __esModule: true, default: t, translation: t };
});
jest.mock("../../services/invoices", () => ({ getPaymentMethodCatalogueAPI: jest.fn() }));
const { paymentMethodLabel } = require("../../Views/Pages/Invoice/payment-method-selector/paymentMethodCatalogue");

describe("invoice list: payment-method filter", () => {
    test("the options are the catalogue's methods, in its order, under their catalogue names", () => {
        const filter = read("Views/Pages/Invoice/InvoiceFilter.js");
        expect(filter).toMatch(/const \{ catalogue: paymentCatalogue \} = usePaymentMethodCatalogue\(\);/);
        expect(filter).toMatch(/\(paymentCatalogue\?\.methods \|\| \[\]\)\.map\(\(m\) => \(\{ value: m\.code, label: translation\(m\.labelKey\) \}\)\)/);
        expect(filter).not.toMatch(/invoiePaymentTypes/);
        expect(read("components/ReusableComponents/constants.js")).not.toMatch(/invoiePaymentTypes/);
    });

    (hasContract ? test : test.skip)("the API's catalogue: 11 methods, each with a current name", () => {
        const catalogue = JSON.parse(execFileSync(process.execPath, ["-r", "ts-node/register/transpile-only", "-e",
            "process.stdout.write(JSON.stringify(require('./src/domain/invoice/paymentMethods').paymentMethodCatalogue()))"],
        { cwd: contractDir, encoding: "utf8" }));
        expect(catalogue.methods.map((m) => m.code)).toEqual(["visa", "mastercard", "union_pay", "apple_pay", "alipay_hk", "wechat_pay_hk",
            "bank_transfer", "fps", "cheque", "payme", "cash"]);
        expect(catalogue.methods.map((m) => EN[m.labelKey])).toEqual(["Visa", "Mastercard", "UnionPay", "Apple Pay", "AlipayHK", "WeChat Pay HK",
            "Bank Transfer", "FPS", "Cheque", "PayMe", "Cash"]);
    });

    test("a filter saved before the 11 methods shows its stored value under the current name", () => {
        expect(read("Views/Pages/Invoice/InvoiceFilter.js")).toMatch(/\{ key: 'payment_method', k: 'Method', options: paymentMethodOptions, labelOf: paymentMethodLabel \}/);
        expect(paymentMethodLabel("bank_in")).toBe(EN.key_pm_bank_transfer);
        expect(paymentMethodLabel("fps_terminal")).toBe(EN.key_pm_fps);
        expect(paymentMethodLabel("wechat_pay")).toBe(EN.key_pm_wechat_pay_hk);
    });

    test("the old filter's labels (retired names) are gone", () => {
        for (const key of ["key_union_pay", "key_bank_in", "key_cash", "key_cheque", "key_fps_direct", "key_fps_terminal", "key_wechat_pay", "key_alipay",
            "key_payme", "key_fps"]) {
            expect([key, EN[key], ZH_HK[key]]).toEqual([key, undefined, undefined]);
        }
        // still used for a stored card payment with no network
        expect(EN.key_credit_card).toBeTruthy();
    });
});
