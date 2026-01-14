# Field Service Technician Mobile Experience - Placement Plan

**Document:** `docs/architecture/placement/field-service.md`
**Status:** Comprehensive Architecture Plan
**Generated:** 2026-01-09

---

## Executive Summary

The Field Service module establishes a **dedicated mobile experience** for field technicians with a new route hierarchy (`/field`) that operates independently from the main admin-centric sidebar navigation.

**Key Decision:** Create a **technician-first isolated routing tree** with minimal UI chrome, large touch targets, and offline-first data handling.

---

## 1. Sidebar Placement: Separate Navigation Paradigm

**Decision:** **SEPARATE sidebar for technician role**

**Rationale:**
- Field technicians have fundamentally different navigation needs
- Technicians spend ~80% of time in `/field/*` routes
- Mobile-optimized bottom navigation pattern

**Technician Navigation:**
- Bottom navigation bar (5-6 items max, touch-friendly 48px height)
- Items: My Jobs, Route, My Stats, Profile, Menu

---

## 2. Route Structure: `/field` Namespace

**New Route Tree:**
```
/field                    → MyJobsPage (landing, job list)
/field/job/:id            → JobDetailPage (single job with actions)
/field/job/:id/complete   → JobCompletionFlow (photos, signature, etc.)
/field/route              → RouteView (turn-by-turn navigation)
/field/route/:jobId       → RouteDetail (directions to specific job)
/field/stats              → TechStats (my performance metrics)
/field/profile            → TechProfile (settings, offline sync status)
```

**Route Guards:**
```typescript
<Route element={<RequireAuth requiredRole="technician"><FieldLayout /></RequireAuth>}>
  <Route path="field" element={<MyJobsPage />} />
  <Route path="field/job/:id" element={<JobDetailPage />} />
  ...
</Route>
```

---

## 3. Source Location: Feature-Based Architecture

**Directory Structure:**
```
src/features/field/
├── pages/
│   ├── MyJobsPage.tsx
│   ├── JobDetailPage.tsx
│   ├── JobCompletionFlow.tsx
│   ├── RouteView.tsx
│   ├── TechStatsPage.tsx
│   └── TechProfilePage.tsx
├── components/
│   ├── JobCard.tsx
│   ├── QuickActionBar.tsx
│   ├── OfflineSyncStatus.tsx
│   ├── PhotoCapture/
│   ├── SignaturePad/
│   └── WorkflowStepper.tsx
├── hooks/
│   ├── useMyJobs.ts
│   ├── useJobDetail.ts
│   ├── useOfflineSync.ts
│   ├── useRoute.ts
│   └── useTechStats.ts
├── stores/
│   ├── fieldStore.ts
│   ├── offlineSyncStore.ts
│   └── routeStore.ts
├── utils/
│   ├── jobHelpers.ts
│   ├── routeOptimizer.ts
│   └── geoHelpers.ts
├── api/
│   └── fieldHooks.ts
├── FieldLayout.tsx
└── index.ts
```

---

## 4. Mobile Considerations: PWA + Offline First

### PWA Manifest
```json
{
  "name": "ECBTX Field Service",
  "short_name": "ECBTX Field",
  "start_url": "/field",
  "display": "standalone",
  "scope": "/field"
}
```

### Bottom Navigation Bar
```typescript
<div className="fixed bottom-0 left-0 right-0 bg-white border-t flex gap-1 px-2 py-1">
  <NavItem icon="📋" label="Jobs" route="/field" />
  <NavItem icon="🗺️" label="Route" route="/field/route" />
  <NavItem icon="📊" label="Stats" route="/field/stats" />
  <NavItem icon="👤" label="Profile" route="/field/profile" />
</div>
```

### Offline Support
- IndexedDB for offline data storage
- Service worker for caching
- Sync queue for pending changes

---

## 5. Component Architecture

### MyJobsPage Flow
- useMyJobs() hook → fetch assigned WOs
- JobList with infinite scroll
- JobCard with address, time, status, quick actions
- OfflineSyncStatus widget

### JobDetailPage Flow
- Full job card with customer info
- Quick actions bar (Call, Navigate, Start Work)
- Tab navigation: Overview, Photos, Signature, Notes

### JobCompletionFlow (Step-by-Step Wizard)
1. Overview - Customer info + "Start Work Order"
2. Navigate - Google Maps link
3. Arrival Location - GPS capture
4. Before Photos - Camera + multiple photos
5. Work - Service notes
6. After Photos - Camera + multiple photos
7. Customer Signature - Required
8. Technician Signature - Required
9. Review & Submit

---

## 6. API Integration

### New Backend Endpoints
```
GET /api/v2/technicians/:id/jobs
PATCH /api/v2/work-orders/:id/status
POST /api/v2/work-orders/:id/photos
POST /api/v2/work-orders/:id/signature
GET /api/v2/technicians/:id/stats
GET /api/v2/work-orders/:id/route
```

---

## 7. Offline Data Strategy

### Sync Flow
1. **Online Mode** - Real-time API calls
2. **Offline Mode** - Queue changes in IndexedDB
3. **Sync Phase** - Upload queued data on reconnect

### IndexedDB Schema
- `work_orders` - Full WO snapshot
- `offline_changes` - Pending modifications
- `location_history` - Background GPS tracks

---

## 8. Development Phases

### Phase 1: Foundation
- Create `/field` route structure
- Implement MyJobsPage + JobCard
- Create BottomNav layout
- PWA manifest + service worker

### Phase 2: Job Detail & Offline
- JobDetailPage with quick actions
- useOfflineSync hook + IndexedDB
- OfflineSyncStatus UI

### Phase 3: Workflow
- JobCompletionFlow wizard
- Photo capture + compression
- Signature pad integration

### Phase 4: Navigation & Stats
- RouteView with map
- TechStatsPage + KPI cards

### Phase 5: Polish & Testing
- E2E tests with Playwright
- Mobile device testing
- Performance optimization

---

## Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Sidebar for technicians | Separate navigation | Different UX needs |
| Route namespace | `/field` | Shorter, PWA-friendly |
| Feature location | `src/features/field/` | Follows architecture |
| Offline support | IndexedDB + service worker | Unreliable networks |
| Bottom navigation | 5-6 items, 48px touch | Mobile UX best practices |

---

**FIELD_SERVICE_PLACEMENT_COMPLETE**
