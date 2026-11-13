import dayjs from "dayjs";
import translation from "../../../../../utils/translation";
import { ACCRUAL_TYPE, CAP_FLAG, LEAVE_POLICY_DISPLAY_FIELDS, LIMIT_FLAG, MAX_TYPE, DATE_DISPLAY_FORMAT, EXPIRY_DATE_DISPLAY_FORMAT } from "../settingsNewUiConstants";

const ACCRUAL_LABEL_KEY = {
    [ACCRUAL_TYPE.MANUAL]: "key_manual",
    [ACCRUAL_TYPE.YEARLY]: "key_yearly",
    [ACCRUAL_TYPE.MONTHLY]: "key_monthly",
};

export const accrualLabel = (type) => (ACCRUAL_LABEL_KEY[type] ? translation(ACCRUAL_LABEL_KEY[type]) : "");

const yesNo = (flag) => translation(Number(flag) === 1 ? "key_yes" : "key_no");

export const formatMaxWithType = (value, maxType) => {
    if (value === null || value === undefined || value === "") return "";
    return maxType === MAX_TYPE.PERCENTAGE ? `${value}%` : String(value);
};

/** Carry-forward / encashment max for a row: "No limit" on the server's `n` flag, else the max with its type. */
export const capMaxLabel = (enabled, limit, max, maxType) => (
    Number(enabled) === 1 && limit === CAP_FLAG.NO_LIMIT ? translation("key_no_limit") : formatMaxWithType(max, maxType)
);

const maxLabel = (enabled, limit, maxType, max) => (
    Number(enabled) !== 1 ? translation("key_na") : capMaxLabel(enabled, limit, max, maxType)
);

/** Display-only decorations added on top of the API/form row (legacy `handleAddToPolicy`). */
const decorate = (row) => ({
    ...row,
    leave_policy_name: row.leave_policy_type,
    accrual: accrualLabel(row.accrual_type),
    rate: row.accrual_rate || 0,
    from_doh: row.effective_from_date_of_hire || 0,
    carry_forward_display: yesNo(row.carry_forward),
    carry_f_max: maxLabel(row.carry_forward, row.carry_forward_limit, row.carry_forward_max_type, row.carry_forward_max),
    encashment_display: yesNo(row.encashment),
    encash_max: maxLabel(row.encashment, row.encashment_limit, row.encashment_max_type, row.encashment_max),
    threshold: row.threshold,
});

/** Row coming from /view-leave-master → local editable row (legacy fetchLeaveMasterView mapping). */
export const fromApiRow = (policy) => decorate({
    ...policy,
    tempId: policy.id || Date.now() + Math.random(),
    expiry_value_limit: policy?.expiry_value_limit || LIMIT_FLAG.LIMITED,
    expiry_in_days: policy.expiry_value || "",
    expiry_no_limit: policy.expiry_value_limit === LIMIT_FLAG.NO_LIMIT,
    carry_forward: policy.carry_forward || 0,
    carry_forward_no_limit: policy.carry_forward_limit === CAP_FLAG.NO_LIMIT,
    encashment: policy.encashment || 0,
    encashment_no_limit: policy.encashment_limit === CAP_FLAG.NO_LIMIT,
});

/** Row submitted by the inline form → local row (new or replacing `existing`). */
export const fromFormRow = (formData, existing) => decorate({
    ...formData,
    tempId: existing?.tempId ?? Date.now(),
    id: existing?.id || formData?.id || 0,
});

/** Local row → item_data entry for /add-leave-policy and /update-leave-policy. */
export const toApiRow = (row, leavePolicyId) => {
    const apiRow = Object.keys(row).reduce((acc, key) => {
        if (!LEAVE_POLICY_DISPLAY_FIELDS.includes(key)) acc[key] = row[key];
        return acc;
    }, {});
    return { ...apiRow, leave_policy_id: leavePolicyId, status: row.status || 1 };
};

export const annualTotalFor = (accrualType, accrualRate) => {
    const rate = parseFloat(accrualRate) || 0;
    if (accrualType === ACCRUAL_TYPE.MONTHLY) return rate * 12;
    if (accrualType === ACCRUAL_TYPE.YEARLY) return rate;
    return 0;
};

/** Legacy AddLeavePolicyForm.onSubmit transform (kept byte-for-byte in semantics). */
export const toRowPayload = (data, annualTotal) => ({
    leave_policy_type: data.leave_policy_type,
    accrual_type: data.accrual_type,
    accrual_rate: (Number.isNaN(Number(data.accrual_rate)) || !data.accrual_rate) ? 0 : parseFloat(data.accrual_rate),
    effective_from_date_of_hire: data.effective_from_date_of_hire ? parseInt(data.effective_from_date_of_hire, 10) : 0,
    expiry_type: data?.expiry_type,
    expiry_value_limit: data.expiry_value_limit,
    expiry_value: data.expiry_value_limit === LIMIT_FLAG.NO_LIMIT
        ? (data.expiry_type === "days" ? parseInt(data.expiry_in_days, 10) : data.expiry_in_days)
        : null,
    expiry_in_days: data?.expiry_in_days,
    carry_forward: data.carry_forward,
    carry_forward_limit: data.carry_forward === 1 ? (data.carry_forward_no_limit ? CAP_FLAG.NO_LIMIT : CAP_FLAG.HAS_MAX) : null,
    carry_forward_no_limit: data.carry_forward_no_limit,
    carry_forward_max: data.carry_forward === 1 && !data.carry_forward_no_limit ? parseFloat(data.carry_forward_max) : 0,
    carry_forward_max_type: data.carry_forward === 1 ? (data.carry_forward_no_limit ? "" : data.carry_forward_max_type) : null,
    encashment: data.encashment,
    encashment_limit: data.encashment === 1 ? (data.encashment_no_limit ? CAP_FLAG.NO_LIMIT : CAP_FLAG.HAS_MAX) : "",
    encashment_no_limit: data.encashment_no_limit,
    encashment_max: data.encashment === 1 && !data.encashment_no_limit ? parseFloat(data.encashment_max) : 0,
    encashment_max_type: data.encashment === 1 ? (data.encashment_no_limit ? "" : data.encashment_max_type) : "",
    threshold: data.encashment === 1 && data.threshold ? parseFloat(data.threshold) : 0,
    annual_total: annualTotal,
    status: data.status || 1,
});

export const formatExpiry = (value) => {
    if (value === null || value === undefined || value === "") return "";
    if (!Number.isNaN(Number(value))) {
        const days = Number(value);
        return `${days} ${translation("key_days").toLowerCase()}`;
    }
    const date = dayjs(value);
    return date.isValid() ? date.format(EXPIRY_DATE_DISPLAY_FORMAT) : "";
};

export const formatListDate = (value) => (value && dayjs(value).isValid() ? dayjs(value).format(DATE_DISPLAY_FORMAT) : "");
