# Role-Switching Demo Implementation Prompt
# Copy everything below this line and paste into Claude Code (Opus CLI)

Implement a role-switching demo feature for will@macseptic.com in the ECBTX CRM.

## CONTEXT
- Backend: FastAPI + SQLAlchemy + PostgreSQL
- Frontend: React 19 + TypeScript + Vite + TanStack Query
- Demo user email: will@macseptic.com
- When this user logs in, show a floating UI to switch between 7 role views

## ROLES TO IMPLEMENT

```python
DEMO_ROLES = {
    "admin": {"displayName": "Administrator", "icon": "👑", "color": "#8B5CF6"},
    "executive": {"displayName": "Executive", "icon": "📊", "color": "#3B82F6"},
    "manager": {"displayName": "Operations Manager", "icon": "📋", "color": "#10B981"},
    "technician": {"displayName": "Field Technician", "icon": "🔧", "color": "#F59E0B"},
    "phone_agent": {"displayName": "Phone Agent", "icon": "📞", "color": "#EC4899"},
    "dispatcher": {"displayName": "Dispatcher", "icon": "🗺️", "color": "#6366F1"},
    "billing": {"displayName": "Billing Specialist", "icon": "💰", "color": "#14B8A6"},
}
```

## PHASE 1: BACKEND (FastAPI)

### 1.1 Create Model: `app/models/role_view.py`
```python
from sqlalchemy import Column, String, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.db.base_class import Base

class RoleView(Base):
    __tablename__ = "role_views"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, unique=True, nullable=False, index=True)
    display_name = Column(String, nullable=False)
    description = Column(String)
    icon = Column(String)
    color = Column(String)
    permissions = Column(JSON, default={})
    navigation_items = Column(JSON, default=[])
    dashboard_widgets = Column(JSON, default=[])
    ui_config = Column(JSON, default={})
    is_active = Column(Boolean, default=True)
```

### 1.2 Create Schemas: `app/schemas/role_view.py`
- RoleViewBase, RoleViewCreate, RoleViewResponse
- RoleSwitchRequest, CurrentRoleResponse

### 1.3 Create Service: `app/services/role_view_service.py`
```python
DEMO_USER_EMAIL = "will@macseptic.com"

class RoleViewService:
    def is_demo_user(self, user) -> bool:
        return user.email.lower() == DEMO_USER_EMAIL.lower()
    
    async def get_all_roles(self, db) -> List[RoleView]:
        ...
    
    async def switch_role(self, db, user, role_name: str):
        ...
    
    async def get_current_role(self, db, user, session_role: str = None):
        ...
```

### 1.4 Create Endpoints: `app/api/v2/endpoints/roles.py`
```python
router = APIRouter()

@router.get("/", response_model=List[RoleViewResponse])
async def get_roles(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get available roles (demo users only)"""
    ...

@router.post("/switch", response_model=CurrentRoleResponse)
async def switch_role(request: RoleSwitchRequest, ...):
    """Switch to a different role view"""
    ...

@router.get("/current", response_model=CurrentRoleResponse)
async def get_current_role(...):
    """Get current active role with config"""
    ...
```

### 1.5 Register router in `app/api/v2/api.py`:
```python
from app.api.v2.endpoints import roles
api_router.include_router(roles.router, prefix="/roles", tags=["roles"])
```

### 1.6 Create Alembic migration and seed data

## PHASE 2: FRONTEND (React/TypeScript)

### 2.1 Create Context: `src/context/RoleContext.tsx`
```tsx
interface RoleContextType {
  currentRole: RoleView | null;
  availableRoles: RoleView[];
  isDemoMode: boolean;
  switchRole: (roleName: string) => Promise<void>;
  hasPermission: (resource: string, action: string) => boolean;
  canAccessNav: (navItem: string) => boolean;
}

export const RoleProvider: React.FC = ({ children }) => {
  // Use TanStack Query for data fetching
  const { data: currentRoleData } = useQuery({
    queryKey: ['currentRole'],
    queryFn: () => apiClient.get('/roles/current'),
  });
  ...
};
```

### 2.2 Create Component: `src/components/RoleSwitcher/RoleSwitcher.tsx`
- Floating UI in top-right corner
- Shows "🎭 DEMO MODE" banner
- Dropdown with all 7 roles
- Shows icon, name, description for each
- Highlights current role
- Smooth animations

### 2.3 Create Role-Specific Dashboards: `src/components/Dashboard/views/`
- AdminDashboard.tsx
- ExecutiveDashboard.tsx
- ManagerDashboard.tsx
- TechnicianDashboard.tsx (mobile-optimized)
- PhoneAgentDashboard.tsx
- DispatcherDashboard.tsx
- BillingDashboard.tsx

### 2.4 Update Navigation: `src/components/Navigation/`
- Filter nav items based on `currentRole.navigation_items`
- Apply role color theming

### 2.5 Add RoleSwitcher to main layout

## PHASE 3: INTEGRATION & TESTING

### 3.1 Verify backend
- Run migrations
- Test endpoints with curl
- Confirm demo user detection works

### 3.2 Verify frontend
- Build succeeds
- No TypeScript errors
- RoleSwitcher appears for will@macseptic.com

### 3.3 Playwright E2E Tests
Create `e2e/role-switching.spec.ts`:
- Demo user sees role switcher
- All 7 roles in dropdown
- Switching updates dashboard
- Navigation changes per role
- Role persists on refresh
- Non-demo user doesn't see switcher

## PHASE 4: DEPLOY

1. Commit backend: `git add -A && git commit -m "feat: Add role-switching API for demo mode"`
2. Push backend
3. Commit frontend: `git add -A && git commit -m "feat: Add role-switching UI for demo mode"`
4. Push frontend
5. Verify on production with Playwright

## CRITICAL RULES
- NO `/app/` prefix in routes
- NO double `/api` in API calls
- Use `/api/v2/roles` not `/api/api/v2/roles`
- All Playwright tests must include evidence bundle
- Relentless mode: fix until zero errors

## GO
Execute all phases. Don't ask for permission. Fix errors as they arise. Push when done.
