import React from "react";
import fs from "fs";
import path from "path";
import { render, screen } from "@testing-library/react";

/* FPS and PayMe record what the v4 table lists — their reference and the proof (Payment Method Rules v4 A; OP-PM-46;
   Step 8 F11). The "Payer info" input they showed was never sent, so what staff typed was lost; it is gone until C-5
   decides the Employer FPS Identifier. */

const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
const ZH_HK = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/zh_HK/translation.json"), "utf8"));

jest.mock("../../utils/translation", () => {
    const copy = JSON.parse(require("fs").readFileSync(require("path").resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
    const t = (key) => copy[key] ?? key;
    return { __esModule: true, default: t, translation: t };
});
jest.mock("../../components/ui/DateInput", () => () => null);
jest.mock("../../services/invoices", () => ({ getPaymentMethodCatalogueAPI: jest.fn() }));
const PaymentFields = require("../../Views/Pages/Invoice/payment-method-selector/PaymentFields").default;

const method = (value) => ({ value, label: value, tier: 2, type: "off", proof: "required" });

test.each([["fps", "key_fps_reference"], ["payme", "key_payme_reference"]])("%s: its reference and the proof, no Payer info", (value, referenceKey) => {
    render(<PaymentFields resolvedMethod={ method(value) } formData={ {} } updateField={ jest.fn() } />);
    expect(screen.getAllByText(EN[referenceKey]).length).toBeGreaterThan(0);
    expect(screen.getByText(EN.key_proof_of_payment)).toBeTruthy();
    expect(screen.queryByText("Payer info")).toBeNull();
    expect(screen.queryByPlaceholderText("Mobile number or display name")).toBeNull();
    expect(document.querySelectorAll("input").length).toBe(2); // the reference and the proof picker
});

test("the Payer info copy is gone", () => {
    for (const key of ["key_payer_info", "key_mobile_number_or_display_name"]) expect([key, EN[key], ZH_HK[key]]).toEqual([key, undefined, undefined]);
    expect(fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/Invoice/payment-method-selector/PaymentFields.js"), "utf8")).not.toMatch(/payer_info/);
});
