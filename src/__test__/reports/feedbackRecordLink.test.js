/* eslint-env jest */
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import FeedbackDetailDialog from "../../Views/Pages/reports/feedback-report/FeedbackDetailDialog";
import { feedbackRecordPath } from "../../Views/Pages/reports/reportConstants";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
jest.mock("../../services/commonService", () => ({ __esModule: true, formatFeedbackType: () => ({ translationKey: "key_customer_service" }) }));

const employerRow = { feedback_user_name: "Ho Ka Lam", created_by_type: "employer", feedback_user_reference_id: "E000209", feedback_user_id: 209, rating: 3, comment: "Testing" };

/* backend 390 (4 Nov): the code in the Feedback dialog opens the employer / worker record; no id → plain text */
describe("Feedback dialog → record link (CH 508)", () => {
    test("feedbackRecordPath: employer id, worker id, nothing otherwise", () => {
        expect(feedbackRecordPath({ created_by_type: "employer", feedback_user_id: 209 })).toBe("/employers/details/209");
        expect(feedbackRecordPath({ created_by_type: "worker", feedback_user_id: 7 })).toBe("/workers/details/7");
        expect(feedbackRecordPath({ created_by_type: "Employer", feedback_user_id: "12" })).toBe("/employers/details/12");
        expect(feedbackRecordPath({ created_by_type: "employer", feedback_user_id: null })).toBeNull();
        expect(feedbackRecordPath({ created_by_type: "staff", feedback_user_id: 3 })).toBeNull();
        expect(feedbackRecordPath(undefined)).toBeNull();
    });
    test("the code is a link in the subtitle and in the Code field when the id is there", () => {
        render(<MemoryRouter><FeedbackDetailDialog feedbackObj={ employerRow } onClose={ () => {} } /></MemoryRouter>);
        const links = screen.getAllByRole("link", { name: "E000209" });
        expect(links).toHaveLength(2);
        links.forEach((a) => expect(a.getAttribute("href")).toBe("/employers/details/209"));
        expect(screen.getByText(/Ho Ka Lam · key_employer ·/)).toBeInTheDocument();
    });
    test("without the id the code stays plain text", () => {
        render(<MemoryRouter><FeedbackDetailDialog feedbackObj={ { ...employerRow, feedback_user_id: null } } onClose={ () => {} } /></MemoryRouter>);
        expect(screen.queryAllByRole("link")).toHaveLength(0);
        expect(screen.getAllByText("E000209").length).toBeGreaterThan(0);
    });
});
