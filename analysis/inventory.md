# ECBTX CRM Platform - Complete Feature Inventory

**Generated:** 2026-01-08
**Version:** Production v2.1
**Platform:** React 19 + TypeScript + Vite + FastAPI + PostgreSQL

---

## Executive Summary

ECBTX CRM is a comprehensive Field Service Management (FSM) and CRM platform targeting septic/plumbing service businesses. The platform combines traditional CRM capabilities with FSM-specific features like scheduling, dispatch, work orders, and route optimization.

**Tech Stack:**
- Frontend: React 19, TypeScript, Vite, TanStack Query, Tailwind CSS
- Backend: FastAPI, SQLAlchemy, PostgreSQL
- Testing: Playwright, Vitest
- Deployment: Railway (auto-deploy on git push)
- URLs: Frontend (https://react.ecbtx.com), API (https://react-crm-api-production.up.railway.app/api/v2)

---

## Module Inventory

### 1. DASHBOARD MODULE
**Location:** `src/features/dashboard/`
**Page:** `DashboardPage.tsx`
**Related:** `src/components/Dashboard/RoleDashboard.tsx`

**Current Features:**
- Role-based dashboard views (admin, executive, manager, technician, phone_agent, dispatcher, billing)
- Role switcher for demo user (will@macseptic.com)
- KPI widgets and metrics
- Activity feed

**API Hooks:** Multiple (analytics, notifications, etc.)

---

### 2. CUSTOMERS MODULE
**Location:** `src/features/customers/`
**Pages:** `CustomersPage.tsx`, `CustomerDetailPage.tsx`
**Components:** `src/features/customers/components/`

**Current Features:**
- Customer list with search/filter
- Customer detail view
- Customer health scoring
- Activity timeline per customer
- Contact management

**API Hooks:** `useCustomers.ts`
**Types:** `src/api/types/customer.ts`

---

### 3. PROSPECTS MODULE
**Location:** `src/features/prospects/`
**Pages:** `ProspectsPage.tsx`, `ProspectDetailPage.tsx`
**Components:** `src/features/prospects/components/`

**Current Features:**
- Lead/prospect management
- Pipeline visualization
- Prospect detail view

**API Hooks:** `useProspects.ts`
**Types:** `src/api/types/prospect.ts`

---

### 4. CUSTOMER SUCCESS MODULE
**Location:** `src/features/customer-success/`
**Pages:** `CustomerSuccessPage.tsx`, `SegmentsPage.tsx`
**Submodules:**
- `components/csm-queue/` - CSM Task Queue (NEW)
- `segments/` - Customer segmentation

**Current Features:**
- Health scoring dashboard
- At-risk customer identification
- Customer segments builder
- Journey orchestration
- Campaign automation
- AI Insights Hub
- CSM Task Queue with playbooks (outcome-driven)
- Quality gates for task completion
- Weekly outcomes dashboard

**API Hooks:** `useCustomerSuccess.ts`
**Types:** `src/api/types/customerSuccess.ts`

**Sub-components:**
- ActionableAlerts, ActionHistory, ActionQueue
- AIGuidancePanel, AIInsightsHub, AIInsightsPanel
- AtRiskTable, ChurnRiskIndicator
- CollaborationHub, CreateActionModal
- CSM Queue: CSMQueueTab, TaskCard, TaskDetailView, PlaybookPanel, OutcomeForm, WeeklyOutcomes

---

### 5. SCHEDULE/DISPATCH MODULE
**Location:** `src/features/schedule/`
**Page:** `SchedulePage.tsx`
**Components:** `src/features/schedule/components/`
**Store:** `src/features/schedule/store/`

**Current Features:**
- Calendar view (day/week/month)
- Drag-and-drop scheduling
- Technician availability
- Work order assignment

**API Hooks:** `useWorkOrders.ts`, `useTechnicians.ts`

---

### 6. WORK ORDERS MODULE
**Location:** `src/features/workorders/`
**Pages:** `WorkOrdersPage.tsx`, `WorkOrderDetailPage.tsx`
**Components:** `src/features/workorders/components/`

**Current Features:**
- Work order list and detail views
- Status management
- Assignment to technicians
- Job costing integration

**API Hooks:** `useWorkOrders.ts`
**Types:** `src/api/types/workOrder.ts`

---

### 7. AI DISPATCH MODULE
**Location:** `src/features/ai-dispatch/`
**Components:** `AICommandInput`, `AIDispatchAssistant`, `AIDispatchPanel`, `AIDispatchStats`, `DispatchSuggestionCard`, `ExecutiveModeToggle`

**Current Features:**
- AI-powered dispatch suggestions
- Natural language command input
- Executive mode for approvals
- Dispatch optimization stats

**API Hooks:** `useAIDispatch.ts`
**Types:** `src/api/types/aiDispatch.ts`

---

### 8. TECHNICIANS MODULE
**Location:** `src/features/technicians/`
**Pages:** `TechniciansPage.tsx`, `TechnicianDetailPage.tsx`
**Components:** `src/features/technicians/components/`

**Current Features:**
- Technician roster management
- Skills tracking
- Availability management
- Performance metrics

**API Hooks:** `useTechnicians.ts`
**Types:** `src/api/types/technician.ts`

---

### 9. INVOICING MODULE
**Location:** `src/features/invoicing/`
**Pages:** `InvoicesPage.tsx`, `InvoiceDetailPage.tsx`
**Components:** `src/features/invoicing/components/`

**Current Features:**
- Invoice list and detail
- Invoice generation
- Payment status tracking

**API Hooks:** `useInvoices.ts`
**Types:** `src/api/types/invoice.ts`

---

### 10. PAYMENTS MODULE
**Location:** `src/features/payments/`
**Page:** `PaymentsPage.tsx`
**Components:** `src/features/payments/components/`

**Current Features:**
- Payment processing
- Payment history
- Stripe integration

**API Hooks:** `usePayments.ts`, `useStripe.ts`
**Types:** `src/api/types/payment.ts`

---

### 11. EQUIPMENT/ASSETS MODULE
**Location:** `src/features/equipment/`
**Pages:** `EquipmentPage.tsx`, `EquipmentHealthPage.tsx`
**Components:** `src/features/equipment/components/`

**Current Features:**
- Equipment/asset registry
- Equipment health monitoring
- Service history per asset

**API Hooks:** `useEquipment.ts`
**Types:** `src/api/types/equipment.ts`

---

### 12. INVENTORY MODULE
**Location:** `src/features/inventory/`
**Page:** `InventoryPage.tsx`
**Components:** `src/features/inventory/components/`

**Current Features:**
- Parts/materials inventory
- Stock levels
- Reorder management

**API Hooks:** `useInventory.ts`
**Types:** `src/api/types/inventory.ts`

---

### 13. COMMUNICATIONS MODULE
**Locations:** `src/features/phone/`, `src/features/sms/`, `src/features/calls/`
**Pages:** `PhonePage.tsx`, `SMSSettingsPage.tsx`, `CallsPage.tsx`

**Current Features:**
- Phone integration
- SMS messaging
- Call tracking and recordings
- Call disposition

**API Hooks:** `useSMS.ts`, `useCommunications.ts`
**Types:** `src/api/types/communication.ts`

---

### 14. EMAIL MARKETING MODULE
**Location:** `src/features/email-marketing/`
**Page:** `EmailMarketingPage.tsx`
**Components:** `src/features/email-marketing/components/`

**Current Features:**
- Email campaign management
- Template builder
- Campaign analytics

**API Hooks:** `useEmailMarketing.ts`
**Types:** `src/api/types/emailMarketing.ts`

---

### 15. MARKETING HUB MODULE
**Location:** `src/features/marketing/`
**Pages:** `MarketingHubPage.tsx`, `AIContentPage.tsx`, `GoogleAdsPage.tsx`, `ReviewsPage.tsx`
**Submodules:** `ai-content/`, `google-ads/`, `reviews/`

**Current Features:**
- Marketing dashboard
- AI content generation
- Google Ads integration
- Review management and generation

**API Hooks:** `useMarketingHub.ts`

---

### 16. TICKETS/SUPPORT MODULE
**Location:** `src/features/tickets/`
**Pages:** `TicketsPage.tsx`, `TicketDetailPage.tsx`
**Components:** `src/features/tickets/components/`

**Current Features:**
- Support ticket management
- Ticket status workflow
- Customer support queue

**API Hooks:** `useTickets.ts`
**Types:** `src/api/types/ticket.ts`

---

### 17. REPORTS/ANALYTICS MODULE
**Location:** `src/features/reports/`, `src/features/analytics/`
**Pages:** `ReportsPage.tsx`, `CLVReportPage.tsx`, `LocationReportPage.tsx`, `ServiceReportPage.tsx`
**Analytics Components:** `BIDashboard`, `FinancialDashboard`, `FTFRDashboard`, `OperationsCommandCenter`, `PerformanceScorecard`, `PreDispatchIntelligence`

**Current Features:**
- Custom reports
- CLV (Customer Lifetime Value) analysis
- Location-based reports
- Service reports
- BI Dashboard
- Financial analytics
- First Time Fix Rate tracking
- Operations command center
- Performance scorecards

**API Hooks:** `useAnalytics.ts`
**Types:** `src/api/types/analytics.ts`

---

### 18. FLEET/GPS MODULE
**Location:** `src/features/fleet/`, `src/features/gps-tracking/`
**Page:** `FleetMapPage.tsx`
**Components:** Fleet and GPS tracking components

**Current Features:**
- Fleet map visualization
- GPS tracking
- Route optimization

**API Hooks:** `useRouteOptimization.ts`

---

### 19. CUSTOMER PORTAL MODULE
**Location:** `src/features/portal/`
**Pages:** `PortalDashboardPage.tsx`, `PortalLoginPage.tsx`, `PortalProfilePage.tsx`, `PortalInvoicesPage.tsx`, `PortalWorkOrdersPage.tsx`, `PortalWorkOrderDetailPage.tsx`, `PortalRequestServicePage.tsx`

**Current Features:**
- Customer self-service portal
- Invoice viewing
- Work order status tracking
- Service request submission
- Profile management

**API Hooks:** `usePortal.ts`
**Types:** `src/api/types/portal.ts`

---

### 20. EMPLOYEE MODULE
**Location:** `src/features/employee/`
**Page:** `EmployeePortalPage.tsx`

**Current Features:**
- Employee portal
- Employee management

**API Hooks:** `useEmployee.ts`
**Types:** `src/api/types/employee.ts`

---

### 21. PAYROLL MODULE
**Location:** `src/features/payroll/`
**Page:** `PayrollPage.tsx`

**Current Features:**
- Payroll management
- Commission tracking

**API Hooks:** `usePayroll.ts`
**Types:** `src/api/types/payroll.ts`

---

### 22. TIME TRACKING MODULE
**Location:** `src/features/time-tracking/`
**Page:** `TimesheetsPage.tsx`
**Components:** Time tracking components

**Current Features:**
- Timesheet management
- Time entry
- Approval workflow

---

### 23. COMPLIANCE MODULE
**Location:** `src/features/compliance/`
**Page:** `ComplianceDashboard.tsx`
**Components:** `CertificationList`, `ComplianceAlerts`, `InspectionList`, `LicenseList`

**Current Features:**
- License tracking
- Certification management
- Inspection tracking
- Compliance alerts

**API Hooks:** `useCompliance.ts`

---

### 24. CONTRACTS MODULE
**Location:** `src/features/contracts/`
**Page:** `ContractsPage.tsx`
**Components:** `ContractDetails`, `ContractList`, `ContractTemplates`, `ExpiringContractsAlert`

**Current Features:**
- Service contract management
- Contract templates
- Expiration alerts
- Renewal tracking

---

### 25. JOB COSTING MODULE
**Location:** `src/features/job-costing/`
**Page:** `JobCostingPage.tsx`
**Components:** Job costing components

**Current Features:**
- Job cost tracking
- Profitability analysis
- Labor cost allocation

---

### 26. PREDICTIVE MAINTENANCE MODULE
**Location:** `src/features/predictive-maintenance/`
**Page:** `PredictiveMaintenancePage.tsx`

**Current Features:**
- Predictive maintenance alerts
- Equipment failure prediction

**API Hooks:** `usePredictiveMaintenance.ts`

---

### 27. IOT MODULE
**Location:** `src/features/iot/`

**Current Features:**
- IoT device integration
- Sensor data collection

**API Hooks:** `useIoT.ts`
**Types:** `src/api/types/iot.ts`

---

### 28. INTEGRATIONS MODULE
**Location:** `src/features/integrations/`
**Page:** `IntegrationsPage.tsx`
**Components:** Integration settings components

**Current Features:**
- QuickBooks integration
- Third-party integrations management

**API Hooks:** `useQuickBooks.ts`

---

### 29. DOCUMENTS MODULE
**Location:** `src/features/documents/`
**Components:** Document management components

**Current Features:**
- Document storage
- Document templates

**API Hooks:** `useDocuments.ts`
**Types:** `src/api/types/document.ts`

---

### 30. NOTIFICATIONS MODULE
**Location:** `src/features/notifications/`
**Pages:** `NotificationsListPage.tsx`, `NotificationSettingsPage.tsx`

**Current Features:**
- In-app notifications
- Push notifications
- Notification preferences

**API Hooks:** `useNotifications.ts`, `usePushNotifications.ts`

---

### 31. ADMIN/SETTINGS MODULE
**Location:** `src/features/admin/`
**Page:** `AdminSettingsPage.tsx`
**Components:** `ApiSettings`, `GeneralSettings`, `IntegrationSettings`, `NotificationSettings`, `SecuritySettings`, `SettingsTabs`

**Current Features:**
- General settings
- API configuration
- Integration settings
- Security settings (SSO, 2FA)
- Notification settings

**API Hooks:** `useAdmin.ts`
**Types:** `src/api/types/admin.ts`

---

### 32. USERS MODULE
**Location:** `src/features/users/`
**Page:** `UsersPage.tsx`
**Components:** User management components

**Current Features:**
- User management
- Role assignment
- Permissions

**API Hooks:** `useRoles.ts`

---

### 33. ONBOARDING MODULE
**Location:** `src/features/onboarding/`
**Steps:** Onboarding wizard steps

**Current Features:**
- New user onboarding
- Setup wizard

**API Hooks:** `useOnboarding.ts`
**Types:** `src/api/types/onboarding.ts`

---

### 34. AI ASSISTANT MODULE
**Location:** `src/features/ai-assistant/`
**Page:** `AIAssistantPage.tsx`
**Components:** `src/components/ai/` (AIChatWidget, AICustomerPanel, AIWorkOrderHelper)

**Current Features:**
- AI chat interface
- Customer AI insights
- Work order AI assistance

**API Hooks:** `useAIInsights.ts`
**Types:** `src/api/ai.ts`

---

### 35. QUOTES MODULE
**API Hooks:** `useQuotes.ts`
**Types:** `src/api/types/quote.ts`

**Current Features:**
- Quote generation
- Quote management

---

### 36. SERVICE INTERVALS MODULE
**Location:** `src/features/service-intervals/`
**Page:** `ServiceIntervalsPage.tsx`

**Current Features:**
- Recurring service scheduling
- Interval management

**API Hooks:** `useServiceIntervals.ts`

---

### 37. MARKETPLACE MODULE
**Location:** `src/features/marketplace/`
**Page:** `MarketplacePage.tsx`
**Components:** Marketplace components

**Current Features:**
- App marketplace
- Third-party add-ons

---

### 38. FINANCING MODULE
**Location:** `src/features/financing/`

**Current Features:**
- Customer financing options

**API Hooks:** `useFintech.ts`
**Types:** `src/api/types/fintech.ts`

---

### 39. DATA IMPORT MODULE
**Location:** `src/features/import/`
**Page:** `DataImportPage.tsx`
**Components:** Import components

**Current Features:**
- Data import wizard
- CSV/Excel import

---

### 40. VOICE DOCUMENTATION MODULE
**Location:** `src/features/voice-documentation/`
**Components:** Voice documentation components

**Current Features:**
- Voice notes
- Voice-to-text

**UI Component:** `VoiceNotesInput.tsx`

---

### 41. ENTERPRISE MODULE
**API Hooks:** `useEnterprise.ts`, `useMultiRegion.ts`
**Types:** `src/api/types/enterprise.ts`

**Current Features:**
- Multi-region support
- Enterprise features

---

### 42. SURVEYS MODULE
**API Hooks:** `useSurveys.ts`, `useSurveyActions.ts`

**Current Features:**
- Customer surveys
- NPS tracking
- Survey automation

---

### 43. ACTIVITIES MODULE
**Location:** `src/features/activities/`
**Components:** `ActivityForm`, `ActivityTimeline`, `NoteCard`

**Current Features:**
- Activity logging
- Timeline view
- Notes management

**API Hooks:** `useActivities.ts`
**Types:** `src/api/types/activity.ts`

---

## Shared Components

### UI Components (`src/components/ui/`)
- ApiError, Badge, Breadcrumb, Button, Card, Checkbox
- ConnectionStatus, Dialog, Dropdown, FormField
- Input, Label, Pagination, Radio, Select, Skeleton
- Switch, Tabs, Textarea, Toast, Tooltip
- VirtualList, VoiceNotesInput

### Layout Components (`src/components/layout/`)
- AppLayout

### PWA Components (`src/components/pwa/`)
- InstallPrompt, OfflineBanner, PushNotificationPrompt
- PWAProvider, UpdatePrompt

### Role Components
- RoleSwitcher (`src/components/RoleSwitcher/`)

---

## API Structure

### Hooks Location: `src/api/hooks/`
45+ custom hooks for data fetching and mutations

### Types Location: `src/api/types/`
25+ type definition files

### API Client: `src/api/client.ts`, `src/api/offlineClient.ts`

---

## Context Providers

- `src/context/RoleContext.tsx` - Role management
- `src/features/auth/useAuth.ts` - Authentication
- PWA context in `src/components/pwa/PWAProvider.tsx`

---

## Key Observations for Analysis

1. **Comprehensive Feature Set:** 40+ distinct modules covering FSM, CRM, CS, marketing, finance
2. **AI Integration:** Dedicated AI modules for dispatch, insights, content, chat
3. **Customer Success:** Recently enhanced with CSM Task Queue and playbooks
4. **Role-Based Access:** 7 distinct roles with tailored views
5. **Mobile-Ready:** PWA support with offline capabilities
6. **Integrations:** QuickBooks, Stripe, Google Ads, IoT
7. **Modern Stack:** React 19, TypeScript, TanStack Query

---

## File Counts

- Feature Directories: 43
- Page Components: 56
- API Hooks: 45+
- Type Definitions: 25+
- UI Components: 20+
