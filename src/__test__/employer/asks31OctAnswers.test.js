/* eslint-env jest */
import fs from "fs";
import path from "path";
import reducer from "../../redux/Slices/employer/EmployerSlice";
import { fetchEmployers } from "../../redux/Slices/employer/EmployerSlice";
import { getEngagementKind } from "../../services/commonService";
import constData from "../../components/ReusableComponents/constants";
import { BANNED_EMPLOYER_STATUS, employerFooterMatchKey } from "../../Views/Pages/Employer/newui/employerNewUiConstants";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");
const fulfilled = (payload, context = "list") => ({ type: fetchEmployers.fulfilled.type, payload, meta: { arg: { context } } });

/* Priyanka v19 §U (backend 375): the Employer asks E-8 … E-22 as delivered */
describe("Employer list reader (E-15a, E-20a, E-21)", () => {
    const init = reducer(undefined, { type: "@@init" });
    test("paginator envelope: total_accessible and data.last_update are read", () => {
        const next = reducer(init, fulfilled({ data: { data: [{ id: 1 }], current_page: 2, per_page: 10, last_page: 3, total: 25, total_accessible: 40, last_update: "2026-11-02 10:00:00" } }));
        expect(next.employers).toEqual([{ id: 1 }]);
        expect(next.totalEmployers).toBe(25);
        expect(next.totalAccessible).toBe(40);
        expect(next.totalPages).toBe(3);
        expect(next.lastUpdated).toBe("2026-11-02 10:00:00");
    });
    test("restricted viewer: a plain array is one page of rows", () => {
        const next = reducer({ ...init, totalPages: 9, totalEmployers: 90 }, fulfilled({ data: [{ id: 1 }, { id: 2 }] }));
        expect(next.employers).toEqual([{ id: 1 }, { id: 2 }]);
        expect(next.totalEmployers).toBe(2);
        expect(next.totalPages).toBe(1);
        expect(next.currentPage).toBe(1);
    });
    test("no match: data: [] with no last_update keeps the previous stamp", () => {
        const next = reducer({ ...init, lastUpdated: "kept" }, fulfilled({ data: [] }));
        expect(next.employers).toEqual([]);
        expect(next.lastUpdated).toBe("kept");
    });
});

describe("CS Owner (JO) and engagement (E-14, E-9)", () => {
    test("the column reads jo_cs_owner_name and the client guess is gone", () => {
        const cols = read("Views/Pages/Employer/newui/employerDashboardColumns.js");
        expect(cols).toMatch(/row\?\.jo_cs_owner_name/);
        expect(cols).not.toMatch(/isCsVisibleForJoStatus|latest_jo_status/);
        expect(read("components/ReusableComponents/constants.js")).not.toMatch(/EMPLOYER_CS_VISIBLE_JO_STATUSES|DEVICE_TYPE_ENGAGEMENT/);
    });
    test("engagement never falls back to the registration source", () => {
        expect(getEngagementKind({ current_engagement: "app", user_type: 1 })).toBe("app");
        expect(getEngagementKind({ user_type: 1 })).toBeNull();
        expect(getEngagementKind({ device_type: 2 })).toBeNull();
    });
});

describe("footer, dial codes, status, Teen Care", () => {
    test("L-47 footer keys: singular / plural, search over filters", () => {
        expect(employerFooterMatchKey({ searching: true, filtered: true, total: 1 })).toBe("key_emp_footer_matches_search");
        expect(employerFooterMatchKey({ searching: true, total: 7 })).toBe("key_emp_footer_match_search");
        expect(employerFooterMatchKey({ filtered: true, total: 1 })).toBe("key_emp_footer_matches_filters");
        expect(employerFooterMatchKey({ filtered: true, total: 3 })).toBe("key_emp_footer_match_filters");
        const en = JSON.parse(read("i18n/fallback/en.json")).strings;
        const admin = JSON.parse(fs.readFileSync(path.join(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
        ["key_emp_footer_matches_search", "key_emp_footer_match_search", "key_emp_footer_matches_filters", "key_emp_footer_match_filters"].forEach((k) => { expect(typeof en[k]).toBe("string"); expect(typeof admin[k]).toBe("string"); });
    });
    test("dial codes come from the general countries call, not the WhatsApp list (E-13)", () => {
        const form = read("Views/Pages/Employer/newui/useNewEmployerForm.js");
        expect(form).toMatch(/fetchCountriesGeneral\(\{\}\)/);
        expect(form).not.toMatch(/whatsappCountryList/);
    });
    test("E-22: status values", () => {
        expect(BANNED_EMPLOYER_STATUS).toBe(2);
    });
    test("Teen Care is child care by name_en, the three ids by id", () => {
        expect(constData.isChildCareSkill({ id: 1 })).toBe(true);
        expect(constData.isChildCareSkill({ id: 9, name_en: "Teen Care" })).toBe(true);
        expect(constData.isChildCareSkill({ id: 9, name: "teen care" })).toBe(true);
        expect(constData.isChildCareSkill({ id: 5, name_en: "Elderly Care" })).toBe(false);
        expect(constData.isChildCareSkill(null)).toBe(false);
        expect(read("Views/Pages/WorkerPage/worker-detail/profile-tab/biodata-tab/BiodataView.js")).toMatch(/constData\.isChildCareSkill\(s\)/);
    });
});
