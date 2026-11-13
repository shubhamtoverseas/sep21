import dayjs from "dayjs";
import translation from "../../../../../utils/translation";
import {
    DATE_DISPLAY_FORMAT,
    INTERVIEW_MODE_OPTIONS,
    PROMOTION_API_DATE_FORMAT,
    WORKER_PROMOTION_ITEM_ID_PREFIX,
    WORKER_PROMOTION_ITEM_ID_RANDOM_MAX,
} from "../settingsNewUiConstants";

/* ── Shared ──────────────────────────────────────────────────────────────── */
export const asArray = (value) => (Array.isArray(value) ? value : []);

export const formatDisplayDate = (value) => (value ? dayjs(value).format(DATE_DISPLAY_FORMAT) : "");

/** DataTable pageInfo from the legacy slice pagination fields. */
export const buildPageInfo = ({ currentPage, totalPages, total, limit }) => {
    const page = parseInt(currentPage, 10) || 1;
    const perPage = Number(limit) || 1;
    const count = Number(total) || 0;
    return {
        from: count ? (page - 1) * perPage + 1 : 0,
        to: Math.min(page * perPage, count),
        total: count,
        currentPage: page,
        lastPage: Number(totalPages) || 0,
        limit: perPage,
    };
};

/* ── List sorting (Worker promotions) ──────────────────────────────────────────────────────────── */
/** bug log #66: the list request keys are sort_by / sort_order — paging, per-page and refresh carry the active sort. */
export const promotionSortQuery = (sort) => (sort?.sort ? { sort_by: sort.sort, sort_order: sort.order } : {});

/** bug log #66: switching to another column starts ascending; the same column toggles. */
export const nextSortOrder = (current, sortKey, { asc, desc }) => (current.sort === sortKey && current.order === asc ? desc : asc);

/* ── Worker promotions ───────────────────────────────────────────────────── */
export const interviewModeLabel = (interviewModeId) => {
    const option = INTERVIEW_MODE_OPTIONS.find((item) => item.value === String(interviewModeId));
    return option ? translation(option.labelKey) : "";
};

export const generateWorkerPromotionItemId = () =>
    `${WORKER_PROMOTION_ITEM_ID_PREFIX}${Date.now()}_${Math.floor(Math.random() * WORKER_PROMOTION_ITEM_ID_RANDOM_MAX)}`;

export const newWorkerPromotionItem = () => ({ id: generateWorkerPromotionItemId(), title: "", description: "" });

/** Legacy items initialiser: existing workerPromotionItemModel rows or one blank row. */
export const initialWorkerPromotionItems = (currentWorkerPromotion) => {
    if (currentWorkerPromotion?.workerPromotionItemModel?.length) {
        return currentWorkerPromotion.workerPromotionItemModel.map((item) => ({
            id: generateWorkerPromotionItemId(),
            dbId: item?.id,
            title: item?.item || "",
            description: item?.description || "",
        }));
    }
    return [newWorkerPromotionItem()];
};

export const workerPromotionDefaultValues = (currentWorkerPromotion, addFormState) => (
    currentWorkerPromotion
        ? {
            id: currentWorkerPromotion.id,
            agency_id: currentWorkerPromotion.agency_id,
            interview_mode: String(currentWorkerPromotion.interview_mode),
            start_date: new Date(currentWorkerPromotion.start_date),
            end_date: currentWorkerPromotion.end_date ? new Date(currentWorkerPromotion.end_date) : null,
        }
        : addFormState
);

export const hasEmptyWorkerPromotionItems = (items) =>
    items.length === 0 || items.some((item) => !item.title.trim() || !item.description.trim());

export const buildWorkerPromotionPayload = (data, isInfinite, items, promotionId) => {
    const payload = {
        ...data,
        start_date: dayjs(data.start_date).format(PROMOTION_API_DATE_FORMAT),
        end_date: isInfinite ? null : dayjs(data.end_date).format(PROMOTION_API_DATE_FORMAT),
        workerPromotionItemModel: items.map((item) => ({
            ...(item.dbId && { id: item.dbId }),
            item: item.title,
            description: item.description,
        })),
    };
    /* bug log #69: the Indefinite form field stays on the client */
    delete payload.isInfinite;
    if (promotionId) payload.id = promotionId;
    return payload;
};
