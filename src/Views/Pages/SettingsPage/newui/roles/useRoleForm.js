import { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import { addRole, fetchRoleById, updateRole } from "../../../../../redux/Slices/settings/roles/RolesSlice";
import { roleSchema } from "../../roles/roleSchema";
import { addRoleFormState } from "../../../../../components/ReusableComponents/form-states";
import { showSuccessOrError, useQuery } from "../../../../../services/commonService";
import routes from "../../../routes/routesConfig";

const useRoleForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const query = useQuery();
    const id = query.get("id");
    const isEdit = Boolean(id);

    const [roleStatus, setRoleStatus] = useState(Boolean(addRoleFormState.status));
    const [isLoading, setIsLoading] = useState(isEdit);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm({ resolver: yupResolver(roleSchema), defaultValues: addRoleFormState });
    const { reset, setValue } = form;

    useEffect(() => {
        if (!isEdit) {
            reset(addRoleFormState);
            return undefined;
        }
        let active = true;
        setIsLoading(true);
        dispatch(fetchRoleById(id)).then((res) => {
            if (!active) return;
            const role = !res.error ? res.payload?.data : null;
            if (role) {
                /* Legacy sends every field returned by /view-role back on update (incl. id). */
                reset({ ...addRoleFormState, ...role });
                setRoleStatus(Boolean(role.status));
            }
            setIsLoading(false);
        });
        return () => { active = false; };
    }, [dispatch, id, isEdit, reset]);

    const toggleStatus = useCallback(() => {
        setRoleStatus((prev) => {
            const next = !prev;
            setValue("status", next);
            return next;
        });
    }, [setValue]);

    const onCancel = useCallback(() => navigate(-1), [navigate]);

    const onSubmit = useCallback((formData) => {
        const payload = { ...formData, status: roleStatus ? 1 : 0 };
        setIsSaving(true);
        dispatch(isEdit ? updateRole(payload) : addRole(payload))
            .then((res) => {
                showSuccessOrError(res);
                if (!res.error) navigate(`/${routes.roles}`);
            })
            .finally(() => setIsSaving(false));
    }, [dispatch, isEdit, navigate, roleStatus]);

    return { form, isEdit, isLoading, isSaving, roleStatus, toggleStatus, onSubmit, onCancel };
};

export default useRoleForm;
