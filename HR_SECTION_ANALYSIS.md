# HR Section Analysis — 2026-04-17

Tested live at https://react.ecbtx.com/hr after hard refresh.

## Styling gaps vs rest-of-CRM

| Pattern | Dashboard / CRM standard | HR Overview today |
|---|---|---|
| Hero banner | `bg-gradient-to-r from-[#0c1929] via-[#132a4a] to-[#1a3a6a]` with greeting + chips | Plain `<h1>HR</h1>` with two buttons |
| KPI card | `Card` (`components/ui/Card.tsx`) + `stat-card` class, `w-11 h-11 rounded-xl bg-{color}-500/10` icon well, `text-3xl font-bold`, subtitle line | Plain `KpiCard` — no icon, no colored accent, no stat-card hover |
| Shortcuts | n/a (Dashboard) | Flat cards, generic `rounded-xl border p-4` with small icon — OK but no hover-lift |
| Panels | `rounded-lg border border-border bg-bg-card p-6 shadow-sm` | `rounded-xl border p-4 bg-white` (inconsistent radius + padding) |
| Tokens | Uses `text-text-primary`, `text-text-secondary`, `text-text-muted`, `bg-bg-card`, `border-border` | Uses raw `text-neutral-*`, `bg-white` — breaks dark mode |

## Functional gaps

- **Onboarding in progress** KPI → links `/hr/inbox` (applicant inbox!). Should go to `/hr/onboarding`.
- **Offboarding in progress** KPI → same wrong link. Should go to `/hr/offboarding`.
- No `/hr/onboarding` list page exists — only detail `/hr/onboarding/:instanceId`.
- No `/hr/offboarding` list page exists — only detail `/hr/offboarding/:instanceId`.
- **Active applications by stage** rows link to `/hr/recruiting/candidates?stage=X` but `CandidatesTab` doesn't read `?stage=` from URL → filter isn't applied.
- Org Chart four office columns wrap (2+2) instead of sitting as a single row of 4.
- Recruiting "Search candidates, jobs…" hint is a display div, not an input — no search.
- Requisitions nested route renders its own `p-6 max-w-6xl mx-auto` inside the Recruiting shell → odd double-padding.

## Console errors

Zero on production (dev shows expected WebSocket errors that are env-specific).

## Files touched by fix

- `src/features/hr/shared/KpiCard.tsx` — rewrite to match Dashboard stat-card pattern (icon well, tokens).
- `src/features/hr/dashboard/pages/HrOverviewPage.tsx` — add hero banner, fix links.
- `src/features/hr/onboarding/pages/OnboardingListPage.tsx` — NEW.
- `src/features/hr/onboarding/pages/OffboardingListPage.tsx` — NEW.
- `src/features/hr/onboarding/api.ts` — add `useAllInstances` hook.
- `src/features/hr/recruiting/pages/CandidatesTab.tsx` — read `?stage=` from URL.
- `src/features/hr/recruiting/pages/RequisitionsListPage.tsx` — strip outer padding when embedded.
- `src/features/hr/dashboard/components/OrgChart.tsx` — no-wrap row for offices.
- `src/routes/app/hr.routes.tsx` — register onboarding/offboarding list routes.
