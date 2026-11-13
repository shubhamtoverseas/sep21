import { JO_STAGE_COUNT_KEYS, JO_STAGE_ORDER } from "../employerNewUiConstants";
import { formatPhoneDisplay } from "../../../../../services/commonService";

export { EMPLOYER_ENGAGEMENT_HEADER, EMPLOYER_DETAIL_TABS, ACTIVE_EMPLOYER_STATUS } from "../employerNewUiConstants";

export const employerDisplayName = (employer) => {
    const english = [employer?.name, employer?.surname].filter(Boolean).join(' ').trim();
    return employer?.chinese_name ? `${ english } · ${ employer.chinese_name }` : english;
};

/* prototype header: "+852 9182 4467" — the dial code with its plus, digits grouped (audit D-05) */
export const formatPhone = (code, number) => {
    if (!number) return '';
    const dial = String(code || '').trim().replace(/^\+/, '');
    const digits = formatPhoneDisplay(number);
    return dial ? `+${ dial } ${ digits }` : digits;
};

export const getJoStageCapsules = (row) => JO_STAGE_ORDER
    .map((stage) => ({ ...stage, count: Number(row?.[JO_STAGE_COUNT_KEYS[stage.className]]) || 0 }))
    .filter((stage) => stage.count > 0);

export const getJoApplyRate = (row) => {
    const value = row?.apply_percentage;
    return value === null || value === undefined || value === '' ? null : String(value);
};
