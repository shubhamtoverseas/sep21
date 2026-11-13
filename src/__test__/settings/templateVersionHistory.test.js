/* eslint-env jest */
/*
 * Send Template S9 — version history (10 Nov 2026 package F-30 / TM06; settings-api S9 GET /settings/template/versions).
 * Every save is an immutable version: the edit page lists them newest first with who saved each, when, its exact text and
 * attachment. It is read-only — a past version is never edited or restored from here — and a template saved before
 * version history began shows its version 1 as recorded then.
 */
import React from "react";
import fs from "fs";
import path from "path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
jest.mock("../../services/templates", () => ({ getTemplateVersions: jest.fn() }));

import TemplateVersionHistory from "../../Views/Pages/SettingsPage/newui/templates/TemplateVersionHistory";
import { getTemplateVersions } from "../../services/templates";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");
const VERSIONS = [
    { id: 12, version: 2, template_content: "<p>Dear Peter &amp; family, version two</p>", file_path: "https://bucket/templates/contract-v2.pdf", saved_by_name: "Ada Chan", saved_at: "2026-11-12T09:30:00", source: "save" },
    { id: 7, version: 1, template_content: "<p>Dear Peter, version one</p>", file_path: null, saved_by_name: null, saved_at: "2026-11-01T08:00:00", source: "backfill" },
];

beforeEach(() => {
    getTemplateVersions.mockReset();
    getTemplateVersions.mockImplementation(() => Promise.resolve({ data: { data: { data: VERSIONS } } }));
});

describe("S9 · version history (F-30)", () => {
    test("lists the template's versions newest first: number, saver, text and attachment; the backfilled first version says so", async () => {
        render(<TemplateVersionHistory templateId={ 248 } />);
        await waitFor(() => expect(screen.getByTestId("template-version-history")).toBeInTheDocument());
        expect(getTemplateVersions).toHaveBeenCalledWith({ template_content_id: 248 });
        expect(screen.getByText("key_st_version_history (2)")).toBeInTheDocument();
        const items = document.querySelectorAll("[data-version]");
        expect([...items].map((li) => li.getAttribute("data-version"))).toEqual(["2", "1"]);
        expect(items[0]).toHaveTextContent("key_st_saved_by Ada Chan");
        expect(items[0]).toHaveTextContent("Dear Peter & family, version two");
        expect(items[0].querySelector("a")).toHaveAttribute("href", "https://bucket/templates/contract-v2.pdf");
        expect(items[0]).not.toHaveTextContent("key_st_version_backfill");
        expect(items[1]).toHaveTextContent("key_st_version_backfill");
        expect(items[1].querySelector("a")).toBeNull();
    });

    test("read-only: no edit, restore or delete control", async () => {
        render(<TemplateVersionHistory templateId={ 248 } />);
        await waitFor(() => expect(screen.getByTestId("template-version-history")).toBeInTheDocument());
        fireEvent.click(screen.getByText("key_st_version_history (2)"));
        expect(screen.queryAllByRole("button")).toHaveLength(0);
        expect(document.querySelectorAll("input, textarea, select")).toHaveLength(0);
    });

    test("nothing shows for a new template, or when there is no history or it cannot be read", async () => {
        const { container, unmount } = render(<TemplateVersionHistory templateId={ undefined } />);
        expect(getTemplateVersions).not.toHaveBeenCalled();
        expect(container).toBeEmptyDOMElement();
        unmount();
        getTemplateVersions.mockImplementation(() => Promise.reject(new Error("offline")));
        const failed = render(<TemplateVersionHistory templateId={ 248 } />);
        await waitFor(() => expect(getTemplateVersions).toHaveBeenCalled());
        expect(failed.container).toBeEmptyDOMElement();
    });

    test("the edit page shows it for the saved template only; the services call settings-api's versions and send-outcome", () => {
        expect(read("Views/Pages/SettingsPage/newui/templates/TemplateFormPage.js"))
            .toMatch(/\{template\.isEdit && <TemplateVersionHistory templateId=\{template\.templateId\} \/>\}/);
        expect(read("Views/Pages/SettingsPage/newui/templates/useTemplateForm.js")).toMatch(/templateId: id,/);
        const apiPath = read("services/apiPath.js");
        expect(apiPath).toMatch(/getTemplateVersions: "settings\/template\/versions"/);
        expect(apiPath).toMatch(/reportSendOutcome: "settings\/template\/send-outcome"/);
    });
});
