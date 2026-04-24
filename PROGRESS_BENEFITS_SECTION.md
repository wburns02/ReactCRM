# Benefits Section Progress

## Iteration 1 (2026-04-24) — shipped

### Backend commits (react-crm-api)
- `1602005` — benefits module scaffolding: migration 108, models,
  schemas, router, seed helper, wire into hr_router.
- `a05918c` — rename 106→108 after collision with the outbound-campaigns
  migration.
- `fb51aaf` — `/health/db/migrate-benefits` helper endpoint.
- `cb18cef` — endpoint auto-detects when tables already exist and
  stamps 108 without re-running CREATE.

### Frontend commit (ReactCRM)
- `30263a8` — dedicated purple sidebar, Benefits overview page,
  Enrollments with 4 tabs, 9 placeholder pages, route-aware Sidebar.

### Live verification (react.ecbtx.com, hard refresh)

| URL | Result |
|---|---|
| `/benefits` | Purple hero + 4 KPI cards (54 enrollments, $13,870 monthly cost, $7,666 deductions, 3 waived) + 6 shortcut cards + by-type panel |
| `/benefits/enrollments` (Employee details) | 29 medical enrollments, plan / carrier / effective date / cost / deduction columns, download + search + filter |
| `/benefits/enrollments?tab=history` | 12 change-report rows, download CSV |
| `/benefits/enrollments?tab=events` | Mixed pending/completed events, archive buttons (disabled on pending), filter dropdown |
| `/benefits/enrollments?tab=eoi` | 3 pending Life EOI requests, benefit-type + status filters |
| Sidebar | Swaps to purple gradient with Umbrella logo + 10 Benefits nav items + Platform group |

### API endpoints live
- `GET /api/v2/hr/benefits/enrollments?benefit_type=medical`
- `GET /api/v2/hr/benefits/events`
- `GET /api/v2/hr/benefits/eoi`
- `GET /api/v2/hr/benefits/history`
- `GET /api/v2/hr/benefits/overview`

### Manual verification instructions
> 1. Hard-refresh https://react.ecbtx.com/benefits
> 2. Sidebar should flip to purple with "Benefits" header + Umbrella icon.
> 3. Click "Enrollments" in the purple rail — four tabs should each load
>    populated tables: Employee details (29 rows), Enrollment history
>    (12 rows), Upcoming events (14 rows), EOI (3 rows).
> 4. Select Dental in the benefit-type dropdown on Employee details —
>    table updates to Guardian dental plans.
> 5. Click "Download enrollments" — browser downloads a CSV file with
>    the current rows.
> 6. Navigate back to /dashboard — the dark-blue CRM sidebar returns.

### Known v1 limitations
- Edit / new-enrollment wizards not built (read-only v1).
- "Recent updates" and "Court-ordered dependents" sub-tabs on Employee
  details are disabled placeholders.
- Rippling live sync: demo data only for now — swap in the Rippling
  client once credentials land.
- FSA / Workers' Comp / COBRA / ACA / Deductions / My Benefits / App
  Shop / Help / Benefits Settings pages are "Coming soon" placeholders
  with a button to jump to Enrollments.
