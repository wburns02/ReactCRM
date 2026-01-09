# MAC Septic Feature Placement - Quick Reference

## Sidebar Structure (Recommended)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MAC Septic CRM - Sidebar Navigation                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─── MAIN OPERATIONS ───────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  📊 Dashboard                          /dashboard                     │  │
│  │                                                                       │  │
│  │  👥 Customers                          /customers                     │  │
│  │      └─ Customer Detail                /customers/:id                 │  │
│  │                                                                       │  │
│  │  📋 Work Orders                        /work-orders                   │  │
│  │      ├─ List (default)                 /work-orders                   │  │
│  │      ├─ Calendar                       /work-orders/calendar          │  │
│  │      ├─ Board (Kanban)                 /work-orders/board             │  │
│  │      └─ Map View                       /work-orders/map               │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─── DISPATCH & TRACKING ⭐ NEW ────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  📍 GPS Tracking                       /tracking                      │  │
│  │      ├─ Live Map (default)             /tracking                      │  │
│  │      └─ Dispatch Board                 /tracking/dispatch             │  │
│  │                                                                       │  │
│  │  📅 Schedule                           /schedule                      │  │
│  │      ├─ Calendar                       /schedule                      │  │
│  │      ├─ Timeline                       /schedule/timeline             │  │
│  │      └─ Capacity                       /schedule/capacity             │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─── COMMUNICATION ⭐ NEW ──────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  💬 Messages                           /communications                │  │
│  │      ├─ SMS Inbox                      /communications/sms            │  │
│  │      ├─ Email                          /communications/email          │  │
│  │      └─ Templates                      /communications/templates      │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─── BILLING ⭐ NEW ────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  💰 Billing                            /billing                       │  │
│  │      ├─ Invoices                       /billing/invoices              │  │
│  │      ├─ Payments                       /billing/payments              │  │
│  │      └─ Estimates                      /billing/estimates             │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─── ADMIN ────────────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  👷 Technicians                        /technicians                   │  │
│  │  📈 Analytics                          /analytics                     │  │
│  │  ⚙️  Settings                          /settings                      │  │
│  │                                                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Route → Source File Mapping

| Route | URL Pattern | Source Location | Access |
|-------|-------------|-----------------|--------|
| **GPS Tracking** | | | |
| Tracking Dashboard | `/tracking` | `src/features/tracking/pages/TrackingDashboard.tsx` | Admin, Dispatch |
| Dispatch View | `/tracking/dispatch` | `src/features/tracking/pages/DispatchView.tsx` | Dispatch |
| Customer Tracking | `/track/:token` | `src/features/tracking/pages/CustomerTracking.tsx` | **Public** |
| **Work Orders** | | | |
| Work Order List | `/work-orders` | `src/features/work-orders/pages/WorkOrderList.tsx` | All Auth |
| Work Order Detail | `/work-orders/:id` | `src/features/work-orders/pages/WorkOrderDetail.tsx` | All Auth |
| Calendar View | `/work-orders/calendar` | `src/features/work-orders/pages/CalendarView.tsx` | All Auth |
| Kanban Board | `/work-orders/board` | `src/features/work-orders/pages/KanbanBoard.tsx` | All Auth |
| **Field Service** | | | |
| My Jobs | `/field` | `src/features/field/pages/MyJobs.tsx` | Tech |
| Job Detail | `/field/job/:id` | `src/features/field/pages/JobDetail.tsx` | Tech |
| Route Navigation | `/field/route` | `src/features/field/pages/RouteView.tsx` | Tech |
| **Communications** | | | |
| SMS Inbox | `/communications/sms` | `src/features/communications/pages/SMSInbox.tsx` | Admin |
| Templates | `/communications/templates` | `src/features/communications/pages/Templates.tsx` | Admin |
| **Billing** | | | |
| Invoices | `/billing/invoices` | `src/features/billing/pages/InvoiceList.tsx` | Admin |
| Payments | `/billing/payments` | `src/features/billing/pages/PaymentList.tsx` | Admin |
| Payment Page | `/pay/:token` | `src/features/billing/pages/PaymentPage.tsx` | **Public** |

## Feature Components → Location

| Component | Feature | Path | Reusable? |
|-----------|---------|------|-----------|
| PhotoCapture | Work Orders | `src/features/work-orders/components/PhotoCapture/` | Yes → move to shared |
| SignaturePad | Work Orders | `src/features/work-orders/components/SignaturePad/` | Yes → move to shared |
| LiveMap | Tracking | `src/features/tracking/components/LiveMap/` | Yes → move to shared |
| TechnicianMarker | Tracking | `src/features/tracking/components/TechnicianMarker/` | No |
| GeofenceEditor | Tracking | `src/features/tracking/components/GeofenceEditor/` | No |
| ETADisplay | Tracking | `src/features/tracking/components/ETADisplay/` | Yes |
| SMSThread | Communications | `src/features/communications/components/SMSThread/` | No |
| InvoiceGenerator | Billing | `src/features/billing/components/InvoiceGenerator/` | No |

## Shared Components (src/components/shared/)

```
src/components/shared/
├── maps/
│   ├── MapView.tsx             # Mapbox wrapper
│   ├── Marker.tsx              # Custom markers
│   └── RoutePolyline.tsx       # Route display
├── media/
│   ├── PhotoCapture.tsx        # Camera/gallery capture
│   ├── PhotoGallery.tsx        # Image grid
│   └── SignaturePad.tsx        # Signature capture
├── forms/
│   ├── DateTimePicker.tsx      # Date/time selection
│   ├── CustomerSelect.tsx      # Customer dropdown
│   └── TechnicianSelect.tsx    # Technician dropdown
└── feedback/
    ├── LoadingState.tsx        # Skeletons
    ├── EmptyState.tsx          # Empty lists
    └── ErrorBoundary.tsx       # Error handling
```

## Role-Based Sidebar Visibility

| Sidebar Item | Admin | Manager | Dispatch | Tech | Customer |
|--------------|:-----:|:-------:|:--------:|:----:|:--------:|
| Dashboard | ✅ | ✅ | ✅ | ❌ | ❌ |
| Customers | ✅ | ✅ | ✅ | ❌ | ❌ |
| Work Orders | ✅ | ✅ | ✅ | ❌ | ❌ |
| GPS Tracking | ✅ | ✅ | ✅ | ❌ | ❌ |
| Schedule | ✅ | ✅ | ✅ | ❌ | ❌ |
| Communications | ✅ | ✅ | ❌ | ❌ | ❌ |
| Billing | ✅ | ✅ | ❌ | ❌ | ❌ |
| Technicians | ✅ | ✅ | ❌ | ❌ | ❌ |
| Analytics | ✅ | ✅ | ❌ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Field Mode** | ❌ | ❌ | ❌ | ✅ | ❌ |

## API Endpoint Mapping

| Feature | FastAPI Endpoint | Method | Request/Response |
|---------|------------------|--------|------------------|
| **Tracking** | | | |
| Get all locations | `/api/technicians/locations` | GET | → `TechnicianLocation[]` |
| Update location | `/api/technicians/{id}/location` | POST | `LocationUpdate` → |
| Get tracking by token | `/api/tracking/{token}` | GET | → `PublicTrackingData` |
| **Work Orders** | | | |
| Upload photo | `/api/work-orders/{id}/photos` | POST | `multipart/form-data` → `Photo` |
| Save signature | `/api/work-orders/{id}/signatures` | POST | `SignatureData` → `Signature` |
| **Communications** | | | |
| Get SMS threads | `/api/sms/conversations` | GET | → `SMSConversation[]` |
| Send SMS | `/api/sms/send` | POST | `SMSMessage` → |
| **Billing** | | | |
| Generate invoice | `/api/invoices` | POST | `InvoiceCreate` → `Invoice` |
| Create payment link | `/api/payments/link` | POST | `PaymentLinkCreate` → `PaymentLink` |

---

## Quick Start Commands

```bash
# 1. Run discovery to map your current structure
./ralph-discover.sh

# 2. Review outputs
cat docs/architecture/01-platform-structure.md
cat docs/architecture/02-feature-placement.md
cat docs/architecture/03-implementation-guide.md

# 3. Create feature directories
mkdir -p src/features/{tracking,field,communications,billing}/{pages,components,hooks,api,types}

# 4. Run build agents
./spawn-ralph-workorders.sh
```
