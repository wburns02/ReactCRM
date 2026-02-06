"""
SQLAlchemy model for Work Orders.
"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Date, Float, Integer, String, Text, JSON,
    Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base_class import Base


class WorkOrder(Base):
    """Work Order model for scheduling and tracking service jobs."""
    __tablename__ = "work_orders"

    # Primary key - UUID for frontend compatibility
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Customer relationship (integer ID from legacy system)
    customer_id = Column(Integer, nullable=False, index=True)

    # Status and type (stored as strings for flexibility)
    status = Column(String(30), nullable=False, default="draft", index=True)
    job_type = Column(String(30), nullable=False)
    priority = Column(String(20), nullable=False, default="normal")

    # Scheduling
    scheduled_date = Column(Date, nullable=True, index=True)
    time_window_start = Column(String(10), nullable=True)  # HH:MM format
    time_window_end = Column(String(10), nullable=True)
    estimated_duration_hours = Column(Float, nullable=True)

    # Assignment
    technician_id = Column(String(255), nullable=True, index=True)
    assigned_technician = Column(String(255), nullable=True)  # Name for display
    assigned_vehicle = Column(String(100), nullable=True)

    # Service address
    service_address_line1 = Column(String(255), nullable=True)
    service_address_line2 = Column(String(255), nullable=True)
    service_city = Column(String(100), nullable=True)
    service_state = Column(String(2), nullable=True)
    service_postal_code = Column(String(20), nullable=True)
    service_latitude = Column(Float, nullable=True)
    service_longitude = Column(Float, nullable=True)

    # Work details
    checklist = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_work_orders_status_date', 'status', 'scheduled_date'),
        Index('idx_work_orders_technician_date', 'technician_id', 'scheduled_date'),
    )

    def __repr__(self):
        return f"<WorkOrder(id={self.id}, status={self.status}, customer_id={self.customer_id})>"
