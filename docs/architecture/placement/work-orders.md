# Work Orders Enhancement Placement Plan

**Document:** `docs/architecture/placement/work-orders.md`
**Status:** Placement Strategy Complete
**Generated:** 2026-01-09

---

## Executive Summary

The Work Orders feature has a **mature, modular architecture** with 50+ existing components across 9 functional domains. The enhancements (Photo Capture, Digital Signatures, Inspection Forms, Calendar/Kanban views) are **already substantially implemented**.

**Key Findings:**
- Photo Capture: 95% complete (in `Documentation/PhotoCapture.tsx`)
- Digital Signatures: 95% complete (in `Documentation/SignatureCapture.tsx`)
- Inspection Forms: 100% complete (in `Documentation/InspectionForm.tsx`)
- Kanban View: 100% complete (in `WorkOrdersPage.tsx` with toggle)
- Calendar View: 100% complete (in `Scheduling/ScheduleCalendar.tsx`)
- Map View: 100% complete (in `Mapping/WorkOrderMap.tsx`)

---

## 1. Current Work Orders Structure

### Directory Layout
```
src/features/workorders/
├── components/                     # Core UI components
├── Documentation/                  # Photo & Document Management
│   ├── PhotoCapture.tsx           # Live camera, GPS watermark
│   ├── SignatureCapture.tsx       # Customer & tech signatures
│   └── InspectionForm.tsx         # Dynamic checklists
├── Scheduling/                     # Calendar & Time Management
│   └── ScheduleCalendar.tsx       # Calendar view
├── Mapping/                        # Location & Route Management
│   └── WorkOrderMap.tsx           # Map view
├── Mobile/                         # Field Service Operations
├── Communications/                 # Customer & Tech Comms
├── Analytics/                      # Performance & Insights
├── Payments/                       # Billing & Payments
├── stores/
│   └── workOrderStore.ts          # Zustand state management
├── WorkOrdersPage.tsx             # Entry point (list + kanban toggle)
├── WorkOrderDetailPage.tsx        # Detail view
└── WorkOrdersList.tsx             # List view table
```

---

## 2. Routes Enhancement Strategy

### Current Routes
```
GET  /work-orders              → WorkOrdersPage (list view with kanban toggle)
GET  /work-orders/:id          → WorkOrderDetailPage
```

### Proposed Route Enhancements
```
GET  /work-orders              → WorkOrdersPage (LIST view - default)
GET  /work-orders/calendar     → CalendarView (NEW)
GET  /work-orders/board        → KanbanBoard (NEW)
GET  /work-orders/map          → MapView (NEW)
GET  /work-orders/:id          → WorkOrderDetailPage (EXISTING)
GET  /work-orders/:id/photos   → PhotoGallery (MODAL or dedicated view)
GET  /work-orders/new          → WorkOrderForm (check if needed)
```

---

## 3. Sidebar Navigation Strategy

### Current Sidebar Structure
```
Operations (📝) [GROUP]
├── Command Center (🎯)
├── Work Orders (🔧)        ← Current location
├── Schedule (📅)
├── Technicians (👷)
└── ...
```

### Recommended: Sticky Sub-Navbar (Option A)

When viewing `/work-orders/*` routes, display a secondary navbar:
```
Work Orders (🔧)
├── List    [📋 active]
├── Calendar [📅]
├── Board   [📊 Kanban]
└── Map     [🗺️]
```

**Implementation:**
- Location: Render in `WorkOrdersPage.tsx` parent layout
- State: Derived from current route using `useLocation()`
- Styling: Horizontal tabs below main header

---

## 4. Component Placement Decisions

### PhotoCapture Component
**Current Location:** `src/features/workorders/Documentation/PhotoCapture.tsx`
**Decision:** **KEEP IN FEATURE** (not shared)
- Tightly coupled to work order metadata

### SignatureCapture Component
**Current Location:** `src/features/workorders/Documentation/SignatureCapture.tsx`
**Decision:** **CREATE SHARED VERSION**
- Create in `src/components/shared/SignaturePad/`
- Extract generic signature logic

### PhotoCapture Utilities
**Current Location:** `src/features/workorders/Documentation/utils/imageProcessing.ts`
**Decision:** **MOVE TO SHARED LIBS**
- Move to `src/lib/imageProcessing.ts`

---

## 5. New Components to Create

### 1. CalendarView.tsx
**Path:** `src/features/workorders/CalendarView.tsx`
**Purpose:** Route wrapper for calendar view

### 2. KanbanBoard.tsx
**Path:** `src/features/workorders/KanbanBoard.tsx`
**Purpose:** Dedicated kanban view component

### 3. MapView.tsx
**Path:** `src/features/workorders/MapView.tsx`
**Purpose:** Route wrapper for map view

---

## 6. Route Configuration Update

### File: `src/routes/index.tsx`

**Proposed Routes:**
```typescript
{/* Work Orders - Views */}
<Route path="work-orders" element={<WorkOrdersPage />} />
<Route path="work-orders/calendar" element={<CalendarView />} />
<Route path="work-orders/board" element={<KanbanBoard />} />
<Route path="work-orders/map" element={<MapView />} />
<Route path="work-orders/:id" element={<WorkOrderDetailPage />} />
```

---

## 7. Implementation Priorities

### Phase 1: Routing Foundation (HIGH)
1. Create view wrapper components
2. Add routes to `src/routes/index.tsx`
3. Test route navigation

### Phase 2: Navigation UI (HIGH)
1. Create view mode tabs/navigation
2. Implement route-based view switching

### Phase 3: Component Sharing (MEDIUM)
1. Move imageProcessing.ts to src/lib/
2. Create shared SignaturePad component

### Phase 4: Polish & Documentation (MEDIUM)
1. Add breadcrumbs to views
2. Document component APIs

---

## 8. File Modification Checklist

### New Files to Create
- [ ] `src/features/workorders/views/CalendarView.tsx`
- [ ] `src/features/workorders/views/KanbanBoard.tsx`
- [ ] `src/features/workorders/views/MapView.tsx`
- [ ] `src/components/shared/SignaturePad/SignaturePad.tsx`

### Files to Modify
- [ ] `src/routes/index.tsx` - Add 3 new routes
- [ ] `src/features/workorders/WorkOrdersPage.tsx` - Add view navigation

---

**WORK_ORDERS_PLACEMENT_COMPLETE**
