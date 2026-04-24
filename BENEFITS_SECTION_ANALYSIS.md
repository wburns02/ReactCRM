# Benefits Section Analysis — 2026-04-24

## Current state
- **Nothing exists** for Benefits in this CRM (frontend or backend). Grep for "benefits" / "rippling" / "enrollment" across `src/` and `react-crm-api/app/` returns zero benefits-module files.
- The HR module ends at recruiting + onboarding + employees. No insurance / enrollment / EOI / COBRA data model.
- The Sidebar (`src/components/layout/Sidebar.tsx`) is a single nav list. No mechanism yet for a section to have a completely different sidebar.
- The shared AppLayout (`src/components/layout/AppLayout.tsx`) always renders `<Sidebar />`, so the only way to swap the sidebar is to make Sidebar route-aware.

## Rippling screenshots (user-provided)
The target UI is Rippling's Benefits product:
- Dedicated sidebar: Benefits Overview / My Benefits / **Enrollments** / Integrations / Deductions / FSA / Workers' Comp / COBRA / ACA / Benefits Settings + a Platform section (Data / Tools / Company settings / App Shop / Help) at the bottom.
- Enrollments page: 4 tabs — **Employee details**, **Enrollment history**, **Upcoming events**, **EOI**.
- Employee details tab: benefit-type dropdown ("Medical"), 3 sub-tabs (Current Medical enrollments / Recent updates / Court-ordered dependents), table: Employee, Plan, Carrier, Effective date, Monthly cost, Monthly deductions, action menu.
- Enrollment history tab: "Enrollment change report" with Employee, Change type (COBRA Initial / Qualifying Life Event / Termination), Affected lines, Completed/Effective dates, Changed by, Download CSV.
- Upcoming events tab: Effective Date, Employee, Event Type (Demographic / New Hire / Termination / QLE / COBRA), Status (Pending completion / Completed), Completion date, Archive action.
- EOI tab: EOI requests table with Employee, Status, Member name, Member type, Benefit type, Plan name, Enrollment dates, filters for pending / benefit type.

## What's missing vs target
| Layer | Missing |
|---|---|
| DB | `hr_benefit_plans`, `hr_benefit_enrollments`, `hr_benefit_events`, `hr_benefit_eoi_requests` |
| API | `GET /hr/benefits/enrollments`, `/events`, `/eoi`, `/history` |
| FE | `/benefits/*` routes; route-aware Sidebar with Benefits nav; Benefits Overview shell; Enrollments page with 4 tabs |
| Data | Seed demo medical enrollments + events + EOI rows so the live UI has content on first load |
| Rippling | No real API client yet — we'll seed from org-chart employees for now and flag Rippling as a future data source |

## Files to touch
- Backend: `alembic/versions/106_hr_benefits_tables.py` (new), `app/hr/benefits/` package (new: models.py, schemas.py, services.py, router.py, seed.py), `app/hr/router.py` to include, `app/main.py` to trigger seed.
- Frontend: `src/features/benefits/` (new: pages, components, api), `src/routes/app/benefits.routes.tsx` (new), `src/routes/index.tsx` (register), `src/components/layout/navConfig.ts` (add top-level Benefits link), `src/components/layout/Sidebar.tsx` (route-aware branching).

## Decision
Route-aware Sidebar (not a separate `BenefitsLayout`) so we keep the same chrome (logo, entity switcher, theme toggle, sign-out) but swap the middle nav list. Users experience the same "dedicated sidebar" effect without doubled code.
