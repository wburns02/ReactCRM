---
active: true
iteration: 1
max_iterations: 0
completion_promise: null
started_at: "2026-01-26T12:58:45Z"
---

You are the Invoice Row Navigation Enforcer - Claude Opus - working in the ReactCRM frontend codebase.

Current status: Invoices page works - data loads and creation succeeds.

Your mission: Fine-tune Invoices into a 2026 best-practice experience with full row click navigation and modern polish.

Critical UX improvement: On the Invoices list page, only the small View button opens invoice details. Clicking anywhere else on the invoice row or card - number, customer, date, amount, status, etc - does nothing.

User expectation in 2025-2026: The entire invoice row should be clickable to navigate to details.

Additional 2026 best practices: hover effects, status badges, quick actions, responsive design, keyboard navigation.

Login credentials - must use in Playwright tests:
Username: will@macseptic.com
Password: #Espn2025

Invoices page URL: https://react.ecbtx.com/invoices

Max iterations: 80

Phased with maximum depth and honesty:

PHASE 1: DEEP CODEBASE DIVE AND REPRODUCTION
- Locate Invoices list component - likely InvoicesTable.tsx, InvoiceList.tsx, InvoiceCard.tsx, or src/features/invoices/
- Trace row rendering - tr, div with grid, Card, etc
- Identify current navigation - only View button uses Link or useNavigate
- Check for CSS pointer-events blocking, nested clickable elements stopping propagation
- Manually reproduce:
  1. Login with will@macseptic.com and #Espn2025
  2. Go to Invoices page
  3. Click invoice number - describe behavior
  4. Click customer name, date, amount, status, empty space - describe
  5. Click View button - confirm it works
- Document findings in INVOICE_ROW_CLICK_DIAGNOSIS.md

When root cause clear - missing onClick, event propagation, CSS - output: <promise>INVOICE_ROW_CLICK_ROOT_CAUSE_IDENTIFIED</promise>

PHASE 2: 2026 BEST PRACTICES PLAN
Create INVOICE_ROW_CLICK_PLAN.md with:
- Add onClick to entire row container
- Use cursor-pointer and subtle hover background for affordance
- Stop propagation on View button and quick actions
- Status badge with color coding - paid green, overdue red, partial orange
- Quick actions on hover - pay, send reminder, download PDF
- Accessibility - role button, tabindex, keyboard navigation
- Responsive - full width touch targets on mobile
- Consistent with other list pages - Customers, Work Orders, Technicians

PHASE 3: IMPLEMENTATION WITH MANUAL VERIFICATION
Implement incrementally.
After each change:
- Manually test:
  1. Login with will@macseptic.com and #Espn2025
  2. Go to Invoices
  3. Click invoice number - detail opens
  4. Click customer name - detail opens
  5. Click amount or date - detail opens
  6. Click empty space - detail opens
  7. Click View button - still works
  8. Hover row - actions appear, status clear
  9. Test on mobile view
- Report honest results in PROGRESS_INVOICE_ROW_CLICK.md

PHASE 4: PLAYWRIGHT ENFORCEMENT
Write tests/invoice-row-navigation.e2e.spec.ts

Exact required tests:
1. Login with will@macseptic.com and #Espn2025
2. Navigate to Invoices page
3. Locate first invoice row
4. Click invoice number - assert URL changes to /invoices/{id}
5. Go back
6. Click customer name in first row - assert navigates to same detail
7. Go back
8. Click amount or date - assert navigates
9. Go back
10. Click empty space in row - assert navigates
11. Click View button - assert still navigates
12. Hover row - assert quick actions visible
13. Repeat for second invoice row
14. Assert no console errors throughout

If any test fails - state exactly which and why - fix - repeat

Final success only when:
- Clicking any non-interactive part of invoice row opens detail
- View button preserved
- Hover feedback and quick actions modern
- Status visually clear
- Works on multiple rows and responsive
- Playwright tests pass on real run

Then - and only then - output exactly: <promise>INVOICE_ROW_FULLY_CLICKABLE_AND_2026_POLISHED</promise>

Invoices work. Ralph makes them feel premium.
