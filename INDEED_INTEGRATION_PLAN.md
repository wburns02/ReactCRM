# Indeed Integration Implementation Plan

Five atomic chunks. Each chunk commits, pushes, waits for Railway, live-verifies.

## Chunk 1 — Migration 105: `publish_to_indeed`

File: `alembic/versions/105_hr_req_publish_to_indeed.py`
- `op.add_column("hr_requisitions", sa.Column("publish_to_indeed", sa.Boolean, nullable=False, server_default=sa.text("true")))`
- Downgrade drops column.
- Also add field to `HrRequisition` ORM model (`app/hr/recruiting/models.py`).
- Verify: migration runs on Railway boot without error.

## Chunk 2 — Backend XML endpoint + webhook + schema

Files:
- `app/hr/careers/router.py` — add `@careers_router.get("/indeed-feed.xml")` filtered by `publish_to_indeed`.
- `app/hr/recruiting/indeed_webhook.py` (new) — `POST /hr/indeed-apply` JSON handler.
- `app/main.py` — mount the new router at root (no /api/v2 prefix, per user spec "POST /hr/indeed-apply").
- `app/hr/recruiting/schemas.py` — add `publish_to_indeed` to `RequisitionOut`, `RequisitionCreate`, `RequisitionUpdate`.
- `app/hr/recruiting/services.py` — propagate the field in create/update/list.

Verify: hit `https://react-crm-api-production.up.railway.app/careers/indeed-feed.xml`, confirm valid XML. POST a sample JSON to `/hr/indeed-apply`, confirm 201 and applicant row with `source=indeed`.

## Chunk 3 — Frontend schema + hook update

Files:
- `src/features/hr/recruiting/api.ts` — add `publish_to_indeed: z.boolean()` to `requisitionSchema` and `requisitionInputSchema`.
- Verify: build green.

## Chunk 4 — HR Indeed settings page

Files:
- `src/features/hr/recruiting/pages/IndeedSettingsPage.tsx` (new)
  - Header + description
  - Feed URL card with copy button
  - Webhook URL card with copy button
  - Requisition table with per-row toggle (PATCH `publish_to_indeed`)
  - "Open Indeed Employer dashboard" link
- `src/features/hr/index.ts` — export it.
- `src/routes/app/hr.routes.tsx` — register `/hr/settings/indeed`.
- `src/features/hr/dashboard/pages/HrOverviewPage.tsx` — add "Indeed integration" shortcut card.
- `src/components/layout/navConfig.ts` — add "Indeed settings" entry.

Verify: /hr/settings/indeed renders, feed URL visible, toggle updates and persists after reload.

## Chunk 5 — Playwright e2e + final verify

File:
- `e2e/features/indeed-integration.spec.ts`
  - Fetch feed URL, parse XML, assert at least the seeded requisition appears (by `<referencenumber>slug</referencenumber>`).
  - POST a JSON payload to `/hr/indeed-apply`, assert 201 + JSON result.
  - Visit `/hr/settings/indeed`, verify feed URL is visible and toggle changes persist via reload.

Live verify on react.ecbtx.com after each chunk. Terminal promise: `INDEED_INTEGRATION_FULLY_WORKING`.
