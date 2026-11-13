/* eslint-env jest */
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";

/* PK-01 P1-18 (HPM-012, SETTINGS-007; owner 5 Nov 2026 "Finish P1-18"): each route opens on the key its own back end checks.
   - The five HRMS reports: their hrms /reports endpoint's key (hrms_report module); the Reports cards carry the same key
     (Leave History and Time Credit had each other's).
   - My Profile: view_my_profile for staff; a partner gets no key (no HRMS module; the page lets partners in).
   - My Reportees: approve_leave, approve_time_request or add_time_credit (its three tabs).
   - Leaves: add_leave (HRMS) or view_leave (Leave Management); Apply Leave: add_leave.
   - Prepared / Ready defaults: manage_assignment_eligibility (users), route and the Settings → People link alike.
   - Prompt Manager and New Prompt Template: R-SET-1, keyed 5 Nov (pk01PromptKeys). */

let mockUser = { data: { id: 30, role: { id: 999 }, staff: { staff_type: "internal" } } };
let mockModules = [];
jest.mock("../../utils/storage", () => ({ getStoredUser: () => mockUser }));
jest.mock("../../redux/store", () => ({ store: { getState: () => ({ users: { permissionList: { data: mockModules } } }) } }));
/* eslint-disable import/first */
import reportRoutes from "../../Views/Pages/routes/reportRoutes";
import generalRoutes, { MY_REPORTEES_KEYS } from "../../Views/Pages/routes/generalRoutes";
import settingsRoutes, { LEAVES_ROUTE_KEYS } from "../../Views/Pages/routes/settingsRoutes";
import routes from "../../Views/Pages/routes/routesConfig/index";
import configData, { peopleLinksConfig } from "../../components/ReusableComponents/app-configs";
import { getUserPermissions } from "../../utils/permissions/userPermissionsUtils";
import ProtectedRoute from "../../components/ReusableComponents/ProtectedRoute";
/* eslint-enable import/first */

const grants = (pairs) => {
    const byModule = {};
    for (const [module, id] of pairs) (byModule[module] = byModule[module] || []).push({ id, selected_value: "y" });
    return Object.entries(byModule).map(([module, category]) => ({ module, category }));
};
const route = (list, path) => list.find((r) => r.path === path);
const keyOf = (r) => [r.moduleKey, r.permissionKey];

const HRMS_REPORTS = [
    ["sessionHistoryReport", "session_history_report"],
    ["scheduleComplianceReport", "schedule_compliance_report"],
    ["timeRequestReport", "time_request_report"],
    ["leaveHistoryReport", "applied_leave_history_report"],
    ["timeEntryReport", "time_credit_report"],
];

const opens = (r) => {
    const store = configureStore({ reducer: { users: () => ({ permissionList: { data: mockModules } }) } });
    render(
        <Provider store={ store }><MemoryRouter initialEntries={ ["/screen"] }>
            <Routes>
                <Route path="/screen" element={ <ProtectedRoute moduleKey={ r.moduleKey } permissionKey={ r.permissionKey || "" }><div>the screen</div></ProtectedRoute> } />
                <Route path="/dashboard" element={ <div>the dashboard</div> } />
            </Routes>
        </MemoryRouter></Provider>,
    );
    const open = Boolean(screen.queryByText("the screen"));
    screen.getByText(open ? "the screen" : "the dashboard");
    return open;
};

describe("PK-01 P1-18 route keys", () => {
    beforeEach(() => {
        mockUser = { data: { id: 30, role: { id: 999 }, staff: { staff_type: "internal" } } };
        mockModules = [];
    });

    test("the five HRMS reports carry their hrms endpoint's key, and each Reports card the same key as its route", () => {
        for (const [path, key] of HRMS_REPORTS) {
            expect([path, ...keyOf(route(reportRoutes, routes[path]))]).toEqual([path, "hrms_report", key]);
            expect([path, configData.hrmsReportsConfig.find((c) => c.link === routes[path]).permissionKey]).toEqual([path, key]);
        }
    });

    test("a user with no HRMS report key is sent to the dashboard", () => {
        const sessionHistory = route(reportRoutes, routes.sessionHistoryReport);
        expect(opens(sessionHistory)).toBe(false);
    });

    test("the report key opens its report", () => {
        mockModules = grants([["hrms_report", "session_history_report"]]);
        expect(opens(route(reportRoutes, routes.sessionHistoryReport))).toBe(true);
    });

    test("My Profile: staff need view_my_profile; a partner is handed no key (the page's own rule)", () => {
        expect(keyOf(route(generalRoutes, routes.myProfile))).toEqual(["hrms", "view_my_profile"]);
        mockUser = { data: { id: 31, role: { id: 999 }, staff: { staff_type: "partner" } } };
        expect(route(generalRoutes, routes.myProfile).permissionKey).toBeNull();
    });

    test("My Reportees opens on any of its three tab keys, the one held is checked", () => {
        expect(MY_REPORTEES_KEYS).toEqual(["approve_leave", "approve_time_request", "add_time_credit"]);
        for (const key of MY_REPORTEES_KEYS) {
            mockModules = grants([["hrms", key]]);
            expect(keyOf(route(generalRoutes, routes.myReportees))).toEqual(["hrms", key]);
        }
        mockModules = grants([["hrms", "raise_time_request"]]);
        expect(keyOf(route(generalRoutes, routes.myReportees))).toEqual(["hrms", "approve_leave"]);
    });

    test("Leaves opens on Add Leave or View Leave (two modules); Apply Leave on Add Leave", () => {
        expect(LEAVES_ROUTE_KEYS).toEqual([["hrms", "add_leave"], ["leave_management", "view_leave"]]);
        mockModules = grants([["leave_management", "view_leave"]]);
        expect(keyOf(route(settingsRoutes, routes.leaves))).toEqual(["leave_management", "view_leave"]);
        mockModules = grants([["hrms", "add_leave"]]);
        expect(keyOf(route(settingsRoutes, routes.leaves))).toEqual(["hrms", "add_leave"]);
        mockModules = [];
        expect(keyOf(route(settingsRoutes, routes.leaves))).toEqual(["hrms", "add_leave"]);
        expect(keyOf(route(settingsRoutes, routes.applyLeave))).toEqual(["hrms", "add_leave"]);
    });

    test("Prepared / Ready defaults: route and Settings → People link on Manage assignment eligibility", () => {
        expect(keyOf(route(settingsRoutes, routes.preparedReadyDefaults))).toEqual(["users", "manage_assignment_eligibility"]);
        const link = () => peopleLinksConfig(getUserPermissions({ data: mockModules })).find((l) => l.link === "prepared-ready-defaults");
        expect(link().isPermitted).toBe(false);
        mockModules = grants([["users", "manage_assignment_eligibility"]]);
        expect(link().isPermitted).toBe(true);
    });
});
