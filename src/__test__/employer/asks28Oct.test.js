/* eslint-env jest */
import React from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
jest.mock("../../utils/storage", () => ({
    getStoredUser: () => ({ data: { id: 30, role: { id: 999 }, staff: { staff_type: "internal" } } }),
}));
const mockDispatch = jest.fn();
/* ONE state object: a selector answering a fresh array per render would re-run the form's reload effect forever */
const mockState = {
    common: { genderList: [] }, nationalities: { employerNationalities: [] },
    district: { districtsByCountryCode: [] }, employer: { currentWorkers: [], employers: [], totalPages: 1, totalEmployers: 0, lastUpdated: null },
    users: { permissionList: { data: [] } },
};
jest.mock("react-redux", () => ({
    useSelector: (sel) => sel(mockState),
    useDispatch: () => mockDispatch,
}));
jest.mock("../../redux/Slices/employer/EmployerSlice", () => ({
    updateEmployerBasic: jest.fn((payload) => ({ type: "employers/updateBasic", payload })),
    fetchEmployerDetail: jest.fn((payload) => ({ type: "employers/detail", payload })),
    fetchEmployers: jest.fn((payload) => ({ type: "employers/list", payload })),
    setFilters: jest.fn((payload) => ({ type: "employers/setFilters", payload })),
}));
jest.mock("../../redux/Slices/settings/templates/TemplateSlice", () => ({
    fetchCategoryList: jest.fn((payload) => ({ type: "templates/categories", payload })),
}));
jest.mock("../../Views/Pages/WorkerPage/worker-detail/newui/WorkerIdentityHeader", () => ({
    __esModule: true,
    default: ({ menuActions, owners }) => <div data-owners={ (owners || []).length }>{ menuActions.map((m) => <button key={ m.id } type="button">{ m.label }</button>) }</div>, // eslint-disable-line react/prop-types
}));
jest.mock("../../Views/Pages/JobOfferPage/newui/record/JoChangeOwnerDialog", () => ({
    __esModule: true,
    default: (props) => <div data-jo-owner-dialog={ props.jobId } data-request={ props.requestReason }>jo owner dialog</div>, // eslint-disable-line react/prop-types
}));
jest.mock("../../components/ui/Modal", () => ({ __esModule: true, default: ({ children, footer }) => <div>{ children }{ footer }</div> })); // eslint-disable-line react/prop-types
jest.mock("../../Views/Pages/Employer/newui/usePrimaryLanguages", () => ({
    ...jest.requireActual("../../Views/Pages/Employer/newui/usePrimaryLanguages"),
    __esModule: true,
    default: () => [],
}));

import FilterSelect from "../../components/ui/FilterSelect";
import EmployerHeaderSection from "../../Views/Pages/Employer/newui/details/EmployerHeaderSection";
import EmployerSectionSendTemplate from "../../Views/Pages/Employer/newui/details/tabs/EmployerSectionSendTemplate";
import useEmployerBasicForm from "../../Views/Pages/Employer/newui/details/tabs/useEmployerBasicForm";
import useEmployerDashboard from "../../Views/Pages/Employer/newui/useEmployerDashboard";
import JoCsRequestDialog from "../../Views/Pages/JobOfferPage/newui/dashboard/JoCsRequestDialog";
import { addEmployerSchema } from "../../Views/Pages/Employer/add-employer/addEmployerSchema";
import { addEmployerFormState } from "../../components/ReusableComponents/form-states";
import { updateEmployerBasic } from "../../redux/Slices/employer/EmployerSlice";
import { fetchCategoryList } from "../../redux/Slices/settings/templates/TemplateSlice";
import { DETAILS_CARDS, EMPLOYER_BAN_REASON_MAX, EMPLOYER_VIEW_STATE_KEY } from "../../Views/Pages/Employer/newui/employerNewUiConstants";

const employer = { employer_id: 9, status: 1, title: "Mr", surname: "Chan", name: "Tai Man", contact_telephone_number: "28874103", contact_telephone_ext: "204", home_telephone_number: "" };

/* thunk-like: `.unwrap()` for the dashboard's list read */
const resolved = (value) => { const p = Promise.resolve(value); p.unwrap = () => p; return p; };
beforeEach(() => {
    /* CRA resets mock implementations per test: the action creators the components dispatch are re-stubbed here */
    fetchCategoryList.mockImplementation((payload) => ({ type: "templates/categories", payload }));
    updateEmployerBasic.mockImplementation((payload) => ({ type: "employers/updateBasic", payload }));
    mockDispatch.mockReset();
    mockDispatch.mockImplementation(() => resolved({ payload: { status: true, data: [] } }));
    try { window.localStorage.clear(); window.sessionStorage.clear(); } catch (e) { /* storage may be blocked */ }
});

describe("ask 1 · Ban / Restore reason (backend 323)", () => {
    test("the reason box takes up to 1000 characters", () => {
        expect(EMPLOYER_BAN_REASON_MAX).toBe(1000);
    });
});

describe("ask 11 · an employer has no owner (U-0036, backend 332)", () => {
    test("the header has no Change CS Owner action and no Owners chip", () => {
        const { container } = render(<EmployerHeaderSection employer={ { ...employer, cs_name: "Linda Wong" } } employerId={ 9 } canBan tabs={ [] } activeTab="details" onSelectTab={ () => {} } />);
        expect(screen.queryByText("key_change_cs_owner")).toBeNull();
        expect(container.querySelector("[data-owners]").getAttribute("data-owners")).toBe("0");
        expect(screen.getByText("key_emp_employer_ban_ban_action")).toBeInTheDocument();
    });
    test("New / Edit Employer carry no CS field: neither the schema nor the form state knows cs_owner_id", () => {
        expect(addEmployerSchema.fields.cs_owner_id).toBeUndefined();
        expect("cs_owner_id" in addEmployerFormState).toBe(false);
    });
    test("the Job Offer CS-change request hands over to the JOB OFFER owner dialog with the request reason", () => {
        render(<JoCsRequestDialog requestedCsObj={ { id: 77, employer_id: 9, cs_name: "Linda Wong", reference_id: "JO-77", cs_change_reason: "Prefers Cantonese" } } onClose={ () => {} } onRefreshList={ () => {} } />);
        fireEvent.click(screen.getByText("key_change_cs_owner"));
        const dialog = document.querySelector("[data-jo-owner-dialog]");
        expect(dialog.getAttribute("data-jo-owner-dialog")).toBe("77");
        expect(dialog.getAttribute("data-request")).toBe("Prefers Cantonese");
    });
});

describe("ask 2 · Send Template per section waits for the category (backend 329 / SQL 21 §A; U-0047: grant + category, never template availability)", () => {
    test("disabled while the employer category list lacks the slug; enabled once it carries it (no template-list call)", async () => {
        mockDispatch.mockImplementation((action) => resolved(action?.type === "templates/categories" ? { payload: { data: [{ id: 1, slug: "job" }] } } : { payload: {} }));
        const { unmount } = render(<EmployerSectionSendTemplate section="basic" employer={ { employer_id: 9 } } />);
        await waitFor(() => expect(mockDispatch).toHaveBeenCalled());
        expect(screen.getByText("key_send_template")).toBeDisabled();
        unmount();
        mockDispatch.mockImplementation((action) => resolved(action?.type === "templates/categories" ? { payload: { data: [{ id: 1, slug: "job" }, { id: 71, slug: "basic_details" }] } } : { payload: {} }));
        render(<EmployerSectionSendTemplate section="basic" employer={ { employer_id: 9 } } />);
        await waitFor(() => expect(screen.getByText("key_send_template")).not.toBeDisabled());
        expect(mockDispatch.mock.calls.filter(([a]) => a?.type === "templates/categories")).toHaveLength(2);
    });
});

describe("ask 12 · a stale District never hides behind 'All'", () => {
    test("the shared filter chip shows a count for an applied id the options no longer carry", () => {
        render(<FilterSelect id="f" label="key_district" multiple value={ ["7"] } options={ [{ value: "", label: "key_all" }] } onChange={ () => {} } />);
        expect(screen.getByRole("button").textContent).toContain("1 key_selected");
        expect(screen.getByRole("button").textContent).not.toContain("key_all");
    });
    test("a Location change clears District (and Branch); the saved-state key moved to v3", () => {
        expect(EMPLOYER_VIEW_STATE_KEY).toBe("egd_view_state_v3");
        const { result } = renderHook(() => useEmployerDashboard());
        act(() => { result.current.setFilter("district", ["7"]); });
        expect(result.current.filters.district).toEqual(["7"]);
        act(() => { result.current.setFilter("location", ["119"]); });
        expect(result.current.filters.district).toEqual([]);
        expect(result.current.filters.branch_id).toEqual([]);
        expect(result.current.filters.location).toEqual(["119"]);
    });
});

describe("ask 13 · one endpoint, two cards: a card's Save posts only that card (backend 334)", () => {
    const setup = () => renderHook(({ emp }) => useEmployerBasicForm({ employer: emp, employerId: 9 }), { initialProps: { emp: employer } });

    test("Other Contact posts its three fields + employer_id + edit_type and nothing of the identity card", async () => {
        const { result } = setup();
        act(() => { result.current.setValue("contact_telephone_ext", "999", { shouldDirty: true }); });
        let ok;
        await act(async () => { ok = await result.current.saveCard(DETAILS_CARDS.OTHER_CONTACT); });
        expect(ok).toBe(true);
        const payload = updateEmployerBasic.mock.calls.at(-1)[0];
        expect(payload).toEqual({ employer_id: 9, contact_telephone_number: "28874103", contact_telephone_ext: "999", home_telephone_number: "", edit_type: "other_contact" });
    });

    test("the identity card posts no telephone and no edit_type; a refused save lands on that card only", async () => {
        const { result } = setup();
        act(() => { result.current.setValue("title", "Ms", { shouldDirty: true }); });
        await act(async () => { await result.current.saveCard(DETAILS_CARDS.BASIC); });
        const payload = updateEmployerBasic.mock.calls.at(-1)[0];
        expect(payload.title).toBe("Ms");
        expect(payload.employer_id).toBe(9);
        expect("contact_telephone_number" in payload).toBe(false);
        expect("edit_type" in payload).toBe(false);

        mockDispatch.mockImplementation(() => resolved({ error: true, payload: { data: { data: { message: "Surname is required" } } } }));
        let ok;
        await act(async () => { ok = await result.current.saveCard(DETAILS_CARDS.BASIC); });
        expect(ok).toBe(false);
        expect(result.current.cardErrors[DETAILS_CARDS.BASIC]).toBe("Surname is required");
        expect(result.current.cardErrors[DETAILS_CARDS.OTHER_CONTACT] || "").toBe("");
    });

    test("the record re-read keeps the other card's unsaved edit; Cancel restores only its own card", async () => {
        const { result, rerender } = setup();
        act(() => { result.current.setValue("title", "Ms", { shouldDirty: true }); });
        act(() => { result.current.setValue("home_telephone_number", "21234567", { shouldDirty: true }); });
        await act(async () => { await result.current.saveCard(DETAILS_CARDS.OTHER_CONTACT); });
        /* the server's record comes back with the saved telephone; the identity edit was never posted */
        rerender({ emp: { ...employer, home_telephone_number: "21234567" } });
        expect(result.current.form.getValues("title")).toBe("Ms");
        expect(result.current.form.getValues("home_telephone_number")).toBe("21234567");
        act(() => { result.current.cancelCard(DETAILS_CARDS.BASIC); });
        expect(result.current.form.getValues("title")).toBe("Mr");
        expect(result.current.form.getValues("home_telephone_number")).toBe("21234567");
    });
});
