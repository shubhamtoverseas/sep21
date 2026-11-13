/* eslint-env jest */
import fs from "fs";
import path from "path";
import reducer, { clearContractDocuments } from "../../redux/Slices/processing/ProcessingSlice";

/* Mubin 30 Oct: contract 36 showed contract 46's HK Medical data until a reload — the stage documents must start empty
   for every contract */
describe("processing slice · clearContractDocuments", () => {
    test("resets every per-contract document and status list, keeps the rest", () => {
        const before = reducer(undefined, { type: "@@init" });
        const dirty = {
            ...before,
            processingDetails: { id: 46 },
            visaDocument: { visa_reference_no: "A" },
            medicalDocument: { coupon_code: "123", status: "coupon_shared" },
            medicalDocumentStatusList: [{ id: "x" }],
            eVisaDocumentStatusList: [{ id: "x" }],
            insuranceDocument: { id: 1 },
            insuranceDocumentStatusList: [{ id: "x" }],
            preDepartureMedicalDocStatuses: [{ id: "x" }],
            preDepartureOtherDocStatus: [{ id: "x" }],
            preDepartureDocument: { id: 1 },
            deploymentDocument: { id: 1 },
            deploymentStatuses: [{ id: "x" }],
            entityProcessingStatuses: [{ id: "keep" }],
            filters: { keep: true },
        };
        const after = reducer(dirty, clearContractDocuments());
        ["processingDetails", "visaDocument", "medicalDocument", "insuranceDocument", "preDepartureDocument", "deploymentDocument"].forEach((k) => expect(after[k]).toEqual({}));
        ["medicalDocumentStatusList", "eVisaDocumentStatusList", "insuranceDocumentStatusList", "preDepartureMedicalDocStatuses", "preDepartureOtherDocStatus", "deploymentStatuses"].forEach((k) => expect(after[k]).toEqual([]));
        expect(after.entityProcessingStatuses).toEqual([{ id: "keep" }]);
        expect(after.filters).toEqual({ keep: true });
    });
    test("the record page clears the documents and its tab cache when the contract changes", () => {
        const src = fs.readFileSync(path.join(__dirname, "../../Views/Pages/ProcessingPage/processing-detail/ProcessingDetail.js"), "utf8");
        expect(src).toMatch(/useEffect\(\(\) => \{\s*\/\*[^*]*\*\/\s*dispatch\(clearContractDocuments\(\)\);\s*setLoadedTabs\(\{\}\);\s*setActiveTab\(null\);/);
    });
});
