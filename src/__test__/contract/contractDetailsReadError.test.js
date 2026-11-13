/* eslint-env jest */
import fs from "fs";
import path from "path";
import reducer, { fetchContractDetailsById } from "../../redux/Slices/contract/ContractSlice";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");
const initial = reducer(undefined, { type: "@@init" });
const withRecord = { ...initial, contractDetails: { id: 19, status: 1 }, contractDetailsError: null };

/* Priyanka 3 Nov (contract 20): a failed details read is an error message, never a record — and never the previous record */
describe("contract details read errors (CH 502)", () => {
    test("a 200 with status:false clears the record and keeps the reason", () => {
        const next = reducer(withRecord, fetchContractDetailsById.fulfilled({ status: false, message: "Contract not found" }, "r1", 20));
        expect(next.contractDetails).toEqual({});
        expect(next.contractDetailsError).toBe("Contract not found");
        expect(next.status).toBe("failed");
    });
    test("a 200 without data is a failure too; a real record resets the error", () => {
        const failed = reducer(withRecord, fetchContractDetailsById.fulfilled({ status: true }, "r1", 20));
        expect(failed.contractDetails).toEqual({});
        expect(failed.contractDetailsError).toBe("");
        const ok = reducer(failed, fetchContractDetailsById.fulfilled({ status: true, data: { id: 20, status: 1 } }, "r2", 20));
        expect(ok.contractDetails).toEqual({ id: 20, status: 1 });
        expect(ok.contractDetailsError).toBeNull();
        expect(ok.status).toBe("succeeded");
    });
    test("a 404 (rejected with the server body) clears the record and keeps the reason; no body keeps an empty reason", () => {
        const notFound = reducer(withRecord, fetchContractDetailsById.rejected(new Error("Request failed"), "r1", 20, { status: false, message: "Contract 20 cannot be opened: worker missing" }));
        expect(notFound.contractDetails).toEqual({});
        expect(notFound.contractDetailsError).toBe("Contract 20 cannot be opened: worker missing");
        const network = reducer(withRecord, fetchContractDetailsById.rejected(new Error("Network Error"), "r1", 20));
        expect(network.contractDetails).toEqual({});
        expect(network.contractDetailsError).toBe("Network Error");
    });
    test("the initial state carries no error", () => {
        expect(initial.contractDetailsError).toBeNull();
    });
    test("the record page waits for both reads and shows the reason instead of a record", () => {
        const page = read("Views/Pages/Contract/details/ContractDetails.js");
        expect(page).toMatch(/await Promise\.all\(\[dispatch\(fetchContractDetailsById\(contractId\)\), getContractDashboardListAPI/);
        expect(page).toMatch(/if \(contractDetailsError !== null && contractDetailsError !== undefined\) \{/);
        expect(page.indexOf("contractDetailsError !== null")).toBeLessThan(page.indexOf("if (!row || !canAccessProcessingDetails(permissions))"));
        expect(page).toMatch(/data-record-error=""/);
        expect(page).toMatch(/translation\("key_couldnt_load_this_view"\)/);
    });
});
