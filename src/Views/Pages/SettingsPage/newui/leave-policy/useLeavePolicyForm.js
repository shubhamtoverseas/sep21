import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
    addLeavePolicy,
    addMasterLeavePolicy,
    fetchLeaveMasterView,
    updateLeavePolicy,
    updateMasterLeavePolicy,
} from "../../../../../redux/Slices/settings/leavePolicy/LeavePolicySlice";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { showErrorMessage, showSuccessOrError, useQuery } from "../../../../../services/commonService";
import translation from "../../../../../utils/translation";
import { fromApiRow, fromFormRow, toApiRow } from "./leavePolicyConfig";

/** Ports AddLeavePolicy.js: master name/status + local leave-type rows, two-step save. */
const useLeavePolicyForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const query = useQuery();
    const policyId = query.get("id");
    const isEdit = Boolean(policyId);

    const [policyName, setPolicyName] = useState("");
    /* Shubham 6 Nov: a new policy is Active by default (the Add page carries no toggle; Edit keeps it) */
    const [isActive, setIsActive] = useState(true);
    const [rows, setRows] = useState([]);
    const [selectedRowId, setSelectedRowId] = useState(null);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(isEdit);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isEdit) return undefined;
        let active = true;
        setIsLoading(true);
        dispatch(fetchLeaveMasterView(policyId)).then((res) => {
            if (!active) return;
            if (!res.error) {
                const master = res?.payload?.data;
                setPolicyName(master?.leave_policy_name || "");
                setIsActive(master?.status === 1);
                if (Array.isArray(master?.leavePolicyModel)) setRows(master.leavePolicyModel.map(fromApiRow));
            }
            setIsLoading(false);
        });
        return () => { active = false; };
    }, [dispatch, policyId, isEdit]);

    const editingRow = useMemo(
        () => (selectedRowId ? rows.find((row) => row.tempId === selectedRowId) || null : null),
        [rows, selectedRowId]
    );

    const openNewRowForm = useCallback(() => {
        setSelectedRowId(null);
        setIsFormVisible((prev) => !prev);
    }, []);

    const editRow = useCallback((row) => {
        setSelectedRowId(row.tempId);
        setIsFormVisible(true);
    }, []);

    const closeRowForm = useCallback(() => {
        setIsFormVisible(false);
        setSelectedRowId(null);
    }, []);

    const addOrUpdateRow = useCallback((formData) => {
        setRows((prev) => (
            selectedRowId
                ? prev.map((row) => (row.tempId === selectedRowId ? fromFormRow(formData, row) : row))
                : [...prev, fromFormRow(formData)]
        ));
        closeRowForm();
    }, [selectedRowId, closeRowForm]);

    /* backend 359: Save waits until the open row editor is added or discarded, so its edits are not dropped silently */
    const canSave = policyName.trim().length > 0 && rows.length > 0 && !isSaving && !isFormVisible;

    const onCancel = useCallback(() => navigate(-1), [navigate]);

    const persistRows = useCallback((leavePolicyId) => {
        const payload = { item_data: rows.map((row) => toApiRow(row, leavePolicyId)) };
        return dispatch(isEdit ? updateLeavePolicy(payload) : addLeavePolicy(payload)).then((res) => {
            showSuccessOrError(res);
            if (!res.error) navigate(-1);
        });
    }, [dispatch, isEdit, navigate, rows]);

    const save = useCallback(async () => {
        if (!policyName.trim()) {
            ShowToast("error", translation("key_this_field_is_required"));
            return;
        }
        if (rows.length === 0) return;

        const masterPayload = { leave_policy_name: policyName.trim(), status: isActive ? 1 : 0 };
        setIsSaving(true);
        try {
            if (isEdit) {
                const res = await dispatch(updateMasterLeavePolicy({ ...masterPayload, id: policyId }));
                showErrorMessage(res);
                if (!res.error) await persistRows(policyId);
            } else {
                const res = await dispatch(addMasterLeavePolicy(masterPayload));
                if (!res.error) await persistRows(res?.payload?.data?.id);
                else showErrorMessage(res);
            }
        } catch (error) {
            ShowToast("error", error?.message || translation("key_something_went_wrong"));
        } finally {
            setIsSaving(false);
        }
    }, [dispatch, isActive, isEdit, persistRows, policyId, policyName, rows.length]);

    return {
        isEdit,
        isLoading,
        isSaving,
        policyName,
        setPolicyName,
        isActive,
        setIsActive,
        rows,
        editingRow,
        isFormVisible,
        openNewRowForm,
        editRow,
        closeRowForm,
        addOrUpdateRow,
        canSave,
        save,
        onCancel,
    };
};

export default useLeavePolicyForm;
