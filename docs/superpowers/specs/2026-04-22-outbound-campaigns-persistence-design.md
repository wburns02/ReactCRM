# Outbound Campaigns — Backend Persistence + Local Migration

**Date:** 2026-04-22
**Author:** Will Burns (brainstormed with Claude)
**Status:** Approved for implementation

---

## Problem

The Outbound Dialer ("Outbound Campaigns" page at `react.ecbtx.com/outbound-campaigns`) stores all state in Zustand with `persist` middleware writing to IndexedDB in each user's browser. There is no backend sync. As of 2026-04-22:

- Dannia Chavez (`dannia@macseptic.com`) completed 36 of 37 calls on the "Email Openers - Spring Follow-Up" campaign yesterday. 9 connected, 1 interested, 14 voicemail, 11 finalized. Her full work lives in her laptop's IndexedDB only.
- Will Burns opens the same page in his browser and sees 1 called, 0 connected, 1 finalized — his own browser's IndexedDB, untouched since the initial injection of the campaign.
- No reporting, coaching review, or team visibility is possible.
- Clearing Dannia's browser cache would destroy the work permanently.

## Goals

1. Move outbound-campaign state to the backend so all users see the same truth.
2. Recover Dannia's stranded dispositions on her next login without requiring her to do anything technical.
3. Preserve per-attempt history for future coaching and analytics.
4. Tag every disposition with the rep who made the call.

## Non-goals

- Persisting Dannia gamification/badges/audit log to the backend (stays client-side; not business-critical).
- Real-time WebSocket push (TanStack Query 30s refetch is sufficient).
- Contact-claiming to prevent double-dials (out of scope; `assigned_rep` column added but not enforced).
- Refactoring `PermitCampaignBuilder` beyond wiring it to the new API.

---

## Decisions locked during brainstorming

| # | Decision |
|---|----------|
| 1 | Shared state — one truth per contact across the team |
| 2 | Persist `useOutboundStore` + `useDanniaStore.callbacks`; skip gamification/audit |
| 3 | Migration uploads local-only-if-dirty (`call_attempts > 0` or `call_status ∉ {pending, queued}`); idempotent; per-browser localStorage flag |
| 4 | Append-only `outbound_call_attempts` log + flat summary on the contact row |
| 5 | Every attempt tagged with `rep_user_id = current_user.id` (Dannia's account exists) |
| 6 | TanStack Query: `refetchOnWindowFocus: true`, `staleTime: 30s` — no WebSocket |
| 7 | Alembic data migration seeds the Email Openers campaign + 39 contacts server-side; client `injectEmailOpenersCampaign()` is deleted |

---

## Data model

New tables in the `react-crm-api` Postgres database.

```sql
outbound_campaigns
  id              text PK           -- existing client IDs preserved (e.g., "email-openers-spring-2026")
  name            text not null
  description     text
  status          text not null     -- draft|active|paused|completed|archived
  source_file     text
  source_sheet    text
  created_by      uuid → users.id
  created_at      timestamptz default now()
  updated_at      timestamptz default now()

outbound_campaign_contacts
  id                    text PK   -- preserved (e.g., "email-opener-1")
  campaign_id           text → outbound_campaigns.id on delete cascade
  account_number        text
  account_name          text not null
  company               text
  phone                 text not null
  email                 text
  address               text
  city                  text
  state                 text
  zip_code              text
  service_zone          text
  system_type           text
  contract_type         text
  contract_status       text
  contract_start        date
  contract_end          date
  contract_value        numeric
  customer_type         text
  call_priority_label   text
  call_status           text not null default 'pending'
  call_attempts         int  not null default 0
  last_call_date        timestamptz
  last_call_duration    int
  last_disposition      text
  notes                 text
  callback_date         timestamptz
  assigned_rep          uuid → users.id
  priority              int  not null default 0
  opens                 int
  created_at            timestamptz default now()
  updated_at            timestamptz default now()
  index (campaign_id, call_status)
  index (phone)

outbound_call_attempts
  id                uuid PK default gen_random_uuid()
  contact_id        text → outbound_campaign_contacts.id on delete cascade
  campaign_id       text → outbound_campaigns.id
  rep_user_id       uuid → users.id
  dispositioned_at  timestamptz default now()
  call_status       text not null
  notes             text
  duration_sec      int
  index (contact_id, dispositioned_at)
  index (rep_user_id, dispositioned_at)

outbound_callbacks
  id                uuid PK default gen_random_uuid()
  contact_id        text → outbound_campaign_contacts.id on delete cascade
  campaign_id       text → outbound_campaigns.id
  rep_user_id       uuid → users.id
  scheduled_for     timestamptz not null
  notes             text
  status            text not null default 'scheduled'   -- scheduled|completed|missed|cancelled
  created_at        timestamptz default now()
  completed_at      timestamptz
  index (scheduled_for, status)
```

**Campaign counters (total/called/connected/interested/completed) are derived** by SQL aggregate on every read rather than stored and maintained. Removes drift risk; read cost is fine at scale of a few thousand contacts per campaign.

**ID types:** `outbound_campaigns.id` and `outbound_campaign_contacts.id` are **text, not UUID**. The existing client-generated stable IDs (`email-openers-spring-2026`, `email-opener-1`…`email-opener-39`, plus any `crypto.randomUUID()` strings from user-created campaigns) migrate directly without translation.

---

## API contract

All endpoints under `/api/v2/outbound-campaigns/*`, cookie-authenticated (matches the rest of v2). `rep_user_id` is always taken from `current_user`; never trusted from the client.

```
GET    /campaigns                          → { campaigns: [...] }   (incl. derived counters)
POST   /campaigns                          → 201 { campaign }
PATCH  /campaigns/{id}                     → 200 { campaign }
DELETE /campaigns/{id}                     → 204

GET    /campaigns/{id}/contacts?status=... → { contacts: [...] }
POST   /campaigns/{id}/contacts            → 201 { contacts: [...] }   (bulk import; body is list of partial contacts)
PATCH  /contacts/{id}                      → 200 { contact }           (edit mutable fields + notes)
DELETE /contacts/{id}                      → 204

POST   /contacts/{id}/dispositions         → 201 { contact, attempt }
       body: { call_status, notes?, duration_sec? }
       side effect: increments contact.call_attempts, updates last_*,
                    appends an outbound_call_attempts row with rep_user_id = current_user.id

POST   /callbacks                          → 201 { callback }
GET    /callbacks?rep=me&status=scheduled  → { callbacks: [...] }
PATCH  /callbacks/{id}                     → 200 { callback }
DELETE /callbacks/{id}                     → 204

POST   /migrate-local                      → 200 { imported: { campaigns, contacts, attempts, callbacks } }
       body: { campaigns: Campaign[], contacts: CampaignContact[], callbacks: Callback[] }
```

### `POST /migrate-local` semantics (critical)

Idempotent merge. Client sends its entire dirty-filtered local state. Server rules:

1. **Campaigns:** upsert by `id`. Insert if missing; no-op if exists (server is source of truth for campaign metadata).
2. **Contacts:** upsert by `id`. On conflict:
   - Insert if missing.
   - If existing **and** the incoming row is "dirty" (`call_attempts > 0` OR `call_status ∉ {pending, queued}`): overwrite `call_status`, `call_attempts`, `last_call_date`, `last_call_duration`, `last_disposition`, `notes`, `callback_date` from the incoming row. Other fields untouched.
   - If existing and not dirty: no-op.
3. **Attempts synthesis:** for every contact merged under rule 2's "dirty" path, synthesize one `outbound_call_attempts` row: `rep_user_id = current_user.id`, `dispositioned_at = incoming.last_call_date`, `call_status = incoming.call_status`, `notes = incoming.notes`. Only one per contact — we can't recover the true attempt-by-attempt history from IndexedDB because it was never recorded. This gives a lower-bound audit trail.
4. **Callbacks:** insert if no existing row with the same `(contact_id, scheduled_for)` tuple.

Re-running the endpoint is safe: second call produces zero new rows.

---

## Client refactor (`ReactCRM`)

### `useOutboundStore` shrinks to session/UI state

Kept in Zustand + IndexedDB persist:
```ts
{
  activeCampaignId, dialerContactIndex, dialerActive,
  danniaMode, autoDialEnabled, autoDialDelay, sortOrder,
  campaignAutomationConfigs
}
```
Removed: `campaigns`, `contacts`, and every action that mutates them. The store becomes a thin wrapper over UI preferences.

### New TanStack Query hooks — `src/api/hooks/useOutboundCampaigns.ts`

Queries:
- `useCampaigns()` — list with counters
- `useCampaign(id)` — single
- `useCampaignContacts(campaignId, filters)` — filtered contact list
- `useCallbacks(filters)`

Mutations:
- `useCreateCampaign`
- `useUpdateCampaign`
- `useDeleteCampaign`
- `useImportContacts(campaignId)`
- `useUpdateContact`
- `useDeleteContact`
- `useSetContactDisposition` — **optimistic update** on `['outbound-contacts', campaignId]` cache; rollback on error
- `useAddCallback`, `useUpdateCallback`, `useDeleteCallback`
- `useRunLocalMigration`

Query defaults: `staleTime: 30_000`, `refetchOnWindowFocus: true`, `refetchInterval: 30_000` when tab is visible.

### Refactored call sites

| File:Line | Old call | New call |
|---|---|---|
| `PowerDialer.tsx:438` | `store.setContactCallStatus(id, status, notes)` | `setDisposition.mutate({ contactId: id, call_status: status, notes })` |
| `PowerDialer.tsx:479` | `store.setContactCallStatus(id, 'skipped')` | same, with `call_status: 'skipped'` |
| `ContactTable.tsx:86` | `store.updateContact(id, fields)` | `updateContact.mutate({ contactId: id, ...fields })` |
| `ContactTable.tsx:206` | `store.setContactCallStatus(id, status)` | `setDisposition.mutate(...)` |
| `ContactTable.tsx:210` | `store.updateContact(id, { notes })` | `updateContact.mutate({ contactId: id, notes })` |
| `PermitCampaignBuilder.tsx:51` | `store.createCampaign(...)` + `store.importContacts(...)` | `createCampaign.mutateAsync(...)` → `importContacts.mutate(...)` |
| `ImportDialog.tsx` | `store.importContacts(...)` | `importContacts.mutate(...)` |

All Dannia-mode components (`AgentAssist`, `CallScriptPanel`, `PostCallReportModal`, etc.) that read campaign state switch from `useOutboundStore(s => s.contacts)` to `useCampaignContacts(...)`.

### `useDanniaStore` — callbacks extracted

Callbacks move out of `useDanniaStore` (IndexedDB) and behind `useCallbacks()` / `useAddCallback()`. Gamification, audit log, performance metrics, and DanniaModeConfig stay in the Dannia store for now.

### `injectEmailOpenersCampaign()` deleted

The function at `src/features/outbound-campaigns/store.ts:79-186` is removed entirely. The campaign now comes from the backend.

---

## Migration flow

New hook `src/features/outbound-campaigns/useLocalMigration.ts`, called from `OutboundCampaignsPage.tsx` on mount (behind a `useEffect` guard):

```ts
export function useLocalMigration() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (localStorage.getItem('outbound-v1-migrated') === 'true') return;

    (async () => {
      try {
        const local = await readZustandIndexedDB('outbound-campaigns-storage');
        if (!local?.state) {
          localStorage.setItem('outbound-v1-migrated', 'true');
          return;
        }

        const { campaigns = [], contacts = [] } = local.state;
        const dannia = await readZustandIndexedDB('dannia-store');
        const callbacks = dannia?.state?.callbacks ?? [];

        const dirtyContacts = contacts.filter(c =>
          c.call_attempts > 0 ||
          !['pending', 'queued'].includes(c.call_status)
        );

        if (dirtyContacts.length === 0 && callbacks.length === 0 && campaigns.length === 0) {
          localStorage.setItem('outbound-v1-migrated', 'true');
          return;
        }

        await apiClient.post('/outbound-campaigns/migrate-local', {
          campaigns,
          contacts: dirtyContacts,
          callbacks,
        });

        localStorage.setItem('outbound-v1-migrated', 'true');
        queryClient.invalidateQueries({ queryKey: ['outbound-campaigns'] });
      } catch (err) {
        // Do NOT set the flag — let it retry on next page load.
        console.error('[outbound] local migration failed', err);
        Sentry.captureException(err);
      }
    })();
  }, []);
}
```

### Safety properties

- **One browser, one run.** The `outbound-v1-migrated` flag lives in localStorage; survives cache clears that leave localStorage intact and also survives tab closes. If the flag is cleared, the server endpoint is idempotent, so a re-run produces no duplicates.
- **Failure is retryable.** On any error (network, 500, validation), the flag is not set. Dannia reloads the page and it tries again.
- **Old IndexedDB stays intact.** Migration does not delete the local blob — it's a read-only copy. Cleanup deferred to a future release after we've confirmed the backend has everything.
- **Rollout order:** backend deployed first (tables + seeded campaign exist). Frontend deployed second. Will's browser migrates (nothing dirty, flag set). Dannia is asked to log in; her migration uploads 36 dispositions + any callbacks.

---

## Testing plan

Per `/home/will/CLAUDE.md` HARD RULE: Playwright verification is mandatory before declaring the feature complete.

### Backend — pytest (`react-crm-api/tests/test_outbound_campaigns.py`)

1. Auth required on all endpoints (401 when unauthenticated).
2. CRUD smoke: create campaign → add contacts → read list → delete campaign cascades.
3. `POST /contacts/{id}/dispositions` increments counters, appends one `outbound_call_attempts` row, stamps `rep_user_id` from session.
4. `POST /migrate-local` idempotency: same payload twice → second call creates zero new rows.
5. `POST /migrate-local` dirty filter: sending a `call_status: 'pending'` contact that already exists is a no-op.
6. `POST /migrate-local` synthesized attempt: one row per dirty contact with `dispositioned_at = incoming.last_call_date`.
7. Campaign counters derived correctly from contact statuses.

### Frontend — Playwright E2E (`ReactCRM/e2e/features/outbound-campaigns-persistence.spec.ts`)

1. **Email Openers loads from backend.** Fresh browser, no IndexedDB. Navigate to `/outbound-campaigns`. "Email Openers - Spring Follow-Up" campaign visible with all 39 seeded contacts (see Open Questions about 37 vs 39 in Dannia's view).
2. **Disposition round-trips.** Log in as Dannia. Set a contact to Connected with a note. Reload. Status is still Connected. Open DevTools network tab → confirm POST to `/dispositions` succeeded.
3. **Two-browser shared state.** Browser A (Dannia) dispositions a contact → within 30s Browser B (Will) sees it after refocusing the tab.
4. **Migration uploads stranded local state.** Pre-seed Browser A's IndexedDB with a pre-fix blob (5 campaigns, mix of dispositioned and pending contacts, 2 callbacks). Reload. Verify: `POST /migrate-local` fired once with the expected payload; `outbound-v1-migrated` flag is `true`; reload again → no second POST; backend shows the dispositions.
5. **Counter updates.** Set a pending contact to Connected → campaign "Called" counter increments by 1.
6. **Callback persistence.** Schedule a callback for a contact. Reload. Callback still visible in the Dannia callbacks panel.
7. **Production smoke** (after Railway deploy) against `react.ecbtx.com` — load the page, confirm campaign is visible, confirm no console errors.

### Dannia recovery verification (manual, post-deploy)

1. Before Dannia logs in: query backend `SELECT COUNT(*) FROM outbound_call_attempts WHERE campaign_id = 'email-openers-spring-2026'` → expect 0.
2. Ask Dannia to log in and load `/outbound-campaigns`.
3. Query again → expect rows matching her counts (36 called, 9 connected, etc.).
4. Will refreshes his browser → sees the same numbers.

---

## Rollout order

1. Merge + deploy backend. Alembic runs; tables + seeded campaign exist. No behavior change for users yet.
2. Merge + deploy frontend. Will's browser auto-migrates on next page load (nothing dirty → flag set).
3. Run Playwright E2E against production; fix iteratively until all green.
4. Ask Dannia to open `react.ecbtx.com/outbound-campaigns`. Her browser auto-migrates; her 36 dispositions + callbacks upload.
5. Will verifies he now sees Dannia's state.
6. Announce "fixed" in whatever channel you prefer.

---

## Open questions / deferred

- **37 vs 39 contacts:** spec says 39 (matches `store.ts`), Dannia's UI shows 37 called + 1 completed = 38. Possibly 1–2 contacts were deleted locally. Seed the full 39; Dannia's migration will no-op on the missing ones (they're still pending in her browser, which means they don't clear the dirty filter — harmless).
- **`danniaMode` toggle:** stays as a per-user UI preference. If in the future we want "who's currently at the keyboard" to drive `rep_user_id` instead of `current_user`, revisit.
- **Old IndexedDB cleanup:** not deleted in this change. Plan a follow-up release to wipe the blob after confirming everything migrated cleanly.
- **WebSocket push:** deferred. 30s poll is enough for now.
- **Contact claiming:** `assigned_rep` column exists but is not enforced. Add a claim UI if you onboard a second caller.
