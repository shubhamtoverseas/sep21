import fs from "fs";
import path from "path";
import configData from "../../components/ReusableComponents/app-configs";

/* Invoice types (INV §3.1; 28 Sep sheet row 4): the admin definition equals the Invoice API's
   (maidmatch-contract src/domain/invoice/types.ts) in codes, labels, titles and order. Needs the maidmatch-contract
   checkout next to this repo (or CONTRACT_API_DIR); without it the parity case is skipped. */

const en = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
const apiFile = path.join(process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract"), "src/domain/invoice/types.ts");

describe("invoice types", () => {
    test("the spec type set in spec order", () => {
        expect(configData.INVOICE_TYPES.map((t) => en[t.labelKey]))
            .toEqual(["Standalone", "Contract", "Reservation Fee", "Refund Child", "Exchange", "Underpayment Child"]);
    });

    test("Reservation Fee is a Contract subtype; children keep their own type", () => {
        expect(configData.INVOICE_TYPES.find((t) => t.code === "reservation_fee").subtypeOf).toBe("contract");
        for (const stored of ["general", "contract", "general_refund", "contract_refund", "overpaid_refund", "exchange", "underpayment"]) {
            expect(configData.invoiceTypeIdMapping[stored]).toBeTruthy();
        }
    });

    (fs.existsSync(apiFile) ? test : test.skip)("parity with the Invoice API: codes, labels and titles in the same order", () => {
        const source = fs.readFileSync(apiFile, "utf8");
        const set = source.slice(source.indexOf("INVOICE_TYPE_SET"), source.indexOf("].map((definition)"));
        const api = [...set.matchAll(/code: "(\w+)", label: "([^"]+)", title: "([^"]+)"/g)].map((m) => [m[1], m[2], m[3]]);
        expect(api).toEqual(configData.INVOICE_TYPES.map((t) => [t.code, en[t.labelKey], en[t.titleKey]]));
    });
});
