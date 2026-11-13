import React from "react";
import PropTypes from "prop-types";
import translation from "../../../../utils/translation";
import { handleOtpInputChange } from "../../../../services/commonService";
import styles from "./NewEmployerModal.module.css";
import { CONTACT_OTP_COPY, EMPLOYER_FORM_COPY, OTP_CODE_LENGTH } from "./employerNewUiConstants";

/*
 * Prototype Employer_Details.html · Edit Employer · Mobile block: `Send OTP` → code row (6-digit input · Verify · Cancel ·
 * Resend code · "Code sent via WhatsApp to +852 …") and the note that the saved number stays the verified one until the
 * replacement's code is verified. Badges: Verified (saved number, or a replacement verified in this session) ·
 * Replacement pending (a changed number without a verified code). Shared by the New / Edit Employer form and the
 * Contract record's Employer Contact Details dialog.
 */
export const VerifiedTag = () => (
    <span className={ styles.verifiedTag }><span className={ styles.verifiedDot } />{ translation("key_verified") }</span>
);

export const PendingTag = () => <span className={ styles.pendingTag }>{ translation(CONTACT_OTP_COPY.pending) }</span>;

/** the badge for a phone field from the hook's state */
export const ContactBadge = ({ state }) => {
    if (!state) return null;
    if (state.verified || state.savedUnchanged) return <VerifiedTag />;
    if (state.changed) return <PendingTag />;
    return null;
};
ContactBadge.propTypes = { state: PropTypes.object };

export const OtpRow = ({ onOtpChange, onVerify, onResend, onCancel, resendSeconds, sentTo, busy }) => (
    <div className={ styles.otpRow }>
        <div className={ styles.otpInputs }>
            <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={ OTP_CODE_LENGTH }
                className={ `${ styles.input } ${ styles.otpInput }` }
                placeholder={ translation("key_enter_code") }
                aria-label={ translation("key_enter_code") }
                onChange={ (event) => handleOtpInputChange(event, OTP_CODE_LENGTH, onOtpChange) }
            />
            <button type="button" className={ styles.otpVerify } onClick={ onVerify } disabled={ busy }>{ translation("key_verify") }</button>
            { onCancel && <button type="button" className={ styles.linkBtn } onClick={ onCancel } disabled={ busy }>{ translation("key_cancel") }</button> }
        </div>
        <div className={ styles.otpHint }>
            { EMPLOYER_FORM_COPY.codeSentTo } { sentTo }
            { " · " }
            <button type="button" className={ styles.linkBtn } onClick={ onResend } disabled={ busy || resendSeconds > 0 }>
                { resendSeconds > 0 ? `${ translation("key_resend_code") } (${ resendSeconds }s)` : translation("key_resend_code") }
            </button>
        </div>
    </div>
);
OtpRow.propTypes = {
    onOtpChange: PropTypes.func.isRequired, onVerify: PropTypes.func.isRequired, onResend: PropTypes.func.isRequired, onCancel: PropTypes.func,
    resendSeconds: PropTypes.number, sentTo: PropTypes.string, busy: PropTypes.bool,
};

/** "The saved Mobile +852 … is still the verified number. The replacement becomes the Mobile only after its code is verified." */
export const OtpSavedNote = ({ fieldLabel, savedNumber }) => (
    <div className={ styles.otpHint }>
        { translation(CONTACT_OTP_COPY.savedNote).split("{{field}}").join(fieldLabel).split("{{number}}").join(savedNumber) }
    </div>
);
OtpSavedNote.propTypes = { fieldLabel: PropTypes.string.isRequired, savedNumber: PropTypes.string.isRequired };
