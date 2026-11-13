/* eslint-env jest */
/*
 * Send Template S10a — the Partner inquiry and the post-assignment worker message (10 Nov 2026 package REF-PERM "Partner
 * inquiry and assignment notifications", F-12, ST-04 / ST-06, TC01–TC07; S10 delta rows 1–6, rulings Q5, A, B — 12 Nov 2026).
 * The inquiry is the approved WhatsApp template `assign_pt`, sent by chat to the proposed PT; it assigns nothing and needs the
 * journey's Assign Partner — Send Template grant. A worker without a code reads "Not Assigned". The separate Assign action then
 * sends category 65 to the worker in-app, from the Onboarding 2 owner. The legacy inquiry-that-assigns is gone.
 */
import React from "react";
import fs from "fs";
import path from "path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
jest.mock("../../components/show-toast/ShowToast", () => ({ ShowToast: jest.fn() }));
jest.mock("../../services/templates", () => ({ getTemplateWhatsApp: jest.fn(), sendTemplateMessagePartnerAssign: jest.fn() }));
jest.mock("../../redux/Slices/settings/templates/TemplateSlice", () => ({
    fetchCategoryList: (args) => ({ t: "categories", args }),
    fetchTemplateNameByFilter: (args) => ({ t: "templates", args }),
    sendChatMessage: (args) => ({ t: "sendChat", args }),
}));
jest.mock("../../redux/Slices/settings/agencies/AgenciesSlice", () => ({ fetchMappingAgencies: (args) => ({ t: "agencies", args }) }));
jest.mock("../../redux/Slices/common/cs/CsSlice", () => ({ searchPartnerStaff: (args) => ({ t: "staff", args }) }));
jest.mock("../../redux/Slices/worker/WorkerSlice", () => ({ saveAssignPTWorker: (args) => ({ t: "assign", args }) }));
const actions = [];
const mockDispatch = jest.fn();
const answer = (action) => {
    actions.push(action);
    switch (action.t) {
        case "agencies": return Promise.resolve({ payload: [{ id: 3, name: "PH Agency", code: "PHA", branch_list: [{ id: 30, branch_name: "Manila", branch_code: "MNL" }] }] });
        case "staff": return Promise.resolve({ payload: { data: [{ id: 5, user_id: 77, name: "Budi", email: "budi@pt.test", whatsapp_country_code: "+63", whatsapp: "917", worker_count: 1 }] } });
        case "assign": return Promise.resolve({ payload: { status: true, message: "Assigned" } });
        case "categories": return Promise.resolve({ payload: { data: [{ id: 65, slug: "partner_assigned_information_auto_message" }] } });
        case "templates": return Promise.resolve({ payload: { data: [{ id: 206, template_content: "<p>Hello {{ worker_full_name }}</p>", file_path_name: null }] } });
        default: return Promise.resolve({ payload: { success: true } });
    }
};
jest.mock("react-redux", () => ({ useDispatch: () => mockDispatch }));

import WkdPartnerInquiryDialog from "../../Views/Pages/WorkerPage/worker-detail/newui/WkdPartnerInquiryDialog";
import WkdChangePartnerDialog from "../../Views/Pages/WorkerPage/worker-detail/newui/WkdChangePartnerDialog";
import {
    approvedTemplateText, assignPartnerGrant, canSendPartnerInquiry, fillApprovedText, hasPartnerInquiry, inquiryValues, sendPartnerAssignedMessage,
} from "../../Views/Pages/WorkerPage/worker-detail/newui/partnerInquiry";
import { getTemplateWhatsApp, sendTemplateMessagePartnerAssign } from "../../services/templates";
import { ShowToast } from "../../components/show-toast/ShowToast";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");
const APPROVED = { data: { data: { data: [{ name: "assign_pt", components: [{ type: "BODY", text: "Hello, worker {{1}} ({{2}}), code {{3}}. Will you accept?" }] }] } } };
const PT = { id: 5, user_id: 77, name: "Budi", whatsapp_country_code: "+63", whatsapp: "917" };

beforeEach(() => {
    actions.length = 0;
    mockDispatch.mockReset();
    mockDispatch.mockImplementation(answer);   // CRA resets mock implementations before each test
    ShowToast.mockClear();
    getTemplateWhatsApp.mockReset();
    getTemplateWhatsApp.mockImplementation(() => Promise.resolve(APPROVED));
    sendTemplateMessagePartnerAssign.mockReset();
    sendTemplateMessagePartnerAssign.mockImplementation(() => Promise.resolve({ data: { success: true, message: "sent" } }));
});

describe("Send inquiry (ST-04 / ST-06, ruling Q5)", () => {
    test("shows the PT, agency, branch and worker; Send posts the approved template through chat and assigns nothing", async () => {
        const onSent = jest.fn();
        render(<WkdPartnerInquiryDialog pt={ PT } agencyName="PH Agency" branchName="Manila" worker={ { name: "Maria Santos", nationality: "Filipino" } } onClose={ jest.fn() } onSent={ onSent } />);
        await waitFor(() => expect(document.querySelector("[data-inquiry-text]")).toHaveTextContent("Hello, worker Maria Santos (Filipino), code key_not_assigned. Will you accept?"));
        expect(getTemplateWhatsApp).toHaveBeenCalledWith({ name: "assign_pt", language: "en" });
        expect(document.querySelector("[data-inquiry-to]")).toHaveTextContent("Budi · PH Agency · Manila");
        expect(document.querySelector("[data-inquiry-to]")).toHaveTextContent("+63917");
        expect(document.querySelector("[data-inquiry-worker]")).toHaveTextContent("Maria Santos · Filipino · key_worker_code: key_not_assigned");
        fireEvent.click(screen.getByRole("button", { name: "key_wkr_send_inquiry" }));
        await waitFor(() => expect(onSent).toHaveBeenCalled());
        expect(sendTemplateMessagePartnerAssign).toHaveBeenCalledWith({
            platform: "whatsapp", friend_id: 77, friend_type: "user", entity_type: "template",
            template_content: "Hello, worker Maria Santos (Filipino), code key_not_assigned. Will you accept?",
            worker_name: "Maria Santos", nationality: "Filipino", reference_id: "key_not_assigned",
        });
        expect(ShowToast).toHaveBeenCalledWith("success", "key_wkr_inquiry_sent");
        expect(actions).toEqual([]);   // no assignment, no other write
    });

    test("a refused send keeps the dialog open with chat's reason; without the approved template nothing can be sent", async () => {
        sendTemplateMessagePartnerAssign.mockImplementation(() => Promise.resolve({ data: { success: false, message: "Not a WhatsApp number" } }));
        const onSent = jest.fn();
        const { unmount } = render(<WkdPartnerInquiryDialog pt={ PT } agencyName="PH Agency" branchName="Manila" worker={ { name: "Maria Santos", nationality: "Filipino", code: "PH-0042" } } onClose={ jest.fn() } onSent={ onSent } />);
        await waitFor(() => expect(document.querySelector("[data-inquiry-text]")).toHaveTextContent("code PH-0042"));
        fireEvent.click(screen.getByRole("button", { name: "key_wkr_send_inquiry" }));
        await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Not a WhatsApp number"));
        expect(onSent).not.toHaveBeenCalled();
        expect(sendTemplateMessagePartnerAssign.mock.calls[0][0].reference_id).toBe("PH-0042");
        unmount();
        getTemplateWhatsApp.mockImplementation(() => Promise.resolve({ data: { data: { data: [] } } }));
        render(<WkdPartnerInquiryDialog pt={ PT } agencyName="PH Agency" branchName="Manila" worker={ { name: "Maria Santos", nationality: "Filipino" } } onClose={ jest.fn() } />);
        await waitFor(() => expect(document.querySelector("[data-inquiry-unavailable]")).toHaveTextContent("key_wkr_inquiry_unavailable"));
        expect(screen.getByRole("button", { name: "key_wkr_send_inquiry" })).toBeDisabled();
    });

    test("the template's values, its text and who may send it", () => {
        expect(inquiryValues({ name: "A", nationality: "B" })).toEqual(["A", "B", "key_not_assigned"]);
        expect(fillApprovedText("{{1}} / {{ 2 }} / {{3}} / {{4}}", ["a", "b", "c"])).toBe("a / b / c / {{4}}");
        expect(approvedTemplateText({ components: [{ type: "HEADER", format: "TEXT", text: "Partner inquiry" }, { type: "BODY", text: "Body {{1}}" }] })).toBe("Partner inquiry\nBody {{1}}");
        expect(canSendPartnerInquiry(["view", "edit"], false)).toBe(false);
        expect(canSendPartnerInquiry(["view", "send_template"], false)).toBe(true);
        expect(canSendPartnerInquiry([], true)).toBe(true);
        const access = { worker_philippines_worker_assign_partner: ["send_template"], worker_indonesia_worker_assign_partner: ["view"] };
        expect([assignPartnerGrant(access, 71), assignPartnerGrant(access, 95), assignPartnerGrant(access, 1)]).toEqual([["send_template"], ["view"], []]);
        expect([hasPartnerInquiry(71), hasPartnerInquiry("95"), hasPartnerInquiry(200)]).toEqual([true, true, false]);
    });
});

describe("after an actual assignment: category 65 to the worker in-app (ruling A)", () => {
    test("the English template for the worker, its name filled, sent from the Onboarding 2 owner", async () => {
        await sendPartnerAssignedMessage(mockDispatch, { workerUserId: 501, workerName: "Maria Santos", senderUserId: 909 });
        expect(actions.map((a) => a.t)).toEqual(["categories", "templates", "sendChat"]);
        expect(actions[1].args).toEqual({ category_id: 65, module_key: "worker", language_id: 2, recipient_variant: "worker" });
        expect(actions[2].args).toEqual({ platform: "app", friend_id: 501, entity_id: 206, entity_type: "template", friend_type: "user", template_file_path: null, template_content: "<p>Hello Maria Santos</p>", sender_id: 909 });
        actions.length = 0;
        await sendPartnerAssignedMessage(mockDispatch, { workerUserId: null, workerName: "x" });
        expect(actions).toEqual([]);
    });
});

describe("Change Partner: the inquiry needs the Send Template grant; Assign assigns, then tells the worker", () => {
    const worker = { worker_id: 12, user_id: 501, name: "Maria Santos", type: "Overseas", nationality: "Filipino", nationality_id: 71, onboarding2_user_id: 909 };
    const toPt = async () => {
        fireEvent.click(await screen.findByRole("radio", { name: /PH Agency · Manila/ }));
        fireEvent.click(screen.getByRole("button", { name: "key_next_select_agent" }));
        fireEvent.click(await screen.findByRole("radio", { name: /Budi/ }));
    };

    test("without the grant there is no Send inquiry; Assign writes the assignment and sends 65 from the Onboarding 2 owner", async () => {
        const onChanged = jest.fn();
        render(<WkdChangePartnerDialog worker={ { ...worker, canSendPartnerInquiry: false } } onClose={ jest.fn() } onChanged={ onChanged } />);
        await toPt();
        expect(screen.queryByRole("button", { name: "key_wkr_send_inquiry" })).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: "key_change_partner" }));
        await waitFor(() => expect(actions.some((a) => a.t === "sendChat")).toBe(true));
        expect(actions.find((a) => a.t === "assign").args).toEqual({ pt_staff_id: 5, worker_id: 12, pt_staff_agency_id: 3, pt_staff_branch_id: 30 });
        expect(actions.find((a) => a.t === "sendChat").args).toMatchObject({ friend_id: 501, sender_id: 909, template_content: "<p>Hello Maria Santos</p>" });
        expect(onChanged).toHaveBeenCalled();
    });

    test("with the grant, Send inquiry opens the inquiry for the picked PT and assigns nothing", async () => {
        render(<WkdChangePartnerDialog worker={ { ...worker, canSendPartnerInquiry: true } } onClose={ jest.fn() } />);
        await toPt();
        fireEvent.click(screen.getByRole("button", { name: "key_wkr_send_inquiry" }));
        await waitFor(() => expect(document.querySelector("[data-inquiry-to]")).toHaveTextContent("Budi · PH Agency · Manila"));
        await waitFor(() => expect(document.querySelector("[data-inquiry-text]")).toBeInTheDocument());
        const sendButtons = screen.getAllByRole("button", { name: "key_wkr_send_inquiry" });
        fireEvent.click(sendButtons[sendButtons.length - 1]);
        await waitFor(() => expect(sendTemplateMessagePartnerAssign).toHaveBeenCalledTimes(1));
        expect(actions.some((a) => a.t === "assign" || a.t === "sendChat")).toBe(false);
    });
});

describe("the inquiry-that-assigns and its plumbing are gone", () => {
    test("no legacy inquiry, no merge map, no dynamic-field list, no post-assignment slugs as the inquiry", () => {
        const assignPt = read("Views/Pages/WorkerPage/worker-detail/details-tab-worker/assign-pt/AssignPT.js");
        expect(assignPt).not.toMatch(/SendTemplatePopup|workerInfoMapping|pt_assign_indonesian|pt_assign_philippines|actionStatusType: "pt_assign"/);
        expect(assignPt).toMatch(/canSendPartnerInquiry\(assignPartnerPermission, isAdmin\)/);
        const submit = assignPt.slice(assignPt.indexOf("saveAssignPTWorker(payload)"), assignPt.indexOf("} else {", assignPt.indexOf("saveAssignPTWorker(payload)")));
        expect(submit).toMatch(/sendPartnerAssignedMessage\(dispatch, \{ workerUserId: workerDetailTabInfo\?\.user_id/);
        expect(read("Views/Pages/WorkerPage/worker-detail/newui/WkdChangePartnerDialog.js")).not.toMatch(/WkdSendTemplateModal|SEND_SITE|PARTNER_INQUIRY_TEMPLATE/);
        const form = read("components/template-form/TemplateFormWhatsApp.js");
        expect(form).not.toMatch(/saveAssignPTWorker|sendTemplateMessagePTAssign|pt_assign|partner_assigned_information_auto_message|partnerTemplateText|agencyInfo|onHandlePTAssignTemplate/);
        expect(read("components/Layout/popups/template-whatsapp/SendTemplatePopup.js")).not.toMatch(/agencyInfo|onHandlePTAssignTemplate|handleClickSubmitPartner/);
        for (const file of ["components/Processing/CommonIndividualChat.js", "Views/Pages/Conversaction/newui/GcMiniChat.js", "Views/Pages/Conversaction/newui/GlobalChat.js"]) {
            expect({ file, agencyInfo: /agencyInfo=/.test(read(file)) }).toEqual({ file, agencyInfo: false });
        }
        expect(read("Views/Pages/WorkerPage/worker-detail/WorkerDetail.js")).not.toMatch(/workerInfoMapping|dynamicFieldList|fetchDynamicFieldList/);
        expect(read("Views/Pages/WorkerPage/worker-detail/profile-tab/ProfileTab.js")).not.toMatch(/workerInfoMapping/);
        expect(read("redux/Slices/settings/templates/TemplateSlice.js")).not.toMatch(/fetchDynamicFieldList|dynamicFieldList|sendTemplateMessagePTAssign/);
        expect(read("redux/Slices/settings/templates/templatesExtraReducers.js")).not.toMatch(/dynamicFieldList/);
        expect(read("services/templates.js")).not.toMatch(/getDynamicFieldList/);
        expect(read("services/apiPath.js")).not.toMatch(/dynamic-field-list/);
        const constants = require("../../Views/Pages/WorkerPage/workerModuleConstants");
        expect(constants.PARTNER_INQUIRY_TEMPLATE).toBeUndefined();
        expect(constants.PARTNER_INQUIRY).toEqual({ template: "assign_pt", language: "en" });
        const en = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
        expect(en.key_assign_pt_send_template).toBeUndefined();
        expect(en.key_wkr_inquiry_sent).toBe("Partner assignment inquiry sent to {name} · {branch} (WhatsApp)");
    });
});
