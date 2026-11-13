/* eslint-env jest */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

import { StatusMenu } from "../../components/Processing/newui/StagePanel";
import { isCurrentStatusOption } from "../../Views/Pages/Contract/contractConstants";

const options = [{ id: 1, name: "Not Ready", enable: true }, { id: 2, name: "Letter of Authorization Ready", enable: true }];

describe("Status menu: the current status option is checked and inert (Mubin 29 Oct, prototype menuHTML)", () => {
    test("matches the stored status by id, by slug, by name, or by the slug's token label", () => {
        expect(isCurrentStatusOption(options[1], 2)).toBe(true);
        expect(isCurrentStatusOption(options[1], "2")).toBe(true);
        expect(isCurrentStatusOption(options[1], "letter_of_authorization_ready")).toBe(true);
        expect(isCurrentStatusOption(options[0], "not_ready")).toBe(true);
        expect(isCurrentStatusOption({ id: 7, name: "Visa Ref. No. Released" }, "visa_reference_number_released")).toBe(true);
        expect(isCurrentStatusOption(options[0], "letter_of_authorization_ready")).toBe(false);
        expect(isCurrentStatusOption(options[0], null)).toBe(false);
    });
    test("a slug current: the matching item is aria-checked with the tick, clicking it does nothing, the other item picks", () => {
        const onPick = jest.fn();
        render(<StatusMenu stage="authorization_letter" options={ options } current="letter_of_authorization_ready" onPick={ onPick } />);
        fireEvent.click(screen.getByRole("button", { name: /key_change_status/ }));
        const items = screen.getAllByRole("menuitemradio");
        expect(items[1]).toHaveAttribute("aria-checked", "true");
        expect(items[1].querySelector(".g1-menu-check")).not.toBeNull();
        expect(items[0]).toHaveAttribute("aria-checked", "false");
        fireEvent.click(items[1]);
        expect(onPick).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole("button", { name: /key_change_status/ }));
        fireEvent.click(screen.getAllByRole("menuitemradio")[0]);
        expect(onPick).toHaveBeenCalledWith(1, "Not Ready", true);
    });
});
