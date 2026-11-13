/**
 * Adjust supplement (R-K1, QA-27-035): Reduce and Waive need a reason here as they do on the server, so the panel cannot apply
 * without one and does not ask the server about a choice it would refuse.
 */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { AdjustSupplementPanel } from "../../Views/Pages/Invoice/add-contract-invoice/ItemsPanels";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("../../components/ui/Modal", () => ({ __esModule: true, default: ({ title, children, footer }) => <div role="dialog" aria-label={ title }>{ children }{ footer }</div> }));

const LINE = { id: "experience", kind: "experience", itemType: "Conditional item", label: "Experience supplement", original: 1400, steps: [] };
const CHOICES = { deductions: {}, skills: [], experience: { decision: "keep" } };
const ANSWER = { lines: [{ ...LINE, net: 0, steps: [{ label: "Waived", amount: 1400 }] }], problems: [], notes: [] };

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
const settle = () => act(async () => { jest.advanceTimersByTime(300); await Promise.resolve(); });

it("Waive: no question to the server and no Apply until the reason is there", async () => {
    const ask = jest.fn(async () => ANSWER);
    const onApply = jest.fn();
    render(<AdjustSupplementPanel line={ LINE } result={ { promotions: [] } } choices={ CHOICES } ask={ ask } onApply={ onApply } onClose={ jest.fn() } />);
    await settle();
    ask.mockClear();
    fireEvent.click(screen.getByLabelText("key_inv_waive"));
    await settle();
    expect(ask).not.toHaveBeenCalled();
    expect(screen.getByText("key_apply").closest("button")).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/key_reason/), { target: { value: "   " } });
    await settle();
    expect(ask).not.toHaveBeenCalled();
    expect(screen.getByText("key_apply").closest("button")).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/key_reason/), { target: { value: "Agreed with employer" } });
    await settle();
    expect(ask).toHaveBeenCalledTimes(1);
    expect(ask.mock.calls[0][0].experience).toEqual({ decision: "waive", reason: "Agreed with employer" });
    expect(screen.getByText("key_apply").closest("button")).toBeEnabled();
});

it("Reduce: the amount alone is not enough", async () => {
    const ask = jest.fn(async () => ANSWER);
    render(<AdjustSupplementPanel line={ LINE } result={ { promotions: [] } } choices={ CHOICES } ask={ ask } onApply={ jest.fn() } onClose={ jest.fn() } />);
    await settle();
    ask.mockClear();
    fireEvent.click(screen.getByLabelText("key_inv_reduce"));
    fireEvent.change(screen.getByLabelText(/key_inv_reduce_by/), { target: { value: "300" } });
    await settle();
    expect(ask).not.toHaveBeenCalled();
    expect(screen.getByText("key_apply").closest("button")).toBeDisabled();
});
