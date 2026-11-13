# MaidMatch — AI Migration Rules (Persistent Context)

> **Install this file as `CLAUDE.md` (repo root) for Claude Code, and as
> `.github/copilot-instructions.md` for GitHub Copilot. Both front-end and
> back-end repos get their own copy. This file is loaded into every AI session
> for the whole duration of the migration. Do not edit it per-module.**

---

## 0. What this migration is

We are **overwriting** the existing MaidMatch codebase with a new specification
package. We are **not** rewriting from scratch.

The existing codebase is already optimised, secured, and free of dead legacy
code. Its value is the **interconnection layer** — chat, notifications,
WhatsApp, metadata, caching, auth, deployment — which is not, and cannot be,
fully described in any document. That layer stays.

What changes is **logic and UI**, module by module, then section by section,
driven by the specification package.

**You are not being asked to be conservative. You are being asked to be
accurate.** If the new spec contradicts the fundamentals of how a module works
today, change the fundamentals.

---

## 1. Sources of truth, in strict order

When two sources disagree, the higher one wins. Always. No exceptions, no
averaging, no "both could be valid".

| Rank | Source | Notes |
|---|---|---|
| 1 | **The newest document/package by date** | Most recently issued reform doc or top-up |
| 2 | Earlier documents in the current package | The HTML/MD/JSON bundle |
| 3 | Existing code | Only where no document speaks |
| 4 | Your own inference | Only to *connect* things, never to *invent* things |

### 1.1 The conflict rule (non-negotiable)

> **The latest logic and the latest UI always have the upper hand.**

Concretely:

- Status list had 9 values, new doc says 12 → **it is 12**.
- Status list had 10 values, new doc says 9 → **it is 9**. Delete the extra
  one and everything that referenced it.
- A field was mandatory, new doc shows it optional → **it is optional**.
- A whole flow existed, new doc has no such flow → **the flow is removed**.
  Example already in force: **"Add Worker" is no longer a flow. There is only
  "Send Registration."** Do not preserve Add Worker anywhere — not the route,
  not the button, not the controller, not the permission, not the
  notification, not the test.
- Field labels, ordering, grouping, empty states, error copy, and micro-
  interactions in the HTML are **binding**, not illustrative.

### 1.2 When the documents genuinely do not say

Do **not** guess and do **not** silently keep the old behaviour as if it were
confirmed. Keep the old behaviour, mark it, and report it:

```
// @migration-unspecified(<module>): spec is silent on <behaviour>.
// Retained existing behaviour. Confirm with product before release.
```

Every one of these goes into `MIGRATION_OPEN_POINTS.md` at repo root with
module, file, line, and the question in one sentence. That file is the
handover back to product. An empty entry list is a red flag, not a win.

### 1.3 Never invent

You will not invent statuses, field names, roles, permissions, endpoints,
notification copy, or transitions. If it is not in the package and not in the
code, it does not exist. Inventing a plausible-looking status is the single
most damaging thing you can do in this migration, because it will look correct
in review and fail in production.

---

## 2. What you must not break

These are the parts the documents do not describe and cannot regenerate. Treat
them as load-bearing. You may **re-point** them; you may not **rebuild** them.

1. **Chat system and its layers** — thread types, layer model, participant
   resolution, read state, attachment handling.
2. **Chat → notification triggering** — which chat event raises which
   notification, to whom, on which channel.
3. **Notification infrastructure** — push (iOS/Android), in-app, email,
   template resolution, multi-language (EN / zh-HK / zh-CN / id-ID),
   deep-linking into app screens and public web fallback.
4. **WhatsApp messaging** — send pipeline, templates, deep-link vs public-web
   link branching, the wiring from admin-panel actions to mobile-side delivery.
5. **Metadata model** at Worker, Employer, Job Offer, and Contract level — the
   shared attribute spine every module reads from.
6. **Ownership / assignment plumbing** — CS, Partner/PT, Interpreter, branch
   resolution, and the change-owner path.
7. **Auth, roles, session, permission enforcement middleware** — the *rules*
   change with the spec; the *enforcement mechanism* does not.
8. **Caching, query optimisation, indexes, security hardening** already in
   place.
9. **Build, CI, environment config, deployment.**

If a module rewrite would require changing one of these, **stop and report it**
before writing the change. Put it in `MIGRATION_OPEN_POINTS.md` under
`### BLOCKING`.

---

## 3. How a module is migrated

Always this order. Never start writing at step 1.

### Step A — Read before writing
Read the module's MD (logic), its HTML (UI + micro-interactions), and its JSON
(data shapes / enums / config) **completely** before touching code. Then read
the existing module code completely.

### Step B — Produce the delta, and show it
Before editing anything, output a delta table for the module:

| # | Area / section | Old behaviour | New behaviour | Class | Blast radius |
|---|---|---|---|---|---|

`Class` is one of: **NEW**, **REPLACES**, **AMENDS**, **REMOVES**, **UNCHANGED**.

`Blast radius` names every *other* module, table, endpoint, notification, chat
thread type, or mobile screen the change reaches.

**Wait for the developer to confirm the delta table before you edit code.**

### Step C — Classify the module by change magnitude
Percentages are decided from the delta table, not from feel.

- **≥ 60% changed** (e.g. Insurance, ~80%): delete the changed portion
  outright and build it new against the spec. Keep only the ~20% that is
  interconnection. Do not try to patch your way there — patching a
  heavily-changed module produces hybrid logic that is worse than either
  version.
- **20–60% changed**: surgical section-by-section replacement.
- **≤ 20% changed** (e.g. Invoice, ~5–10%; Chat): targeted edits only. Do not
  refactor. Do not reformat. Do not "improve while you're in there." These
  modules are 90–95% done and working; churn here is pure risk.

### Step D — Overwrite, section by section
Within the module, work one section at a time. A section is a screen, a tab, a
panel, or one coherent API surface. After each section:
- the code compiles / the app builds,
- the section's own tests pass,
- you have not left both old and new versions of the same logic in the tree.

Commit per section, message format:
`migrate(<module>/<section>): <REPLACES|NEW|REMOVES> — <one line>`

### Step E — Propagate
Immediately after the section, update everything in its blast radius:
DB schema and migration, API contract, admin panel, mobile app, notification
templates, chat triggers, permission matrix, seed/fixture data, tests, types.
A section is not done until its blast radius is done. **Do not batch this to
the end.** Deferred propagation is how the two halves of the system drift
apart.

---

## 4. Cross-module consistency (the "connection aware" requirement)

The record written by one module is read by another. Every change must hold
across the whole chain, not just where you edited.

Before declaring any module complete, verify each of these end to end:

1. **Enum parity** — every status, type, and role enum has exactly one
   definition. Same values, same casing, same ordering in: DB, back-end model,
   API serializer, admin panel front-end, mobile app, notification templates,
   filters, and any report or export. If you removed a value, find every
   consumer of it.
2. **Write/read contract** — for every record this module writes, locate every
   reader. A field renamed, retyped, made nullable, or dropped must be handled
   at every read site.
3. **State machine integrity** — no state is unreachable; no state is a dead
   end unless the spec says it terminates; every transition has a trigger, an
   actor, and a permission.
4. **Trigger chain** — action → state change → notification → chat → WhatsApp
   → deep link → destination screen. Walk the whole chain and confirm the
   destination screen still exists under the new UI. A deep link to a removed
   screen is a silent production failure.
5. **Permission coherence** — every new action, screen, and field has an entry
   in the permission matrix for every role. No action is reachable by a role
   the spec does not grant it to. No role loses access the spec still grants.
6. **Date/derivation coherence** — computed dates and derived statuses
   (availability, expiry-driven states, profile completeness, eligibility
   windows) recompute correctly under the new rules and are consistent
   wherever they are displayed.
7. **Naming** — the product is **MaidMatch**. Some source documents carry
   "MatchCare" in headers and body text. That is an error in those documents.
   Never introduce "MatchCare" into code, comments, copy, config, or
   identifiers.

---

## 5. Stale removal

Removal is part of the migration, not a later favour.

When the spec removes something, remove **all** of it in the same section
commit: route, controller, service, model field, DB column (via migration),
UI component, navigation entry, permission, notification template, WhatsApp
template, chat trigger, translation strings, deep-link handler, feature flag,
constant, type, fixture, and test.

Never do any of these:
- comment code out instead of deleting it,
- rename to `*_old` / `*_v1` / `*_deprecated` and leave it in the tree,
- keep a branch of logic behind `if (legacy)`,
- keep a dead enum value "just in case",
- keep an orphaned translation key.

Git is the archive. The working tree carries present-day truth only.

---

## 6. Iteration — this package is not the last one

Five to ten further reform documents are expected. Treat this as a repeatable
methodology, not a one-off.

- Each new package is a **top-up**, and it **outranks everything before it**,
  including work you completed yesterday.
- When a top-up arrives, re-run this same cycle for the modules it touches.
  Do not argue from what was already built.
- Keep `MIGRATION_LOG.md` at repo root, appended per module:
  package version, module, sections touched, classes applied, blast radius
  handled, open points raised. This is how the next iteration knows what state
  it is inheriting.
- The mobile apps (iOS / Android) are also under active QA-driven change.
  Assume mobile-side spec churn and keep app-facing contracts explicit.

---

## 7. Working rules for the AI session

- **Never edit a file you have not read in full** in this session.
- **Never regenerate a file from memory of the docs.** Read it, then edit it.
- **One module at a time. One section at a time.** Do not open a second module
  while one is in flight.
- **Do not refactor outside the section you were asked to change.** No
  opportunistic renames, no formatter runs across untouched files, no
  dependency upgrades.
- **If the instruction and the spec disagree, the spec wins** — say so and
  continue.
- **If you are more than ~20% unsure what the spec means, stop and ask.** A
  question costs minutes; a wrong-but-plausible implementation costs a release.
- At the end of every section, state plainly: what changed, what in the blast
  radius you updated, what you removed, and what you could not resolve.

## Testing rule (mandatory)

Set by the product owner on 26 Oct 2026. Applies to every change in every MaidMatch repo (contract, insurance-api,
settings-api, admin-api, processing, hrms, scheduler, chat, admin-pdf, mobile-api, admin), by people and by AI sessions.

### After every fix

1. Run the full test suite of the changed repo, and of every repo that calls it or shares the tables it changed. Find
   them by searching the other repos for this service's URL variable / route paths and for the changed table names.
2. When runtime code changed, replay the affected module's endpoints on the code before and after the change, and
   compare the responses.
3. Run the type check (TypeScript repos) or the build (admin).
4. Add a test that proves the fix: it fails on the old code and passes on the new.
5. Report a before / after table: per repo, tests run, passed, failed, and type-check errors.
6. If anything new fails, stop and report it. Do not continue, commit or push around it.

### Before any push

1. `git fetch`, then show `git log origin/<branch>..HEAD`.
2. Confirm it holds no unexpected team commits; name any that are there.
3. Run the "After every fix" checks for every affected repo.
4. Wait for the owner's explicit "push".

### Known failing baseline (must not grow)

Measured 26 Oct 2026. A failure outside this list, or more failures in a listed file, is a new failure.

| Repo | Failing tests |
|---|---|
| processing | 6, all in `tests/get.message.test.ts` (QA-02: yaml-only vs locale-key message rule, awaiting a ruling) |
| admin-api | 36 in 10 files (35 known + TEAM-27-3), measured 5 Nov 2026. Known 35 (QA-03, stale mocks): `src/jobs/jobs.spec.ts`, `src/misc/misc.spec.ts`, `src/processing/processing.spec.ts`, `src/staff/staff.spec.ts`, `src/worker/worker.spec.ts`, `src/worker/worker-match.spec.ts`, `src/worker/worker-partner.spec.ts`, `src/worker/worker-save.spec.ts`, `src/worker/worker-slice2.spec.ts`, `src/worker/worker-write.spec.ts`. TEAM-27-3 (team item, as TEAM-27-1): `src/processing/processing.spec.ts` › "details › contract keys overwrite doc keys (id/status), group is attached", from team commit 151c11b (Priyanka, 4 Nov, `processing-group.ts`), merged by 30f3cf3; that file fails 7 either way (MIGRATION_LOG.md, 5 Nov) |
| contract | 2, both in `tests/invoice.insurance.cascade.test.ts` ("each user-driven trigger sends exactly one event for an anchor invoice", "payload: ref, trigger, effective date (HK), actor — never an insurance status"), measured 5 Nov 2026. TEAM-27-1 (team item, do not touch): team commit da6a9a8 (Priyanka, 28 Oct) hard-codes `getHostType("staging")` in `src/utils/notify.insurance.invoice.event.utils.ts` (PK-02 P2-08) |
| admin | 2 failing files: invoicePaymentFields, invoiceUiList — measured 3 Nov 2026 after b54d1ec12 (numericSpinners and priceListRetiredKeys fixed by the merge) |
| admin | Recorded by the owner on 2 Nov 2026 as **6 known + 2 team (`numericSpinners`, `invoicePaymentFields`)** until the team fixes them. Failing on 2 Nov: `src/__test__/invoice/invoiceUiList.test.js` (1, sticky selection column), `src/__test__/settings/numericSpinners.test.js` (1, reads `price-list/promotions/PromotionFormModal.js`, removed 28 Oct), `src/__test__/invoice/invoicePaymentFields.test.js` (1, Visa: Transaction Reference input normalised since b937d4126). `utils.test.js` (3) and `components/App.test.js` (1) pass since 31 Oct (CH 475): a failure there again is new. `settings/priceListRetiredKeys.test.js` (1) is not in this baseline: awaiting a ruling (QA-27, 2 Nov) |
| every other repo | none (settings-api skips 7 snapshot tests unless `SNAPSHOT_BASE_URL` points at a local copy) |

Type-check errors that already exist, under the same rule: contract 125, hrms 7, scheduler 11, processing 16,
admin-pdf 6, insurance-api 4, admin-api 0, mobile-api 0. settings-api and chat are JavaScript (no type check); admin is
checked by its build. processing and hrms corrected 12 Nov 2026, measured on a clean export of every first-parent commit:
processing 8 -> 18 on 26 Oct by team commit 566e894 (10 x TS2698 in `deployment.controller.ts` / `medical.controller.ts`,
merged by 9a33f0e), 18 -> 16 on 10 Nov by team commit e59008b (`envs.s3.bucket_url` defaults to '', merged by 750bb4a);
hrms 11 -> 5 on 30 Oct by d4af287 (QA-27-014, `contract.invoice.model.ts`), 5 -> 7 on 5 Nov by merge cf971bd, which lost
`branchScope` in `reports.services.ts` (TEAM-HRMS-1: back to 5 when the team's fix lands).

### Local only

Test on local databases and local copies only. Never run tests, endpoint replays or migrations against staging or
production.

Every harness, script or launcher that starts a service (for a test, a replay, a scheduler run or a migration) must first
resolve the database host that service will really use, reading its own `.env` the way the service does (the plain
`DB_*` names as well as any `*_LOCAL` ones, after every override), and refuse to start unless the host is `127.0.0.1` or
`localhost`. Once started, prove it: the local database must show the service's own activity (for example a new ledger
row) within a minute, or stop the service. Added after the 2 Nov 2026 incident, when a scheduler copy started by a test
harness read its own `.env` and connected to staging for about 18 minutes (`invoice-doc-new-functional/MIGRATION_LOG.md`).

### In this repo (admin)

- Tests: `CI=true npx craco test --watchAll=false`, with the contract repo checked out next to this one or `CONTRACT_API_DIR` set, so the Invoice parity suites run (baseline: 2 failing files, above).
- Type check / build: build `npm run build`.
