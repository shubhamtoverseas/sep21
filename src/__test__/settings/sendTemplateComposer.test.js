/* eslint-env jest */
/*
 * Send Template S6 — the shared composer (10 Nov 2026 package, delta row 8; settings-api S5 preview / send-message).
 * Every site opens it with its site code, the exact record and the record's parties; the server resolves the body, picks
 * the recipient account and the channels, and checks the sender's grant. The composer offers the category's recipients the
 * record has, lists each recipient's own templates, shows the server's preview (missing values block Send), posts only
 * site / template / channel / record, refuses WhatsApp outside the 24-hour window (F-21) and hands Action Required the
 * server's body.
 */
import React from "react";
import fs from "fs";
import path from "path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
jest.mock("../../hooks/useDialogFocus", () => ({ __esModule: true, default: () => undefined }));
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
const mockDispatch = jest.fn();
jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch, useSelector: (sel) => sel({}) }));
jest.mock("../../redux/Slices/settings/templates/TemplateSlice", () => ({
    fetchCategoryList: (payload) => ({ type: "categories", payload }),
    fetchLanguageList: (payload) => ({ type: "languages", payload }),
    fetchTemplateNameByFilter: (payload) => ({ type: "names", payload }),
    sendTemplateMessage: (payload) => ({ type: "send", payload }),
    sendChatMessage: (payload) => ({ type: "chat", payload }),
    saveActionRequiredLogs: (payload) => ({ type: "arlog", payload }),
}));
jest.mock("../../redux/Slices/worker/WorkerSlice", () => ({ saveWorkerValidateStatus: (payload) => ({ type: "validate", payload }) }));
jest.mock("../../services/templates", () => ({ previewTemplate: jest.fn(), getTemplateConfiguration: jest.fn(), getSendSiteCategories: jest.fn(), reportSendOutcome: jest.fn() }));
jest.mock("../../services/chat", () => ({ setIntConversation: jest.fn() }));

import WkdSendTemplateModal, { channelChoices, previewProblems, recipientChoices } from "../../Views/Pages/WorkerPage/worker-detail/newui/WkdSendTemplateModal";
import { contractParties } from "../../components/Processing/newui/StageSendTemplate";
import { docSendSite } from "../../Views/Pages/WorkerPage/worker-detail/newui/doc-review/useDocReview";
import { SEND_SITE } from "../../Views/Pages/SettingsPage/newui/templates/templateConfiguration";
import { indonesiaId, fillipinoId } from "../../components/ReusableComponents/constants";
import { getSendSiteCategories, getTemplateConfiguration, previewTemplate, reportSendOutcome } from "../../services/templates";
import { setIntConversation } from "../../services/chat";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(__dirname, "../../", rel));

const LANGUAGES = [{ id: 1, name_en: "English" }, { id: 2, name_en: "Traditional Chinese" }];
const CONTRACT_CONFIG = {
    configuration: { mode: "manual", channels: "in_app,whatsapp" },
    recipients: [
        { key: "worker", recipient_type: "worker" }, { key: "employer", recipient_type: "employer" }, { key: "cs", recipient_type: "cs" },
        { key: "employer_payment", recipient_type: "employer" }, { key: "cs_payment", recipient_type: "cs" },
    ],
};
let config = CONTRACT_CONFIG;
let templates = {};
let sendResult = null;
const PARTIES = { worker: { name: "Siti", phone: "+62812" }, employer: { name: "Peter Ho", phone: "+85255550000" }, cs: { name: "Ada", phone: "" } };
const READY = (over = {}) => ({ data: { data: {
    template: { id: 501, recipient_variant: "employer" }, body: "<p>Dear Peter &amp; family</p>", fields: [], missing: [], refused: [], can_send: true,
    recipient: { type: "employer", user_id: 1010, record_id: 245, friend_type: "employer" }, channels: ["in_app", "whatsapp"], ...over,
} } });

beforeEach(() => {
    config = CONTRACT_CONFIG;
    templates = { employer: [{ id: 501, template_name: "Contract ready", language_id: 1 }], worker: [{ id: 601, template_name: "Arrival", language_id: 1 }], cs: [] };
    sendResult = { payload: { status: true, data: { id: 9, channel: "chat", body: "<p>Dear Peter &amp; family</p>", recipient: { type: "employer", user_id: 1010, record_id: 245, friend_type: "employer" } } } };
    mockDispatch.mockReset();
    mockDispatch.mockImplementation((action) => {
        switch (action.type) {
            case "categories": return Promise.resolve({ payload: { data: [{ id: 32, slug: "processing_contract" }, { id: 2, slug: "biodata_action_required" }] } });
            case "languages": return Promise.resolve({ payload: { data: LANGUAGES } });
            case "names": return Promise.resolve({ payload: { data: (templates[action.payload.recipient_variant] || []).filter((t) => t.language_id === action.payload.language_id) } });
            case "send": return Promise.resolve(sendResult);
            case "chat": return Promise.resolve({ payload: { success: true, message: "sent" } });
            case "validate": return Promise.resolve({ payload: { status: true, message: "ok" } });
            default: return Promise.resolve({ payload: {} });
        }
    });
    getTemplateConfiguration.mockImplementation(() => Promise.resolve({ data: { data: { data: config } } }));
    previewTemplate.mockImplementation(() => Promise.resolve(READY()));
    reportSendOutcome.mockReset();
    reportSendOutcome.mockImplementation(() => Promise.resolve({ data: { data: { id: 9 } } }));
    setIntConversation.mockImplementation(() => Promise.resolve({ data: { data: { isActiveSeason: true } } }));
    getSendSiteCategories.mockImplementation(() => Promise.resolve({ data: { data: { data: { code: "X-07", categories: [
        { id: 32, module_key: "processing", slug: "processing_contract", name: "Contract" },
        { id: 33, module_key: "processing", slug: "processing_consulate", name: "Consulate" },
    ] } } } }));
});

const renderContract = (props = {}) => render(
    <WkdSendTemplateModal onClose={ jest.fn() } site="ST-11" context={ { contract_id: 49 } } userType="processing" slug="processing_contract" parties={ PARTIES } { ...props } />
);
const calls = (type) => mockDispatch.mock.calls.map(([a]) => a).filter((a) => a.type === type);
const pickTemplate = async (name) => {
    await waitFor(() => expect(screen.getByRole("option", { name })).toBeInTheDocument());
    fireEvent.change(document.getElementById("wkd-stm-template"), { target: { value: name } });
};

describe("Send to (TM01)", () => {
    test("the category's recipients the record has — never a payment-purpose variant without its invoice", () => {
        expect(recipientChoices(CONTRACT_CONFIG, PARTIES).map((c) => c.key)).toEqual(["worker", "employer", "cs"]);
        expect(recipientChoices(CONTRACT_CONFIG, { employer: PARTIES.employer }).map((c) => c.key)).toEqual(["employer"]);
        expect(recipientChoices(null, PARTIES)).toEqual([]);
    });

    test("the template list is the recipient's own, per language; another recipient reloads it", async () => {
        renderContract();
        await waitFor(() => expect(document.getElementById("wkd-stm-recipient")).toBeInTheDocument());
        await waitFor(() => expect(calls("names").length).toBe(2));
        expect(calls("names").map((a) => a.payload)).toEqual([
            { category_id: 32, module_key: "processing", language_id: 1, recipient_variant: "worker" },
            { category_id: 32, module_key: "processing", language_id: 2, recipient_variant: "worker" },
        ]);
        fireEvent.change(document.getElementById("wkd-stm-recipient"), { target: { value: "employer" } });
        await waitFor(() => expect(calls("names").filter((a) => a.payload.recipient_variant === "employer")).toHaveLength(2));
        await pickTemplate("Contract ready");
    });

    test("no template for the recipient says Content needed instead of an empty list (TM06)", async () => {
        renderContract({ parties: { cs: PARTIES.cs } });
        await waitFor(() => expect(document.querySelector("[data-mc-tpl-content-needed]")).toHaveTextContent("key_st_content_needed"));
        expect(document.getElementById("wkd-stm-template")).toBeNull();
    });

    test("an automatic category is never offered for manual sending", async () => {
        config = { ...CONTRACT_CONFIG, configuration: { mode: "automatic" } };
        renderContract();
        await waitFor(() => expect(document.querySelector("[data-mc-tpl-blocked]")).toHaveTextContent("key_st_mode_automatic"));
        expect(calls("names")).toHaveLength(0);
    });
});

describe("the server's preview (TM02 / TM03)", () => {
    test("the body is the server's, as text; the channels are the server's", async () => {
        renderContract({ parties: { employer: PARTIES.employer } });
        await pickTemplate("Contract ready");
        await waitFor(() => expect(document.getElementById("wkd-stm-body").value).toBe("Dear Peter & family"));
        expect(previewTemplate).toHaveBeenLastCalledWith({ site: "ST-11", template_content_id: 501, context: { contract_id: 49 } });
        expect(screen.getByLabelText("key_channel").querySelectorAll("option")).toHaveLength(2);
        expect(screen.getByText("key_send")).not.toBeDisabled();
    });

    test("fields without a value, outside the recipient or unknown are listed and Send stays disabled", async () => {
        previewTemplate.mockImplementation(() => Promise.resolve(READY({
            can_send: false,
            missing: [{ token: "job_offer_role", name: "Job Offer Role", reason: "no_value" }],
            refused: [{ token: "worker_hk_id", reason: "not_allowed" }, { token: "full_name", reason: "unknown" }],
        })));
        renderContract({ parties: { employer: PARTIES.employer } });
        await pickTemplate("Contract ready");
        await waitFor(() => expect(document.querySelector("[data-mc-tpl-missing]")).toHaveTextContent("Job Offer Role"));
        expect(document.querySelector("[data-mc-tpl-not-allowed]")).toHaveTextContent("{{worker_hk_id}}");
        expect(document.querySelector("[data-mc-tpl-unknown]")).toHaveTextContent("{{full_name}}");
        expect(screen.getByText("key_send")).toBeDisabled();
        expect(previewProblems({ missing: [{ token: "a" }] }).missing).toEqual(["a"]);
    });

    test("a refused preview shows the server's reason; a record without the recipient's account cannot send", async () => {
        previewTemplate.mockImplementation(() => Promise.reject({ response: { status: 403, data: { message: "You do not have permission to send this template for this record." } } }));
        const { unmount } = renderContract({ parties: { employer: PARTIES.employer } });
        await pickTemplate("Contract ready");
        await waitFor(() => expect(document.querySelector("[data-mc-tpl-refused]")).toHaveTextContent("You do not have permission"));
        expect(screen.getByText("key_send")).toBeDisabled();
        unmount();
        previewTemplate.mockImplementation(() => Promise.resolve(READY({ recipient: null })));
        renderContract({ parties: { employer: PARTIES.employer } });
        await pickTemplate("Contract ready");
        await waitFor(() => expect(document.querySelector("[data-mc-tpl-no-recipient]")).toBeInTheDocument());
        expect(screen.getByText("key_send")).toBeDisabled();
    });

    test("server channel names map to the send's", () => {
        expect(channelChoices(["in_app", "whatsapp", "sms"])).toEqual(["chat", "whatsapp"]);
        expect(channelChoices(undefined)).toEqual([]);
    });
});

describe("Send", () => {
    test("posts only site, template, channel and record; the chat delivery goes to the account and body the server returned", async () => {
        const onSent = jest.fn();
        renderContract({ parties: { employer: PARTIES.employer }, onSent });
        await pickTemplate("Contract ready");
        await waitFor(() => expect(screen.getByText("key_send")).not.toBeDisabled());
        fireEvent.change(screen.getByLabelText("key_channel"), { target: { value: "chat" } });
        fireEvent.click(screen.getByText("key_send"));
        await waitFor(() => expect(calls("chat")).toHaveLength(1));
        expect(calls("send")[0].payload).toEqual({ site: "ST-11", template_content_id: 501, channel: "chat", context: { contract_id: 49 } });
        expect(calls("chat")[0].payload).toMatchObject({ platform: "app", friend_id: 1010, friend_type: "employer", entity_id: 501, entity_type: "template", template_content: "<p>Dear Peter &amp; family</p>" });
        expect(setIntConversation).not.toHaveBeenCalled();
        expect(onSent).toHaveBeenCalledWith(calls("chat")[0].payload);
    });

    test("WhatsApp outside the 24-hour window is refused before anything is sent (F-21)", async () => {
        setIntConversation.mockImplementation(() => Promise.resolve({ data: { data: { isActiveSeason: false } } }));
        renderContract({ parties: { employer: PARTIES.employer } });
        await pickTemplate("Contract ready");
        await waitFor(() => expect(screen.getByLabelText("key_channel").value).toBe("whatsapp"));
        fireEvent.click(screen.getByText("key_send"));
        await waitFor(() => expect(document.querySelector("[data-mc-tpl-wa-closed]")).toHaveTextContent("key_wa_window_expired_validation"));
        expect(setIntConversation).toHaveBeenCalledWith({ friend_type: "employer", platform: "whatsapp", friend_id: 1010 });
        expect(calls("send")).toHaveLength(0);
        expect(screen.getByText("key_send")).toBeDisabled();
    });

    test("a refused send stops the flow: nothing goes to chat", async () => {
        sendResult = { error: { message: "Rejected" }, payload: { data: { data: { message: "This message still has fields without a value: x" } } } };
        renderContract({ parties: { employer: PARTIES.employer } });
        await pickTemplate("Contract ready");
        await waitFor(() => expect(screen.getByText("key_send")).not.toBeDisabled());
        fireEvent.change(screen.getByLabelText("key_channel"), { target: { value: "chat" } });
        fireEvent.click(screen.getByText("key_send"));
        await waitFor(() => expect(calls("send")).toHaveLength(1));
        expect(calls("chat")).toHaveLength(0);
        expect(reportSendOutcome).not.toHaveBeenCalled();
    });

    test("S9 (F-30): the logged send gets the chat result — delivered, or failed with the chat's reason", async () => {
        renderContract({ parties: { employer: PARTIES.employer } });
        await pickTemplate("Contract ready");
        await waitFor(() => expect(screen.getByText("key_send")).not.toBeDisabled());
        fireEvent.change(screen.getByLabelText("key_channel"), { target: { value: "chat" } });
        fireEvent.click(screen.getByText("key_send"));
        await waitFor(() => expect(reportSendOutcome).toHaveBeenCalledWith({ send_id: 9, outcome: "delivered" }));
        reportSendOutcome.mockClear();
        mockDispatch.mockImplementation((action) => (action.type === "chat"
            ? Promise.resolve({ payload: { success: false, message: "WhatsApp did not accept the message" } })
            : action.type === "send" ? Promise.resolve(sendResult) : Promise.resolve({ payload: {} })));
        fireEvent.click(screen.getByText("key_send"));
        await waitFor(() => expect(reportSendOutcome).toHaveBeenCalledWith({ send_id: 9, outcome: "failed", detail: "WhatsApp did not accept the message" }));
    });

    test("Action Required hands the server's body to the Action Required route, never to send-message", async () => {
        config = { configuration: { mode: "manual" }, recipients: [{ key: "worker", recipient_type: "worker" }] };
        templates = { worker: [{ id: 701, template_name: "Fix biodata", language_id: 1 }] };
        previewTemplate.mockImplementation(() => Promise.resolve(READY({ template: { id: 701, recipient_variant: "worker" }, body: "<p>Please fix</p>", recipient: { type: "worker", user_id: 1108, record_id: 688, friend_type: "worker" }, channels: ["in_app"] })));
        const handleRefreshProfile = jest.fn();
        render(<WkdSendTemplateModal onClose={ jest.fn() } site={ SEND_SITE.WORKER_BIODATA_AR } context={ { worker_id: 688 } } userType="worker" slug="biodata_action_required"
            parties={ { worker: { name: "Siti" } } } status_key="action_required" actionStatusType="biodata" handleRefreshProfile={ handleRefreshProfile } />);
        await pickTemplate("Fix biodata");
        await waitFor(() => expect(screen.getByText("key_send")).not.toBeDisabled());
        fireEvent.click(screen.getByText("key_send"));
        await waitFor(() => expect(handleRefreshProfile).toHaveBeenCalledWith("biodata"));
        expect(calls("validate")[0].payload).toEqual({ worker_id: 688, type: "biodata", status_key: "action_required", reason: "<p>Please fix</p>" });
        expect(calls("arlog")[0].payload).toEqual({ user_id: 1108, entity_id: 688, entity_type: "worker", action_type: "biodata_action_required", content: "<p>Please fix</p>" });
        expect(calls("send")).toHaveLength(0);
    });

    const renderAR = (props = {}) => {
        config = { configuration: { mode: "manual" }, recipients: [{ key: "worker", recipient_type: "worker" }] };
        templates = { worker: [{ id: 701, template_name: "Fix biodata", language_id: 1 }] };
        previewTemplate.mockImplementation(() => Promise.resolve(READY({ template: { id: 701, recipient_variant: "worker" }, body: "<p>Please fix</p>", recipient: { type: "worker", user_id: 1108, record_id: 688, friend_type: "worker" }, channels: ["in_app"] })));
        return render(<WkdSendTemplateModal site={ SEND_SITE.WORKER_BIODATA_AR } context={ { worker_id: 688 } } userType="worker" slug="biodata_action_required"
            parties={ { worker: { name: "Siti" } } } status_key="action_required" actionStatusType="biodata" { ...props } />);
    };

    test("UP02: a saved decision whose message is not delivered says so apart from a failed save; Resend sends the message only", async () => {
        const base = mockDispatch.getMockImplementation();
        const arlogAnswers = [{ payload: { success: false, message: "Chat is unavailable" } }, { payload: { success: true, message: "ok" } }];
        mockDispatch.mockImplementation((action) => (action.type === "arlog" ? Promise.resolve(arlogAnswers.shift()) : base(action)));
        const onClose = jest.fn();
        const handleRefreshProfile = jest.fn();
        renderAR({ onClose, handleRefreshProfile });
        await pickTemplate("Fix biodata");
        await waitFor(() => expect(screen.getByText("key_send")).not.toBeDisabled());
        fireEvent.click(screen.getByText("key_send"));
        await waitFor(() => expect(document.querySelector("[data-mc-tpl-ar-undelivered]")).toHaveTextContent("key_st_ar_saved_not_delivered Chat is unavailable"));
        expect(handleRefreshProfile).toHaveBeenCalledWith("biodata");   // the decision is saved: the section shows it
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.queryByText("key_send")).toBeNull();
        fireEvent.click(screen.getByText("key_st_ar_resend"));
        await waitFor(() => expect(onClose).toHaveBeenCalled());
        expect(calls("validate")).toHaveLength(1);   // never saved twice
        expect(calls("arlog")).toHaveLength(2);
        expect(document.querySelector("[data-mc-tpl-ar-undelivered]")).toBeNull();
    });

    test("UP02: a failed save sends nothing and shows no delivery notice", async () => {
        const base = mockDispatch.getMockImplementation();
        mockDispatch.mockImplementation((action) => (action.type === "validate" ? Promise.resolve({ payload: { status: false, message: "Not allowed" } }) : base(action)));
        const onClose = jest.fn();
        const handleRefreshProfile = jest.fn();
        renderAR({ onClose, handleRefreshProfile });
        await pickTemplate("Fix biodata");
        await waitFor(() => expect(screen.getByText("key_send")).not.toBeDisabled());
        fireEvent.click(screen.getByText("key_send"));
        await waitFor(() => expect(calls("validate")).toHaveLength(1));
        await waitFor(() => expect(screen.getByText("key_send")).not.toBeDisabled());
        expect(calls("arlog")).toHaveLength(0);
        expect(handleRefreshProfile).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(document.querySelector("[data-mc-tpl-ar-undelivered]")).toBeNull();
    });
});

describe("S7 · the rail and Calendar choose their category (package X-07 / X-08: no fixed Contract template)", () => {
    const renderRail = (site = SEND_SITE.CONTRACT_RAIL) => render(
        <WkdSendTemplateModal onClose={ jest.fn() } site={ site } context={ { contract_id: 49 } } userType="processing" parties={ { employer: PARTIES.employer } } />
    );

    test("the site's hand-sent categories are offered; the chosen one loads its own configuration and templates", async () => {
        renderRail();
        await waitFor(() => expect(screen.getByRole("option", { name: "Consulate" })).toBeInTheDocument());
        expect(getSendSiteCategories).toHaveBeenCalledWith({ code: "X-07" });
        expect(calls("categories")).toHaveLength(0);
        expect(calls("names")).toHaveLength(0);
        fireEvent.change(document.getElementById("wkd-stm-category"), { target: { value: "33" } });
        await waitFor(() => expect(getTemplateConfiguration).toHaveBeenCalledWith({ category_id: 33 }));
        await waitFor(() => expect(calls("names").map((a) => a.payload)).toContainEqual({ category_id: 33, module_key: "processing", language_id: 1, recipient_variant: "employer" }));
        await pickTemplate("Contract ready");
        await waitFor(() => expect(previewTemplate).toHaveBeenLastCalledWith({ site: "X-07", template_content_id: 501, context: { contract_id: 49 } }));
    });

    test("one category is chosen for the sender; none says so", async () => {
        getSendSiteCategories.mockImplementation(() => Promise.resolve({ data: { data: { data: { categories: [{ id: 33, module_key: "processing", slug: "processing_consulate", name: "Consulate" }] } } } }));
        const { unmount } = renderRail(SEND_SITE.CALENDAR_TASK);
        await waitFor(() => expect(getTemplateConfiguration).toHaveBeenCalledWith({ category_id: 33 }));
        expect(document.getElementById("wkd-stm-category")).toBeNull();
        unmount();
        getSendSiteCategories.mockImplementation(() => Promise.resolve({ data: { data: { data: { categories: [] } } } }));
        renderRail();
        await waitFor(() => expect(document.querySelector("[data-mc-tpl-blocked]")).toHaveTextContent("key_st_no_category"));
    });

    test("the rail opener fixes no category; the Pick Up footer sends Deployment Pickup (70, ruling Q8)", () => {
        const panel = read("Views/Pages/Contract/details/ContextPanelSections.js");
        expect(panel).toMatch(/<StageSendTemplate contractDetails=\{ contractDetails \} site=\{ sendSite \} onClose=\{ closeSend \} \/>/);
        expect(read("Views/Pages/Contract/contractConstants.js")).toMatch(/CR_TASK_SEND_TEMPLATE = Object\.freeze\(\{ userType: "processing" \}\)/);
        const pickup = read("Views/Pages/ProcessingPage/processing-detail/deployment-tab/pickup-tab/PickupTab.js");
        expect(pickup).toMatch(/onSendTemplate=\{ \(\) => openTemplate\("processing_deployment_pickup", ""\) \}/);
        expect(pickup).toMatch(/openTemplate\("processing_deployment_share_pickup", "pickup"\)/);
        expect(pickup).not.toMatch(/openTemplate\("processing_deployment", /);
    });
});

describe("every send site names itself and its record; no client value map is left", () => {
    test("site codes are the package's, one each", () => {
        const codes = Object.values(SEND_SITE);
        expect(new Set(codes).size).toBe(codes.length);
        codes.forEach((c) => expect(c).toMatch(/^(ST-\d\d|X-\d\d)$/));
        expect(docSendSite({ nationality: { id: indonesiaId } })).toBe("ST-05");
        expect(docSendSite({ nationality: { id: fillipinoId } })).toBe("ST-03");
    });

    test("the contract's parties: its worker, employer (WhatsApp number first) and CS", () => {
        expect(contractParties({ worker_id: 7, worker_name: "Siti", country_code: "+62", mobile_number: "812", employer_id: 4, employer_name: "Peter Ho", employer_whatsapp_country_code: "+852", employer_whatsapp_number: "5555", employer_country_code: "+852", employer_mobile_number: "6666", cs_staff_id: 30, cs_name: "Ada" }))
            .toEqual({ worker: { name: "Siti", phone: "+62812" }, employer: { name: "Peter Ho", phone: "+8525555" }, cs: { name: "Ada", phone: "" } });
        expect(contractParties({ employer_id: 4, employer_name: "Peter Ho" })).toEqual({ employer: { name: "Peter Ho", phone: "" } });
    });

    test("each opener passes its site and record; none passes the old client-built values", () => {
        const openers = {
            "components/Processing/newui/StageSendTemplate.js": [/site=\{ site \}/, /context=\{ \{ contract_id: contractDetails\?\.id \} \}/],
            "Views/Pages/Contract/details/ContextPanelSections.js": [/SEND_SITE\.CONTRACT_RAIL/, /SEND_SITE\.CALENDAR_TASK/],
            "Views/Pages/Contract/extend-visa/ExtendVisaShared.js": [/site=\{ SEND_SITE\.EXTEND_VISA \}/],
            "Views/Pages/Employer/newui/details/tabs/EmployerSectionSendTemplate.js": [/SEND_SITE\.EMPLOYER_BASIC/, /SEND_SITE\.EMPLOYER_FAMILY/, /context=\{ \{ employer_id: employer\?\.employer_id \} \}/],
            "Views/Pages/JobOfferPage/newui/record/JoSendTemplate.js": [/SEND_SITE\.JOB_OFFER_SHARE\b/, /SEND_SITE\.JOB_OFFER_SHARE_WORKER/, /job_offer_id: jobOfferId/],
            "Views/Pages/WorkerPage/worker-detail/newui/details/WkdSendTemplate.js": [/SEND_SITE\.WORKER_BASIC/, /SEND_SITE\.WORKER_PASSPORT/, /SEND_SITE\.WORKER_CONSULATE/],
            "Views/Pages/WorkerPage/worker-detail/profile-tab/biodata-tab/BiodataView.js": [/site=\{ SEND_SITE\.WORKER_BIODATA_AR \}/],
            "Views/Pages/WorkerPage/worker-detail/newui/photo/WkdPhotoTab.js": [/site=\{ SEND_SITE\.WORKER_PHOTO_AR \}/],
            "Views/Pages/WorkerPage/worker-detail/newui/doc-review/WkdDocReview.js": [/site=\{ r\.template\.site \}/],
            "Views/Pages/WorkerPage/worker-detail/newui/joboffer/WkdJobOfferDetail.js": [/site=\{ SEND_SITE\.WORKER_JOB_OFFER \}/, /job_offer_id: workerJobOfferDetails\?\.id/],
            /* S10a (ruling Q5): the Partner inquiry (ST-04 / ST-06) is the approved WhatsApp template sent by chat, not this composer */
            "Views/Pages/WorkerPage/worker-detail/newui/WkdChangePartnerDialog.js": [/<WkdPartnerInquiryDialog/],
        };
        Object.entries(openers).forEach(([file, patterns]) => {
            const src = read(file);
            patterns.forEach((re) => expect({ file, ok: re.test(src) }).toEqual({ file, ok: true }));
            expect({ file, old: /workerInfoMapping=|send_to=|employee_worker_id=|recipientLabel=/.test(src) }).toEqual({ file, old: false });
        });
        expect(read("components/Processing/newui/StageSendTemplate.js")).not.toMatch(/contractId=|employer_user_id/);
        const modal = read("Views/Pages/WorkerPage/worker-detail/newui/WkdSendTemplateModal.js");
        expect(modal).not.toMatch(/template_content:\s*messageText|send_to_user_id|workerInfoMapping/);
        expect(exists("Views/Pages/ProcessingPage/useProcessingTemplateMapping.js")).toBe(false);
        expect(read("redux/Slices/settings/templates/TemplateSlice.js")).not.toMatch(/fetchDynamicFieldListEmployer|fetchDynamicFieldListProcessing/);
    });
});
