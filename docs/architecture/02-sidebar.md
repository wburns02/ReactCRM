# Sidebar Navigation Architecture - ECBTX CRM

**Document:** `docs/architecture/02-sidebar.md`
**Status:** Discovery Complete
**Generated:** 2026-01-09

## Executive Summary

The ECBTX CRM implements a **collapsible sidebar navigation** with 8 major functional groups plus 4 top-level items. The navigation is stateless and role-agnostic (no per-role filtering in the sidebar itself), delegating role-based access control to individual route guards.

**Key Components:**
- **AppLayout.tsx** - Main sidebar container with navigation logic
- **RoleProvider.tsx** - Demo mode role switching context
- **RoleSwitcher.tsx** - Floating UI for demo user role selection

---

## Navigation Structure

### Top-Level Items (Always Visible)

| Label | Icon | Route |
|-------|------|-------|
| Dashboard | 📊 | `/dashboard` |
| Customers | 👥 | `/customers` |
| Prospects | 📋 | `/prospects` |
| Customer Success | 💚 | `/customer-success` |

### Collapsible Groups

#### 1. Operations (📝)
| Item | Icon | Route |
|------|------|-------|
| Command Center | 🎯 | `/command-center` |
| Work Orders | 🔧 | `/work-orders` |
| Schedule | 📅 | `/schedule` |
| Technicians | 👷 | `/technicians` |
| Employee Portal | 📱 | `/employee` |
| Service Intervals | 🔄 | `/service-intervals` |
| Compliance | ✅ | `/compliance` |
| Contracts | 📄 | `/contracts` |
| Timesheets | ⏱️ | `/timesheets` |

#### 2. Communications (📞)
| Item | Icon | Route |
|------|------|-------|
| Call Center | 📞 | `/calls` |
| Phone Dashboard | 📞 | `/phone` |
| Integrations | 🔌 | `/integrations` |

#### 3. Financial (💰)
| Item | Icon | Route |
|------|------|-------|
| Invoices | 🧾 | `/invoices` |
| Payments | 💳 | `/payments` |
| Payroll | 💵 | `/payroll` |
| Job Costing | 💹 | `/job-costing` |

#### 4. Assets (📦)
| Item | Icon | Route |
|------|------|-------|
| Inventory | 📦 | `/inventory` |
| Equipment | 🛠️ | `/equipment` |
| Fleet Map | 🚛 | `/fleet` |

#### 5. Marketing (📧) - Badge: "AI"
| Item | Icon | Route |
|------|------|-------|
| Marketing Hub | 📊 | `/marketing` |
| Google Ads | 📈 | `/marketing/ads` |
| Reviews | ⭐ | `/marketing/reviews` |
| AI Content | 🤖 | `/marketing/ai-content` |
| Email Marketing | 📧 | `/email-marketing` |
| Reports | 📈 | `/reports` |

#### 6. AI & Analytics (🤖) - Badge: "GPU"
| Item | Icon | Route |
|------|------|-------|
| AI Assistant | ✨ | `/ai-assistant` |
| BI Dashboard | 📊 | `/analytics/bi` |
| First-Time Fix Rate | ✔ | `/analytics/ftfr` |
| AI Predictions | 🔮 | `/predictive-maintenance` |

#### 7. Support (🎫)
| Item | Icon | Route |
|------|------|-------|
| Tickets | 🎫 | `/tickets` |

#### 8. System (⚙️)
| Item | Icon | Route |
|------|------|-------|
| Users | 👤 | `/users` |
| Settings | ⚙️ | `/admin` |
| Data Import | 📥 | `/admin/import` |

---

## Technical Implementation

### Navigation Item Structure

```typescript
interface NavItem {
  path: string;           // Route path
  label: string;          // Display text
  icon: string;           // Emoji icon
  badge?: string;         // Optional badge (e.g., "AI", "GPU")
}

interface NavGroup {
  name: string;           // Unique identifier for state persistence
  label: string;          // Display text
  icon: string;           // Emoji icon
  badge?: string;         // Optional badge
  items: NavItem[];       // Collapsible items
}
```

### Sidebar Layout

```
AppLayout
├── Logo Section (height: 16)
│   └── Link to /dashboard with 🚽 MAC Septic CRM branding
│
├── Navigation (scrollable)
│   ├── Top-level items (always visible) [4 items]
│   └── Collapsible Groups [8 groups]
│
└── User Info Section (collapsible on bottom)
    ├── Avatar circle with first name initial
    ├── User full name
    ├── User email
    └── Sign out button
```

### State Management

**Expanded Groups Persistence:**
- Uses `localStorage.getItem('sidebarExpandedGroups')` to persist user preferences
- Auto-expands "operations" group on first load
- Stored as JSON array of group names

### Active Route Highlighting

**Path Matching Logic:**
```typescript
const isActive = (path: string) =>
  location.pathname === path || location.pathname.startsWith(path + '/');

const isGroupActive = (group: NavGroup) =>
  group.items.some((item) => isActive(item.path));
```

---

## Demo Mode Role Switching

**Target User:** `will@macseptic.com`

**Roles Available:**

| Role Key | Display Name | Icon | Color |
|----------|-------------|------|-------|
| `admin` | Administrator | 👑 | purple |
| `executive` | Executive | 📊 | blue |
| `manager` | Operations Manager | 📋 | green |
| `technician` | Field Technician | 🔧 | orange |
| `phone_agent` | Phone Agent | 📞 | cyan |
| `dispatcher` | Dispatcher | 🗺️ | indigo |
| `billing` | Billing Specialist | 💰 | emerald |

---

## Current Patterns

### Authorization Pattern
- Sidebar shows ALL items to all users
- Individual routes enforce access via `RequireAuth`
- No per-item visibility filtering in sidebar

### Styling & Appearance
- Width: 256px (w-64)
- Background: `bg-bg-sidebar` (design token)
- Border: `border-r border-border`
- Icons: Emoji strings
- Active state: `bg-primary-light`, `text-primary`

---

## Notes for Enhancement

1. **Per-Role Navigation:** Consider filtering sidebar items based on role
2. **Mobile Sidebar:** Implement hamburger menu pattern
3. **Search/Filter:** Add searchable navigation
4. **Favorites:** Allow users to star/pin frequently used items

---

**SIDEBAR_MAPPED**
