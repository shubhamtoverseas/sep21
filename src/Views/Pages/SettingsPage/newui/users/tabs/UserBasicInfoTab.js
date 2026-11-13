import React, { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Controller, useFormContext } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import Icon from "../../../../../../components/Icon/Icon";
import DateInput from "../../../../../../components/ui/DateInput";
import { Checkbox, Field, FormGrid, SelectBox, Switch, TextInput } from "../../../../../../components/ui/FormControls";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { fetchRoles } from "../../../../../../redux/Slices/settings/roles/RolesSlice";
import { fetchCountries } from "../../../../../../redux/Slices/common/countries/CountriesSlice";
import { clearUsersLoading, setUsersLoading } from "../../../../../../redux/Slices/settings/users/UsersSlice";
import { handleMobileInput, uploadFile } from "../../../../../../services/commonService";
import translation from "../../../../../../utils/translation";
import shared from "../../settings-newui.module.css";
import styles from "../UserForm.module.css";
import { headingCase } from "../../../../../../utils/utils";
import {
    ACTIVE_ROLES_QUERY,
    BANK_BRANCH_CODE_MAX_LENGTH,
    BYTES_PER_MB,
    COUNTRY_LOOKUP_TYPE,
    USER_DOCUMENT_ACCEPT,
    USER_DOCUMENT_TYPE,
} from "../../settingsNewUiConstants";

const fileInfoFromUrl = (url) => (typeof url === "string" && url ? { name: url.split("/").pop(), size: "", url } : null);

const DocumentField = ({ label, file, onUpload, onClear }) => (
    <div className={styles.docField}>
        <Field label={label}>
            {file ? (
                <span className={styles.fileChip}>
                    <Icon name="filetext" size={14} className={styles.fileChipIcon} />
                    <span className={styles.fileChipName} title={file.name}>{file.name}</span>
                    {file.size && <span className={styles.fileChipSize}>{file.size} MB</span>}
                    <button type="button" className={styles.fileChipRemove} onClick={onClear} aria-label={translation("key_remove")}>
                        <Icon name="x" size={12} />
                    </button>
                </span>
            ) : (
                <label className={styles.uploadBtn}>
                    <Icon name="upload" size={13} />
                    {translation("key_upload_hkid")}
                    <input type="file" className={styles.uploadInput} accept={USER_DOCUMENT_ACCEPT} onChange={onUpload} />
                </label>
            )}
        </Field>
    </div>
);

DocumentField.propTypes = {
    label: PropTypes.string.isRequired,
    file: PropTypes.shape({ name: PropTypes.string, size: PropTypes.oneOfType([PropTypes.string, PropTypes.number]), url: PropTypes.string }),
    onUpload: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
};

const UserBasicInfoTab = ({ isEdit, currentUser, userStatus, onToggleStatus, loadOnce }) => {
    const dispatch = useDispatch();
    const { register, control, setValue, formState: { errors } } = useFormContext();
    const { roles } = useSelector((state) => state.roles);
    const [countries, setCountries] = useState([]);
    const [bankCopy, setBankCopy] = useState(null);
    const [employmentContract, setEmploymentContract] = useState(null);

    useEffect(() => {
        loadOnce("roles:active", () => dispatch(fetchRoles(ACTIVE_ROLES_QUERY)));
        loadOnce("countries:worker_only", () => dispatch(fetchCountries({ type: COUNTRY_LOOKUP_TYPE.WORKER_ONLY }))).then((res) => {
            if (!res?.error) setCountries(Array.isArray(res.payload) ? res.payload : []);
        });
    }, [dispatch, loadOnce]);

    useEffect(() => {
        if (!currentUser) return;
        setBankCopy(fileInfoFromUrl(currentUser.bank_hkid_copy));
        setEmploymentContract(fileInfoFromUrl(currentUser.bank_employment_contract));
    }, [currentUser]);

    const roleOptions = useMemo(() => (roles && typeof roles === "object" ? Object.values(roles) : []), [roles]);

    const handleUpload = useCallback(async (event, type) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            dispatch(setUsersLoading());
            const uploaded = await uploadFile([{ file, name: type }]);
            dispatch(clearUsersLoading());
            const info = { name: file.name, size: (file.size / BYTES_PER_MB).toFixed(2), url: uploaded?.url };
            if (type === USER_DOCUMENT_TYPE.BANK_COPY) {
                setBankCopy(info);
                setValue("bank_hkid_copy", uploaded?.url);
            } else {
                setEmploymentContract(info);
                setValue("bank_employment_contract", uploaded?.url);
            }
        } catch (error) {
            dispatch(clearUsersLoading());
            ShowToast("error", error?.message || translation("key_something_went_wrong"));
        }
    }, [dispatch, setValue]);

    const clearBankCopy = useCallback(() => { setBankCopy(null); setValue("bank_hkid_copy", ""); }, [setValue]);
    const clearContract = useCallback(() => { setEmploymentContract(null); setValue("bank_employment_contract", ""); }, [setValue]);

    const phoneField = (name, labelKey, placeholderKey) => (
        <Field label={translation(labelKey)} htmlFor={`user-${name}`} error={errors[name]?.message}>
            <TextInput
                id={`user-${name}`}
                type="text"
                inputMode="numeric"
                placeholder={translation(placeholderKey)}
                invalid={Boolean(errors[name])}
                {...register(name, { onChange: handleMobileInput })}
            />
        </Field>
    );

    const textField = (name, labelKey, placeholderKey, extra = {}) => (
        <Field label={translation(labelKey)} htmlFor={`user-${name}`} required={extra.required} error={errors[name]?.message}>
            <TextInput
                id={`user-${name}`}
                type={extra.type || "text"}
                maxLength={extra.maxLength}
                placeholder={translation(placeholderKey)}
                invalid={Boolean(errors[name])}
                {...register(name)}
            />
        </Field>
    );

    return (
        <>
            <div className={styles.statusRow}>
                <Switch id="user-status" label={translation("key_active")} checked={userStatus} onChange={onToggleStatus} disabled={!isEdit} />
            </div>

            <section className={styles.section}>
                <h2 className={shared.sectionEyebrow}>{headingCase(translation("key_primary_details"))}</h2>
                <FormGrid columns={4}>
                    {textField("first_name", "key_first_name", "key_enter_first_name", { required: true })}
                    {textField("last_name", "key_last_name", "key_enter_last_name", { required: true })}
                    {textField("email", "key_company_email_id", "key_enter_company_email_id", { required: true, type: "email" })}
                    {phoneField("phone", "key_company_phone_number", "key_enter_company_phone_number")}

                    <Field label={translation("key_date_of_joining")} htmlFor="user-date_of_joining" required error={errors.date_of_joining?.message}>
                        <Controller name="date_of_joining" control={control} render={({ field }) => (
                            <DateInput
                                id="user-date_of_joining"
                                value={field.value ? String(field.value) : ""}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                invalid={Boolean(errors.date_of_joining)}
                            />
                        )} />
                    </Field>

                    <Field label={translation("key_role")} htmlFor="user-role_id" required error={errors.role_id?.message}>
                        <SelectBox id="user-role_id" invalid={Boolean(errors.role_id)} {...register("role_id")}>
                            <option value="">{translation("key_select_role")}</option>
                            {roleOptions.length > 0
                                ? roleOptions.map((role) => <option key={role.id} value={role.id}>{role.role_name}</option>)
                                : <option disabled>{translation("key_no_roles_available")}</option>}
                        </SelectBox>
                    </Field>
                </FormGrid>
            </section>

            <section className={styles.section}>
                <h2 className={shared.sectionEyebrow}>{headingCase(translation("key_personal_details"))}</h2>
                <FormGrid columns={4}>
                    <Field label={translation("key_whatsapp")} htmlFor="user-whatsapp" required error={errors.whatsapp_country_code_name?.message || errors.whatsapp?.message}>
                        <div className={styles.phoneRow}>
                            <SelectBox aria-label={translation("key_country_code")} invalid={Boolean(errors.whatsapp_country_code_name)} {...register("whatsapp_country_code_name")}>
                                <option value="">{translation("key_please_select")}</option>
                                {countries.map((country) => (
                                    <option key={country.id ?? country.country_code} value={country.country_code}>{country.name}</option>
                                ))}
                            </SelectBox>
                            <TextInput
                                id="user-whatsapp"
                                type="text"
                                inputMode="numeric"
                                placeholder={translation("key_enter_whatsapp_number")}
                                invalid={Boolean(errors.whatsapp)}
                                {...register("whatsapp", { onChange: handleMobileInput })}
                            />
                        </div>
                    </Field>
                    {phoneField("telephone", "key_telephone", "key_enter_telephone_number")}
                    {textField("personal_email", "key_personal_email_id", "key_enter_personal_email_id", { type: "email" })}
                    {textField("skype", "key_skype_link", "key_enter_skype_link", { type: "url" })}
                    {textField("facebook", "key_facebook_link", "key_enter_facebook_link", { type: "url" })}
                    {textField("airtable", "key_airtable_link", "key_enter_airtable_link", { type: "url" })}
                    {textField("bank_name", "key_bank_name", "key_enter_bank_name")}
                    {textField("bank_account_number", "key_bank_account_number", "key_enter_bank_account_number")}
                    {textField("bank_account_name", "key_bank_account_name", "key_enter_bank_account_name")}
                    {textField("bank_branch_code", "key_bank_branch_code", "key_enter_bank_branch_code", { maxLength: BANK_BRANCH_CODE_MAX_LENGTH })}
                </FormGrid>
            </section>

            <section className={styles.section}>
                <h2 className={shared.sectionEyebrow}>{headingCase(translation("key_documents"))}</h2>
                <div className={styles.docsRow}>
                    <DocumentField
                        label={translation("key_bank_copy")}
                        file={bankCopy}
                        onUpload={(event) => handleUpload(event, USER_DOCUMENT_TYPE.BANK_COPY)}
                        onClear={clearBankCopy}
                    />
                    <DocumentField
                        label={translation("key_employment_contract_copy")}
                        file={employmentContract}
                        onUpload={(event) => handleUpload(event, USER_DOCUMENT_TYPE.EMPLOYMENT_CONTRACT)}
                        onClear={clearContract}
                    />
                </div>
                {!isEdit && (
                    <div className={styles.section}>
                        <Checkbox label={translation("key_send_login_details_to_user")} />
                    </div>
                )}
            </section>
        </>
    );
};

UserBasicInfoTab.propTypes = {
    isEdit: PropTypes.bool,
    currentUser: PropTypes.object,
    userStatus: PropTypes.bool,
    onToggleStatus: PropTypes.func.isRequired,
    loadOnce: PropTypes.func.isRequired,
};

export default React.memo(UserBasicInfoTab);
