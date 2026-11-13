import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import PropTypes from 'prop-types';
// Explicit ".js" so this resolves to the legacy i18next setup file, not this directory.
import legacyI18next from '../i18n.js';
import {
    APP_TO_OTA,
    DEFAULT_LANGUAGE,
    MANIFEST_CHECK_INTERVAL_MS,
    MANIFEST_URL,
    MANIFEST_CHECK_THROTTLE_MS,
    OTA_LANGUAGES,
    OTA_TO_APP,
    STORAGE_KEYS,
} from './config';
import { interpolate } from './interpolate';
import { normalizeLineBreaks } from './text';
import { safeGet, safeRemove, safeSet } from './safeStorage';
import {
    compareVersions,
    fetchBundle,
    fetchManifest,
    loadCachedBundle,
    resolveKey,
    saveCachedBundle,
} from './otaClient';
import enSnapshot from './fallback/en.json';
import idSnapshot from './fallback/id.json';
import zhHKSnapshot from './fallback/zh-HK.json';
import zhCNSnapshot from './fallback/zh-CN.json';

// Each pipeline restarts its version numbering, so bundles cached from a
// previous manifest URL (e.g. the old i18n/admin/ path at v22) would always
// out-version a newly pointed manifest (v1) and block every download.
// Purge the cache whenever the manifest URL changes.
if (safeGet(STORAGE_KEYS.manifestUrl) !== MANIFEST_URL) {
    OTA_LANGUAGES.forEach((lang) => safeRemove(STORAGE_KEYS.bundle(lang)));
    safeRemove(STORAGE_KEYS.manifestVersion);
    safeSet(STORAGE_KEYS.manifestUrl, MANIFEST_URL);
}

// Build-time snapshot (refresh with `npm run i18n:snapshot`).
const SNAPSHOTS = {
    en: enSnapshot.strings || {},
    id: idSnapshot.strings || {},
    'zh-HK': zhHKSnapshot.strings || {},
    'zh-CN': zhCNSnapshot.strings || {},
};

function getInitialLanguage() {
    // The panel's existing switcher drives i18next ("i18nextLng"), so when it
    // maps to an OTA language it wins; otherwise use our own persisted choice.
    const mapped = APP_TO_OTA[safeGet('i18nextLng')];
    if (mapped) return mapped;
    const stored = safeGet(STORAGE_KEYS.lang);
    if (OTA_LANGUAGES.includes(stored)) return stored;
    return DEFAULT_LANGUAGE;
}

function getInitialBundles(language) {
    const bundles = {};
    const cached = loadCachedBundle(language);
    if (cached) bundles[language] = cached;
    if (language !== 'en') {
        const cachedEn = loadCachedBundle('en');
        if (cachedEn) bundles.en = cachedEn;
    }
    return bundles;
}

// Mirrors OTA strings into the legacy i18next instance so existing screens
// using react-i18next can read the same Android keys ("key_*" legacy keys
// are disjoint and stay untouched).
function injectIntoLegacyI18next(otaLang, strings) {
    const appLang = OTA_TO_APP[otaLang];
    if (!appLang || !legacyI18next || !legacyI18next.addResourceBundle) return;
    try {
        legacyI18next.addResourceBundle(appLang, 'translation', strings, true, true);
    } catch (e) {
        console.warn('i18n: failed to mirror OTA strings into i18next', e && e.message);
    }
}

const defaultContextValue = {
    t: (key, ...args) =>
        normalizeLineBreaks(
            interpolate(resolveKey(key, [SNAPSHOTS.en]), ...args)
        ),
    language: DEFAULT_LANGUAGE,
    setLanguage: () => {},
    version: null,
};

const I18nContext = createContext(defaultContextValue);

export function I18nProvider({ children }) {
    const [language, setLanguageState] = useState(getInitialLanguage);
    const [bundles, setBundles] = useState(() => getInitialBundles(getInitialLanguage()));
    const [version, setVersion] = useState(() => {
        const stored = parseInt(safeGet(STORAGE_KEYS.manifestVersion), 10);
        return Number.isNaN(stored) ? null : stored;
    });

    const languageRef = useRef(language);
    const bundlesRef = useRef(bundles);
    const manifestRef = useRef(null);
    const lastCheckRef = useRef(0);

    languageRef.current = language;
    bundlesRef.current = bundles;

    const adoptBundle = useCallback((lang, bundle) => {
        bundlesRef.current = { ...bundlesRef.current, [lang]: bundle };
        setBundles(bundlesRef.current);
        injectIntoLegacyI18next(lang, bundle.strings);
    }, []);

    // Fetches a language's bundle when the cached copy is older than the
    // manifest (or missing). Keeps last-good data on any failure.
    const syncLanguageBundle = useCallback(async (lang, manifest) => {
        const info = manifest.languages && manifest.languages[lang];
        if (!info || !info.url) return;
        const current = bundlesRef.current[lang];
        if (current && compareVersions(current.version, manifest.version) >= 0) return;

        const bundle = await fetchBundle(info.url);
        if (!bundle) return;
        const stamped = {
            ...bundle,
            version: bundle.version !== undefined ? bundle.version : manifest.version,
            language: lang,
        };
        adoptBundle(lang, stamped);
        saveCachedBundle(lang, stamped);
    }, [adoptBundle]);

    const maybeCheckForUpdates = useCallback(async (force) => {
        const now = Date.now();
        if (!force && now - lastCheckRef.current < MANIFEST_CHECK_THROTTLE_MS) return;
        lastCheckRef.current = now;

        const manifest = await fetchManifest();
        if (!manifest) return;
        manifestRef.current = manifest;
        if (manifest.version !== undefined) {
            setVersion(manifest.version);
            safeSet(STORAGE_KEYS.manifestVersion, String(manifest.version));
        }
        await syncLanguageBundle(languageRef.current, manifest);
        if (languageRef.current !== 'en') await syncLanguageBundle('en', manifest);
    }, [syncLanguageBundle]);

    // Switches language: renders immediately from cache/snapshot, then
    // refreshes that language's bundle in the background.
    const activateLanguage = useCallback((lang, { syncLegacy } = {}) => {
        if (!OTA_LANGUAGES.includes(lang)) {
            console.warn(`i18n: unsupported language "${lang}"`);
            return;
        }
        setLanguageState(lang);
        languageRef.current = lang;
        safeSet(STORAGE_KEYS.lang, lang);

        if (!bundlesRef.current[lang]) {
            const cached = loadCachedBundle(lang);
            if (cached) adoptBundle(lang, cached);
        }
        if (manifestRef.current) {
            syncLanguageBundle(lang, manifestRef.current);
        } else {
            maybeCheckForUpdates(true);
        }

        if (syncLegacy) {
            const appLang = OTA_TO_APP[lang];
            if (appLang && legacyI18next && legacyI18next.language !== appLang) {
                legacyI18next.changeLanguage(appLang);
            }
        }
    }, [adoptBundle, maybeCheckForUpdates, syncLanguageBundle]);

    const setLanguage = useCallback((lang) => {
        activateLanguage(lang, { syncLegacy: true });
    }, [activateLanguage]);

    // Startup: mirror cached (last-good published) bundles into i18next, then
    // check the manifest. Re-check periodically and on window focus (throttled).
    // Snapshots are deliberately NOT mirrored: the admin sheet shares the
    // legacy "key_*" namespace, so only strings from a real publish may
    // override public/locales text. Snapshots still back the OTA t() chain.
    useEffect(() => {
        const injectAll = () => {
            Object.keys(bundlesRef.current).forEach((lang) =>
                injectIntoLegacyI18next(lang, bundlesRef.current[lang].strings)
            );
        };
        injectAll();
        // i18next's HttpBackend loads public/locales asynchronously and its
        // resources land ON TOP of ours — re-inject once each backend load
        // finishes so published OTA strings always win over the static files.
        if (legacyI18next && legacyI18next.on) {
            legacyI18next.on('loaded', injectAll);
        }

        maybeCheckForUpdates(true);
        const intervalId = setInterval(
            () => maybeCheckForUpdates(false),
            MANIFEST_CHECK_INTERVAL_MS
        );
        const onFocus = () => maybeCheckForUpdates(false);
        window.addEventListener('focus', onFocus);
        return () => {
            clearInterval(intervalId);
            window.removeEventListener('focus', onFocus);
            if (legacyI18next && legacyI18next.off) {
                legacyI18next.off('loaded', injectAll);
            }
        };
    }, [maybeCheckForUpdates]);

    // Follow the panel's existing language switcher (react-i18next).
    useEffect(() => {
        if (!legacyI18next || !legacyI18next.on) return undefined;
        const handler = (appLang) => {
            const otaLang = APP_TO_OTA[appLang];
            if (otaLang && otaLang !== languageRef.current) {
                activateLanguage(otaLang);
            }
        };
        legacyI18next.on('languageChanged', handler);
        return () => legacyI18next.off('languageChanged', handler);
    }, [activateLanguage]);

    const t = useCallback((key, ...args) => {
        const chain = [
            bundles[language] && bundles[language].strings,
            bundles.en && bundles.en.strings,
            SNAPSHOTS[language],
            SNAPSHOTS.en,
        ];
        const raw = resolveKey(key, chain);
        return normalizeLineBreaks(interpolate(raw, ...args));
    }, [bundles, language]);

    const value = useMemo(
        () => ({ t, language, setLanguage, version }),
        [t, language, setLanguage, version]
    );

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

I18nProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

// OTA translation hook: t(key, ...args), language, setLanguage, version.
// Safe to call outside the provider (falls back to the en snapshot).
export function useTranslation() {
    return useContext(I18nContext);
}

export default I18nProvider;
