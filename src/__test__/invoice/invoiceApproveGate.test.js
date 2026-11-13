import fs from "fs";
import path from "path";

/* Approve Payment before the proof / deposit receipt is uploaded (13 Oct; I-HKH000001, Pending Paid Cash): ruling 13 Oct —
   shown, not clickable, with the reason. Decision AA-06 (13 Oct): the reason is the Invoice API's — the action list
   entry for Approve Payment carries allowed: false and the reason ("Blocked — deposit receipt required before approval",
   "Blocked — payment proof required before approval", "Blocked — parent A2 exchange is not yet approved"). */

const read = (rel) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");
const EN = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../public/locales/en/translation.json"), "utf8"));

const SCREENS = ["Views/Pages/Invoice/general/PaymentTypeInvoice.js", "Views/Pages/Invoice/add-contract-invoice/PaymentTypeInvoice.js"];

describe("Approve Payment waits for the proof / deposit receipt", () => {
    test("both payment detail screens show it disabled with the API's reason while it is blocked", () => {
        for (const file of SCREENS) {
            const src = read(file);
            expect(src).toMatch(/const approveAction = findAction\(actionStatusCustomList, APPROVE_PAYMENT_KEYS\);/);
            // a blocked Approve is a plain disabled row — it drops its primary emphasis (UI Step 4, D-11)
            expect(src).toMatch(/className=\{ 'action-btn' \+ \(isBlocked\(approveAction\) \? ' disabled with-reason' : ' primary'\) \} disabled=\{ isBlocked\(approveAction\) \} onClick=\{ \(\) => !isBlocked\(approveAction\) && handleActionStatusModel\(approveAction\) \}/);
            expect(src).toMatch(/\{ isBlocked\(approveAction\) && <span className="blocked">\{ approveAction\.reason \}<\/span> \}/);
            // the prototype's order: Upload Deposit Receipt / Upload Proof, Approve Payment, then Reject / Mark Unsettled
            const upload = src.indexOf("onClick={ doc.openUpload }");
            const approve = src.indexOf("handleActionStatusModel(approveAction)");
            const reject = src.indexOf("handleActionStatusModel(rejectAction)");
            expect(upload).toBeGreaterThan(0);
            expect(approve).toBeGreaterThan(upload);
            expect(reject).toBeGreaterThan(approve);
        }
    });

    test("the screens keep no copy of the reasons of their own", () => {
        for (const key of ["key_deposit_receipt_required_before_approval", "key_payment_proof_required_before_approval"]) {
            expect(EN[key]).toBeUndefined();
            for (const file of SCREENS) expect(read(file)).not.toContain(key);
        }
    });
});
