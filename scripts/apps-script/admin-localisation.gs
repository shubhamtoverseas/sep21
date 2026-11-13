/**
 * MaidMatch ADMIN PANEL OTA translations — Google Sheet publisher.
 *
 * Adapted from the android/ios publisher (MaidMatch_Localisation). Differences:
 *   - single platform: publishes ONLY to  i18n/admin/...  (never touches
 *     i18n/android or i18n/ios — the mobile pipelines are safe);
 *   - single key column ("Key Identifier Admin") — the admin panel's key_* names;
 *   - language codes match the admin web app: en, id, zh-HK, zh-CN;
 *   - every publish attempt (success or fail) is recorded on a "Publish Logs"
 *     tab (auto-created): date/time, user email, status, version, key counts.
 *
 * Paste this into the ADMIN sheet's Apps Script project (Extensions ▸ Apps Script),
 * replacing all existing code. It adds a "MaidMatch ▸ Publish translations" menu.
 *
 * One-time setup (Project Settings ▸ Script properties) — properties are NOT
 * copied when a sheet is copied, so set these here again:
 *   GCS_BUCKET = maidmatch-bffb1.firebasestorage.app
 *   SA_JSON    = { ...service account key json... }   (same value as the android sheet's project)
 */

// ---- Which tab holds the strings ---------------------------------------------
var SHEET_NAME = 'Admin';

// ---- Publish log tab (auto-created on first publish) --------------------------
var LOG_SHEET_NAME = 'Publish Logs';
var LOG_HEADER = ['Date Time', 'User Email', 'Status', 'Version',
                  'Total Keys', 'Package Success', 'Package Fail',
                  'English Keys', 'Indonesian Keys', 'Chinese (Trad) Keys', 'Chinese (Simp) Keys',
                  'Details'];

// ---- Column headers -----------------------------------------------------------
// Several accepted spellings per column; matching is case- and extra-space-insensitive.
var HEADERS = {
  key:    ['Key Identifier Admin', 'Admin Identifier', 'Key'],
  en:     ['English', 'English Wording'],
  id:     ['Indonesian'],
  zhHant: ['Chinese Traditional', 'Chinese ( Trad)', 'Chinese (Trad)', 'Traditional Chinese', 'Chinese (Traditional)'],
  zhHans: ['Chinese Simplified', 'Simplified Chinese', 'Chinese (Simplified)'],
};

// Key-column values that mean "this row has no key".
var NON_KEY_PLACEHOLDERS = ['back end', 'backend', 'n/a', '-'];

// Sheet column -> admin web app language code.
var LANGS = [
  { headers: HEADERS.en,     code: 'en'    },
  { headers: HEADERS.id,     code: 'id'    },
  { headers: HEADERS.zhHant, code: 'zh-HK' },
  { headers: HEADERS.zhHans, code: 'zh-CN' },
];

var BASE_LANGUAGE = 'en';
var PLATFORM = 'admin';      // publishes to gs://<bucket>/i18n/admin/...
var STORAGE_PREFIX = 'i18n';

// -----------------------------------------------------------------------------
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('MaidMatch')
    .addItem('Publish translations', 'publishTranslations')
    .addItem('Preview (no upload)', 'previewTranslations')
    .addSeparator()
    .addItem('Highlight missing translations', 'highlightMissingTranslations')
    .addItem('Clear missing highlights', 'clearMissingHighlights')
    .addItem('Export missing translations (dated)', 'exportMissingTranslations')
    .addToUi();
}

// ============================ Pending / missing translations ==================
function missingTargets_() {
  return [
    { label: 'Indonesian',          headers: HEADERS.id },
    { label: 'Chinese Traditional', headers: HEADERS.zhHant },
    { label: 'Chinese Simplified',  headers: HEADERS.zhHans },
  ];
}

function scanMissing_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('Tab "' + SHEET_NAME + '" not found. Update SHEET_NAME in the script.');
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('Tab "' + SHEET_NAME + '" has no data rows.');

  var header = values[0];
  var cKey = colOf_(header, HEADERS.key);
  var cEn = colOf_(header, HEADERS.en);
  var targets = missingTargets_();
  targets.forEach(function (t) { t.col = colOf_(header, t.headers); });

  var items = [];
  var counts = {};
  targets.forEach(function (t) { counts[t.label] = 0; });
  var translatableRows = 0;

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var key = keyOrEmpty_(row[cKey]);
    if (!key) continue;
    var english = String(row[cEn] == null ? '' : row[cEn]).trim();
    if (english === '') continue;
    translatableRows++;

    var missing = [], missingCols = [];
    targets.forEach(function (t) {
      var v = String(row[t.col] == null ? '' : row[t.col]).trim();
      if (v === '') { missing.push(t.label); missingCols.push(t.col); counts[t.label]++; }
    });
    if (missing.length) {
      items.push({
        rowNumber: r + 1,
        key: key, english: english,
        missing: missing, missingCols: missingCols,
      });
    }
  }
  return { items: items, counts: counts, translatableRows: translatableRows, targets: targets };
}

function missingSummary_(scan) {
  return 'Translatable keys scanned (English present): ' + scan.translatableRows + '\n' +
    'Keys with a gap: ' + scan.items.length + '\n\n' +
    'Missing Indonesian: ' + scan.counts['Indonesian'] + '\n' +
    'Missing Chinese Traditional: ' + scan.counts['Chinese Traditional'] + '\n' +
    'Missing Chinese Simplified: ' + scan.counts['Chinese Simplified'];
}

var MISSING_BG = '#fff2cc';

function highlightMissingTranslations() {
  var ui = SpreadsheetApp.getUi();
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    var scan = scanMissing_();
    scan.items.forEach(function (it) {
      it.missingCols.forEach(function (col) {
        sheet.getRange(it.rowNumber, col + 1).setBackground(MISSING_BG);
      });
    });
    ui.alert('Missing translations highlighted',
      missingSummary_(scan) + '\n\nBlank cells above are now shaded amber. ' +
      'Run "Clear missing highlights" to remove the shading.',
      ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Highlight failed', String(e.message || e), ui.ButtonSet.OK);
  }
}

function clearMissingHighlights() {
  var ui = SpreadsheetApp.getUi();
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    var header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var cols = missingTargets_().map(function (t) { return colOf_(header, t.headers); });
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) { ui.alert('Nothing to clear.'); return; }
    var cleared = 0;
    cols.forEach(function (col) {
      var range = sheet.getRange(2, col + 1, lastRow - 1, 1);
      var bgs = range.getBackgrounds();
      for (var i = 0; i < bgs.length; i++) {
        if (String(bgs[i][0]).toLowerCase() === MISSING_BG) { bgs[i][0] = null; cleared++; }
      }
      range.setBackgrounds(bgs);
    });
    ui.alert('Cleared', 'Removed amber shading from ' + cleared + ' cells.', ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Clear failed', String(e.message || e), ui.ButtonSet.OK);
  }
}

function exportMissingTranslations() {
  var ui = SpreadsheetApp.getUi();
  try {
    var scan = scanMissing_();
    var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    var name = 'MaidMatch Admin Missing Translations - ' + stamp;
    var ss = SpreadsheetApp.create(name);

    var sh = ss.getSheets()[0].setName('Missing');
    var headRow = ['Admin key', 'English (source)',
                   'Indonesian', 'Chinese Traditional', 'Chinese Simplified'];
    var out = [headRow];
    scan.items.forEach(function (it) {
      out.push([
        it.key, it.english,
        it.missing.indexOf('Indonesian') >= 0 ? 'MISSING' : '',
        it.missing.indexOf('Chinese Traditional') >= 0 ? 'MISSING' : '',
        it.missing.indexOf('Chinese Simplified') >= 0 ? 'MISSING' : '',
      ]);
    });
    if (out.length === 1) out.push(['(none)', 'All translatable keys are complete.', '', '', '']);
    sh.getRange(1, 1, out.length, headRow.length).setValues(out);
    sh.getRange(1, 1, 1, headRow.length).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.autoResizeColumns(1, headRow.length);

    var sum = ss.insertSheet('Summary', 0);
    sum.getRange(1, 1, 6, 2).setValues([
      ['Generated', stamp],
      ['Source tab', SHEET_NAME],
      ['Keys with a gap', scan.items.length],
      ['Missing Indonesian', scan.counts['Indonesian']],
      ['Missing Chinese Traditional', scan.counts['Chinese Traditional']],
      ['Missing Chinese Simplified', scan.counts['Chinese Simplified']],
    ]);
    sum.getRange(1, 1, 6, 1).setFontWeight('bold');
    sum.autoResizeColumns(1, 2);

    ui.alert('Export ready',
      missingSummary_(scan) + '\n\nCreated in your Google Drive:\n' + name + '\n' + ss.getUrl() +
      '\n\nOpen it, then File > Download > Microsoft Excel (.xlsx).',
      ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Export failed', String(e.message || e), ui.ButtonSet.OK);
  }
}

function previewTranslations() {
  var ui = SpreadsheetApp.getUi();
  try {
    var built = buildBundles_();
    var msg = 'Tab: ' + SHEET_NAME + '\nRows: ' + built.rows +
      duplicateWarning_(built.duplicateKeys) +
      '\nWould publish version ' + (getVersion_() + 1) + ' to ' +
      STORAGE_PREFIX + '/' + PLATFORM + '/\n\n' +
      LANGS.map(function (l) {
        return l.code + ': ' + Object.keys(built.strings[l.code]).length + ' keys';
      }).join('\n');
    ui.alert('Preview', msg, ui.ButtonSet.OK);
  } catch (e) {
    ui.alert('Preview failed', String(e.message || e), ui.ButtonSet.OK);
  }
}

function publishTranslations() {
  var ui = SpreadsheetApp.getUi();
  var log = {
    email: getUserEmail_(), status: 'FAIL', version: '',
    totalKeys: 0, successCount: 0, failCount: 0,
    langCounts: ['', '', '', ''], details: '',
  };
  try {
    var props = PropertiesService.getScriptProperties();
    var bucket = props.getProperty('GCS_BUCKET');
    if (!bucket) {
      log.details = 'Missing GCS_BUCKET script property';
      logPublish_(log);
      ui.alert('Missing GCS_BUCKET script property (Project Settings > Script properties).');
      return;
    }

    var built = buildBundles_();
    log.totalKeys = built.rows;
    log.langCounts = LANGS.map(function (l) {
      return Object.keys(built.strings[l.code]).length;
    });
    var version = getVersion_() + 1;
    log.version = version;
    var token = getAccessToken_();
    var publishedAt = new Date().toISOString();

    // Upload every language file; collect failures instead of aborting midway.
    var languages = {};
    var failures = [];
    LANGS.forEach(function (l) {
      var strings = built.strings[l.code];
      var path = STORAGE_PREFIX + '/' + PLATFORM + '/v' + version + '/' + l.code + '.json';
      try {
        uploadJson_(bucket, path, {
          schema: 1, version: version, language: l.code, strings: strings
        }, token, 'public, max-age=31536000, immutable');
        languages[l.code] = { url: publicUrl_(bucket, path), count: Object.keys(strings).length };
        log.successCount++;
      } catch (e) {
        log.failCount++;
        failures.push(l.code + ': ' + String(e.message || e));
      }
    });

    // Any language failed -> do NOT update the manifest; the app keeps the
    // previous complete version instead of seeing a half-published one.
    if (failures.length) {
      log.details = 'Manifest NOT updated. ' + failures.join(' | ');
      logPublish_(log);
      ui.alert('Publish failed',
        log.failCount + ' of ' + LANGS.length + ' language files failed to upload.\n' +
        'The manifest was NOT updated, the app still serves the previous version.\n\n' +
        failures.join('\n'), ui.ButtonSet.OK);
      return;
    }

    var manifest = {
      schema: 1, version: version, publishedAt: publishedAt,
      baseLanguage: BASE_LANGUAGE, languages: languages
    };
    uploadJson_(bucket, STORAGE_PREFIX + '/' + PLATFORM + '/manifest.json',
      manifest, token, 'public, max-age=60');

    setVersion_(version);
    log.status = 'SUCCESS';
    log.details = duplicateWarning_(built.duplicateKeys).replace(/^\s+/, '');
    logPublish_(log);
    ui.alert('Published', 'Admin version ' + version + ' published (' + built.rows + ' rows).\n' +
      'The admin panel picks it up within ~3 minutes or on tab focus.',
      ui.ButtonSet.OK);
  } catch (e) {
    log.details = String(e.message || e);
    logPublish_(log);
    ui.alert('Publish failed', String(e.message || e), ui.ButtonSet.OK);
  }
}

// ---- Publish log --------------------------------------------------------------
function getUserEmail_() {
  try {
    return Session.getActiveUser().getEmail() ||
           Session.getEffectiveUser().getEmail() || 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

// Appends one row to the "Publish Logs" tab (newest on top, header auto-created).
// Never throws — a logging problem must not break or mask the publish result.
function logPublish_(log) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(LOG_SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(LOG_SHEET_NAME);
      sheet.getRange(1, 1, 1, LOG_HEADER.length).setValues([LOG_HEADER]).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sheet.insertRowAfter(1);
    sheet.getRange(2, 1, 1, LOG_HEADER.length).setValues([[
      stamp, log.email, log.status, log.version,
      log.totalKeys, log.successCount, log.failCount,
      log.langCounts[0], log.langCounts[1], log.langCounts[2], log.langCounts[3],
      log.details,
    ]]);
  } catch (e) {
    // ignore — logging must never block publishing
  }
}

// ---- Build bundles from the sheet -------------------------------------------
function buildBundles_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('Tab "' + SHEET_NAME + '" not found in this spreadsheet. ' +
      'Rename the tab or update SHEET_NAME in the script.');
  }
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) throw new Error('Tab "' + SHEET_NAME + '" has no data rows.');

  var header = values[0];
  var cKey = colOf_(header, HEADERS.key);
  var langCols = {};
  LANGS.forEach(function (l) { langCols[l.code] = colOf_(header, l.headers); });

  var strings = {};
  LANGS.forEach(function (l) { strings[l.code] = {}; });

  var rows = 0;
  var seen = {};
  var duplicateKeys = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var key = keyOrEmpty_(row[cKey]);
    if (!key) continue;
    rows++;
    if (seen[key]) duplicateKeys.push(key);
    seen[key] = true;
    LANGS.forEach(function (l) {
      var val = row[langCols[l.code]];
      if (val === null || val === undefined) return;
      val = normalizeLineBreaks_(String(val));
      if (val.trim() === '') return; // blank cell -> omit, keep app fallback
      strings[l.code][key] = val;
    });
  }
  return { rows: rows, strings: strings, duplicateKeys: duplicateKeys };
}

function normalizeLineBreaks_(s) {
  var v = String(s);
  var cdata = v.match(/^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/);
  if (cdata) v = cdata[1];
  v = v.replace(/\\n/g, '\n').replace(/<br\s*\/?>/gi, '\n');
  if (/<(b|i|u|em|strong|font|a|big|small|sup|sub|p|div|ul|li)\b/i.test(v)) {
    v = v.replace(/\n/g, '<br/>');
  }
  return v;
}

/** Case/extra-space-insensitive header lookup; error lists the headers actually present. */
function colOf_(headerRow, candidates) {
  var norm = headerRow.map(normalizeHeader_);
  for (var i = 0; i < candidates.length; i++) {
    var idx = norm.indexOf(normalizeHeader_(candidates[i]));
    if (idx >= 0) return idx;
  }
  for (var c = 0; c < candidates.length; c++) {
    var want = normalizeHeader_(candidates[c]);
    for (var h = 0; h < norm.length; h++) {
      if (norm[h].length > want.length &&
          norm[h].indexOf(want) === 0 &&
          norm[h].charAt(want.length) === ' ') return h;
    }
  }
  var present = [];
  for (var j = 0; j < headerRow.length; j++) {
    var hh = String(headerRow[j]).trim();
    if (hh) present.push(hh);
  }
  throw new Error('Column "' + candidates[0] + '" not found on tab "' + SHEET_NAME + '".\n\n' +
    'Headers found: ' + present.join(' | ') + '\n\n' +
    'Edit HEADERS in the script to match the sheet.');
}

function normalizeHeader_(s) {
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ');
}

function keyOrEmpty_(v) {
  var s = String(v === null || v === undefined ? '' : v).trim();
  if (!s) return '';
  var lower = s.toLowerCase();
  for (var i = 0; i < NON_KEY_PLACEHOLDERS.length; i++) {
    if (lower === NON_KEY_PLACEHOLDERS[i]) return '';
  }
  return s;
}

function duplicateWarning_(duplicateKeys) {
  if (!duplicateKeys.length) return '';
  var shown = duplicateKeys.slice(0, 10).join(', ');
  var more = duplicateKeys.length > 10 ? ' (+' + (duplicateKeys.length - 10) + ' more)' : '';
  return '\n\nWARNING - duplicate keys (last row wins): ' + shown + more;
}

// ---- GCS upload (multipart: sets name + cacheControl + contentType) ----------
function uploadJson_(bucket, objectPath, obj, token, cacheControl) {
  var boundary = 'mm_boundary_' + Utilities.getUuid();
  var contentType = 'application/json; charset=utf-8';
  var metadata = { name: objectPath, contentType: contentType, cacheControl: cacheControl };
  var body =
    '--' + boundary + '\r\n' +
    'Content-Type: application/json; charset=utf-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n' +
    '--' + boundary + '\r\n' +
    'Content-Type: ' + contentType + '\r\n\r\n' +
    JSON.stringify(obj) + '\r\n' +
    '--' + boundary + '--';

  var url = 'https://storage.googleapis.com/upload/storage/v1/b/' +
    encodeURIComponent(bucket) + '/o?uploadType=multipart';
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'multipart/related; boundary=' + boundary,
    payload: body,
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) {
    throw new Error('Upload failed for ' + objectPath + ': ' + res.getResponseCode() + ' ' + res.getContentText());
  }
}

function publicUrl_(bucket, objectPath) {
  return 'https://storage.googleapis.com/' + bucket + '/' +
    objectPath.split('/').map(encodeURIComponent).join('/');
}

// ---- Version counter --------------------------------------------------------
function getVersion_() { return parseInt(PropertiesService.getScriptProperties().getProperty('OTA_VERSION') || '0', 10); }
function setVersion_(v) { PropertiesService.getScriptProperties().setProperty('OTA_VERSION', String(v)); }

// ---- Service-account OAuth (JWT bearer -> access token) ----------------------
function getAccessToken_() {
  var saJson = PropertiesService.getScriptProperties().getProperty('SA_JSON');
  if (!saJson) throw new Error('Missing SA_JSON script property (Project Settings > Script properties).');
  var sa = JSON.parse(saJson);
  var now = Math.floor(Date.now() / 1000);
  var header = base64url_(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  var claim = base64url_(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/devstorage.read_write',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  }));
  var toSign = header + '.' + claim;
  var sig = Utilities.computeRsaSha256Signature(toSign, sa.private_key);
  var jwt = toSign + '.' + base64urlBytes_(sig);

  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', {
    method: 'post',
    payload: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 300) throw new Error('Token error: ' + res.getContentText());
  return JSON.parse(res.getContentText()).access_token;
}

function base64url_(str) { return base64urlBytes_(Utilities.newBlob(str).getBytes()); }
function base64urlBytes_(bytes) {
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}
