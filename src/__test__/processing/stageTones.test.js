/* eslint-env jest */
jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

import { compactToken, isTerminalToken, toneFor } from "../../Views/Pages/Contract/dashboard/contractDashboardUtils";
import { stageToken } from "../../components/Processing/StageTitle";
import { activityDotTone, activityStage } from "../../Views/Pages/Contract/details/contractRecordUtils";
import { CD_STAGE, CD_TOKEN, CD_TOKEN_PURPLE, CD_TONE } from "../../Views/Pages/Contract/contractConstants";

/* U-0424..U-0430 (PROCESS.md 271-272) overlay the 29 Oct prototype tones: purple = Consulate Ready to Submit + Visa
   Authorization Ready; orange = Immigration Ready to Submit, Consulate Submitted, Ref Released, Check Up Completed */
describe("Contract stage tones follow the prototype TONE rule", () => {
    test("resolution order: Not Ready red, Not Required gray, terminal green, blue set, teal set, else orange", () => {
        expect(toneFor(CD_STAGE.VISA, CD_TOKEN.NOT_READY)).toBe(CD_TONE.RED);
        expect(toneFor(CD_STAGE.INSURANCE, CD_TOKEN.NOT_REQUIRED)).toBe(CD_TONE.GRAY);
        expect(toneFor(CD_STAGE.IMMIGRATION, CD_TOKEN.SUBMITTED)).toBe(CD_TONE.GREEN);   /* terminal for Immigration */
        expect(toneFor(CD_STAGE.CONSULATE, CD_TOKEN.SUBMITTED)).toBe(CD_TONE.ORANGE);    /* U-0425 */
        expect(toneFor(CD_STAGE.CONSULATE, CD_TOKEN.RETURNED)).toBe(CD_TONE.GREEN);
        expect(toneFor(CD_STAGE.CONSULATE, CD_TOKEN.READY_TO_SUBMIT)).toBe(CD_TONE.PURPLE); /* U-0424 */
        expect(toneFor(CD_STAGE.IMMIGRATION, CD_TOKEN.READY_TO_SUBMIT)).toBe(CD_TONE.ORANGE); /* U-0426 */
        expect(toneFor(CD_STAGE.VISA, CD_TOKEN.AUTH_READY)).toBe(CD_TONE.PURPLE);         /* U-0427 */
        expect(toneFor(CD_STAGE.VISA, CD_TOKEN.REF_RELEASED)).toBe(CD_TONE.ORANGE);       /* U-0428 */
        expect(toneFor(CD_STAGE.MEDICAL, CD_TOKEN.CHECKUP_COMPLETED)).toBe(CD_TONE.ORANGE); /* U-0428 / U-0430 */
        expect(toneFor(CD_STAGE.VISA, CD_TOKEN.VISA_RELEASED)).toBe(CD_TONE.GREEN);
        expect(toneFor(CD_STAGE.DEPLOYMENT, CD_TOKEN.FLIGHT_BOOKED)).toBe(CD_TONE.TEAL);
        expect(toneFor(CD_STAGE.VISA, "Something New")).toBe(CD_TONE.ORANGE);
        expect(CD_TOKEN_PURPLE).toEqual([CD_TOKEN.AUTH_READY]);
    });
    test("the record's stageToken agrees with the dashboard (label override path)", () => {
        expect(stageToken(CD_STAGE.VISA, null, CD_TOKEN.AUTH_READY).tone).toBe(CD_TONE.PURPLE);
        expect(stageToken(CD_STAGE.VISA, null, CD_TOKEN.NOT_READY).tone).toBe(CD_TONE.RED);
        expect(stageToken(CD_STAGE.VISA, null, CD_TOKEN.VISA_RELEASED).tone).toBe(CD_TONE.GREEN);
    });
});

describe("Activity dot = tone of the new status (prototype logEv), gray otherwise", () => {
    test("stage from the message, status from current_status", () => {
        expect(activityDotTone({ message: "Changed Consulate status from Submitted to Returned", current_status: "returned" })).toBe(CD_TONE.GREEN);
        expect(activityDotTone({ message: "Changed Consulate status from Ready to submit to Submitted", current_status: "submitted" })).toBe(CD_TONE.ORANGE); /* U-0425 */
        expect(activityDotTone({ message: "Changed Immigration status from Ready to submit to Submitted", current_status: "submitted" })).toBe(CD_TONE.GREEN);
        expect(activityDotTone({ message: "Changed Consulate status from Not ready to Ready to submit", current_status: "ready_to_submit" })).toBe(CD_TONE.PURPLE); /* U-0424 */
        expect(activityDotTone({ message: "Changed Visa status from Ready to submit to Not ready", current_status: "not_ready" })).toBe(CD_TONE.RED);
    });
    test("stage from the entry type; status parsed from the message when current_status is missing; other events gray", () => {
        expect(activityStage({ type: "immigration", message: "x" })).toBe("immigration");
        expect(activityStage({ message: "Changed Consulate status from A to B" })).toBe(CD_STAGE.CONSULATE);
        expect(activityDotTone({ type: "e_visa", message: "Visa · E-Visa set to Visa Released", current_status: "visa_released" })).toBe(CD_TONE.GREEN);
        expect(activityDotTone({ message: "Changed Consulate status from Submitted to Returned" })).toBe(CD_TONE.GREEN);
        expect(activityDotTone({ message: "Updated the Consulate Checklist", current_status: "submitted" })).toBe(CD_TONE.GRAY);
        expect(activityDotTone({ message: "Uploaded Passport copy" })).toBe(CD_TONE.GRAY);
    });
});


describe("Server stage token aliases (prototype TOKEN_EXPAND / COMPACT_STATUS)", () => {
    test("'Authorization Ready' from the list API is the blue Auth Ready token, compact on the card; 'Released' is Visa terminal", () => {
        expect(toneFor(CD_STAGE.VISA, "Authorization Ready")).toBe(CD_TONE.PURPLE); /* U-0427 */
        expect(toneFor(CD_STAGE.VISA, "Auth Ready")).toBe(CD_TONE.PURPLE);
        expect(compactToken("Authorization Ready")).toBe("Auth Ready");
        expect(compactToken(CD_TOKEN.AUTH_READY)).toBe("Auth Ready");
        expect(compactToken(CD_TOKEN.VISA_RELEASED)).toBe("Released");
        expect(isTerminalToken(CD_STAGE.VISA, "Released")).toBe(true);
        expect(toneFor(CD_STAGE.VISA, "Released")).toBe(CD_TONE.GREEN);
        expect(stageToken(CD_STAGE.VISA, null, "Authorization Ready").tone).toBe(CD_TONE.PURPLE);
    });
});
