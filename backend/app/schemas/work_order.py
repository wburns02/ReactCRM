"""
Pydantic schemas for Work Order API endpoints.
"""
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field

# Status literals matching frontend
WorkOrderStatus = Literal[
    "draft", "scheduled", "confirmed", "enroute", "on_site",
    "in_progress", "completed", "canceled", "requires_followup"
]

JobType = Literal[
    "pumping", "inspection", "repair", "installation",
    "emergency", "maintenance", "grease_trap", "camera_inspection"
]

Priority = Literal["low", "normal", "high", "urgent", "emergency"]


class CustomerSummary(BaseModel):
    """Embedded customer info for work order responses."""
    id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None


class WorkOrderBase(BaseModel):
    """Base work order fields."""
    customer_id: int = Field(..., description="Customer ID")
    job_type: JobType
    status: WorkOrderStatus = "draft"
    priority: Priority = "normal"

    # Scheduling
    scheduled_date: Optional[str] = Field(None, description="YYYY-MM-DD")
    time_window_start: Optional[str] = Field(None, description="HH:MM")
    time_window_end: Optional[str] = Field(None, description="HH:MM")
    estimated_duration_hours: Optional[float] = Field(None, ge=0)

    # Assignment
    assigned_technician: Optional[str] = None
    assigned_vehicle: Optional[str] = None

    # Service address
    service_address_line1: Optional[str] = None
    service_address_line2: Optional[str] = None
    service_city: Optional[str] = None
    service_state: Optional[str] = Field(None, max_length=2)
    service_postal_code: Optional[str] = None

    # Work details
    notes: Optional[str] = None


class WorkOrderCreate(WorkOrderBase):
    """Schema for creating a work order."""
    pass


class WorkOrderUpdate(BaseModel):
    """Schema for updating a work order (all fields optional for PATCH)."""
    customer_id: Optional[int] = None
    job_type: Optional[JobType] = None
    status: Optional[WorkOrderStatus] = None
    priority: Optional[Priority] = None
    scheduled_date: Optional[str] = None
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    estimated_duration_hours: Optional[float] = None
    assigned_technician: Optional[str] = None
    assigned_vehicle: Optional[str] = None
    service_address_line1: Optional[str] = None
    service_address_line2: Optional[str] = None
    service_city: Optional[str] = None
    service_state: Optional[str] = None
    service_postal_code: Optional[str] = None
    notes: Optional[str] = None


class WorkOrderResponse(BaseModel):
    """Full work order response matching frontend WorkOrder type."""
    id: str  # UUID as string for frontend
    customer_id: str
    customer_name: Optional[str] = None
    customer: Optional[CustomerSummary] = None

    status: WorkOrderStatus
    job_type: JobType
    priority: Priority

    scheduled_date: Optional[str] = None
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    estimated_duration_hours: Optional[float] = None

    technician_id: Optional[str] = None
    assigned_technician: Optional[str] = None
    assigned_vehicle: Optional[str] = None

    service_address_line1: Optional[str] = None
    service_address_line2: Optional[str] = None
    service_city: Optional[str] = None
    service_state: Optional[str] = None
    service_postal_code: Optional[str] = None
    service_latitude: Optional[float] = None
    service_longitude: Optional[float] = None

    checklist: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None

    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class WorkOrderListResponse(BaseModel):
    """Paginated work order list response."""
    items: List[WorkOrderResponse]
    total: int
    page: int
    page_size: int
