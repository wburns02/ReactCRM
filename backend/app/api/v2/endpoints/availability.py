"""
Availability API endpoints for scheduling.

Provides available time slots based on current work order schedule.
This is a PUBLIC endpoint - no authentication required for lead form access.
"""
import logging
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.database.base_class import get_db
from app.services.availability_service import AvailabilityService, get_availability_service
from app.schemas.availability import AvailabilityResponse

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/slots", response_model=AvailabilityResponse)
async def get_availability_slots(
    start_date: Optional[str] = Query(
        None,
        description="Start date in YYYY-MM-DD format (default: today)"
    ),
    end_date: Optional[str] = Query(
        None,
        description="End date in YYYY-MM-DD format (default: start_date + 7 days)"
    ),
    service_type: Optional[str] = Query(
        None,
        description="Filter by service type (pumping, inspection, repair, etc.)"
    ),
    db: Session = Depends(get_db)
) -> AvailabilityResponse:
    """
    Get available scheduling slots for the lead capture form.

    Returns available days and time windows (Morning 8am-12pm, Afternoon 12pm-5pm)
    based on current work order schedule.

    This is a PUBLIC endpoint - no authentication required.

    Query Parameters:
    - start_date: Start of date range (default: today)
    - end_date: End of date range (default: start_date + 7 days, max 30 days)
    - service_type: Optional filter by service type

    Returns:
    - slots: List of days with available time windows
    - total_available_days: Count of days with at least one available slot
    """
    # Parse start date (default to today)
    if start_date:
        try:
            parsed_start = date.fromisoformat(start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD.")
    else:
        parsed_start = date.today()

    # Parse end date (default to start + 7 days)
    if end_date:
        try:
            parsed_end = date.fromisoformat(end_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD.")
    else:
        parsed_end = parsed_start + timedelta(days=7)

    # Validate date range
    if parsed_end < parsed_start:
        raise HTTPException(status_code=400, detail="end_date must be after start_date")

    if parsed_start < date.today():
        # Can't book in the past, adjust to today
        parsed_start = date.today()

    # Get availability from service
    service = get_availability_service(db)
    try:
        availability = service.get_availability(
            start_date=parsed_start,
            end_date=parsed_end,
            service_type=service_type
        )
        logger.info(f"Availability request: {parsed_start} to {parsed_end}, found {availability.total_available_days} available days")
        return availability
    except Exception as e:
        logger.error(f"Error getting availability: {e}")
        raise HTTPException(status_code=500, detail="Error calculating availability")


@router.get("/next-available", response_model=AvailabilityResponse)
async def get_next_available_slot(
    service_type: Optional[str] = Query(
        None,
        description="Filter by service type"
    ),
    db: Session = Depends(get_db)
) -> AvailabilityResponse:
    """
    Get the next available slot for quick scheduling.

    Searches up to 14 days ahead to find the next available time window.

    Returns:
    - slots: List containing only days with availability
    - total_available_days: Count of available days found
    """
    service = get_availability_service(db)
    start = date.today()
    end = start + timedelta(days=14)

    try:
        availability = service.get_availability(
            start_date=start,
            end_date=end,
            service_type=service_type
        )

        # Filter to only available days
        available_slots = [slot for slot in availability.slots if slot.available]

        return AvailabilityResponse(
            slots=available_slots[:5],  # Return up to 5 available days
            start_date=start.isoformat(),
            end_date=end.isoformat(),
            total_available_days=len(available_slots)
        )
    except Exception as e:
        logger.error(f"Error getting next available: {e}")
        raise HTTPException(status_code=500, detail="Error finding next available slot")
