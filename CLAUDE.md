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
| 6 | **NEVER use `railway up`** — always deploy via git push to GitHub |

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
| Deploy | Railway auto-deploys on push — **VERIFY deployment succeeds** |
| Troubleshoot | If deployment fails, immediately fix and re-push |

**Workflow:**
1. Complete feature/fix
2. Run build to verify no errors
3. Commit with descriptive message
4. Push to GitHub (triggers Railway deployment)
5. **VERIFY DEPLOYMENT SUCCESS** (see Railway Verification below)
6. Run Playwright against production to verify
7. If issues found, fix immediately and repeat

**Do NOT:**
- Ask "should I commit this?"
- Wait for permission to push
- Leave working code uncommitted
- Stop after local success without deploying
- Use `railway up` or `railway redeploy` — these commands do not work
- **Assume deployment succeeded without verification**

---

## Railway Deployment Verification (MANDATORY)

**CRITICAL: After EVERY push, verify Railway deployment succeeded.**

### Two Separate Services

| Service | Repo | Railway Service | Health Check |
|---------|------|-----------------|--------------|
| **Frontend** | `ReactCRM` | react.ecbtx.com | N/A (static) |
| **Backend API** | `react-crm-api` | react-crm-api-production | `/health` endpoint |

### Backend Deployment Verification

After pushing to `react-crm-api`, ALWAYS run:
```bash
curl -s "https://react-crm-api-production.up.railway.app/health"
```

Check:
1. **Version number** matches expected (e.g., "2.5.4")
2. **Status** is "healthy"

If version is old, deployment may have **FAILED SILENTLY**.

### Common Deployment Failures

| Error | Cause | Fix |
|-------|-------|-----|
| "Deployment failed during network process" | Railway networking issue | Wait 5 min, push empty commit to retry |
| Version unchanged after push | Build failed or webhook broken | Check Railway dashboard logs |
| 500 errors after deploy | Code bug or missing migration | Check logs, rollback if needed |

### Verification Workflow

```bash
# 1. Push changes
git push origin master

# 2. Wait 2-3 minutes for deploy

# 3. Check backend version
curl -s "https://react-crm-api-production.up.railway.app/health" | grep version

# 4. If version unchanged, CHECK RAILWAY DASHBOARD for failures

# 5. Run Playwright tests to verify functionality
npx playwright test [relevant-test-file]
```

### If Deployment Keeps Failing

1. Check Railway dashboard for error logs
2. Verify no syntax errors: `cd backend && python -c "from app.main import app"`
3. Check for missing dependencies in requirements.txt
4. Try pushing an empty commit: `git commit --allow-empty -m "chore: retry deploy"`
5. If still failing, investigate Railway service health/networking

---

## Deployment URLs

| Service | URL |
|---------|-----|
| Frontend | https://react.ecbtx.com |
| API | https://react-crm-api-production.up.railway.app/api/v2 |
| Uptime Kuma | https://uptime-kuma-production-3500.up.railway.app |
| Legacy | https://crm.ecbtx.com |

---

## Railway Infrastructure (Updated 2026-02-12)

### Project: Mac-CRM-React
- **Project ID:** `2f53f388-7aa5-41eb-842e-e565b1a8fdcb`
- **Workspace:** wburns02's Projects (`a82459bc-1ed6-433c-97f3-0e3310706ccd`)
- **Region:** US East (Virginia) — `us-east4-eqdc4a`

### Environments
| Environment | ID | Purpose |
|-------------|-----|---------|
| **production** | `111ffeb6-6b6b-4d0b-9f1a-af621704c363` | Live production |
| **staging** | `ca636a04-fc1e-481f-b42b-23106c9d6347` | Testing before production (duplicated from prod) |

**PR Deploys: ENABLED** — Every PR gets its own preview environment with unique URL.

### Services (Production)
| Service | ID | Type | Status |
|---------|-----|------|--------|
| **Mac-Septic-CRM** (frontend) | `fd8ee9bd-3449-4c5a-9110-6de8af3a3a72` | GitHub: wburns02/ReactCRM | react.ecbtx.com |
| **react-crm-api** (backend) | `bdab375c-d825-43bb-869a-b23224bd6a9f` | GitHub: wburns02/react-crm-api | react-crm-api-production.up.railway.app |
| **Postgres** | `f4704085-831e-4c44-bbff-51a210268e14` | PostgreSQL 17 (SSL) | Internal only |
| **Redis** | *(new 2026-02-12)* | Redis 8.2.1 | Internal only (`redis.railway.internal:6379`) |
| **Uptime Kuma** | *(new 2026-02-12)* | louislam/uptime-kuma:latest | uptime-kuma-production-3500.up.railway.app |
| **function-bun** | `8971ba59-fdd3-4abb-8e56-f3c98afb22df` | Hono test server | SLEEPING (can be deleted) |

### Railway CLI Linking
Both repos are linked to Railway CLI (v4.29.0):
- `/home/will/ReactCRM/` → Mac-Septic-CRM service
- `/home/will/react-crm-api/` → react-crm-api service

### Key Environment Variables on Backend
| Variable | Value/Reference | Purpose |
|----------|----------------|---------|
| `DATABASE_URL` | `postgresql://...@postgres.railway.internal:5432/railway` | PostgreSQL connection |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` → `redis://...@redis.railway.internal:6379` | Redis caching |
| `ENVIRONMENT` | `production` | Runtime environment flag |

### Railway Skill Quick Reference
Use these Claude Code skills for infrastructure management:
| Skill | Example Use |
|-------|-------------|
| `railway-status` | "Is production up?" |
| `railway-deployment` | "Show me the last 50 backend logs" / "Why did deploy fail?" |
| `railway-environment` | "Add env var FOO=bar to backend" / "Show all variables" |
| `railway-metrics` | "What's the CPU/memory usage?" |
| `railway-projects` | "Enable/disable PR deploys" |
| `railway-database` | "Add a new database service" |
| `railway-templates` | "Deploy n8n / Minio / etc." |

### Resource Usage (as of 2026-02-12)
- **Backend memory:** ~426 MB (limit: 32 GB) — very healthy
- **CPU:** Minimal usage, well under 32-core limit
- **Samsara poller:** Runs every 5 seconds (visible in logs as httpx INFO)

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript 5.9, Vite 7, TanStack Query, Tailwind 4 |
| Backend | FastAPI, SQLAlchemy 2.0 async, PostgreSQL 16, Redis 8.2.1 |
| Testing | Playwright, Vitest |
| Deployment | Railway (git push auto-deploy) |
| Monitoring | Uptime Kuma (self-hosted) |

---

## Environment Variables

```env
# Frontend (.env.production)
VITE_API_URL=https://react-crm-api-production.up.railway.app/api/v2

# Sentry Error Tracking (Optional)
VITE_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/123456

# Backend (set on Railway, NOT in local .env)
DATABASE_URL=postgresql://...@postgres.railway.internal:5432/railway
REDIS_URL=redis://...@redis.railway.internal:6379
SECRET_KEY=...
ENVIRONMENT=production
```

### Sentry DSN Configuration

To enable Sentry error tracking:
1. Create a Sentry account at https://sentry.io
2. Create a new React project
3. Copy the DSN from Project Settings > Client Keys (DSN)
4. Add `VITE_SENTRY_DSN` to Railway environment variables
5. Redeploy the frontend

Without VITE_SENTRY_DSN, error tracking is disabled (console shows "[Sentry] DSN not configured").

---

## For Detailed Documentation

See the `claude-docs/` folder:

- **[README.md](claude-docs/README.md)** — System overview, quick start
- **[quick-reference.md](claude-docs/quick-reference.md)** — Activation commands, banned bugs, evidence format
- **[frontend.md](claude-docs/frontend.md)** — React architecture, components, performance
- **[backend.md](claude-docs/backend.md)** — API endpoints, models, database
