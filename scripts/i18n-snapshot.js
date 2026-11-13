#!/usr/bin/env node
/*
 * Downloads the currently published OTA translation bundles into
 * src/i18n/fallback/<lang>.json so the app always has a build-time snapshot
 * (used when the network / cache is unavailable).
 *
 * Between publishes the fallback is maintained by hand as a subset of
 * public/locales/en/translation.json (every key it holds is in the admin
 * locale with the same English; src/__test__/i18n/fallbackParity.test.js).
 * A publish that lacks keys the fallback already holds is older than the
 * code and is refused — pass --force to snapshot it anyway.
 *
 * Run before releases:  npm run i18n:snapshot
 * Requires Node 18+ (global fetch).
 */

const fs = require('fs');
const path = require('path');

// Same manifest as the app (src/i18n/config.js); override with
// REACT_APP_I18N_MANIFEST_URL or pass a URL as the first argument.
const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const MANIFEST_URL =
    process.env.REACT_APP_I18N_MANIFEST_URL ||
    args.find((arg) => !arg.startsWith('--')) ||
    'https://storage.googleapis.com/maidmatch-bffb1.firebasestorage.app/i18n/staging/admin/manifest.json';

const OUT_DIR = path.join(__dirname, '..', 'src', 'i18n', 'fallback');

// Keys the committed snapshot holds that the publish does not: a non-empty
// list means the publish predates the code that added them.
function missingFromPublish(lang, strings) {
    const file = path.join(OUT_DIR, `${lang}.json`);
    if (!fs.existsSync(file)) return [];
    const current = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Object.keys((current && current.strings) || {}).filter(
        (key) => !Object.prototype.hasOwnProperty.call(strings, key)
    );
}

async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`${url} responded ${response.status}`);
    }
    return response.json();
}

async function main() {
    const manifest = await fetchJson(MANIFEST_URL);
    if (!manifest || typeof manifest.languages !== 'object') {
        throw new Error('Malformed manifest (missing "languages")');
    }

    fs.mkdirSync(OUT_DIR, { recursive: true });

    for (const [lang, info] of Object.entries(manifest.languages)) {
        if (!info || !info.url) {
            console.warn(`~ skipping "${lang}" (no url in manifest)`);
            continue;
        }
        const bundle = await fetchJson(info.url);
        if (!bundle || typeof bundle.strings !== 'object') {
            throw new Error(`Malformed bundle for "${lang}"`);
        }
        const missing = missingFromPublish(lang, bundle.strings);
        if (missing.length && !FORCE) {
            throw new Error(
                `"${lang}" publish (v${manifest.version}) lacks ${missing.length} key(s) the committed snapshot holds ` +
                `(${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ', …' : ''}); refusing to overwrite — ` +
                'republish from the current locale first, or pass --force'
            );
        }
        const outFile = path.join(OUT_DIR, `${lang}.json`);
        fs.writeFileSync(outFile, JSON.stringify(bundle, null, 2) + '\n');
        console.log(
            `✔ ${lang}: ${Object.keys(bundle.strings).length} strings -> ${path.relative(process.cwd(), outFile)}`
        );
    }

    console.log(`Snapshot complete (manifest v${manifest.version}).`);
}

main().catch((error) => {
    console.error('i18n:snapshot failed:', error.message);
    process.exit(1);
});
