# Ralph Wiggum Platform Discovery & Planning
## MAC Septic React CRM - Structure Review & Feature Placement

**Mission**: Before building, review the existing platform structure, understand the information architecture, and create a definitive feature placement plan.

---

## 🔍 PHASE 1: DISCOVERY AGENT

Run this first to understand what exists:

```bash
claude code --prompt "DISCOVERY_AGENT: You are reviewing the MAC Septic React CRM platform at react.ecbtx.com.

Your task is to create a complete map of the existing platform structure.

## STEP 1: Explore the codebase structure
Run these commands and analyze results:

find src -type d -name 'features' -o -name 'pages' -o -name 'components' | head -50
find src -type f -name '*.tsx' | grep -E '(page|Page|route|Route)' | head -50
cat src/App.tsx || cat src/main.tsx
find src -name 'router*' -o -name 'routes*' | xargs cat 2>/dev/null
find src -name 'sidebar*' -o -name 'Sidebar*' -o -name 'nav*' | head -20

## STEP 2: Document the current navigation structure
- What's in the sidebar?
- What are the main sections/modules?
- How are routes organized?
- What URL patterns are used?

## STEP 3: Create a structure map
Output a comprehensive map like this:

PLATFORM STRUCTURE MAP
======================

📁 Main Sections (Sidebar Level 1):
├── Dashboard (/dashboard)
├── Customers (/customers)
│   ├── List (/customers)
│   ├── Detail (/customers/:id)
│   └── ...
├── Work Orders (/work-orders)
└── ...

📁 Source Organization:
├── src/features/
│   ├── customers/
│   ├── work-orders/
│   └── ...
├── src/components/
└── src/pages/

📁 Existing Routes:
[List all routes found]

📁 Sidebar Configuration:
[Where is sidebar config? What items exist?]

Save this map to: ./platform-structure-map.md"
```

---

## 🗺️ PHASE 2: PLANNING AGENT

After discovery, run this to plan feature placement:

```bash
claude code --prompt "PLANNING_AGENT: Based on the platform structure discovered, create a feature placement plan.

## Read the discovery output first:
cat ./platform-structure-map.md

## Features to Place:

### 1. GPS Tracking Module
Currently planned:
- Tracking Dashboard: /tracking
- Dispatch View: /tracking/dispatch  
- Customer Tracking: /track/:token (public)
Source: src/features/tracking/

DECIDE: 
- Sidebar placement? (Top level or under Operations?)
- Icon to use?
- Who sees it? (Admin, Dispatch, Tech, Customer)

### 2. Work Orders Module (Enhanced)
Components: List, Detail, Calendar, Kanban, Map View
Sub-features: Photos, Signatures, Scheduling, Payments

DECIDE:
- Keep as top-level sidebar item?
- Sub-navigation within Work Orders?
- Mobile-specific views?

### 3. Scheduling & Calendar
Components: Calendar, Timeline, Capacity Heatmap, Smart Scheduler

DECIDE:
- Separate sidebar item OR under Work Orders?
- Dedicated /schedule route OR /work-orders/schedule?

### 4. Field Service Mobile Mode
Components: Tech daily view, Offline sync, Quick actions

DECIDE:
- Separate /field route for technicians?
- Auto-detect mobile and redirect?
- PWA considerations?

### 5. Analytics & Reporting
Components: Dashboard, KPIs, Reports, Export

DECIDE:
- Under existing Dashboard OR separate Analytics section?
- Role-based dashboards?

### 6. Customer Communication Center
Components: SMS inbox, Email, Notifications, Templates

DECIDE:
- Sidebar item OR within Customer detail?
- Unified inbox approach?

### 7. Payments & Invoicing
Components: Invoice list, Payment processing, Financing

DECIDE:
- Under Work Orders OR separate Billing section?
- Integration with existing accounting?

## OUTPUT FORMAT:

Create a definitive placement plan:

FEATURE PLACEMENT PLAN
======================

## Sidebar Navigation (by role)

### Admin/Manager View:
├── 📊 Dashboard (/dashboard)
├── 👥 Customers (/customers)
├── 📋 Work Orders (/work-orders)
│   ├── List View (default)
│   ├── Calendar (/work-orders/calendar)
│   ├── Kanban (/work-orders/board)
│   └── Map (/work-orders/map)
├── 📍 GPS Tracking (/tracking) ⬅️ NEW
│   ├── Live Map (default)
│   └── Dispatch (/tracking/dispatch)
├── 📅 Scheduling (/schedule) ⬅️ NEW or under WO?
├── 💬 Communications (/communications) ⬅️ NEW
├── 💰 Billing (/billing) ⬅️ NEW or under WO?
├── 📈 Analytics (/analytics)
└── ⚙️ Settings (/settings)

### Technician View:
├── 📋 My Jobs (/field)
├── 📍 Navigation (/field/navigate)
└── 📊 My Stats (/field/stats)

### Dispatch View:
├── 📍 Tracking (/tracking/dispatch)
├── 📋 Work Orders (/work-orders)
└── 📅 Schedule (/schedule)

## Public Routes (no auth):
├── /track/:token - Customer tracking page
└── /pay/:token - Payment page

## Route Structure:

| Feature | Route | Parent | Sidebar Level | Icon |
|---------|-------|--------|---------------|------|
| ... | ... | ... | ... | ... |

## File Organization:

src/features/
├── tracking/           # GPS Tracking module
│   ├── pages/
│   │   ├── TrackingDashboard.tsx
│   │   ├── DispatchView.tsx
│   │   └── CustomerTracking.tsx
│   ├── components/
│   ├── hooks/
│   └── api/
├── work-orders/        # Enhanced Work Orders
│   ├── pages/
│   ├── components/
│   │   ├── PhotoCapture/
│   │   ├── Signatures/
│   │   └── ...
│   └── ...
└── ...

Save to: ./feature-placement-plan.md"
```

---

## 📐 PHASE 3: ARCHITECTURE AGENT

Finalize the technical architecture:

```bash
claude code --prompt "ARCHITECTURE_AGENT: Create the technical implementation plan.

## Read previous outputs:
cat ./platform-structure-map.md
cat ./feature-placement-plan.md

## Create Implementation Architecture:

### 1. Router Configuration
Show exactly how to update the router:

// src/router/index.tsx or wherever routes are defined
const routes = [
  // Existing routes...
  
  // NEW: GPS Tracking
  {
    path: '/tracking',
    element: <TrackingLayout />,
    children: [
      { index: true, element: <TrackingDashboard /> },
      { path: 'dispatch', element: <DispatchView /> },
    ]
  },
  // Public tracking (no auth)
  {
    path: '/track/:token',
    element: <CustomerTracking />,
  },
  // ... more routes
];

### 2. Sidebar Configuration
Show exactly how to update sidebar:

// src/components/Sidebar/sidebarConfig.ts
export const sidebarItems: SidebarItem[] = [
  {
    id: 'tracking',
    label: 'GPS Tracking',
    icon: MapPin,
    path: '/tracking',
    roles: ['admin', 'manager', 'dispatch'],
    children: [
      { label: 'Live Map', path: '/tracking' },
      { label: 'Dispatch', path: '/tracking/dispatch' },
    ]
  },
  // ...
];

### 3. Feature Module Template
Standard structure for each feature:

src/features/[feature-name]/
├── index.ts                 # Public exports
├── pages/
│   └── [PageName].tsx
├── components/
│   └── [ComponentName]/
│       ├── index.tsx
│       └── [ComponentName].styles.ts
├── hooks/
│   └── use[Feature].ts
├── api/
│   └── [feature]Api.ts
├── stores/
│   └── [feature]Store.ts
├── types/
│   └── [feature].types.ts
└── utils/
    └── [feature]Helpers.ts

### 4. API Endpoints Required

| Feature | Endpoint | Method | Description |
|---------|----------|--------|-------------|
| Tracking | /api/technicians/locations | GET | All tech locations |
| Tracking | /api/technicians/:id/location | POST | Update location |
| ... | ... | ... | ... |

### 5. Shared Components Needed

List components that should be in src/components/shared/:
- Map components (reusable across tracking, work orders)
- Photo capture (work orders, inspections)
- Signature pad
- etc.

Save to: ./implementation-architecture.md"
```

---

## 🚀 EXECUTION SCRIPT

Save this as `ralph-discover-platform.sh`:

```bash
#!/bin/bash
# Ralph Wiggum Platform Discovery
# Run from your React project root

echo "🔍 Ralph says: 'I'm a detective!' 🔍"
echo "========================================"
echo "Phase 1: Discovering platform structure"
echo "========================================"

# Phase 1: Discovery
claude code --print "
You are reviewing a React service platform.

STEP 1 - Run these commands and analyze:
ls -la src/
find src -type d -maxdepth 3 | head -40
find src -name '*.tsx' | xargs grep -l 'Route\|route' | head -20
cat src/App.tsx 2>/dev/null || cat src/main.tsx 2>/dev/null
find src -iname '*sidebar*' -o -iname '*nav*' | head -10

STEP 2 - Create platform-structure-map.md with:
- All existing routes and their URLs
- Sidebar navigation items
- Source file organization
- Role-based access patterns found

Be thorough. This map will be used for planning.
" > ./docs/platform-structure-map.md

echo ""
echo "========================================"
echo "Phase 2: Planning feature placement"
echo "========================================"

# Phase 2: Planning  
claude code --print "
Read: ./docs/platform-structure-map.md

Plan placement for these features:
1. GPS Tracking (/tracking, /tracking/dispatch, /track/:token)
2. Enhanced Work Orders (photos, signatures, scheduling)
3. Field Service Mobile Mode
4. Customer Communications
5. Payments & Invoicing
6. Analytics Dashboard

Output feature-placement-plan.md with:
- Sidebar structure by role (Admin, Tech, Dispatch)
- Route hierarchy
- Which features are top-level vs nested
- Public vs authenticated routes
- Recommended icons (lucide-react)
" > ./docs/feature-placement-plan.md

echo ""
echo "========================================"  
echo "Phase 3: Implementation architecture"
echo "========================================"

# Phase 3: Architecture
claude code --print "
Read: 
- ./docs/platform-structure-map.md
- ./docs/feature-placement-plan.md

Create implementation-architecture.md with:
1. Exact router configuration changes
2. Exact sidebar configuration changes
3. Feature module file structure
4. Required API endpoints
5. Shared components list
6. Implementation order (dependencies)

Make it copy-paste ready for developers.
" > ./docs/implementation-architecture.md

echo ""
echo "✅ Discovery complete!"
echo ""
echo "📁 Output files:"
echo "   ./docs/platform-structure-map.md"
echo "   ./docs/feature-placement-plan.md"  
echo "   ./docs/implementation-architecture.md"
echo ""
echo "🍕 Ralph says: 'The plan is stuck in my plan hole!'"
```

---

## 📋 EXPECTED OUTPUT EXAMPLE

After running, you'll have something like:

### feature-placement-plan.md

```
FEATURE PLACEMENT PLAN - MAC Septic React CRM
=============================================

## Sidebar Navigation

### 🔷 Operations Manager / Admin
┌─────────────────────────────────────────────────────────────┐
│ 📊 Dashboard                    /dashboard                  │
├─────────────────────────────────────────────────────────────┤
│ 👥 Customers                    /customers                  │
│    └── Customer Detail          /customers/:id              │
├─────────────────────────────────────────────────────────────┤
│ 📋 Work Orders                  /work-orders                │
│    ├── List View                /work-orders                │
│    ├── Calendar                 /work-orders/calendar       │
│    ├── Board (Kanban)           /work-orders/board          │
│    └── Map View                 /work-orders/map            │
├─────────────────────────────────────────────────────────────┤
│ 📍 GPS Tracking          ⭐NEW  /tracking                   │
│    ├── Live Map                 /tracking                   │
│    └── Dispatch Board           /tracking/dispatch          │
├─────────────────────────────────────────────────────────────┤
│ 👷 Technicians                  /technicians                │
├─────────────────────────────────────────────────────────────┤
│ 💬 Communications        ⭐NEW  /communications             │
│    ├── SMS Inbox                /communications/sms         │
│    └── Templates                /communications/templates   │
├─────────────────────────────────────────────────────────────┤
│ 💰 Billing               ⭐NEW  /billing                    │
│    ├── Invoices                 /billing/invoices           │
│    └── Payments                 /billing/payments           │
├─────────────────────────────────────────────────────────────┤
│ 📈 Analytics                    /analytics                  │
├─────────────────────────────────────────────────────────────┤
│ ⚙️  Settings                    /settings                   │
└─────────────────────────────────────────────────────────────┘

### 🔷 Technician (Mobile-First)
┌─────────────────────────────────────────────────────────────┐
│ 📋 My Jobs                      /field                      │
│    └── Job Detail               /field/job/:id              │
├─────────────────────────────────────────────────────────────┤
│ 🗺️  Route                       /field/route                │
├─────────────────────────────────────────────────────────────┤
│ 📊 My Stats                     /field/stats                │
└─────────────────────────────────────────────────────────────┘

### 🔷 Dispatcher
┌─────────────────────────────────────────────────────────────┐
│ 📍 Dispatch Board               /tracking/dispatch          │
├─────────────────────────────────────────────────────────────┤
│ 📋 Work Orders                  /work-orders                │
├─────────────────────────────────────────────────────────────┤
│ 📅 Schedule                     /work-orders/calendar       │
└─────────────────────────────────────────────────────────────┘

### 🔷 Public (No Auth)
┌─────────────────────────────────────────────────────────────┐
│ 📍 Track My Technician          /track/:token               │
├─────────────────────────────────────────────────────────────┤
│ 💳 Pay Invoice                  /pay/:token                 │
└─────────────────────────────────────────────────────────────┘

## Source File Organization

src/features/
├── tracking/                 # GPS Tracking Module
│   ├── pages/
│   │   ├── TrackingDashboard.tsx
│   │   ├── DispatchView.tsx
│   │   └── CustomerTracking.tsx  (public)
│   ├── components/
│   │   ├── LiveMap/
│   │   ├── TechnicianMarker/
│   │   ├── GeofenceEditor/
│   │   └── ETADisplay/
│   ├── hooks/
│   │   ├── useGeolocation.ts
│   │   └── useTechnicianLocations.ts
│   └── api/
│       └── trackingApi.ts
│
├── work-orders/              # Enhanced Work Orders
│   ├── pages/
│   ├── components/
│   │   ├── PhotoCapture/     # Camera with live preview
│   │   ├── SignaturePad/
│   │   ├── InspectionForm/
│   │   └── StatusTimeline/
│   └── ...
│
├── communications/           # Customer Communications
│   ├── pages/
│   │   ├── SMSInbox.tsx
│   │   └── Templates.tsx
│   └── ...
│
├── billing/                  # Payments & Invoicing
│   ├── pages/
│   │   ├── InvoiceList.tsx
│   │   └── PaymentProcessor.tsx
│   └── ...
│
└── field/                    # Technician Mobile Mode
    ├── pages/
    │   ├── MyJobs.tsx
    │   ├── JobDetail.tsx
    │   └── RouteView.tsx
    └── ...
```

---

## 🎯 WHY THIS APPROACH?

1. **Discovery First** - Don't assume, verify what exists
2. **Role-Based Planning** - Different users need different nav
3. **Logical Grouping** - Related features together
4. **URL Consistency** - Predictable patterns
5. **Implementation Ready** - Output is actionable, not vague

Run the discovery before spawning build agents. Then each build agent knows exactly where their code goes.
