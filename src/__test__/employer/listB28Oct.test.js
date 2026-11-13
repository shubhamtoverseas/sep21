/* eslint-env jest */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
jest.mock("../../utils/storage", () => ({
    getStoredUser: () => ({ data: { id: 30, role: { id: 999 }, staff: { staff_type: "internal" } } }),
}));
const mockDispatch = jest.fn(() => Promise.resolve({ payload: { status: true } }));
jest.mock("react-redux", () => ({ useSelector: (sel) => sel({}), useDispatch: () => mockDispatch }));
jest.mock("../../redux/Slices/employer/EmployerSlice", () => ({
    updateEmployerBanOrRemoveStatus: jest.fn((payload) => ({ type: "employers/ban", payload })),
    fetchEmployerDetail: jest.fn((payload) => ({ type: "employers/detail", payload })),
}));
jest.mock("../../Views/Pages/WorkerPage/worker-detail/newui/WorkerIdentityHeader", () => ({
    __esModule: true,
    default: ({ menuActions }) => <div>{ menuActions.map((m) => <button key={ m.id } type="button">{ m.label }</button>) }</div>, // eslint-disable-line react/prop-types
}));

import { getEmployerGrants } from "../../Views/Pages/Employer/newui/employerGrants";
import EmployerHeaderSection from "../../Views/Pages/Employer/newui/details/EmployerHeaderSection";
import RemoveOrBanEmployer from "../../components/Layout/popups/remove-or-ban-employer/RemoveOrBanEmployer";
import { updateEmployerBanOrRemoveStatus } from "../../redux/Slices/employer/EmployerSlice";
import NewEmployerForm from "../../Views/Pages/Employer/newui/NewEmployerForm";
import EmployerSectionSendTemplate from "../../Views/Pages/Employer/newui/details/tabs/EmployerSectionSendTemplate";
import { getRemarkEntityApi, REMARK_EDIT_POLICY } from "../../Views/Pages/WorkerPage/worker-detail/newui/context/remarkEntityApi";
import { EMPLOYER_SECTION_TEMPLATE } from "../../Views/Pages/Employer/newui/employerNewUiConstants";

const cat = (id, selected_value) => ({ id, selected_value });
const grid = (cats) => ({ data: [{ module: "employer", category: cats }] });

describe("U-0346 / U-0047 / U-0046 — employer grants (21 Oct catalogue)", () => {
    test("Basic — View and Family — View are children of the Details tab: no tab, no section", () => {
        const noTab = getEmployerGrants(grid([cat("employer_basic_details", "view,edit"), cat("employer_family_details", "view")]));
        expect(noTab.detailsTab).toBe(false);
        expect(noTab.basicView).toBe(false);
        expect(noTab.basicEdit).toBe(false);
        expect(noTab.familyView).toBe(false);
        const withTab = getEmployerGrants(grid([cat("employer_details_tab", "y"), cat("employer_basic_details", "view,edit"), cat("employer_family_details", "view")]));
        expect(withTab).toMatchObject({ detailsTab: true, basicView: true, basicEdit: true, familyView: true, familyEdit: false });
    });
    test("Send Template is a per-section grant that needs its section's View", () => {
        const both = getEmployerGrants(grid([cat("employer_details_tab", "y"), cat("employer_basic_details", "view,send_template"), cat("employer_family_details", "send_template")]));
        expect(both.basicSendTemplate).toBe(true);
        expect(both.familySendTemplate).toBe(false);   /* send without Family — View */
    });
    test("Ban and Restore are two separate record actions", () => {
        const banOnly = getEmployerGrants(grid([cat("employer_ban", "y"), cat("employer_restore", "n")]));
        expect(banOnly.ban).toBe(true);
        expect(banOnly.restore).toBe(false);
        const none = getEmployerGrants(grid([]));
        expect(none.ban).toBe(false);
        expect(none.restore).toBe(false);
    });
});

describe("U-0046 — Ban / Restore in the record header", () => {
    const base = { employerId: 7, tabs: [], activeTab: "job-offer", onSelectTab: () => {} };
    test("an active employer offers Ban only with the Ban grant", () => {
        const { rerender } = render(<EmployerHeaderSection { ...base } employer={ { status: 1 } } canBan={ false } canRestore />);
        expect(screen.queryByText("key_emp_employer_ban_ban_action")).toBeNull();
        expect(screen.queryByText("key_emp_employer_ban_restore_action")).toBeNull();
        rerender(<EmployerHeaderSection { ...base } employer={ { status: 1 } } canBan canRestore={ false } />);
        expect(screen.getByText("key_emp_employer_ban_ban_action")).toBeInTheDocument();
    });
    test("a banned employer offers Restore only with the Restore grant", () => {
        const { rerender } = render(<EmployerHeaderSection { ...base } employer={ { status: 0 } } canBan canRestore={ false } />);
        expect(screen.queryByText("key_emp_employer_ban_restore_action")).toBeNull();
        rerender(<EmployerHeaderSection { ...base } employer={ { status: 0 } } canBan={ false } canRestore />);
        expect(screen.getByText("key_emp_employer_ban_restore_action")).toBeInTheDocument();
    });
    test("the confirmation needs a reason and sends it", async () => {
        mockDispatch.mockImplementation(() => Promise.resolve({ payload: { status: true } }));
        render(<RemoveOrBanEmployer isBan employerId={ 7 } onClose={ () => {} } />);
        fireEvent.click(screen.getByText("key_emp_employer_ban_ban_action"));
        expect(screen.getByRole("alert")).toHaveTextContent("key_reason_is_required");
        expect(mockDispatch).not.toHaveBeenCalled();
        fireEvent.change(screen.getByRole("textbox"), { target: { value: "  Fraud report  " } });
        fireEvent.click(screen.getByText("key_emp_employer_ban_ban_action"));
        expect(updateEmployerBanOrRemoveStatus).toHaveBeenCalledWith({ employer_id: 7, ban_status: "y", reason: "Fraud report" });
    });
});

const FormHost = ({ hidden }) => { // eslint-disable-line react/prop-types
    const { control, formState: { errors } } = useForm({ defaultValues: {} });
    return (
        <NewEmployerForm
            control={ control }
            errors={ errors }
            lookups={ { countries: [], locations: [], languages: [], nationalities: [], branches: [], csStaff: [], districts: [] } }
            derived={ {} }
            actions={ {} }
            variant="drawer"
            hidden={ hidden }
        />
    );
};

describe("U-0346 — the edit drawer hides a block without its View", () => {
    test("without Basic — View the identity and profile blocks are absent; the contact block stays", () => {
        render(<FormHost hidden={ { identity: true, profile: true } } />);
        expect(screen.queryByText("key_identity")).toBeNull();
        expect(screen.queryByText("key_profile_location")).toBeNull();
        expect(screen.queryByText("key_primary_language")).toBeNull();
        expect(screen.getByText("key_contact")).toBeInTheDocument();
    });
    test("without Contact — View the contact block is absent; identity and profile stay", () => {
        render(<FormHost hidden={ { contact: true } } />);
        expect(screen.queryByText("key_contact")).toBeNull();
        expect(screen.getByText("key_identity")).toBeInTheDocument();
        expect(screen.getByText("key_profile_location")).toBeInTheDocument();
    });
});

describe("U-0047 — Send Template inside a Details section", () => {
    test("the control exists per section and stays honest while the environment's category list lacks the slug", () => {
        expect(Object.keys(EMPLOYER_SECTION_TEMPLATE).sort()).toEqual(["basic", "family"]);
        expect(EMPLOYER_SECTION_TEMPLATE.basic.slug).toBe("basic_details");
        expect(EMPLOYER_SECTION_TEMPLATE.family.slug).toBe("family_details");
        mockDispatch.mockImplementation(() => Promise.resolve({ payload: { data: [{ id: 1, slug: "job" }] } }));   /* the category list without the slug */
        render(<EmployerSectionSendTemplate section="basic" employer={ { employer_id: 7 } } />);
        const button = screen.getByText("key_send_template");
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute("title", "key_awaiting_backend_api");
    });
});

describe("U-0048 — employer remarks: one grant, no other-author edit, no inherited indefinite edit", () => {
    test("the policy registry", () => {
        expect(REMARK_EDIT_POLICY.worker).toEqual({ authorEdit: true, othersGrant: true });
        expect(REMARK_EDIT_POLICY.employer).toEqual({ authorEdit: false, othersGrant: false });
        expect(getRemarkEntityApi("employer").editPolicy).toBe(REMARK_EDIT_POLICY.employer);
        expect(getRemarkEntityApi("worker").editPolicy).toBe(REMARK_EDIT_POLICY.worker);
    });
});
