import React from "react";
import PropTypes from "prop-types";
import { Controller } from "react-hook-form";
import Select from "react-select";
import dayjs from "dayjs";
import Btn from "../../../../../../components/ui/Btn";
import DateInput from "../../../../../../components/ui/DateInput";
import Icon from "../../../../../../components/Icon/Icon";
import TimeInput from "../../../../../../components/ui/TimeInput";
import { Field, FormGrid, SelectBox, TextArea } from "../../../../../../components/ui/FormControls";
import translation from "../../../../../../utils/translation";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import formStyles from "../../users/UserForm.module.css";
import useAddTimeCredit from "./useAddTimeCredit";
import { branchTodayIso } from "../hrmsConfig";
import { headingCase } from "../../../../../../utils/utils";
import {
    PROMOTION_SELECT_MAX_MENU_HEIGHT,
    TIME_CREDIT_HOUR_OPTIONS,
    TIME_CREDIT_MINUTE_OPTIONS,
    TIME_PICKER_INTERVAL_MINUTES,
    TIME_REQUEST_COMMENT_MAX_LENGTH,
} from "../../settingsNewUiConstants";

const API_DATE_FORMAT = "YYYY-MM-DD";

/** Ports AddApproveTimeEntry.js — inline sub-view of the Time Credit tab. */
const AddTimeCreditForm = ({ onBack }) => {
    const credit = useAddTimeCredit({ onBack });
    const { control } = credit.form;

    return (
        <form className={shared.card} onSubmit={credit.handleSubmit(credit.onSubmit)} noValidate>
            <div className={`${shared.cardHead} ${shared.cardHeadRow}`}>
                <h2 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{headingCase(translation("key_add_time_credit"))}</h2>
                <div className={shared.cardHeadActions}>
                    <Btn variant="ghost" type="button" onClick={onBack}><Icon name="chev_left" size={14} /> {translation("key_time_credit")}</Btn>
                </div>
            </div>

            <FormGrid columns={3}>
                <Field label={translation("key_select_employee")} htmlFor="tc-users" required error={credit.usersError || credit.errors.user_id?.message} full>
                    <Controller name="user_id" control={control} render={() => (
                        <Select
                            inputId="tc-users"
                            className={`${formStyles.reactSelect} ${credit.errors.user_id ? formStyles.reactSelectInvalid : ""}`}
                            classNamePrefix="nuform"
                            options={credit.userOptions}
                            value={credit.selectedUsers}
                            onChange={credit.handleUsersChange}
                            isMulti
                            maxMenuHeight={PROMOTION_SELECT_MAX_MENU_HEIGHT}
                            placeholder={translation("key_please_select")}
                            noOptionsMessage={() => translation("key_no_options")}
                        />
                    )} />
                </Field>

                <Field label={translation("key_date")} htmlFor="tc-date" required error={credit.errors.from_date?.message}>
                    {/* backend 355: a future day is refused (403) — the picker stops at the BRANCH's today (U-0438) */}
                    <DateInput id="tc-date" value={credit.dateFilter ? dayjs(credit.dateFilter).format(API_DATE_FORMAT) : ""} max={branchTodayIso()} onChange={credit.handleDateChange} placeholder={translation("key_select_date")} invalid={Boolean(credit.errors.from_date)} />
                </Field>

                <Field label={translation("key_from")} htmlFor="tc-from" required error={credit.errors.from_time?.message}>
                    <Controller name="from_time" control={control} render={({ field }) => (
                        <TimeInput id="tc-from" value={credit.fromTime} onChange={(date) => credit.handleFromTimeChange(date, field.onChange)} onBlur={field.onBlur} intervalMinutes={TIME_PICKER_INTERVAL_MINUTES} timeCaption={translation("key_time")} invalid={Boolean(credit.errors.from_time)} />
                    )} />
                </Field>

                <Field label={translation("key_to")} htmlFor="tc-to" required error={credit.errors.to_time?.message}>
                    <Controller name="to_time" control={control} render={({ field }) => (
                        <TimeInput id="tc-to" value={credit.toTime} onChange={(date) => credit.handleToTimeChange(date, field.onChange)} onBlur={field.onBlur} intervalMinutes={TIME_PICKER_INTERVAL_MINUTES} timeCaption={translation("key_time")} invalid={Boolean(credit.errors.to_time)} />
                    )} />
                </Field>

                {/* U-0437: an invalid From/To pair leaves the duration EMPTY — a forced 0 reads as a real zero-hour credit */}
                <Field label={translation("key_duration_hours")} htmlFor="tc-hours">
                    <SelectBox id="tc-hours" name="time_asked_hours" value={credit.selectedHour == null ? "" : credit.selectedHour} onChange={credit.handleDurationChange}>
                        {credit.selectedHour == null && <option value="" hidden>—</option>}
                        {TIME_CREDIT_HOUR_OPTIONS.map((hour) => (
                            <option key={hour} value={hour}>{hour} {translation(hour === 1 ? "key_hour" : "key_hours").toLowerCase()}</option>
                        ))}
                    </SelectBox>
                </Field>

                <Field label={translation("key_duration_minutes")} htmlFor="tc-minutes">
                    <SelectBox id="tc-minutes" name="time_asked_minutes" value={credit.selectedMinute == null ? "" : credit.selectedMinute} onChange={credit.handleDurationChange}>
                        {credit.selectedMinute == null && <option value="" hidden>—</option>}
                        {TIME_CREDIT_MINUTE_OPTIONS.map((minute) => (
                            <option key={minute} value={minute}>{minute} {translation(minute === 1 ? "key_minute" : "key_minutes").toLowerCase()}</option>
                        ))}
                    </SelectBox>
                </Field>

                <Field label={translation("key_add_comment")} htmlFor="tc-comment" required error={credit.errors.comment?.message} full>
                    <TextArea id="tc-comment" maxLength={TIME_REQUEST_COMMENT_MAX_LENGTH} invalid={Boolean(credit.errors.comment)} {...credit.register("comment")} />
                </Field>
            </FormGrid>

            <div className={shared.formFoot}>
                <Btn variant="secondary" type="button" onClick={credit.onReset} disabled={credit.isSaving}>{translation("key_cancel")}</Btn>
                <span className={shared.formFootSpacer} />
                <Btn variant="primary" type="submit" disabled={credit.isSaving || Boolean(credit.usersError)}>
                    {credit.isSaving ? translation("key_saving") : translation("key_save")}
                </Btn>
            </div>
        </form>
    );
};

AddTimeCreditForm.propTypes = {
    onBack: PropTypes.func.isRequired,
};

export default AddTimeCreditForm;
