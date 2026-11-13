/* eslint-env jest */
jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });
import { buildEmployerListPayload } from "../../Views/Pages/Employer/newui/employerDashboardConfig";
import { DEFAULT_EMPLOYER_FILTERS } from "../../Views/Pages/Employer/newui/employerNewUiConstants";

describe("Employers list · Created range keys (backend 321, 28 Oct)", () => {
    test("a Created range travels as search_start_date / search_end_date, never start_date / end_date", () => {
        const payload = buildEmployerListPayload({ ...DEFAULT_EMPLOYER_FILTERS, start_date: "2026-10-01", end_date: "2026-10-28" });
        expect(payload).toMatchObject({ search_start_date: "2026-10-01", search_end_date: "2026-10-28" });
        expect(payload.start_date).toBeUndefined();
        expect(payload.end_date).toBeUndefined();
    });
    test("no range → neither key", () => {
        const payload = buildEmployerListPayload({ ...DEFAULT_EMPLOYER_FILTERS });
        expect("search_start_date" in payload).toBe(false);
    });
});
