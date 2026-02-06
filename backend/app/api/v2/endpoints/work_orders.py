"""
Work Order API endpoints.
Full CRUD for work order management.
"""
import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query

from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_active_user, User
from app.schemas.work_order import (
    WorkOrderCreate, WorkOrderUpdate, WorkOrderResponse, WorkOrderListResponse
)
from app.services.work_order_service import get_work_order_service

logger = logging.getLogger(__name__)
router = APIRouter()


def _to_response(work_order) -> WorkOrderResponse:
    """Convert WorkOrder model to response schema."""
    return WorkOrderResponse(
        id=str(work_order.id),
        customer_id=str(work_order.customer_id),
        customer_name=None,  # TODO: Join with customers table when available
        status=work_order.status,
        job_type=work_order.job_type,
        priority=work_order.priority,
        scheduled_date=work_order.scheduled_date.isoformat() if work_order.scheduled_date else None,
        time_window_start=work_order.time_window_start,
        time_window_end=work_order.time_window_end,
        estimated_duration_hours=work_order.estimated_duration_hours,
        technician_id=work_order.technician_id,
        assigned_technician=work_order.assigned_technician,
        assigned_vehicle=work_order.assigned_vehicle,
        service_address_line1=work_order.service_address_line1,
        service_address_line2=work_order.service_address_line2,
        service_city=work_order.service_city,
        service_state=work_order.service_state,
        service_postal_code=work_order.service_postal_code,
        service_latitude=work_order.service_latitude,
        service_longitude=work_order.service_longitude,
        checklist=work_order.checklist,
        notes=work_order.notes,
        created_at=work_order.created_at.isoformat() if work_order.created_at else None,
        updated_at=work_order.updated_at.isoformat() if work_order.updated_at else None
    )


@router.post("", response_model=WorkOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_work_order(
    data: WorkOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new work order."""
    try:
        service = get_work_order_service(db)
        work_order = service.create(data)
        logger.info(f"User {current_user.id} created work order {work_order.id}")
        return _to_response(work_order)
    except ValueError as e:
        logger.error(f"Validation error creating work order: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create work order: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create work order"
        )


@router.get("", response_model=WorkOrderListResponse)
async def list_work_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    status: Optional[str] = Query(None, description="Filter by status (comma-separated)"),
    scheduled_date: Optional[str] = Query(None, description="Filter by date YYYY-MM-DD"),
    customer_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List work orders with pagination and filtering."""
    try:
        service = get_work_order_service(db)
        work_orders, total = service.list(
            page=page,
            page_size=page_size,
            status=status,
            scheduled_date=scheduled_date,
            customer_id=customer_id
        )

        return WorkOrderListResponse(
            items=[_to_response(wo) for wo in work_orders],
            total=total,
            page=page,
            page_size=page_size
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to list work orders: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list work orders"
        )


@router.get("/{work_order_id}", response_model=WorkOrderResponse)
async def get_work_order(
    work_order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a single work order by ID."""
    service = get_work_order_service(db)
    work_order = service.get_by_id(work_order_id)

    if not work_order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Work order {work_order_id} not found"
        )

    return _to_response(work_order)


@router.patch("/{work_order_id}", response_model=WorkOrderResponse)
async def update_work_order(
    work_order_id: UUID,
    data: WorkOrderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a work order (partial update)."""
    try:
        service = get_work_order_service(db)
        work_order = service.update(work_order_id, data)

        if not work_order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Work order {work_order_id} not found"
            )

        logger.info(f"User {current_user.id} updated work order {work_order_id}")
        return _to_response(work_order)
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update work order {work_order_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update work order"
        )


@router.delete("/{work_order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_work_order(
    work_order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a work order."""
    service = get_work_order_service(db)
    deleted = service.delete(work_order_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Work order {work_order_id} not found"
        )

    logger.info(f"User {current_user.id} deleted work order {work_order_id}")
    return None
