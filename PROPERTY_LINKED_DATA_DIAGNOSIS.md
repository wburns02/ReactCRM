# Property Linked-Data Diagnosis

## Date: January 22, 2026

## Issue Summary
ZERO permits show linked-property indicators on the Permits page despite:
1. Code being written to show green/gray house icons based on `has_property`
2. 7,134 permits (71%) being linked to properties in the database
3. Frontend properly checking `result.permit.has_property`

## Root Cause: Backend Not Deployed (Railway Manual Deploy Required)

**The production backend API does not return the `has_property` field.**

### Railway Deployment Status
- **Current Production Version**: 2.5.3
- **Code Pushed Version**: 2.5.4 (with `has_property` field)
- **Auto-Deploy**: NOT WORKING
- **Commits pushed**:
  - `0f90d46` feat(permits): Add has_property field to search results
  - `b95a33c` chore: trigger Railway redeploy for has_property field
  - `c35d333` chore: bump version to 2.5.4 for has_property feature

**ACTION REQUIRED**: Manually trigger Railway deployment from dashboard

### Evidence

API Response from production:
```json
{
  "results": [{
    "permit": {
      "id": "...",
      "permit_number": "...",
      "address": "...",
      "city": "...",
      "state_code": "...",
      "county_name": "...",
      "owner_name": "...",
      "permit_date": "...",
      "system_type": "..."
    },
    "score": 1.0,
    ...
  }]
}
```

**Missing fields:**
- `has_property` - NOT RETURNED
- `pdf_url` - NOT RETURNED
- `expiration_date` - NOT RETURNED

### Code Is Correct

| Layer | File | Status |
|-------|------|--------|
| Backend Schema | `backend/app/schemas/septic_permit.py:248` | ✅ `has_property: bool = False` defined |
| Backend Service | `backend/app/services/permit_search_service.py:225` | ✅ `has_property=permit.property_id is not None` |
| Frontend Types | `src/api/types/permit.ts:78` | ✅ `has_property: z.boolean().default(false)` |
| Frontend UI | `src/features/permits/components/PermitResults.tsx:229` | ✅ Renders icon based on `has_property` |

### Timeline

| Commit | Date | What |
|--------|------|------|
| `f0630e7` | Jan 21, 2026 | Added `has_property` to PermitSummary schema |
| `3d46c12` | Jan 22, 2026 | Frontend pagination fixes |
| `65f6f2f` | Jan 22, 2026 | Playwright tests |

**The backend changes in `f0630e7` have NOT been deployed to production.**

## Solution: Deploy Backend

The backend runs separately at: `https://react-crm-api-production.up.railway.app/api/v2`

### Option 1: Redeploy via Railway Dashboard
1. Go to Railway dashboard
2. Find the react-crm-api service
3. Trigger a manual redeploy from the latest commit

### Option 2: Check if Backend Has Separate Repo
The backend may be in a separate git repository that needs to be pushed/deployed independently.

### Option 3: Contact DevOps/Will
Ask Will Burns how the backend is deployed.

## Data Verification

Once backend is deployed, verify with:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://react-crm-api-production.up.railway.app/api/v2/permits/search?page=1&page_size=5" | jq '.results[].permit.has_property'
```

Expected: Mix of `true` and `false` values (71% should be `true`)

## Future Enhancements

Once `has_property` is working, consider adding:
1. `has_document` - based on `pdf_url` field
2. `expiration_status` - color-coded based on `expiration_date`
3. `data_quality` - based on `data_quality_score`

These require adding fields to PermitSummary and updating the search service.
