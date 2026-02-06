"""
Pydantic schemas for availability API.
"""
from datetime import date
from typing import List, Optional
from pydantic import BaseModel, Field


class TimeWindow(BaseModel):
    """A time window with availability status."""
    start: str = Field(..., description="Start time in HH:MM format", examples=["08:00"])
    end: str = Field(..., description="End time in HH:MM format", examples=["12:00"])
    available: bool = Field(..., description="Whether this time window is available")
    slots_remaining: int = Field(default=1, description="Number of available slots in this window")


class DayAvailability(BaseModel):
    """Availability for a single day."""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    day_name: str = Field(..., description="Day of the week (Monday, Tuesday, etc.)")
    is_weekend: bool = Field(default=False, description="Whether this is a weekend day")
    available: bool = Field(..., description="Whether any slots are available this day")
    time_windows: List[TimeWindow] = Field(default_factory=list, description="Available time windows")


class AvailabilityResponse(BaseModel):
    """Response containing availability slots."""
    slots: List[DayAvailability] = Field(default_factory=list, description="Available days and time windows")
    start_date: str = Field(..., description="Start of date range")
    end_date: str = Field(..., description="End of date range")
    total_available_days: int = Field(default=0, description="Total number of days with availability")


class AvailabilityQuery(BaseModel):
    """Query parameters for availability lookup."""
    start_date: str = Field(..., description="Start date in YYYY-MM-DD format")
    end_date: Optional[str] = Field(None, description="End date in YYYY-MM-DD format (default: start_date + 7 days)")
    service_type: Optional[str] = Field(None, description="Filter by service type (pumping, inspection, etc.)")
