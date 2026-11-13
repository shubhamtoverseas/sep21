import React from "react";
import { Link } from "react-router-dom";
import { Controller } from "react-hook-form";
import dayjs from "dayjs";
import Btn from "../../../../../../components/ui/Btn";
import DateInput from "../../../../../../components/ui/DateInput";
import Icon from "../../../../../../components/Icon/Icon";
import { Field, FormGrid, SelectBox, TextArea } from "../../../../../../components/ui/FormControls";
import translation from "../../../../../../utils/translation";
import { absoluteRoute, headingCase } from "../../../../../../utils/utils";
import routes from "../../../../routes/routesConfig";
import listStyles from "../../../../Invoice/InvoiceList.module.css";
import shared from "../../settings-newui.module.css";
import userStyles from "../../users/UserForm.module.css";
import hrmsStyles from "../Hrms.module.css";
import useRaiseTimeRequest from "./useRaiseTimeRequest";
import { TIME_REQUEST_COMMENT_ROWS, TIME_REQUEST_HOUR_OPTIONS, TIME_REQUEST_MINUTE_OPTIONS } from "../../settingsNewUiConstants";

const API_DATE_FORMAT = "YYYY-MM-DD";
const toInputValue = (date) => (date ? dayjs(date).format(API_DATE_FORMAT) : "");
const today = () => dayjs().format(API_DATE_FORMAT);

/** Ports RaiseTimeRequest.js — date, duration (hours + minutes), comment, optional attachment. */
const RaiseTimeRequestPage = () => {
    const request = useRaiseTimeRequest();
    const { control, register, handleSubmit, watch, formState: { errors } } = request.form;
    const attachment = watch("attachment");
    const attachmentName = attachment?.length ? attachment[0]?.name : "";
    const title = headingCase(translation("key_raise_time_request"));

    return (
        <div className={listStyles.pageWrap}>
            <nav className={shared.breadcrumb} aria-label={translation("key_settings")}>
                <Link to={absoluteRoute(routes.timeRequests)}>{headingCase(translation("key_my_recent_time_requests"))}</Link>
                <Icon name="chev_right" size={11} className={shared.breadcrumbSep} />
                <span className={shared.breadcrumbCurrent}>{title}</span>
            </nav>

            <form className={shared.card} onSubmit={handleSubmit(request.onSubmit)} noValidate>
                <div className={shared.cardHead}>
                    <h1 className={`${listStyles.pageTitle} ${shared.cardTitle}`}>{title}</h1>
                </div>

                {request.isLoading ? (
                    <div className={shared.loadingState}>{translation("key_loading")}…</div>
                ) : (
                    <>
                        <FormGrid columns={3}>
                            <Field label={translation("key_from")} htmlFor="tr-date" required error={errors.date?.message}>
                                <Controller name="date" control={control} render={({ field }) => (
                                    <DateInput
                                        id="tr-date"
                                        value={toInputValue(field.value)}
                                        onChange={(value) => field.onChange(value ? dayjs(value).toDate() : null)}
                                        onBlur={field.onBlur}
                                        max={today()}
                                        placeholder={translation("key_date")}
                                        invalid={Boolean(errors.date)}
                                    />
                                )} />
                            </Field>

                            {/* hours + minutes sit together as one Duration pair (user, 6 Nov) */}
                            <Field label={translation("key_duration")} htmlFor="tr-hours" required error={errors.durationHours?.message || errors.durationMinutes?.message}>
                                <div className={hrmsStyles.durationPair}>
                                    <Controller name="durationHours" control={control} render={({ field }) => (
                                        <SelectBox {...field} id="tr-hours" invalid={Boolean(errors.durationHours)}>
                                            {TIME_REQUEST_HOUR_OPTIONS.map((hour) => <option key={hour} value={hour}>{`${hour} ${translation("key_hours")}`}</option>)}
                                        </SelectBox>
                                    )} />
                                    <Controller name="durationMinutes" control={control} render={({ field }) => (
                                        <SelectBox {...field} id="tr-minutes" aria-label={translation("key_minutes")} invalid={Boolean(errors.durationMinutes)}>
                                            {TIME_REQUEST_MINUTE_OPTIONS.map((minute) => <option key={minute} value={minute}>{`${minute} ${translation("key_minutes")}`}</option>)}
                                        </SelectBox>
                                    )} />
                                </div>
                            </Field>

                            <Field label={translation("key_add_comment")} htmlFor="tr-comment" required error={errors.comment?.message} full>
                                <TextArea id="tr-comment" rows={TIME_REQUEST_COMMENT_ROWS} invalid={Boolean(errors.comment)} {...register("comment")} />
                            </Field>

                            <Field label={translation("key_add_attachment_optional")} full>
                                <label className={userStyles.uploadBtn}>
                                    <Icon name="upload" size={14} />
                                    {attachmentName || translation("key_add_attachment_optional")}
                                    <input type="file" className={userStyles.uploadInput} {...register("attachment")} />
                                </label>
                                {/* backend 348: the stored attachment stays unless a new file replaces it */}
                                {!attachmentName && request.currentFilePath && (
                                    <a href={request.currentFilePath} target="_blank" rel="noreferrer" className={hrmsStyles.fileLink} data-mc-current-attachment="" title={request.currentFilePath}>
                                        <Icon name="download" size={13} /> {request.currentFilePath.split("/").pop()}
                                    </a>
                                )}
                            </Field>
                        </FormGrid>

                        <div className={shared.formFoot}>
                            <Btn variant="secondary" type="button" onClick={request.onBack} disabled={request.isSaving}>{translation("key_cancel")}</Btn>
                            <span className={shared.formFootSpacer} />
                            <Btn variant="secondary" type="button" onClick={request.onReset} disabled={request.isSaving}>{translation("key_reset")}</Btn>
                            <Btn variant="primary" type="submit" disabled={request.isSaving}>
                                {request.isSaving ? translation("key_saving") : translation("key_save")}
                            </Btn>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
};

export default RaiseTimeRequestPage;
