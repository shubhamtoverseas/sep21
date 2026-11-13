import translation from "../../../../../../utils/translation";
import { changeDynamicDateFormate, normalizeActorName } from "../../../../../../utils/utils";
import { ACTIVITY_FLAT_STATUS_META } from "../../../../../../components/ReusableComponents/constants";
import { WKD_PHOTO_ACTIVITY_COPY, WKD_PHOTO_ACTIVITY_TYPE, WKD_PHOTO_ACTIVITY_WHEN_FORMAT, WKD_PHOTO_LOG_ROLE_SOURCE } from "../../../workerModuleConstants";
import { cropLabel, normalizeCrop } from "./photoModel";

/*
 * Photo "concise activity" (prototype Worker_Details photo log, WORKER.md §16.5.4; backend 287): the status changes
 * (`update_image`) plus the submissions (`image_uploaded`), removals (`image_removed`) and crop adjustments
 * (`image_crop_adjusted`) the admin API logs under those types. Every line is composed here from the entry's type,
 * status and `json_data` — never from the server `message` for the status lines (the crop line falls back to it).
 * An upload line never carries a status: the admin uploader writes `current_status: verified` on it (legacy quirk).
 */
const parseJson = (raw) => {
    if (!raw) return null;
    if (typeof raw === "object") return raw;
    try { return JSON.parse(raw); } catch { return null; }
};

const byLine = (entry) => {
    const role = String(entry?.log_created_by_role || "").toLowerCase();
    if (role === "system" || entry?.actor_type === "system") return normalizeActorName("system");
    const name = normalizeActorName(entry?.log_created_by);
    if (!name) return null;
    const sourceKey = WKD_PHOTO_LOG_ROLE_SOURCE[role] || WKD_PHOTO_LOG_ROLE_SOURCE[String(entry?.actor_type || "").toLowerCase()];
    return sourceKey ? `${ name } ${ translation(sourceKey) }` : String(name);
};

const statusLine = (entry) => {
    const meta = ACTIVITY_FLAT_STATUS_META[entry?.current_status];
    if (!meta) return null;
    if (meta.noMeta) return { text: translation(meta.key), dot: meta.dot, by: null };
    const published = entry.current_status === "verified" ? ` ${ translation(WKD_PHOTO_ACTIVITY_COPY.published) }` : "";
    return { text: `${ translation(WKD_PHOTO_ACTIVITY_COPY.statusSet).replace("{{status}}", translation(meta.key)) }${ published }`, dot: meta.dot, by: byLine(entry) };
};

const uploadLine = (entry) => ({
    text: translation(String(entry?.actor_type || "").toLowerCase() === "worker" ? WKD_PHOTO_ACTIVITY_COPY.submitted : WKD_PHOTO_ACTIVITY_COPY.uploaded),
    dot: "blue",
    by: byLine(entry),
});

const cropLine = (entry) => {
    const crop = normalizeCrop(parseJson(entry?.json_data)?.crop);
    const label = cropLabel(crop);
    return { text: label ? translation(WKD_PHOTO_ACTIVITY_COPY.cropSet).replace("{{crop}}", label) : (entry?.message || ""), dot: "blue", by: byLine(entry) };
};

const LINE_BY_TYPE = {
    [WKD_PHOTO_ACTIVITY_TYPE.status]: statusLine,
    [WKD_PHOTO_ACTIVITY_TYPE.uploaded]: uploadLine,
    [WKD_PHOTO_ACTIVITY_TYPE.cropAdjusted]: cropLine,
    [WKD_PHOTO_ACTIVITY_TYPE.removed]: (entry) => ({ text: translation(WKD_PHOTO_ACTIVITY_COPY.removed), dot: "red", by: byLine(entry) }),
};

/** newest-first log entries → [{ id, text, by, when, dot }]; entries of an unknown type or status are skipped */
export const photoActivityEntries = (logs) => (Array.isArray(logs) ? logs : []).map((entry, index) => {
    const line = (LINE_BY_TYPE[entry?.type] || statusLine)(entry);
    if (!line || !line.text) return null;
    return {
        id: entry?.id ?? `${ entry?.type || "log" }-${ entry?.created_at || index }`,
        text: line.text,
        dot: line.dot,
        by: line.by,
        when: entry?.created_at ? changeDynamicDateFormate(entry.created_at, WKD_PHOTO_ACTIVITY_WHEN_FORMAT) : null,
    };
}).filter(Boolean);
