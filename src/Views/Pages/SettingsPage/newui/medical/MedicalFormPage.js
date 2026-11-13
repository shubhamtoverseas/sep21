import React from "react";
import { Link } from "react-router-dom";
import { Controller } from "react-hook-form";
import Btn from "../../../../../components/ui/Btn";
import Icon from "../../../../../components/Icon/Icon";
import { Field, FormGrid, SelectBox, TextInput } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import useMedicalForm from "./useMedicalForm";

const MedicalFormPage = () => {
    const clinic = useMedicalForm();
    const { control, handleSubmit, formState: { errors } } = clinic.form;
    const title = `${headingCase(translation(clinic.isEdit ? "key_edit" : "key_add"))} ${headingCase(translation("key_medical_clinic"))}`;
    const nameLabel = `${translation("key_medical_clinic")} ${translation("key_name")}`;

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.medicalList)}>{headingCase(translation("key_medical_list"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{title}</span>
            </nav>

            <form className={shared.card} onSubmit={handleSubmit(clinic.onSubmit)} noValidate>
                <div className={shared.cardHead}>
                    <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{title}</h1>
                </div>

                {clinic.isLoading ? (
                    <div className={shared.loadingState}>{translation("key_loading")}…</div>
                ) : (
                    <>
                        <FormGrid columns={3}>
                            <Field label={nameLabel} htmlFor="clinic-name" required error={errors.clinic_name?.message}>
                                <Controller name="clinic_name" control={control} render={({ field }) => (
                                    <TextInput {...field} id="clinic-name" type="text" placeholder={translation("key_enter_clinic_name")} invalid={Boolean(errors.clinic_name)} />
                                )} />
                            </Field>

                            <Field label={translation("key_host_agency_name")} htmlFor="clinic-agency" required error={errors.agency_id?.message}>
                                <Controller name="agency_id" control={control} render={({ field }) => (
                                    <SelectBox {...field} id="clinic-agency" invalid={Boolean(errors.agency_id)}>
                                        <option value="">{translation("key_please_select")}</option>
                                        {clinic.agencies.map((agency) => <option key={agency.id} value={agency.id}>{agency.agency_name}</option>)}
                                    </SelectBox>
                                )} />
                            </Field>

                            <Field label={translation("key_country")} htmlFor="clinic-country" required error={errors.country_id?.message}>
                                <Controller name="country_id" control={control} render={({ field }) => (
                                    <SelectBox {...field} id="clinic-country" invalid={Boolean(errors.country_id)}>
                                        <option value="">{translation("key_please_select")}</option>
                                        {clinic.countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
                                    </SelectBox>
                                )} />
                            </Field>

                            <Field label={translation("key_map_link")} htmlFor="clinic-map" error={errors.clinic_map_link?.message}>
                                <Controller name="clinic_map_link" control={control} render={({ field }) => (
                                    <TextInput {...field} id="clinic-map" type="text" placeholder={translation("key_enter_map_link")} invalid={Boolean(errors.clinic_map_link)} />
                                )} />
                            </Field>

                            <Field label={translation("key_address")} htmlFor="clinic-address" error={errors.clinic_address?.message}>
                                <Controller name="clinic_address" control={control} render={({ field }) => (
                                    <TextInput {...field} id="clinic-address" type="text" placeholder={translation("key_enter_address")} invalid={Boolean(errors.clinic_address)} />
                                )} />
                            </Field>

                            <Field label={translation("key_email_address")} htmlFor="clinic-email" required error={errors.clinic_email?.message}>
                                <Controller name="clinic_email" control={control} render={({ field }) => (
                                    <TextInput {...field} id="clinic-email" type="email" placeholder={translation("key_enter_email")} invalid={Boolean(errors.clinic_email)} />
                                )} />
                            </Field>
                        </FormGrid>

                        <div className={shared.formFoot}>
                            <Btn variant="secondary" type="button" onClick={clinic.onCancel} disabled={clinic.isSaving}>
                                {translation("key_cancel")}
                            </Btn>
                            <span className={shared.formFootSpacer} />
                            <Btn variant="primary" type="submit" disabled={clinic.isSaving}>
                                {clinic.isSaving ? translation("key_saving") : translation("key_save")}
                            </Btn>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
};

export default MedicalFormPage;
