import React from "react";
import PropTypes from "prop-types";
import { Controller } from "react-hook-form";
import Icon from "../../../../components/Icon/Icon";
import translation from "../../../../utils/translation";
import { formatPhoneDisplay, handleMobileInput } from "../../../../services/commonService";
import styles from "./NewEmployerModal.module.css";
import { CONTACT_OTP_COPY, EMPLOYER_TITLE_OPTIONS, EMPLOYER_FORM_COPY } from "./employerNewUiConstants";
import { OtpRow, OtpSavedNote, PendingTag, VerifiedTag } from "./ContactOtpRow";

const Field = ({ label, required, error, full, children, trailing, className }) => (
    <div className={`${styles.field} ${full ? styles.fieldFull : ""} ${className || ""}`}>
        <div className={styles.fieldLabel}>
            <span>{label}{required && <span className={styles.required}>*</span>}</span>
            {trailing}
        </div>
        {children}
        {error && <div className={styles.fieldError}>{error}</div>}
    </div>
);
Field.propTypes = { label: PropTypes.node, required: PropTypes.bool, error: PropTypes.node, full: PropTypes.bool, children: PropTypes.node, trailing: PropTypes.node, className: PropTypes.string };

const SelectBox = ({ field, invalid, legacy, children }) => (
    <div className={`${styles.selectWrap} ${invalid ? styles.invalid : ""} ${legacy ? styles.legacyValue : ""}`}>
        <select {...field} value={field.value ?? ""} className={styles.select}>{children}</select>
        <Icon name="chev_down" size={10} className={styles.selectChevron} />
    </div>
);
SelectBox.propTypes = { field: PropTypes.object.isRequired, invalid: PropTypes.bool, legacy: PropTypes.bool, children: PropTypes.node };

/* a phone field's badge: Verified (saved or verified in this session) · Replacement pending (changed, code not verified) */
const PhoneBadge = ({ verified, changed }) => (verified ? <VerifiedTag /> : changed ? <PendingTag /> : null);
PhoneBadge.propTypes = { verified: PropTypes.bool, changed: PropTypes.bool };

const SectionDivider = ({ children }) => <div className={styles.sectionDivider}>{children}</div>;
SectionDivider.propTypes = { children: PropTypes.node };

const CountryCodeSelect = ({ field, countries, invalid, disabled }) => (
    <div className={`${styles.selectWrap} ${styles.countryCode} ${invalid ? styles.invalid : ""} ${disabled ? styles.mutedField : ""}`}>
        <select {...field} value={field.value ?? ""} className={styles.select} disabled={disabled} aria-label={translation("key_country_code")}>
            <option value="">{translation("key_select_country_code")}</option>
            {countries.map((country) => (
                <option key={country.code} value={country.code}>{country.name} {country.code}</option>
            ))}
        </select>
        <Icon name="chev_down" size={10} className={styles.selectChevron} />
    </div>
);
CountryCodeSelect.propTypes = { field: PropTypes.object.isRequired, countries: PropTypes.array.isRequired, invalid: PropTypes.bool, disabled: PropTypes.bool };

const NewEmployerForm = ({ control, errors, lookups, derived, actions, variant, locked = {}, hidden = {} }) => {
    const isDrawer = variant === "drawer";
    const { countries, locations, languages, nationalities, branches, districts } = lookups;

    return (
        <div className={styles.grid}>
            {/* audit P-01: a block the actor may not edit renders disabled (display: contents keeps the grid);
                U-0346: a block the actor may not view is not rendered */}
            {!hidden.identity && (<>
            {isDrawer && <SectionDivider>{translation("key_identity")}</SectionDivider>}
            <fieldset className={styles.lockedGroup} disabled={Boolean(locked.identity)}>
            <Field label={translation("key_title")} required error={errors.title?.message}>
                <Controller name="title" control={control} render={({ field }) => (
                    <SelectBox field={field} invalid={Boolean(errors.title)}>
                        <option value="">{translation("key_select_title")}</option>
                        {EMPLOYER_TITLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.key ? translation(option.key) : option.label}</option>)}
                    </SelectBox>
                )} />
            </Field>

            <Field label={translation("key_chinese_name")} error={errors.chinese_name?.message}>
                <Controller name="chinese_name" control={control} render={({ field }) => (
                    <input {...field} value={field.value ?? ""} type="text" className={styles.input} placeholder="中文姓名" />
                )} />
            </Field>

            <Field label={translation("key_surname")} required error={errors.surname?.message}>
                <Controller name="surname" control={control} render={({ field }) => (
                    <input {...field} type="text" className={`${styles.input} ${errors.surname ? styles.invalid : ""}`} placeholder={translation("key_surname")} />
                )} />
            </Field>

            <Field label={translation("key_given_names")} required error={errors.name?.message}>
                <Controller name="name" control={control} render={({ field }) => (
                    <input {...field} type="text" className={`${styles.input} ${errors.name ? styles.invalid : ""}`} placeholder={translation("key_given_names")} />
                )} />
            </Field>
            </fieldset>
            </>)}

            {!hidden.contact && (<>
            <SectionDivider>{translation("key_contact")}</SectionDivider>
            <fieldset className={styles.lockedGroup} disabled={Boolean(locked.contact)}>
            <Field
                label={translation("key_mobile")}
                required
                error={errors.country_code?.message || errors.mobile_number?.message}
                trailing={<PhoneBadge verified={derived.mobileVerified} changed={derived.mobileChanged} />}
                className={styles.contactField}
            >
                <div className={styles.phoneRow}>
                    <Controller name="country_code" control={control} render={({ field }) => (
                        <CountryCodeSelect field={field} countries={countries} invalid={Boolean(errors.country_code)} />
                    )} />
                    <Controller name="mobile_number" control={control} render={({ field }) => (
                        <input
                            {...field}
                            value={formatPhoneDisplay(field.value)}
                            type="text"
                            inputMode="numeric"
                            className={`${styles.input} ${styles.phoneInput} ${errors.mobile_number ? styles.invalid : ""}`}
                            placeholder={translation("key_mobile")}
                            onChange={(event) => { handleMobileInput(event); field.onChange(event.target.value); }}
                        />
                    )} />
                    {!derived.mobileVerified && !derived.showMobileOtp && (
                        <button type="button" className={styles.linkBtn} onClick={actions.sendMobileOtp}>{translation("key_send_otp")}</button>
                    )}
                </div>
                {derived.showMobileOtp && (
                    <OtpRow
                        onOtpChange={actions.setMobileOtp}
                        onVerify={actions.verifyMobileOtp}
                        onResend={actions.sendMobileOtp}
                        onCancel={isDrawer ? actions.cancelMobileOtp : undefined}
                        resendSeconds={derived.mobileResendSeconds}
                        sentTo={derived.otpSentTo?.mobile}
                    />
                )}
                {isDrawer && derived.mobileChanged && !derived.mobileVerified && derived.savedMobile && (
                    <OtpSavedNote fieldLabel={translation("key_mobile")} savedNumber={derived.savedMobile} />
                )}
            </Field>

            <Field label={translation("key_whatsapp")} error={errors.whatsapp_country_code?.message || errors.whatsapp_number?.message}
                trailing={isDrawer && !derived.isWhatsappSameAsMobile ? <PhoneBadge verified={derived.whatsappVerified} changed={derived.whatsappChanged} /> : null}
                className={styles.contactField}>
                <div className={styles.phoneRow}>
                    <Controller name="whatsapp_country_code" control={control} render={({ field }) => (
                        <CountryCodeSelect
                            field={field}
                            countries={countries}
                            invalid={Boolean(errors.whatsapp_country_code)}
                            disabled={derived.isWhatsappSameAsMobile}
                        />
                    )} />
                    <Controller name="whatsapp_number" control={control} render={({ field }) => (
                        <input
                            {...field}
                            value={formatPhoneDisplay(field.value)}
                            type="text"
                            inputMode="numeric"
                            className={`${styles.input} ${styles.phoneInput} ${derived.isWhatsappSameAsMobile ? styles.mutedField : ""}`}
                            placeholder={translation("key_whatsapp_no")}
                            readOnly={derived.isWhatsappSameAsMobile}
                            onChange={(event) => { handleMobileInput(event); field.onChange(event.target.value); }}
                        />
                    )} />
                    {/* work order 22 Oct: a changed WhatsApp number needs its own code (same block as Mobile) */}
                    {isDrawer && !derived.isWhatsappSameAsMobile && derived.whatsappChanged && !derived.whatsappVerified && !derived.showWhatsappOtp && (
                        <button type="button" className={styles.linkBtn} onClick={actions.sendWhatsappOtp}>{translation("key_send_otp")}</button>
                    )}
                </div>
                {isDrawer && derived.showWhatsappOtp && (
                    <OtpRow
                        onOtpChange={actions.setWhatsappOtp}
                        onVerify={actions.verifyWhatsappOtp}
                        onResend={actions.sendWhatsappOtp}
                        onCancel={actions.cancelWhatsappOtp}
                        resendSeconds={derived.whatsappResendSeconds}
                        sentTo={derived.otpSentTo?.whatsapp}
                    />
                )}
                {isDrawer && !derived.isWhatsappSameAsMobile && derived.whatsappChanged && !derived.whatsappVerified && derived.savedWhatsapp && (
                    <OtpSavedNote fieldLabel={translation("key_whatsapp")} savedNumber={derived.savedWhatsapp} />
                )}
                <div className={styles.checkRow}>
                    <label className={styles.checkLabel}>
                        <input type="checkbox" className={styles.checkbox} checked={derived.isWhatsappSameAsMobile}
                            onChange={(event) => actions.toggleWhatsappSameAsMobile(event.target.checked)} />
                        {EMPLOYER_FORM_COPY.sameAsMobile}
                    </label>
                    <Controller name="whatsapp_confirmed" control={control} render={({ field: { value, onChange } }) => (
                        <label className={styles.checkLabel}>
                            <input type="checkbox" className={styles.checkbox} checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
                            {translation("key_employer_confirmed_this_number_is_on_whatsapp")}
                        </label>
                    )} />
                </div>
            </Field>

            {/* work order 22 Oct · prototype Edit Employer: Email is display-only once the record exists (changes are verified in the employer app) */}
            {isDrawer ? (
                <Field label={translation("key_email")} full>
                    <div className={styles.readonlyText}>{derived.savedEmail || "—"}</div>
                    <div className={styles.otpHint}>{translation(CONTACT_OTP_COPY.emailReadOnly)}</div>
                </Field>
            ) : (
            <Field label={translation("key_email_address_question")}>
                <div className={styles.radioRow} role="radiogroup" aria-label={translation("key_email_address")}>
                    <label className={styles.radioLabel}>
                        <input type="radio" name="emailOption" className={styles.radio} checked={derived.isEmailYes} onChange={() => actions.setEmailYes(true)} />
                        {translation("key_yes")}
                    </label>
                    <label className={styles.radioLabel}>
                        <input type="radio" name="emailOption" className={styles.radio} checked={!derived.isEmailYes} onChange={() => actions.setEmailYes(false)} />
                        {translation("key_no")}
                    </label>
                </div>
            </Field>
            )}

            {isDrawer ? null : derived.isEmailYes ? (
                <Field label={translation("key_email")} error={errors.email?.message} trailing={derived.emailVerified && <VerifiedTag />}>
                    <div className={styles.phoneRow}>
                        <Controller name="email" control={control} render={({ field }) => (
                            <input
                                {...field}
                                value={field.value ?? ""}
                                type="email"
                                className={`${styles.input} ${styles.phoneInput} ${errors.email ? styles.invalid : ""}`}
                                placeholder={translation("key_email")}
                                onBlur={() => actions.checkDuplicateEmail(field.value)}
                            />
                        )} />
                        {!derived.emailVerified && !derived.showEmailOtp && (
                            <button type="button" className={styles.linkBtn} onClick={actions.sendEmailOtp}>{translation("key_send_otp")}</button>
                        )}
                    </div>
                    {derived.showEmailOtp && (
                        <OtpRow
                            onOtpChange={actions.setEmailOtp}
                            onVerify={actions.verifyEmailOtp}
                            onResend={actions.sendEmailOtp}
                            resendSeconds={derived.emailResendSeconds}
                            sentTo={derived.otpSentTo?.email}
                        />
                    )}
                </Field>
            ) : <div className={styles.field} aria-hidden="true" />}
            </fieldset>
            </>)}

            {/* prototype edit sheet: Primary Language closes the Contact block, after Email (audit D-23); it is a profile field,
                so it follows the Basic Details — Edit grant; required on create only (E-6: not sent = unchanged, audit D-22) */}
            {isDrawer && !hidden.profile && (
                <fieldset className={styles.lockedGroup} disabled={Boolean(locked.profile)}>
                <Field label={translation("key_primary_language")} required={!derived.isEdit} error={errors.primary_language?.message}>
                    <Controller name="primary_language" control={control} render={({ field }) => (
                        <SelectBox field={field} invalid={Boolean(errors.primary_language)} legacy={Boolean(derived.legacyLanguage) && field.value === derived.legacyLanguage.id}>
                            <option value="">{translation("key_please_select")}</option>
                            {derived.legacyLanguage && <option value={derived.legacyLanguage.id} disabled>{derived.legacyLanguage.name}</option>}
                            {languages?.map((language) => <option key={language.id} value={language.id}>{language.name}</option>)}
                        </SelectBox>
                    )} />
                </Field>
                </fieldset>
            )}

            {!hidden.profile && (<>
            <SectionDivider>{translation(isDrawer ? "key_profile_location" : "key_profile")}</SectionDivider>

            <fieldset className={styles.lockedGroup} disabled={Boolean(locked.profile)}>
            {/* U-0039: spoken Primary Language (Cantonese · English · Mandarin); a legacy value is shown exactly as stored, is not
                selectable, and an unrelated Save leaves it unchanged */}
            {(isDrawer === false) && (
                <Field label={translation("key_primary_language")} required error={errors.primary_language?.message}>
                    <Controller name="primary_language" control={control} render={({ field }) => (
                        <SelectBox field={field} invalid={Boolean(errors.primary_language)} legacy={Boolean(derived.legacyLanguage) && field.value === derived.legacyLanguage.id}>
                            <option value="">{translation("key_please_select")}</option>
                            {derived.legacyLanguage && <option value={derived.legacyLanguage.id} disabled>{derived.legacyLanguage.name}</option>}
                            {languages?.map((language) => <option key={language.id} value={language.id}>{language.name}</option>)}
                        </SelectBox>
                    )} />
                </Field>
            )}

            <Field label={translation("key_employer_nationality")} required error={errors.nationality?.message}>
                <Controller name="nationality" control={control} render={({ field }) => (
                    <SelectBox field={field} invalid={Boolean(errors.nationality)}>
                        <option value="">{translation("key_please_select")}</option>
                        {nationalities?.map((nationality) => <option key={nationality.id} value={nationality.id}>{nationality.name}</option>)}
                    </SelectBox>
                )} />
            </Field>

            <Field label={translation("key_location")} required error={errors.location?.message}>
                <Controller name="location" control={control} render={({ field }) => (
                    <SelectBox field={field} invalid={Boolean(errors.location)}>
                        <option value="">{translation("key_please_select")}</option>
                        {locations?.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                    </SelectBox>
                )} />
            </Field>

            <Field label={translation("key_district")} required={!derived.districtNotApplicable} error={errors.district?.message}>
                <Controller name="district" control={control} render={({ field }) => (
                    <div className={`${styles.selectWrap} ${derived.districtNotApplicable ? styles.readonly : ""} ${errors.district ? styles.invalid : ""}`}>
                        <select {...field} value={field.value ?? ""} className={styles.select} disabled={derived.districtNotApplicable}>
                            <option value="">{derived.districtNotApplicable ? "—" : translation("key_please_select")}</option>
                            {districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
                        </select>
                        {!derived.districtNotApplicable && <Icon name="chev_down" size={10} className={styles.selectChevron} />}
                    </div>
                )} />
            </Field>

            <Field label={translation("key_branch")} required error={errors.branch_id?.message}>
                <Controller name="branch_id" control={control} render={({ field }) => (
                    <SelectBox field={field} invalid={Boolean(errors.branch_id)}>
                        <option value="">{translation("key_please_select")}</option>
                        {branches?.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
                    </SelectBox>
                )} />
            </Field>
            {/* U-0036 / backend 332: no CS field — an employer has no owner; the first Job Offer's owner follows PERM's JO rules */}
            </fieldset>
            </>)}
        </div>
    );
};

NewEmployerForm.propTypes = {
    variant: PropTypes.oneOf(["modal", "drawer"]),
    control: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired,
    lookups: PropTypes.shape({
        countries: PropTypes.array,
        locations: PropTypes.array,
        languages: PropTypes.array,
        nationalities: PropTypes.array,
        branches: PropTypes.array,
        districts: PropTypes.array,
    }).isRequired,
    derived: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired,
    /* drawer only: blocks the actor may not edit (PERM §9.2 / §9.4) */
    locked: PropTypes.shape({ identity: PropTypes.bool, contact: PropTypes.bool, profile: PropTypes.bool }),
    /* drawer only: blocks the actor may not view (U-0346) — not rendered */
    hidden: PropTypes.shape({ identity: PropTypes.bool, contact: PropTypes.bool, profile: PropTypes.bool }),
};

export default React.memo(NewEmployerForm);
