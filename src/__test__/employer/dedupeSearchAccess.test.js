/* eslint-env jest */
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
jest.mock("../../utils/storage", () => ({ getStoredUser: () => ({ data: { id: 30, role: { id: 999 }, staff: { staff_type: "internal" } } }) }));
let mockAccess = "full_access";
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({
    useSelector: (sel) => sel({ users: { permissionList: { data: [{ module: "employer", category: [{ id: "employer_access_type", selected_value: mockAccess }] }] } } }),
    useDispatch: () => mockDispatch,
}));
jest.mock("../../redux/Slices/employer/EmployerSlice", () => ({ fetchEmployers: jest.fn((payload) => ({ type: "employers/list", payload })) }));
jest.mock("../../components/ReusableComponents/constants", () => ({ ...jest.requireActual("../../components/ReusableComponents/constants"), SEARCH_DEBOUNCE_MS: 0 }));

import DedupeSearch from "../../Views/Pages/Employer/newui/DedupeSearch";
import { fetchEmployers } from "../../redux/Slices/employer/EmployerSlice";

const rowsOf = (n) => Array.from({ length: n }, (_, i) => ({ employer_id: i + 1, name: `E${ i + 1 }`, surname: "T", reference_id: `E-${ i + 1 }` }));
const typeAndWait = async (text) => {
    const input = screen.getByRole("searchbox");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: text } });
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
};

beforeEach(() => {
    fetchEmployers.mockImplementation((payload) => ({ type: "employers/list", payload }));
    mockDispatch.mockReset();
});

describe("U-0348 (21 Oct package) — the New Employer existing-record lookup runs on employer Search Access", () => {
    test("Off disables the box with the module's disabled title", () => {
        mockAccess = "off";
        render(<DedupeSearch onOpenEmployer={ () => {} } />);
        const input = screen.getByRole("searchbox");
        expect(input).toBeDisabled();
        expect(input.getAttribute("title")).toBe("key_emp_employer_search_disabled_title");
        expect(input.getAttribute("data-mc-search-access")).toBe("off");
    });
    test("Restricted asks for one page of ten, shows at most ten and the refine note", async () => {
        mockAccess = "restricted";
        mockDispatch.mockImplementation(() => Promise.resolve({ payload: { status: true, data: rowsOf(14) } }));
        render(<DedupeSearch onOpenEmployer={ () => {} } />);
        await typeAndWait("chan");
        const payload = fetchEmployers.mock.calls.at(-1)[0];
        expect(payload).toMatchObject({ search_text: "chan", limit: 10, page: 1, context: "search" });
        expect("pagination_false" in payload).toBe(false);
        expect(document.querySelectorAll("[role='button']").length).toBe(10);
        expect(document.querySelector("[data-mc-capped]")).toHaveTextContent("key_ins_capped_refine");
    });
    test("Full keeps the unpaged lookup and no cap", async () => {
        mockAccess = "full_access";
        mockDispatch.mockImplementation(() => Promise.resolve({ payload: { status: true, data: rowsOf(12) } }));
        render(<DedupeSearch onOpenEmployer={ () => {} } />);
        expect(screen.getByRole("searchbox")).not.toBeDisabled();
        await typeAndWait("chan");
        expect(fetchEmployers.mock.calls.at(-1)[0]).toMatchObject({ search_text: "chan", pagination_false: 1, context: "search" });
        expect(document.querySelectorAll("[role='button']").length).toBe(12);
        expect(document.querySelector("[data-mc-capped]")).toBeNull();
    });
});
