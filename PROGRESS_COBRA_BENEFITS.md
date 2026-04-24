# COBRA Benefits Progress

## Iteration 1 (2026-04-24) — shipped

### Backend commit (react-crm-api)
- `db23638` — migration 111 (5 COBRA tables) + models/schemas/seed/router
  + `/health/db/migrate-cobra-111` helper endpoint.

Migration applied live (version 111). Seed populated:
- 10 enrollments (4 Current, 6 Upcoming)
- 6 COBRA Election Notices (one per pending-election row)
- 12 payments across enrolled beneficiaries
- 1 settings row (ABC Inc. ****7890, grace 30 / election 60)
- 2 pre-Rippling plans (Aetna Legacy, Delta Dental Legacy)

### Frontend commit (ReactCRM)
- `4604d29` — CobraPage with 4 tabs, cobra TanStack Query hooks, route
  wire-up.

### Live verification (react.ecbtx.com)

**`/benefits/cobra` (Enrollments › Current):**
- 4 current enrollments rendered: Cassandra Oliver (Enrolled), Dennis
  Ingram / Kristen Cruz / Shane Thomas (Pending election).
- Avatars, Terminated label on terminated employees, status pill.
- Per-row **Send Notice** button on pending-election rows (POST to
  `/enrollments/{id}/send-notice`).
- Export as CSV + Add employee in header.
- Search box filters by name.

**Enrollments › Upcoming:** 6 rows including Joshua Greer, Darren
Holden, Eric Lee → Lisa Davis, etc., with Send Notice/Invite buttons.

**Enrollments › Pending:** Pending tasks panel with pending-election +
pending-onboarding rows.

**Enrollments › Past:** Archived empty-state matching Rippling.

**`/benefits/cobra?tab=payments`:** table shown, search + status filter
+ Export as CSV, 12 payment rows with beneficiary / month / charge
date / charged amount / reimbursement fields.

**`/benefits/cobra?tab=notices`:** 5 COBRA Election Notices with Link
to notice + In Production tracking pills + updated-on dates.

**`/benefits/cobra?tab=settings`:** "Reimbursement bank account"
sub-tab shows 🇺🇸 ABC Inc. ****7890 (grace 30 / election 60 days) with
edit button that flips the card into a form PATCHing the backend.
"Pre-Rippling COBRA plans" sub-tab lists Aetna + Delta Dental legacy
plans, inline Add plan, delete action.

### Console
Zero uncaught errors on /benefits/cobra across all 4 tabs.

### Manual verification
> 1. Hard-refresh https://react.ecbtx.com/benefits/cobra
> 2. Click **Send Notice** on Dennis Ingram — navigate to Notices tab
>    and confirm a new "COBRA Election Notice" row appears.
> 3. Add employee → fill modal → confirm row appears in the current
>    table.
> 4. Switch to Settings → edit payment method → save → reload → confirm
>    persisted.

### API endpoints live (auth required)
- `GET /api/v2/hr/cobra/enrollments?bucket=current|upcoming|pending|past`
- `POST /api/v2/hr/cobra/enrollments`
- `PATCH /api/v2/hr/cobra/enrollments/{id}`
- `POST /api/v2/hr/cobra/enrollments/{id}/send-notice`
- `GET /api/v2/hr/cobra/payments`
- `GET /api/v2/hr/cobra/notices`
- `GET /api/v2/hr/cobra/settings`, `PATCH /api/v2/hr/cobra/settings`
- `GET /api/v2/hr/cobra/pre-plans`, `POST`, `DELETE /{id}`
