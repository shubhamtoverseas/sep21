/* eslint-env jest */
import { apiTabType, buildWorkerListPayload, isNonDefaultState, DEFAULT_SORT, EMPTY_FILTERS } from "../../Views/Pages/WorkerPage/dashboard/workerDashboardConfig";

jest.mock("../../utils/translation", () => {
    const t = (key) => key;
    return { __esModule: true, default: t, translation: t };
});

/* Priyanka 6 Nov (backend 401 family): invited, not-yet-registered workers are always Overseas — the bucket has no
   Type control, the list request is forced to type 2 and a leftover filters.type neither travels nor counts. */
const base = { pipeView: "", availView: "", ownerFilters: {}, sort: DEFAULT_SORT, chip: "", page: 1, limit: 25 };

describe("Not registered bucket is always Overseas", () => {
    test("the list payload forces type 2 and ignores a leftover filters.type", () => {
        const payload = buildWorkerListPayload({ ...base, bucket: "not_registered", filters: { ...EMPTY_FILTERS, type: "1" } });
        expect(payload.type).toBe(2);
    });
    test("other common buckets still send the picked type", () => {
        expect(buildWorkerListPayload({ ...base, bucket: "all", filters: { ...EMPTY_FILTERS, type: "1" } }).type).toBe("1");
    });
    test("the API tab key for the pipeline bucket is in_pipeline (TAB_STATUS_MAP); the UI bucket key stays pipeline", () => {
        expect(apiTabType("pipeline")).toBe("in_pipeline");
        expect(apiTabType("hired")).toBe("hired");
        const payload = buildWorkerListPayload({ ...base, bucket: "pipeline", pipeView: "pipe_local", filters: EMPTY_FILTERS });
        expect(payload.tab_type).toBe("in_pipeline");
    });
    test("a leftover Type is not an active filter in Not registered (Clear filters stays hidden)", () => {
        const args = { ownerFilters: {}, sort: DEFAULT_SORT, isAvailLocal: false };
        expect(isNonDefaultState({ ...args, filters: { ...EMPTY_FILTERS, type: "2" }, bucket: "not_registered" })).toBe(false);
        expect(isNonDefaultState({ ...args, filters: { ...EMPTY_FILTERS, type: "2" }, bucket: "all" })).toBe(true);
    });
});
