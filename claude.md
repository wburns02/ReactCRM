# Claude Code Documentation - ECBTX CRM

> **Version:** v2.1 — January 7, 2026
> **Status:** Production

---

## Quick Reference (Read This First)

**Most Important Rules** (Break these = invalid response):

| # | Rule |
|---|------|
| 1 | **NEVER fake Playwright** — always show full script + evidence bundle |
| 2 | **NO /app/ routes** — basename="/", no /app in links |
| 3 | **NO double /api** in API calls |
| 4 | **Drag-and-drop mutations MUST succeed** with 200 (no 500s) |
| 5 | **Relentless mode** — never ask to continue, just keep fixing |

**When to use Playwright:** ANY UI check, error reproduction, drag test, page load

**Activation phrases:**
- `"Enter relentless autonomous troubleshooter mode"`
- `"Fix until all tests pass and zero console errors"`

> **CRITICAL**: This document contains binding rules. Violations (especially faked Playwright usage or reintroduction of banned bugs) invalidate the entire response.

---

## Current Feature: Role-Switching Demo

**Demo User:** `will@macseptic.com`
**Purpose:** When this user logs in, show a floating role switcher to demo different CRM views.

### Available Roles

| Role | Display Name | Icon | Focus |
|------|-------------|------|-------|
| `admin` | Administrator | 👑 | Full system access |
| `executive` | Executive | 📊 | High-level KPIs |
| `manager` | Operations Manager | 📋 | Day-to-day ops |
| `technician` | Field Technician | 🔧 | Mobile work orders |
| `phone_agent` | Phone Agent | 📞 | Customer service |
| `dispatcher` | Dispatcher | 🗺️ | Schedule management |
| `billing` | Billing Specialist | 💰 | Invoicing/payments |

### Implementation Requirements

**Backend (FastAPI):**
- `app/models/role_view.py` - SQLAlchemy model
- `app/schemas/role_view.py` - Pydantic schemas
- `app/services/role_view_service.py` - Business logic
- `app/api/v2/endpoints/roles.py` - API endpoints
- `app/core/demo_mode.py` - Middleware/dependencies

**Frontend (React):**
- `src/context/RoleContext.tsx` - State management
- `src/components/RoleSwitcher/` - UI component
- `src/components/Dashboard/RoleDashboard.tsx` - Role-specific views
- `src/components/Navigation/RoleBasedNav.tsx` - Dynamic nav

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/roles` | List available roles (demo user only) |
| POST | `/api/v2/roles/switch` | Switch active role |
| GET | `/api/v2/roles/current` | Get current role config |

---

## Documentation Structure

```
claude-docs/
├── README.md           ← System overview, deployment info
├── quick-reference.md  ← Cheat sheet, activation commands, banned bugs
├── frontend.md         ← React CRM architecture, components, routing
└── backend.md          ← FastAPI endpoints, models, database
```

**Always read `claude-docs/quick-reference.md` first.**

---

## Zero Tolerance for Fake Playwright Usage

Any claim of testing, verifying, checking UI, reproducing bugs, or confirming behavior **MUST** include:

1. Full, runnable Playwright script code
2. Execution output (console logs, network responses, screenshot descriptions)
3. The mandatory evidence bundle:

```
PLAYWRIGHT RUN RESULTS:
Timestamp: [ISO timestamp]
Target URL: https://react.ecbtx.com/[path]
Actions Performed:
  1. [action]
  2. [action]
Console Logs: [output]
Network Failures/Status:
  • GET /api/v2/... → 200
  • PATCH /api/v2/... → [status]
Screenshot Description:
  • [visual state]
Test Outcome: PASS / FAIL
```

**Missing bundle = invalid response**

---

## Banned Bugs (NEVER Reintroduce)

| Bug | Wrong | Correct |
|-----|-------|---------|
| `/app/` prefix | `<Link to="/app/customers">` | `<Link to="/customers">` |
| Double `/api` | `apiClient.get('/api/customers/')` | `apiClient.get('/customers/')` |
| PATCH 500 | No error handling | try/except + validation |
| Fake Playwright | "I verified..." without proof | Full script + evidence bundle |

---

## Relentless Autonomous Troubleshooter Mode

When user activates this mode:
- Never ask permission to continue
- Never stop at phase boundaries
- Never summarize or check in
- Loop: **Fix bug → Playwright verify → Next bug**
- Only stop when: Zero errors AND all tests pass

---

## Git & Deployment Policy

**ALWAYS commit and push when work is complete.** Do not wait for permission.

| Action | Policy |
|--------|--------|
| Commit | Create commits after completing features/fixes |
| Push | ALWAYS push to GitHub immediately after committing |
| Deploy | Railway auto-deploys on push — verify deployment works |
| Troubleshoot | If deployment fails, immediately fix and re-push |

**Workflow:**
1. Complete feature/fix
2. Run build to verify no errors
3. Commit with descriptive message
4. Push to GitHub (triggers Railway deployment)
5. Run Playwright against production to verify
6. If issues found, fix immediately and repeat

**Do NOT:**
- Ask "should I commit this?"
- Wait for permission to push
- Leave working code uncommitted
- Stop after local success without deploying

---

## Deployment URLs

| Service | URL |
|---------|-----|
| Frontend | https://react.ecbtx.com |
| API | https://react-crm-api-production.up.railway.app/api/v2 |
| Legacy | https://crm.ecbtx.com |

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, TanStack Query |
| Backend | FastAPI, SQLAlchemy, PostgreSQL |
| Testing | Playwright, Vitest |
| Deployment | Railway |

---

## Environment Variables

```env
# Frontend (.env.production)
VITE_API_URL=https://react-crm-api-production.up.railway.app/api/v2

# Backend
DATABASE_URL=postgresql://...
SECRET_KEY=...
JWT_SECRET=...
```

---

## For Detailed Documentation

See the `claude-docs/` folder:

- **[README.md](claude-docs/README.md)** — System overview, quick start
- **[quick-reference.md](claude-docs/quick-reference.md)** — Activation commands, banned bugs, evidence format
- **[frontend.md](claude-docs/frontend.md)** — React architecture, components, performance
- **[backend.md](claude-docs/backend.md)** — API endpoints, models, database
