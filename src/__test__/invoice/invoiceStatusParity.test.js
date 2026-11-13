import fs from "fs";
import path from "path";
import configData from "../../components/ReusableComponents/app-configs";

/* The 11 invoice statuses (INV §3.2; 28 Sep sheet row 3): the admin definition equals the Invoice API's
   (maidmatch-contract src/domain/invoice/statuses.ts) in codes, ids, EN labels and order. Needs the maidmatch-contract
   checkout next to this repo (or CONTRACT_API_DIR); without it the parity case is skipped. */

const SPEC = ["Draft", "Pending Paid", "Paid", "Reservation Fee", "Refunded / Unapproved", "Refunded", "Exchange / Unapproved",
    "Exchanged", "Unsettled", "Bad Debt", "Void"];
const en = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));
const apiDir = process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract");
const apiFile = path.join(apiDir, "src/domain/invoice/statuses.ts");

describe("invoice statuses", () => {
    test("one definition: the 11 spec statuses in spec order with their EN labels", () => {
        expect(configData.INVOICE_STATUSES.map((s) => en[s.labelKey])).toEqual(SPEC);
    });

    test("Draft has no stored id; every stored id (and the legacy 3) has a label and a class", () => {
        expect(configData.INVOICE_STATUSES.find((s) => s.code === "draft").id).toBeNull();
        const ids = Object.keys(configData.invoiceStatusIdMapping).map(Number).sort((a, b) => a - b);
        expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
        for (const id of ids) expect(configData.invoiceStatusIdMapping[id].className).toBeTruthy();
    });

    (fs.existsSync(apiFile) ? test : test.skip)("parity with the Invoice API: codes and labels in the same order", () => {
        const source = fs.readFileSync(apiFile, "utf8");
        const set = source.slice(source.indexOf("INVOICE_STATUS_SET"), source.indexOf("].map((definition)"));
        const api = [...set.matchAll(/code: "(\w+)",[^}]*label: "([^"]+)"/g)].map((m) => [m[1], m[2]]);
        expect(api).toEqual(configData.INVOICE_STATUSES.map((s) => [s.code, en[s.labelKey]]));
    });
});
