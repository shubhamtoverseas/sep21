/* eslint-env jest */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AdditionalRequirements from "../../Views/Pages/ProcessingPage/processing-detail/immigration-tab/AdditionalRequirements";

jest.mock("../../utils/translation", () => {
    const t = (key) => key;
    return { __esModule: true, default: t, translation: t };
});
jest.mock("../../services/processings", () => ({ updateImmigrationApplicabilityAPI: jest.fn() }));

/* U-0304 Revised (21 Oct package): the vocabulary is Unknown (no record) / Needs review (stored) / Applies / Does not
   apply — Needs review stays storable, the dialog offers all three, and the labels are Applies / Does not apply. */
const sections = [
    { key: "driving_duties", title: "Driving Duties", current: null, rows: [] },
    { key: "financial_support", title: "Financial Support", current: { assessment: "needs_review", reason: "awaiting payslips", assessed_by_name: "Ana", assessed_at: "2026-11-01 10:00:00" }, rows: [] },
    { key: "public_rental", title: "Public Rental", current: { assessment: "applies", reason: "tenant" }, rows: [] },
    { key: "company_support", title: "Company Support", current: { assessment: "does_not_apply", reason: "none" }, rows: [] },
];

describe("Immigration applicability vocabulary (U-0304 Revised)", () => {
    test("four display states: Unknown (unassessed), stored Needs review, Applies, Does not apply", () => {
        const { container } = render(<AdditionalRequirements contractId={ 1 } sections={ sections } canEdit onTick={ () => {} } />);
        expect(screen.getByText("key_unknown")).toBeInTheDocument();
        expect(screen.getByText("key_needs_review")).toBeInTheDocument();
        expect(screen.getByText("key_applies")).toBeInTheDocument();
        expect(screen.getByText("key_does_not_apply")).toBeInTheDocument();
        expect(container.querySelector('[data-section="driving_duties"]').dataset.state).toBe("unknown");
        expect(container.querySelector('[data-section="financial_support"]').dataset.state).toBe("needs_review");
        /* only the unassessed section offers Review; a stored assessment (needs_review included) offers Change with its meta */
        expect(screen.getAllByText("key_review")).toHaveLength(1);
        expect(screen.getAllByText("key_change")).toHaveLength(3);
        expect(screen.getByText(/Ana/)).toBeInTheDocument();
    });
    test("the assessment dialog stores three values: applies, does_not_apply, needs_review", () => {
        render(<AdditionalRequirements contractId={ 1 } sections={ sections } canEdit onTick={ () => {} } />);
        fireEvent.click(screen.getByText("key_review"));
        const values = Array.from(document.querySelectorAll('input[type="radio"]')).map((r) => r.value);
        expect(values).toEqual(["applies", "does_not_apply", "needs_review"]);
    });
});
