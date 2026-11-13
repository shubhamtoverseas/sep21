import { useCallback, useEffect, useMemo, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import { fetchBranchUsers } from "../../../../../redux/Slices/settings/users/UsersSlice";
import {
    fetchLeaveBalance,
    fetchLeaveEligibilityCheck,
    fetchLeaveTypes,
    manualUpdateLeave,
} from "../../../../../redux/Slices/settings/leaves/LeavesSlice";
import { manualUpdateLeaveSchema } from "../../manual-update-leaves/manualUpdateLeaveSchema";
import { manualUpdateLeaveFormState } from "../../../../../components/ReusableComponents/form-states";
import { showErrorMessage, showSuccessOrError } from "../../../../../services/commonService";
import routes from "../../../routes/routesConfig";
import { MANUAL_LEAVE_METHOD, MANUAL_LEAVE_USERS_QUERY } from "../settingsNewUiConstants";

const selectManualLeave = (state) => ({
    users: state.users.branchUsers,
    leaveTypes: state.leaves?.leaveTypes,
    leaveBalance: state.leaves?.leaveBalance,
});

/** Ports ManualUpdateLeaves.js: employee → balance, method/type → eligibility, submit → /manual-update-leave. */
const useManualUpdateLeave = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { users, leaveTypes, leaveBalance } = useSelector(selectManualLeave, shallowEqual);

    const [selectedUserId, setSelectedUserId] = useState("");
    const [selectedMethod, setSelectedMethod] = useState("");
    const [leavePolicyDetailsId, setLeavePolicyDetailsId] = useState("");
    const [eligibility, setEligibility] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm({ resolver: yupResolver(manualUpdateLeaveSchema), defaultValues: manualUpdateLeaveFormState });
    const { setValue } = form;

    useEffect(() => {
        dispatch(fetchBranchUsers(MANUAL_LEAVE_USERS_QUERY));
        dispatch(fetchLeaveTypes());
    }, [dispatch]);

    useEffect(() => {
        /* bug log #25 (fixed 2026-10-18): a method / type / employee change that no longer qualifies clears the stale result */
        if (!selectedUserId || !leavePolicyDetailsId || selectedMethod !== MANUAL_LEAVE_METHOD.ENCASHMENT) {
            setEligibility(null);
            return;
        }
        dispatch(fetchLeaveEligibilityCheck({ user_id: selectedUserId, leave_policy_details_id: leavePolicyDetailsId })).then((res) => {
            showErrorMessage(res);
            if (!res.error) setEligibility(res.payload.data?.eligibility);
        });
    }, [dispatch, selectedUserId, leavePolicyDetailsId, selectedMethod]);

    const onUserChange = useCallback((event) => {
        const userId = event.target.value;
        setSelectedUserId(userId);
        setValue("user_id", userId, { shouldValidate: true });
    }, [setValue]);

    const loadBalance = useCallback(() => {
        if (!selectedUserId) return;
        dispatch(fetchLeaveBalance(selectedUserId));
        dispatch(fetchLeaveTypes({ user_id: selectedUserId }));   /* hrms 275: the chosen employee's types (balance rows stay the first source) */
    }, [dispatch, selectedUserId]);

    const onMethodChange = useCallback((event) => setSelectedMethod(event.target.value), []);
    const onLeaveTypeChange = useCallback((event) => setLeavePolicyDetailsId(event.target.value), []);

    const onCancel = useCallback(() => navigate(-1), [navigate]);

    const onSubmit = useCallback((data) => {
        setIsSaving(true);
        dispatch(manualUpdateLeave(data))
            .then((res) => {
                showSuccessOrError(res);
                if (!res.error) navigate(routes.settings);
            })
            .finally(() => setIsSaving(false));
    }, [dispatch, navigate]);

    const balances = useMemo(() => (Array.isArray(leaveBalance?.data) ? leaveBalance.data : []), [leaveBalance]);
    /* the form submits leave_policy_details_id, which is per employee policy: the chosen employee's balance rows carry it with
       the type name (get-leave-balance → { leave_policy_details_id, leave_type }), so they are the Leave Type options; the
       global type-list is the fallback before a balance is loaded (ClickUp "Leave type not opening … despite showing in balances") */
    const leaveTypeOptions = useMemo(() => {
        const fromBalance = balances
            .filter((b) => b?.leave_policy_details_id != null)
            .map((b) => ({ id: b.leave_policy_details_id, leave_policy_type: b.leave_type || "" }));
        return fromBalance.length ? fromBalance : (Array.isArray(leaveTypes) ? leaveTypes : []);
    }, [balances, leaveTypes]);

    return {
        form,
        users: Array.isArray(users) ? users : [],
        leaveTypes: leaveTypeOptions,
        balances,
        selectedUserId,
        selectedMethod,
        eligibility,
        isEncashment: selectedMethod === MANUAL_LEAVE_METHOD.ENCASHMENT,
        isSaving,
        onUserChange,
        loadBalance,
        onMethodChange,
        onLeaveTypeChange,
        onSubmit,
        onCancel,
    };
};

export default useManualUpdateLeave;
