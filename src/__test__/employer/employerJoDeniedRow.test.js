/* eslint-env jest */
import React from "react";
import { render, screen } from "@testing-library/react";

jest.mock("../../utils/translation", () => ({ __esModule: true, default: (key) => key, translation: (key) => key }));
jest.mock("../../components/newui-select/NewUiSelect", () => ({ __esModule: true, default: () => null }));

const EmployerJobOfferListing = require("../../Views/Pages/Employer/newui/details/EmployerJobOfferListing").default;

const rows = [
    { id: 1, reference_id: "J0000189", status: null, days_open: 25, view_count: 2, start_date: "2026-09-09", cs_name: "Shubham" },
    { id: 2, reference_id: "J0000086", status: null, days_open: 0, view_count: 0, start_date: "2026-09-13", cs_name: "Shubham" },
];

describe("U-0256 — a denied embedded Job Offer row carries a truthful unavailable state", () => {
    test("the denied row shows the Unavailable tag with neutral reference text; the permitted row is a link without it", () => {
        const onOpen = jest.fn();
        render(<EmployerJobOfferListing rows={ rows } isLoading={ false } search="" onSearchChange={ () => {} } statusValue={ null } statusOptions={ [] } onStatusChange={ () => {} } onOpenJobOffer={ onOpen } canOpenRow={ (row) => row.id === 1 } />);
        const tags = screen.getAllByText("key_unavailable");
        expect(tags).toHaveLength(1);
        expect(tags[0].closest(".mc-worker-listing-row")).toHaveAttribute("aria-disabled", "true");
        expect(screen.getByText("J0000189").closest(".mc-worker-listing-row")).toHaveAttribute("role", "link");
        expect(screen.getByText("J0000086").closest(".mc-worker-listing-row")).not.toHaveAttribute("role");
    });
});
