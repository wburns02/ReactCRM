# Benefits Integrations + Deductions Progress

## Iteration 2 (2026-04-24) — shipped

### Backend commits (react-crm-api)
- `d886424` — migration 109 + benefits models/schemas extended + router
  endpoints (integrations, account structure, scheduled deductions,
  push, auto-manage, patch).
- `d5f8540` — `/health/db/migrate-benefits-109` helper endpoint.

Migration 109 applied live (version 109), 3 integrations seeded, 2
account structures seeded, 20 future scheduled deductions seeded with
3 deliberate discrepancies.

### Frontend commit (ReactCRM)
- `0e711e6` — IntegrationsPage + DeductionsPage, new TanStack Query
  hooks, route wire-up.

### Live verification (react.ecbtx.com)

**`/benefits/integrations` (Overview › Current):**
- 3 carrier rows (Blue Shield / MetLife / Transamerica, all California).
- "Enable Rippling to send enrollment forms" info banner with Manage
  integrations CTA when any carrier has form-forwarding off.
- Active carrier integration pill shows Active (emerald) / Inactive.
- Per-row Form Forwarding toggle PATCHes
  `/api/v2/hr/benefits/integrations/{id}/form-forwarding?enabled=…`
  — switches on/off, persists across reload.
- Search + Filter widgets live.

**`/benefits/integrations?tab=structure`:**
- "Carrier account structure details" header.
- 2 seeded classifications (Blue Shield + MetLife).
- **Add classification** button opens inline form with: carrier / class
  type / employee group / plan / enrollment tier / class value /
  employees / group rules. Save persists via POST.
- Per-row trash-can delete action works (DELETE + refetch).

**`/benefits/integrations?tab=overview` › Upcoming sub-tab:**
- Empty state: "No current renewals" + supporting copy.

**`/benefits/deductions`:**
- Benefit-type dropdown (Medical/Dental/Vision/STD/LTD/Life) filters
  the table.
- **Discrepancy detected** amber banner counts drift rows and surfaces
  **Push deductions** button.  Clicking it POSTs
  `/scheduled-deductions/push`, clears the banner after refetch
  (verified live — banner disappears on reload).
- **Automate insurance deduction management** blue banner counts
  rows not auto-managed, with **Auto-manage deductions** button
  calling `/scheduled-deductions/auto-manage-all`.
- Future scheduled deductions table: 10 rows per benefit type, per-row
  Auto-manage toggle (PATCH), EE/ER/Taxable Rippling calc vs In-payroll
  columns with amber highlight on drift, avatar + inline "Discrepancy
  detected" label on affected rows.
- Only-show-discrepancies toggle + search wired.
- Filter button + column headers present.

### Console
Zero uncaught errors on /benefits/integrations and /benefits/deductions.

### Manual verification
> 1. Hard-refresh https://react.ecbtx.com/benefits/integrations.
> 2. Click the form-forwarding toggle next to Transamerica — it flips
>    on and the "Enable Rippling" banner disappears after the next
>    reload.
> 3. Click Account structure → Add classification → fill out fields →
>    Save; new row appears; trash-can removes it.
> 4. Go to /benefits/deductions → click **Push deductions** → the
>    amber Discrepancy banner clears and the in-payroll columns for
>    previously-drifted rows now match the Rippling calc column.
> 5. Click Auto-manage deductions — the blue banner clears and the
>    per-row auto-manage toggles all flip on.
> 6. Switch the benefit-type dropdown to Dental — the table updates
>    to Guardian dental plans.

### Live endpoints (auth required)
- GET /api/v2/hr/benefits/integrations
- PATCH /api/v2/hr/benefits/integrations/{id}/form-forwarding
- GET /api/v2/hr/benefits/account-structures
- POST /api/v2/hr/benefits/account-structures
- DELETE /api/v2/hr/benefits/account-structures/{id}
- GET /api/v2/hr/benefits/scheduled-deductions
- POST /api/v2/hr/benefits/scheduled-deductions/push
- POST /api/v2/hr/benefits/scheduled-deductions/auto-manage-all
- PATCH /api/v2/hr/benefits/scheduled-deductions/{id}
