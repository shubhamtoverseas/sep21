import { MANIFEST_URL, STORAGE_KEYS } from './config';
import { safeGet, safeRemove, safeSet } from './safeStorage';

// Read-only client of the published i18n pipeline. Every failure path is
// silent (console.warn only) and returns null so callers keep last-good data.

export function isValidBundle(bundle) {
    return Boolean(
        bundle &&
        typeof bundle === 'object' &&
        !Array.isArray(bundle) &&
        bundle.strings &&
        typeof bundle.strings === 'object' &&
        !Array.isArray(bundle.strings)
    );
}

export function isValidManifest(manifest) {
    return Boolean(
        manifest &&
        typeof manifest === 'object' &&
        manifest.languages &&
        typeof manifest.languages === 'object'
    );
}

// Compares numeric or dotted versions ("9", 9, "1.2.10"). Returns -1/0/1.
// Non-numeric segments are treated as 0 so garbage never throws.
export function compareVersions(a, b) {
    const partsA = String(a ?? '').split('.');
    const partsB = String(b ?? '').split('.');
    const length = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < length; i++) {
        const numA = parseInt(partsA[i], 10) || 0;
        const numB = parseInt(partsB[i], 10) || 0;
        if (numA !== numB) return numA > numB ? 1 : -1;
    }
    return 0;
}

async function fetchJson(url, label) {
    try {
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
            console.warn(`i18n: ${label} request failed (${response.status})`);
            return null;
        }
        return await response.json();
    } catch (e) {
        console.warn(`i18n: ${label} fetch error`, e && e.message);
        return null;
    }
}

export async function fetchManifest() {
    const manifest = await fetchJson(MANIFEST_URL, 'manifest');
    if (!isValidManifest(manifest)) {
        if (manifest !== null) console.warn('i18n: malformed manifest, keeping last-good');
        return null;
    }
    return manifest;
}

export async function fetchBundle(url) {
    const bundle = await fetchJson(url, 'bundle');
    if (!isValidBundle(bundle)) {
        if (bundle !== null) console.warn('i18n: malformed bundle, keeping last-good');
        return null;
    }
    return bundle;
}

// Last-good bundle cache (per language). Corrupted entries are dropped.
export function loadCachedBundle(lang) {
    const raw = safeGet(STORAGE_KEYS.bundle(lang));
    if (!raw) return null;
    try {
        const bundle = JSON.parse(raw);
        if (!isValidBundle(bundle)) throw new Error('invalid shape');
        return bundle;
    } catch (e) {
        console.warn(`i18n: dropping corrupted cache for "${lang}"`);
        safeRemove(STORAGE_KEYS.bundle(lang));
        return null;
    }
}

export function saveCachedBundle(lang, bundle) {
    try {
        safeSet(STORAGE_KEYS.bundle(lang), JSON.stringify(bundle));
    } catch (e) {
        console.warn(`i18n: failed to cache bundle for "${lang}"`, e && e.message);
    }
}

// Walks the resolution chain (array of string maps, most specific first)
// and returns the first hit; falls back to the key itself. Never throws.
export function resolveKey(key, maps) {
    if (key === null || key === undefined) return '';
    for (let i = 0; i < maps.length; i++) {
        const map = maps[i];
        if (
            map &&
            Object.prototype.hasOwnProperty.call(map, key) &&
            typeof map[key] === 'string'
        ) {
            return map[key];
        }
    }
    return String(key);
}
