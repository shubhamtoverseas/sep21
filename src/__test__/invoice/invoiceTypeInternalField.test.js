import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DetailsCardWorker from "../../Views/Pages/Invoice/add-contract-invoice/DetailsCardWorker";
import constData from "../../components/ReusableComponents/constants";

/* Create Contract Invoice (and the Exchange worker step), user rulings 22 Oct 2026: Type (Internal) is shown disabled
   before a worker is selected; once one is selected it is enabled for an Overseas, Local Finished, Local Terminated or
   Local Terminated (TR) worker and hidden for Renew, Local Transfer or Direct Hire (Overseas keeps its choice). */

const WORKER = { id: 7, name: "Ana", reference_id: "W-7", type: 1 };
const renderCard = (props) => render(
    <MemoryRouter>
        <DetailsCardWorker entityName="Worker" handleUpdateType={ () => {} } onSelectClick={ () => {} } { ...props } />
    </MemoryRouter>,
);
const typeSelect = () => document.getElementById("type_internal");

describe("Type (Internal) on the Contract Invoice worker card", () => {
    test("the category list is exactly the four that ask for it", () =>
        expect(constData.INVOICE_TYPE_INTERNAL_CATEGORIES).toEqual(["Overseas", "Local Finished", "Local Terminated", "Local Terminated (TR)"]));

    test("shown but disabled before a worker is selected", () => {
        renderCard({ currentInvoiceWorkerDetail: null, currentContractCategory: undefined });
        expect(typeSelect()).not.toBeNull();
        expect(typeSelect().disabled).toBe(true);
    });

    test.each(["Local Finished", "Local Terminated", "Local Terminated (TR)", "Overseas"])("shown and enabled for a selected %s worker", (category) => {
        renderCard({ currentInvoiceWorkerDetail: { ...WORKER, type: category === "Overseas" ? 2 : 1 }, currentContractCategory: category, contractType: "new" });
        expect(typeSelect()).not.toBeNull();
        expect(typeSelect().disabled).toBe(false);
        expect(typeSelect().value).toBe("new");
        expect(screen.getAllByRole("option").map((o) => o.value)).toEqual(["", "new", "replacement"]);
    });

    test.each(["Renew", "Renewal", "Local Transfer", "Direct Hire"])("hidden for a selected %s worker", (category) => {
        renderCard({ currentInvoiceWorkerDetail: WORKER, currentContractCategory: category });
        expect(typeSelect()).toBeNull();
    });

    test("hidden while the worker's category is unknown", () => {
        renderCard({ currentInvoiceWorkerDetail: WORKER, currentContractCategory: undefined });
        expect(typeSelect()).toBeNull();
    });
});
