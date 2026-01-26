---
active: true
iteration: 1
max_iterations: 0
completion_promise: null
started_at: "2026-01-26T16:58:47Z"
---

You are the Invoice Detail Page Ultimate Enforcer - Claude Opus - working in the ReactCRM frontend codebase and react-crm-api backend.

Current status: Invoice detail page works but lacks key 2026 features and polish.

Your mission: Transform the invoice detail page into a premium, complete 2026 experience with all high-impact additions.

Must-have features to add:
- Download PDF button - professional branded template with logo, terms, line items
- Send Invoice via Email button - one-click compose with attachment
- Online Payment button - generate Stripe or similar link, show Pay Now
- Attachments and Photos section - show job photos, signed work orders, upload
- Notes and History Timeline - internal notes plus audit log
- Improved Totals - larger total, amount due highlighted, tax breakdown
- Print-Friendly mode - clean print view
- Mobile optimizations - stacked layout, large tap targets
- Status badge larger and colored
- Quick actions on hover - pay, send reminder

All code changes must be committed and pushed to GitHub with clear messages. Verification must use real deployed app after push.

Login credentials - must use in Playwright tests:
Username: will@macseptic.com
Password: #Espn2025

Invoice detail URL example: https://react.ecbtx.com/invoices/{id}

Max iterations: 100

Phased with maximum depth and honesty:

PHASE 1: DEEP CODEBASE DIVE AND CURRENT STATE
- Locate invoice detail component - likely InvoiceDetailPage.tsx, InvoiceView.tsx, or src/features/invoices/
- Trace current features - line items, totals, actions
- Check PDF generation - existing or none?
- Check email integration - existing composer?
- Check payment integration - Stripe setup?
- Check attachments - model and display?
- Manually explore:
  1. Login with will@macseptic.com and #Espn2025
  2. Open an invoice detail
  3. Describe current buttons, sections, layout
  4. Test on mobile view
- Document findings in INVOICE_DETAIL_CURRENT_STATE.md

When current flow understood, output: <promise>INVOICE_DETAIL_CURRENT_STATE_MAPPED</promise>

PHASE 2: 2026 BEST PRACTICES PLAN
Create INVOICE_DETAIL_2026_PLAN.md with prioritized implementation:
- Download PDF first - client-side with jsPDF or react-pdf
- Send via Email
- Online Pay button
- Attachments section
- Notes and timeline
- Totals polish
- Print mode
- Mobile responsive
- Commit plan for GitHub pushes

PHASE 3: IMPLEMENTATION WITH MANUAL VERIFICATION
Implement features incrementally - prioritize PDF, Email, Pay.
After each major feature:
- Commit and push to GitHub
- Wait for deploy
- Manually test:
  1. Login with will@macseptic.com and #Espn2025
  2. Open invoice detail
  3. Test new button - PDF downloads? Looks branded?
  4. Send email - composer opens with attachment?
  5. Pay button - link generated?
  6. Attachments visible and uploadable?
  7. Notes added?
  8. Layout good on mobile?
- Report honest results with deploy status in PROGRESS_INVOICE_DETAIL_2026.md

PHASE 4: PLAYWRIGHT ENFORCEMENT AGAINST LIVE APP
Write tests/invoice-detail-2026.e2e.spec.ts

Exact required tests:
1. Login with will@macseptic.com and #Espn2025
2. Navigate to an invoice detail page
3. Assert Download PDF button visible
4. Click Download PDF - assert download starts
5. Assert Send Email button - opens composer with attachment
6. Assert Pay Now button visible
7. Assert Attachments section with images if present
8. Assert Notes timeline visible
9. Assert Totals clear and highlighted
10. Test on mobile viewport - layout clean
11. Assert no console errors

If any test fails - state exactly which and why - fix code, push to GitHub, redeploy - repeat

Final success only when:
- All key 2026 features implemented
- PDF downloads branded
- Email and Pay work
- Attachments and notes functional
- Mobile perfect
- Changes pushed to GitHub
- Playwright tests pass against live deployed app

Then - and only then - output exactly: <promise>INVOICE_DETAIL_2026_COMPLETE</promise>

Good base. Ralph makes it elite.
