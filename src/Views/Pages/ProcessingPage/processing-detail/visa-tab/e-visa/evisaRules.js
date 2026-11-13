import { CR_VISA_CORRECTION_CODE, CR_VISA_EXPIRY_CODE } from "../../../../Contract/contractConstants";

/* the fields of the visa record that `update-processing-visa-evisa` writes */
export const EVISA_RECORD_FIELDS = Object.freeze(["visa_reference_no", "e_visa_payment_date", "ac_refunded", "entry_visa_expiry_date"]);

export const evisaChanges = (draft, stored) => ({
    recordChanged: EVISA_RECORD_FIELDS.some((k) => draft[k] !== stored[k]),
    expiryChanged: draft.visa_expiry_date !== stored.visa_expiry_date,
    entryChanged: draft.entry_visa_expiry_date !== stored.entry_visa_expiry_date,
});

/* when the Correction Reason box is required:
   - a RECORDED Visa Expiry / Entry Visa Expiry changes (first record: none), or the server asked for one (U-0284);
   - after Visa Released, ANY change to the visa details (backend 299: "A reason is required to change the visa details after release.") */
export const evisaReasonRequired = ({ draft, stored, released, needsReason }) => {
    const { recordChanged, expiryChanged, entryChanged } = evisaChanges(draft, stored);
    if (released && recordChanged) return true;
    if (needsReason && (recordChanged || expiryChanged)) return true;
    return Boolean((expiryChanged && stored.visa_expiry_date) || (entryChanged && stored.entry_visa_expiry_date));
};

/* visa-expiry-update: `code` VISA_EXPIRY_CHANGE_REASON_REQUIRED (400); update-processing-visa-evisa: `error_code` VISA_CORRECTION_REASON_REQUIRED (422, backend 365); the message text is the last resort */
export const isReasonRefusal = (result) => result?.code === CR_VISA_EXPIRY_CODE.REASON_REQUIRED
    || result?.error_code === CR_VISA_CORRECTION_CODE.REASON_REQUIRED
    || /reason/i.test(String(result?.message || ""));
