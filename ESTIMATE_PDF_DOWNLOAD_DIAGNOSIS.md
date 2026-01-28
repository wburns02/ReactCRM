# Estimate PDF Download - Bug Diagnosis

## Bug Description
Download PDF button on estimate detail page does nothing when clicked. No file downloads, no network request, no console error - complete silent failure.

## Root Cause
1. **Frontend:** Button had NO onClick handler - just static HTML
2. **Backend:** NO PDF endpoint existed for quotes/estimates

## Code Analysis

### Frontend Issue (EstimateDetailPage.tsx line 100-102)
```tsx
// BEFORE - Broken
<button className="...">
  Download PDF
</button>

// No onClick, no mutation hook, nothing wired
```

### Backend Issue (quotes.py)
```python
# NO endpoint for PDF generation
# Only CRUD + send/accept/convert implemented
```

## Fix Implementation

### Backend Changes (app/api/v2/quotes.py)
- Added `@router.get("/{quote_id}/pdf")` endpoint
- Uses WeasyPrint for HTML-to-PDF conversion
- Professional HTML template with:
  - Company header
  - Estimate number and date
  - Customer info
  - Line items table
  - Subtotal, tax, total
  - Notes and terms
- Returns PDF as downloadable attachment

### Frontend Changes
1. **useQuotes.ts** - Added `useDownloadEstimatePDF` mutation hook
2. **EstimateDetailPage.tsx** - Wired button with:
   - `onClick={handleDownloadPDF}`
   - `disabled={downloadPDF.isPending}`
   - Loading state: "Downloading..."
   - Success/error toast notifications

## Files Modified
- `/home/will/projects/react-crm-api/app/api/v2/quotes.py`
- `/home/will/projects/ReactCRM/src/api/hooks/useQuotes.ts`
- `/home/will/projects/ReactCRM/src/features/billing/pages/EstimateDetailPage.tsx`

## Commits
- Backend: 441e476 - "feat: Add PDF generation endpoint for quotes/estimates"
- Frontend: 162911a - "feat: Wire Download PDF button on estimate detail page"

## Deployment Status
- Code pushed to GitHub: YES
- Backend deployment: PENDING (Railway auto-deploy in progress)
- Frontend deployment: PENDING

## Verification Plan
1. Wait for Railway deployment to complete
2. Test PDF endpoint directly via curl
3. Run Playwright tests
4. Verify PDF content quality
