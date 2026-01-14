# Route Architecture - ECBTX CRM

**Document:** `docs/architecture/01-routes.md`
**Status:** Discovery Complete
**Generated:** 2026-01-09

## Summary

**Router Configuration File:** `src/routes/index.tsx`

**Key Characteristics:**
- Uses React Router v6 with `BrowserRouter` at basename="/"
- Implements lazy loading with `React.lazy()` and `Suspense` for code splitting
- Route guards via `RequireAuth` wrapper for protected routes
- Portal-specific authentication via `RequirePortalAuth`
- Public tracking route (`/track/:token`) requires no authentication
- Main app routes wrapped under `/` path with `RequireAuth`

---

## Complete Route Inventory

### Public Routes (No Authentication)

| Path | Component | Type | Lazy Loaded |
|------|-----------|------|-------------|
| `/login` | LoginPage | Public | No |
| `/embed/booking` | BookingWidget | Embed | Yes |
| `/embed/payment` | PaymentWidget | Embed | Yes |
| `/embed/status` | StatusWidget | Embed | Yes |
| `/track/:token` | CustomerTrackingPage | Public/Tracking | Yes |
| `/onboarding` | OnboardingWizard | Public | Yes |

### Portal Routes (Portal Authentication)

| Path | Component | Parent |
|------|-----------|--------|
| `/portal/login` | PortalLoginPage | Root |
| `/portal` | PortalLayout | Root |
| `/portal` (index) | PortalDashboardPage | /portal |
| `/portal/work-orders` | PortalWorkOrdersPage | /portal |
| `/portal/invoices` | PortalInvoicesPage | /portal |
| `/portal/request-service` | PortalRequestServicePage | /portal |

### Protected Routes (Require Auth)

#### Core CRM
| Path | Component | Category |
|------|-----------|----------|
| `/dashboard` | DashboardPage | Dashboard |
| `/command-center` | CommandCenter | Dashboard |
| `/prospects` | ProspectsPage | Core |
| `/prospects/:id` | ProspectDetailPage | Core |
| `/customers` | CustomersPage | Core |
| `/customers/:id` | CustomerDetailPage | Core |
| `/technicians` | TechniciansPage | Core |
| `/technicians/:id` | TechnicianDetailPage | Core |
| `/work-orders` | WorkOrdersPage | Core |
| `/work-orders/:id` | WorkOrderDetailPage | Core |
| `/schedule` | SchedulePage | Core |

#### Marketing
| Path | Component | Category |
|------|-----------|----------|
| `/marketing` | MarketingHubPage | Marketing |
| `/marketing/ads` | GoogleAdsPage | Marketing |
| `/marketing/reviews` | ReviewsPage | Marketing |
| `/marketing/ai-content` | AIContentPage | Marketing |
| `/email-marketing` | EmailMarketingPage | Marketing |

#### Reports & Analytics
| Path | Component | Category |
|------|-----------|----------|
| `/reports` | ReportsPage | Reports |
| `/reports/revenue` | RevenueReport | Reports |
| `/reports/technicians` | TechnicianPerformance | Reports |
| `/reports/clv` | CLVReportPage | Reports |
| `/reports/service` | ServiceReportPage | Reports |
| `/reports/location` | LocationReportPage | Reports |
| `/analytics/ftfr` | FTFRDashboard | Analytics |
| `/analytics/bi` | BIDashboard | Analytics |
| `/analytics/operations` | OperationsCommandCenter | Analytics |
| `/analytics/financial` | FinancialDashboard | Analytics |
| `/analytics/performance` | PerformanceScorecard | Analytics |
| `/analytics/insights` | AIInsightsPanel | Analytics |

#### Enterprise
| Path | Component | Category |
|------|-----------|----------|
| `/enterprise/regions` | MultiRegionDashboard | Enterprise |
| `/enterprise/franchises` | FranchiseManagement | Enterprise |
| `/enterprise/permissions` | RolePermissions | Enterprise |
| `/enterprise/compliance` | EnterpriseComplianceDashboard | Enterprise |

#### Operations
| Path | Component | Category |
|------|-----------|----------|
| `/equipment` | EquipmentPage | Equipment |
| `/equipment/health` | EquipmentHealthPage | Equipment |
| `/inventory` | InventoryPage | Inventory |
| `/tracking` | TrackingDashboard | Tracking |
| `/tracking/dispatch` | TechnicianTracker | Tracking |
| `/fleet` | FleetMapPage | Fleet |

#### Financial
| Path | Component | Category |
|------|-----------|----------|
| `/invoices` | InvoicesPage | Billing |
| `/invoices/:id` | InvoiceDetailPage | Billing |
| `/payments` | PaymentsPage | Billing |

#### Support & Communications
| Path | Component | Category |
|------|-----------|----------|
| `/tickets` | TicketsPage | Support |
| `/tickets/:id` | TicketDetailPage | Support |
| `/phone` | PhonePage | Communications |
| `/calls` | CallsPage | Communications |

#### Admin & Settings
| Path | Component | Category |
|------|-----------|----------|
| `/users` | UsersPage | Admin |
| `/admin` | AdminSettingsPage | Admin |
| `/admin/import` | DataImportPage | Admin |
| `/notifications` | NotificationsListPage | Notifications |
| `/settings/notifications` | NotificationSettingsPage | Settings |
| `/settings/sms` | SMSSettingsPage | Settings |

#### Other Features
| Path | Component | Category |
|------|-----------|----------|
| `/predictive-maintenance` | PredictiveMaintenancePage | Maintenance |
| `/integrations` | IntegrationsPage | Integration |
| `/service-intervals` | ServiceIntervalsPage | Service |
| `/employee` | EmployeePortalPage | Employee |
| `/payroll` | PayrollPage | HR |
| `/compliance` | ComplianceDashboard | Compliance |
| `/contracts` | ContractsPage | Contracts |
| `/customer-success` | CustomerSuccessPage | Customer Success |
| `/timesheets` | TimesheetsPage | Time Tracking |
| `/job-costing` | JobCostingPage | Job Costing |
| `/help` | HelpCenter | Help |
| `/setup` | SetupWizard | Onboarding |
| `/marketplace` | MarketplacePage | Marketplace |
| `/marketplace/:slug` | MarketplacePage | Marketplace |
| `/ai-assistant` | AIAssistantPage | AI |

---

## Route Pattern Analysis

### 1. Lazy Loading Strategy
- **All feature components use `React.lazy()`** for code splitting
- Each route wrapped in `<Suspense>` with `PageLoader` fallback
- Import pattern: `lazy(() => import('@/path').then(m => ({ default: m.Component })))`

### 2. Route Nesting Structure
```
Root (/)
├── Public Routes
│   ├── /login
│   ├── /embed/* (3 routes)
│   ├── /track/:token
│   └── /onboarding
├── Portal Routes (/portal)
│   ├── /portal/login (no nesting)
│   └── /portal/* (nested under RequirePortalAuth)
└── Protected App Routes (/)
    ├── Core CRM (/customers, /prospects, /technicians, /work-orders)
    ├── Marketing (/marketing/*)
    ├── Reports (/reports/*)
    ├── Analytics (/analytics/*)
    ├── Enterprise (/enterprise/*)
    ├── Operational (/schedule, /fleet, /tracking/*)
    ├── Billing (/invoices, /payments)
    └── Settings (/settings/*, /admin/*)
```

### 3. Route Guards
- **`RequireAuth`**: Wraps all protected app routes under `/`
- **`RequirePortalAuth`**: Portal-specific authentication guard
- **No role-based guards in routing** - handled at component level via `useAuth()` hook
- **Public routes**: `/login`, `/embed/*`, `/track/:token` (no auth required)

### 4. Route Parameter Patterns
- **ID-based detail routes**: `:id` parameter (prospects, customers, technicians, work-orders, tickets, invoices)
- **Token-based tracking**: `:token` parameter (customer tracking page)
- **Slug-based marketplace**: `:slug` parameter (marketplace listings)

### 5. Feature Grouping by Path Prefix

| Prefix | Count | Features |
|--------|-------|----------|
| `/marketing` | 5 | Hub, Ads, Reviews, AI Content, Email |
| `/reports` | 6 | Dashboard, Revenue, Tech, CLV, Service, Location |
| `/analytics` | 6 | FTFR, BI, Operations, Financial, Performance, Insights |
| `/enterprise` | 4 | Regions, Franchises, Permissions, Compliance |
| `/settings` | 2 | Notifications, SMS |
| `/admin` | 2 | Settings, Import |
| `/portal` | 5 | Login, Dashboard, Work Orders, Invoices, Service Request |
| `/tracking` | 2 | Dashboard, Dispatch |
| Core (no prefix) | 34 | Dashboard, Prospects, Customers, etc. |

---

## Code Splitting Statistics
- **Total routes**: 75+
- **Lazy loaded**: 73+ (97%)
- **Not lazy loaded**: LoginPage, 404 handler, navigation redirect

## Path Conventions
- Kebab-case for multi-word routes (`/work-orders`, `/email-marketing`)
- Lowercase for all routes
- Nested structure matches feature organization
- No `/app/` prefix (as per CLAUDE.md rule #2)

---

**ROUTES_MAPPED**
