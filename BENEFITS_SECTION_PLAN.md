# Benefits Section Implementation Plan

## Chunk 1 — Backend schema + seed (migration 106)

- Alembic 106 creates:
  - `hr_benefit_plans(id, kind, carrier, name, monthly_cost, employee_contribution, employer_contribution, active, created_at)`
  - `hr_benefit_enrollments(id, employee_id, plan_id, status, effective_date, termination_date, monthly_cost, monthly_deduction, created_at, updated_at)`
  - `hr_benefit_events(id, employee_id, event_type, status, effective_date, completion_date, created_at)`
  - `hr_benefit_eoi_requests(id, employee_id, plan_id, status, member_name, member_type, benefit_type, enrollment_created_at, enrollment_ends_at, created_at)`
- Seed helper inserts demo rows so the UI renders immediately on first deploy: pull employees from the existing technician table + org-chart people, attach realistic plan rows.
- Kick off the seed via `POST /health/db/migrate-hr` (already wired) plus an optional `/health/db/seed-benefits` admin endpoint.

## Chunk 2 — Backend API (read-only for v1)

- `app/hr/benefits/router.py`:
  - `GET /hr/benefits/enrollments?benefit_type=medical&q=&effective_from=&effective_to=` → paginated list joined with employee + plan.
  - `GET /hr/benefits/events?event_type=&status=` → upcoming events for the Upcoming events tab.
  - `GET /hr/benefits/eoi?benefit_type=&status=` → EOI requests.
  - `GET /hr/benefits/history?since=&until=&q=` → change report for the Enrollment history tab.
- Wire into `hr_router` (auth required, same as rest of HR admin).

## Chunk 3 — Frontend: route-aware Sidebar + shell

- `navConfig.ts`: new `benefitsNavGroups: NavGroup[]` list mirroring Rippling's sidebar.  Also add a top-level `topNavItems` entry pointing at `/benefits`.
- `Sidebar.tsx`: branch — if path starts with `/benefits/`, render `benefitsNavGroups` with a distinct header tint; otherwise render the existing CRM nav.
- `src/features/benefits/pages/BenefitsOverviewPage.tsx` — placeholder hero with stat cards.
- `src/features/benefits/pages/BenefitsShell.tsx` — not needed if each page owns its top-level layout.
- `src/features/benefits/pages/MyBenefitsPage.tsx` — placeholder for v1.

## Chunk 4 — Enrollments page (4 tabs)

- `EnrollmentsPage.tsx` with tab strip + routed tab panels:
  - `EmployeeDetailsTab.tsx` — benefit-type dropdown (Medical / Dental / Vision / FSA / HSA / Life), sub-tabs (Current / Recent updates / Court-ordered), search, filter, download CSV, paginated table.
  - `EnrollmentHistoryTab.tsx` — info banner, change report table (Change type, Affected lines, Completed / Effective dates, Changed by).
  - `UpcomingEventsTab.tsx` — Effective Date, Employee, Event Type, Status pill, Completion date, Archive button.
  - `EoiTab.tsx` — EOI requests table with pending / benefit type filters + download.
- Each tab has: skeleton loaders, empty states, row click → detail modal (stub), download CSV via Blob.
- Queries via TanStack Query hooks in `src/features/benefits/api.ts`.

## Chunk 5 — Playwright + live verify

- `e2e/features/benefits-enrollments.spec.ts` covers: top-nav Benefits click → benefits sidebar visible; /benefits/enrollments renders all 4 tabs non-empty; download button present; filter search functions; mobile viewport.
- Live hard-refresh + zero console errors.

## Out of scope (next iteration)
- Enrollment edit / new-enrollment wizards (complex multi-step; v1 is read + download).
- Real Rippling data sync (needs OAuth + webhook config).
- Dependent management UI.
- ACA / COBRA / Workers' Comp / FSA — those Benefits sidebar items will be placeholder "Coming soon" pages in v1.
