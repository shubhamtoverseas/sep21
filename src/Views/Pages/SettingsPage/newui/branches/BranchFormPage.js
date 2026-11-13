import React from "react";
import { Link } from "react-router-dom";
import { Controller } from "react-hook-form";
import Btn from "../../../../../components/ui/Btn";
import Icon from "../../../../../components/Icon/Icon";
import { Field, SelectBox, Switch } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import { headingCase, toTitleCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import styles from "../agencies/AgencyForm.module.css";
import useBranchForm from "./useBranchForm";
import BranchFields from "./BranchFields";

const BranchFormPage = () => {
    const branchForm = useBranchForm();
    const { control, handleSubmit, setValue, clearErrors, formState: { errors } } = branchForm.form;
    const titleKey = branchForm.isEdit ? "key_edit_branch" : "key_add_branch";
    const hasAgency = Boolean(branchForm.selectedAgency);
    const provinceRequired = hasAgency && !branchForm.isPartner && !branchForm.isMacau;

    const agencyField = (
        <Field label={translation("key_select_agency")} htmlFor="branch-agency_id" required error={errors.agency_id?.message}>
            <Controller name="agency_id" control={control} render={({ field }) => (
                <SelectBox
                    {...field}
                    id="branch-agency_id"
                    invalid={Boolean(errors.agency_id)}
                    onChange={(event) => { field.onChange(event); branchForm.handleAgencyChange(event); }}
                >
                    <option value="">{translation("key_select_an_agency")}</option>
                    {branchForm.agencies.map((agency) => (
                        <option key={agency.id} value={agency.id}>{agency.agency_name}</option>
                    ))}
                </SelectBox>
            )} />
        </Field>
    );

    const statusRow = (
        <div className={styles.statusRow}>
            <Switch
                id="branch-status"
                label={translation("key_active")}
                checked={branchForm.branchStatus}
                onChange={branchForm.toggleStatus}
            />
        </div>
    );

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={`/${routes.branches}`}>{toTitleCase(translation("key_branches"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{headingCase(translation(titleKey))}</span>
            </nav>

            <form className={shared.card} onSubmit={handleSubmit(branchForm.onSubmit)} noValidate>
                <div className={shared.cardHead}>
                    <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{headingCase(translation(titleKey))}</h1>
                </div>

                {branchForm.isLoading ? (
                    <div className={shared.loadingState}>{translation("key_loading")}…</div>
                ) : (
                    <>
                        <BranchFields
                            control={control}
                            errors={errors}
                            idPrefix="branch"
                            countries={branchForm.countries}
                            districtOptions={branchForm.districts}
                            timezoneOptions={branchForm.timezoneOptions}
                            countryRequired
                            provinceRequired={provinceRequired}
                            countryDisabled={!hasAgency}
                            provinceDisabled={branchForm.isPartner || !branchForm.selectedCountry?.country_code || branchForm.isMacau}
                            onCountryChange={branchForm.handleCountryChange}
                            leading={agencyField}
                            beforeHours={statusRow}
                            setValue={setValue}
                            clearErrors={clearErrors}
                        />

                        <div className={styles.footer}>
                            <Btn variant="primary" type="submit" disabled={branchForm.isSaving}>
                                {branchForm.isSaving ? translation("key_saving") : translation("key_done")}
                            </Btn>
                            <Btn variant="secondary" type="button" onClick={branchForm.onCancel} disabled={branchForm.isSaving}>
                                {translation("key_cancel")}
                            </Btn>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
};

export default BranchFormPage;
