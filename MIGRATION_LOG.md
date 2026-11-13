# MIGRATION_LOG — maidmatch-admin-reactjs

Appended per module and section (CLAUDE.md §6). Newest entry last.

---

## 12 Nov 2026 · Send Template configuration · S3 template form, recipient, Categories tab

Package: 10 Nov 2026 standalone developer handoff (Send Template: TM01–TM06, F-16, Category_Field_Contract.json). The delta is
in `E:\xampp\htdocs\send-template-doc-new-functional\SEND_TEMPLATE_DELTA_2026-11-11.md`, confirmed 12 Nov with rulings Q1–Q12.
The server side is settings-api S1 6955721 + S2 a05caa3; this admin section must deploy with S2.

| Row | Class | Change |
|---|---|---|
| 3 | AMENDS + NEW field | **Settings → Send Template Manager → New / Edit Template:**<br>• a read-only category panel: sending mode, channels, recipients, required languages with the ones the library lacks, package status, send sites, package notes<br>• a required **Recipient** (the category's variants; selected when there is one; none for internal presets)<br>• the dynamic-field picker lists only that recipient's fields, grouped by family, masked / last-four marked, and inserts the package target token (`{{ worker_first_name }}`)<br>• a refused save (422) names the fields beside the editor and stays on the form<br>The form no longer reads the shared per-module `dynamicFieldList`. |
| 4 | NEW | **Send Template Manager tabs: Templates · Categories** (`?tab=categories`, same route and `view_template` gate). Categories lists every category read-only: mode, channels, recipients, required languages vs the library, templates per language, send sites, status, inactive flag, module filter. A row opens the configuration with each recipient's fields. |
| 3 (blast radius) | AMENDS | **Global Chat template form** (`components/template-form/AddEditTemplateFormChat.js`): the same Recipient and recipient-scoped picker. A rejected save is no longer reported as saved: the rejected payload has no `status`, so it used to toast success and close. It now keeps the form open with the reason. |

**Shared code.** `newui/templates/templateConfiguration.js` (the configuration hook, labels, field grouping, refusal text) and
`TemplateCategoryPanel.js`, used by both forms and the Categories tab. Services: `getTemplateConfiguration`,
`getTemplateConfigurationList` (settings-api S1 endpoints).

**Locales.** 41 `key_st_*` keys in `public/locales/en` + `zh_HK` (English in zh_HK until translated, ruling Q10). The fallback
snapshot is a subset and is not touched.

**Tests.** `src/__test__/settings/sendTemplateConfiguration.test.js` (7): panel, recipient-scoped fields (no Employer HKID for
the Worker), recipient required, refusal named, single / internal, Categories tab and dialog, Global Chat form. They fail on
the old code: the Categories view, the configuration module and the Recipient field are absent.

**Checks.**
- Full suite: 1544 tests, 1528 passed, 12 todo, 4 failing files. Those files are the 2 baseline files (`invoicePaymentFields`,
  `invoiceUiList`) and the 2 team files from the 11 Nov `aiui` merge (`myProfileHeader`, `priceListRetiredKeys`); they are the
  same on the unchanged HEAD.
- Build: compiles with 31 warnings, none in a changed file.
- The first build stopped on a stale dev-server `.eslintcache` for the chat form; the cache was refreshed with eslint.

**Not verified in a browser.** The local admin's settings-api points at staging, so the screens were exercised through the
tests only.

---

## 12 Nov 2026 · Send Template configuration · S6 shared composer and its openers

Same package and delta (row 8: TM01 recipient, TM03 missing values block Send, TM05 languages, TM06 content needed, F-21
WhatsApp window, F-24 private templates). It runs on settings-api S5 3edef5b (preview, send-message with site + record).

| Row | Class | Change |
|---|---|---|
| 8 | AMENDS | **The shared composer** (`WkdSendTemplateModal`) takes the screen's send site, the exact record (`context`) and the record's parties:<br>• **Send to**: the category's recipient variants the record has a party for; payment-purpose variants never (no site carries an invoice, OP-ST-07)<br>• **Templates**: that recipient's templates in each language; private ones only for their creator (server filter); none → "Content needed"<br>• **Body**: the server's preview, shown as read-only text; fields without a value, outside the recipient or unknown are listed and Send stays disabled; a refused preview shows the server's reason; a record without the recipient's account cannot send<br>• **Channels**: the server's (category ∩ site; the record's CS in-app only)<br>• **WhatsApp outside the 24-hour window** is refused before anything is sent (F-21), with the Global Chat wording (OP-ST-14)<br>• **Send** posts only site, template, channel and record; the chat delivery goes to the account and body the server returns<br>• **Action Required** sites hand the server's body to the Action Required route<br>The English-fallback warning, the read-only body and Copy / Open WhatsApp stay. |
| 8 (blast radius) | AMENDS | **Every opener names its site and record**:<br>• Worker Basic / Passport / Consulate ST-08/09/10<br>• Biodata ST-01, Photo ST-02, Doc Review ST-03 (Philippines) / ST-05 (Indonesia)<br>• Worker Job Offer tab X-03<br>• Change Partner inquiry ST-04 / ST-06 (held by the server until S10)<br>• Contract stage panels ST-11, the rail X-07, a Calendar task arrival X-08, Extend Visa X-09<br>• Employer Basic / Family ST-12/13<br>• Job Offer Share X-04 and Share worker X-05<br>The site codes have one definition: `SEND_SITE` in `newui/templates/templateConfiguration.js`. |
| 8 / 9 | AMENDS | A Contract send offers the contract's worker, employer and CS, limited by the category (row 9's picker); the Share categories therefore offer Worker / CS only. A Job Offer Share offers the employer and the Job Offer's CS where the category has them (row 10). |
| 8 | REMOVES | **The client value maps** that only fed the composer: `useProcessingTemplateMapping` (+ its test) and its prop through ProcessingDetail and every stage tab; `buildTemplateMapping` (Job Offer / Employer); the E-Visa share map (the visa reference now resolves on the server); the Job Offer share-worker token map (only the generated profile link travels, as `context.links`); the employer / processing dynamic-field thunks, reducers and state; the composer props `userId`, `send_to`, `employee_worker_id`, `contractId`, `fullname`, `recipientLabel`, `workerInfoDetails`, `workerInfoMapping`, `action`; the unused fields of `CR_TASK_SEND_TEMPLATE`, `JO_SEND_TEMPLATE`, `JO_SHARE_WORKER_TEMPLATE`, `PARTNER_INQUIRY_TEMPLATE`. |

**Kept on purpose.** The worker page still builds `workerInfoMapping` for the legacy Assign Partner inquiry (`AssignPT` →
`TemplateFormWhatsApp`), which S10 rebuilds (ruling Q5); Global Chat keeps its own map until S8. The worker dynamic-field
list stays for that map.

**Locales.** `key_st_content_needed`, `key_st_no_recipient`, `key_st_recipient_unavailable`, `key_st_wa_window_closed_hint`
in `en` + `zh_HK` (English in zh_HK until translated, ruling Q10).

**Tests.** `src/__test__/settings/sendTemplateComposer.test.js` (15): Send to, per-recipient lists, Content needed, automatic
category, server preview, missing / not-allowed / unknown fields, refused preview, no account, the send payload, the chat
delivery, the WhatsApp window, a refused send, Action Required, every opener's site and record. On the code before S6
(0aaaa6c9b) the file fails (see the numbers below). `processing/sendTemplateContractId.test.js` (the old payload) and
`processing/templateMapping.test.js` (the removed map) are deleted; the employer tests lose their stale dynamic-field mocks.

**Release.**
- Deploy with settings-api S5 and with S7 / S8. The old composer payload is refused from S5.
- **The partner inquiry is unavailable from S5 until S10**: the legacy Assign Partner popup still posts the old payload, and
  the server holds ST-04 / ST-06 until the inquiry route is built. S10 must ship in the same release.

---

## 12 Nov 2026 · Send Template configuration · S7 sites: the rail and Calendar choose their category; the Pick Up footer

Same package and delta (row 9). Package, sites X-07 / X-08: "Task shortcut retains neutral eligible template selection; no
fixed Contract/payment template without its exact source context." Server part: settings-api S7 dd02d41 (send-site read +
migration linking X-07 / X-08 to the stage categories).

| Row | Class | Change |
|---|---|---|
| 9 | AMENDS | **The composer chooses its category when the screen fixes none:** a "Category" select lists the site's hand-sent categories (`GET /template/send-site`), one is chosen for the sender when the site has only one, and none says so (`key_st_no_category`). The chosen category's module drives the template list; everything else is S6's composer. |
| 9 | AMENDS | **Contract rail (X-07) and a Calendar task arrival (X-08)** open the composer with no fixed category (the Contract category was fixed before). `CR_TASK_SEND_TEMPLATE` keeps only its module. |
| 9 | AMENDS | **Pick Up footer** sends Deployment Pickup (70, ruling Q8); it asked for `processing_deployment`, which names no category. The Share button keeps 43. |

**Audit.** Every other opener's category is linked to its site (S5 refuses an unlinked pair); see settings-api S7.

**Tests.** `src/__test__/settings/sendTemplateComposer.test.js` 15 → 18: the rail's category choice, one / no category,
the rail opener and the Pick Up slugs. On 086ef2b2d the three new tests fail and the 15 pass.

**Checks** (run on an export of exactly HEAD + S7, so another session's uncommitted Insurance work in this checkout is not
measured):
- Full suite: 1571 tests, 4 failing files, the same as before S7 (the 2 baseline files, `priceListRetiredKeys`,
  `myProfileHeader`). A first run in parallel with other suites timed out four invoice files; they pass alone (39 tests).
- Build: compiles.

**Release.** Deploy with settings-api S7 (migration 2026-11-12_send_template_rail_calendar_sites) and S5–S6 / S8 / S10.
**Open point raised:** OP-ST-16 (Share categories sent from the rail / Calendar are not recorded as shared).

---

## 12 Nov 2026 · Send Template configuration · S8 Global Chat composer

Same package and delta (row 12; F-13). Server part: settings-api S8 0288b8c (`/send-site?code=X-01` with party + record).

| Row | Class | Change |
|---|---|---|
| 12 | AMENDS | **Global Chat Send Template** (`GcSendTemplateModal`):<br>• Category lists only what the server offers this sender for the conversation's party and record. A staff or team conversation offers none and says so.<br>• Template lists the party's own templates per language; the English fallback stays named.<br>• Body is the server's preview; missing / out-of-recipient / unknown fields block Send, and a refused preview shows the server's reason.<br>• Channels are the conversation's, within the server's.<br>• Send posts only site X-01, template, channel and record, awaits it, then hands the chat the server's body and account. The F-21 WhatsApp-window block is unchanged. |
| 12 | AMENDS | **Share → Send Template** (`GlobalChat`): the generated link travels with the shared Job Offer (worker conversation) or worker + Job Offer (employer conversation) as the send's record context. |
| 12 | REMOVES | The "[Not Available]" fill and its warning, the +7-day `scheduled_date`, the client token map (`gcTemplateTokens` + test), `gcResolveTemplate` / `gcMissingContextLabels`, and the keys `key_gc_tpl_empty_fields`, `key_gc_tpl_not_available`, `key_template_requires`, `key_context_missing_copy`. |

**Tests.** `src/__test__/chat/gcSendTemplate.test.js` (9); all fail on 59d79f3e9. `gcTemplateTokens.test.js` (6) is removed
with its module.

**Checks** (an export of exactly HEAD 59d79f3e9 + S8):
- Full suite: 1574 tests, 4 failing files, the same as before.
- Build: compiles.

Another session committed five Insurance commits on this branch meanwhile (079f14ebe…d283596cf). S8 overlaps them only in
`en/translation.json`; S8 was staged on top of them with only its four removals.

**Release.** Deploy with settings-api S8 and S5–S7 / S10.

---

## 12 Nov 2026 · Send Template configuration · S9 version history and the send outcome

Same package and delta (row 13; F-30 / TM06: every edit is a new version, a send keeps the version it used, delivery is
distinct from the attempt). Server part: settings-api S9 3bfd53f (versions table, send-outcome and versions endpoints).

| Row | Class | Change |
|---|---|---|
| 13 | NEW | **Version history** on the template edit page (`TemplateVersionHistory`, under the attachment): the template's versions, newest first, each with its number, time, saver, exact text and attachment; version 1 of a template saved before history began is marked so. Read-only: no edit, restore or delete. Not shown on a new template. |
| 13 | AMENDS | **Both composers** (`WkdSendTemplateModal`, `GcSendTemplateModal`): after the chat delivery they report its result for the logged send — delivered, or failed with the chat's reason (≤ 255 characters). The report never blocks or changes the sender's flow; a refused send reports nothing (no log row). |

**Services.** `reportSendOutcome` → `settings/template/send-outcome`, `getTemplateVersions` → `settings/template/versions`.
`useTemplateForm` exposes the template id.

**Locales.** `key_st_version_history` ("Version history", the package's), `key_st_version`, `key_st_saved_by`,
`key_st_version_backfill` in `en` + `zh_HK` (English in zh_HK until translated, ruling Q10). The copy is open point
OP-ST-18 (settings-api).

**Tests.**
- `src/__test__/settings/templateVersionHistory.test.js` (4): the list, read-only, nothing for a new template or a failed
  read, the page and services.
- `sendTemplateComposer` + 1 and `chat/gcSendTemplate` + 1: delivered / failed reports, none for a refused send.
- On the code before S9 (HEAD dce71e6c0, the same code as bffaef59f) all three files fail.

**Release.** Deploy with settings-api S9 (its migration runs first) and S5–S8 / S10. Open point OP-ST-17: "delivered"
means the chat service accepted the message, as the sender's screen reports it.

---

## 12 Nov 2026 · Send Template configuration · S10b Change Onboarding 2 sends nothing

S10 delta confirmed 12 Nov 2026 (row 7; ruling Q6). Package, site X-06 / correction TC08: changing Onboarding 2 is not
the Partner assignment event, and category 65 does not belong to it. Server part: settings-api S10b (the X-06 → 65 link
removed).

| Row | Class | Change |
|---|---|---|
| 7 | REMOVES | **Change Onboarding 2** (`WkdChangeOwnerDialog`): no longer fetches category 65's template or sends it in-app to the worker after the owner changes. The owner change itself is unchanged. `ONBOARDING2_AUTO_MESSAGE` is removed. |

**Tests.** `worker/partnerAutoMessageName.test.js`: the Change Onboarding 2 case now proves the owner changes and nothing
is fetched or sent; it fails on 7485318e9. The file's legacy Assign Partner case is replaced in S10a.

**Release.** Deploy with settings-api S10b and S10a. Category 65 is sent again only after an actual assignment (S10a,
ruling A).

---

## 12 Nov 2026 · Send Template configuration · S10a Partner inquiry, and 65 after the actual assignment

S10 delta confirmed 12 Nov 2026 (rows 1–6). Rulings:
- **Q5:** the inquiry never assigns; it sends the approved WhatsApp inquiry; 11 / 22 leave it.
- **A:** 65 moves to the Assign action.
- **B:** a worker without a code reads "Not Assigned" in the inquiry.

Package REF-PERM "Partner inquiry and assignment notifications", F-12, ST-04 / ST-06, TC01–TC07. Server part: settings-api
S10a 9c5b78c (the inquiry sites lose 11 / 22 / 65).

The approved inquiry was already there: the legacy form sent the Meta-approved WhatsApp template `assign_pt` (worker
name, nationality, worker code) through chat's `send-template-message-assign-partner`, but only after assigning the PT
and before sending 65 to the worker.

| Row | Class | Change |
|---|---|---|
| 1 | REPLACES | **Send inquiry on Assign Partner / Assign PT** (`AssignPT`) opens `WkdPartnerInquiryDialog`:<br>• It shows the PT, agency, branch and WhatsApp number, and the worker's name, nationality and code ("Not Assigned" before assignment).<br>• It shows the approved `assign_pt` text with those values.<br>• It sends that template to the PT through chat. Nothing is assigned and no status changes; chat's message row, with its WhatsApp status, is the record.<br>• A refused send keeps the dialog open with chat's reason. Without the approved template, nothing can be sent. |
| 2 | REPLACES | **Send inquiry in Change Partner** (`WkdChangePartnerDialog`): the same dialog for the picked PT, once per PT. It used to open the S6 composer for ST-04 / ST-06 with categories 11 / 22, which the server held. |
| 3 | AMENDS | The inquiry needs the journey's Assign Partner — **Send Template** grant (`worker_<philippines\|indonesia>_worker_assign_partner` holds `send_template`; admin always). The header worker carries it as `canSendPartnerInquiry`. |
| 4 | AMENDS | **Assign** (both entry points) is unchanged, and then sends category 65 to the worker in-app: the English template for the worker, `{{ worker_full_name }}` filled, from the Onboarding 2 owner. That is the message the legacy inquiry sent after assigning (`partnerInquiry.sendPartnerAssignedMessage`). The header worker carries `onboarding2_user_id`. |
| 5 | REMOVES | The rest of the old inquiry path:<br>• `TemplateFormWhatsApp`: the `pt_assign` and "partner" branches (assign + `assign_pt` + 65), their 65 lookup, the partner Send-to radio and the props only they used.<br>• `SendTemplatePopup` stops forwarding those props, and the three chat screens stop passing `agencyInfo`.<br>• `PARTNER_INQUIRY_TEMPLATE` (the 11 / 22 slugs).<br>• The legacy merge map: `workerInfoMapping` in WorkerDetail → ProfileTab → AssignPT, and with it the worker dynamic-field list fetch (`fetchDynamicFieldList`, `dynamicFieldList` state and reducer, `getDynamicFieldList`, its path).<br>• The `sendTemplateMessagePTAssign` thunk; the dialog calls the service.<br>• `key_assign_pt_send_template`. |

The chat screens' own "Send WhatsApp template" (`TemplateFormWhatsApp` with `slug="whatsapp"`) is unchanged.

**Locales.** `key_wkr_inquiry_note`, `key_wkr_inquiry_unavailable` and `key_wkr_inquiry_sent` ("Partner assignment inquiry
sent to {name} · {branch} (WhatsApp)", the prototype's) in `en` + `zh_HK` (English in zh_HK, ruling Q10). The copy is
open point OP-ST-22.

**Tests.**
- New `worker/partnerInquiry.test.js` (7):
  - the dialog (content, exact chat payload, nothing assigned, refused send, no template);
  - the helpers and grant;
  - the 65 send;
  - Change Partner end to end (no inquiry without the grant; Assign then 65 from the Onboarding 2 owner; the inquiry with the grant assigns nothing);
  - the removals.
- It fails on 729d62e02 (the modules do not exist).
- `worker/partnerAutoMessageName.test.js` loses its legacy-form case.
- `worker/assignPtRefusal.test.js` passes unchanged.
- `settings/sendTemplateComposer.test.js`: its S6 opener check expected Change Partner to open the composer for ST-04 / ST-06.
  It now expects the inquiry dialog; the first full run caught it. `SEND_SITE` keeps ST-04 / ST-06: it mirrors the sites
  in `template_send_sites`.

**Open points** (settings-api MIGRATION_OPEN_POINTS): OP-ST-19 (65's channel), OP-ST-20 (the inquiry on the worker's
activity), OP-ST-21 (who sends 11 / 22), OP-ST-22 (copy).

**Release.** Deploy with settings-api S10a and S10b, and with S5–S9: from S5 until this section the partner inquiry was
unavailable.

---

## 12 Nov 2026 · Send Template configuration · UP02-a Action Required History: read-only, no empty conversation

Package 10 Nov 2026, UP02. The prototype (Worker_Details.html actionHistoryPanelHTML, item 7) derives the worker's chat
window from the outstanding sections and makes the history read-only. Delta §7.2. Rulings 12 Nov 2026:
- Admin and chat are built here; admin-api stays with the team.
- Chat may change (OP-ST-B1).

Server part: chat ad056f3 (the derived reply window, the refusal, find-only `create-conversation`).

| Row | Class | Change |
|---|---|---|
| 3 | AMENDS | **Opening the record's Action Required History** (`ActionChat`) never creates a conversation. Chat finds the existing one or answers none. With none, the drawer shows the prototype's empty state ("No pending tasks or reminders") and joins nothing. |
| 4 | NEW | **The window note**, from chat's `ar_window`: "{name} can send messages · N section(s) outstanding: …" while a section is in Action Required, else "{name} cannot send messages · … closed …". Then the "Read-only history" note. Both are prototype text. |
| 4 | REMOVES | **The history's composer and delete** (`ActionRequiredTab`, used only by this drawer): text box, emoji, attachment, send, media upload, the entity-link prefill and the Delete menu item. Files still open and download; new messages still arrive live. |

**Locales.** Nine `key_wkr_ar_*` keys (prototype text) in `en` + `zh_HK` (English in zh_HK, ruling Q10). Open point
OP-ST-24: the prototype text says "her" for every worker, and the drawer shows the full name.

**Tests.**
- `chat/actionRequiredHistory.test.js` (4): no conversation → find-only, empty state, closed note, nothing joined; open
  sections → thread and named sections; the note helper; nothing sent or deleted. It fails on bc4b90b8a.

**Release.** Deploy with chat ad056f3. Each needs the other: the drawer reads `data: null` / `ar_window`, and the old
drawer would create conversations against the new chat. The worker app's reply box is open point OP-ST-23.

---

## 12 Nov 2026 · Send Template configuration · UP02-b a delivery failure is shown apart from a failed save

Package 10 Nov 2026, UP02: "Commit the section decision and its durable explanation together. A later message-delivery
failure must be shown truthfully and distinguished from failure to save the decision." Acceptance: "cancel/failed save
leaves no orphan status or reason; later delivery failure is separately visible."

Delta §7.2 rows 1–2:
- Saving the decision and its reason together is admin-api's (the team; bf44c4b already requires the reason in the same
  transaction).
- This section is the composer's side.

| Row | Class | Change |
|---|---|---|
| 2 | AMENDS | **Action Required Send** (`WkdSendTemplateModal`). The composer now waits for chat's message after the decision is saved; it used to fire and forget.<br>• **Failed save:** the server's error shows and nothing else happens: no message, no refresh.<br>• **Saved and delivered:** as before (success, refresh, close).<br>• **Saved, message not delivered** (chat `success: false` or a rejected request): the section refreshes. The composer stays open with "Saved: the section is now in Action Required. The message to the worker was not delivered: {chat's reason}", and Send becomes **Resend message**, which sends the message only. |

**Not done here.** The Action Required send writes no `send_template_log` row: its delivery is shown, not recorded
(open point OP-ST-26).

**Locales.** `key_st_ar_saved_not_delivered`, `key_st_ar_resend`, `key_st_ar_message_sent` in `en` + `zh_HK` (ours;
OP-ST-26).

**Tests.** `settings/sendTemplateComposer.test.js` + 2:
- Undelivered after save: the notice with chat's reason; Resend sends the message only; the decision is saved once.
  It fails on 42361ffc1 (the code before UP02-b).
- Failed save: no message, no refresh, no notice. It also passes on 42361ffc1 (that path already sent nothing); it stays
  as a guard.

**Release.** With admin UP02-a and chat ad056f3.
