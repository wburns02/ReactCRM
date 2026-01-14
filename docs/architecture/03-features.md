# Features Architecture - ECBTX CRM

**Document:** `docs/architecture/03-features.md`
**Status:** Discovery Complete
**Generated:** 2026-01-09

## Executive Summary

The ReactCRM follows a **feature-based architecture** with 45+ feature modules. Uses Zustand for UI state and TanStack Query for server state.

---

## Directory Organization

```
src/
├── features/          # Feature modules (business logic)
├── components/        # Shared UI components
├── api/              # API client and hooks
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
├── providers/        # Context providers
├── routes/           # Routing configuration
└── assets/           # Static assets
```

---

## Feature Modules (45+)

### Core CRM Features (12)
| Feature | Directory | Key Files |
|---------|-----------|-----------|
| auth | `src/features/auth/` | RequireAuth.tsx, useAuth.ts |
| dashboard | `src/features/dashboard/` | DashboardPage.tsx, CommandCenter.tsx |
| customers | `src/features/customers/` | CustomersPage.tsx, CustomerDetailPage.tsx |
| prospects | `src/features/prospects/` | ProspectsPage.tsx, ProspectDetailPage.tsx |
| technicians | `src/features/technicians/` | TechniciansPage.tsx, TechnicianDetailPage.tsx |
| workorders | `src/features/workorders/` | WorkOrdersPage.tsx, WorkOrderDetailPage.tsx |
| schedule | `src/features/schedule/` | SchedulePage.tsx |
| invoicing | `src/features/invoicing/` | InvoicesPage.tsx |
| payments | `src/features/payments/` | PaymentsPage.tsx |
| users | `src/features/users/` | UsersPage.tsx |
| admin | `src/features/admin/` | AdminSettingsPage.tsx |
| inventory | `src/features/inventory/` | InventoryPage.tsx |

### Communication & Engagement (8)
| Feature | Directory | Purpose |
|---------|-----------|---------|
| calls | `src/features/calls/` | Call center/VoIP |
| email-marketing | `src/features/email-marketing/` | Email campaigns |
| sms | `src/features/sms/` | SMS/text messages |
| phone | `src/features/phone/` | Phone system |
| notifications | `src/features/notifications/` | Notification center |
| customer-success | `src/features/customer-success/` | CSM platform (48 components) |
| portal | `src/features/portal/` | Customer self-service |
| presence | `src/features/presence/` | User presence/online status |

### Operations & Tracking (6)
| Feature | Directory | Purpose |
|---------|-----------|---------|
| tracking | `src/features/tracking/` | Real-time GPS tracking |
| fleet | `src/features/fleet/` | Fleet management |
| gps-tracking | `src/features/gps-tracking/` | GPS tracking feature |
| mobile | `src/features/mobile/` | Mobile app components |
| time-tracking | `src/features/time-tracking/` | Timesheet tracking |
| service-intervals | `src/features/service-intervals/` | Service intervals |

### Analytics & Intelligence (5)
| Feature | Directory | Purpose |
|---------|-----------|---------|
| analytics | `src/features/analytics/` | Executive dashboards |
| reports | `src/features/reports/` | Business reporting |
| ai-dispatch | `src/features/ai-dispatch/` | AI dispatching |
| ai-assistant | `src/features/ai-assistant/` | AI assistant chatbot |
| predictive-maintenance | `src/features/predictive-maintenance/` | Predictive maintenance |

### Finance & HR (5)
| Feature | Directory | Purpose |
|---------|-----------|---------|
| payroll | `src/features/payroll/` | Payroll management |
| financing | `src/features/financing/` | Finance/lending |
| employee | `src/features/employee/` | Employee portal |
| job-costing | `src/features/job-costing/` | Job costing |
| contracts | `src/features/contracts/` | Contract management |

### Enterprise & Integration (9)
| Feature | Directory | Purpose |
|---------|-----------|---------|
| enterprise | `src/features/enterprise/` | Multi-region & franchise |
| integrations | `src/features/integrations/` | Third-party integrations |
| compliance | `src/features/compliance/` | Compliance management |
| documents | `src/features/documents/` | Document management |
| equipment | `src/features/equipment/` | Equipment tracking |
| iot | `src/features/iot/` | IoT device management |
| import | `src/features/import/` | Data import tools |
| marketplace | `src/features/marketplace/` | App marketplace |
| tickets | `src/features/tickets/` | Support tickets |

---

## State Management

### Primary Pattern: Zustand + TanStack Query
- **Zustand** - Client UI state (selected items, filters, view modes)
- **TanStack Query** - Server state (async data, caching)

### Store Locations
- `src/features/workorders/stores/workOrderStore.ts`
- `src/features/schedule/store/scheduleStore.ts`

---

## API Architecture

### Client Configuration
- **Base URL:** `https://react-crm-api-production.up.railway.app/api/v2`
- **File:** `src/api/client.ts`
- **Security:** HTTP-only cookies + CSRF tokens

### API Hooks (40+)
Location: `src/api/hooks/`

| Hook | Purpose |
|------|---------|
| useCustomers() | Customers CRUD |
| useWorkOrders() | Work orders CRUD |
| useAIDispatch() | AI dispatching |
| useAnalytics() | Analytics data |
| useRealTimeTracking() | GPS tracking |
| useWebSocket() | Real-time updates |
| useOffline() | Offline support |

### API Types (30+)
Location: `src/api/types/`

---

## Shared UI Components

### Location: `src/components/ui/`

**Form Controls:**
- Button, Input, Label, Select, Textarea, Checkbox, Radio, FormField

**Layout:**
- Card, CardHeader, CardTitle, CardContent

**Feedback:**
- Badge, ApiError, Toast, Tooltip

**Overlays:**
- Dialog, ConfirmDialog, Dropdown

**Navigation:**
- Tabs, Pagination, Breadcrumb

**Data Display:**
- VirtualList, Skeleton variants

**Status:**
- ConnectionStatus, ConnectionStatusExtended

---

## Custom Hooks

### Location: `src/hooks/`

| Hook | Purpose |
|------|---------|
| useAI | AI features |
| useDebounce | Input debouncing |
| useFocusTrap | Keyboard focus trapping |
| useGPSTracking | GPS tracking integration |
| useMediaQuery | Responsive media queries |
| useOffline | Offline mode detection |
| usePWA | Progressive web app features |
| useRealtimeNotifications | Real-time notifications |
| useSessionTimeout | Session management |
| useVoiceToText | Speech-to-text |
| useWebSocket | WebSocket connection |

---

## Utilities & Libraries

### Location: `src/lib/`

| Utility | Purpose |
|---------|---------|
| db.ts | IndexedDB for offline |
| feature-flags.ts | Feature flag management |
| push-notifications.ts | Push notification handling |
| sanitize.ts | XSS prevention |
| security.ts | Auth security helpers |
| sentry.ts | Error tracking |
| syncEngine.ts | Offline sync engine |
| websocket.ts | WebSocket utilities |
| webVitals.ts | Performance monitoring |

---

## Providers

### Location: `src/providers/`

- **RoleProvider** - Role-based demo mode
- **WebSocketProvider** - Real-time connection
- **QueryClientProvider** - TanStack Query setup
- **ToastProvider** - Toast notifications
- **ErrorBoundary** - Error handling
- **SessionTimeoutProvider** - Session management
- **PWAProvider** - PWA features

---

## Feature Module Pattern

Each feature follows this structure:
```
src/features/[feature]/
├── components/         # Feature-specific components
├── [Feature]Page.tsx   # Main page component
├── api/               # API integration
├── pages/             # Sub-pages (optional)
├── hooks/             # Feature-specific hooks
├── stores/            # Zustand stores (optional)
└── index.ts           # Barrel export file
```

---

## Technology Stack

| Layer | Tech |
|-------|------|
| Framework | React 19 + TypeScript |
| Router | React Router v6 |
| State | Zustand + TanStack Query |
| HTTP Client | Axios |
| Styling | Tailwind CSS |
| Build | Vite |
| Testing | Playwright + Vitest |
| Deployment | Railway |
| Real-time | WebSocket |
| Offline | IndexedDB |

---

**FEATURES_MAPPED**
