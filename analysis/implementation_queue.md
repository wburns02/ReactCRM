# Implementation Queue
> Master dispatch file for CRM improvements
> Analysis location: /analysis/

---

## 🔄 Currently Working On
- [ ] **None** — Ready for next item

---

## 🔥 P0: CRITICAL (Weeks 1-2)

### ~~1. SMS Notification System~~ COMPLETE
- **Status:** COMPLETE (2026-01-08)
- **Evidence:** `/evidence/sms_notifications/test_results.txt`
- **Files Created:**
  - `src/api/types/sms.ts` - Comprehensive TypeScript types
  - `src/api/hooks/useSMSNotifications.ts` - React Query hooks
  - `src/features/sms/services/SMSService.ts` - Core SMS service
  - `src/features/sms/templates/notificationTemplates.ts` - Message templates
  - `src/features/sms/components/SMSPreferences.tsx` - Customer preferences UI
  - `e2e/tests/sms-notifications.spec.ts` - Playwright tests

### ~~2. Offline-First Mobile App~~ COMPLETE
- **Status:** COMPLETE (2026-01-08)
- **Evidence:** `/evidence/offline_mobile/test_results.txt`
- **Files Created:**
  - `src/lib/syncEngine.ts` - Conflict resolution and exponential backoff
  - `src/features/workorders/hooks/useOfflineWorkOrders.ts` - Offline work order management
  - `src/features/workorders/components/PhotoQueue.tsx` - Offline photo capture and queue
  - `src/features/workorders/components/OfflineSignature.tsx` - Canvas signature capture
  - `src/components/pwa/OfflineBanner.tsx` - Enhanced offline/sync indicators
  - `e2e/tests/offline-mode.spec.ts` - Playwright tests
- **Features Delivered:**
  - [x] Work orders accessible without connectivity
  - [x] Photo capture queued for sync
  - [x] Digital signatures work offline
  - [x] Automatic sync when connectivity returns
  - [x] Conflict resolution for concurrent edits (server-wins)
  - [x] Clear UI indicators for offline/syncing state
- **Success Metric:** Zero data loss in field, technician productivity +20%

### ~~3. Real-Time Technician Tracking~~ COMPLETE
- **Status:** COMPLETE (2026-01-08)
- **Evidence:** `/evidence/realtime_tracking/test_results.txt`
- **Files Created:**
  - `src/api/types/tracking.ts` - TypeScript types with Zod validation
  - `src/api/hooks/useRealTimeTracking.ts` - React Query hooks with WebSocket
  - `src/features/tracking/components/TrackingMap.tsx` - Leaflet map component
  - `src/features/tracking/components/ETADisplay.tsx` - Dynamic ETA display
  - `src/features/tracking/TechnicianTracker.tsx` - Dispatch tracking view
  - `e2e/tests/realtime-tracking.spec.ts` - Playwright tests
- **Features Delivered:**
  - [x] GPS capture from mobile app (30s configurable interval)
  - [x] Live map in dispatch/operations view
  - [x] ETA calculation based on current location
  - [x] Customer-facing tracking link at /track/:token (no auth required)
  - [x] Location history for path visualization
  - [x] Geofence-aware status detection
- **Routes Added:**
  - PUBLIC: `/track/:token` - Customer tracking page
  - AUTH: `/tracking` - GPS Tracking Dashboard
  - AUTH: `/tracking/dispatch` - Real-time Dispatch Tracker
- **Success Metric:** Customer tracking link usage >60%, dispatch efficiency +15%

---

## ⚡ P1: HIGH VALUE (Weeks 3-6)

### 4. AI-Powered Intelligent Dispatch
- **Module:** Operations, AI & Analytics
- **Analysis:** `/analysis/modules/05_operations_analysis.md`, `/analysis/modules/10_ai_analytics_analysis.md`
- **Research:** `/analysis/research/ai_automation_research.md` (see: Scheduling Optimization)
- **Research:** `/analysis/research/fsm_research.md` (see: ServiceTitan dispatch)
- **Requirements:**
  - Route optimization (minimize drive time)
  - Skill-based matching (tech skills → job requirements)
  - Capacity balancing across technicians
  - Priority-aware scheduling (emergencies, VIPs)
  - "Suggest optimal schedule" one-click
  - What-if scenario modeling
- **Success Metric:** Drive time -25%, jobs per tech per day +15%

### 5. ML-Enhanced Health Scoring
- **Module:** Customer Success, AI & Analytics
- **Analysis:** `/analysis/modules/04_customer_success_analysis.md`, `/analysis/modules/10_ai_analytics_analysis.md`
- **Research:** `/analysis/research/cs_research.md` (see: Health Scoring Methodologies)
- **Research:** `/analysis/research/ai_automation_research.md` (see: Predictive Analytics)
- **Requirements:**
  - Composite score from: service recency, payment history, engagement, NPS, support tickets
  - Trend visualization (improving/declining)
  - Contributing factors breakdown
  - Churn prediction model
  - Auto-trigger tasks when health drops
  - Benchmarking vs. segment averages
- **Success Metric:** Churn prediction accuracy >80%, at-risk saves +30%

### 6. Self-Service Customer Booking
- **Module:** Operations, Customers
- **Analysis:** `/analysis/modules/05_operations_analysis.md`, `/analysis/modules/02_customers_analysis.md`
- **Research:** `/analysis/research/fsm_research.md` (see: Customer Self-Service)
- **UX:** `/analysis/ux_audit.md` (see: Customer Portal)
- **Requirements:**
  - Public booking widget (embeddable)
  - Real-time availability display
  - Service type selection with pricing
  - Address validation and service area check
  - Confirmation + calendar invite
  - Reschedule/cancel self-service
  - Integration with existing customer records
- **Success Metric:** 30% of bookings via self-service, call volume -20%

### 7. Mobile Inventory Management
- **Module:** Assets, Operations
- **Analysis:** `/analysis/modules/08_assets_analysis.md`, `/analysis/modules/05_operations_analysis.md`
- **Research:** `/analysis/research/fsm_research.md` (see: Parts/Inventory)
- **Requirements:**
  - Truck inventory tracking per technician
  - Parts usage on work orders
  - Barcode/QR scanning
  - Low stock alerts
  - Reorder automation
  - Parts transfer between trucks
  - Cost tracking per job
- **Success Metric:** Stockout incidents -50%, parts cost visibility 100%

### 8. Unified Communication Timeline
- **Module:** Communications, Customers
- **Analysis:** `/analysis/modules/06_communications_analysis.md`, `/analysis/modules/02_customers_analysis.md`
- **Research:** `/analysis/research/crm_research.md` (see: Customer 360)
- **Integration:** `/analysis/integration_matrix.md` (Communications → Customers)
- **Requirements:**
  - All channels in one view (email, SMS, phone, notes)
  - Chronological timeline per customer
  - Channel icons and timestamps
  - Click to expand full content
  - Reply inline from timeline
  - Filter by channel/date/user
- **Success Metric:** Customer context time -60%, response quality +25%

### 9. Automated Invoice Generation
- **Module:** Financial, Operations
- **Analysis:** `/analysis/modules/07_financial_analysis.md`
- **Research:** `/analysis/research/fsm_research.md` (see: Billing Automation)
- **Integration:** `/analysis/integration_matrix.md` (Operations → Financial)
- **Automation:** `/analysis/automation_opportunities.md` (see: Full Automation)
- **Requirements:**
  - Auto-generate invoice on work order completion
  - Line items from work order (labor, parts, fees)
  - Tax calculation
  - Payment link in invoice email/SMS
  - Batch invoicing option
  - Draft review before send (optional)
- **Success Metric:** Invoice cycle time -80%, billing errors -90%

### 10. Customer Portal
- **Module:** Customers, Financial, Support
- **Analysis:** `/analysis/modules/02_customers_analysis.md`
- **Research:** `/analysis/research/crm_research.md` (see: Self-Service Portal)
- **UX:** `/analysis/ux_audit.md` (see: Customer-Facing)
- **Requirements:**
  - Service history view
  - Upcoming appointments
  - Invoice and payment history
  - Pay invoices online
  - Request service
  - Update contact info
  - View/download documents
  - Support ticket submission
- **Success Metric:** Portal adoption 40%, support calls -25%

---

## 📋 P2: IMPORTANT (Weeks 7-12)

### 11. Advanced Segmentation Engine
- **Module:** Customers, Marketing, Customer Success
- **Analysis:** `/analysis/modules/02_customers_analysis.md`, `/analysis/modules/09_marketing_analysis.md`
- **Research:** `/analysis/research/crm_research.md` (see: Segmentation)
- **Data Model:** `/analysis/data_model_recommendations.md`

### 12. Campaign ROI Attribution
- **Module:** Marketing, Financial
- **Analysis:** `/analysis/modules/09_marketing_analysis.md`
- **Research:** `/analysis/research/crm_research.md` (see: Attribution)

### 13. Knowledge Base (Internal + Customer)
- **Module:** Support
- **Analysis:** `/analysis/modules/11_support_analysis.md`
- **Research:** `/analysis/research/cs_research.md` (see: Self-Service)

### 14. SLA Management System
- **Module:** Support, Customer Success
- **Analysis:** `/analysis/modules/11_support_analysis.md`
- **Research:** `/analysis/research/cs_research.md` (see: SLA Tracking)

### 15. Preventive Maintenance Automation
- **Module:** Assets, Operations
- **Analysis:** `/analysis/modules/08_assets_analysis.md`
- **Research:** `/analysis/research/fsm_research.md` (see: PM Scheduling)
- **Automation:** `/analysis/automation_opportunities.md`

### 16. Payment Reminder Sequences
- **Module:** Financial, Communications
- **Analysis:** `/analysis/modules/07_financial_analysis.md`
- **Automation:** `/analysis/automation_opportunities.md` (see: Collections)

### 17. Lead Scoring Model
- **Module:** Prospects, AI & Analytics
- **Analysis:** `/analysis/modules/03_prospects_analysis.md`, `/analysis/modules/10_ai_analytics_analysis.md`
- **Research:** `/analysis/research/crm_research.md` (see: Lead Scoring)

### 18. Visual Pipeline Builder
- **Module:** Prospects
- **Analysis:** `/analysis/modules/03_prospects_analysis.md`
- **Research:** `/analysis/research/crm_research.md` (see: Pipeline Management)

### 19. Quote/Proposal Generator
- **Module:** Prospects, Financial
- **Analysis:** `/analysis/modules/03_prospects_analysis.md`
- **Research:** `/analysis/research/fsm_research.md` (see: Quoting)

### 20. Role-Based Dashboards
- **Module:** Dashboard
- **Analysis:** `/analysis/modules/01_dashboard_analysis.md`
- **Research:** `/analysis/research/crm_research.md` (see: Dashboards)

---

## 🔮 P3: VISIONARY (Quarter 2+)

### 21. Natural Language Query Interface
- **Analysis:** `/analysis/modules/10_ai_analytics_analysis.md`
- **Research:** `/analysis/research/ai_automation_research.md`

### 22. Predictive Maintenance (IoT Ready)
- **Analysis:** `/analysis/modules/08_assets_analysis.md`
- **Research:** `/analysis/research/ai_automation_research.md`

### 23. AI-Generated Daily Briefings
- **Analysis:** `/analysis/modules/01_dashboard_analysis.md`, `/analysis/modules/10_ai_analytics_analysis.md`

### 24. Voice Transcription & Analysis
- **Analysis:** `/analysis/modules/06_communications_analysis.md`
- **Research:** `/analysis/research/ai_automation_research.md`

### 25. Demand Forecasting
- **Analysis:** `/analysis/modules/10_ai_analytics_analysis.md`
- **Research:** `/analysis/research/ai_automation_research.md`

### 26. Dynamic Pricing Engine
- **Analysis:** `/analysis/modules/10_ai_analytics_analysis.md`

### 27. Customer Lifetime Value Prediction
- **Analysis:** `/analysis/modules/10_ai_analytics_analysis.md`, `/analysis/modules/04_customer_success_analysis.md`

### 28. Workflow Automation Builder (No-Code)
- **Analysis:** `/analysis/modules/12_system_analysis.md`
- **Research:** `/analysis/research/ai_automation_research.md`

---

## ✅ Completed

- [x] **Real-Time Technician Tracking** — GPS capture, live map, ETA calculation, customer tracking link
  - Evidence: `/evidence/realtime_tracking/test_results.txt`
  - Date: 2026-01-08
  - Features: Customer-facing tracking page, dispatch view, TrackingMap, ETADisplay, WebSocket updates

- [x] **Offline-First Mobile App** — IndexedDB caching, photo queue, signatures, sync engine
  - Evidence: `/evidence/offline_mobile/test_results.txt`
  - Date: 2026-01-08
  - Features: Offline work orders, photo capture queue, canvas signatures, conflict resolution

- [x] **SMS Notification System** — Twilio integration, templates, two-way SMS, opt-out compliance
  - Evidence: `/evidence/sms_notifications/test_results.txt`
  - Date: 2026-01-08
  - Features: 13 notification triggers, merge fields, customer preferences UI, delivery tracking

- [x] **CSM Task Queue System** — Priority queue, playbooks, quality gates, outcome tracking
  - Evidence: `/evidence/csm_task_queue/`
  - Commit: f93ee34

---

## 📊 Progress Tracker

| Priority | Total | Done | Remaining |
|----------|-------|------|-----------|
| P0       | 3     | 3    | 0         |
| P1       | 7     | 0    | 7         |
| P2       | 10    | 0    | 10        |
| P3       | 8     | 0    | 8         |
| **Total**| **28**| **3**| **25**    |

---

## 🔧 How to Use This File

1. Claude reads this file to know what to work on next
2. Pick first unchecked P0 item
3. Read ALL linked analysis files for that item
4. Plan → Implement → Test → Commit
5. Update this file: check off item, add to Completed section
6. Continue to next item

---
