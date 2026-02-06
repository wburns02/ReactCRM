# Payment Plans Bug Reproduction Report

## Test Date: 2026-01-26

## Test Environment
- URL: https://react.ecbtx.com/billing/payment-plans
- Login: will@macseptic.com / #Espn2025
- Browser: Chromium (Playwright)

## Playwright Test Results

### Test 1: Page loads with data
**Status**: PASS
- Page title "Payment Plans" is visible
- Found 5 payment plan rows
- Customer "Johnson Residence" is displayed
- Data fetches successfully from `/api/v2/payment-plans`

### Test 2: Create button behavior
**Status**: WORKING (unexpected based on local code)
- Create button has `onclick: null` attribute
- BUT: Modal DOES appear when clicked (`Modal visible after click: true`)
- This indicates production has React onClick handlers, not HTML onclick

### Test 3: Table row click behavior
**Status**: WORKING (unexpected based on local code)
- Row classes include: `hover:bg-bg-hover cursor-pointer transition-colors`
- Row click DOES navigate: `URL after row click: https://react.ecbtx.com/billing/payment-plans/1`
- The `cursor-pointer` class and click handler ARE present in production

### Test 4: View button behavior
**Status**: TIMEOUT (needs investigation)
- View element is a `<button>` not `<a>`
- View link href: `null`
- Test timed out, possibly due to navigation or context closure

### Test 5: Console errors and network failures
**Status**: PASS (some errors noted)
- Console errors: 500 errors from `/api/v2/invoices/?page_size=100&status=unpaid`
- This is unrelated to Payment Plans functionality

## Key Finding

**DISCREPANCY DETECTED**: The local codebase (`/home/will/ReactCRM/src/features/billing/pages/PaymentPlansPage.tsx`) shows:
- Button with no onClick: `<button className="...">Create Payment Plan</button>`
- Table rows with no onClick: `<tr key={plan.id} className="hover:bg-bg-hover">`
- View button with no handler: `<button className="text-primary...">View</button>`

But the production deployment at https://react.ecbtx.com shows:
- Create button opens a modal
- Rows have `cursor-pointer` and navigate on click
- Full interactivity working

## Root Cause Analysis

The local ReactCRM folder is NOT a git repository (no `.git` folder). This means:
1. The local code is stale/outdated
2. Production was deployed from a different source
3. The "bug" may have already been fixed in the actual deployed version

## Recommendations

1. **Clone the official repository** to get the current production source code
2. **Verify if there's a remote repository** that Railway deploys from
3. **Compare local vs deployed code** to understand the discrepancy

## Network Issues Found (Unrelated)
- 500 errors on `/api/v2/invoices/?page_size=100&status=unpaid` endpoint
- This affects other parts of the billing system but not Payment Plans
