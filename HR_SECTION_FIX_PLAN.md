# HR Section Fix Plan

Atomic steps. Each commits + pushes + live-verifies.

## Step 1 — Align KpiCard with rest-of-CRM
- Rewrite `KpiCard` to use `Card` + `CardContent` + `stat-card` class, token colors, 11x11 colored icon well, `text-3xl font-bold`, optional trend subtitle, optional `to` prop for Link wrapper.
- Update every call site in HR to pass icon + accent color.
- Live verify: hard-refresh /hr, every KPI card looks like /dashboard stat cards.

## Step 2 — HR Overview hero + layout parity
- Add dark gradient welcome banner at top (matches DashboardPage):
  - Greeting + short HR summary chips (Open reqs, Applicants 7d, Onboardings).
- Swap panels to use `Card` component instead of raw `rounded-xl border p-4 bg-white`.
- Convert raw `text-neutral-*` to token classes (`text-text-secondary`, `text-text-muted`).
- Live verify: looks cohesive with /dashboard at 1280 and 375.

## Step 3 — Onboarding + Offboarding list pages
- Add `useAllInstances(category)` hook hitting `GET /hr/onboarding/instances?category=...`.
- Create `OnboardingListPage` at `/hr/onboarding` — shows active instances with subject, template, started, status.
- Create `OffboardingListPage` at `/hr/offboarding` — same shape, offboarding category.
- Register routes.
- Fix HR Overview KPIs: Onboarding → `/hr/onboarding`, Offboarding → `/hr/offboarding`.
- Live verify: those KPIs navigate to real list pages, not applicant inbox.

## Step 4 — Recruiting stage deep-link
- `CandidatesTab` reads `useSearchParams()` for `stage`, seeds `useState` from it, writes back on change.
- Live verify: clicking Active applications stage row on /hr lands on Candidates with stage select pre-populated.

## Step 5 — Misc polish
- OrgChart offices-row gets `flex-nowrap overflow-x-auto` so all 4 offices sit side-by-side.
- Strip outer padding from `RequisitionsListPage` when nested under Recruiting (add `embedded` prop, default false; routes pass true).
- Search input in Recruiting hub becomes a real input wired to `q` query param (simple navigation, no backend filter yet — still "functional" per user ask).

## Step 6 — Playwright live sweep
- Click every HR Overview KPI → assert URL lands on correct page and page renders non-empty.
- Walk every recruiting sub-tab, org chart click, mobile viewport.
- Assert zero console errors.
