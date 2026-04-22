# Indeed Integration Progress

## Iteration 1 (2026-04-22)

### Backend commits
- `9ef4332` in react-crm-api — migration 105 + XML feed alias + JSON webhook.
  - Migration ran on Railway via `POST /health/db/migrate-hr` (104 → 105).
  - `version_after: "105"` confirmed.

### Frontend commits
- `a4db7f8` in ReactCRM — IndeedSettingsPage, route, nav entry, HR Overview shortcut.

### Live verification

**XML Feed** — `GET https://react-crm-api-production.up.railway.app/careers/indeed-feed.xml`
```
HTTP 200
<?xml version='1.0' encoding='utf-8'?>
<source>
  <publisher>Mac Septic</publisher>
  ...
  <job>
    <title><![CDATA[E2E Demo Technician]]></title>
    <referencenumber>e2e-demo-tech</referencenumber>
    <url>.../careers/e2e-demo-tech</url>
    <jobtype>fulltime</jobtype>
  </job>
</source>
```

**Webhook** — `POST /hr/indeed-apply` with Indeed-Apply-shaped JSON
```json
{ "application_id": "bd4a2c9a-...", "applicant_id": "16daa698-...", "stage": "applied", "source": "indeed" }
```
Applicant + HrApplication row created with `source=indeed` in production DB.

**Toggle** — On `/hr/settings/indeed`, clicking Publish toggle OFF removed the job from the public feed within ~1s. Toggling ON restored it. Change persists across reload (DB-backed).

**Legacy path preserved** — `/careers/jobs.xml` still returns the same XML (no breakage).

### Manual verification steps
> 1. Hard-refresh https://react.ecbtx.com/hr/settings/indeed
> 2. Click **Copy** on the feed URL; paste into a new tab — should return valid XML listing every open requisition with Publishing toggle on.
> 3. Click **Copy** on the webhook URL; POST JSON `{"job":{"jobId":"<slug>"},"applicant":{"fullName":"Test User","email":"t@example.com"}}` via curl — should return 201 with application_id.
> 4. Toggle a requisition's Publishing switch off; reload; refetch feed — the job disappears.
> 5. Toggle back on; refetch feed — the job reappears.
