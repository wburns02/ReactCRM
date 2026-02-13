# Mac Service Platform — Frontend

Production CRM for MAC Septic Services. React 19 + TypeScript + Vite + Tailwind 4.

**Live:** https://react.ecbtx.com
**API:** https://react-crm-api-production.up.railway.app/api/v2
**API Docs:** https://react-crm-api-production.up.railway.app/docs

## Quick Start

```bash
git clone https://github.com/wburns02/ReactCRM.git
cd ReactCRM
npm install
npm run dev          # http://localhost:5173
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (port 5173) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check (no emit) |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E tests |

## Tech Stack

- **React 19** + React Router 7 + React Hook Form
- **TanStack Query** — 78 hooks in `src/api/hooks/`
- **Zod** validation on all API responses
- **Tailwind 4** with CSS variable theming (light/dark mode)
- **Zustand** for global state, **IndexedDB** for offline sync
- **Recharts** dashboards, **Leaflet/MapLibre** maps
- **Vite 7** with PWA (vite-plugin-pwa), chunk splitting
- **Playwright** E2E tests in `e2e/tests/`

## Project Structure

```
src/
  api/
    hooks/         # 78 TanStack Query hooks (useCustomers, useWorkOrders, etc.)
    types/         # 35 Zod schema files
    client.ts      # Axios instance (cookie auth)
  features/        # Feature modules (workorders, customers, payroll, etc.)
  components/
    layout/        # AppLayout, MobileBottomNav, MobileHeader
    ui/            # Shared components (Button, Dialog, DataTable, etc.)
    RoleSwitcher/  # Demo role switching (will@macseptic.com only)
  hooks/           # Shared hooks (useTheme, useDebounce, etc.)
  providers/       # Auth, Role, Theme providers
  routes/          # Route definitions
e2e/
  tests/           # Playwright test files
  auth.setup.ts    # Shared auth setup
```

## Key Architecture

- **Auth**: Cookie-based JWT. Login at `/login`. No Bearer token.
- **API Client**: All calls via `src/api/client.ts` (Axios). Base URL from `VITE_API_URL`.
- **Validation**: Every API response validated with Zod in all environments.
- **Offline**: IndexedDB sync queue (`offlineClient.ts`) queues mutations when offline.
- **Real-time**: WebSocket at `/api/v2/ws` for live updates.
- **Theming**: CSS variables in `index.css`. `.dark` class on `<html>`. Toggle in sidebar/topbar.
- **Mobile**: Responsive breakpoints. Technicians get bottom nav + slim header.
- **PWA**: Service worker auto-registers. NetworkFirst for API, CacheFirst for assets.

## Roles

| Role | Default Route | Description |
|------|---------------|-------------|
| Admin | `/` (dashboard) | Full system access |
| Technician | `/my-dashboard` | Mobile-first field view |
| Demo | All routes | `will@macseptic.com` — floating role switcher |

## Environment Variables

```env
VITE_API_URL=https://react-crm-api-production.up.railway.app/api/v2
VITE_SENTRY_DSN=        # Optional — Sentry error tracking
```

## Deployment

Railway auto-deploys on push to `master`. Never use `railway up`.

```bash
git push origin master
```
