"""
Role API endpoints for demo mode role switching.
Only active for demo users (will@macseptic.com).
"""
import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_active_user, User
from app.schemas.role import (
    RoleView, RoleListResponse, RoleSwitchRequest, RoleSwitchResponse,
    CurrentRoleResponse, DemoModeStatusResponse, RoleKey
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Demo user email
DEMO_USER_EMAIL = "will@macseptic.com"

# In-memory storage for current role per user (demo only, resets on restart)
_user_roles: dict[str, RoleKey] = {}

# Define all role configurations (hardcoded for demo)
ROLE_DEFINITIONS: list[RoleView] = [
    RoleView(
        id=1,
        role_key="admin",
        display_name="Administrator",
        description="Full system access with all administrative capabilities",
        icon="crown",
        color="#8B5CF6",
        visible_modules=[
            "dashboard", "customers", "prospects", "work-orders", "schedule",
            "technicians", "dispatch", "sms", "email", "phone", "billing",
            "invoicing", "payments", "reports", "analytics", "operations",
            "permits", "compliance", "marketing", "reviews", "ads",
            "enterprise", "admin", "settings", "users"
        ],
        default_route="/dashboard",
        dashboard_widgets=["stats", "revenue", "recent-calls", "work-orders", "team-performance", "customer-satisfaction"],
        quick_actions=["new-customer", "new-work-order", "new-invoice", "send-sms"],
        features={
            "can_manage_users": True,
            "can_view_reports": True,
            "can_edit_settings": True,
            "can_manage_billing": True,
            "can_view_all_customers": True,
            "can_delete_records": True,
            "can_export_data": True
        },
        is_active=True,
        sort_order=1
    ),
    RoleView(
        id=2,
        role_key="executive",
        display_name="Executive",
        description="High-level KPIs and business analytics",
        icon="chart-bar",
        color="#3B82F6",
        visible_modules=[
            "dashboard", "reports", "analytics", "enterprise", "customers"
        ],
        default_route="/dashboard",
        dashboard_widgets=["revenue", "kpis", "trends", "customer-satisfaction", "team-performance"],
        quick_actions=["view-reports", "export-data"],
        features={
            "can_manage_users": False,
            "can_view_reports": True,
            "can_edit_settings": False,
            "can_manage_billing": False,
            "can_view_all_customers": True,
            "can_delete_records": False,
            "can_export_data": True
        },
        is_active=True,
        sort_order=2
    ),
    RoleView(
        id=3,
        role_key="manager",
        display_name="Operations Manager",
        description="Day-to-day operations management",
        icon="clipboard",
        color="#10B981",
        visible_modules=[
            "dashboard", "customers", "work-orders", "schedule", "technicians",
            "dispatch", "reports", "operations"
        ],
        default_route="/dashboard",
        dashboard_widgets=["stats", "work-orders", "schedule-today", "team-status"],
        quick_actions=["new-work-order", "assign-technician", "view-schedule"],
        features={
            "can_manage_users": False,
            "can_view_reports": True,
            "can_edit_settings": False,
            "can_manage_billing": False,
            "can_view_all_customers": True,
            "can_delete_records": False,
            "can_export_data": True
        },
        is_active=True,
        sort_order=3
    ),
    RoleView(
        id=4,
        role_key="technician",
        display_name="Field Technician",
        description="Mobile work order management for field service",
        icon="wrench",
        color="#F59E0B",
        visible_modules=["field", "work-orders", "schedule"],
        default_route="/field",
        dashboard_widgets=["my-jobs-today", "route-map", "time-tracking"],
        quick_actions=["start-job", "complete-job", "add-photos", "capture-signature"],
        features={
            "can_manage_users": False,
            "can_view_reports": False,
            "can_edit_settings": False,
            "can_manage_billing": False,
            "can_view_all_customers": False,
            "can_delete_records": False,
            "can_export_data": False
        },
        is_active=True,
        sort_order=4
    ),
    RoleView(
        id=5,
        role_key="phone_agent",
        display_name="Phone Agent",
        description="Customer service and call handling",
        icon="phone",
        color="#06B6D4",
        visible_modules=["dashboard", "customers", "work-orders", "sms", "phone"],
        default_route="/dashboard",
        dashboard_widgets=["call-queue", "recent-calls", "customer-lookup"],
        quick_actions=["new-customer", "new-work-order", "send-sms", "log-call"],
        features={
            "can_manage_users": False,
            "can_view_reports": False,
            "can_edit_settings": False,
            "can_manage_billing": False,
            "can_view_all_customers": True,
            "can_delete_records": False,
            "can_export_data": False
        },
        is_active=True,
        sort_order=5
    ),
    RoleView(
        id=6,
        role_key="dispatcher",
        display_name="Dispatcher",
        description="Schedule and route management",
        icon="map",
        color="#EF4444",
        visible_modules=["dashboard", "work-orders", "schedule", "dispatch", "technicians"],
        default_route="/dispatch",
        dashboard_widgets=["dispatch-board", "route-map", "technician-status", "unassigned-jobs"],
        quick_actions=["assign-job", "reschedule", "view-routes", "send-notification"],
        features={
            "can_manage_users": False,
            "can_view_reports": False,
            "can_edit_settings": False,
            "can_manage_billing": False,
            "can_view_all_customers": True,
            "can_delete_records": False,
            "can_export_data": False
        },
        is_active=True,
        sort_order=6
    ),
    RoleView(
        id=7,
        role_key="billing",
        display_name="Billing Specialist",
        description="Invoicing and payment management",
        icon="dollar-sign",
        color="#8B5CF6",
        visible_modules=["dashboard", "customers", "billing", "invoicing", "payments", "reports"],
        default_route="/billing",
        dashboard_widgets=["outstanding-invoices", "payments-today", "aging-report", "revenue"],
        quick_actions=["new-invoice", "send-reminder", "process-payment", "generate-statement"],
        features={
            "can_manage_users": False,
            "can_view_reports": True,
            "can_edit_settings": False,
            "can_manage_billing": True,
            "can_view_all_customers": True,
            "can_delete_records": False,
            "can_export_data": True
        },
        is_active=True,
        sort_order=7
    ),
]


def get_role_by_key(role_key: RoleKey) -> Optional[RoleView]:
    """Get role definition by key."""
    return next((r for r in ROLE_DEFINITIONS if r.role_key == role_key), None)


def is_demo_user(user: User) -> bool:
    """Check if user is the demo user."""
    return user.email == DEMO_USER_EMAIL


@router.get("", response_model=RoleListResponse)
async def get_roles(current_user: User = Depends(get_current_active_user)):
    """
    Get available roles for demo user.
    Returns empty roles list for non-demo users.
    """
    if not is_demo_user(current_user):
        return RoleListResponse(roles=[], current_role=None, is_demo_user=False)

    current = _user_roles.get(current_user.email, "admin")
    return RoleListResponse(
        roles=ROLE_DEFINITIONS,
        current_role=current,
        is_demo_user=True
    )


@router.post("/switch", response_model=RoleSwitchResponse)
async def switch_role(
    request: RoleSwitchRequest,
    current_user: User = Depends(get_current_active_user)
):
    """
    Switch user role (demo only).
    Non-demo users will receive a 403 Forbidden.
    """
    if not is_demo_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role switching only available for demo users"
        )

    role = get_role_by_key(request.role_key)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {request.role_key}"
        )

    _user_roles[current_user.email] = request.role_key
    logger.info(f"Demo user {current_user.email} switched to role: {request.role_key}")

    return RoleSwitchResponse(
        success=True,
        message=f"Switched to {role.display_name}",
        current_role=role,
        switched_at=datetime.utcnow().isoformat()
    )


@router.get("/current", response_model=CurrentRoleResponse)
async def get_current_role(current_user: User = Depends(get_current_active_user)):
    """Get current role configuration for the user."""
    role_key = _user_roles.get(current_user.email, "admin")
    role = get_role_by_key(role_key)

    return CurrentRoleResponse(
        role=role or ROLE_DEFINITIONS[0],
        is_demo_user=is_demo_user(current_user),
        user_email=current_user.email,
        switched_at=None
    )


@router.get("/status", response_model=DemoModeStatusResponse)
async def get_demo_status(current_user: User = Depends(get_current_active_user)):
    """Get demo mode status for the current user."""
    is_demo = is_demo_user(current_user)

    return DemoModeStatusResponse(
        is_demo_mode=is_demo,
        demo_user_email=current_user.email if is_demo else None,
        available_roles=[r.role_key for r in ROLE_DEFINITIONS] if is_demo else None,
        current_role=_user_roles.get(current_user.email, "admin") if is_demo else None
    )
