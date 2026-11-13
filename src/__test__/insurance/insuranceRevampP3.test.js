import React, { Suspense } from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { Provider } from "react-redux";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";
import zhHK from "../../../public/locales/zh_HK/translation.json";

/* Insurance revamp PROMPT 3 (9 Nov package, INS01–INS03): Next Step and every Qnect / provider-handover fact are retired;
   the record shows its open requests by type; each open request carries its own result action (Confirm policy / renewal /
   additional coverage / changes, Record cancellation outcome) and there is no record-level "Record QBE result"; Request
   cancellation offers the five reasons, asks an explanation for Other only and claims no "sent to QBE"; the cancellation
   reference is added with the outcome grant (the server's addReference flag). */

jest.mock("../../services/insurance", () => ({
    getInsuranceRecordAPI: jest.fn(),
    getInsuranceRecordHistoryAPI: jest.fn(),
    getInsuranceMetaAPI: jest.fn(),
    requestInsuranceCancellationAPI: jest.fn(),
}));
jest.mock("../../services/insuranceAdmin", () => ({
    getInsuranceRecordViewAdminAPI: jest.fn(),
    getInsuranceRecordViewByIdAdminAPI: jest.fn(),
}));
jest.mock("../../services/remarks", () => ({ getInsuranceRemarks: jest.fn() }));
jest.mock("../../services/calendar", () => ({ getSourceTasksAPI: jest.fn() }));
/* eslint-disable import/first */
import { getInsuranceMetaAPI, requestInsuranceCancellationAPI } from "../../services/insurance";
import { getInsuranceRecordViewAdminAPI } from "../../services/insuranceAdmin";
import insurance from "../../redux/Slices/insurance/InsuranceSlice";
import remarks from "../../redux/Slices/remarks/RemarkSlice";
import InsuranceRecordPage from "../../Views/Pages/insurance/record/InsuranceRecordPage";
import RequestCancellationDialog from "../../Views/Pages/insurance/record/RequestCancellationDialog";
import { getInsuranceColumns } from "../../Views/Pages/insurance/dashboard/insuranceDashboardColumns";
/* eslint-enable import/first */

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
beforeEach(() => { sessionStorage.setItem("user", JSON.stringify({ data: { id: 1 } })); });
afterEach(() => { jest.resetAllMocks(); sessionStorage.clear(); });

const ok = (data, message = "") => Promise.resolve({ data: { status: true, message, data } });
const person = { name: "Ann Lee", at: "2026-10-01T02:00:00Z" };
const period = (id, extra = {}) => ({
    id, kind: "initial", status: "active", carrierRef: `QBE-${id}`, effective: "2026-01-01", expiry: "2026-12-31", plan: "Plan A",
    provider: "QBE", requestedEffective: "2026-01-01", invoice: null, recordedBy: person, carrierAcceptanceNote: null, version: 1,
    gapBefore: null, openCancellation: null, amendments: [], cancellation: null, withdrawnCancellation: null, voided: null, ...extra,
});
const request = (id, type, extra = {}) => ({
    id, type, state: "pending", version: 1, submittedBy: person, recordedBy: null, closed: null, periodEnded: false, attention: false,
    buttons: { record: true, edit: type !== "Cancellation", withdraw: true, reject: type !== "Cancellation" }, ...extra,
});
const view = (extra = {}) => ({
    id: 1, ref: "IN-HKC000001", factsVersion: 1,
    header: { workerName: "Worker 1", coverage: { label: "active", code: "active", fact: "fact.active", factDate: "2026-01-01" } },
    summary: { plan: "Plan A", carrierRef: "QBE-1", periodKind: "current", period: { effective: "2026-01-01", expiry: "2026-12-31" },
        owner: { name: "Owner" }, branch: { name: "HK" }, contract: null },
    work: { openRequests: [], attention: 0 },
    relationship: { continuesFrom: null, followedBy: [] },
    actions: [{ key: "renew", group: "start", enabled: true }],
    requests: [], issues: [], periods: [period(1)], voidedPeriods: [], coverages: [], riders: [],
    parties: { worker: { name: "Worker 1" }, employer: { name: "Employer" }, contract: null, previously: [], addressOnPolicy: null },
    renewal: { targetStart: "2027-01-01", planId: 1, nextConfirmed: null, grace: { applies: false } },
    ...extra,
});
const setup = () => ({
    store: configureStore({ reducer: { insurance, remarks, users: (state = { permissionList: { data: [] } }) => state } }),
    queryClient: new QueryClient({ defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: false } } }),
});
const openRecord = async (record) => {
    const { store, queryClient } = setup();
    getInsuranceRecordViewAdminAPI.mockReturnValue(ok({ record, remarks: [] }));
    const utils = render(
        <QueryClientProvider client={queryClient}>
            <Provider store={store}>
                <MemoryRouter initialEntries={["/insurance/IN-HKC000001"]}>
                    <Suspense fallback={null}>
                        <Routes><Route path="/insurance/:ref" element={<InsuranceRecordPage />} /></Routes>
                    </Suspense>
                </MemoryRouter>
            </Provider>
        </QueryClientProvider>,
    );
    await screen.findByText("Worker 1", { selector: "h1" });
    return utils;
};

describe("record page: open requests and request-level results (INS02, INS08-17/18)", () => {
    it("the strip lists each open request by type, oldest first; nothing open reads None", async () => {
        const { container, unmount } = await openRecord(view({
            work: { openRequests: ["Renew", "Cancellation"], attention: 0 },
            requests: [request(4, "Renew"), request(5, "Cancellation", { cancellationPeriod: { effective: "2026-01-01", expiry: "2026-12-31", carrierRef: "QBE-1" } })],
        }));
        const strip = container.querySelector('[data-work="summary"]');
        expect(within(strip).getByText("Open requests")).toBeInTheDocument();
        expect([...strip.querySelectorAll("[data-request-type]")].map((el) => [el.dataset.requestType, el.textContent]))
            .toEqual([["Renew", "Renewal"], ["Cancellation", "Cancellation"]]);
        unmount();
        const empty = await openRecord(view());
        expect(within(empty.container.querySelector('[data-work="summary"]')).getByText("None")).toBeInTheDocument();
    });

    it("each open request has its own result action; there is no record-level Record QBE result", async () => {
        const { container } = await openRecord(view({
            work: { openRequests: ["New", "Renew", "Coverage", "Endorsement", "Cancellation"], attention: 0 },
            requests: [request(1, "New"), request(2, "Renew"), request(3, "Coverage"), request(4, "Endorsement", { endorsement: { type: "address" } }),
                request(5, "Cancellation")],
        }));
        expect([...container.querySelectorAll('[data-action="confirm-req"]')].map((b) => b.textContent))
            .toEqual(["Confirm policy", "Confirm renewal", "Confirm additional coverage", "Confirm changes", "Record cancellation outcome"]);
        expect(screen.queryByText("Record QBE result")).toBeNull();
    });

    it("shows no QBE / Qnect panel, quote number or Qnect status; the summary names the QBE policy number only", async () => {
        const { container } = await openRecord(view());
        expect(container.querySelector('[data-panel="provider"]')).toBeNull();
        expect(screen.queryByText(/Qnect/)).toBeNull();
        expect(screen.queryByText(/quote number/i)).toBeNull();
        expect(screen.getAllByText(en.key_ins_col_qbe_policy_number).length).toBeGreaterThan(0);
    });

    it("Add QBE reference on an accepted cancellation follows the server's outcome-grant flag", async () => {
        const accepted = (addReference) => period(1, {
            status: "ending",
            cancellation: { effective: "2026-11-01", requestedEffective: "2026-11-01", reason: "Worker departed", remarks: null, fromInception: false,
                carrierRef: null, legacy: false, recordedBy: person, addReference },
        });
        const without = await openRecord(view({ periods: [accepted(false)], actions: [{ key: "requestCancel", group: "start", enabled: false, why: "cancellationResultRecorded" }] }));
        expect(screen.queryByText("Add QBE reference")).toBeNull();
        without.unmount();
        await openRecord(view({ periods: [accepted(true)], actions: [] }));
        expect(screen.getByText("Add QBE reference")).toBeInTheDocument();
    });

    it("an open cancellation on a period reads 'Cancellation requested … Current cover is unchanged.', no Waiting for QBE", async () => {
        const { container } = await openRecord(view({ periods: [period(1, { openCancellation: { requestedEffective: "2026-11-01", reason: "Worker departed" } })] }));
        const line = [...container.querySelectorAll("[data-period]")][0].textContent;
        expect(line).toContain("Cancellation requested");
        expect(line).toContain("Worker departed. Current cover is unchanged.");
        expect(line).not.toMatch(/Waiting for QBE|sent to QBE/);
    });
});

describe("Request cancellation (INS01-12, INS01-13)", () => {
    const META = { today: "2026-11-10", cancellationReasons: ["Cover not required", "Employment terminated", "Worker departed", "Replaced by another policy", "Other"] };
    const renderDialog = async () => {
        getInsuranceMetaAPI.mockReturnValue(ok(META));
        const store = configureStore({ reducer: { insurance } });
        render(<Provider store={store}><RequestCancellationDialog record={view()} onClose={() => {}} onDone={() => {}} /></Provider>);
        await waitFor(() => expect(document.querySelectorAll("#ins-cxl-reason option")).toHaveLength(6));
    };

    it("offers the five reasons and no 'sent to QBE' confirmation", async () => {
        await renderDialog();
        expect([...document.querySelectorAll("#ins-cxl-reason option")].slice(1).map((o) => o.textContent))
            .toEqual(["Cover not required", "Employment terminated", "Worker departed", "Replaced by another policy", "Other (explain below)"]);
        expect(document.querySelector('input[type="checkbox"]')).toBeNull();
        expect(screen.queryByText(/sent this cancellation request to QBE/i)).toBeNull();
        expect(screen.getByText("Coverage changes only when the confirmed outcome is recorded.")).toBeInTheDocument();
    });

    it("a listed reason needs no explanation; the request carries no sentConfirmed", async () => {
        requestInsuranceCancellationAPI.mockReturnValue(ok({ ref: "IN-HKC000001" }));
        await renderDialog();
        fireEvent.change(document.getElementById("ins-cxl-reason"), { target: { value: "Worker departed" } });
        fireEvent.click(screen.getByText("Create cancellation request"));
        await waitFor(() => expect(requestInsuranceCancellationAPI).toHaveBeenCalledTimes(1));
        const payload = requestInsuranceCancellationAPI.mock.calls[0][0];
        expect(payload).toMatchObject({ ref: "IN-HKC000001", periodId: 1, reason: "Worker departed", remarks: "" });
        expect("sentConfirmed" in payload).toBe(false);
    });

    it("Other needs an explanation before anything is sent", async () => {
        await renderDialog();
        fireEvent.change(document.getElementById("ins-cxl-reason"), { target: { value: "Other" } });
        fireEvent.click(screen.getByText("Create cancellation request"));
        expect(await screen.findByText("Enter remarks")).toBeInTheDocument();
        expect(requestInsuranceCancellationAPI).not.toHaveBeenCalled();
    });
});

describe("dashboard Open requests column (INS08-16/18)", () => {
    const cell = (work) => {
        const [col] = getInsuranceColumns(["openRequests"]);
        return { col, ...render(<div>{col.render({ id: 1, ref: "IN-1", work })}</div>) };
    };
    it("is labelled Open requests and shows one tag per open request, else a dash", () => {
        const { col, container, unmount } = cell({ openRequests: ["New", "Endorsement", "Endorsement"], attention: 2 });
        expect(col.label).toBe("Open requests");
        expect([...container.querySelectorAll("[data-request-type]")].map((el) => el.textContent)).toEqual(["New policy", "Change policy", "Change policy"]);
        expect(container.textContent).toContain("Needs attention");
        unmount();
        expect(cell({ openRequests: [], attention: 0 }).container.textContent).toBe("—");
    });
});

describe("retired vocabulary is gone from the code and both locales", () => {
    const RETIRED = ["key_ins_step_complete", "key_ins_step_payment", "key_ins_step_waiting", "key_ins_step_info", "key_ins_step_record",
        "key_ins_more_step_one", "key_ins_more_step_other", "key_ins_qbe_quote_number", "key_ins_qnect_status", "key_ins_panel_qbe_qnect",
        "key_ins_provider_value", "key_ins_sent_to_qbe_by", "key_ins_sent_to_qbe_note", "key_ins_cxl_sent_confirm", "key_ins_err_confirm_cancellation_sent",
        "key_ins_err_establish_withdrawal", "key_ins_withdrawal_established", "key_ins_cxl_reason_inception", "key_ins_action_record"];
    it("no retired key is left in en or zh_HK", () => {
        RETIRED.forEach((k) => { expect(en[k]).toBeUndefined(); expect(zhHK[k]).toBeUndefined(); });
    });
    it("no screen reads Next Step, Qnect facts, the provider block or the sent-to-QBE flags", () => {
        const root = path.resolve(__dirname, "../../Views/Pages");
        const files = ["insurance/record/InsuranceRecordPage.js", "insurance/record/RecordOverview.js", "insurance/record/RecordRequestRow.js",
            "insurance/record/RecordQbeResultDialog.js", "insurance/record/RequestCancellationDialog.js",
            "insurance/record/EditRequestDialog.js", "insurance/record/CloseRequestDialog.js", "insurance/record/CancellationResultDialog.js",
            "insurance/dashboard/insuranceDashboardColumns.js", "insurance/dashboard/insuranceDashboardConfig.js",
            "ProcessingPage/processing-detail/insurance-tab/ProcessingInsuranceTab.js", "WorkerPage/worker-detail/newui/listing/WorkerInsuranceListing.js"];
        files.forEach((f) => {
            const code = fs.readFileSync(path.join(root, f), "utf8").split(/\r?\n/).filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join("\n");
            expect({ f, hit: code.match(/nextSteps|nextStepLabel|qnect|quoteNumber|rawStatus|KNOWN_RAW_STATUSES|record\.provider|primaryAction|sentToInsurer|sentConfirmed|withdrawalEstablished|sentBy/) })
                .toEqual({ f, hit: null });
        });
    });
});

/* Owner ruling 10 Nov 2026 (State Machine #12): "Ends <date>" shows the LAST COVERED DAY — the accepted cancellation's
   effective date minus one day — through one shared function; display only. The effective date itself still prints in the
   cancellation detail, labelled "effective". */
describe("'Ends' shows the last covered day (one shared function, display only)", () => {
    // eslint-disable-next-line global-require
    const cfg = require("../../Views/Pages/insurance/dashboard/insuranceDashboardConfig");
    // eslint-disable-next-line global-require
    const { periodLabel } = require("../../Views/Pages/insurance/record/insuranceRecordConfig");
    it("endsDate is the day before the effective date, across month and year ends; the switch is on", () => {
        expect(cfg.ENDS_SHOWS_LAST_COVERED_DAY).toBe(true);
        expect(cfg.endsDate("2026-12-01")).toBe("2026-11-30");
        expect(cfg.endsDate("2027-01-01")).toBe("2026-12-31");
        expect(cfg.endsDate("2028-03-01")).toBe("2028-02-29");
        expect(cfg.endsDate(null)).toBe(null);
    });
    it("every 'Ends' text uses it: the coverage fact, the coverage detail, the period pill", () => {
        expect(cfg.factText("fact.ends", "2026-12-01")).toBe("Ends 30/11/26");
        expect(cfg.factText("fact.starts", "2026-12-01")).toBe("Starts 01/12/26");
        expect(cfg.coverageDetail({ label: "active", code: "ending", fact: "fact.ends", factDate: "2026-12-01" })).toBe("Cancellation accepted · ends 30/11/26");
        expect(periodLabel({ status: "ending", cancellation: { effective: "2026-12-01" } })).toBe("Ends 30/11/26");
    });
    it("record page: the header reads 'Ends <last covered day>'; the cancellation detail keeps the effective date, labelled", async () => {
        const cxl = { effective: "2026-12-01", requestedEffective: "2026-12-01", reason: "Worker departed", remarks: null, fromInception: false,
            carrierRef: null, legacy: false, recordedBy: person, addReference: false };
        const { container } = await openRecord(view({
            header: { workerName: "Worker 1", coverage: { label: "active", code: "ending", fact: "fact.ends", factDate: "2026-12-01" } },
            periods: [period(1, { status: "ending", effective: "2026-01-01", expiry: "2026-12-31", cancellation: cxl })],
        }));
        expect(container.textContent).toContain("Ends 30/11/26");
        const line = container.querySelector('[data-period="1"]').textContent;
        expect(line).toContain("Cancellation accepted · ends 30/11/26");
        expect(line).toContain("effective 01/12/2026");
        expect(line).not.toContain("Ends 01/12/26");
    });
    it("the dialogs' 'Ends' hints and the Worker / Employer list go through the same function; the Contract Insurance step prints no 'Ends'", () => {
        const pages = path.resolve(__dirname, "../../Views/Pages");
        const read = (rel) => fs.readFileSync(path.join(pages, rel), "utf8");
        expect(read("insurance/record/CancellationResultDialog.js")).toMatch(/key_ins_fact_ends", \{ date: fmtDateShort\(endsDate\(effective\)\) \}/);
        expect(read("insurance/record/RequestCancellationDialog.js")).toMatch(/key_ins_fact_ends", \{ date: fmtDateShort\(endsDate\(requestedEffective\)\) \}/);
        expect(read("WorkerPage/worker-detail/newui/listing/WorkerInsuranceListing.js")).toMatch(/title=\{ coverageDetail\(cv\)/);
        expect(read("ProcessingPage/processing-detail/insurance-tab/ProcessingInsuranceTab.js")).not.toMatch(/fact_ends|factDate|coverageDetail/);
    });
});
