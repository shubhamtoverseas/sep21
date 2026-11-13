/* eslint-env jest */
import React from "react";
import { render } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

import LeaveTypeForm from "../../Views/Pages/SettingsPage/newui/leave-policy/LeaveTypeForm";
import configData from "../../components/ReusableComponents/app-configs";
import { LEAVE_EXPIRY_REF_YEAR } from "../../Views/Pages/SettingsPage/newui/settingsNewUiConstants";

/* Shubham 6 Nov: Expiry Type = Date picks a recurring Month + Day only (no year) and 29 Feb is never selectable */
describe("Leave Policy expiry date is a Month + Day pair", () => {
    const editData = { ...configData.leavePolicyFormsConfig, expiry_value_limit: "y", expiry_type: "date", expiry_in_days: "2024-02-29" };
    test("no year control, February offers 28 days, a stored 29 Feb never round-trips", () => {
        const { container } = render(<LeaveTypeForm editData={ editData } onSubmitRow={ () => {} } onDiscard={ () => {} } />);
        /* the old full-date picker is gone */
        expect(container.querySelector(".react-datepicker-wrapper")).toBeNull();
        const [monthSel, daySel] = container.querySelectorAll('select[aria-label="key_expiry_date"]');
        expect(monthSel.value).toBe("2");                      /* stored Feb parses */
        expect(daySel.querySelectorAll("option").length).toBe(29);   /* placeholder + 28 days — no 29 Feb */
        expect([...daySel.querySelectorAll("option")].map((o) => o.value)).not.toContain("29");
        expect(Number(LEAVE_EXPIRY_REF_YEAR) % 4).not.toBe(0);  /* the sentinel year stays non-leap */
    });
});
