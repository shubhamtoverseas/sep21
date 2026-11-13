/**
 * Contract setup · Review work history (27 Oct package, INV-C1b; OP-27-8; QA-27 ruling 2): the rows read-only, the outcome,
 * domestic only with its contract named; saving goes to admin-api and the setup prices again.
 */
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ReviewWorkHistoryPanel from "../../Views/Pages/Invoice/add-contract-invoice/ReviewWorkHistoryPanel";
import ContractSetupService from "../../Views/Pages/Invoice/add-contract-invoice/ContractSetupService";
import { saveWorkHistoryReview } from "../../services/workers";

jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k) => k }) }));
jest.mock("../../services/workers", () => ({ saveWorkHistoryReview: jest.fn() }));
jest.mock("../../components/ui/Modal", () => ({ __esModule: true, default: ({ title, children, footer }) => <div role="dialog" aria-label={ title }>{ children }{ footer }</div> }));

const HISTORY = {
    outcome: null, reviewed_at: null,
    rows: [
        { id: 2, position: "we1", country: 1, country_name: "Hong Kong", status: "Finished Contract", start: "2022-03", end: "2024-09", reviewed: false, domestic: false },
        { id: 1, position: "earlier", country: 141, country_name: "Philippines", status: "Terminated - Other Reason", start: "2019-01", end: "2021-02", reviewed: true, domestic: true },
    ],
};

const mount = (history = HISTORY) => {
    const onSaved = jest.fn();
    const onClose = jest.fn();
    const view = render(<ReviewWorkHistoryPanel workerId={ 7 } history={ history } onSaved={ onSaved } onClose={ onClose } />);
    return { ...view, onSaved, onClose };
};
const choose = (name) => fireEvent.click(screen.getByLabelText(name));
const save = () => fireEvent.click(screen.getByText("key_inv_save_review"));

beforeEach(() => saveWorkHistoryReview.mockReset());

describe("the panel", () => {
    test("lists the rows read-only, in the engine's order and position", () => {
        const { container } = mount();
        const rows = [...container.querySelectorAll("tr[data-history]")];
        expect(rows.map((r) => r.getAttribute("data-history"))).toEqual(["2", "1"]);
        expect(rows[0].textContent).toContain("key_pl_we1");
        expect(rows[0].textContent).toContain("Hong Kong");
        expect(rows[0].textContent).toContain("Mar 2022");
        expect(rows[1].textContent).toContain("key_inv_history_earlier");
        expect(rows[1].textContent).toContain("key_inv_history_home_country");
        expect(container.querySelectorAll("tr[data-history] input, tr[data-history] select")).toHaveLength(0);
    });

    test("no rows says so, and the three outcomes are offered", () => {
        mount({ rows: [], outcome: null });
        expect(screen.getByText("key_inv_history_none_recorded")).toBeInTheDocument();
        for (const k of ["key_inv_history_overseas_work", "key_inv_history_no_work_history", "key_inv_history_domestic_only"]) expect(screen.getByLabelText(k)).toBeInTheDocument();
    });

    test("an outcome is required", () => {
        mount();
        save();
        expect(screen.getByRole("alert")).toHaveTextContent("key_inv_history_choose_outcome");
        expect(saveWorkHistoryReview).not.toHaveBeenCalled();
    });

    test("overseas work saves the outcome alone, then tells the setup", async () => {
        saveWorkHistoryReview.mockResolvedValue({ data: { status: true } });
        const { onSaved } = mount();
        choose("key_inv_history_overseas_work");
        save();
        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect(saveWorkHistoryReview).toHaveBeenCalledWith({ worker_id: 7, outcome: "overseas" });
    });

    test("domestic only names the domestic contract, offered from the home-country rows only", async () => {
        saveWorkHistoryReview.mockResolvedValue({ data: { status: true } });
        const twoDomestic = { ...HISTORY, rows: [HISTORY.rows[1], { ...HISTORY.rows[1], id: 5, start: "2015-01" }, HISTORY.rows[0]] };
        const { onSaved } = mount(twoDomestic);
        choose("key_inv_history_domestic_only");
        const select = screen.getByLabelText(/key_inv_history_domestic_contract/);
        expect([...select.querySelectorAll("option")].map((o) => o.value)).toEqual(["", "1", "5"]);
        save();
        expect(screen.getByRole("alert")).toHaveTextContent("key_inv_history_name_domestic");
        fireEvent.change(select, { target: { value: "5" } });
        save();
        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect(saveWorkHistoryReview).toHaveBeenCalledWith({ worker_id: 7, outcome: "domestic_only", domestic_contract_id: 5 });
    });

    test("domestic only with no home-country row explains, and does not save", () => {
        mount({ ...HISTORY, rows: [HISTORY.rows[0]] });
        choose("key_inv_history_domestic_only");
        expect(screen.getByText("key_inv_history_no_domestic")).toBeInTheDocument();
        save();
        expect(saveWorkHistoryReview).not.toHaveBeenCalled();
    });

    test("a refusal (no worker edit permission) stays open and shows the server's words", async () => {
        saveWorkHistoryReview.mockResolvedValue({ data: { status: false, message: "Access not found" } });
        const { onSaved } = mount();
        choose("key_inv_history_overseas_work");
        save();
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Access not found"));
        expect(onSaved).not.toHaveBeenCalled();
    });

    test("a stored outcome opens selected", () => {
        mount({ ...HISTORY, outcome: "overseas", reviewed_at: "2026-10-30T10:00:00.000Z" });
        expect(screen.getByLabelText("key_inv_history_overseas_work")).toBeChecked();
        expect(screen.getByText(/key_inv_history_last_reviewed/)).toHaveTextContent("30 Oct 2026");
    });
});

describe("on the Service card", () => {
    const worker = { id: 7, type: 2 };
    const pricing = (work_history) => ({ status: "ready", retry: jest.fn(), result: { ok: false, problems: [], lines: [], worker: { id: 7 }, ...(work_history ? { work_history } : {}) } });
    const card = (route, p) => render(<ContractSetupService worker={ worker } route={ route } choices={ {} } pricing={ p } onChoose={ jest.fn() } />);

    test("an ordinary Overseas invoice shows the review and opens the panel; saving prices again", async () => {
        saveWorkHistoryReview.mockResolvedValue({ data: { status: true } });
        const p = pricing(HISTORY);
        card("overseas", p);
        expect(screen.getByText("key_inv_history_not_reviewed")).toBeInTheDocument();
        fireEvent.click(screen.getByText("key_inv_review_work_history"));
        choose("key_inv_history_overseas_work");
        await act(async () => { save(); });
        await waitFor(() => expect(p.retry).toHaveBeenCalled());
        expect(screen.queryByRole("dialog")).toBeNull();
    });

    test("the stored outcome shows on the card", () => {
        card("overseas", pricing({ ...HISTORY, outcome: "domestic_only" }));
        expect(screen.getByText("key_inv_history_domestic_only")).toBeInTheDocument();
    });

    test("Direct Hire and Local have no review", () => {
        const { container, unmount } = card("direct_hire", pricing(HISTORY));
        expect(container.querySelector("[data-work-history]")).toBeNull();
        unmount();
        const local = card("local", pricing(HISTORY));
        expect(local.container.querySelector("[data-work-history]")).toBeNull();
    });
});
