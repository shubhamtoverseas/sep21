/* eslint-env jest */
import fs from "fs";
import path from "path";
import { SELECT_SCOPE, SELECT_LEGACY_PREFIXES, selectScopeFor } from "../../utils/selectScope";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

/* 3 Nov: every single-select dropdown looks like the prototype select; Invoice, Insurance and Chat are left alone */
describe("kit select scope", () => {
    test("the three excluded modules resolve to legacy, everything else to kit", () => {
        expect(SELECT_LEGACY_PREFIXES).toEqual(expect.arrayContaining(["invoices", "insurance", "insurances", "chat-view", "altchat", "chats"]));
        ["/invoices", "/invoices/INV-1", "/invoices/add-contract-invoice/form", "/insurance/new", "/insurances/12", "/chat-view", "/altchat", "/chats/worker/1/2"]
            .forEach((p) => expect(selectScopeFor(p)).toBe(SELECT_SCOPE.LEGACY));
        ["/", "/workers", "/employers/details", "/job-offers/343", "/contracts/41", "/calendar?task=8", "/settings/users", "/notifications", "/reports/contract"]
            .forEach((p) => expect(selectScopeFor(p)).toBe(SELECT_SCOPE.KIT));
    });
    test("the shell writes the scope on body and the skin is loaded globally", () => {
        const shell = read("components/Layout/AppShell.jsx");
        expect(shell).toMatch(/document\.body\.dataset\[SELECT_SCOPE_ATTR\] = selectScopeFor\(pathname\)/);
        expect(read("index.js")).toMatch(/import "\.\/components\/ui\/select-kit\.css"/);
        const css = read("components/ui/select-kit.css");
        expect(css).toMatch(/body\[data-mc-select="kit"\] select:not\(\[multiple\]\):not\(\[size\]\) \{\s*appearance: base-select;/);
        expect(css).toMatch(/option:checked \{\s*background: #eff4ff;\s*color: #1d4ed8;/);
        expect(css).not.toMatch(/data-mc-select="legacy"/);
    });
    test("the browser picker icon is hidden wherever the control paints its own chevron (two carets, 3 Nov)", () => {
        const css = read("components/ui/select-kit.css");
        const hide = css.match(/([^}]*)::picker-icon[^{]*\{\s*display: none;/)[0];
        ["select:has(+ svg)::picker-icon", "select.g1-in::picker-icon", "select.fx-in::picker-icon", "select.mc-sw-ctl::picker-icon", "select.custom-select::picker-icon", ".mcdt-embed select.form-control::picker-icon"]
            .forEach((sel) => expect(hide).toContain(sel));
    });
});
