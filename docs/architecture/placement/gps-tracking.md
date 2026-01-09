# GPS Tracking Feature Placement Plan

**Document:** `docs/architecture/placement/gps-tracking.md`
**Status:** Active - Implementation Complete
**Generated:** 2026-01-09
**Feature Status:** Fully Implemented (Routes, Components, API Hooks)

---

## Executive Summary

The GPS Tracking feature is **fully implemented** across routes, sidebar navigation, and feature modules. The feature consists of three distinct user experiences:

1. **Tracking Dashboard** (`/tracking`) - Internal admin/manager view with live map, technician list, and geofence management
2. **Dispatch View** (`/tracking/dispatch`) - Dedicated dispatch board with drag-drop assignment and real-time technician tracking
3. **Customer Tracking** (`/track/:token`) - Public, unauthenticated Uber-style tracking page for end customers

---

## 1. Sidebar Placement Decision

### CURRENT STATE
**NOT in sidebar** — Tracking is intentionally omitted from sidebar navigation.

### RECOMMENDATION: ADD TO SIDEBAR UNDER OPERATIONS GROUP

**Proposed Change:**
Add to "Operations" group in `src/components/layout/AppLayout.tsx`:

```typescript
{
  name: 'operations',
  label: 'Operations',
  icon: '📝',
  items: [
    // ... existing items ...
    { path: '/tracking', label: 'Tracking', icon: '🗺️' },  // NEW
    // ... rest of items ...
  ],
}
```

**Icon**: `🗺️` (Map Pin) — indicates location/real-time functionality
**Badge**: Optional — "LIVE" badge for real-time indication
**Visibility**: All authenticated users (route guards enforce role restrictions)

### WHY OPERATIONS GROUP?
- Tracking supports operational decisions (technician assignment, dispatch, geofence management)
- Paired with Work Orders, Schedule, and Technicians — all field-level coordination tools
- Appears after Command Center (highest priority operations task)

---

## 2. Route Structure

### PROTECTED ROUTES (Require Authentication)

| Path | Component | File | Purpose |
|------|-----------|------|---------|
| `/tracking` | `TrackingDashboard` | `src/features/tracking/TrackingDashboard.tsx` | Live map, technician list, geofence management, events log |
| `/tracking/dispatch` | `TechnicianTracker` | `src/features/tracking/TechnicianTracker.tsx` | Dispatch board with real-time technician positions and ETA |

### PUBLIC ROUTE (No Authentication)

| Path | Component | File | Purpose |
|------|-----------|------|---------|
| `/track/:token` | `CustomerTrackingPage` | `src/features/tracking/components/CustomerTrackingPage.tsx` | Customer-facing tracking (Uber-style) |

**Route Registration:** `src/routes/index.tsx`

---

## 3. Source Code Location

### Feature Module Structure
**Base Directory:** `src/features/tracking/`

```
src/features/tracking/
├── TrackingDashboard.tsx                    # Main tracking admin dashboard
├── TechnicianTracker.tsx                    # Dispatch view with real-time tracking
├── components/
│   ├── CustomerTrackingPage.tsx             # Public customer tracking (Uber-style)
│   ├── LiveDispatchMap.tsx                  # Interactive map for dispatch board
│   ├── TrackingMap.tsx                      # Shared map component
│   ├── TechnicianGPSCapture.tsx             # Individual technician location display
│   └── ETADisplay.tsx                       # ETA badge and formatting
└── index.ts                                 # Feature exports
```

### Related GPS Tracking Module
**Base Directory:** `src/features/gps-tracking/`

```
src/features/gps-tracking/
├── useGPSBroadcast.ts                       # Hook for broadcasting technician GPS
├── types.ts                                 # GPS tracking data types & schemas
├── components/
│   ├── TechnicianTrackingMap.tsx            # Leaflet map component
│   └── GPSTrackingPanel.tsx                 # GPS status panel
└── index.ts                                 # Feature exports
```

### API Integration
**API Hooks:** `src/api/hooks/useRealTimeTracking.ts`
- `useRealTimeTracking()` — Real-time technician location streaming
- `useDispatchTracking()` — Dispatch board data with filtering
- `useCreateTrackingSession()` — Generate tracking links
- `useSendTrackingLink()` — SMS/email tracking to customers

---

## 4. Feature Capabilities

### Tracking Dashboard (`/tracking`)

**Tabs:**
1. **Live Map** — Real-time map with technician pins
2. **Technicians** — List view with status, last update, battery level
3. **Geofences** — Create/edit/delete geofence zones
4. **Events** — Real-time log of geofence entry/exit events
5. **Settings** — GPS configuration, tracking intervals, privacy controls

### Dispatch View (`/tracking/dispatch`)

**Layout:** 3-column responsive grid
- **Left/Center Column** — Interactive Leaflet map with technician markers
- **Right Column** — Technician list with status, speed, ETA

### Customer Tracking Page (`/track/:token`)

**Public Experience** (No authentication required):
- Status card with icon and message
- Live map showing technician and destination
- ETA display (minutes + arrival time)
- Technician card with photo, name, call button
- Service details

---

## 5. Integration Points

### Work Orders
- Display job location on tracking map
- Work order ID shown in technician details panel

### Technicians
- Real-time status display
- GPS broadcast when technician app active

### Customer Notifications
- Generate tracking token
- SMS/email with tracking link

---

## 6. Role-Based Access

| Role | `/tracking` | `/tracking/dispatch` | `/track/:token` |
|------|-----------|---------------------|-----------------|
| Admin | Full | Full | Public |
| Executive | View Only | View Only | Public |
| Manager | Full | Full | Public |
| Dispatcher | Full | Full + Assign | Public |
| Technician | No | No | Public |
| Phone Agent | No | No | Public |
| Billing | No | No | Public |

---

## Summary Table

| Aspect | Decision |
|--------|----------|
| **Sidebar Placement** | Operations group, after Technicians |
| **Icon** | 🗺️ (Map Pin) |
| **Access Levels** | Admin, Manager, Dispatcher |
| **Routes** | `/tracking`, `/tracking/dispatch`, `/track/:token` (public) |
| **Feature Modules** | `src/features/tracking/` and `src/features/gps-tracking/` |
| **Lazy Loading** | All routes lazy loaded |
| **Real-Time Tech** | WebSocket + TanStack Query polling fallback |
| **Public Access** | Via `/:token` — no auth required |

---

**GPS_TRACKING_PLACEMENT_COMPLETE**
