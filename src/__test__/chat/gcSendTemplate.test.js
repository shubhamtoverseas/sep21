/* eslint-env jest */
/*
 * Send Template S8 — Global Chat (X-01; 10 Nov 2026 package F-13, delta row 12). The composer offers only the categories the
 * server offers this sender for the conversation's party and record (a Share adds its Job Offer / worker and link), lists
 * the party's own templates, shows the server's preview (missing values block Send), posts only site / template / channel /
 * record and hands the chat the server's body and account. The "[Not Available]" fill and the +7-day schedule are gone.
 */
import React from "react";
import fs from "fs";
import path from "path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../utils/permissions/configurationPermissionUtils", () => ({ getConfigurationPermissions: () => ({}) }));
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({
    useDispatch: () => mockDispatch,
    useSelector: (sel) => sel({ templates: { moduleList: [{ id: "worker", name: "Worker" }, { id: "employer", name: "Employer" }], languageList: [{ id: 1, code: "en", name_en: "English" }, { id: 2, code: "zhh", name_en: "Traditional Chinese" }] }, users: { permissionList: {} } }),
}));
jest.mock("../../redux/Slices/settings/templates/TemplateSlice", () => ({
    fetchModuleList: (payload) => ({ type: "modules", payload }),
    fetchLanguageList: (payload) => ({ type: "languages", payload }),
    fetchTemplateNameByFilter: (payload) => ({ type: "names", payload }),
    sendTemplateMessage: (payload) => ({ type: "send", payload }),
    sendChatMessage: (payload) => ({ type: "chat", payload }),
}));
jest.mock("../../services/templates", () => ({ previewTemplate: jest.fn(), getSendSiteCategories: jest.fn(), reportSendOutcome: jest.fn() }));

import GcSendTemplateModal, { gcSendContext } from "../../Views/Pages/Conversaction/newui/GcSendTemplateModal";
import { getSendSiteCategories, previewTemplate, reportSendOutcome } from "../../services/templates";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(__dirname, "../../", rel));
let templates = {};
let sendResult = null;
const READY = (over = {}) => ({ data: { data: {
    template: { id: 801, recipient_variant: "worker" }, body: "<p>Hi Siti &amp; welcome</p>", fields: [], missing: [], refused: [], can_send: true,
    recipient: { type: "worker", user_id: 1108, record_id: 688, friend_type: "worker" }, channels: ["in_app", "whatsapp"], ...over,
} } });

beforeEach(() => {
    templates = { worker: [{ id: 801, template_name: "Welcome", language_id: 1 }] };
    sendResult = { payload: { status: true, data: { id: 9, body: "<p>Hi Siti &amp; welcome</p>", recipient: { type: "worker", user_id: 1108, record_id: 688, friend_type: "worker" } } } };
    mockDispatch.mockReset();
    mockDispatch.mockImplementation((action) => {
        switch (action.type) {
            case "names": return Promise.resolve({ payload: { data: (templates[action.payload.recipient_variant] || []).filter((t) => t.language_id === action.payload.language_id) } });
            case "send": return Promise.resolve(sendResult);
            case "chat": return Promise.resolve({ payload: { success: true, message: "sent" } });
            default: return Promise.resolve({ payload: {} });
        }
    });
    getSendSiteCategories.mockImplementation(() => Promise.resolve({ data: { data: { data: { categories: [
        { id: 27, module_key: "worker", slug: "basic", name: "Basic" },
        { id: 61, module_key: "worker", slug: "share_jo_link", name: "Share JO Link" },
    ] } } } }));
    previewTemplate.mockImplementation(() => Promise.resolve(READY()));
    reportSendOutcome.mockReset();
    reportSendOutcome.mockImplementation(() => Promise.resolve({ data: { data: { id: 9 } } }));
});

const calls = (type) => mockDispatch.mock.calls.map(([a]) => a).filter((a) => a.type === type);
const renderWorker = (props = {}) => render(
    <GcSendTemplateModal onClose={ props.onClose || jest.fn() } userType="worker" recordId={ 688 } fullname="Siti" channels={ ["app", "whatsapp"] } { ...props } />
);
const choose = async (categoryId, templateName) => {
    await waitFor(() => expect(screen.getByRole("option", { name: "Basic" })).toBeInTheDocument());
    fireEvent.change(document.getElementById("gc-tpl-category"), { target: { value: String(categoryId) } });
    await waitFor(() => expect(screen.getByRole("option", { name: templateName })).toBeInTheDocument());
    fireEvent.change(document.getElementById("gc-tpl-template"), { target: { value: templateName } });
};

describe("categories: only what the server offers this sender for the party and record", () => {
    test("the conversation's party and record; a Share adds its Job Offer", async () => {
        renderWorker();
        await waitFor(() => expect(getSendSiteCategories).toHaveBeenCalledWith({ code: "X-01", party: "worker", worker_id: 688, employer_id: undefined, job_offer_id: undefined }));
        expect(gcSendContext("employer", 245, { worker_id: 688, job_offer_id: 3, links: { worker_profile_link: "https://w" } }))
            .toEqual({ employer_id: 245, worker_id: 688, job_offer_id: 3, links: { worker_profile_link: "https://w" } });
        expect(gcSendContext("user", 5, null)).toEqual({});
    });

    test("a staff or team conversation offers none and says so", async () => {
        render(<GcSendTemplateModal onClose={ jest.fn() } userType="user" recordId={ null } fullname="Ada" channels={ ["app"] } />);
        await waitFor(() => expect(document.querySelector("[data-gc-no-category]")).toHaveTextContent("key_st_no_category"));
        expect(getSendSiteCategories).not.toHaveBeenCalled();
    });

    test("the party's own templates per language", async () => {
        renderWorker();
        await choose(27, "Welcome");
        expect(calls("names").map((a) => a.payload)).toEqual([
            { category_id: 27, module_key: "worker", language_id: 1, recipient_variant: "worker" },
            { category_id: 27, module_key: "worker", language_id: 2, recipient_variant: "worker" },
        ]);
    });
});

describe("the server's preview and send", () => {
    test("the body is the server's; Send posts only site, template, channel and record; the chat gets the server's body and account", async () => {
        const onClose = jest.fn();
        renderWorker({ onClose, defaultChannel: "chat" });
        await choose(27, "Welcome");
        await waitFor(() => expect(document.getElementById("gc-tpl-body").value).toBe("Hi Siti & welcome"));
        expect(previewTemplate).toHaveBeenLastCalledWith({ site: "X-01", template_content_id: 801, context: { worker_id: 688 } });
        fireEvent.click(screen.getByText("key_send"));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(calls("send")[0].payload).toEqual({ site: "X-01", template_content_id: 801, channel: "chat", context: { worker_id: 688 } });
        expect(calls("chat")[0].payload).toMatchObject({ platform: "app", friend_id: 1108, friend_type: "worker", entity_id: 801, template_content: "<p>Hi Siti &amp; welcome</p>" });
    });

    test("a Share sends with its Job Offer and link; the link chip and reference show", async () => {
        renderWorker({ defaultChannel: "chat", share: { job_offer_id: 3, links: { job_offer_link: "https://jo/3" }, ref: "JO-3" } });
        await waitFor(() => expect(getSendSiteCategories).toHaveBeenCalledWith(expect.objectContaining({ job_offer_id: 3 })));
        expect(screen.getByText("https://jo/3")).toBeInTheDocument();
        await choose(61, "Welcome");
        await waitFor(() => expect(previewTemplate).toHaveBeenLastCalledWith({ site: "X-01", template_content_id: 801, context: { worker_id: 688, job_offer_id: 3, links: { job_offer_link: "https://jo/3" } } }));
    });

    test("missing values block Send (TM03); a refused preview shows the server's reason", async () => {
        previewTemplate.mockImplementation(() => Promise.resolve(READY({ can_send: false, missing: [{ token: "worker_present_address", name: "Worker Address (Present)" }] })));
        const { unmount } = renderWorker();
        await choose(27, "Welcome");
        await waitFor(() => expect(document.querySelector("[data-gc-missing]")).toHaveTextContent("Worker Address (Present)"));
        expect(screen.getByText("key_send").closest("button")).toBeDisabled();
        unmount();
        previewTemplate.mockImplementation(() => Promise.reject({ response: { data: { message: "You do not have permission to send this template for this record." } } }));
        renderWorker();
        await choose(27, "Welcome");
        await waitFor(() => expect(document.querySelector("[data-gc-refused]")).toHaveTextContent("You do not have permission"));
    });

    test("WhatsApp outside the 24-hour window is refused before anything is sent", async () => {
        renderWorker({ defaultChannel: "whatsapp", waWindowOpen: false });
        await choose(27, "Welcome");
        await waitFor(() => expect(screen.getByText("key_send").closest("button")).not.toBeDisabled());
        fireEvent.click(screen.getByText("key_send"));
        await waitFor(() => expect(screen.getByText("key_wa_window_expired_validation")).toBeInTheDocument());
        expect(calls("send")).toHaveLength(0);
    });

    test("a refused send stops the flow: nothing reaches the chat", async () => {
        sendResult = { error: { message: "Rejected" }, payload: { data: { data: { message: "This message still has fields without a value: x" } } } };
        renderWorker({ defaultChannel: "chat" });
        await choose(27, "Welcome");
        await waitFor(() => expect(screen.getByText("key_send").closest("button")).not.toBeDisabled());
        fireEvent.click(screen.getByText("key_send"));
        await waitFor(() => expect(calls("send")).toHaveLength(1));
        expect(calls("chat")).toHaveLength(0);
        expect(reportSendOutcome).not.toHaveBeenCalled();
    });

    test("S9 (F-30): the logged send gets the chat result — delivered, or failed with the chat's reason", async () => {
        const onClose = jest.fn();
        renderWorker({ onClose, defaultChannel: "chat" });
        await choose(27, "Welcome");
        await waitFor(() => expect(screen.getByText("key_send").closest("button")).not.toBeDisabled());
        fireEvent.click(screen.getByText("key_send"));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(reportSendOutcome).toHaveBeenCalledWith({ send_id: 9, outcome: "delivered" });
        reportSendOutcome.mockClear();
        mockDispatch.mockImplementation((action) => (action.type === "chat"
            ? Promise.resolve({ payload: { success: false, message: "WhatsApp did not accept the message" } })
            : action.type === "send" ? Promise.resolve(sendResult) : Promise.resolve({ payload: {} })));
        fireEvent.click(screen.getByText("key_send"));
        await waitFor(() => expect(reportSendOutcome).toHaveBeenCalledWith({ send_id: 9, outcome: "failed", detail: "WhatsApp did not accept the message" }));
    });
});

describe("no client value fill is left", () => {
    test("no [Not Available] fill, no +7-day schedule, no client token map", () => {
        const modal = read("Views/Pages/Conversaction/newui/GcSendTemplateModal.js");
        expect(modal).not.toMatch(/scheduled_date|next7Date|gcResolveTemplate|workerInfoMapping|template_content: resolved/);
        const chat = read("Views/Pages/Conversaction/newui/GlobalChat.js");
        expect(chat).toMatch(/recordId=\{ userDetailInfo\?\.employer_worker_id \}/);
        expect(chat).toMatch(/share=\{ shareContext \}/);
        expect(chat).not.toMatch(/gcTemplateTokens|shareTemplateMapping|templateTokenMapping/);
        expect(read("Views/Pages/Conversaction/newui/gcHelpers.js")).not.toMatch(/gcResolveTemplate|gcMissingContextLabels/);
        expect(exists("Views/Pages/Conversaction/newui/gcTemplateTokens.js")).toBe(false);
        expect(JSON.parse(fs.readFileSync(path.join(__dirname, "../../../public/locales/en/translation.json"), "utf8")).key_gc_tpl_not_available).toBeUndefined();
    });
});
