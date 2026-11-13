/* eslint-env jest */
import React from "react";
import fs from "fs";
import path from "path";
import i18n from "i18next";
import { render, screen } from "@testing-library/react";
import en from "../../../public/locales/en/translation.json";
import CustomSpinner from "../../components/ReusableComponents/CustomSpinner";

/* Loaders in Insurance, Invoice and Chat (user correction 16 Oct): the typing dots (chatLoader) only in the chat message
   lists; everywhere else the circle the Worker and Employer modules use (CustomSpinner, FullDisplayLoader over the screen). */

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});

describe("circle loader", () => {
    it("default: the ring, centred, unchanged for every module", () => {
        const { container } = render(<CustomSpinner />);
        const status = screen.getByRole("status");
        expect(status.className).toBe("chat-loader-center");
        expect(container.querySelector(".chat-loader-center > span.nu-spinner")).toBeTruthy();
    });

    it("inline: the ring alone and smaller, inside a button, announced as Loading", () => {
        render(<button type="button"><CustomSpinner variant="inline" /></button>);
        const status = screen.getByRole("status");
        expect(status.tagName).toBe("SPAN");
        expect(status.className).toBe("nu-spinner nu-spinner--inline");
        expect(status.getAttribute("aria-label")).toBe(en.key_loading);
    });
});

describe("where each loader is used", () => {
    const root = path.resolve(__dirname, "../..");
    const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
        const p = path.join(dir, d.name);
        return d.isDirectory() ? files(p) : /\.jsx?$/.test(d.name) ? [p] : [];
    });
    const rel = (f) => path.relative(root, f).split(path.sep).join("/");
    const src = (f) => fs.readFileSync(f, "utf8");

    it("the typing dots only in the chat message lists", () => {
        const dots = files(root).filter((f) => !rel(f).startsWith("__test__") && /ReusableComponents\/chatLoader/.test(src(f))).map(rel).sort();
        expect(dots).toEqual([
            "Views/Pages/Conversaction/ActionRequiredTab.js",
            "Views/Pages/Conversaction/LineTab.js",
            "Views/Pages/Conversaction/components/ChatMessagePanel.js",
            "Views/Pages/Conversaction/newui/GcMessagePanel.js",
        ]);
    });

    it("Insurance, Invoice and the conversation list: the circle only — no dots, bars, bootstrap spinner, skeleton or loading text", () => {
        const scope = ["Views/Pages/insurance", "Views/Pages/Invoice", "components/Invoice"].flatMap((d) => files(path.join(root, d)))
            .concat(path.join(root, "Views/Pages/Conversaction/newui/GcConversationList.js"));
        const offenders = scope.filter((f) => /ReusableComponents\/(chatLoader|listLoader|CircularSpinner|ActionLoader)\b|spinner-border|skeletonBar|inv-card-skeleton|\? t\('key_loading'\)|>\{ t\('key_loading'\) \}<|fallback=\{ <div>\{ (t|translation)\('key_loading'\)/.test(src(f)));
        expect(offenders.map(rel)).toEqual([]);
        expect(src(path.join(root, "Views/Pages/Conversaction/newui/GcConversationList.js"))).toContain('<div className="gc-list-loader"><CustomSpinner /></div>');
    });
});
