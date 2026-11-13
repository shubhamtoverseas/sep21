import { useMemo } from "react";
import { useReferenceQuery } from "../../../../hooks/useReferenceQuery";
import { getPrimaryLanguage } from "../../../../services/employers";
import { PRIMARY_LANGUAGE_QUERY_KEY } from "./employerNewUiConstants";

/* E-6 / U-0039: the spoken Primary Language choices — GET /get-primary-language (static: cantonese · english · mandarin),
   cached like the other reference lists. The written language of a registration link is a different list (REG_LINK_LANGUAGES). */
const usePrimaryLanguages = () => {
    const { data } = useReferenceQuery(PRIMARY_LANGUAGE_QUERY_KEY, () => getPrimaryLanguage().then((res) => res?.data?.data));
    return useMemo(() => (Array.isArray(data) ? data : []), [data]);
};

/* a legacy row (`primary_language` null, `primary_language_legacy` set) keeps its stored text as a disabled selected option —
   shown exactly as stored, never mapped, never offered as a choice */
export const legacyLanguageOption = (employer) => {
    if (!employer || employer.primary_language || !employer.primary_language_legacy) return null;
    return { id: employer.primary_language_legacy, name: employer.primary_language_legacy };
};

/* the value a form starts from — the id, else the legacy text; a save that leaves it unchanged omits the key (not sent = unchanged) */
export const loadedPrimaryLanguage = (employer) => employer?.primary_language || employer?.primary_language_legacy || "";

export const primaryLanguageLabel = (record) => record?.primary_language_label || record?.primary_language_legacy || "";

export default usePrimaryLanguages;
