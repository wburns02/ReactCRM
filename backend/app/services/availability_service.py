"""
Availability service for calculating available time slots based on work orders.
"""
import logging
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models.work_order import WorkOrder
from app.schemas.availability import (
    AvailabilityResponse,
    DayAvailability,
    TimeWindow
)

logger = logging.getLogger(__name__)

# Business hours configuration
BUSINESS_START = "08:00"
BUSINESS_END = "17:00"
MORNING_END = "12:00"
AFTERNOON_START = "12:00"

# Maximum concurrent jobs (technicians available)
MAX_CONCURRENT_JOBS = 3  # Adjust based on team size

# Standard time windows
STANDARD_WINDOWS = [
    {"start": "08:00", "end": "12:00", "name": "morning"},
    {"start": "12:00", "end": "17:00", "name": "afternoon"},
]


class AvailabilityService:
    """Service for calculating scheduling availability."""

    def __init__(self, db: Session):
        self.db = db

    def get_availability(
        self,
        start_date: date,
        end_date: Optional[date] = None,
        service_type: Optional[str] = None
    ) -> AvailabilityResponse:
        """
        Get available time slots for a date range.

        Args:
            start_date: Start of date range
            end_date: End of date range (default: start_date + 7 days)
            service_type: Optional filter by service type

        Returns:
            AvailabilityResponse with available slots
        """
        if end_date is None:
            end_date = start_date + timedelta(days=7)

        # Don't allow queries more than 30 days out
        max_end = start_date + timedelta(days=30)
        if end_date > max_end:
            end_date = max_end

        # Get all scheduled work orders in the date range
        busy_times = self._get_busy_times(start_date, end_date, service_type)

        # Calculate availability for each day
        slots: List[DayAvailability] = []
        total_available = 0
        current = start_date

        while current <= end_date:
            day_availability = self._calculate_day_availability(current, busy_times)
            slots.append(day_availability)
            if day_availability.available:
                total_available += 1
            current += timedelta(days=1)

        return AvailabilityResponse(
            slots=slots,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            total_available_days=total_available
        )

    def _get_busy_times(
        self,
        start_date: date,
        end_date: date,
        service_type: Optional[str] = None
    ) -> Dict[str, List[Dict]]:
        """
        Get busy time windows from scheduled work orders.

        Returns dict mapping date strings to list of busy time windows.
        """
        # Query work orders that are scheduled, confirmed, or in progress
        active_statuses = ["scheduled", "confirmed", "enroute", "on_site", "in_progress"]

        query = self.db.query(WorkOrder).filter(
            and_(
                WorkOrder.scheduled_date >= start_date,
                WorkOrder.scheduled_date <= end_date,
                WorkOrder.status.in_(active_statuses)
            )
        )

        if service_type:
            query = query.filter(WorkOrder.job_type == service_type)

        work_orders = query.all()

        # Group by date
        busy_by_date: Dict[str, List[Dict]] = {}
        for wo in work_orders:
            if wo.scheduled_date:
                date_str = wo.scheduled_date.isoformat()
                if date_str not in busy_by_date:
                    busy_by_date[date_str] = []
                busy_by_date[date_str].append({
                    "start": wo.time_window_start or BUSINESS_START,
                    "end": wo.time_window_end or BUSINESS_END,
                    "technician_id": wo.technician_id,
                    "duration": wo.estimated_duration_hours or 2.0
                })

        return busy_by_date

    def _calculate_day_availability(
        self,
        day: date,
        busy_times: Dict[str, List[Dict]]
    ) -> DayAvailability:
        """Calculate availability for a single day."""
        day_str = day.isoformat()
        day_name = day.strftime("%A")
        is_weekend = day.weekday() >= 5  # Saturday = 5, Sunday = 6

        # Weekends are not available (unless emergency)
        if is_weekend:
            return DayAvailability(
                date=day_str,
                day_name=day_name,
                is_weekend=True,
                available=False,
                time_windows=[]
            )

        # Get busy slots for this day
        day_busy = busy_times.get(day_str, [])

        # Calculate availability for each standard time window
        time_windows: List[TimeWindow] = []
        any_available = False

        for window in STANDARD_WINDOWS:
            # Count how many jobs overlap with this window
            overlapping = 0
            for busy in day_busy:
                if self._windows_overlap(window["start"], window["end"], busy["start"], busy["end"]):
                    overlapping += 1

            # Window is available if we have capacity
            slots_remaining = max(0, MAX_CONCURRENT_JOBS - overlapping)
            is_available = slots_remaining > 0

            if is_available:
                any_available = True

            time_windows.append(TimeWindow(
                start=window["start"],
                end=window["end"],
                available=is_available,
                slots_remaining=slots_remaining
            ))

        return DayAvailability(
            date=day_str,
            day_name=day_name,
            is_weekend=False,
            available=any_available,
            time_windows=time_windows
        )

    def _windows_overlap(
        self,
        start1: str,
        end1: str,
        start2: str,
        end2: str
    ) -> bool:
        """Check if two time windows overlap."""
        # Convert HH:MM strings to minutes for comparison
        def to_minutes(time_str: str) -> int:
            h, m = map(int, time_str.split(":"))
            return h * 60 + m

        s1, e1 = to_minutes(start1), to_minutes(end1)
        s2, e2 = to_minutes(start2), to_minutes(end2)

        # Windows overlap if one starts before the other ends
        return s1 < e2 and s2 < e1


def get_availability_service(db: Session) -> AvailabilityService:
    """Factory function for dependency injection."""
    return AvailabilityService(db)
