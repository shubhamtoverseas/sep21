/* eslint-env jest */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import SearchSelect from "../../components/ui/SearchSelect";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

/* the kit searchable select (Change Interpreter / Change CS Owner, 26 Oct): options with a workload / branch sub-line, a
   disabled "current" row, the host's empty-state text instead of a silent empty list */
const options = [
    { value: "1", label: "Ian Chan", sub: "Central · current", isDisabled: true },
    { value: "2", label: "Linda Wong", sub: "is currently assigned for 3 workers from 2 job offers" },
];

describe("SearchSelect", () => {
    it("lists the options with their sub-line and keeps the disabled row unpickable", () => {
        const onChange = jest.fn();
        render(<SearchSelect inputId="pick" value="" options={ options } onChange={ onChange } />);
        fireEvent.keyDown(screen.getByRole("combobox"), { key: "ArrowDown" });
        expect(screen.getByText("Linda Wong")).toBeInTheDocument();
        expect(screen.getByText("is currently assigned for 3 workers from 2 job offers")).toBeInTheDocument();
        fireEvent.click(screen.getByText("Ian Chan"));
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.click(screen.getByText("Linda Wong"));
        expect(onChange).toHaveBeenCalledWith("2");
    });

    it("typing filters client-side; the host's empty-state text shows when nothing matches", () => {
        render(<SearchSelect inputId="pick" value="" options={ options } onChange={ () => {} } noOptionsMessage="No eligible interpreter" />);
        fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzz" } });
        expect(screen.getByText("No eligible interpreter")).toBeInTheDocument();
    });
});
