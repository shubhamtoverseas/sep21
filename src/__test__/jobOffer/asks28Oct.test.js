/* eslint-env jest */
jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

import { applicantStageBadge, JO_APPLICANT_STAGE, JO_STAGE_ID } from "../../Views/Pages/JobOfferPage/jobOfferConstants";
import { nonReporteeScope } from "../../Views/Pages/Calendar/newui/useCalendarData";
import catalogue from "../../Views/Pages/SettingsPage/newui/users/permissions/permissionCatalogue.json";

describe("ask 9 · U-0259 / backend 326 — Offer is modelled on applicant_stage, not a numeric stage", () => {
    test("a Completed row with applicant_stage 'offer' reads Offer; any other row keeps the server's stage name", () => {
        expect(applicantStageBadge({ job_stage_status_id: JO_STAGE_ID.COMPLETED, job_stage_status_name: "Completed", applicant_stage: JO_APPLICANT_STAGE.OFFER }))
            .toEqual({ labelKey: "key_offer", className: "offer" });
        expect(applicantStageBadge({ job_stage_status_id: JO_STAGE_ID.COMPLETED, job_stage_status_name: "Completed", applicant_stage: "completed" }))
            .toEqual({ label: "Completed", className: "completed" });
        expect(applicantStageBadge({ job_stage_status_id: JO_STAGE_ID.MATCHED, job_stage_status_name: "Matched" }))
            .toEqual({ label: "Matched", className: "matched" });
    });
});

describe("ask 4 · backend 328 — Interpreter / CS Assistant filters are two CSV grants", () => {
    test("the four bindings are CSV owner / all on their key (never RADIO)", () => {
        const b = catalogue.bindings;
        expect(b["worker.filter_interpreter_owner|single"]).toMatchObject({ model: "CSV", apiKey: "worker_global_interpreter", value: "owner" });
        expect(b["worker.filter_interpreter_all_staff|single"]).toMatchObject({ model: "CSV", apiKey: "worker_global_interpreter", value: "all" });
        expect(b["contracts.filter_assistant_owner|single"]).toMatchObject({ model: "CSV", apiKey: "contract_global_cs_assistant", value: "owner" });
        expect(b["contracts.filter_assistant_all_staff|single"]).toMatchObject({ model: "CSV", apiKey: "contract_global_cs_assistant", value: "all" });
        expect(Object.values(b).filter((x) => x.model === "RADIO" && ["worker_global_interpreter", "contract_global_cs_assistant"].includes(x.apiKey))).toHaveLength(0);
    });
});

describe("sheet §12 · U-0181 / backend 312 — calendar_non_reportees: y = everyone, a CSV of user ids = that scope", () => {
    test("scopes", () => {
        expect(nonReporteeScope("y")).toEqual({ all: false, ids: new Set() });   /* U-0407: the legacy everyone fallback is gone */
        expect(nonReporteeScope("12, 34,x")).toEqual({ all: false, ids: new Set(["12", "34"]) });
        expect(nonReporteeScope("n")).toEqual({ all: false, ids: new Set() });
        expect(nonReporteeScope(undefined)).toEqual({ all: false, ids: new Set() });
    });
});

describe("U-0133 (21 Oct) — Invited applicants on Job Offer Details for a Worker Chat — Invited holder", () => {
    const { applicantStageIds, visibleApplicantRows } = require("../../Views/Pages/JobOfferPage/jobOfferConstants");
    test("the Invited chip joins the pipeline first only with the grant; Suggested rows never show here", () => {
        expect(applicantStageIds(false)).toEqual([JO_STAGE_ID.APPLIED, JO_STAGE_ID.MATCHED, JO_STAGE_ID.PENDING, JO_STAGE_ID.UPCOMING, JO_STAGE_ID.COMPLETED, JO_STAGE_ID.CANCELLED]);
        expect(applicantStageIds(true)[0]).toBe(JO_STAGE_ID.INVITED);
        const rows = [{ id: 1, job_stage_status_id: JO_STAGE_ID.INVITED }, { id: 2, job_stage_status_id: JO_STAGE_ID.SUGGESTED }, { id: 3, job_stage_status_id: JO_STAGE_ID.MATCHED }];
        expect(visibleApplicantRows(rows, false).map((r) => r.id)).toEqual([3]);
        expect(visibleApplicantRows(rows, true).map((r) => r.id)).toEqual([1, 3]);
    });
});
