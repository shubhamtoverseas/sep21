import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shallowEqual, useDispatch, useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { yupResolver } from "@hookform/resolvers/yup";
import {
    addTemplate,
    clearTemplate,
    fetchCategoryList,
    fetchLanguageList,
    fetchModuleList,
    fetchTemplateById,
    fetchTemplates,
    updateTemplate,
} from "../../../../../redux/Slices/settings/templates/TemplateSlice";
import { templateSchema } from "../../templates/templateSchema";
import { addTemplateFormState } from "../../../../../components/ReusableComponents/form-states";
import { ShowToast } from "../../../../../components/show-toast/ShowToast";
import { uploadFile, useQuery } from "../../../../../services/commonService";
import translation from "../../../../../utils/translation";
import {
    QUILL_TOOLBAR,
    TEMPLATE_ACCESSIBILITY,
    TEMPLATE_MEDIA_ACCEPT,
    TEMPLATE_PLACEHOLDER_COLOR,
    TEMPLATE_UPLOAD_FOLDER,
} from "../settingsNewUiConstants";
import {
    fieldToken,
    isInternal,
    recipientFieldGroups,
    recipientOptions,
    saveRefusalText,
    useTemplateConfiguration,
} from "./templateConfiguration";

const selectTemplateForm = (state) => ({
    moduleList: state.templates.moduleList,
    categoryList: state.templates.categoryList,
    languageList: state.templates.languageList,
    status: state.templates.status,
});

const fileExtension = (name = "") => name.split(".").pop().toLowerCase();

/* TM01: the recipient the template is written for — not a field of the shared add-template state the Global Chat form also uses */
const FORM_DEFAULTS = { ...addTemplateFormState, recipient_variant: "" };

/** Ports AddTemplateList.js: master lists, edit prefill, Quill content + placeholder insert, media upload, save.
 *  Send Template configuration (10 Nov 2026 package): the category's configuration, the recipient, and only that recipient's fields. */
const useTemplateForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const query = useQuery();
    const id = query.get("id");
    const isEdit = Boolean(id);
    const slice = useSelector(selectTemplateForm, shallowEqual);

    const quillRef = useRef(null);
    const [content, setContent] = useState("");
    const [mediaFile, setMediaFile] = useState(null);
    const [isLoading, setIsLoading] = useState(isEdit);
    const [isSaving, setIsSaving] = useState(false);
    const [saveRefusal, setSaveRefusal] = useState("");

    const form = useForm({ resolver: yupResolver(templateSchema), defaultValues: FORM_DEFAULTS });
    const { setValue, watch, setError, clearErrors } = form;
    const languageId = watch("language_id");
    const categoryId = watch("category_id");
    const recipient = watch("recipient_variant");

    const { configuration, isLoading: isConfigLoading, error: configError } = useTemplateConfiguration(categoryId);
    const internal = isInternal(configuration);
    const recipients = useMemo(() => (internal ? [] : recipientOptions(configuration)), [configuration, internal]);
    const dynamicFieldGroups = useMemo(() => recipientFieldGroups(configuration, recipient), [configuration, recipient]);

    /* the recipient follows the category: one offered → selected; internal preset → none; a stale choice → cleared */
    useEffect(() => {
        if (!configuration) return;
        if (internal) setValue("recipient_variant", "");
        else if (recipients.length === 1) setValue("recipient_variant", recipients[0].value);
        else if (recipient && !recipients.some((r) => r.value === recipient)) setValue("recipient_variant", "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [configuration]);

    useEffect(() => {
        if (!slice.moduleList.length) dispatch(fetchModuleList());
        if (!slice.languageList.length) dispatch(fetchLanguageList());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch]);

    useEffect(() => {
        if (!isEdit) {
            setValue("accessibility", TEMPLATE_ACCESSIBILITY.PUBLIC);
            return undefined;
        }
        let active = true;
        setIsLoading(true);
        dispatch(clearTemplate());
        dispatch(fetchTemplateById(id)).then((res) => {
            if (!active) return;
            const template = !res.error ? res.payload?.data : null;
            if (template) {
                Object.keys(FORM_DEFAULTS).forEach((key) => {
                    setValue(key, key === "accessibility" ? (template[key] || TEMPLATE_ACCESSIBILITY.PUBLIC) : (template[key] || ""));
                });
                setContent(template.template_content || "");
                if (template.file_path) {
                    setMediaFile({
                        url: template.file_path,
                        filename: template.file_path_name,
                        action: "update",
                        fileExtension: fileExtension(template.file_path),
                        name: template.file_path.replace(/^.*[\\/]/, ""),
                    });
                }
                if (template.module_key) dispatch(fetchCategoryList({ module: template.module_key }));
            }
            setIsLoading(false);
        });
        return () => { active = false; };
    }, [dispatch, id, isEdit, setValue]);

    useEffect(() => () => { dispatch(clearTemplate()); }, [dispatch]);

    const onModuleChange = useCallback((value) => {
        dispatch(fetchCategoryList({ module: value }));
        setValue("module_key", value);
        setValue("category_id", "");
        setValue("recipient_variant", "");
    }, [dispatch, setValue]);

    const onRecipientChange = useCallback((value) => {
        setValue("recipient_variant", value);
        clearErrors("recipient_variant");
        setSaveRefusal("");
    }, [clearErrors, setValue]);

    const onContentChange = useCallback((value) => {
        setContent(value);
        setValue("template_content", value);
        setSaveRefusal("");
    }, [setValue]);

    const onLanguageChange = useCallback((value) => setValue("language_id", value), [setValue]);

    /* Legacy placeholder insert: at the cursor when Quill is ready, else appended. The token is the field's target token. */
    const insertDynamicField = useCallback((token) => {
        setValue("dynamic_field_key", token);
        if (!token) return;
        const quill = quillRef.current?.getEditor?.();
        const placeholder = fieldToken({ token });
        const range = quill?.getSelection(true);
        if (quill && range) {
            quill.insertEmbed(range.index, "text", " ", "user");
            quill.insertEmbed(range.index + 1, "text", placeholder, "user");
            quill.formatText(range.index + 1, placeholder.length, { color: TEMPLATE_PLACEHOLDER_COLOR });
            quill.insertText(range.index + 1 + placeholder.length, "\n", "user");
            quill.setSelection(range.index + 2 + placeholder.length, 0, "user");
            onContentChange(quill.root.innerHTML);
            return;
        }
        setContent((prev) => {
            const next = `${prev}<span style='color:${TEMPLATE_PLACEHOLDER_COLOR};'>${placeholder}</span><p><br/></p>`;
            setValue("template_content", next);
            return next;
        });
    }, [onContentChange, setValue]);

    const uploadMedia = useCallback(() => {
        const input = document.createElement("input");
        input.setAttribute("type", "file");
        input.setAttribute("accept", TEMPLATE_MEDIA_ACCEPT);
        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            const uploaded = await uploadFile([{ file, name: TEMPLATE_UPLOAD_FOLDER }]);
            setMediaFile({ ...uploaded, action: "add", fileExtension: fileExtension(file.name), name: file.name });
        };
        input.click();
    }, []);

    const uploadRef = useRef(uploadMedia);
    uploadRef.current = uploadMedia;

    const quillModules = useMemo(() => ({
        toolbar: { container: QUILL_TOOLBAR.map((group) => [...group]), handlers: { image: () => uploadRef.current?.() } },
    }), []);

    const onCancel = useCallback(() => navigate(-1), [navigate]);

    const onSubmit = useCallback((formData) => {
        if (recipients.length > 1 && !formData.recipient_variant) {
            setError("recipient_variant", { type: "required", message: translation("key_st_recipient_required") });
            return;
        }
        const payload = { ...formData };
        delete payload.dynamic_field_key;
        if (!payload.recipient_variant || internal) delete payload.recipient_variant;
        if (mediaFile?.filename) payload.file_path = mediaFile.filename;

        setIsSaving(true);
        setSaveRefusal("");
        dispatch(isEdit ? updateTemplate({ ...payload, id }) : addTemplate(payload))
            .then((res) => {
                if (res?.error) {
                    const body = res?.payload?.data?.data || {};
                    setSaveRefusal(saveRefusalText(body));
                    ShowToast("error", body.message || res?.payload?.message);
                    return;
                }
                ShowToast("success", res?.payload?.message);
                dispatch(fetchTemplates());
                navigate(-1);
            })
            .finally(() => setIsSaving(false));
    }, [dispatch, id, internal, isEdit, mediaFile, navigate, recipients.length, setError]);

    return {
        form,
        templateId: id,
        isEdit,
        isLoading,
        isSaving,
        quillRef,
        quillModules,
        content,
        mediaFile,
        languageId,
        categoryId,
        recipient,
        configuration,
        isConfigLoading,
        configError,
        recipients,
        dynamicFieldGroups,
        saveRefusal,
        moduleList: Array.isArray(slice.moduleList) ? slice.moduleList : [],
        categoryList: Array.isArray(slice.categoryList) ? slice.categoryList : [],
        languageList: Array.isArray(slice.languageList) ? slice.languageList : [],
        onModuleChange,
        onRecipientChange,
        onLanguageChange,
        onContentChange,
        insertDynamicField,
        onSubmit,
        onCancel,
    };
};

export default useTemplateForm;
