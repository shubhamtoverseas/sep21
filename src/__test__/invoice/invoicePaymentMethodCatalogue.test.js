import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

/* Payment method catalogue (Payment Method Rules v4, 9 Oct 2026 — section A, B-2, B-3, B-4, B-12, B-13, C-3, C-11).
   The selector renders exactly what the Invoice API defines (maidmatch-contract src/domain/invoice/paymentMethods.ts);
   the fixture below is read from that file, not copied. Needs the maidmatch-contract checkout next to this repo
   (or CONTRACT_API_DIR); without it the parity suite is skipped. */

const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
const ZH = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/zh_HK/translation.json"), "utf8"));

const contractDir = process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract");
const domainFile = path.join(contractDir, "src/domain/invoice/paymentMethods.ts");
const hasContract = fs.existsSync(domainFile);

/* The API payload, parsed from the contract domain file */
const contractCatalogue = () => {
    const src = fs.readFileSync(domainFile, "utf8");
    const groupBlock = src.slice(src.indexOf("export const PAYMENT_METHOD_GROUPS"), src.indexOf("const CARD_FIELDS"));
    const groups = [...groupBlock.matchAll(/\{ code: "([a-z_]+)", label: "([^"]+)", labelKey: "([a-z_]+)" \}/g)]
        .map((m) => ({ code: m[1], label: m[2], labelKey: m[3] }));
    const methodBlock = src.slice(src.indexOf("export const PAYMENT_METHOD_CATALOGUE"), src.indexOf("const TIER_OF_FORM"));
    const methods = [...methodBlock.matchAll(/\{ code: "([a-z_]+)", label: "([^"]+)", labelKey: "([a-z_]+)", tier: (\d), group: "([a-z_]+)", form: "([a-z]+)", cardNetwork: (?:"([a-z]+)"|null),[\s\S]*?bornStatus: "([a-z_]+)"/g)]
        .map((m) => ({ code: m[1], label: m[2], labelKey: m[3], tier: Number(m[4]), group: m[5], form: m[6], cardNetwork: m[7] || null, bornStatus: m[8] }));
    const aliasBlock = src.slice(src.indexOf("export const LEGACY_PAYMENT_METHOD"), src.indexOf("const CARD_TYPE"));
    const aliases = Object.fromEntries([...aliasBlock.matchAll(/(\w+): "(\w+)"/g)].map((m) => [m[1], m[2]]));
    return { groups, methods, aliases };
};

jest.mock("../../utils/translation", () => {
    const copy = JSON.parse(require("fs").readFileSync(require("path").resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
    const t = (key) => copy[key] ?? key;
    return { __esModule: true, default: t, translation: t };
});
jest.mock("react-redux", () => ({ useDispatch: () => jest.fn(() => Promise.resolve({})) }));
jest.mock("../../redux/Slices/invoices/InvoicesSlice", () => ({ uploadInvoicePaymentAttachment: jest.fn() }));
jest.mock("../../services/commonService", () => ({ uploadFile: jest.fn() }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../components/ui/DateInput", () => () => null);
jest.mock("../../services/invoices", () => ({ getPaymentMethodCatalogueAPI: jest.fn() }));

const { getPaymentMethodCatalogueAPI } = require("../../services/invoices");
const PaymentMethodSelector = require("../../Views/Pages/Invoice/payment-method-selector/PaymentMethodSelector").default;
const { paymentMethodLabel, STORED_METHOD_ALIASES } = require("../../Views/Pages/Invoice/payment-method-selector/paymentMethodCatalogue");

(hasContract ? describe : describe.skip)("payment method catalogue parity with the Invoice API", () => {
    const catalogue = hasContract ? contractCatalogue() : null;

    /* CRA resets mock implementations before every test */
    beforeEach(() => {
        // field and file rules are covered by invoicePaymentFields / invoicePaymentDocuments; here they only need to be present
        getPaymentMethodCatalogueAPI.mockResolvedValue({ data: { data: { ...catalogue, fieldRules: {}, methodFields: {}, proofFile: {} } } });
    });

    test("the API defines 11 methods in 4 groups; Visa, Mastercard and UnionPay are separate (C-3)", () => {
        expect(catalogue.methods.map((m) => m.code)).toEqual(
            ["visa", "mastercard", "union_pay", "apple_pay", "alipay_hk", "wechat_pay_hk", "bank_transfer", "fps", "cheque", "payme", "cash"]);
        expect(catalogue.groups.map((g) => g.code)).toEqual(["card_terminal", "wallet", "proof_review", "deferred_receipt"]);
    });

    test("every method and group label the API names exists in the admin copy", () => {
        [...catalogue.methods, ...catalogue.groups].forEach((m) => expect(EN[m.labelKey]).toBe(m.label));
    });

    /* the payment panel once its catalogue is in (it opens on Visa) */
    const renderPanel = async () => {
        const view = render(<PaymentMethodSelector submitAction={ jest.fn() } invoiceData={ { payment_type: "full" } } />);
        await waitFor(() => expect(screen.getByLabelText(EN.key_payment_method).value).toBe("visa"));
        return view;
    };
    const pick = (code) => fireEvent.change(screen.getByLabelText(EN.key_payment_method), { target: { value: code } });

    test("the Payment Method list holds exactly the catalogue: each group, then its methods in order (B-2)", async () => {
        const { container } = await renderPanel();
        const rendered = [];
        container.querySelectorAll("#pe-method optgroup").forEach((group) => {
            rendered.push(`# ${ group.label }`);
            group.querySelectorAll("option").forEach((option) => rendered.push(option.textContent));
        });
        const expected = catalogue.groups.flatMap((g) => [`# ${g.label}`, ...catalogue.methods.filter((m) => m.group === g.code).map((m) => m.label)]);
        expect(rendered).toEqual(expected);
    });

    test("changing the method clears every field (B-3)", async () => {
        await renderPanel();
        fireEvent.change(screen.getByPlaceholderText("1234"), { target: { value: "4242" } });
        expect(screen.getByPlaceholderText("1234").value).toBe("4242");
        pick("mastercard");
        expect(screen.getByPlaceholderText("1234").value).toBe("");
    });

    test("AlipayHK / WeChat Pay HK: 'Confirm QR Payment' with the Transaction Reference only, no card fields (B-4)", async () => {
        const { container } = await renderPanel();
        const panel = container.querySelector(".pms-wrap");
        for (const code of ["alipay_hk", "wechat_pay_hk"]) {
            pick(code);
            expect(within(panel).getByRole("button", { name: EN.key_confirm_qr_payment })).toBeTruthy();
            expect(EN.key_confirm_qr_payment).toBe("Confirm QR Payment");
            expect(within(panel).getByText(EN.key_transaction_reference)).toBeTruthy();
            expect(within(panel).queryByPlaceholderText("1234")).toBeNull();
            expect(within(panel).queryByPlaceholderText("HH:MM:SS")).toBeNull();
        }
    });

    test("stored historical values show under their current name with the same aliases as the API (B-12)", () => {
        expect(STORED_METHOD_ALIASES).toEqual(catalogue.aliases);
        expect(paymentMethodLabel("fps_terminal")).toBe("FPS");
        expect(paymentMethodLabel("fps_direct")).toBe("FPS");
        expect(paymentMethodLabel("bank_in")).toBe("Bank Transfer");
        expect(paymentMethodLabel("wechat_pay")).toBe("WeChat Pay HK");
        expect(paymentMethodLabel("credit_card", "master_card")).toBe("Mastercard");
        expect(paymentMethodLabel("credit_card")).toBe(EN.key_credit_card);
    });
});

describe("zh-HK labels (B-13, C-11)", () => {
    test("the approved labels are used exactly", () => {
        expect({
            fps: ZH.key_pm_fps, bankTransfer: ZH.key_pm_bank_transfer, cash: ZH.key_pm_cash, cheque: ZH.key_pm_cheque,
            paymentMethod: ZH.key_payment_method, cardNetwork: ZH.key_card_network, approvalCode: ZH.key_approval_code,
            transactionReference: ZH.key_transaction_reference, cardLast4: ZH.key_card_last_4, bank: ZH.key_bank,
            uploadProof: ZH.key_upload_payment_proof, viewProof: ZH.key_view_proof, replaceProof: ZH.key_replace_proof,
            deleteProof: ZH.key_delete_proof, uploadDepositReceipt: ZH.key_upload_deposit_receipt, approvePayment: ZH.key_approve_payment,
        }).toEqual({
            fps: "轉數快", bankTransfer: "銀行轉帳", cash: "現金", cheque: "支票", paymentMethod: "付款方式", cardNetwork: "卡組織",
            approvalCode: "授權碼", transactionReference: "交易編號", cardLast4: "卡號末四位", bank: "銀行", uploadProof: "上載證明",
            viewProof: "查看證明", replaceProof: "更換證明", deleteProof: "刪除證明", uploadDepositReceipt: "上載存款收據", approvePayment: "批准付款",
        });
    });

    test("the seven method names without approved Chinese carry none (they fall back to English)", () => {
        ["key_pm_visa", "key_pm_mastercard", "key_pm_union_pay", "key_pm_apple_pay", "key_pm_alipay_hk", "key_pm_wechat_pay_hk", "key_pm_payme", "key_union_pay"]
            .forEach((k) => expect(ZH[k]).toBeUndefined());
    });
});
