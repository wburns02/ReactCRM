#!/bin/bash
# Ralph Wiggum Platform Discovery & Planning
# Run from your React project root: ./ralph-discover.sh

set -e

echo "🔍 Ralph Wiggum Platform Discovery 🔍"
echo "======================================"
echo ""

# Create docs directory if it doesn't exist
mkdir -p ./docs/architecture

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Phase 1: Discovering existing platform structure...${NC}"
echo ""

# Phase 1: Discovery
cat << 'DISCOVERY_PROMPT' | claude code --print > ./docs/architecture/01-platform-structure.md
You are analyzing a React service platform codebase.

## STEP 1: Explore the structure
Run these commands and capture output:

echo "=== Directory Structure ===" 
find src -type d -maxdepth 4 2>/dev/null | grep -v node_modules | sort

echo ""
echo "=== Route Files ==="
find src -name "*.tsx" -o -name "*.ts" | xargs grep -l -E "(Route|createBrowserRouter|useRoutes)" 2>/dev/null | head -20

echo ""
echo "=== Sidebar/Navigation Files ==="
find src -iname "*sidebar*" -o -iname "*nav*" -o -iname "*menu*" 2>/dev/null | head -20

echo ""
echo "=== Main App Entry ==="
cat src/App.tsx 2>/dev/null || cat src/main.tsx 2>/dev/null || echo "Check manually"

echo ""
echo "=== Router Configuration ==="
find src -name "router*" -o -name "routes*" | head -5 | xargs cat 2>/dev/null

echo ""
echo "=== Features/Pages Directories ==="
ls -la src/features/ 2>/dev/null || ls -la src/pages/ 2>/dev/null || echo "Check structure"

## STEP 2: Create comprehensive map

Output a markdown document with:

# Platform Structure Map

## Current Routes
| Route | Component | Location | Auth Required |
|-------|-----------|----------|---------------|
| /dashboard | Dashboard | src/pages/Dashboard.tsx | Yes |
| ... | ... | ... | ... |

## Sidebar Navigation
Current sidebar items and their hierarchy.

## Source Organization
```
src/
├── features/
│   ├── [list what exists]
├── components/
│   ├── [list key shared components]
├── pages/
└── ...
```

## Patterns Identified
- How are routes organized?
- How is the sidebar configured?
- Role-based access patterns?
- API integration patterns?

Be thorough - this will drive all planning.
DISCOVERY_PROMPT

echo -e "${GREEN}✓ Phase 1 complete: ./docs/architecture/01-platform-structure.md${NC}"
echo ""

echo -e "${BLUE}Phase 2: Planning feature placement...${NC}"
echo ""

# Phase 2: Planning
cat << 'PLANNING_PROMPT' | claude code --print > ./docs/architecture/02-feature-placement.md
Read the discovered structure:
cat ./docs/architecture/01-platform-structure.md

Now plan where these NEW features should be placed:

## Features to Place:

### 1. GPS Tracking
- Tracking Dashboard (live map, all technicians)
- Dispatch View (drag-drop assignment)
- Customer Tracking (public, Uber-style)
Routes: /tracking, /tracking/dispatch, /track/:token

### 2. Enhanced Work Orders
- Photo capture with live camera preview
- Digital signatures
- Inspection forms
- Compliance documents
Keep existing /work-orders, add sub-routes

### 3. Scheduling & Calendar
- Full calendar view
- Timeline view
- Smart scheduler
- Capacity heatmap
Decide: /schedule OR /work-orders/calendar?

### 4. Field Service (Technician Mobile)
- My Jobs list
- Job detail with photo/signature capture
- Route navigation
- Offline sync
Routes: /field, /field/job/:id, /field/route

### 5. Customer Communications
- SMS inbox (two-way)
- Email templates
- Notification center
Routes: /communications, /communications/sms

### 6. Billing & Payments
- Invoice management
- Payment processing
- Payment links (public)
Routes: /billing, /billing/invoices, /pay/:token

## OUTPUT:

# Feature Placement Plan

## Sidebar by Role

### Admin/Operations Manager
[Full sidebar with all features]

### Dispatcher
[Focused on tracking, work orders, schedule]

### Technician
[Mobile-first: My Jobs, Route, Stats]

### Customer (Public)
[No sidebar - standalone pages]

## Route Hierarchy

```
/                           # Redirect to /dashboard
├── /dashboard              # Main dashboard
├── /customers              # Customer management
│   └── /:id                # Customer detail
├── /work-orders            # Work order management
│   ├── /calendar           # Calendar view
│   ├── /board              # Kanban view
│   ├── /map                # Map view
│   └── /:id                # Work order detail
│       ├── /photos         # Photo documentation
│       └── /signatures     # Signatures
├── /tracking          ⭐NEW
│   ├── (index)             # Live tracking map
│   └── /dispatch           # Dispatch board
├── /communications    ⭐NEW
│   ├── /sms                # SMS inbox
│   └── /templates          # Message templates
├── /billing           ⭐NEW
│   ├── /invoices           # Invoice list
│   └── /payments           # Payment history
├── /field             ⭐NEW (Technician)
│   ├── (index)             # My jobs today
│   ├── /job/:id            # Job detail
│   └── /route              # Route navigation
├── /analytics              # Reports & analytics
└── /settings               # System settings

## Public Routes (no auth)
├── /track/:token           # Customer tracking
└── /pay/:token             # Payment page
```

## Feature → Source Location

| Feature | Directory | Key Files |
|---------|-----------|-----------|
| GPS Tracking | src/features/tracking/ | TrackingDashboard.tsx, DispatchView.tsx |
| Work Orders | src/features/work-orders/ | (enhance existing) |
| Field Service | src/features/field/ | MyJobs.tsx, JobDetail.tsx |
| Communications | src/features/communications/ | SMSInbox.tsx |
| Billing | src/features/billing/ | InvoiceList.tsx |

## Sidebar Config Location
[Where should sidebar config live? How to update?]
PLANNING_PROMPT

echo -e "${GREEN}✓ Phase 2 complete: ./docs/architecture/02-feature-placement.md${NC}"
echo ""

echo -e "${BLUE}Phase 3: Creating implementation architecture...${NC}"
echo ""

# Phase 3: Architecture
cat << 'ARCHITECTURE_PROMPT' | claude code --print > ./docs/architecture/03-implementation-guide.md
Read previous outputs:
cat ./docs/architecture/01-platform-structure.md
cat ./docs/architecture/02-feature-placement.md

Create actionable implementation guide:

# Implementation Architecture

## 1. Router Updates

Show exact code to add to the router:

```tsx
// Add to existing router configuration

// GPS Tracking routes
{
  path: 'tracking',
  element: <TrackingLayout />,
  children: [
    { index: true, element: <TrackingDashboard /> },
    { path: 'dispatch', element: <DispatchView /> },
  ],
},

// Public tracking (outside auth)
{
  path: 'track/:token',
  element: <CustomerTracking />,
},

// ... show all new routes
```

## 2. Sidebar Configuration

Show exact code to add sidebar items:

```tsx
// Sidebar items to add

{
  id: 'tracking',
  label: 'GPS Tracking',
  icon: MapPin, // from lucide-react
  path: '/tracking',
  roles: ['admin', 'manager', 'dispatch'],
  badge: 'LIVE', // optional live indicator
  children: [
    { id: 'tracking-map', label: 'Live Map', path: '/tracking' },
    { id: 'tracking-dispatch', label: 'Dispatch', path: '/tracking/dispatch' },
  ],
},

// ... show all new items with correct order
```

## 3. Feature Module Structure

Each new feature follows this structure:

```
src/features/[feature-name]/
├── index.ts                    # Barrel exports
├── [Feature]Routes.tsx         # Route definitions for this feature
├── pages/
│   ├── [PageName]Page.tsx      # Page components
│   └── index.ts
├── components/
│   ├── [Component]/
│   │   ├── [Component].tsx
│   │   ├── [Component].test.tsx
│   │   └── index.ts
│   └── index.ts
├── hooks/
│   ├── use[Feature].ts
│   └── index.ts
├── api/
│   ├── [feature]Api.ts         # API calls
│   ├── [feature]Queries.ts     # React Query hooks
│   └── index.ts
├── stores/
│   └── [feature]Store.ts       # Zustand store
├── types/
│   └── [feature].types.ts
└── utils/
    └── [feature]Helpers.ts
```

## 4. API Endpoints Required

| Feature | Method | Endpoint | Description |
|---------|--------|----------|-------------|
| Tracking | GET | /api/technicians/locations | All tech locations |
| Tracking | POST | /api/technicians/:id/location | Update location |
| Tracking | GET | /api/tracking/:token | Public tracking data |
| Tracking | POST | /api/geofences | Create geofence |
| Work Orders | POST | /api/work-orders/:id/photos | Upload photo |
| Work Orders | POST | /api/work-orders/:id/signatures | Save signature |
| Communications | GET | /api/sms/conversations | SMS threads |
| Communications | POST | /api/sms/send | Send SMS |
| Billing | GET | /api/invoices | Invoice list |
| Billing | POST | /api/payments/link | Generate payment link |
| Field | GET | /api/field/my-jobs | Tech's assigned jobs |
| Field | POST | /api/field/status | Update job status |

## 5. Shared Components

These should be in src/components/shared/:

| Component | Used By | Description |
|-----------|---------|-------------|
| MapView | Tracking, Work Orders, Field | Mapbox wrapper |
| PhotoCapture | Work Orders, Field | Camera component |
| SignaturePad | Work Orders, Field | Signature capture |
| StatusBadge | Work Orders, Tracking | Status indicators |
| LoadingState | All | Skeleton loaders |
| EmptyState | All | Empty list states |

## 6. Implementation Order

Build in this order (dependencies):

1. **Types & API Layer** (no dependencies)
   - Create types for all features
   - Set up API clients

2. **Shared Components** (no dependencies)
   - MapView, PhotoCapture, SignaturePad

3. **GPS Tracking** (needs MapView)
   - Core tracking functionality
   - Test with mock data

4. **Work Order Enhancements** (needs shared components)
   - Add photo capture
   - Add signatures
   - Add inspection forms

5. **Field Service** (needs Work Orders + Tracking)
   - Mobile-optimized views
   - Offline sync

6. **Communications** (independent)
   - SMS inbox
   - Templates

7. **Billing** (needs Work Orders)
   - Invoicing
   - Payment links

8. **Integration Testing**
   - Full flow testing
   - Role-based access verification

## 7. Files to Create First

Priority order for initial setup:

```bash
# Types
touch src/features/tracking/types/tracking.types.ts
touch src/features/field/types/field.types.ts
touch src/features/communications/types/communications.types.ts
touch src/features/billing/types/billing.types.ts

# Route configs
touch src/features/tracking/TrackingRoutes.tsx
touch src/features/field/FieldRoutes.tsx
touch src/features/communications/CommunicationsRoutes.tsx
touch src/features/billing/BillingRoutes.tsx

# Update main router
# Update sidebar config
```
ARCHITECTURE_PROMPT

echo -e "${GREEN}✓ Phase 3 complete: ./docs/architecture/03-implementation-guide.md${NC}"
echo ""

echo "======================================"
echo -e "${GREEN}🎉 Discovery Complete!${NC}"
echo "======================================"
echo ""
echo "📁 Output files created:"
echo "   ./docs/architecture/01-platform-structure.md"
echo "   ./docs/architecture/02-feature-placement.md"
echo "   ./docs/architecture/03-implementation-guide.md"
echo ""
echo "📋 Next steps:"
echo "   1. Review the placement plan"
echo "   2. Adjust based on your preferences"
echo "   3. Run the build agents with the finalized plan"
echo ""
echo "🍕 Ralph says: 'I bent my Wookiee!'"
