/* eslint-env jest */
import React from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";

/* QA-27-015 (PL-UI1 row 13): the Price List route opens on any of its view keys — the key the user holds is the one handed
   to ProtectedRoute — and a Configuration user holding none of them sees the Price List's own "You don't have permission to
   view the Price List." state, never a redirect to the dashboard. */

let mockAdmin = false;
let mockModules = [];
jest.mock("../../services/commonService", () => {
    const actual = jest.requireActual("../../services/commonService");
    return { ...actual, isAdminUser: () => mockAdmin };
});
jest.mock("../../redux/store", () => ({ store: { getState: () => ({ users: { permissionList: { data: mockModules } } }) } }));
/* eslint-disable import/first */
import settingsRoutes, { PRICE_LIST_VIEW_KEYS, priceListViewKey } from "../../Views/Pages/routes/settingsRoutes";
import routes from "../../Views/Pages/routes/routesConfig/index";
import ProtectedRoute from "../../components/ReusableComponents/ProtectedRoute";
/* eslint-enable import/first */

const configuration = (keys) => [{ module: "configuration", category: keys.map((id) => ({ id, selected_value: "y" })) }];
const priceListRoute = () => (Array.isArray(settingsRoutes) ? settingsRoutes : Object.values(settingsRoutes).flat()).find((r) => r && r.path === routes.priceList);

describe("the Price List route guard", () => {
    beforeEach(() => { mockAdmin = false; mockModules = []; });

    it("any of the five view keys opens it; the key the user holds is the one checked", () => {
        expect(PRICE_LIST_VIEW_KEYS).toEqual(["view_fixed_item_price", "view_conditional_item_price", "view_conditional_local_item_price", "view_promotion", "view_worker_promotion"]);
        for (const key of PRICE_LIST_VIEW_KEYS) {
            mockModules = configuration([key]);
            expect([key, priceListViewKey()]).toEqual([key, key]);
            expect(priceListRoute().permissionKey).toBe(key);
        }
        expect(priceListRoute().moduleKey).toBe("configuration");
    });

    it("none of them: no key is handed to ProtectedRoute, so the page renders (its own no-permission state), never /dashboard", () => {
        mockModules = configuration(["view_medical_clinic"]);
        expect(priceListViewKey()).toBeNull();
        const route = priceListRoute();
        const store = configureStore({ reducer: { users: () => ({ permissionList: { data: mockModules } }) } });
        render(
            <Provider store={ store }><MemoryRouter initialEntries={ ["/price-list"] }>
                <Routes>
                    <Route path="/price-list" element={ <ProtectedRoute moduleKey={ route.moduleKey } permissionKey={ route.permissionKey }><div>the Price List page</div></ProtectedRoute> } />
                    <Route path="/dashboard" element={ <div>the dashboard</div> } />
                </Routes>
            </MemoryRouter></Provider>,
        );
        expect(screen.getByText("the Price List page")).toBeInTheDocument();
        expect(screen.queryByText("the dashboard")).toBeNull();
    });
});
