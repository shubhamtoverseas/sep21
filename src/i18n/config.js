// OTA translation pipeline configuration.
// The pipeline (Google Sheet -> Apps Script publish -> Firebase Storage) is
// read-only from the admin panel's point of view; we only consume the
// already-published manifest + per-language bundles.

// The admin panel has its own sheet (separate from the Android one):
// https://docs.google.com/spreadsheets/d/1diVMVBjLH42RglW9_kzPj96kHsO267Ho4XAfGgtiavk
// Its Apps Script must publish to i18n/admin/ (NOT i18n/android/ — that would
// overwrite the mobile app's bundles). Until the first publish lands there,
// the app silently runs from the committed fallback snapshot.
// Override per environment with REACT_APP_I18N_MANIFEST_URL.
export const MANIFEST_URL =
    process.env.REACT_APP_I18N_MANIFEST_URL ||
    'https://storage.googleapis.com/maidmatch-bffb1.firebasestorage.app/i18n/staging/admin/manifest.json';

// Languages published by the pipeline (Android language codes).
export const OTA_LANGUAGES = ['en', 'id', 'zh-HK', 'zh-CN'];

export const DEFAULT_LANGUAGE = 'en';

// How often we are allowed to hit the manifest (periodic + window focus).
export const MANIFEST_CHECK_INTERVAL_MS = 3 * 60 * 1000;
// Throttle window slightly below the interval so timer jitter never skips a tick.
export const MANIFEST_CHECK_THROTTLE_MS = MANIFEST_CHECK_INTERVAL_MS - 10 * 1000;

export const STORAGE_KEYS = {
    lang: 'i18n:lang',
    manifestVersion: 'i18n:manifestVersion',
    bundle: (lang) => `i18n:v:${lang}`,
};

// Mapping between the panel's legacy i18next codes and the OTA (Android) codes.
export const APP_TO_OTA = {
    en: 'en',
    in: 'id',
    zh_HK: 'zh-HK',
    zh_CN: 'zh-CN',
};

export const OTA_TO_APP = {
    en: 'en',
    id: 'in',
    'zh-HK': 'zh_HK',
    'zh-CN': 'zh_CN',
};
