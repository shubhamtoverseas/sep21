import { useCallback, useEffect, useMemo, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import dayjs from "dayjs";
import {
    addLeave,
    fetchLeaveBalance,
    fetchLeaveById,
    fetchLeaveTypes,
    fetchLeaves,
    updateLeave,
    withdrawLeave,
} from "../../../../../../redux/Slices/settings/leaves/LeavesSlice";
import { calculateDuration, formatDate, getCurrentUser, showSuccessOrError, useQuery } from "../../../../../../services/commonService";
import { addLeaveFormState } from "../../../../../../components/ReusableComponents/form-states";
import { dispatchWithHandling } from "../../../../../../utils/dispatchHandler";
import { leaveSchema } from "../../../leaves/leaveSchema";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import translation from "../../../../../../utils/translation";
import { absoluteRoute } from "../../../../../../utils/utils";
import { useHrmsPermissions } from "../../../../../../utils/permissions/hrmsPermissionsUtils";
import routes from "../../../../routes/routesConfig";
import { asArray } from "../hrmsConfig";
import {
    HRMS_DEFAULT_PAGE_QUERY,
    HRMS_LOADING_STATUS,
    LEAVE_PICKER_MONTHS_BACK,
    LEAVE_PICKER_YEARS_AHEAD,
    leaveBalanceExceededMessage,
} from "../../settingsNewUiConstants";

const selectApplyLeave = (state) => ({
    currentLeave: state.leaves.currentLeave,
    status: state.leaves.status,
    leaveTypes: state.leaves.leaveTypes,
    leaveBalance: state.leaves.leaveBalance,
});

const toDate = (value) => (value ? dayjs(value).toDate() : null);

/** Ports ApplyLeave.js verbatim: balance/duration effects, date guards, add/update/withdraw. */
const useApplyLeave = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const query = useQuery();
    const id = query.get("id");
    const slice = useSelector(selectApplyLeave, shallowEqual);
    const { permissionList } = useSelector((state) => state.users);
    const { canAddLeave } = useHrmsPermissions(permissionList);

    const bounds = useMemo(() => {
        const today = new Date();
        const minDate = new Date();
        minDate.setMonth(today.getMonth() - LEAVE_PICKER_MONTHS_BACK);
        const maxDate = new Date();
        maxDate.setFullYear(today.getFullYear() + LEAVE_PICKER_YEARS_AHEAD);
        return { minDate, maxDate };
    }, []);

    const form = useForm({ resolver: yupResolver(leaveSchema), defaultValues: addLeaveFormState });
    const { register, reset, setValue, formState: { errors } } = form;

    const [dateFilterFrom, setDateFilterFrom] = useState(null);
    const [dateFilterTo, setDateFilterTo] = useState(null);
    const [selectedLeaveType, setSelectedLeaveType] = useState("");
    const [duration, setDuration] = useState(null);
    const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState(false);
    const [remainingLeaves, setRemainingLeaves] = useState(null);
    const [fromDateType, setFromDateType] = useState(null);
    const [toDateType, setToDateType] = useState(null);
    const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastToastShown, setLastToastShown] = useState(null);

    const { currentLeave, leaveBalance } = slice;

    useEffect(() => {
        if (remainingLeaves !== null && remainingLeaves < 0) {
            setIsSaveButtonDisabled(true);
            if (lastToastShown !== remainingLeaves && selectedLeaveType && leaveBalance?.data) {
                const balance = leaveBalance.data.find((item) => item.leave_policy_details_id == selectedLeaveType);
                if (balance && duration !== null) {
                    ShowToast("error", leaveBalanceExceededMessage(balance.remaining_leaves, duration));
                    setLastToastShown(remainingLeaves);
                }
            }
        } else if (remainingLeaves !== null && remainingLeaves >= 0) {
            setIsSaveButtonDisabled(false);
            if (lastToastShown !== null) setLastToastShown(null);
        }
    }, [remainingLeaves, selectedLeaveType, leaveBalance, duration, lastToastShown]);

    useEffect(() => {
        dispatchWithHandling(dispatch, fetchLeaveTypes());
        if (id) dispatch(fetchLeaveById(id));
        else reset(addLeaveFormState);
    }, [dispatch, id, reset]);

    useEffect(() => {
        dispatchWithHandling(dispatch, fetchLeaveBalance(getCurrentUser().data.id));
    }, [dispatch]);

    useEffect(() => {
        if (currentLeave && id) {
            reset(currentLeave);
            setDateFilterFrom(new Date(currentLeave.from_date));
            setDateFilterTo(new Date(currentLeave.to_date));
            setFromDateType(currentLeave.from_date_type);
            setToDateType(currentLeave.to_date_type);
            setDuration(currentLeave.duration);
            setSelectedLeaveType(currentLeave.leave_policy_details_id);
        }
    }, [currentLeave, id, reset]);

    useEffect(() => {
        if (selectedLeaveType && leaveBalance && leaveBalance.data) {
            const balance = leaveBalance.data.find((item) => item.leave_policy_details_id == selectedLeaveType);
            if (balance && dateFilterFrom && dateFilterTo && fromDateType && toDateType) {
                if (!id) {
                    const nextDuration = calculateDuration(formatDate(dateFilterFrom), fromDateType, formatDate(dateFilterTo), toDateType);
                    setDuration(nextDuration);
                    const remaining = balance.remaining_leaves - nextDuration;
                    setRemainingLeaves(remaining);
                    setIsSaveButtonDisabled(remaining < 0);
                /* bug log #88 (fixed 2026-10-06): the whole "something changed" test is guarded by currentLeave */
                } else if (currentLeave && (
                    currentLeave.from_date != formatDate(dateFilterFrom)
                    || currentLeave.to_date != formatDate(dateFilterTo)
                    || currentLeave.from_date_type != fromDateType
                    || currentLeave.to_date_type != toDateType)) {
                    const nextDuration = calculateDuration(formatDate(dateFilterFrom), fromDateType, formatDate(dateFilterTo), toDateType);
                    setDuration(nextDuration);
                    const remaining = balance.remaining_leaves - (nextDuration - currentLeave.duration);
                    setRemainingLeaves(remaining);
                    setIsSaveButtonDisabled(remaining < 0);
                } else {
                    setRemainingLeaves(balance.remaining_leaves);
                    setIsSaveButtonDisabled(balance.remaining_leaves < 0);
                }
            }
        } else {
            setDuration(null);
        }
    }, [selectedLeaveType, leaveBalance, dateFilterFrom, dateFilterTo, fromDateType, toDateType, currentLeave, id]);

    useEffect(() => {
        if (dateFilterFrom && dateFilterTo && dateFilterFrom > dateFilterTo) {
            ShowToast("error", translation("key_from_date_cannot_be_after_to_date"));
            setDateFilterTo(null);
            setValue("to_date", null);
        }
    }, [dateFilterFrom, dateFilterTo, setValue]);

    const onLeaveTypeChange = useCallback((event) => setSelectedLeaveType(event.target.value), []);

    const onFromDateTypeChange = useCallback((value) => {
        setValue("from_date_type", value);
        setFromDateType(value);
    }, [setValue]);

    const onToDateTypeChange = useCallback((value) => {
        setValue("to_date_type", value);
        setToDateType(value);
    }, [setValue]);

    const onFromDateChange = useCallback((value) => {
        const date = toDate(value);
        setDateFilterFrom(date);
        setValue("from_date", date);
        if (dateFilterTo && date && date > dateFilterTo) {
            setDateFilterTo(null);
            setValue("to_date", null);
            setToDateType(null);
        }
    }, [dateFilterTo, setValue]);

    const onToDateChange = useCallback((value) => {
        const date = toDate(value);
        setDateFilterTo(date);
        setValue("to_date", date);
        if (!dateFilterFrom) {
            setDateFilterFrom(date);
            setValue("from_date", date);
        }
    }, [dateFilterFrom, setValue]);

    const openWithdraw = useCallback(() => setIsWithdrawOpen(true), []);
    const closeWithdraw = useCallback(() => setIsWithdrawOpen(false), []);

    const confirmWithdraw = useCallback(async () => {
        if (!id) {
            setIsWithdrawOpen(false);
            ShowToast("error", translation("key_leave_id_needed"));
            return;
        }
        try {
            await dispatchWithHandling(dispatch, withdrawLeave(id));
            await dispatchWithHandling(dispatch, fetchLeaves(HRMS_DEFAULT_PAGE_QUERY));
            setIsWithdrawOpen(false);
            navigate(absoluteRoute(routes.leaves));
            ShowToast("success", translation("key_leave_withdraw_successfully"));
        } catch (err) {
            setIsWithdrawOpen(false);
            ShowToast("error", err);
        }
    }, [dispatch, id, navigate]);

    const onSubmit = useCallback((formData) => {
        const base = { ...formData, from_date: formatDate(dateFilterFrom), to_date: formatDate(dateFilterTo) };
        const action = id ? updateLeave({ ...base, id: parseInt(id, 10) }) : addLeave(base);
        setIsSaving(true);
        dispatch(action)
            .then((res) => {
                showSuccessOrError(res);
                if (!res.error) {
                    dispatch(fetchLeaves(HRMS_DEFAULT_PAGE_QUERY));
                    navigate(absoluteRoute(routes.leaves));
                }
            })
            .finally(() => setIsSaving(false));
    }, [dispatch, dateFilterFrom, dateFilterTo, id, navigate]);

    const onCancel = useCallback(() => navigate(-1), [navigate]);

    return {
        id,
        isEdit: Boolean(id),
        canAddLeave: Boolean(canAddLeave),
        isLoading: slice.status === HRMS_LOADING_STATUS,
        isSaving,
        form,
        register,
        errors,
        leaveTypes: asArray(slice.leaveTypes),
        leaveBalance,
        balances: asArray(leaveBalance?.data),
        remainingLeaves,
        isSaveButtonDisabled,
        dateFilterFrom,
        dateFilterTo,
        fromDateType,
        toDateType,
        minDate: bounds.minDate,
        maxDate: bounds.maxDate,
        isWithdrawOpen,
        onLeaveTypeChange,
        onFromDateChange,
        onToDateChange,
        onFromDateTypeChange,
        onToDateTypeChange,
        openWithdraw,
        closeWithdraw,
        confirmWithdraw,
        onSubmit,
        onCancel,
    };
};

export default useApplyLeave;
