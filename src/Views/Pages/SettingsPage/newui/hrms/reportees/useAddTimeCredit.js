import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "dayjs";
import { fetchBranchUsers } from "../../../../../../redux/Slices/settings/users/UsersSlice";
import { addManagerApprovedTimeRequest } from "../../../../../../redux/Slices/settings/time-request/TimeRequestSlice";
import { managerApprovedTimeEntrySchema } from "../../../leaves/manage-approve-time-entry/managerApprovedTimeEntrySchema";
import { managerApprovedTimeEntryFormState } from "../../../../../../components/ReusableComponents/form-states";
import { dispatchWithHandling } from "../../../../../../utils/dispatchHandler";
import { showSuccessOrError } from "../../../../../../services/commonService";
import { asArray, toClockString } from "../hrmsConfig";
import translation from "../../../../../../utils/translation";
import { TIME_CREDIT_USERS_QUERY } from "../../settingsNewUiConstants";

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_MINUTE = 60 * 1000;
/* backend 355: react-datepicker builds the first picked time on `new Date()`, so a Date keeps the current seconds and
   milliseconds and a floored difference lost a minute — every stored time is cut to the minute */
const atMinute = (date) => (date ? dayjs(date).second(0).millisecond(0).toDate() : null);
const sameDay = (a, b) => dayjs(a).isSame(b, "day");

/** Ports AddApproveTimeEntry.js verbatim: multi-user select, date, from/to time, derived duration, comment. */
const useAddTimeCredit = ({ onBack }) => {
    const dispatch = useDispatch();
    const branchUsers = useSelector((state) => state.users.branchUsers);
    const [dateFilter, setDateFilter] = useState(null);
    const [selectedHour, setSelectedHour] = useState(0);
    const [selectedMinute, setSelectedMinute] = useState(0);
    const [fromTime, setFromTime] = useState(null);
    const [toTime, setToTime] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    /* backend 356: a 401 (neither time-credit grant) — the message is shown and Save is disabled */
    const [usersError, setUsersError] = useState("");

    const form = useForm({ resolver: yupResolver(managerApprovedTimeEntrySchema), defaultValues: managerApprovedTimeEntryFormState });
    const { register, handleSubmit, reset, setValue, setError, clearErrors, formState: { errors } } = form;

    useEffect(() => {
        dispatchWithHandling(dispatch, fetchBranchUsers(TIME_CREDIT_USERS_QUERY))
            .then(() => setUsersError(""))
            .catch((err) => setUsersError(err?.data?.data?.message || err?.message || translation("key_something_went_wrong")));
    }, [dispatch]);

    const userOptions = useMemo(() => asArray(branchUsers).map((user) => ({ value: user.user_id, label: user.name })), [branchUsers]);

    const handleUsersChange = useCallback((selectedOptions) => {
        const options = selectedOptions || [];
        setSelectedUsers(options);
        /* a "User id is required" error from an earlier Save clears once an employee is picked */
        setValue("user_id", options.map((option) => option.value), { shouldValidate: true });
    }, [setValue]);

    /* backend 355: whole minutes, To must be after From (the server refuses To ≤ From and a mismatching duration).
       U-0437: an invalid pair empties the derived duration — a forced 0 would read as a real zero-hour credit. */
    const calculateDuration = useCallback((from, to) => {
        if (!from || !to) return;
        const minutes = Math.round((to - from) / MS_PER_MINUTE);
        if (minutes <= 0) {
            setError("to_time", { type: "manual", message: translation("key_hrms_to_time_after_from") });
            setSelectedHour(null);
            setSelectedMinute(null);
            return;
        }
        clearErrors("to_time");
        setSelectedHour(Math.floor(minutes / 60));
        setSelectedMinute(minutes % 60);
    }, [setError, clearErrors]);

    const handleDateChange = useCallback((value) => {
        const date = value ? dayjs(value).toDate() : null;
        setDateFilter(date);
        setValue("from_date", date, { shouldValidate: true });
    }, [setValue]);

    const handleFromTimeChange = useCallback((rawDate, fieldOnChange) => {
        const date = atMinute(rawDate);
        setFromTime(date);
        fieldOnChange(toClockString(date));
        calculateDuration(date, toTime);
    }, [calculateDuration, toTime]);

    const handleToTimeChange = useCallback((rawDate, fieldOnChange) => {
        const date = atMinute(rawDate);
        setToTime(date);
        fieldOnChange(toClockString(date));
        calculateDuration(fromTime, date);
    }, [calculateDuration, fromTime]);

    /* Legacy handleDurationChange: with a from time, moving hours/minutes re-derives the to time */
    const handleDurationChange = useCallback((event) => {
        const { name, value } = event.target;
        const parsedValue = parseInt(value, 10);
        if (fromTime) {
            let newToTime = fromTime;
            if (name === "time_asked_hours") {
                setSelectedHour(parsedValue);
                newToTime = atMinute(new Date(fromTime.getTime() + parsedValue * MS_PER_HOUR + (selectedMinute ?? 0) * MS_PER_MINUTE));
            } else if (name === "time_asked_minutes") {
                setSelectedMinute(parsedValue);
                newToTime = atMinute(new Date(fromTime.getTime() + (selectedHour ?? 0) * MS_PER_HOUR + parsedValue * MS_PER_MINUTE));
            }
            setToTime(newToTime);
            setValue("to_time", toClockString(newToTime), { shouldValidate: true });
            /* From + duration past midnight is refused by the server: same error as To ≤ From; the duration empties (U-0437) */
            if (!sameDay(newToTime, fromTime)) {
                setError("to_time", { type: "manual", message: translation("key_hrms_to_time_after_from") });
                setSelectedHour(null);
                setSelectedMinute(null);
            } else {
                clearErrors("to_time");
            }
        } else if (name === "time_asked_hours") {
            setSelectedHour(parsedValue);
        } else {
            setSelectedMinute(parsedValue);
        }
    }, [fromTime, selectedHour, selectedMinute, setValue, setError, clearErrors]);

    const onSubmit = useCallback((formData) => {
        if (usersError || (fromTime && toTime && toTime <= fromTime) || selectedHour == null || selectedMinute == null) {
            if ((fromTime && toTime && toTime <= fromTime) || selectedHour == null || selectedMinute == null) setError("to_time", { type: "manual", message: translation("key_hrms_to_time_after_from") });
            return;
        }
        setIsSaving(true);
        dispatch(addManagerApprovedTimeRequest({ ...formData, time_asked_hours: selectedHour, time_asked_minutes: selectedMinute }))
            .then((res) => {
                showSuccessOrError(res);
                if (!res.error) onBack();
            })
            .finally(() => setIsSaving(false));
    }, [dispatch, selectedHour, selectedMinute, onBack, usersError, fromTime, toTime, setError]);

    /* bug log #98 (fixed 2026-10-18): Cancel clears the local user / date / time / duration state with the form */
    const onReset = useCallback(() => {
        reset(managerApprovedTimeEntryFormState);
        setSelectedUsers([]);
        setDateFilter(null);
        setFromTime(null);
        setToTime(null);
        setSelectedHour(0);
        setSelectedMinute(0);
    }, [reset]);

    return {
        form,
        register,
        handleSubmit,
        errors,
        isSaving,
        usersError,
        userOptions,
        selectedUsers,
        dateFilter,
        fromTime,
        toTime,
        selectedHour,
        selectedMinute,
        handleUsersChange,
        handleDateChange,
        handleFromTimeChange,
        handleToTimeChange,
        handleDurationChange,
        onSubmit,
        onReset,
    };
};

export default useAddTimeCredit;
