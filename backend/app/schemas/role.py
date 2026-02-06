"""
Pydantic schemas for Role API endpoints.
Demo feature for role switching (only active for will@macseptic.com).
"""
from typing import Optional, List, Dict, Literal
from pydantic import BaseModel, Field

# Role key literals matching frontend
RoleKey = Literal["admin", "executive", "manager", "technician", "phone_agent", "dispatcher", "billing"]


class RoleView(BaseModel):
    """Full role configuration for UI rendering."""
    id: int
    role_key: RoleKey
    display_name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    visible_modules: List[str] = []
    default_route: str = "/dashboard"
    dashboard_widgets: List[str] = []
    quick_actions: List[str] = []
    features: Dict[str, bool] = {}
    is_active: bool = True
    sort_order: int = 0


class RoleListResponse(BaseModel):
    """Response for GET /roles endpoint."""
    roles: List[RoleView]
    current_role: Optional[RoleKey] = None
    is_demo_user: bool = False


class RoleSwitchRequest(BaseModel):
    """Request body for POST /roles/switch."""
    role_key: RoleKey


class RoleSwitchResponse(BaseModel):
    """Response for POST /roles/switch."""
    success: bool
    message: str
    current_role: RoleView
    switched_at: str  # ISO datetime string


class CurrentRoleResponse(BaseModel):
    """Response for GET /roles/current."""
    role: RoleView
    is_demo_user: bool
    user_email: str
    switched_at: Optional[str] = None


class DemoModeStatusResponse(BaseModel):
    """Response for GET /roles/status."""
    is_demo_mode: bool
    demo_user_email: Optional[str] = None
    available_roles: Optional[List[str]] = None
    current_role: Optional[str] = None
