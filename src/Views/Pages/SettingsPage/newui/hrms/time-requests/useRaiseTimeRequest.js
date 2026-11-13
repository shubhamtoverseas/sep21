import { useCallback, useEffect, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
    addTimeRequest,
    clearTimeRequestLoading,
    fetchTimeRequestById,
    setTimeRequestLoading,
    updateTimeRequest,
} from "../../../../../../redux/Slices/settings/time-request/TimeRequestSlice";
import { ShowToast } from "../../../../../../components/show-toast/ShowToast";
import { timeRequestSchema } from "../../../time-requests/timeRequestSchema";
import { formatDate, showSuccessOrError, uploadFile, useQuery } from "../../../../../../services/commonService";
import { timeRequestFormState } from "../../../../../../components/ReusableComponents/form-states";
import { absoluteRoute } from "../../../../../../utils/utils";
import routes from "../../../../routes/routesConfig";
import translation from "../../../../../../utils/translation";
import { HRMS_LOADING_STATUS, TIME_REQUEST_UPLOAD_FOLDER } from "../../settingsNewUiConstants";

const selectRaise = (state) => ({
    currentTimeRequest: state.timeRequests.currentTimeRequest,
    status: state.timeRequests.status,
});

/** Ports RaiseTimeRequest.js: edit prefill, optional attachment upload, add/update → /time-requests. */
const useRaiseTimeRequest = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const query = useQuery();
    const id = query.get("id");
    const slice = useSelector(selectRaise, shallowEqual);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm({ resolver: yupResolver(timeRequestSchema), defaultValues: timeRequestFormState });
    const { reset } = form;

    useEffect(() => {
        if (id) dispatch(fetchTimeRequestById(id));
        else reset(timeRequestFormState);
    }, [dispatch, id, reset]);

    useEffect(() => {
        if (slice.currentTimeRequest && id) {
            reset({
                ...slice.currentTimeRequest,
                date: slice.currentTimeRequest.from_date ? new Date(slice.currentTimeRequest.from_date) : null,
                durationHours: slice.currentTimeRequest.time_asked_hours,
                durationMinutes: slice.currentTimeRequest.time_asked_minutes,
            });
        }
    }, [slice.currentTimeRequest, id, reset]);

    /* backend 348: the own view returns the stored `file_path` — shown as the current attachment in edit mode */
    const currentFilePath = id ? slice.currentTimeRequest?.file_path || "" : "";

    const onSubmit = useCallback(async (data) => {
        /* an edit without a new file keeps the stored attachment (it used to be cleared to "") */
        let attachmentUrl = currentFilePath;
        if (data?.attachment?.length > 0) {
            try {
                dispatch(setTimeRequestLoading());
                const uploadedFile = await uploadFile([{ file: data.attachment[0], name: TIME_REQUEST_UPLOAD_FOLDER }]);
                dispatch(clearTimeRequestLoading());
                /* a refused signed URL (`{ status: false }` / no url) is a failure: the message is shown and nothing is submitted */
                if (!uploadedFile?.url) { ShowToast("error", uploadedFile?.message || translation("key_failed_to_upload_file")); return; }
                attachmentUrl = uploadedFile.url;
            } catch (error) {
                dispatch(clearTimeRequestLoading());
                ShowToast("error", error.message);
                return;
            }
        }

        const payload = {
            from_date: data.date ? formatDate(data.date) : null,
            time_asked_hours: data.durationHours,
            time_asked_minutes: data.durationMinutes,
            comment: data.comment,
            file_path: attachmentUrl,
        };

        setIsSaving(true);
        dispatch(id ? updateTimeRequest({ ...payload, time_request_apply_id: id }) : addTimeRequest(payload))
            .then((res) => {
                showSuccessOrError(res);
                if (!res.error) navigate(absoluteRoute(routes.timeRequests));
            })
            .finally(() => setIsSaving(false));
    }, [dispatch, id, navigate, currentFilePath]);

    const onReset = useCallback(() => reset(timeRequestFormState), [reset]);
    const onBack = useCallback(() => navigate(-1), [navigate]);

    return {
        isEdit: Boolean(id),
        isLoading: slice.status === HRMS_LOADING_STATUS,
        isSaving,
        currentFilePath,
        form,
        onSubmit,
        onReset,
        onBack,
    };
};

export default useRaiseTimeRequest;
