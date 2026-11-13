/* eslint-env jest */
import fs from "fs";
import path from "path";
import { nonReporteeScope } from "../../Views/Pages/Calendar/newui/useCalendarData";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(__dirname, "../../", rel));

describe("Conflict sheet list B2 (answers of 29 Oct) — wave 1", () => {
    test("U-0417 · the New Employer dialog has no Send Registration Link and the employer modal is gone", () => {
        expect(read("Views/Pages/Employer/newui/NewEmployerModal.js")).not.toMatch(/key_send_registration_link|onSendRegLink/);
        expect(exists("Views/Pages/Employer/newui/SendRegLinkModal.js")).toBe(false);
        expect(read("Views/Pages/Employer/newui/EmployerDashboard.js")).not.toMatch(/SendRegLinkModal|regLinkDefaults/);
        expect(read("Views/Pages/JobOfferPage/newui/dashboard/JobOfferDashboard.js")).not.toMatch(/SendRegLinkModal|regLinkDefaults/);
    });
    test("U-0422 · worker biodata carries no separate Termination Reason", () => {
        for (const rel of ["Views/Pages/WorkerPage/worker-detail/profile-tab/biodata-tab/WorkExperienceBiodataForm.js", "Views/Pages/WorkerPage/worker-detail/profile-tab/biodata-tab/BiodataForm.js", "Views/Pages/WorkerPage/worker-detail/profile-tab/biodata-tab/BiodataView.js", "services/workerBiodataService.js"]) {
            /* the payload still deletes a stored terminated_reason key before sending; the controls and loads are gone */
            expect(read(rel)).not.toMatch(/terminationReasons|fetchTerminationReason|register\("terminated_reason"\)|shouldShowTerminationReason|requiredFields\.push\('terminated_reason'\)|handleManualError\("terminated_reason"\)/);
        }
        expect(read("components/ReusableComponents/form-states.js")).not.toMatch(/preferred_interview_locations: \[\],\s*terminated_reason/);
    });
    test("U-0407 · the calendar non-reportee scope is an explicit id list only", () => {
        expect(nonReporteeScope("y")).toEqual({ all: false, ids: new Set() });
        expect(nonReporteeScope("12,34")).toEqual({ all: false, ids: new Set(["12", "34"]) });
        expect(read("Views/Pages/Calendar/newui/calendarConstants.js")).not.toMatch(/CAL_SCOPE_ALL/);
    });
    test("U-0408 / U-0419 / U-0423 · guards are in place", () => {
        expect(read("Views/Pages/WorkerPage/update-worker/EditWorker.js")).toMatch(/isOverseas && saved\.mobile\?\.number && !String\(data\.mobile_number/);
        expect(read("Views/Pages/Employer/newui/EmployerDashboard.js")).toMatch(/dashboard\.setFilter\("district", kept\)/);
        expect(read("Views/Pages/Employer/newui/details/tabs/EmployerDetailsTab.js")).toMatch(/grants\.basicView && <EmdCard title=\{ translation\('key_address'\) \} onAdd=\{ grants\.basicEdit/);
    });
});
