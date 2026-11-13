#!/usr/bin/env node
/*
 * Builds the admin translation sheet's data (scripts/admin-sheet-seed.csv).
 *
 * Rules (per team decision, 2026-07-09):
 *   - Keys + English : ALL keys from public/locales/en/translation.json —
 *     the complete, most up-to-date key list. English text comes from the file.
 *   - Chinese (zh-HK): ONLY translations present in the team's prep sheet;
 *     keys without one stay blank = pending translation.
 *   - Layout/order mirror the prep sheet: same row order, Date + comment
 *     columns carried over; keys the prep sheet doesn't have are appended at
 *     the end. Prep keys missing the "key_" prefix are matched with it.
 *   - Indonesian / Chinese Simplified: blank (pending).
 *
 * Import the CSV into the admin sheet's "Admin" tab
 * (File -> Import -> Replace current sheet), then MaidMatch -> Publish.
 * For the yellow pending shading, run MaidMatch -> Highlight missing translations.
 *
 * Usage:
 *   node scripts/i18n-seed-from-prep.js [prepSheetCsvUrl]
 *
 * Requires Node 18+ (global fetch). The prep sheet must be link-readable.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_PREP_CSV_URL =
    'https://docs.google.com/spreadsheets/d/1l8ufdu3HwiPoshkFJw_gax_gaL4H-BebCaJyq_OhMQU/export?format=csv&gid=0';

const EN_FILE = path.join(__dirname, '..', 'public', 'locales', 'en', 'translation.json');
const OUT_CSV = path.join(__dirname, 'admin-sheet-seed.csv');

// Prep sheet columns: A key, B date, C english, D chinese, E/F comments.
const COL = { key: 0, date: 1, en: 2, zh: 3, commentMike: 4, commentDev: 5 };

function parseCSV(text) {
    const rows = [];
    let row = [];
    let cur = '';
    let quoted = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"') {
                if (text[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
            } else cur += ch;
        } else if (ch === '"') {
            quoted = true;
        } else if (ch === ',') {
            row.push(cur); cur = '';
        } else if (ch === '\n') {
            row.push(cur.replace(/\r$/, '')); rows.push(row); row = []; cur = '';
        } else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur.replace(/\r$/, '')); rows.push(row); }
    return rows;
}

function csvCell(value) {
    const str = String(value ?? '');
    return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

const norm = (s) => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();

async function main() {
    const url = process.argv[2] || DEFAULT_PREP_CSV_URL;

    const en = JSON.parse(fs.readFileSync(EN_FILE, 'utf8'));

    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok) throw new Error(`prep sheet responded ${response.status}`);
    const csv = (await response.text()).replace(new RegExp('^\\uFEFF'), '');
    const prepRows = parseCSV(csv).slice(1);

    // Map each prep row to an en-file key (exact, else with "key_" prefix).
    // The prep sheet has duplicate keys with conflicting texts: the row whose
    // English matches the en file wins; otherwise the first row with Chinese;
    // otherwise the first row (for date/comment metadata).
    const byKey = new Map(); // enKey -> { row, englishMatches, hasChinese, order }
    const unmatchedPrepKeys = [];
    let order = 0;
    for (const row of prepRows) {
        const rawKey = (row[COL.key] || '').trim();
        if (!rawKey) continue;
        const enKey = rawKey in en ? rawKey : (`key_${rawKey}` in en ? `key_${rawKey}` : null);
        if (!enKey) {
            unmatchedPrepKeys.push(rawKey);
            continue;
        }
        const candidate = {
            row,
            englishMatches: norm(row[COL.en]) === norm(en[enKey]),
            hasChinese: Boolean((row[COL.zh] || '').trim()),
            order: order++,
        };
        const current = byKey.get(enKey);
        const better =
            !current ||
            (candidate.englishMatches && candidate.hasChinese && !(current.englishMatches && current.hasChinese)) ||
            (candidate.hasChinese && !current.hasChinese && !current.englishMatches);
        if (better) byKey.set(enKey, { ...candidate, order: current ? current.order : candidate.order });
    }

    // Emit: prep-sheet order first, then en-file keys the prep sheet lacks.
    const header = ['Admin Identifier', 'Date', 'English', 'Chinese Traditional',
        'Indonesian', 'Chinese Simplified', 'Comment Mike', 'Comment Dev'];
    const lines = [header.map(csvCell).join(',')];

    const emitted = new Set();
    let zhCount = 0;
    const ordered = [...byKey.entries()].sort((a, b) => a[1].order - b[1].order);
    for (const [enKey, info] of ordered) {
        const zh = (info.row[COL.zh] || '').trim();
        if (zh) zhCount++;
        emitted.add(enKey);
        lines.push([
            enKey,
            (info.row[COL.date] || '').trim(),
            String(en[enKey]),
            zh,
            '', '',
            (info.row[COL.commentMike] || '').trim(),
            (info.row[COL.commentDev] || '').trim(),
        ].map(csvCell).join(','));
    }

    let appended = 0;
    for (const key of Object.keys(en)) {
        if (emitted.has(key)) continue;
        appended++;
        lines.push([key, '', String(en[key]), '', '', '', '', ''].map(csvCell).join(','));
    }

    fs.writeFileSync(OUT_CSV, lines.join('\n') + '\n');

    const total = emitted.size + appended;
    console.log(`✔ seed CSV: ${total} keys -> ${path.relative(process.cwd(), OUT_CSV)}`);
    console.log(`  order     : ${emitted.size} keys in prep-sheet order, ${appended} new keys appended at the end`);
    console.log(`  English   : ${total} (all from public/locales/en/translation.json)`);
    console.log(`  zh-HK     : ${zhCount} from prep sheet, ${total - zhCount} pending`);
    if (unmatchedPrepKeys.length) {
        console.log(`  ~ ${unmatchedPrepKeys.length} prep-sheet keys have no match in the en file (dropped, review with team):`);
        console.log('    ' + unmatchedPrepKeys.join(', '));
    }
}

main().catch((error) => {
    console.error('i18n seed failed:', error.message);
    process.exit(1);
});
