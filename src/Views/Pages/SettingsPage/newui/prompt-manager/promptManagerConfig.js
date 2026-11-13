import translation from "../../../../../utils/translation";
import { PROMPT_AUTHOR, PROMPT_DEFAULT_MODEL, PROMPT_DYNAMIC_FIELD_REGEX } from "../settingsNewUiConstants";

export const asArray = (value) => (Array.isArray(value) ? value : []);

/** DataTable pageInfo from the legacy slice fields (see bug log — totals come back 0 from the API). */
export const buildPromptPageInfo = ({ currentPage, totalPages, totalCount, perPage }, rowCount) => {
    const page = parseInt(currentPage, 10) || 1;
    const total = Number(totalCount) || rowCount;
    const limit = Number(perPage) || rowCount || 1;
    return {
        from: total ? (page - 1) * limit + 1 : 0,
        to: Math.min(page * limit, total),
        total,
        currentPage: page,
        lastPage: Number(totalPages) || (total ? 1 : 0),
        limit,
    };
};

export const countDynamicFields = (text) => (String(text || "").match(PROMPT_DYNAMIC_FIELD_REGEX) || []).length;

export const countLines = (text) => (text.length > 0 ? text.split("\n").length : 0);

/** Legacy validate(): name, prompt text and at least one language. */
export const validatePromptTemplate = ({ name, promptText, languages }) => {
    const errors = {};
    if (!name.trim()) errors.name = translation("key_this_field_is_required");
    if (!promptText.trim()) errors.promptText = translation("key_this_field_is_required");
    if (!languages || languages.length === 0) errors.language = translation("key_this_field_is_required");
    return errors;
};

export const buildCreatePromptPayload = ({ name, promptText, languages }) => ({
    name,
    prompt_text: promptText,
    model: PROMPT_DEFAULT_MODEL,
    is_active: false,
    languages,
    created_by: PROMPT_AUTHOR,
});

export const buildUpdatePromptPayload = ({ id, name, promptText, languages }) => ({
    id,
    name,
    prompt_text: promptText,
    languages,
    updated_by: PROMPT_AUTHOR,
});

/** Legacy handleDynamicFieldClick: insert "<value>\n" at the caret, return next text + caret position. */
export const insertAtCaret = (text, start, end, value) => ({
    text: `${text.slice(0, start)}${value}\n${text.slice(end)}`,
    caret: start + value.length + 1,
});
