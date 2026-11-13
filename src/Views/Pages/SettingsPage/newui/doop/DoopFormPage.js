import React from "react";
import { Link } from "react-router-dom";
import { Controller } from "react-hook-form";
import Btn from "../../../../../components/ui/Btn";
import Icon from "../../../../../components/Icon/Icon";
import { Checkbox, Field, FormGrid, Switch, TextInput } from "../../../../../components/ui/FormControls";
import configData from "../../../../../components/ReusableComponents/app-configs";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase, toTitleCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import styles from "./Doop.module.css";
import useDoopForm from "./useDoopForm";

const DoopFormPage = () => {
    const doop = useDoopForm();
    const { control, handleSubmit, formState: { errors } } = doop.form;
    const title = toTitleCase(translation(doop.isEdit ? "key_edit_days_of_operation" : "key_add_days_of_operation"));

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.daysOfOperation)}>{toTitleCase(translation("key_days_of_operation"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{title}</span>
            </nav>

            <form className={shared.card} onSubmit={handleSubmit(doop.onSubmit)} noValidate>
                <div className={shared.cardHead}>
                    <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{title}</h1>
                </div>

                {doop.isLoading ? (
                    <div className={shared.loadingState}>{translation("key_loading")}…</div>
                ) : (
                    <>
                        <div className={styles.masterRow}>
                            <FormGrid columns={3} className={styles.masterGrid}>
                                <Field label={translation("key_doop_name")} htmlFor="doop-name" required error={errors.doop_name?.message}>
                                    <Controller name="doop_name" control={control} render={({ field }) => (
                                        <TextInput {...field} id="doop-name" type="text" invalid={Boolean(errors.doop_name)} />
                                    )} />
                                </Field>
                            </FormGrid>
                            <div className={styles.statusRow}>
                                <Switch id="doop-status" label={translation("key_active")} checked={doop.doopStatus} onChange={doop.toggleStatus} />
                            </div>
                        </div>

                        <section className={styles.section}>
                            <h2 className={shared.sectionEyebrow}>{headingCase(translation("key_operation_days"))}</h2>
                            <Controller name="work_days" control={control} render={({ field }) => {
                                const selected = Array.isArray(field.value) ? field.value : [];
                                return (
                                    <div className={styles.daysGrid} role="group" aria-label={translation("key_operation_days")}>
                                        {configData.daysOfWeek.map((day, index) => {
                                            const dayNumber = index + 1;
                                            const isOn = selected.includes(dayNumber);
                                            return (
                                                <label key={day} className={`${styles.dayCard} ${isOn ? styles.dayCardOn : ""}`}>
                                                    <span className={styles.dayName}>{translation(`key_${day}`)}</span>
                                                    <Checkbox
                                                        aria-label={translation(`key_${day}`)}
                                                        checked={isOn}
                                                        onChange={() => field.onChange(isOn ? selected.filter((value) => value !== dayNumber) : [...selected, dayNumber])}
                                                    />
                                                </label>
                                            );
                                        })}
                                    </div>
                                );
                            }} />
                            {errors.work_days?.message && <div className={styles.daysError} role="alert">{errors.work_days.message}</div>}
                        </section>

                        <div className={shared.formFoot}>
                            <Btn variant="secondary" type="button" onClick={doop.onCancel} disabled={doop.isSaving}>
                                {translation("key_cancel")}
                            </Btn>
                            <span className={shared.formFootSpacer} />
                            <Btn variant="primary" type="submit" disabled={doop.isSaving}>
                                {doop.isSaving ? translation("key_saving") : translation("key_save")}
                            </Btn>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
};

export default DoopFormPage;
