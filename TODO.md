# ReactCRM Feature Migration - Autonomous Task Queue

This file drives overnight autonomous loops. Each task is atomic and completable in one session.

## Format
- `[ ]` Pending | `[~]` In-progress | `[x]` Completed
- `PRIORITY:HIGH` - Process first
- `BLOCKED: reason` - Skip until unblocked

---

## PHASE 1: CALL CENTER & TELEPHONY ✅ COMPLETE

### Backend API (react-crm-api)
- [x] PRIORITY:HIGH - Create CallLog (already existed) SQLAlchemy model (id, direction, caller, callee, duration, recording_url, transcript, disposition, created_at)
- [x] Create CallDisposition model (id, name, description, color, is_active)
- [x] Create GET /api/v2/calls endpoint with pagination and filters (date_range, direction, disposition)
- [x] Create GET /api/v2/calls/{id} endpoint for call details
- [x] Create GET /api/v2/call-dispositions endpoint
- [x] Create POST /api/v2/calls/{id}/disposition endpoint to set disposition
- [x] Create GET /api/v2/calls/analytics endpoint (call volume by hour, missed calls, avg duration)

### Frontend Components (ReactCRM)
- [x] Create src/features/calls/api/calls.ts with React Query hooks (useCalls, useCall, useCallDispositions)
- [x] Create src/features/calls/components/CallList.tsx - paginated table with filters
- [x] Create src/features/calls/components/CallDetails.tsx - individual call view
- [x] Create src/features/calls/components/CallRecordingPlayer.tsx - audio player component
- [x] Create src/features/calls/components/DispositionBadge.tsx - colored disposition display
- [x] Create src/features/calls/pages/CallsPage.tsx - main calls route
- [x] Add /calls route to router and navigation

---

## PHASE 2: COMPLIANCE & REGULATORY ✅ COMPLETE

### Backend API
- [x] Create License model (id, type, number, issued_date, expiry_date, status, notes) - already existed
- [x] Create Certification model (id, technician_id, name, issued_date, expiry_date, document_url) - already existed
- [x] Create Inspection model (id, customer_id, scheduled_date, completed_date, result, inspector, notes) - already existed
- [x] Create GET /api/v2/compliance/licenses endpoint - already existed
- [x] Create POST /api/v2/compliance/licenses endpoint - already existed
- [x] Create GET /api/v2/compliance/certifications endpoint - already existed
- [x] Create GET /api/v2/compliance/inspections endpoint - already existed
- [x] Create GET /api/v2/compliance/alerts endpoint (items expiring in 30/60/90 days) - already existed
- [x] Create GET /api/v2/compliance/dashboard endpoint (summary stats) - already existed

### Frontend Components
- [x] Create src/features/compliance/api/compliance.ts with React Query hooks
- [x] Create src/features/compliance/components/LicenseList.tsx
- [x] Create src/features/compliance/components/CertificationList.tsx
- [x] Create src/features/compliance/components/InspectionList.tsx (replaced InspectionCalendar)
- [x] Create src/features/compliance/components/ComplianceAlerts.tsx - expiration warnings
- [x] Create src/features/compliance/pages/ComplianceDashboard.tsx
- [x] Add /compliance route to router and navigation

---

## PHASE 3: CONTRACTS & SERVICE AGREEMENTS ✅ COMPLETE

### Backend API
- [x] Create Contract model - already existed
- [x] Create ContractTemplate model - already existed
- [x] Create GET /api/v2/contracts endpoint with filters - already existed
- [x] Create POST /api/v2/contracts endpoint - already existed
- [x] Create GET /api/v2/contracts/{id} endpoint - already existed
- [x] Create POST /api/v2/contracts/{id}/activate endpoint - already existed
- [x] Create GET /api/v2/contract-templates endpoint - already existed
- [x] Create POST /api/v2/contract-templates endpoint - already existed
- [x] Create GET /api/v2/contracts/generate-from-template endpoint - already existed
- [x] Create GET /api/v2/contracts/dashboard/summary endpoint - already existed

### Frontend Components
- [x] Create src/features/contracts/api/contracts.ts with React Query hooks
- [x] Create src/features/contracts/components/ContractList.tsx
- [x] Create src/features/contracts/components/ContractDetails.tsx
- [x] Create src/features/contracts/components/ContractTemplates.tsx
- [x] Create src/features/contracts/components/ExpiringContractsAlert.tsx
- [x] Create src/features/contracts/pages/ContractsPage.tsx
- [x] Add /contracts route to router and navigation

---

## PHASE 4: TIME TRACKING

### Backend API
- [ ] Create TimeEntry model (id, technician_id, work_order_id, clock_in, clock_out, break_minutes, notes)
- [ ] Create POST /api/v2/time-entries/clock-in endpoint
- [ ] Create POST /api/v2/time-entries/clock-out endpoint
- [ ] Create GET /api/v2/time-entries endpoint with filters (technician, date_range)
- [ ] Create GET /api/v2/timesheets endpoint - aggregated by week
- [ ] Create POST /api/v2/timesheets/{id}/approve endpoint

### Frontend Components
- [ ] Create src/features/time-tracking/api/timeTracking.ts with React Query hooks
- [ ] Create src/features/time-tracking/components/TimeClockWidget.tsx - clock in/out button
- [ ] Create src/features/time-tracking/components/TimesheetView.tsx - weekly view
- [ ] Create src/features/time-tracking/components/TimeEntryList.tsx
- [ ] Add TimeClockWidget to employee portal header
- [ ] Create src/features/time-tracking/pages/TimesheetsPage.tsx
- [ ] Add /timesheets route to router and navigation

---

## PHASE 5: JOB COSTING

### Backend API
- [ ] Create JobCost model (id, work_order_id, type, description, quantity, unit_cost, total)
- [ ] Create GET /api/v2/work-orders/{id}/costs endpoint
- [ ] Create POST /api/v2/work-orders/{id}/costs endpoint
- [ ] Create DELETE /api/v2/work-orders/{id}/costs/{cost_id} endpoint
- [ ] Create GET /api/v2/job-costing/summary endpoint (totals by type)
- [ ] Create GET /api/v2/job-costing/profitability endpoint (revenue vs costs)

### Frontend Components
- [ ] Create src/features/job-costing/api/jobCosting.ts with React Query hooks
- [ ] Create src/features/job-costing/components/JobCostingPanel.tsx - add to work order details
- [ ] Create src/features/job-costing/components/CostEntryForm.tsx
- [ ] Create src/features/job-costing/components/ProfitabilityChart.tsx
- [ ] Add JobCostingPanel to WorkOrderDetails page
- [ ] Create src/features/job-costing/pages/ProfitabilityReport.tsx
- [ ] Add /reports/profitability route

---

## PHASE 6: DATA IMPORT

### Backend API
- [ ] Create POST /api/v2/import/customers endpoint (accepts CSV)
- [ ] Create POST /api/v2/import/work-orders endpoint (accepts CSV)
- [ ] Create GET /api/v2/import/templates/customers endpoint (download CSV template)
- [ ] Create GET /api/v2/import/templates/work-orders endpoint
- [ ] Add validation and error reporting to import endpoints

### Frontend Components
- [ ] Create src/features/import/api/import.ts with React Query hooks
- [ ] Create src/features/import/components/FileUploader.tsx - drag-drop CSV upload
- [ ] Create src/features/import/components/ImportPreview.tsx - show parsed data before import
- [ ] Create src/features/import/components/ImportResults.tsx - success/error summary
- [ ] Create src/features/import/pages/DataImportPage.tsx
- [ ] Add /admin/import route to router and navigation

---

## PHASE 7: ENHANCED REPORTING

### Backend API
- [ ] Create GET /api/v2/reports/revenue-by-service endpoint
- [ ] Create GET /api/v2/reports/revenue-by-technician endpoint
- [ ] Create GET /api/v2/reports/revenue-by-location endpoint
- [ ] Create GET /api/v2/reports/customer-lifetime-value endpoint
- [ ] Create GET /api/v2/reports/technician-performance endpoint

### Frontend Components
- [ ] Create src/features/reports/components/RevenueByServiceChart.tsx
- [ ] Create src/features/reports/components/RevenueByTechnicianChart.tsx
- [ ] Create src/features/reports/components/CLVReport.tsx
- [ ] Create src/features/reports/components/TechnicianPerformanceTable.tsx
- [ ] Enhance src/features/reports/pages/ReportsPage.tsx with new report cards

---

## MAINTENANCE & POLISH

- [ ] Run npm run build and fix any TypeScript errors
- [ ] Run npx playwright test and fix any E2E failures
- [ ] Review and update navigation menu order
- [ ] Add loading states to all new pages
- [ ] Add error boundaries to all new features
- [ ] Update dashboard to show new module stats

---

## Completed Tasks

<!-- Move completed tasks here for reference -->

---

## Notes

- Reference legacy code at C:/Users/Will/crm-work/Mac-Septic-CRM for implementation details
- FastAPI backend at C:/Users/Will/crm-work/react-crm-api
- Follow existing patterns in codebase (TanStack Query, Zod validation, etc.)
- Commit after each completed task
- Run tests before marking complete

---

*Last updated: 2026-01-03*
*Processed by: autonomous-claude*
