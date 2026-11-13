/* eslint-env jest */
jest.mock("../../utils/storage", () => ({
    getStoredUser: () => ({ data: { id: 30, role: { id: 999 }, staff: { staff_type: "internal" } } }),
}));

import configData from "../../components/ReusableComponents/app-configs";

const grant = (id, selected_value = "y") => ({ id, selected_value });
const list = ({ access, nav }) => [
    { module: "insurance", category: [grant("insurance_access", access ? "y" : "n"), grant("insurance_global_list", nav ? "y" : "n")] },
];
const paths = (permissionList) => configData.getNavConfig({ t: (k) => k, permissionList, isAdmin: false }).map((item) => item.path);

describe("Insurance rail entry (PERM 22 Oct: Show in navigation requires Module access; ClickUp 28 Oct)", () => {
    test("Show in navigation retained but Module access off → no Insurance entry", () => {
        expect(paths(list({ access: false, nav: true }))).not.toContain("/insurance");
    });
    test("Module access on and Show in navigation on → Insurance entry", () => {
        expect(paths(list({ access: true, nav: true }))).toContain("/insurance");
    });
    test("Module access on but Show in navigation off → no entry (a permitted direct link still works)", () => {
        expect(paths(list({ access: true, nav: false }))).not.toContain("/insurance");
    });
});
