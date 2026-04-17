# HR Section Progress

## Iteration 1 (2026-04-17)

### Commits
- `9d116ae` — KpiCard rewrite, hero banner, onboarding/offboarding list pages, stage deep-link
- `27741a3` — OrgChart overflow-x-auto + CRM-token container

### Live verification (https://react.ecbtx.com after hard refresh)

| Route | Status | Manual check |
|---|---|---|
| `/hr` | 200 ✅ | Dark gradient hero + 5 clickable KPI cards + 6 shortcut cards |
| `/hr/org-chart` | 200 ✅ | Full Mac Septic hierarchy, 4 offices side-by-side via horizontal scroll |
| `/hr/recruiting` | 200 ✅ | Rippling-style sub-tabs + pill counters |
| `/hr/recruiting/requisitions` | 200 ✅ | Job requisitions list |
| `/hr/recruiting/candidates` | 200 ✅ | Filter sidebar; `?stage=X` pre-selects |
| `/hr/recruiting/open-headcount` | 200 ✅ | Open positions list |
| `/hr/recruiting/templates` | 200 ✅ | Message template admin |
| `/hr/onboarding` | 200 ✅ | Real list page, NOT applicant-inbox redirect |
| `/hr/offboarding` | 200 ✅ | Real list page, NOT applicant-inbox redirect |
| `/hr/inbox` | 200 ✅ | Applicant inbox |

### Console errors
Zero uncaught errors on /hr hard refresh.

### Styling parity
- HR Overview uses the same dark gradient hero as `/dashboard`.
- KPI cards use `Card` + `.stat-card` + 11×11 colored icon well, matching DashboardPage pattern.
- Panels use `text-text-primary`, `text-text-secondary`, `text-text-muted`, `border-border`, `bg-bg-card` tokens so dark mode works.
- OrgChart detail aside uses the same token palette.

### Manual verification instructions
> Hard-refresh `/hr`, click every card — each of the 11 HR routes above should return HTTP 200 and render non-empty content. Zero uncaught console errors.

### Screenshots captured
- `live-hr-overview-v2.png` — new hero + KPIs + shortcuts + panels
- `live-hr-mobile-v2.png` — 375px mobile layout
- `live-onboarding-list.png` — real Onboarding list page
- `live-org-v3.png` — org chart with CRM-consistent container
