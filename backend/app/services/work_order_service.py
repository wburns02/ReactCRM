"""
Work Order service layer for business logic.
"""
import logging
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import date
from sqlalchemy.orm import Session

from app.models.work_order import WorkOrder
from app.schemas.work_order import WorkOrderCreate, WorkOrderUpdate

logger = logging.getLogger(__name__)


class WorkOrderService:
    """Service class for work order operations."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, data: WorkOrderCreate) -> WorkOrder:
        """Create a new work order."""
        work_order = WorkOrder(
            customer_id=data.customer_id,
            status=data.status,
            job_type=data.job_type,
            priority=data.priority,
            scheduled_date=date.fromisoformat(data.scheduled_date) if data.scheduled_date else None,
            time_window_start=data.time_window_start,
            time_window_end=data.time_window_end,
            estimated_duration_hours=data.estimated_duration_hours,
            assigned_technician=data.assigned_technician,
            assigned_vehicle=data.assigned_vehicle,
            service_address_line1=data.service_address_line1,
            service_address_line2=data.service_address_line2,
            service_city=data.service_city,
            service_state=data.service_state,
            service_postal_code=data.service_postal_code,
            notes=data.notes
        )

        self.db.add(work_order)
        self.db.commit()
        self.db.refresh(work_order)

        logger.info(f"Created work order {work_order.id} for customer {data.customer_id}")
        return work_order

    def get_by_id(self, work_order_id: UUID) -> Optional[WorkOrder]:
        """Get work order by ID."""
        return self.db.query(WorkOrder).filter(WorkOrder.id == work_order_id).first()

    def list(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        scheduled_date: Optional[str] = None,
        customer_id: Optional[int] = None
    ) -> Tuple[List[WorkOrder], int]:
        """List work orders with filtering and pagination."""
        query = self.db.query(WorkOrder)

        # Apply filters
        if status:
            # Support comma-separated status values
            statuses = [s.strip() for s in status.split(",")]
            query = query.filter(WorkOrder.status.in_(statuses))

        if scheduled_date:
            query = query.filter(WorkOrder.scheduled_date == date.fromisoformat(scheduled_date))

        if customer_id:
            query = query.filter(WorkOrder.customer_id == customer_id)

        # Get total count
        total = query.count()

        # Apply pagination
        offset = (page - 1) * page_size
        work_orders = query.order_by(WorkOrder.created_at.desc()).offset(offset).limit(page_size).all()

        return work_orders, total

    def update(self, work_order_id: UUID, data: WorkOrderUpdate) -> Optional[WorkOrder]:
        """Update a work order with partial data."""
        work_order = self.get_by_id(work_order_id)
        if not work_order:
            return None

        update_data = data.model_dump(exclude_unset=True)

        # Handle date conversion
        if "scheduled_date" in update_data:
            val = update_data["scheduled_date"]
            update_data["scheduled_date"] = date.fromisoformat(val) if val else None

        for field, value in update_data.items():
            setattr(work_order, field, value)

        self.db.commit()
        self.db.refresh(work_order)

        logger.info(f"Updated work order {work_order_id}")
        return work_order

    def delete(self, work_order_id: UUID) -> bool:
        """Delete a work order."""
        work_order = self.get_by_id(work_order_id)
        if not work_order:
            return False

        self.db.delete(work_order)
        self.db.commit()

        logger.info(f"Deleted work order {work_order_id}")
        return True


def get_work_order_service(db: Session) -> WorkOrderService:
    """Factory function for dependency injection."""
    return WorkOrderService(db)
