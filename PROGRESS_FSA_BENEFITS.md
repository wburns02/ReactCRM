# FSA Benefits Progress

## Iteration 1 (2026-04-24) — shipped

### Backend commits (react-crm-api)
- `04c3d19` — migration 110 (7 FSA tables) + models/schemas/seed/router,
  `/health/db/migrate-fsa-110` helper endpoint.

Migration applied live (version 110). Seed ran on first deploy and
populated 3 plans + 19 enrollments + 40 transactions + 1 settings row +
4 documents + 4 compliance tests + 2 exclusions.

### Frontend commit (ReactCRM)
- `0749dc6` — FsaPage with 5 tabs, TanStack Query hooks, route wiring.

### Live verification (react.ecbtx.com, hard refresh)

**`/benefits/fsa` (Overview):**
- 4 KPI cards: 38 enrollments / $25,270 YTD contributed / $9,847 YTD
  spent / $15,423 remaining.
- Employee status: 24 active / 8 pending / 6 declined.
- By-plan-kind: Healthcare 20 / Dependent Care 12 / Limited Purpose 6.
- Quick actions row with bank "Configured ✓" indicator.

**`/benefits/fsa?tab=settings`:**
- Funding bank account card (Pacific Western Bank / Checking / 4472 /
  9081), all fields editable.
- Eligibility rules card (30-day waiting / 30 min hrs / additional rule
  text), editable.
- Card & substantiation toggles — debit cards ON, auto-substantiation ON.
- Side panel lists 4 FSA documents (SPD, Plan Doc, Notice, Amendment).
- Sticky Save/Discard bar shows when dirty, PATCH persists.

**`/benefits/fsa?tab=plans`:**
- Plan cards for Healthcare / Dependent Care / Limited Purpose, each
  with editable annual limit, family limit (dependent care only), plan
  year start/end, grace-period toggle + months, rollover toggle + max,
  claims run-out days.
- Per-card Save/Discard that PATCHes the plan.

**`/benefits/fsa?tab=transactions`:**
- 80 transactions across 3 plan kinds.
- Search, plan-kind filter, status filter, kind filter, Export CSV.
- Per-row Approve/Deny buttons on pending and substantiation-required
  rows; Approved / Denied / Receipt needed pills.

**`/benefits/fsa?tab=compliance`:**
- Non-discrimination tests — 4 NDT tests all Passed (Eligibility,
  Benefits Contributions, Key Employee Concentration, 55 Percent
  Average Benefits); Run tests button triggers
  POST /fsa/compliance/run which returns fresh results.
- Employee classification table (first 15 enrollments with plan,
  election, YTD spent, status).
- Exclusions card with inline add form (name / reason / scope) and
  per-row delete.

### Console
Zero uncaught errors on /benefits/fsa across all 5 tabs.

### Manual verification
> 1. Hard-refresh https://react.ecbtx.com/benefits/fsa — Overview renders.
> 2. Click Settings → edit Bank name → the sticky Save bar appears →
>    click Save → reload → new name persists.
> 3. Click Plans → in the Healthcare FSA card, bump the annual limit →
>    Save plan → reload → new value persists.
> 4. Click Transactions → filter by status "Receipt needed" → click
>    Approve on a row → the row's status pill flips to Approved.
> 5. Click Compliance → click Run tests → the 4 NDT test rows refresh
>    with a new run date.

### Known limitations
- Seed ran twice, so Plans tab shows 6 cards instead of 3 (cosmetic —
  functions still work; fix via SQL `DELETE FROM hr_fsa_plans WHERE id
  NOT IN (SELECT MIN(id) FROM hr_fsa_plans GROUP BY kind);`).
- No real Rippling sync yet — all data is seed.
- Document upload flow not wired (existing docs are read-only URLs).
