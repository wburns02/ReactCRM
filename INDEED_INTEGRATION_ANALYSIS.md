# Indeed Integration Analysis — 2026-04-22

## What already exists

| Piece | File | Status |
|---|---|---|
| XML feed builder | `app/hr/recruiting/careers_feed.py` | ✅ `build_indeed_xml(base_url, reqs)` emits valid Indeed XML |
| Public jobs feed | `app/hr/careers/router.py` → `GET /careers/jobs.xml` | ✅ Already live |
| Public careers page | `GET /careers`, `GET /careers/{slug}` | ✅ Live |
| Form-based apply | `app/hr/recruiting/public_apply.py` → `POST /api/v2/public/careers/{slug}/apply` | ✅ Live (multipart) |
| Applicant model | `HrApplicant` | ✅ Has `source` enum incl. `indeed` |
| Application model | `HrApplication` | ✅ Has `stage`, `requisition_id` |

## What's missing

1. **Alias URL** `/careers/indeed-feed.xml` — only `/careers/jobs.xml` exists today, user explicitly asked for the indeed-feed path.
2. **Per-requisition publish toggle** — current feed emits every open requisition. No opt-out per role.
3. **JSON Apply webhook** `POST /hr/indeed-apply` — current endpoint is multipart form scoped to a single requisition by slug. Indeed Apply hits us with JSON and identifies the job via `referencenumber` (which we already put in the XML as the req slug).
4. **Admin settings page** — no UI for seeing the feed URL or toggling publish.

## Design

### Migration 105 — `publish_to_indeed` column
Add `publish_to_indeed BOOLEAN DEFAULT TRUE NOT NULL` on `hr_requisitions`. Default true so existing behaviour (every open req feeds) is preserved.

### Backend
- `careers_router`: add `@router.get("/indeed-feed.xml")` that returns the same XML as `/careers/jobs.xml` but only for requisitions where `publish_to_indeed=True`. Keep `/careers/jobs.xml` as a permanent alias.
- `app/hr/recruiting/indeed_webhook.py` (new): JSON POST handler mounted at `/hr/indeed-apply`. Payload shape matches Indeed Apply v1:
  ```json
  {
    "id": "indeed-apply-id",
    "job": {"jobTitle":"...", "jobId":"slug","jobUrl":"..."},
    "applicant": {"fullName":"First Last","email":"...","phoneNumber":"..."},
    "resume": {"url":"https://..."}
  }
  ```
  Looks up requisition by slug, upserts applicant by email (as the form-based one does), creates `HrApplication(stage="applied", source=indeed)`, records `HrApplicationEvent` and audit log.
- Admin PATCH: `hr_router` already has `PATCH /hr/recruiting/requisitions/{id}`; extend `RequisitionUpdate` schema with `publish_to_indeed`.

### Frontend
- New page `src/features/hr/recruiting/pages/IndeedSettingsPage.tsx`:
  - Show the public feed URL (copy button).
  - Table of requisitions with toggle → `useUpdateRequisition({ publish_to_indeed })`.
  - Link to `https://employers.indeed.com/home` for paid sponsorship.
  - Webhook endpoint URL (for setup in Indeed Apply configuration).
- Register route `/hr/settings/indeed` under `HrRoutes`.
- Navigation: link from HR Overview "Related tools" + new entry in HR nav group.

### Public URLs
- Feed: `https://react-crm-api-production.up.railway.app/careers/indeed-feed.xml`
- Webhook: `https://react-crm-api-production.up.railway.app/hr/indeed-apply`

## Risk / compatibility
- Existing `/careers/jobs.xml` stays working (no URL breaking change).
- `publish_to_indeed` defaults true → existing open reqs feed automatically.
- Webhook is public — we'll require HTTP POST + standard input validation but no auth (Indeed doesn't sign requests by default). Can add HMAC later via Indeed Apply's `signature` header if the user enables it.
