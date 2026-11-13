import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createPromptManager, updatePromptManager } from "../../../../../redux/Slices/settings/prompt-manager/PromptManagerSlice";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { useQuery } from "../../../../../services/commonService";
import translation from "../../../../../utils/translation";
import { absoluteRoute } from "../../../../../utils/utils";
import routes from "../../../routes/routesConfig";
import {
    asArray,
    buildCreatePromptPayload,
    buildUpdatePromptPayload,
    countDynamicFields,
    countLines,
    insertAtCaret,
    validatePromptTemplate,
} from "./promptManagerConfig";
import { PROMPT_LANGUAGE_OPTIONS, PROMPT_NAVIGATE_DELAY_MS } from "../settingsNewUiConstants";

/** Ports NewPromptTemplate.js: prefill from the list slice, manual validation, create/update + delayed navigate. */
const usePromptTemplateForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const query = useQuery();
    const urlId = query.get("id");
    const promptManagerList = useSelector((state) => state.promptManager.promptManagerList);

    const [name, setName] = useState("");
    const [promptText, setPromptText] = useState("");
    const [languages, setLanguages] = useState([]);
    const [promptId, setPromptId] = useState(null);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dynamicFieldKey, setDynamicFieldKey] = useState("");
    const textareaRef = useRef(null);

    useEffect(() => {
        if (!urlId) return;
        const record = asArray(promptManagerList).find((item) => String(item.id) === String(urlId)) || null;
        if (record) {
            setName(record.name || "");
            setPromptText(record.prompt_text || "");
            setPromptId(record.id || null);
            setLanguages(record.languages && record.languages.length > 0 ? record.languages : []);
        }
    }, [urlId, promptManagerList]);

    const dynamicCount = useMemo(() => countDynamicFields(promptText), [promptText]);
    const lineCount = useMemo(() => countLines(promptText), [promptText]);

    const languageOptions = useMemo(
        () => PROMPT_LANGUAGE_OPTIONS.map((option) => ({ value: option.value, label: translation(option.labelKey) })),
        []
    );

    const insertDynamicField = useCallback((value) => {
        setDynamicFieldKey("");
        const textarea = textareaRef.current;
        if (!value || !textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        let caret = start;
        setPromptText((prev) => {
            const next = insertAtCaret(prev, start, end, value);
            caret = next.caret;
            return next.text;
        });
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(caret, caret);
        }, 0);
    }, []);

    const onCancel = useCallback(() => navigate(-1), [navigate]);

    const onSubmit = useCallback(async (event) => {
        event.preventDefault();
        const validationErrors = validatePromptTemplate({ name, promptText, languages });
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        setIsSubmitting(true);
        try {
            if (promptId) {
                await dispatch(updatePromptManager(buildUpdatePromptPayload({ id: promptId, name, promptText, languages }))).unwrap();
                ShowToast("success", translation("key_prompt_template_updated_successfully"));
            } else {
                await dispatch(createPromptManager(buildCreatePromptPayload({ name, promptText, languages }))).unwrap();
                ShowToast("success", translation("key_prompt_template_created_successfully"));
            }
            setTimeout(() => navigate(absoluteRoute(routes.promptManager)), PROMPT_NAVIGATE_DELAY_MS);
        } catch (err) {
            /* bug log #84 (fixed 2026-10-06): the failure reaches the user */
            ShowToast("error", err?.data?.data?.message || err?.data?.message || err?.message || translation("key_something_went_wrong"));
        } finally {
            setIsSubmitting(false);
        }
    }, [dispatch, languages, name, navigate, promptId, promptText]);

    return {
        isEdit: Boolean(promptId),
        name,
        setName,
        promptText,
        setPromptText,
        languages,
        setLanguages,
        languageOptions,
        dynamicCount,
        lineCount,
        dynamicFieldKey,
        insertDynamicField,
        errors,
        isSubmitting,
        textareaRef,
        onSubmit,
        onCancel,
    };
};

export default usePromptTemplateForm;
