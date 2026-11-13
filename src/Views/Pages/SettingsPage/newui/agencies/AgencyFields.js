import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Controller } from "react-hook-form";
import { Field, FormGrid, RadioGroup, SelectBox, TextInput } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import { handleMobileInput } from "../../../../../services/commonService";
import styles from "./AgencyForm.module.css";
import {
    AGENCY_CATEGORY,
    AGENCY_CATEGORY_OPTIONS,
    AGENCY_CODE_MAX_LENGTH,
    AGENCY_TYPE_OPTIONS,
    NON_ALPHANUMERIC_REGEX,
    NON_LETTER_REGEX,
    POC_NAME_MAX_LENGTH,
} from "../settingsNewUiConstants";

const toOptions = (items) => items.map((item) => ({ value: item.value, label: translation(item.key) }));

const AgencyFields = ({ control, errors, countries, isEdit, agencyCategory }) => {
    const typeOptions = useMemo(() => toOptions(AGENCY_TYPE_OPTIONS), []);
    const categoryOptions = useMemo(() => toOptions(AGENCY_CATEGORY_OPTIONS), []);
    const licenceLabel = `${translation("key_agency")} ${translation("key_licence")} ${translation("key_number")}`;

    return (
        <FormGrid columns={3}>
            <Field label={translation("key_agency_name")} htmlFor="agency_name" required error={errors.agency_name?.message}>
                <Controller name="agency_name" control={control} render={({ field }) => (
                    <TextInput {...field} id="agency_name" type="text" invalid={Boolean(errors.agency_name)} />
                )} />
            </Field>

            <Field label={translation("key_agency_code")} htmlFor="agency_code" required error={errors.agency_code?.message}>
                <Controller name="agency_code" control={control} render={({ field }) => (
                    <TextInput
                        {...field}
                        id="agency_code"
                        type="text"
                        maxLength={AGENCY_CODE_MAX_LENGTH}
                        invalid={Boolean(errors.agency_code)}
                        onChange={(event) => field.onChange(event.target.value.replace(NON_ALPHANUMERIC_REGEX, ""))}
                    />
                )} />
            </Field>

            <Field label={translation("key_agency_type")} full error={errors.agency_type?.message}>
                <Controller name="agency_type" control={control} render={({ field }) => (
                    <RadioGroup
                        name="agency_type"
                        value={field.value}
                        options={typeOptions}
                        onChange={field.onChange}
                        ariaLabel={translation("key_agency_type")}
                    />
                )} />
            </Field>

            <Field label={translation("key_agency_category")} full error={errors.agency_category?.message}>
                <Controller name="agency_category" control={control} render={({ field }) => (
                    <RadioGroup
                        name="agency_category"
                        value={field.value}
                        options={categoryOptions}
                        onChange={field.onChange}
                        disabled={isEdit}
                        ariaLabel={translation("key_agency_category")}
                    />
                )} />
            </Field>

            {agencyCategory === AGENCY_CATEGORY.PARTNER && (
                <Field
                    label={translation("key_partner_agency_country")}
                    htmlFor="country_id"
                    required
                    error={errors.country_id?.message}
                    className={styles.singleField}
                >
                    <Controller name="country_id" control={control} render={({ field }) => (
                        <SelectBox {...field} id="country_id" disabled={isEdit} invalid={Boolean(errors.country_id)}>
                            <option value="">{translation("key_select")}</option>
                            {countries.map((country) => (
                                <option key={country.id} value={country.id}>{country.name}</option>
                            ))}
                        </SelectBox>
                    )} />
                </Field>
            )}

            <Field label={translation("key_agency_poc")} htmlFor="agency_poc" required error={errors.agency_poc?.message}>
                <Controller name="agency_poc" control={control} render={({ field }) => (
                    <TextInput
                        {...field}
                        id="agency_poc"
                        type="text"
                        maxLength={POC_NAME_MAX_LENGTH}
                        placeholder={translation("key_enter_agency_name")}
                        invalid={Boolean(errors.agency_poc)}
                        onChange={(event) => field.onChange(event.target.value.replace(NON_LETTER_REGEX, ""))}
                    />
                )} />
            </Field>

            <Field label={translation("key_agency_phone_number")} htmlFor="agency_phone_number" required error={errors.agency_phone_number?.message}>
                <Controller name="agency_phone_number" control={control} render={({ field }) => (
                    <TextInput
                        {...field}
                        id="agency_phone_number"
                        type="text"
                        inputMode="numeric"
                        placeholder={translation("key_enter_phone_number")}
                        invalid={Boolean(errors.agency_phone_number)}
                        onChange={(event) => { handleMobileInput(event); field.onChange(event.target.value); }}
                    />
                )} />
            </Field>

            <Field label={licenceLabel} htmlFor="agency_license" error={errors.agency_license?.message}>
                <Controller name="agency_license" control={control} render={({ field }) => (
                    <TextInput {...field} id="agency_license" type="text" placeholder={licenceLabel} invalid={Boolean(errors.agency_license)} />
                )} />
            </Field>
        </FormGrid>
    );
};

AgencyFields.propTypes = {
    control: PropTypes.object.isRequired,
    errors: PropTypes.object.isRequired,
    countries: PropTypes.array.isRequired,
    isEdit: PropTypes.bool,
    agencyCategory: PropTypes.string,
};

export default React.memo(AgencyFields);
