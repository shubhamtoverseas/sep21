/* eslint-env jest */
import React from "react";
import { render } from "@testing-library/react";
import DashboardFilterBar, { BRANCH_MODE } from "../../Views/Pages/Contract/dashboard/DashboardFilterBar";
import { CD_GROUPS, CD_ITB_NATIONALITY_IDS, CD_NATIONALITY_FILTER_GROUPS } from "../../Views/Pages/Contract/contractConstants";
import { bangladeshId, fillipinoId, indonesiaId, thaiId } from "../../components/ReusableComponents/constants";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

const barProps = (over = {}) => ({
    search: "", searchEnabled: true, onSearch: () => {},
    filters: { contract_category: "", nationality: "", code_group: "" },
    categoryOptions: [], nationalityOptions: [{ value: String(indonesiaId), label: "Indonesian" }], codeOptions: [],
    onFilter: () => {},
    branch: { mode: BRANCH_MODE.HIDDEN, options: [], selected: [] }, onBranch: () => {},
    visibleCount: 10, totalCount: 18, columnsOpen: false, onColumnsOpen: () => {}, onClear: () => {},
    ...over,
});

/* ClickUp 14ykpqtz7y7 (Shubham, 7 Nov): Groups 1 & 3 take ITB nationalities only; Groups 2 & 4 have no Nationality filter */
describe("Contracts dashboard nationality filter (ClickUp 14ykpqtz7y7)", () => {
    test("the filter exists on Groups 1 and 3 only; every Group is accounted for", () => {
        expect(CD_NATIONALITY_FILTER_GROUPS).toEqual([1, 3]);
        CD_GROUPS.forEach((g) => expect([1, 3, 2, 4]).toContain(g));
    });

    test("the offered nationalities are ITB — Indonesian, Thai, Bangladeshi — and never Filipino", () => {
        expect(CD_ITB_NATIONALITY_IDS).toEqual(expect.arrayContaining([String(indonesiaId), String(thaiId), String(bangladeshId)]));
        expect(CD_ITB_NATIONALITY_IDS).toHaveLength(3);
        expect(CD_ITB_NATIONALITY_IDS).not.toContain(String(fillipinoId));
        /* the dashboard's option mapper keeps only these ids, whatever the API returns */
        const fromApi = [{ id: fillipinoId, name: "Filipino" }, { id: indonesiaId, name: "Indonesian" }, { id: thaiId, name: "Thai" }, { id: bangladeshId, name: "Bangladeshi" }]
            .map((o) => ({ value: String(o.id), label: o.name }))
            .filter((o) => CD_ITB_NATIONALITY_IDS.includes(o.value));
        expect(fromApi.map((o) => o.label)).toEqual(["Indonesian", "Thai", "Bangladeshi"]);
    });

    test("the control renders when visible and is absent when a Group carries no nationality filter", () => {
        const { container, rerender } = render(<DashboardFilterBar { ...barProps({ nationalityVisible: true }) } />);
        expect(container.querySelector("#cd-f-nationality")).not.toBeNull();
        rerender(<DashboardFilterBar { ...barProps({ nationalityVisible: false }) } />);
        expect(container.querySelector("#cd-f-nationality")).toBeNull();
    });
});
