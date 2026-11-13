/* eslint-env jest */
import fs from "fs";
import path from "path";
import { FEEDBACK_CODE_KEYS, FEEDBACK_USER_TYPE_KEYS } from "../../Views/Pages/reports/reportConstants";

const src = fs.readFileSync(path.join(__dirname, "../../Views/Pages/reports/feedback-report/FeedbackDetailDialog.js"), "utf8");

/* user 1 Nov: the feedback entry shows read-only facts (no inputs) and names the user type and code */
describe("Feedback detail dialog", () => {
    test("renders read values, not inputs", () => {
        expect(src).not.toMatch(/TextInput|TextArea|readOnly/);
        expect(src).toMatch(/className=\{ `rpt-read/);
    });
    test("shows user type and code", () => {
        expect(src).toMatch(/translation\("key_user_type"\)/);
        expect(src).toMatch(/translation\("key_code"\)/);
        expect(FEEDBACK_USER_TYPE_KEYS.employer).toBe("key_employer");
        expect(FEEDBACK_USER_TYPE_KEYS.worker).toBe("key_worker");
        expect(FEEDBACK_CODE_KEYS).toContain("feedbackByUser.workerModel.reference_id");
    });
});
