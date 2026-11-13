import React from "react";
import PropTypes from "prop-types";
import { Controller } from "react-hook-form";
import Select from "react-select";
import { Field, FormGrid, SelectBox, TextInput } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import { handleMobileInput } from "../../../../../services/commonService";
import styles from "../agencies/AgencyForm.module.css";
import BranchHoursGrid from "./BranchHoursGrid";
import {
    AGENCY_CODE_MAX_LENGTH,
    BRANCH_ADDRESS_MAX_LENGTH,
    NON_ALPHANUMERIC_REGEX,
    NON_LETTER_REGEX,
    POC_NAME_MAX_LENGTH,
} from "../settingsNewUiConstants";

const withPrefix = (prefix, key) => (prefix ? `${prefix}.${key}` : key);

/**
 * Branch field set shared by Add Branch and the agency's inline branches.
 * `namePrefix` = "" (flat form) or "branch_data[i]".
 */
const BranchFields = ({
    control,
    errors,
    namePrefix = "",
    idPrefix = "branch",
    countries,
    districtOptions,
    timezoneOptions,
    countryRequired,
    provinceRequired,
    countryDisabled,
    provinceDisabled,
    onCountryChange,
    leading,
    beforeHours,
    setValue,
    clearErrors,
}) => {
    const name = (key) => withPrefix(namePrefix, key);
    const fieldId = (key) => `${idPrefix}-${key}`;

    const textField = (key, { labelKey = `key_${key}`, required = true, maxLength, sanitize, type = "text", inputMode } = {}) => (
        <Field label={translation(labelKey)} htmlFor={fieldId(key)} required={required} error={errors?.[key]?.message}>
            <Controller name={name(key)} control={control} render={({ field }) => (
                <TextInput
                    {...field}
                    id={fieldId(key)}
                    type={type}
                    inputMode={inputMode}
                    maxLength={maxLength}
                    invalid={Boolean(errors?.[key])}
                    onChange={sanitize ? (event) => field.onChange(sanitize(event)) : field.onChange}
                />
            )} />
        </Field>
    );

    return (
        <>
            <FormGrid columns={4}>
                {leading}
                {textField("branch_code", { maxLength: AGENCY_CODE_MAX_LENGTH, sanitize: (event) => event.target.value.replace(NON_ALPHANUMERIC_REGEX, "") })}
                {textField("branch_name")}
                {textField("branch_display_name_en", { labelKey: "key_branch_display_name_english" })}
                {textField("branch_display_name_in", { labelKey: "key_branch_display_name_indonesian" })}
                {textField("branch_display_name_zh_CN", { labelKey: "key_branch_display_name_chinese" })}
                {textField("branch_poc", { maxLength: POC_NAME_MAX_LENGTH, sanitize: (event) => event.target.value.replace(NON_LETTER_REGEX, "") })}
                {textField("branch_phone_number", { inputMode: "numeric", sanitize: (event) => { handleMobileInput(event); return event.target.value; } })}
                {textField("branch_email", { type: "email" })}

                <Field label={translation("key_time_zone")} htmlFor={fieldId("branch_time_zone")} required error={errors?.branch_time_zone?.message} className={styles.span2}>
                    <Controller name={name("branch_time_zone")} control={control} render={({ field }) => {
                        const selected = timezoneOptions.find((option) => String(option.value) === String(field.value ?? "")) || null;
                        return (
                            <Select
                                inputId={fieldId("branch_time_zone")}
                                className={`${styles.reactSelect} ${errors?.branch_time_zone ? styles.reactSelectInvalid : ""}`}
                                classNamePrefix="nuform"
                                options={timezoneOptions}
                                value={selected}
                                onChange={(option) => field.onChange(option ? option.value : "")}
                                onBlur={field.onBlur}
                                placeholder={translation("key_please_select")}
                                noOptionsMessage={() => translation("key_no_results_found")}
                                maxMenuHeight={170}
                                menuPlacement="auto"
                                isClearable
                            />
                        );
                    }} />
                </Field>

                <Field label={translation("key_branch_address")} htmlFor={fieldId("branch_address")} required error={errors?.branch_address?.message} className={styles.span2}>
                    <Controller name={name("branch_address")} control={control} render={({ field }) => (
                        <TextInput {...field} id={fieldId("branch_address")} type="text" maxLength={BRANCH_ADDRESS_MAX_LENGTH} invalid={Boolean(errors?.branch_address)} />
                    )} />
                </Field>

                <Field label={translation("key_select_country")} htmlFor={fieldId("branch_country_code")} required={countryRequired} error={errors?.branch_country_code?.message}>
                    <Controller name={name("branch_country_code")} control={control} render={({ field }) => (
                        <SelectBox
                            {...field}
                            id={fieldId("branch_country_code")}
                            disabled={countryDisabled}
                            invalid={Boolean(errors?.branch_country_code)}
                            onChange={(event) => { field.onChange(event); onCountryChange?.(event); }}
                        >
                            <option value="">{translation("key_select_country")}</option>
                            {countries.map((country) => (
                                <option key={country.id} value={country.id}>{country.name}</option>
                            ))}
                        </SelectBox>
                    )} />
                </Field>

                <Field label={translation("key_district_province_state_emirate")} htmlFor={fieldId("branch_provinces")} required={provinceRequired} error={provinceRequired ? errors?.branch_provinces?.message : null}>
                    <Controller name={name("branch_provinces")} control={control} render={({ field }) => (
                        <SelectBox {...field} id={fieldId("branch_provinces")} disabled={provinceDisabled} invalid={provinceRequired && Boolean(errors?.branch_provinces)}>
                            <option value="">{translation("key_select_province")}</option>
                            {districtOptions.map((district) => (
                                <option key={district.id} value={district.id}>{district.name}</option>
                            ))}
                        </SelectBox>
                    )} />
                </Field>

                <Field label={translation("key_branch_google_map_link")} htmlFor={fieldId("branch_google_map_link")} required error={errors?.branch_google_map_link?.message} className={styles.span2}>
                    <Controller name={name("branch_google_map_link")} control={control} render={({ field }) => (
                        <TextInput {...field} id={fieldId("branch_google_map_link")} type="url" invalid={Boolean(errors?.branch_google_map_link)} />
                    )} />
                </Field>
            </FormGrid>

            {beforeHours}

            <BranchHoursGrid
                control={control}
                namePrefix={namePrefix}
                idPrefix={idPrefix}
                errors={errors}
                setValue={setValue}
                clearErrors={clearErrors}
            />
        </>
    );
};

BranchFields.propTypes = {
    control: PropTypes.object.isRequired,
    errors: PropTypes.object,
    namePrefix: PropTypes.string,
    idPrefix: PropTypes.string,
    countries: PropTypes.array.isRequired,
    districtOptions: PropTypes.array.isRequired,
    timezoneOptions: PropTypes.array.isRequired,
    countryRequired: PropTypes.bool,
    provinceRequired: PropTypes.bool,
    countryDisabled: PropTypes.bool,
    provinceDisabled: PropTypes.bool,
    onCountryChange: PropTypes.func,
    leading: PropTypes.node,
    beforeHours: PropTypes.node,
    setValue: PropTypes.func.isRequired,
    clearErrors: PropTypes.func.isRequired,
};

export default React.memo(BranchFields);
