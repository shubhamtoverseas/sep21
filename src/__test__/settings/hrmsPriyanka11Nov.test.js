/* eslint-env jest */
import React from "react";
import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";

/* Priyanka 11 Nov (HRMS): (1) the Approve Time Request queue sends search_text to reportees-list and drops the
   param when cleared; (2) empty time_asked / time_approved / actioned_by read as the em dash, never "N/A" or 0;
   (3) HR02 — Agency / Branch sit read-only on the Official Information card, never editable. */
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
const sent = [];
jest.mock("../../redux/Slices/settings/time-request/TimeRequestSlice", () => ({
    fetchReporteesTimeRequests: (args) => ({ t: "fetchReportees", args }),
    clearMessage: () => ({ t: "clearMessage" }),
}));
const mockState = {
    timeRequests: {
        reporteesTimeRequest: {}, reporteesTimeRequestOrder: [], reporteesTimeRequestStatus: "idle",
        reporteesTimeRequestMessage: null, reporteesTimeRequestError: null, reporteesTimeRequestCurrentPage: 1,
        reporteesTimeRequestTotalPage: 1, reporteesTimeRequestPerPage: 10, reporteesTimeRequestTotal: 0,
        reporteesTimeRequestLastUpdated: null,
    },
};
jest.mock("react-redux", () => ({
    useDispatch: () => (action) => { sent.push(action); return Promise.resolve({ payload: {} }); },
    useSelector: (sel) => sel(mockState),
}));

import useReporteesTimeRequests from "../../Views/Pages/SettingsPage/newui/hrms/reportees/useReporteesTimeRequests";
import { getTimeRequestColumns } from "../../Views/Pages/SettingsPage/newui/hrms/time-requests/timeRequestColumns";
import { getReporteesTimeRequestColumns } from "../../Views/Pages/SettingsPage/newui/hrms/reportees/reporteesTimeRequestColumns";
import ProfileInfoSection from "../../Views/Pages/SettingsPage/newui/hrms/profile/ProfileInfoSection";

const Probe = ({ search }) => { useReporteesTimeRequests({ type: "pending", dateRange: { startDate: null, endDate: null }, showNonReportees: false, search }); return null; }; // eslint-disable-line react/prop-types

describe("Approve Time Request search goes to the API", () => {
    beforeEach(() => { sent.length = 0; });
    test("a term rides as search_text", () => {
        render(<Probe search="TR000123" />);
        const fetch = sent.find((a) => a.t === "fetchReportees");
        expect(fetch.args.search_text).toBe("TR000123");
    });
    test("cleared, the param is not sent at all", () => {
        render(<Probe search="" />);
        const fetch = sent.find((a) => a.t === "fetchReportees");
        expect("search_text" in fetch.args).toBe(false);
    });
});

describe("empty time fields read as the em dash", () => {
    const cellText = (column, row) => { const { container, unmount } = render(column.render(row)); const text = container.textContent; unmount(); return text; };
    const noop = () => {};
    test("my time requests: time_asked / time_approved / actioned_by", () => {
        const byKey = Object.fromEntries(getTimeRequestColumns({ canEdit: false, onEdit: noop, onWithdraw: noop }).map((c) => [c.key, c]));
        expect(cellText(byKey.time_asked, { time_asked: "" })).toBe("—");
        expect(cellText(byKey.time_approved, { time_approved: null })).toBe("—");
        expect(cellText(byKey.actioned_by, { actioned_by: "", approved_by: "" })).toBe("—");
        expect(cellText(byKey.time_approved, { time_approved: "2 hours" })).toBe("2 hours");
        expect(cellText(byKey.actioned_by, { actioned_by: "Ann Lee" })).toBe("Ann Lee");
    });
    test("reportees queue: asked duration", () => {
        const duration = getReporteesTimeRequestColumns({ onView: noop, onAction: noop }).find((c) => c.key === "duration");
        expect(cellText(duration, { time_asked: null })).toBe("—");
        expect(cellText(duration, { time_asked: "1 hour" })).toBe("1 hour");
    });
});

test("HR02: a readOnly card field stays text while the card is in edit mode", () => {
    const Host = () => {
        const { control, formState: { errors } } = useForm({ defaultValues: { whatsapp: "+852 1234" } });
        return (
            <ProfileInfoSection
                title="Official Information" isEditable setIsEditable={() => {}} handleSave={() => {}}
                control={control} errors={errors}
                fields={[
                    { label: "WhatsApp", name: "whatsapp", value: "+852 1234" },
                    { label: "Agency", name: "agency_name", value: "OEC HK", readOnly: true },
                ]}
            />
        );
    };
    const { container } = render(<Host />);
    expect(container.querySelector("input#profile-whatsapp")).toBeTruthy();
    expect(container.querySelector("input#profile-agency_name")).toBeNull();   /* no input rendered for it */
    expect(screen.getByTitle("OEC HK")).toHaveTextContent("OEC HK");
});
