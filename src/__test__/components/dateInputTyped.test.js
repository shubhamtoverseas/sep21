/* eslint-env jest */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import DateInput from "../../components/ui/DateInput";

jest.mock("../../components/Icon/Icon", () => () => null);

/* 3 Nov (Mubin): the Sent On field accepted "sdasdasd"; the kit date input now lets only digits and "/" through */
describe("DateInput typed text", () => {
    test("letters are dropped, a full DD/MM/YYYY still reaches onChange as YYYY-MM-DD", () => {
        const onChange = jest.fn();
        render(<DateInput id="d" value="" onChange={ onChange } />);
        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "sdasdasd" } });
        expect(input.value).toBe("");
        expect(onChange).not.toHaveBeenCalledWith(expect.stringMatching(/\d/));
        fireEvent.change(input, { target: { value: "0a3/1b1/2026xyz" } });
        expect(input.value).toBe("03/11/2026");
        expect(onChange).toHaveBeenLastCalledWith("2026-11-03");
    });
    test("typed text is cut at the format length", () => {
        render(<DateInput id="d" value="" onChange={ () => {} } />);
        const input = screen.getByRole("textbox");
        fireEvent.change(input, { target: { value: "03/11/202699" } });
        expect(input.value).toBe("03/11/2026");
    });
});
