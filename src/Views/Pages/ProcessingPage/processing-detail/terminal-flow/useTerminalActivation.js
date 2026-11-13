import { useCallback, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { showSuccessOrError } from "../../../../../services/commonService";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import translation from "../../../../../utils/translation";

/**
 * Runs one activation request at a time. A double click or repeated Enter never sends a second request,
 * and a business error returned with HTTP 200 (`status: false`) is treated as a failure. `submit` resolves to
 * `{ ok, code, message }` so the caller can place a coded refusal on its field.
 */
const useTerminalActivation = (onSuccess) => {
    const dispatch = useDispatch();
    const inFlightRef = useRef(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submit = useCallback(async (action) => {
        if (inFlightRef.current) return { ok: false };
        inFlightRef.current = true;
        setIsSubmitting(true);
        try {
            const response = await dispatch(action);
            showSuccessOrError(response);
            const isSuccess = !response?.error && Boolean(response?.payload?.status);
            if (isSuccess && onSuccess) await onSuccess();
            return { ok: isSuccess, code: response?.payload?.code, message: response?.payload?.message };
        } catch {
            ShowToast("error", translation("key_something_went_wrong"));
            return { ok: false };
        } finally {
            inFlightRef.current = false;
            setIsSubmitting(false);
        }
    }, [dispatch, onSuccess]);

    return { isSubmitting, submit };
};

export default useTerminalActivation;
