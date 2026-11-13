/* eslint-env jest */
/* eslint-disable react/prop-types */
import React from "react";
import fs from "fs";
import path from "path";
import { render, screen } from "@testing-library/react";
import { ContractLifecycleContext, isProcessingLifecycle, lifecycleOf, useIsProcessingContract } from "../../Views/Pages/ProcessingPage/processing-detail/contractLifecycle";
import { getCompletingStatusIds, isProcessingContract } from "../../Views/Pages/ProcessingPage/processing-detail/terminal-flow/terminalFlowRules";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");
const Probe = ({ details }) => <span data-testid="p">{ useIsProcessingContract(details) ? "processing" : "locked" }</span>;

/* 3 Nov (Mubin, contract 20): the header and every stage panel read one lifecycle; the details `status` is only the last fallback */
describe("contract lifecycle (CH 501)", () => {
    test("lifecycleOf: explicit value, then contract_status, then status; blanks fall through", () => {
        expect(lifecycleOf({ status: 3 }, 1)).toBe(1);
        expect(lifecycleOf({ status: 3 }, "1")).toBe(1);
        expect(lifecycleOf({ contract_status: "1", status: 3 })).toBe(1);
        expect(lifecycleOf({ status: 3 })).toBe(3);
        expect(lifecycleOf({ status: 3 }, "")).toBe(3);
        expect(lifecycleOf({ status: 3 }, NaN)).toBe(3);
        expect(lifecycleOf({ contract_status: null, status: null })).toBeNull();
        expect(lifecycleOf(undefined)).toBeNull();
        expect(isProcessingLifecycle({ status: 2 }, 1)).toBe(true);
        expect(isProcessingLifecycle({ status: 2 })).toBe(false);
    });
    test("the hook reads the provider (the header's row.contract_status) and falls back to the record outside it", () => {
        const { rerender } = render(<ContractLifecycleContext.Provider value="1"><Probe details={ { status: 3 } } /></ContractLifecycleContext.Provider>);
        expect(screen.getByTestId("p")).toHaveTextContent("processing");
        rerender(<ContractLifecycleContext.Provider value={ undefined }><Probe details={ { status: 3 } } /></ContractLifecycleContext.Provider>);
        expect(screen.getByTestId("p")).toHaveTextContent("locked");
        rerender(<Probe details={ { contract_status: 1, status: 3 } } />);
        expect(screen.getByTestId("p")).toHaveTextContent("processing");
        rerender(<Probe details={ { status: 1 } } />);
        expect(screen.getByTestId("p")).toHaveTextContent("processing");
    });
    test("the terminal-flow rules accept the lifecycle id", () => {
        expect(isProcessingContract({ status: 2 }, 1)).toBe(true);
        expect(isProcessingContract({ status: 2 })).toBe(false);
        const lastOpen = {
            status: 2, processing_group: 3,
            "processingContractDocumentModel.status": "ready", "processingConsulateDocumentModel.status": "returned",
            "processingImmigrationDocumentModel.status": "submitted", "processingVisaDocumentModel.status": "visa_reference_number_released",
            "processingInsuranceDocumentModel.status": "not_required", "processingMedicalDocumentModel.status": "not_required",
        };
        expect(getCompletingStatusIds("visa", lastOpen)).toEqual([]);
        expect(getCompletingStatusIds("visa", lastOpen, 1)).toEqual(["visa_released"]);
    });
    test("no stage panel gates on the details status any more; ProgressTab provides the header's lifecycle", () => {
        const dir = path.join(__dirname, "../../Views/Pages/ProcessingPage/processing-detail");
        const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
        const offenders = walk(dir).filter((f) => f.endsWith(".js") && /status === CONTRACT_STATUS\.PROCESSING/.test(fs.readFileSync(f, "utf8")));
        expect(offenders).toEqual([]);
        const tab = read("Views/Pages/Contract/details/ProgressTab.js");
        expect(tab).toMatch(/<ContractLifecycleContext\.Provider value=\{ row\.contract_status \}>/);
        expect(tab.indexOf("<ContractLifecycleContext.Provider")).toBeLessThan(tab.indexOf("<ContractTerminalFlow"));
        expect(tab.indexOf("<ProcessingDetail ")).toBeLessThan(tab.indexOf("</ContractLifecycleContext.Provider>"));
    });
});
