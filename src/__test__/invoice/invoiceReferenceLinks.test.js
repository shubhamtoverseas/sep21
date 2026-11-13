import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

/* Reference display (28 Sep sheet row 8): a reference is blue and clickable only when the Invoice API says this user
   may open it; otherwise neutral text. A direct URL to an invoice this user may not open shows "This record is not
   available." References never carry a leading "#". */

const en = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));

jest.mock("react-i18next", () => {
    const copy = JSON.parse(require("fs").readFileSync(require("path").resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
    return { useTranslation: () => ({ t: (key) => copy[key] ?? key }), initReactI18next: { type: "3rdParty", init: () => {} } };
});
jest.mock("../../services/invoices", () => ({ resolveInvoiceAPI: jest.fn() }));
jest.mock("../../components/ReusableComponents/CustomSpinner", () => () => <div>checking</div>);

const { resolveInvoiceAPI } = require("../../services/invoices");
const InvoiceRelatedRef = require("../../components/Invoice/InvoiceRelatedRef").default;
const { withInvoiceRecordGate } = require("../../Views/Pages/Invoice/InvoiceRecordGate");

describe("related invoice reference", () => {
    test("opens only when the server says can_open", () => {
        const onOpen = jest.fn();
        const { rerender } = render(<InvoiceRelatedRef invoice={ { id: 7, invoice_number: "I-HKH000007(R)", can_open: true } } onOpen={ onOpen } />);
        fireEvent.click(screen.getByRole("link", { name: "I-HKH000007(R)" }));
        expect(onOpen).toHaveBeenCalledTimes(1);

        rerender(<InvoiceRelatedRef invoice={ { id: 7, invoice_number: "I-HKH000007(R)", can_open: false } } onOpen={ onOpen } />);
        expect(screen.queryByRole("link")).toBeNull();
        fireEvent.click(screen.getByText("I-HKH000007(R)"));
        expect(onOpen).toHaveBeenCalledTimes(1);
        expect(screen.getByText("I-HKH000007(R)").className).toBe("ref neutral");
    });

    test("a reference without can_open (older response) is neutral", () => {
        render(<InvoiceRelatedRef invoice={ { id: 7, invoice_number: "I-HKH000007" } } onOpen={ jest.fn() } />);
        expect(screen.queryByRole("link")).toBeNull();
    });
});

describe("direct URL to an invoice screen", () => {
    const Screen = () => <div>invoice screen</div>;
    const Gated = withInvoiceRecordGate(Screen);
    const open = () => render(
        <MemoryRouter initialEntries={ ["/invoices/general/payment-type-invoice/42"] }>
            <Routes><Route path="/invoices/general/payment-type-invoice/:invoice_id" element={ <Gated /> } /></Routes>
        </MemoryRouter>
    );

    test("a record this user may not open (404 from resolve) shows the neutral notice", async () => {
        resolveInvoiceAPI.mockRejectedValueOnce({ response: { status: 404 } });
        open();
        expect(await screen.findByText("This record is not available.")).toBeTruthy();
        expect(screen.queryByText("invoice screen")).toBeNull();
        expect(resolveInvoiceAPI).toHaveBeenLastCalledWith("42");
    });

    test("an openable record opens the screen", async () => {
        resolveInvoiceAPI.mockResolvedValueOnce({ data: { data: { id: 42 } } });
        open();
        expect(await screen.findByText("invoice screen")).toBeTruthy();
    });

    test("any other failure leaves the screen to handle it", async () => {
        resolveInvoiceAPI.mockRejectedValueOnce({ response: { status: 500 } });
        open();
        expect(await screen.findByText("invoice screen")).toBeTruthy();
    });
});

describe("copy and references", () => {
    test("the notice uses the Invoice API's wording", () => {
        expect(en.key_record_not_available).toBe("This record is not available.");
        const apiLocale = path.join(process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract"), "src/locales/en.json");
        if (fs.existsSync(apiLocale)) expect(JSON.parse(fs.readFileSync(apiLocale, "utf8")).RECORD_NOT_AVAILABLE).toBe(en.key_record_not_available);
    });

    test("no invoice screen prints a '#' before a reference", () => {
        const roots = ["../../Views/Pages/Invoice", "../../components/Invoice", "../../components/Layout/popups/invoice-popups"].map((p) => path.resolve(__dirname, p));
        const files = [];
        const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((d) => {
            const full = path.join(dir, d.name);
            if (d.isDirectory()) walk(full); else if (full.endsWith(".js")) files.push(full);
        });
        roots.forEach(walk);
        const hits = files.filter((f) => /#\$?\{\s*[\w?.]*(invoice_number|reference_id|contract_number)/.test(fs.readFileSync(f, "utf8")));
        expect(hits).toEqual([]);
    });
});
