# Property Linked-Data Implementation Plan

## Date: January 22, 2026

## Current Status

### What's Implemented (Pending Deployment)

| Component | Status | Details |
|-----------|--------|---------|
| **Backend Schema** | ✅ Ready | `has_property: bool = False` in PermitSummary |
| **Backend Service** | ✅ Ready | `has_property=permit.property_id is not None` |
| **Frontend Types** | ✅ Ready | `has_property: z.boolean().default(false)` |
| **Frontend UI** | ✅ Ready | Green/gray house icons in PermitResults |
| **Railway Deploy** | ⏳ Pending | Manual deploy required |

### Blocked By
- Railway deployment not auto-triggering from GitHub
- Need manual deployment from Railway dashboard

---

## Implementation Details

### 1. Backend Changes (react-crm-api repo)

**File: `app/schemas/septic_permit.py` (line 248)**
```python
class PermitSummary(BaseModel):
    ...
    has_property: bool = False  # Whether permit is linked to a property
```

**File: `app/services/permit_search_service.py` (line 200)**
```python
summary = PermitSummary(
    ...
    has_property=permit.property_id is not None
)
```

### 2. Frontend Changes (ReactCRM repo)

**File: `src/api/types/permit.ts`**
```typescript
export const permitSummarySchema = z.object({
  ...
  has_property: z.boolean().default(false),
});
```

**File: `src/features/permits/components/PermitResults.tsx`**
```tsx
{result.permit.has_property ? (
  <span data-testid="linked-property-icon" title="Linked to property">
    <svg className="w-5 h-5 text-green-600">...</svg>
  </span>
) : (
  <span data-testid="unlinked-property-icon" title="No linked property">
    <svg className="w-5 h-5 text-gray-300">...</svg>
  </span>
)}
```

---

## Future Enhancements

### Phase 2: Additional Indicators

| Indicator | Field | Icon | Status |
|-----------|-------|------|--------|
| **Has PDF** | `pdf_url` | 📄 | Need to add to PermitSummary |
| **Expiration** | `expiration_date` | 🟢🟡🔴 | Need to add to PermitSummary |
| **Data Quality** | `data_quality_score` | ⭐ | Need to add to PermitSummary |

### Phase 3: Enhanced UI

- Tooltip on hover showing linked property details
- Badge cluster with counts (permits, documents, photos)
- Color-coded expiration status:
  - Green: Valid (>30 days)
  - Orange: Expiring soon (<30 days)
  - Red: Expired
  - Gray: No date

### Phase 4: Drill-Down

- Click linked property icon → show property panel
- Click document icon → show PDF viewer
- Quick-add buttons for unlinked permits

---

## Verification Steps

### After Deployment

1. Check API version:
   ```bash
   curl https://react-crm-api-production.up.railway.app/health
   # Expected: {"version": "2.5.4", ...}
   ```

2. Run Playwright tests:
   ```bash
   npx playwright test e2e/tests/permits-page.spec.ts
   # Expected: All tests pass, linked icons visible
   ```

3. Manual verification:
   - Login to https://react.ecbtx.com
   - Navigate to /permits
   - Verify green house icons appear for linked permits
   - Verify gray house icons appear for unlinked permits

---

## Commits Made

| Repo | Commit | Description |
|------|--------|-------------|
| react-crm-api | `0f90d46` | feat(permits): Add has_property field to search results |
| react-crm-api | `c35d333` | chore: bump version to 2.5.4 for has_property feature |
| ReactCRM | `3d46c12` | fix(permits): Fix pagination and page size controls |
| ReactCRM | `65f6f2f` | test(e2e): Add comprehensive permits page Playwright tests |
