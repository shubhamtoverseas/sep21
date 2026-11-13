/* eslint-disable react/prop-types, react/display-name -- test-only mock components */
/* eslint-env jest */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Controller, useForm } from "react-hook-form";
import BranchHoursGrid from "../../Views/Pages/SettingsPage/newui/branches/BranchHoursGrid";

/* Settings optimisation M-9: the hours grid watches only its 14 hour fields, so typing in any other field of the
   branch form (or of an agency's inline branch) no longer re-renders the 7 day cards and their 14 time pickers;
   "Copy from previous" still copies the previous day's times, including times set after the form opened. */
let timeInputRenders = 0;
jest.mock("../../components/ui/TimeInput", () => {
    const MockTimeInput = ({ id, value, disabled, onChange }) => {
        timeInputRenders += 1;
        return (
            <input
                data-testid={id}
                disabled={disabled}
                value={value ? new Date(value).toISOString() : ""}
                onChange={(event) => onChange(event.target.value ? new Date(event.target.value) : null)}
            />
        );
    };
    return { __esModule: true, default: MockTimeInput };
});

const sundayStart = new Date(2026, 0, 4, 9, 0, 0, 0);
const sundayEnd = new Date(2026, 0, 4, 17, 30, 0, 0);
const mondayStart = new Date(2026, 0, 5, 8, 0, 0, 0);
const mondayEnd = new Date(2026, 0, 5, 16, 0, 0, 0);

let formApi = null;
const Harness = ({ prefix }) => {
    const withPrefix = (key) => (prefix ? `${prefix}.${key}` : key);
    const defaults = { branch_name: "", off_days: [1, 2, 3], sunday_branch_operating_start_time: sundayStart, sunday_branch_operating_end_time: sundayEnd };
    const form = useForm({ defaultValues: prefix ? { branch_data: [defaults] } : defaults });
    formApi = form;
    return (
        <form>
            <Controller name={withPrefix("branch_name")} control={form.control} render={({ field }) => <input aria-label="branch name" {...field} />} />
            <BranchHoursGrid
                control={form.control}
                namePrefix={prefix}
                idPrefix="t"
                errors={{}}
                setValue={form.setValue}
                clearErrors={form.clearErrors}
            />
        </form>
    );
};

const typeInto = (input, text) => {
    for (let i = 1; i <= text.length; i += 1) {
        act(() => { fireEvent.change(input, { target: { value: text.slice(0, i) } }); });
    }
};

describe.each([
    ["Add / Edit Branch (flat form)", "", (key) => key],
    ["Add Agency inline branch", "branch_data[0]", (key) => `branch_data.0.${key}`],
])("BranchHoursGrid in %s", (_label, prefix, path) => {
    beforeEach(() => { timeInputRenders = 0; formApi = null; });

    it("typing in a non-hour field does not re-render the time pickers", () => {
        render(<Harness prefix={prefix} />);
        const rendersAfterMount = timeInputRenders;
        expect(rendersAfterMount).toBeGreaterThanOrEqual(14);
        typeInto(screen.getByLabelText("branch name"), "Branch name typed");
        expect(formApi.getValues(path("branch_name"))).toBe("Branch name typed");
        expect(timeInputRenders).toBe(rendersAfterMount);
    });

    it("Copy from previous still copies the previous day's times", () => {
        render(<Harness prefix={prefix} />);
        const copyButtons = screen.getAllByRole("button");
        act(() => { fireEvent.click(copyButtons[0]); });
        expect(formApi.getValues(path("monday_branch_operating_start_time"))).toEqual(sundayStart);
        expect(formApi.getValues(path("monday_branch_operating_end_time"))).toEqual(sundayEnd);
        expect(screen.getByTestId("t-monday-start").value).toBe(sundayStart.toISOString());
    });

    it("Copy from previous copies times set after the form opened", () => {
        render(<Harness prefix={prefix} />);
        act(() => { fireEvent.change(screen.getByTestId("t-monday-start"), { target: { value: mondayStart.toISOString() } }); });
        act(() => { fireEvent.change(screen.getByTestId("t-monday-end"), { target: { value: mondayEnd.toISOString() } }); });
        const tuesdayCopy = screen.getAllByRole("button")[1];
        expect(tuesdayCopy.disabled).toBe(false);
        act(() => { fireEvent.click(tuesdayCopy); });
        expect(formApi.getValues(path("tuesday_branch_operating_start_time"))).toEqual(mondayStart);
        expect(formApi.getValues(path("tuesday_branch_operating_end_time"))).toEqual(mondayEnd);
        expect(screen.getByTestId("t-tuesday-end").value).toBe(mondayEnd.toISOString());
    });
});
