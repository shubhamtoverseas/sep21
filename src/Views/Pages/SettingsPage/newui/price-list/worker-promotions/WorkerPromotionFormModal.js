import React, { useMemo } from "react";
import PropTypes from "prop-types";
import { Controller } from "react-hook-form";
import dayjs from "dayjs";
import Btn from "../../../../../../components/ui/Btn";
import Modal from "../../../../../../components/ui/Modal";
import DateInput from "../../../../../../components/ui/DateInput";
import Icon from "../../../../../../components/Icon/Icon";
import { Checkbox, Field, FormGrid, RadioGroup, SelectBox, TextArea, TextInput } from "../../../../../../components/ui/FormControls";
import translation from "../../../../../../utils/translation";
import shared from "../../settings-newui.module.css";
import styles from "../PriceList.module.css";
import useWorkerPromotionForm from "./useWorkerPromotionForm";
import { INTERVIEW_MODE_OPTIONS, PROMOTION_API_DATE_FORMAT } from "../../settingsNewUiConstants";
import { headingCase } from "../../../../../../utils/utils";

const FORM_ID = "worker-promotion-form";

const toDateValue = (value) => (value ? dayjs(value).format(PROMOTION_API_DATE_FORMAT) : "");

/** Ports AddWorkerPromotionForm.js (side panel) as a new-UI modal. */
const WorkerPromotionFormModal = ({ currentWorkerPromotion, onClose }) => {
    const promo = useWorkerPromotionForm({ currentWorkerPromotion, onClose });
    const { control, handleSubmit, formState: { errors } } = promo.form;
    const interviewModeOptions = useMemo(
        () => INTERVIEW_MODE_OPTIONS.map((option) => ({ value: option.value, label: translation(option.labelKey) })),
        []
    );
    const title = `${headingCase(translation(promo.isEdit ? "key_edit" : "key_add"))} ${headingCase(translation("key_worker_promotions"))}`;

    return (
        <Modal
            title={title}
            width={640}
            onClose={onClose}
            closeLabel={translation("key_close")}
            footer={(
                <>
                    <Btn variant="secondary" type="button" onClick={onClose} disabled={promo.isSaving}>{translation("key_cancel")}</Btn>
                    <Btn variant="primary" type="submit" form={FORM_ID} disabled={promo.isSaving}>
                        {promo.isSaving ? translation("key_saving") : translation(promo.isEdit ? "key_update" : "key_save")}
                    </Btn>
                </>
            )}
        >
            {/* Legacy form relies on native `required` on the item inputs — no noValidate here */}
            <form id={FORM_ID} onSubmit={handleSubmit(promo.onSubmit)}>
                <FormGrid columns={2}>
                    <Field label={translation("key_agency")} htmlFor="wp-agency" required error={errors.agency_id?.message} full>
                        <Controller name="agency_id" control={control} render={({ field }) => (
                            <SelectBox {...field} id="wp-agency" invalid={Boolean(errors.agency_id)}>
                                <option value="">{translation("key_select_agency")}</option>
                                {promo.activeAgencies.map((agency) => (
                                    <option key={agency.id} value={agency.id}>{agency.agency_name}</option>
                                ))}
                            </SelectBox>
                        )} />
                    </Field>

                    <Field label={translation("key_interview_mode")} required error={errors.interview_mode?.message} full>
                        <Controller name="interview_mode" control={control} render={({ field }) => (
                            <RadioGroup name="interview_mode" value={field.value} options={interviewModeOptions} onChange={field.onChange} ariaLabel={translation("key_interview_mode")} />
                        )} />
                    </Field>

                    <Field label={translation("key_start_date")} htmlFor="wp-start" required error={errors.start_date?.message}>
                        <Controller name="start_date" control={control} render={({ field }) => (
                            <DateInput id="wp-start" value={toDateValue(field.value)} onChange={(value) => field.onChange(value || null)} onBlur={field.onBlur} placeholder={translation("key_start_date")} invalid={Boolean(errors.start_date)} />
                        )} />
                    </Field>

                    <Field label={translation("key_end_date")} htmlFor="wp-end" error={errors.end_date?.message}>
                        <Controller name="end_date" control={control} render={({ field }) => (
                            <DateInput id="wp-end" value={toDateValue(field.value)} onChange={(value) => field.onChange(value || null)} onBlur={field.onBlur} placeholder={translation("key_end_date")} disabled={promo.isInfinite} min={toDateValue(promo.startDate) || undefined} invalid={Boolean(errors.end_date)} />
                        )} />
                        <div className={styles.indefiniteRow}>
                            <Checkbox label={translation("key_indefinite")} checked={promo.isInfinite} onChange={(event) => promo.setIsInfinite(event.target.checked)} />
                        </div>
                    </Field>

                    <h3 className={styles.itemsHeading}>
                        {translation(promo.isEdit ? "key_edit_worker_promotion_items" : "key_add_worker_promotion_items")}
                    </h3>

                    {promo.items.map((item, index) => (
                        <div key={item.id} className={styles.itemCard}>
                            <Field label={translation("key_item")} htmlFor={`wp-item-${index}`} required>
                                <div className={styles.itemTitleRow}>
                                    <TextInput
                                        id={`wp-item-${index}`}
                                        type="text"
                                        placeholder={translation("key_item_name")}
                                        value={item.title}
                                        onChange={(event) => promo.handleItemChange(item.id, "title", event.target.value)}
                                        required
                                    />
                                    {promo.items.length > 1 && (
                                        <button
                                            type="button"
                                            className={`${shared.rowIconBtn} ${shared.rowIconDanger}`}
                                            onClick={() => promo.removeItem(item.id)}
                                            aria-label={translation("key_delete_icon")}
                                            title={translation("key_delete")}
                                        >
                                            <Icon name="trash" size={14} />
                                        </button>
                                    )}
                                </div>
                            </Field>
                            <Field label={translation("key_description_of_item")} htmlFor={`wp-item-desc-${index}`} required>
                                <TextArea
                                    id={`wp-item-desc-${index}`}
                                    placeholder={translation("key_description")}
                                    value={item.description}
                                    onChange={(event) => promo.handleItemChange(item.id, "description", event.target.value)}
                                    required
                                />
                            </Field>
                        </div>
                    ))}

                    {promo.itemsError && <div className={styles.formError} role="alert">{promo.itemsError}</div>}

                    <Btn variant="secondary" type="button" className={styles.addItemBtn} onClick={promo.addItem}>
                        <Icon name="plus" size={14} /> {translation("key_add_another_item")}
                    </Btn>
                </FormGrid>
            </form>
        </Modal>
    );
};

WorkerPromotionFormModal.propTypes = {
    currentWorkerPromotion: PropTypes.object,
    onClose: PropTypes.func.isRequired,
};

export default WorkerPromotionFormModal;
