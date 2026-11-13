/* eslint-env jest */
import fs from "fs";
import path from "path";

/* QA-SYS Settings (4 Nov 2026): every Settings route is gated by a permission key (CLAUDE.md §4.5 permission coherence).
   PK-01 P1-18 (5 Nov) keyed Leaves, Apply Leave and Prepared / Ready defaults on their back-end keys, and R-SET-1 (5 Nov) the
   two Prompt screens (QA-SYS-SETTINGS-008, qa-system-doc/QA_SYS_SETTINGS_REPORT.md). None is left open: a new unguarded route
   fails this test. */
const SRC = fs.readFileSync(path.resolve(__dirname, "../../Views/Pages/routes/settingsRoutes.js"), "utf8");
const ROUTES = [...SRC.matchAll(/\{\s*path:\s*routes\.(\w+),\s*component:\s*\w+([^}]*)\}/g)].map(([, name, rest]) => ({ name, guarded: /permissionKey/.test(rest) }));
const OPEN_AWAITING_RULING = {};

describe("QA-SYS Settings route guards", () => {
    test("the routes file was read (33 Settings routes)", () => {
        expect(ROUTES.length).toBe(33);
    });

    test("every Settings route carries a permission key (QA-SYS-SETTINGS-008 DONE: P1-18 and R-SET-1)", () => {
        const unguarded = ROUTES.filter((r) => !r.guarded).map((r) => r.name).sort();
        expect(unguarded).toEqual(Object.keys(OPEN_AWAITING_RULING).sort());
    });

    test("the Price List opens on any of its view keys through a getter, never a fixed key (QA-27-015, DONE)", () => {
        expect(SRC).toMatch(/path: routes\.priceList, component: PriceList, moduleKey: "configuration", get permissionKey\(\) \{ return priceListViewKey\(\); \}/);
    });

    test.todo("QA-SYS-SETTINGS-009: the Leaves list shows its error state, not \"No records found\", when its list call fails");
    test.todo("QA-SYS-SETTINGS-010: at 600–640 px the app-shell rail no longer covers the Price List's left edge (OP-27-137)");
});
