import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent, within } from "@testing-library/react";

/* Saved credit (Saved Credit rules, 22 Oct 2026): the picker inside invoice creation applies a saved Exchange credit or an
   expired Reservation Fee's credit in full or in part; what stays is kept (the default) or, with the Write Off key, a
   reason and a confirmation showing the exact amount, written off. The payload carries the amount applied, the choice,
   and for a write-off its confirmed amount and reason; one request key per invoice being created makes a retry safe. */

const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));

let mockPermissions = [];
let mockCreditList = {};
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({
    useDispatch: () => mockDispatch,
    useSelector: (select) => select({ users: { permissionList: { data: mockPermissions } }, invoices: { employerCreditList: mockCreditList } }),
}));
jest.mock("react-i18next", () => {
    const copy = JSON.parse(require("fs").readFileSync(require("path").resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
    return {
        useTranslation: () => ({
            t: (key, params = {}) => String(copy[key] ?? key).replace(/{{(\w+)}}/g, (m, name) => (params[name] === undefined ? m : params[name])),
        }),
    };
});
jest.mock("../../redux/Slices/invoices/InvoicesSlice", () => ({ fetchEmployerCreditList: (payload) => ({ type: "credits", payload }) }));
jest.mock("../../services/commonService", () => ({
    getPermissionValue: (list, moduleId, key) => (list.some((p) => p === key) ? "y" : ""),
}));

const {
    CreditRows, CreditControls, appliedCreditsProblem, buildApplyCreditsPayload, creditOverCap, creditRemainder, sumAppliedCredits,
} = require("../../Views/Pages/Invoice/AppliedCreditsRows");

/* the rules' example: a HK$5,000 saved Exchange credit, HK$2,000 applied */
const credit = (over = {}) => ({
    id: 31, employer_id: 273, credit_type: "exchange_surplus", amount: 2000, available: 5000, remainder: "keep",
    write_off_amount: null, write_off_reason: "", _reference: "I-HKH000432(E)", _name: "Ana Cruz", ...over,
});

const renderRows = (credits, onChange = jest.fn()) => render(
    <table><tbody><CreditRows appliedCredits={ credits } onRemove={ jest.fn() } onChange={ onChange } /></tbody></table>
);

test("the copy of the choice comes from the rules: Keep for future invoices (Default) / Write off remaining credit", () => {
    expect(EN.key_keep_for_future_invoices).toBe("Keep for future invoices");
    expect(EN.key_write_off_remaining_credit).toBe("Write off remaining credit");
    expect(EN.key_saved_credit_applied).toBe("Applied");
    expect(EN.key_saved_credit_written_off).toBe("Written off");
    expect(EN.key_default).toBe("Default");
});

test("Keep (default): HK$2,000 applied from HK$5,000 shows Applied 2,000 · Written off 0 · Available 3,000", () => {
    mockPermissions = ["invoice_write_off"];
    renderRows([credit()]);
    expect(screen.getByRole("radio", { name: /Keep for future invoices/ })).toBeChecked();
    expect(screen.getByText(/Applied HK\$2,000 · Written off HK\$0 · Available HK\$3,000/)).toBeInTheDocument();
    expect(creditRemainder(credit())).toBe(3000);
});

test("Write off needs the key: without it the choice is disabled", () => {
    mockPermissions = [];
    renderRows([credit()]);
    expect(screen.getByRole("radio", { name: /Write off remaining credit/ })).toBeDisabled();
});

test("Write off asks for a reason and confirms the exact amount; the row then shows HK$3,000 written off", () => {
    mockPermissions = ["invoice_write_off"];
    const onChange = jest.fn();
    renderRows([credit()], onChange);
    fireEvent.click(screen.getByRole("radio", { name: /Write off remaining credit/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Write off the remaining HK\$3,000 of credit from I-HKH000432\(E\)/)).toBeInTheDocument();
    const confirm = within(dialog).getByRole("button", { name: "Write off HK$3,000" });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: "Employer left" } });
    fireEvent.click(confirm);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 31 }),
        { remainder: "write_off", write_off_amount: 3000, write_off_reason: "Employer left" });
});

test("a new amount resets a confirmed write-off (its confirmation was for the old remainder)", () => {
    mockPermissions = ["invoice_write_off"];
    const onChange = jest.fn();
    renderRows([credit({ remainder: "write_off", write_off_amount: 3000, write_off_reason: "Employer left" })], onChange);
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "2500" } });
    expect(onChange).toHaveBeenCalledWith(expect.anything(), { amount: 2500, remainder: "keep", write_off_amount: null, write_off_reason: "" });
});

test("nothing left on the credit: no remainder choice", () => {
    renderRows([credit({ amount: 5000 })]);
    expect(screen.queryByRole("radio")).toBeNull();
});

test("the payload: the amount applied and the choice; a write-off adds its confirmed amount and reason", () => {
    expect(buildApplyCreditsPayload([credit()])).toEqual([{ amount: 2000, id: 31, employer_id: 273, credit_type: "exchange_surplus", remainder: "keep" }]);
    expect(buildApplyCreditsPayload([credit({ remainder: "write_off", write_off_amount: 3000, write_off_reason: " Employer left " })])).toEqual([{
        amount: 2000, id: 31, employer_id: 273, credit_type: "exchange_surplus", remainder: "write_off", write_off_amount: 3000, write_off_reason: "Employer left",
    }]);
    expect(sumAppliedCredits([credit(), credit({ id: 32, amount: 300 })])).toBe(2300);
});

test("before sending: an amount of HK$0 or above what is available, or a write-off without its reason or for another remainder, is stopped", () => {
    expect(appliedCreditsProblem([credit()])).toBeNull();
    expect(appliedCreditsProblem([credit({ amount: 0 })])).toBe("key_saved_credit_amount_invalid");
    expect(appliedCreditsProblem([credit({ amount: 5000.01 })])).toBe("key_saved_credit_amount_invalid");
    expect(appliedCreditsProblem([credit({ remainder: "write_off", write_off_amount: 3000, write_off_reason: "" })])).toBe("key_write_off_remaining_credit_unconfirmed");
    expect(appliedCreditsProblem([credit({ remainder: "write_off", write_off_amount: 2500, write_off_reason: "x" })])).toBe("key_write_off_remaining_credit_unconfirmed");
    expect(appliedCreditsProblem([credit({ remainder: "write_off", write_off_amount: 3000, write_off_reason: "x" })])).toBeNull();
});

test("a credit the invoice no longer takes in full is named with what it can take now (credits in the order applied, :436)", () => {
    expect(creditOverCap([credit({ amount: 2000 })], 2500)).toBeNull();
    expect(creditOverCap([credit({ amount: 2000 })], 1500)).toEqual({ credit: expect.objectContaining({ id: 31 }), max: 1500 });
    // the second credit gets what the first leaves
    expect(creditOverCap([credit({ amount: 1000 }), credit({ id: 32, amount: 800 })], 1500)).toEqual({ credit: expect.objectContaining({ id: 32 }), max: 500 });
    expect(creditOverCap([credit({ amount: 1000 }), credit({ id: 32, amount: 500 })], 1500)).toBeNull();
    expect(creditOverCap([], 0)).toBeNull();
});

test("the picker lists each credit with what it has available and adds it for no more than the invoice still takes", () => {
    mockCreditList = {
        exchange_surplus: [{ id: 31, invoice_number: "I-HKH000432(E)", amount: "5000.00", available_amount: 3000, "workersModel.name": "Ana", "workersModel.surname": "Cruz" }],
        reservation_fee_expired: [],
    };
    const onApply = jest.fn();
    render(<CreditControls employerId={ 273 } appliedCredits={ [] } capacity={ 1200 } onApply={ onApply } />);
    const select = screen.getAllByRole("combobox")[1];
    expect(within(select).getByRole("option", { name: "I-HKH000432(E) · Ana Cruz · HK$3,000" })).toBeInTheDocument();
    fireEvent.change(select, { target: { value: "31" } });
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ id: 31, amount: 1200, available: 3000, remainder: "keep", employer_id: 273 }));
});

test("the create forms apply credit on Invoice items, keep its request key with the draft, and send both from the read-only Review", () => {
    /* Contract and Standalone Invoice creation apply credit on Invoice items (package requirements :434, :544; inline,
       product 3 Nov 2026, OP-27-140): the shared items stage holds the pickers and the rows and keeps the key with the draft */
    const items = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/Invoice/add-contract-invoice/ContractInvoiceItems.js"), "utf8");
    expect(items).toMatch(/<CreditControls /);
    expect(items).toMatch(/<CreditRows /);
    expect(items).toContain("setInvoiceContractItemsList({ ...stored, creditRequestKey, appliedCredits: next })");
    /* Invoice Review is read-only (:546): no picker and no editable row; it sends the draft's credits and their key */
    const review = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/Invoice/add-contract-invoice/InvoiceReview.js"), "utf8");
    expect(review).not.toMatch(/CreditControls|CreditRows/);
    expect(review).toContain("apply_credits: buildApplyCreditsPayload(appliedCredits)");
    expect(review).toContain("credit_request_key: creditRequestKey");
    /* an Exchange applies no saved credit (OP-27-108; INV-X3): its items are the stage above, and the old exchange items
       screen that applied it is gone */
    expect(fs.existsSync(path.resolve(__dirname, "../../Views/Pages/Invoice/exchange/addContractInvoiceExchange.js"))).toBe(false);
});
