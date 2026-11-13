import React from "react";
import i18n from "i18next";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import en from "../../../public/locales/en/translation.json";
import { fmtDateLong, fmtDateShort, fmtDateTime } from "../../Views/Pages/insurance/dashboard/insuranceDashboardConfig";
import { getInsuranceColumns } from "../../Views/Pages/insurance/dashboard/insuranceDashboardColumns";
import DiscloseValue from "../../Views/Pages/insurance/dashboard/DiscloseValue";

/* Activity time (verification 15 Oct, group 5C): one Hong Kong day rule for display and filtering (ACT #19, FN-236); the exact
   time disclosed on pointer hover and keyboard focus (ACT #80, FN-253) */

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

describe("Hong Kong day and clock (ACT #19)", () => {
    it("shows an instant on the Hong Kong calendar and clock, whatever the browser zone", () => {
        expect(fmtDateTime("2026-10-15T16:30:00Z")).toBe("16/10/26 00:30");
        expect(fmtDateLong("2026-10-15T16:30:00Z")).toBe("16/10/2026");
        expect(fmtDateShort("2026-10-15T15:59:00Z")).toBe("15/10/26");
        expect(fmtDateTime("2026-01-01T00:05:00.000Z")).toBe("01/01/26 08:05");
    });

    it("leaves a plain date as it is, and an empty or invalid value empty", () => {
        expect(fmtDateShort("2026-10-15")).toBe("15/10/26");
        expect(fmtDateLong("2026-02-28")).toBe("28/02/2026");
        expect(fmtDateTime(null)).toBe("");
        expect(fmtDateLong("not a date")).toBe("");
    });
});

describe("exact Activity time on hover and keyboard focus (ACT #80)", () => {
    it("discloses the value in a tooltip on focus and hides it on blur", () => {
        render(<DiscloseValue full="16/10/26 00:30" label="Activity">2 hours ago</DiscloseValue>);
        const value = screen.getByText("2 hours ago");
        expect(value.getAttribute("tabindex")).toBe("0");
        expect(value.getAttribute("aria-label")).toBe("Activity: 16/10/26 00:30");
        expect(screen.queryByRole("tooltip")).toBeNull();
        fireEvent.focus(value);
        const tip = screen.getByRole("tooltip");
        expect(tip.textContent).toBe("16/10/26 00:30");
        expect(value.getAttribute("aria-describedby")).toBe(tip.id);
        fireEvent.blur(value);
        expect(screen.queryByRole("tooltip")).toBeNull();
        fireEvent.mouseEnter(value);
        expect(screen.getByRole("tooltip")).toBeTruthy();
        fireEvent.mouseLeave(value);
        expect(screen.queryByRole("tooltip")).toBeNull();
    });

    it("the Activity column uses it with the Hong Kong exact time; no activity shows a dash", () => {
        const [activity] = getInsuranceColumns(["activity"]);
        const { container } = render(<MemoryRouter>{activity.render({ lastActivityAt: "2026-10-15T16:30:00Z" })}</MemoryRouter>);
        fireEvent.focus(container.querySelector("[tabindex='0']"));
        expect(screen.getByRole("tooltip").textContent).toBe("16/10/26 00:30");
        const empty = render(<MemoryRouter>{activity.render({ lastActivityAt: null })}</MemoryRouter>);
        expect(empty.container.textContent).toBe("—");
    });
});
