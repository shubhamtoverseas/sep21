import { AWS_S3_PATH } from "../../../../../../services/apiPath";
import { WKD_PHOTO_COPY, WKD_PHOTO_CROP_RADIUS, WKD_PHOTO_DEFAULT_CROP, WKD_PHOTO_SOURCE_BY_ROLE } from "../../../workerModuleConstants";

const HOST = `${ AWS_S3_PATH }/`;

export const s3KeyOf = (url) => {
    if (!url) return null;
    const s = String(url);
    return s.startsWith(HOST) ? s.slice(HOST.length) : s.replace(/^https?:\/\/[^/]+\//, '');
};
export const fileNameOf = (url) => {
    try { return decodeURIComponent(String(url || '').split('?')[0].split('/').pop() || ''); } catch { return ''; }
};
export const formatBytes = (n) => {
    if (n === null || n === undefined || n === '') return '';
    const mb = Number(n) / (1024 * 1024);
    return mb >= 1 ? `${ mb.toFixed(1) } MB` : `${ Math.round(Number(n) / 1024) } KB`;
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const normalizeCrop = (crop) => {
    if (!crop || crop.cx === null || crop.cx === undefined) return null;
    const r = clamp(Number(crop.r) || WKD_PHOTO_DEFAULT_CROP.r, WKD_PHOTO_CROP_RADIUS.min, WKD_PHOTO_CROP_RADIUS.max);
    return { cx: Math.round(clamp(Number(crop.cx), r, 100 - r)), cy: Math.round(clamp(Number(crop.cy), 0, 100)), r: Math.round(r) };
};
/* backend 286: the actor rows read "<name> (worker app)" / "<name> (staff)"; the suffix is display copy, never stored with the name */
export const actorSource = (role) => { const k = WKD_PHOTO_SOURCE_BY_ROLE[String(role || '').toLowerCase()]; return k ? WKD_PHOTO_COPY[k] : ''; };
export const withSource = (name, source) => (name ? (source ? `${ name } ${ source }` : String(name)) : null);
export const dimsLabel = (nat) => (nat?.w && nat?.h ? `${ nat.w } x ${ nat.h }` : null);
export const cropLabel = (crop) => (crop ? `${ crop.cx }%, ${ crop.cy }% · r ${ crop.r }%` : null);

export const headshotVars = (crop, aspect) => {
    if (!crop || !aspect) return null;
    const k = 100 / (2 * crop.r);
    const kh = k * aspect;
    const px = (50 - k * crop.cx) / (1 - k);
    const py = (50 - kh * crop.cy) / (1 - kh);
    return { '--ph-size': `${ (k * 100).toFixed(3) }% auto`, '--ph-pos': `${ px.toFixed(3) }% ${ py.toFixed(3) }%` };
};
export const ringVars = (crop) => (crop ? { '--ph-cx': `${ crop.cx }%`, '--ph-cy': `${ crop.cy }%`, '--ph-d': `${ 2 * crop.r }%` } : null);

export const cropFromArea = (area) => normalizeCrop({ cx: area.x + area.width / 2, cy: area.y + area.height / 2, r: area.width / 2 });
export const areaFromCrop = (crop, aspect) => {
    const c = crop || WKD_PHOTO_DEFAULT_CROP;
    const h = 2 * c.r * (aspect || 1);
    return { x: c.cx - c.r, y: c.cy - h / 2, width: 2 * c.r, height: h };
};

const toRecord = (img, kind) => {
    const original = img?.uploaded || img?.final_image;
    if (!original) return null;
    const headshot = img.uploaded_crop || img.final_image || null;
    return {
        kind,
        id: img.id ?? null,
        original,
        headshot,
        originalKey: s3KeyOf(img.uploaded || img.final_image),
        headshotKey: s3KeyOf(headshot),
        withoutBgKey: s3KeyOf(img.uploaded_without_bg),
        crop: normalizeCrop(img.crop),
        fileName: img.file_name || fileNameOf(original),
        fileSize: img.file_size,
        uploadedAt: img.uploaded_at || img.created_at || null,
        uploadedBy: img.uploaded_by_name || img.uploaded_by || null,
        uploadedByRole: img.uploaded_by_role || null,
        approvedAt: img.approved_at || img.verified_at || null,
        approvedBy: img.approved_by_name || img.approved_by || null,
    };
};

export const photoRecords = (info) => {
    const status = info?.image_status || 'in_complete';
    const cur = info?.default_worker_image;
    const last = info?.last_uploaded_worker_image;
    if (status === 'in_complete' && !cur?.final_image && !last?.uploaded) return { current: null, pending: null, status };
    if (status === 'verified') return { current: toRecord(cur?.final_image ? cur : last, 'current'), pending: null, status };
    const lastRec = toRecord(last, 'pending');
    const curRec = toRecord(cur, 'current');
    if (lastRec && curRec && lastRec.original !== curRec.original && curRec.id !== null) {
        return { current: curRec, pending: lastRec, status };
    }
    return { current: null, pending: lastRec || (curRec ? { ...curRec, kind: 'pending' } : null), status };
};
