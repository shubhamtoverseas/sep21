import React from "react";
import fs from "fs";
import path from "path";
import { fireEvent, render, screen } from "@testing-library/react";
import InvoiceTable from "../../Views/Pages/Invoice/InvoiceTable";

/* Conflicts sheet U-0223 (B2, 27 Oct 2026): the invoice list carried list-level ownership code that could never open:
   a "Change Invoice CS" entry the column menu never showed, and Change Invoice CS / Change Individual CS / Bulk Change CS
   popups whose flags nothing set. It is removed, with the row hand-off (selectedRows) that only fed those popups.
   Change Invoice CS stays on the invoice detail. Row selection keeps working through setCheckedItems. */

const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
const en = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));

const rows = [
    { id: 1, status: 2, branch_name: "HK", staff_name: "Ann", invoice_number: "I-1" },
    { id: 2, status: 2, branch_name: "HK", staff_name: "Ann", invoice_number: "I-2" },
    { id: 3, status: 5, branch_name: "TW", staff_name: "Bea", invoice_number: "I-3" },
];
const columns = [{ header: "Ref No.", accessor: "invoice_number" }];

describe("invoice list: no list-level ownership code (U-0223)", () => {
    test("rows are selected through setCheckedItems alone: no row hand-off is needed", () => {
        const setCheckedItems = jest.fn();
        render(<InvoiceTable columns={ columns } data={ rows } sortTable={ jest.fn() } tableHeaderfilter={ { sort: "", order: "" } }
            entityClick={ jest.fn() } onChangeFunc={ jest.fn() } showCheckbox setCheckedItems={ setCheckedItems } selectedItems={ [] } />);
        fireEvent.click(screen.getByLabelText("Select row 1"));
        expect(setCheckedItems).toHaveBeenLastCalledWith([{ status: 2, id: 1, branch_name: "HK", staff_name: "Ann" }]);
        fireEvent.click(screen.getByLabelText("Select row 2"));
        expect(setCheckedItems).toHaveBeenLastCalledWith([
            { status: 2, id: 1, branch_name: "HK", staff_name: "Ann" }, { status: 2, id: 2, branch_name: "HK", staff_name: "Ann" },
        ]);
        // a row of another status is not added to a selection
        fireEvent.click(screen.getByLabelText("Select row 3"));
        expect(setCheckedItems).toHaveBeenCalledTimes(2);
        // select all takes every row of the selection's status
        fireEvent.click(screen.getByLabelText("Select all rows"));
        expect(setCheckedItems).toHaveBeenLastCalledWith([{ status: 2, id: 1 }, { status: 2, id: 2 }]);
        fireEvent.click(screen.getByLabelText("Select all rows"));
        expect(setCheckedItems).toHaveBeenLastCalledWith([]);
    });

    test("the filter bar has no ownership entry, popup or prop; the list does not pass them", () => {
        const filter = read("Views/Pages/Invoice/InvoiceFilter.js");
        for (const gone of ["ChangeOwnerIndividualPopup", "ChangeOwnerBulkPopup", "ChangeCsInvoiceInsurancePopup", "csOption",
            "key_change_invoice_cs", "key_change_individual_cs", "key_bulk_change_cs", "selectedRows", "isSelectedItems", "handleRefresh"]) {
            expect([gone, filter.includes(gone)]).toEqual([gone, false]);
        }
        const list = read("Views/Pages/Invoice/Invoice.js");
        // the list's refresh only served the Change Invoice CS popup's close (the pagination bar no longer renders one)
        expect(list).not.toMatch(/selectedRows|handleSelectedRows|handleRefresh/);
        expect(read("Views/Pages/Invoice/InvoiceTable.js")).not.toMatch(/selectedRows|handleSelectedRows/);
    });

    test("the popups' title keys are gone; Change Invoice CS stays for the invoice detail", () => {
        expect(en.key_change_individual_cs).toBeUndefined();
        expect(en.key_bulk_change_cs).toBeUndefined();
        expect(en.key_change_invoice_cs).toBe("Change Invoice CS");
    });
});
