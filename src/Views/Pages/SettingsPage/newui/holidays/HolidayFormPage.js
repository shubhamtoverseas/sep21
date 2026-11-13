import React, { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Controller } from "react-hook-form";
import Btn from "../../../../../components/ui/Btn";
import DateInput from "../../../../../components/ui/DateInput";
import Icon from "../../../../../components/Icon/Icon";
import { Field, FormGrid, TextInput } from "../../../../../components/ui/FormControls";
import translation from "../../../../../utils/translation";
import { absoluteRoute, headingCase } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import listStyles from "../../../Invoice/InvoiceList.module.css";
import shared from "../settings-newui.module.css";
import styles from "./Holiday.module.css";
import useHolidayForm from "./useHolidayForm";

const SmartFillDialog = lazy(() => import("./SmartFillDialog"));

const HolidayFormPage = () => {
    const holiday = useHolidayForm();
    const { control, register, handleSubmit, formState: { errors } } = holiday.form;
    const title = headingCase(translation(holiday.isEdit ? "key_edit_holiday_list" : "key_add_holiday_list"));

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.holidays)}>{headingCase(translation("key_holidays"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{title}</span>
            </nav>

            <form className={shared.card} onSubmit={handleSubmit(holiday.onSubmit)} noValidate>
                <div className={`${shared.cardHead} ${styles.cardHead}`}>
                    <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{title}</h1>
                    <Btn variant="secondary" type="button" onClick={holiday.openSmartFill} disabled={holiday.isLoading}>
                        <Icon name="stamp" size={14} /> {translation("key_smart_fill")}
                    </Btn>
                </div>

                {holiday.isLoading ? (
                    <div className={shared.loadingState}>{translation("key_loading")}…</div>
                ) : (
                    <>
                        <FormGrid columns={3}>
                            <Field label={translation("key_list_name")} htmlFor="holiday-list-name" required error={errors.list_name?.message}>
                                <TextInput id="holiday-list-name" type="text" invalid={Boolean(errors.list_name)} {...register("list_name")} />
                            </Field>
                        </FormGrid>

                        <section className={styles.section}>
                            <div className={styles.sectionHead}>
                                <h2 className={shared.sectionEyebrow}>{headingCase(translation("key_holidays"))}</h2>
                                <Btn variant="secondary" type="button" onClick={holiday.addRow}>
                                    <Icon name="plus" size={14} /> {translation("key_add")}
                                </Btn>
                            </div>

                            <div className={styles.rows}>
                                <div className={`${styles.row} ${styles.rowHead}`}>
                                    <span>{translation("key_holiday_name")}</span>
                                    <span>{translation("key_date")}</span>
                                    <span />
                                </div>
                                {holiday.rows.map((row, index) => {
                                    const rowErrors = errors.holidays_data?.[index] || {};
                                    return (
                                        <div key={row.id} className={styles.row}>
                                            <Field error={rowErrors.holiday_name?.message}>
                                                <TextInput
                                                    type="text"
                                                    aria-label={translation("key_holiday_name")}
                                                    invalid={Boolean(rowErrors.holiday_name)}
                                                    {...register(`holidays_data[${index}].holiday_name`)}
                                                />
                                            </Field>
                                            <Field error={rowErrors.holiday_date?.message}>
                                                <Controller name={`holidays_data[${index}].holiday_date`} control={control} render={({ field }) => (
                                                    <DateInput
                                                        id={`holiday-${index}-date`}
                                                        value={field.value ? String(field.value) : ""}
                                                        onChange={field.onChange}
                                                        onBlur={field.onBlur}
                                                        placeholder={translation("key_date_of_holiday")}
                                                        invalid={Boolean(rowErrors.holiday_date)}
                                                    />
                                                )} />
                                            </Field>
                                            <div className={styles.rowAction}>
                                                {(holiday.rows.length > 1 || index > 0) && (
                                                    <button type="button" className={shared.rowIconBtn} onClick={() => holiday.removeRow(index)} aria-label={translation("key_remove")} title={translation("key_remove")}>
                                                        <Icon name="trash" size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <div className={shared.formFoot}>
                            <Btn variant="secondary" type="button" onClick={holiday.onCancel} disabled={holiday.isSaving}>
                                {translation("key_cancel")}
                            </Btn>
                            <span className={shared.formFootSpacer} />
                            <Btn variant="primary" type="submit" disabled={holiday.isSaving}>
                                {holiday.isSaving ? translation("key_saving") : translation("key_save")}
                            </Btn>
                        </div>
                    </>
                )}
            </form>

            <Suspense fallback={null}>
                {holiday.isSmartFillOpen && <SmartFillDialog onClose={holiday.closeSmartFill} onHolidaysSelected={holiday.applySmartFill} />}
            </Suspense>
        </div>
    );
};

export default HolidayFormPage;
