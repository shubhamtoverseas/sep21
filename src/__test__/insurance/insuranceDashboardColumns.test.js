import React from "react";
import i18n from "i18next";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import en from "../../../public/locales/en/translation.json";
import configData from "../../components/ReusableComponents/app-configs";
import { COLUMN_VIEW_STATE_KEYS } from "../../components/ReusableComponents/constants";
import { loadColumnKeys } from "../../services/commonService";
import { getInsuranceColumns } from "../../Views/Pages/insurance/dashboard/insuranceDashboardColumns";

/* Dashboard listing (register #82–#85, consolidated prototype dashboard.js; C2/C11 resolved 15 Oct; verification FN-194,
   FN-200, FN-204, FN-205) */

beforeAll(async () => {
    await i18n.init({ lng: "en", resources: { en: { translation: en } }, interpolation: { escapeValue: false } });
});
afterEach(() => localStorage.clear());

const ALL = () => configData.insuranceColumnsConfigTranslate({ translation: (k) => i18n.t(k) }).map((o) => o.value);

describe("column set and order (register #82; Q-19 prototype order, 10 Nov 2026)", () => {
    it("lists the columns in the prototype order, the optional ones before the CS Owner / Branch pair", () => {
        expect(ALL()).toEqual([
            "workerName", "employerName", "insuranceRef", "openRequests", "coverageStatus", "qbePolicyNumber", "activity", "policyPeriod",
            "expiry", "contract", "submittedBy", "csOwner", "branch",
        ]);
        expect(configData.insuranceColumnsConfigTrans()).toEqual([
            "workerName", "employerName", "insuranceRef", "openRequests", "coverageStatus", "qbePolicyNumber", "activity", "policyPeriod",
            "csOwner", "branch",
        ]);
    });

    it("locks Worker Name, Insurance Ref and QBE policy number", () => {
        expect(configData.insuranceMandatoryColumnsTrans()).toEqual(["workerName", "insuranceRef", "qbePolicyNumber"]);
    });

    it("labels the name columns Worker Name and Employer Name", () => {
        const labels = configData.insuranceColumnLabels({ t: (k) => i18n.t(k) });
        expect([labels.workerName, labels.employerName, labels.qbePolicyNumber]).toEqual(["Worker Name", "Employer Name", "QBE policy number"]);
    });

    it("an older stored preference gets the mandatory QBE policy number back and renders in the fixed order", () => {
        localStorage.setItem(COLUMN_VIEW_STATE_KEYS.insurance, JSON.stringify({ columns: ["branch", "insuranceRef", "workerName", "contract"] }));
        const cols = loadColumnKeys(COLUMN_VIEW_STATE_KEYS.insurance, configData.insuranceColumnsConfigTrans(), ALL(), configData.insuranceMandatoryColumnsTrans());
        expect(getInsuranceColumns(cols).map((c) => c.key)).toEqual(["workerName", "insuranceRef", "qbePolicyNumber", "contract", "branch"]);
    });

    it("keeps the divider on the left edge of Insurance Ref, with or without Employer Name", () => {
        expect(getInsuranceColumns(ALL()).filter((c) => c.divider).map((c) => c.key)).toEqual(["insuranceRef"]);
    });
});

const row = {
    id: 1, ref: "IN-HKH000021", carrierRef: null,
    worker: { id: 9, name: "Dewi Lestari Putri", code: "BD0410201-JK" },
    employer: { name: "Chang Yuen Yi", zh: "朱家儀" },
    coverage: { label: "active", code: "ending", fact: "fact.ends", factDate: "2026-10-15", nextStart: "2026-11-01", gapDays: 16 },
    contract: { id: 44, number: "C-HKH000044" },
};
const renderCell = (key, r = row, opts) => {
    const column = getInsuranceColumns([key], opts)[0];
    return render(<MemoryRouter>{column.render(r)}</MemoryRouter>);
};

describe("cells (register #83–#85)", () => {
    it("Worker Name shows the name only, no Worker Code", () => {
        const { container } = renderCell("workerName");
        expect(container.textContent).toBe("Dewi Lestari Putri");
        expect(container.querySelector("a")).toBeNull();
    });

    it("Employer Name is one bilingual value in one treatment", () => {
        const { container } = renderCell("employerName");
        expect(container.textContent).toBe("Chang Yuen Yi · 朱家儀");
        expect(container.querySelectorAll("span")).toHaveLength(1);
    });

    it("Coverage status holds the tag only; the detail is its title", () => {
        const { container } = renderCell("coverageStatus");
        expect(container.textContent).toBe("Active");
        expect(container.firstChild.getAttribute("title")).toBe("Cancellation accepted · ends 14/10/26 · Next period starts 01/11/26 · 16-day gap");
    });

    it("QBE policy number shows a dash when the insurer has not issued it", () => {
        expect(renderCell("qbePolicyNumber").container.textContent).toBe("—");
    });

    it("Contract shows the word Contract linking to the contract, never the number; Standalone otherwise", () => {
        const canOpenContract = jest.fn(() => true);
        renderCell("contract", row, { canOpenContract });
        const link = screen.getByRole("link");
        expect(link.textContent).toBe("Contract");
        expect(link.getAttribute("href")).toContain("44");
        expect(canOpenContract).toHaveBeenCalledWith(44);
        expect(document.body.textContent).not.toContain("C-HKH000044");
        expect(renderCell("contract", { ...row, contract: null }).container.textContent).toContain("Standalone");
    });

    it("Contract is plain text, not a link, when the viewer cannot open that Contract record (or nothing says they can)", () => {
        const denied = renderCell("contract", row, { canOpenContract: () => false });
        expect(denied.container.textContent).toBe("Contract");
        expect(denied.container.querySelector("a")).toBeNull();
        denied.unmount();
        const unknown = renderCell("contract");
        expect(unknown.container.querySelector("a")).toBeNull();
    });
});
