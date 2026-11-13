/* eslint-env jest */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("../../utils/translation", () => ({ __esModule: true, default: (key) => key, translation: (key) => key }));
jest.mock("../../services/commonService", () => ({
    ...jest.requireActual("../../services/commonService"),
    getCurrentUser: () => ({ data: { staff: { staff_type: "internal", is_cs: true, id: 1 } } }),
    isAdminUser: () => false,
}));

const { applicantActions } = require("../../Views/Pages/JobOfferPage/newui/record/joApplicantActions");
const { JO_ACTION, JO_STAGE_ID, JO_INTERVIEW_KEY } = require("../../Views/Pages/JobOfferPage/jobOfferConstants");
const { resolveTarget, familyOf } = require("../../Views/Pages/Notifications/newui/notificationModel");
const { NOTIFICATION_TARGET } = require("../../Views/Pages/Notifications/notificationConstants");
const JoSuggestSuggested = require("../../Views/Pages/JobOfferPage/newui/suggest/JoSuggestSuggested").default;

const allPerms = { canScheduleInterview: true, canMarkAsNotInterested: true, canDoInstantInterview: true, canInterviewAgain: true, canExtendInterview: true, canStartGroupChat: true, canAddNewContract: true, canFollowUp: true, canViewInterviewReport: true, canRescheduleFor: () => true };

describe("U-0389 — a Declined (Not Interested) row offers no Undo", () => {
    test("the action vocabulary has no Undo Not Interested and no Cancel Suggestion", () => {
        expect(JO_ACTION.UNDO_NOT_INTERESTED).toBeUndefined();
        expect(JO_ACTION.CANCEL_SUGGESTION).toBeUndefined();
        expect(JO_INTERVIEW_KEY.CANCEL_SUGGESTION).toBeUndefined();
    });
    test("a Not Interested row gets only Follow Up even with every grant", () => {
        const items = applicantActions({ job_stage_status_id: JO_STAGE_ID.NOT_INTERESTED, cs_owner_id: 1 }, allPerms, {});
        expect(items.map((i) => i.id)).toEqual([JO_ACTION.FOLLOW_UP]);
    });
});

describe("U-0150 — the Suggested list is read-only outcome tracking", () => {
    test("a row the server marks cancel_suggestion renders no Cancel Suggestion control and no actions column", () => {
        const suggested = { rows: [{ id: 5, name: "Jam", reference_id: "LITR000687", type_display: "Local", interview_key: "cancel_suggestion" }], loading: false, error: false, total: 1, totalPages: 1 };
        render(<JoSuggestSuggested suggested={ suggested } page={ 1 } onPage={ () => {} } onBack={ () => {} } canOpenWorker={ false } onOpenWorker={ () => {} } />);
        expect(screen.queryByText("key_cancel_suggestion")).toBeNull();
        expect(screen.queryByText("key_actions")).toBeNull();
        expect(screen.getByText("LITR000687")).toBeInTheDocument();
    });
});

describe("U-0154 — unresolved interview families stay disabled, no substituted destination", () => {
    test.each(["upcoming_interview", "upcoming_interview_instant", "worker_no_show", "interview_cancelled_by_worker"])("%s has no registry row and resolves to unavailable even with a worker and a job id", (type) => {
        expect(familyOf({ type })).toBeNull();
        expect(resolveTarget({ type, worker_id: 12, job_id: 329, rel_id: 7 }, { data: [] })).toBeNull();
    });
    test("the dual target is gone from the target set; the mapped variants still route", () => {
        expect(NOTIFICATION_TARGET.WORKER_OR_JOB_OFFER).toBeUndefined();
        expect(resolveTarget({ type: "interview_cancelled_by_admin_to_cs", job_id: 329 }, { data: [] })?.path).toContain("329");
        expect(resolveTarget({ type: "interview_cancelled_by_admin_to_interpreter", worker_id: 12 }, { data: [] })?.path).toContain("12");
    });
});
