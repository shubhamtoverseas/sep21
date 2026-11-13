import React, { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch, useSelector } from "react-redux";
import Btn from "../../../../../../components/ui/Btn";
import Modal from "../../../../../../components/ui/Modal";
import { Checkbox, Field, FormGrid, SelectBox, TextArea } from "../../../../../../components/ui/FormControls";
import { clearMessage, updateReporteesTimeRequestAction } from "../../../../../../redux/Slices/settings/time-request/TimeRequestSlice";
import { reporteesActionSchema } from "../../../leaves/approve-time-request/reporteesActionSchema";
import { timeRequestActionFormState } from "../../../../../../components/ReusableComponents/form-states";
import { dispatchWithHandling } from "../../../../../../utils/dispatchHandler";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import translation from "../../../../../../utils/translation";
import styles from "../Hrms.module.css";
import { headingCase } from "../../../../../../utils/utils";
import {
    HRMS_FAILED_STATUS,
    TIME_APPROVE_MINUTE_OPTIONS,
    TIME_REQUEST_ACTION,
    TIME_REQUEST_HOUR_OPTIONS,
} from "../../settingsNewUiConstants";

const FORM_ID = "time-approve-request-form";

/**
 * Ports TimeApproveRequestPopup.js. Bug log #94 (fixed 2026-10-06): the hour / minute selects are form fields now, so
 * the approved duration is what the approver picked (legacy always sent the schema defaults 1 / 1); the fixed
 * "Current hours" text is gone — the segment shows only when the request carries `current_hours`.
 */
const toNumberOrUndefined = (value) => (value === "" || value === null || value === undefined ? undefined : parseInt(value, 10));

const TimeApproveRequestModal = ({ data, onClose, onRefresh }) => {
    const dispatch = useDispatch();
    const { status, error } = useSelector((state) => state.timeRequests);
    const [approveFull, setApproveFull] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    /* no preset duration: the approver must choose, or the schema's "required" message shows */
    const { register, handleSubmit, setValue, watch, trigger, getValues, clearErrors, formState: { errors } } = useForm({
        resolver: yupResolver(reporteesActionSchema),
        defaultValues: { ...timeRequestActionFormState, time_approved_hours: undefined, time_approved_minutes: undefined },
    });
    useEffect(() => { register("time_approved_hours"); register("time_approved_minutes"); }, [register]);
    const selectedHour = watch("time_approved_hours");
    const selectedMinute = watch("time_approved_minutes");
    const setSelectedHour = useCallback((value) => setValue("time_approved_hours", toNumberOrUndefined(value), { shouldValidate: true, shouldDirty: true }), [setValue]);
    const setSelectedMinute = useCallback((value) => setValue("time_approved_minutes", toNumberOrUndefined(value), { shouldValidate: true, shouldDirty: true }), [setValue]);

    useEffect(() => {
        if (status === HRMS_FAILED_STATUS && error) {
            ShowToast("error", error);
            dispatch(clearMessage());
        }
    }, [status, error, dispatch]);

    const handleApproveFullChange = useCallback((event) => {
        setApproveFull(event.target.checked);
        if (event.target.checked) {
            setSelectedHour(data?.time_asked_hours);
            setSelectedMinute(data?.time_asked_minutes);
        }
    }, [data, setSelectedHour, setSelectedMinute]);

    const handleHourChange = useCallback((event) => {
        setSelectedHour(event.target.value);
        setApproveFull(event.target.value == data?.time_asked_hours && selectedMinute == data?.time_asked_minutes);
    }, [data, selectedMinute, setSelectedHour]);

    const handleMinuteChange = useCallback((event) => {
        setSelectedMinute(event.target.value);
        setApproveFull(selectedHour == data?.time_asked_hours && event.target.value == data?.time_asked_minutes);
    }, [data, selectedHour, setSelectedMinute]);

    /* backend 353: a refusal (400 missing hours, 403 not your reportee / own request, 404, 409 withdrawn) carries `message` —
       shown as the toast; the modal stays open */
    const submit = useCallback(async (formData, actionStatus) => {
        setIsSaving(true);
        try {
            await dispatchWithHandling(dispatch, updateReporteesTimeRequestAction({ ...formData, time_request_apply_id: data.id, status: actionStatus }));
            onClose();
            onRefresh();
        } catch (err) {
            const message = err?.data?.data?.message || err?.message;
            if (message) ShowToast("error", message);
        } finally {
            setIsSaving(false);
        }
    }, [dispatch, data, onClose, onRefresh]);

    const handleApprove = useCallback((formData) => submit(formData, approveFull ? TIME_REQUEST_ACTION.FULL_APPROVE : TIME_REQUEST_ACTION.PARTIAL_APPROVE), [submit, approveFull]);
    /* backend 353: Reject needs no hours / minutes — only the comment is validated and sent */
    const handleReject = useCallback(async () => {
        clearErrors(["time_approved_hours", "time_approved_minutes"]);
        const ok = await trigger("admin_comment");
        if (!ok) return;
        await submit({ admin_comment: getValues("admin_comment") }, TIME_REQUEST_ACTION.REJECT);
    }, [submit, trigger, getValues, clearErrors]);

    return (
        <Modal
            title={headingCase(translation("key_time_approval_request"))}
            width={640}
            onClose={onClose}
            closeLabel={translation("key_close")}
            footer={(
                <>
                    <Btn variant="secondary" type="button" onClick={handleReject} disabled={isSaving}>{translation("key_reject_fully")}</Btn>
                    <span className={styles.modalFootSpacer} />
                    <Btn variant="primary" type="button" onClick={handleSubmit(handleApprove)} disabled={isSaving}>
                        {isSaving ? translation("key_saving") : translation("key_approve")}
                    </Btn>
                </>
            )}
        >
            <form id={FORM_ID} noValidate>
                <div className={styles.infoBar}>
                    <strong>{data?.for_date}</strong>{data?.current_hours ? <> : {translation("key_current_hours")} : {data.current_hours}</> : null} | {translation("key_asked_hours")} : {data?.time_asked}
                </div>

                <FormGrid columns={2}>
                    <Field full>
                        <Checkbox label={translation("key_approve_full")} checked={approveFull} onChange={handleApproveFullChange} />
                    </Field>

                    <Field label={translation("key_duration")} htmlFor="hourSelect" error={errors.time_approved_hours?.message}>
                        <SelectBox id="hourSelect" name="time_approved_hours" value={selectedHour ?? ""} invalid={Boolean(errors.time_approved_hours)} onChange={handleHourChange}>
                            <option value="">{translation("key_select_hour")}</option>
                            {TIME_REQUEST_HOUR_OPTIONS.map((hour) => (
                                <option key={hour} value={hour}>{hour} {translation(hour === 1 ? "key_hour" : "key_hours").toLowerCase()}</option>
                            ))}
                        </SelectBox>
                    </Field>
                    <Field label={translation("key_minutes")} htmlFor="minuteSelect" error={errors.time_approved_minutes?.message}>
                        <SelectBox id="minuteSelect" name="time_approved_minutes" value={selectedMinute ?? ""} invalid={Boolean(errors.time_approved_minutes)} onChange={handleMinuteChange}>
                            <option value="">{translation("key_select_minute")}</option>
                            {TIME_APPROVE_MINUTE_OPTIONS.map((minute) => (
                                <option key={minute} value={minute}>{minute} {translation(minute === 1 ? "key_minute" : "key_minutes").toLowerCase()}</option>
                            ))}
                        </SelectBox>
                    </Field>

                    <div className={styles.detailFull}>
                        <p className={styles.detailLabel}>{translation("key_employee_comment")}</p>
                        <p className={`${styles.detailValue} ${data?.comment ? "" : styles.detailValueMuted}`}>{data?.comment || translation("key_na")}</p>
                    </div>

                    <Field label={translation("key_approver_comment")} htmlFor="admin_comment" required error={errors.admin_comment?.message} full>
                        <TextArea id="admin_comment" rows={3} invalid={Boolean(errors.admin_comment)} {...register("admin_comment")} />
                    </Field>
                </FormGrid>
            </form>
        </Modal>
    );
};

TimeApproveRequestModal.propTypes = {
    data: PropTypes.object.isRequired,
    onClose: PropTypes.func.isRequired,
    onRefresh: PropTypes.func.isRequired,
};

export default TimeApproveRequestModal;
