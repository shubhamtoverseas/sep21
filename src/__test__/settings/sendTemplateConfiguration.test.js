/* eslint-env jest */
import React from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import templatesReducer from "../../redux/Slices/settings/templates/TemplateSlice";
import TemplateFormPage from "../../Views/Pages/SettingsPage/newui/templates/TemplateFormPage";
import TemplateCategoriesView from "../../Views/Pages/SettingsPage/newui/templates/TemplateCategoriesView";
import AddEditTemplateFormChat from "../../components/template-form/AddEditTemplateFormChat";

/* Send Template configuration S3 (10 Nov 2026 package; TM01, TM02, TM05, F-16; rulings Q1, Q2): the template form shows the
   category's configuration, asks who the template is for, and offers only that recipient's dynamic fields; a refused save
   names the fields. Settings → Send Template Manager → Categories lists every category read-only. The Global Chat template
   form asks for the recipient too and no longer reports a refused save as saved. */

jest.mock("../../utils/translation", () => {
    const strings = require("../../../public/locales/en/translation.json");
    const t = (key) => strings[key] ?? key;
    return { __esModule: true, default: t, translation: t };
});
jest.mock("react-quill/dist/quill.snow.css", () => ({}));
jest.mock("react-quill", () => {
    const ReactLib = require("react");
    const Quill = ReactLib.forwardRef(({ value, onChange }, ref) => {
        ReactLib.useImperativeHandle(ref, () => ({ getEditor: () => null }));
        return <textarea data-testid="quill" value={value} onChange={(event) => onChange(event.target.value)} />;
    });
    Quill.displayName = "Quill";
    return { __esModule: true, default: Quill };
});
const mockToast = jest.fn();
jest.mock("../../components/show-toast/ShowToast", () => ({ __esModule: true, ShowToast: (...a) => mockToast(...a) }));
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ ...jest.requireActual("react-router-dom"), useNavigate: () => mockNavigate }));
jest.mock("../../services/commonService", () => {
    const { useLocation } = jest.requireActual("react-router-dom");
    return { __esModule: true, useQuery: () => new URLSearchParams(useLocation().search), uploadFile: jest.fn(), isAdminUser: () => true };
});

const F = (id, family, token, name, rendering = "full") => ({ id, family, token, name, name_en: name, rendering, insertable: true });
const FIELDS = {
    1: F(1, "worker", "worker_full_name", "Worker Full Name"),
    15: F(15, "worker", "worker_hkid", "Worker HKID", "masked"),
    20: F(20, "employer", "employer_full_name", "Employer Full name"),
    34: F(34, "employer", "employer_hkid", "Employer HKID", "masked"),
    48: F(48, "invoice_payment", "invoice_reference", "Invoice Ref"),
    62: F(62, "invoice_payment", "credit_card_last_four", "Credit Card Number", "last_four"),
    66: F(66, "sender_partner", "sender_name", "Self Name"),
};
const variant = (key, ids) => ({ key, recipient_type: key.split("_")[0], purpose: "general", label_en: key, field_ids: ids, fields: ids.map((id) => FIELDS[id]) });
const CONFIG = {
    32: {
        category: { id: 32, module_key: "processing", slug: "processing_contract", name_en: "Contract", status: 1 },
        configuration: { version: 1, mode: "manual", channels: ["in_app", "whatsapp"], required_languages: ["en", "zhh", "id"], binding_status: "derived", disposition: "keep", notes: ["Invoice fields only for an approved payment purpose."] },
        recipients: [variant("worker", [1, 15, 66]), variant("employer", [1, 20, 34, 66]), variant("employer_payment", [1, 20, 48, 62, 66])],
        sites: [{ code: "ST-11", label_en: "Contracts → Stage Actions", channels: ["in_app", "whatsapp"] }],
        library: { template_counts: { en: 2 }, missing_required_languages: ["zhh", "id"] },
        test_flag_template_ids: [],
    },
    27: {
        category: { id: 27, module_key: "processing", slug: "basic", name_en: "Worker Details - Basic", status: 1 },
        configuration: { version: 1, mode: "manual", channels: ["in_app", "whatsapp"], required_languages: ["en", "id"], binding_status: "derived", disposition: "keep", notes: [] },
        recipients: [variant("worker", [1, 66])],
        sites: [], library: { template_counts: { en: 2, zhh: 1 }, missing_required_languages: ["id"] }, test_flag_template_ids: [],
    },
    50: {
        category: { id: 50, module_key: "processing", slug: "endorsement_change_employer_address", name_en: "Endorsement - Change of Employer Address", status: 0 },
        configuration: { version: 1, mode: "internal", channels: [], required_languages: [], binding_status: "internal_only", disposition: "keep", notes: [] },
        recipients: [], sites: [], library: { template_counts: { en: 1 }, missing_required_languages: [] }, test_flag_template_ids: [],
    },
};

const ok = (body) => Promise.resolve({ data: body });
const mockAdd = jest.fn();
const mockConfig = jest.fn();
const mockConfigList = jest.fn();
jest.mock("../../services/templates", () => ({
    __esModule: true,
    getModuleList: () => Promise.resolve({ data: { data: { data: [{ id: "processing", name: "Processing" }, { id: "worker", name: "Worker" }] } } }),
    getCategoryList: () => Promise.resolve({ data: { data: { data: [{ id: 32, name_en: "Contract" }, { id: 27, name_en: "Worker Details - Basic" }, { id: 50, name_en: "Endorsement - Change of Employer Address" }] } } }),
    getLanguageList: () => Promise.resolve({ data: { data: [{ id: 2, name_en: "English" }] } }),
    getTemplates: () => Promise.resolve({ data: { data: { data: [] } } }),
    getTemplateConfiguration: (...a) => mockConfig(...a),
    getTemplateConfigurationList: (...a) => mockConfigList(...a),
    addNewTemplate: (...a) => mockAdd(...a),
    updateTemplateById: (...a) => mockAdd(...a),
}));

const makeStore = () => configureStore({
    reducer: { templates: templatesReducer },
    middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
});
const renderForm = async () => {
    render(<Provider store={makeStore()}><MemoryRouter initialEntries={["/settings/add-template"]}><TemplateFormPage /></MemoryRouter></Provider>);
    await screen.findByLabelText(/Module/);
    await waitFor(() => expect(screen.getByLabelText(/Module/).querySelectorAll("option").length).toBeGreaterThan(1));
};
const control = (label) => (label === "category" ? document.querySelector("#tpl-category") : screen.getByLabelText(label));
const choose = async (label, value) => {
    await act(async () => { fireEvent.change(control(label), { target: { value } }); });
};
const pickCategory = async (id) => {
    await choose(/Module/, "processing");
    await waitFor(() => expect(control("category").querySelectorAll("option").length).toBeGreaterThan(1));
    await choose("category", String(id));
    await screen.findByTestId("template-category-panel");
};
const fillRequired = async () => {
    await act(async () => { fireEvent.change(screen.getByLabelText(/Template Name/i), { target: { value: "Arrival note" } }); });
    await act(async () => { fireEvent.click(screen.getByRole("radio", { name: "English" })); });
    await act(async () => { fireEvent.change(screen.getByTestId("quill"), { target: { value: "<p>Hello</p>" } }); });
};
const optionTexts = (select) => [...select.querySelectorAll("option")].map((o) => o.textContent);

beforeEach(() => {
    mockAdd.mockReset();
    mockToast.mockReset();
    mockNavigate.mockReset();
    mockConfig.mockReset();
    mockConfigList.mockReset();
    mockConfig.mockImplementation(({ category_id }) => ok({ status: true, data: { data: CONFIG[category_id] } }));
});

test("the category's configuration is shown: sending, channels, recipients, required languages the library lacks, sites", async () => {
    await renderForm();
    await pickCategory(32);
    const panel = screen.getByTestId("template-category-panel");
    expect(within(panel).getByText("Manual")).toBeInTheDocument();
    expect(panel.querySelector('[data-field="channels"]').textContent).toBe("In-App · Whatsapp");
    expect(panel.querySelector('[data-field="recipients"]').textContent).toBe("Worker · Employer · Employer (payment purpose only)");
    expect(panel.querySelector('[data-field="languages"]').textContent).toBe("EnglishTraditional Chinese · no template yetIndonesian · no template yet");
    expect(panel.querySelector('[data-field="sites"]').textContent).toBe("ST-11");
    expect(mockConfig).toHaveBeenLastCalledWith({ category_id: "32" });
});

test("TM01: the field list is the chosen recipient's own — nothing before the recipient, no employer HKID for the Worker", async () => {
    await renderForm();
    await pickCategory(32);
    const fields = () => screen.getByLabelText(/Message Body/);
    expect(fields()).toBeDisabled();
    expect(optionTexts(fields())[0]).toBe("Choose the recipient first");
    await choose(/Recipient/, "worker");
    expect(optionTexts(fields()).slice(1)).toEqual(["Worker Full Name", "Worker HKID (masked)", "Self Name"]);
    expect(optionTexts(fields())).not.toContain("Employer HKID (masked)");
    await choose(/Recipient/, "employer_payment");
    expect(optionTexts(fields())).toEqual(expect.arrayContaining(["Invoice Ref", "Credit Card Number (last four digits)"]));
    expect([...fields().querySelectorAll("optgroup")].map((g) => g.label)).toEqual(["Worker", "Employer & job", "Invoice & payment", "Sender & partner"]);
    await choose(/Message Body/, "invoice_reference");
    expect(screen.getByTestId("quill").value).toContain("{{ invoice_reference }}");
});

test("several recipients: Save asks for the recipient and sends nothing until one is chosen", async () => {
    await renderForm();
    await pickCategory(32);
    await fillRequired();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save" })); });
    expect(await screen.findByText("Select who this template is for.")).toBeInTheDocument();
    expect(mockAdd).not.toHaveBeenCalled();
});

test("a refused save names the fields beside the editor and stays on the form", async () => {
    mockAdd.mockImplementation(() => Promise.reject({ response: { status: 422, data: { status: false, message: "The message uses a field this recipient may not receive.", code: "TEMPLATE_FIELD_NOT_ALLOWED", details: { recipient: "worker", fields: [{ token: "employer_hk_id", field_id: 34, name: "Employer HKID" }] } } } }));
    await renderForm();
    await pickCategory(32);
    await fillRequired();
    await choose(/Recipient/, "worker");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save" })); });
    expect(await screen.findByText("Not for this recipient: {{employer_hk_id}} (Employer HKID)")).toBeInTheDocument();
    expect(mockAdd.mock.calls[0][0]).toEqual(expect.objectContaining({ category_id: "32", recipient_variant: "worker" }));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith("error", "The message uses a field this recipient may not receive.");
});

test("one recipient is chosen for you; an internal preset has no recipient and sends none", async () => {
    mockAdd.mockImplementation(() => ok({ status: true, message: "Template created" }));
    await renderForm();
    await pickCategory(27);
    await waitFor(() => expect(screen.getByLabelText(/Recipient/)).toHaveValue("worker"));
    expect(screen.getByLabelText(/Recipient/)).toBeDisabled();
    await fillRequired();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save" })); });
    await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
    expect(mockAdd.mock.calls[0][0].recipient_variant).toBe("worker");

    await choose("category", "50");
    await waitFor(() => expect(screen.getByTestId("template-category-panel").querySelector('[data-field="mode"]').textContent).toBe("Internal preset — no outbound message"));
    expect(screen.queryByLabelText(/Recipient/)).toBeNull();
    expect(screen.getByTestId("template-category-panel").querySelector('[data-field="channels"]').textContent).toBe("None — held");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save" })); });
    await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(2));
    expect(mockAdd.mock.calls[1][0]).not.toHaveProperty("recipient_variant");
});

test("Categories: every category read-only; a row opens its configuration with each recipient's fields", async () => {
    const list = { fields: Object.values(FIELDS), categories: [32, 50].map((id) => ({ ...CONFIG[id], recipients: CONFIG[id].recipients.map(({ fields, ...r }) => r) })) };
    mockConfigList.mockImplementation(() => ok({ status: true, data: { data: list } }));
    render(<TemplateCategoriesView moduleList={[{ id: "processing", name: "Processing" }]} />);
    const contract = await screen.findByText("Contract");
    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByText("Internal preset")).toBeInTheDocument();
    await act(async () => { fireEvent.click(contract); });
    const dialog = await screen.findByRole("dialog");
    const recipients = within(dialog).getByTestId("recipient-field-list");
    expect(recipients.querySelector('[data-recipient="worker"]').textContent).toBe("Worker · 3Worker: Worker Full Name, Worker HKID (masked)Sender & partner: Self Name");
    expect(recipients.querySelector('[data-recipient="worker"]').textContent).not.toMatch(/Employer HKID|Invoice/);
    expect(recipients.querySelector('[data-recipient="employer_payment"]').textContent).toContain("Credit Card Number (last four digits)");
    await act(async () => { fireEvent.change(screen.getByLabelText("Module"), { target: { value: "processing" } }); });
    expect(mockConfigList).toHaveBeenLastCalledWith({ module: "processing" });
});

test("Global Chat template form: the recipient is asked for, and a refused save keeps the form open with its reason", async () => {
    mockAdd.mockImplementation(() => Promise.reject({ response: { status: 422, data: { status: false, message: "Select who this template is for.", code: "TEMPLATE_RECIPIENT_REQUIRED", details: { recipients: ["worker", "employer"] } } } }));
    const onDone = jest.fn();
    render(<Provider store={makeStore()}><AddEditTemplateFormChat userType="processing" onClick={jest.fn()} onCloseAddEditTemplateOpenSendTemplatePopup={onDone} /></Provider>);
    await waitFor(() => expect(document.querySelector("#category_id").querySelectorAll("option").length).toBe(3));
    await act(async () => { fireEvent.change(document.querySelector("#category_id"), { target: { value: "32" } }); });
    const recipient = await waitFor(() => { const el = document.querySelector("#recipient_variant"); expect(el).not.toBeNull(); return el; });
    expect(optionTexts(recipient).slice(1)).toEqual(["Worker", "Employer", "Employer (payment purpose only)"]);
    await act(async () => { fireEvent.change(recipient, { target: { value: "employer" } }); });
    expect(optionTexts(document.querySelector("#dynamic_field_key"))).toContain("Employer HKID (masked)");
    await act(async () => { fireEvent.change(screen.getByPlaceholderText(/template name/i), { target: { value: "Chat note" } }); });
    await act(async () => { fireEvent.click(screen.getByRole("radio", { name: "English" })); });
    await act(async () => { fireEvent.change(screen.getByTestId("quill"), { target: { value: "<p>Hi</p>" } }); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Save/ })); });
    await waitFor(() => expect(mockAdd).toHaveBeenCalledTimes(1));
    expect(mockAdd.mock.calls[0][0]).toEqual(expect.objectContaining({ recipient_variant: "employer" }));
    expect(onDone).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith("error", "Select who this template is for.");
});
