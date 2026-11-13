/* backend 301: a changed E-Visa Payment Date on End of Processing needs a reason; blank → 400 with this code */
export const E_VISA_PAYMENT_DATE_REASON_CODE = "E_VISA_PAYMENT_DATE_CHANGE_REASON_REQUIRED";
export const E_VISA_PAYMENT_DATE_REASON_MAX = 1000;

export const TERMINAL_FLOW_VARIANT = Object.freeze({
    END_OF_DEPLOYMENT: "end_of_deployment",
    END_OF_PROCESSING: "end_of_processing",
});

/* Copy keys per flow (TERMINAL.md §2–3). The confirmed date becomes the Contract Start. */
export const TERMINAL_FLOW_COPY = Object.freeze({
    [TERMINAL_FLOW_VARIANT.END_OF_DEPLOYMENT]: {
        titleKey: "key_end_of_deployment",
        introKey: "key_end_of_deployment_intro",
        dateLabelKey: "key_arrival_date",
        hintKey: "key_arrival_date_contract_start_hint",
    },
    [TERMINAL_FLOW_VARIANT.END_OF_PROCESSING]: {
        titleKey: "key_end_of_processing",
        introKey: "key_end_of_processing_intro",
        dateLabelKey: "key_visa_release_date",
        hintKey: "key_visa_release_date_record_hint",
    },
});
