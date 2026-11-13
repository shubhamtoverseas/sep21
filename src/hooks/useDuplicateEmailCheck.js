import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { checkDuplicateEmail } from "../redux/Slices/common/CommonSlice";
import translation from "../utils/translation";

const useDuplicateEmailCheck = (setError, clearErrors) => {
    const dispatch = useDispatch();

    const checkEmail = useCallback((email) => {
        if (!email) return;
        dispatch(checkDuplicateEmail({ email })).then(res => {
            if (res?.payload?.is_duplicate) {
                setError('email', { type: 'manual', message: translation('key_this_email_is_already_registered') });
            } else {
                clearErrors('email');
            }
        });
    }, [dispatch, setError, clearErrors]);

    return checkEmail;
};

export default useDuplicateEmailCheck;
