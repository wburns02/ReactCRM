"""
Pydantic schemas for Payroll API.
"""
from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ============ Payroll Period Schemas ============

class PayrollPeriodBase(BaseModel):
    start_date: date
    end_date: date
    period_type: str = "biweekly"


class PayrollPeriodCreate(PayrollPeriodBase):
    pass


class PayrollPeriodUpdate(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None


class PayrollPeriodResponse(PayrollPeriodBase):
    id: str
    status: str
    total_hours: float
    total_regular_hours: float
    total_overtime_hours: float
    total_gross_pay: float
    total_commissions: float
    total_deductions: float
    total_net_pay: float
    technician_count: int
    created_at: datetime
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None

    class Config:
        from_attributes = True


class PayrollPeriodListResponse(BaseModel):
    periods: List[PayrollPeriodResponse]


# ============ Time Entry Schemas ============

class TimeEntryBase(BaseModel):
    technician_id: str
    date: date
    clock_in: datetime
    clock_out: Optional[datetime] = None
    notes: Optional[str] = None


class TimeEntryCreate(BaseModel):
    technician_id: str
    entry_date: Optional[date] = None
    clock_in: datetime
    clock_out: Optional[datetime] = None
    notes: Optional[str] = None
    payroll_period_id: Optional[str] = None


class TimeEntryUpdate(BaseModel):
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class TimeEntryResponse(BaseModel):
    id: str
    technician_id: str
    technician_name: Optional[str] = None
    payroll_period_id: Optional[str] = None
    work_order_id: Optional[str] = None
    date: date
    clock_in: datetime
    clock_out: Optional[datetime] = None
    regular_hours: float
    overtime_hours: float
    break_minutes: int
    status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TimeEntryListResponse(BaseModel):
    entries: List[TimeEntryResponse]


# ============ Commission Schemas ============

class CommissionBase(BaseModel):
    technician_id: str
    work_order_id: Optional[str] = None
    job_total: float
    commission_rate: float


class CommissionCreate(CommissionBase):
    payroll_period_id: Optional[str] = None


class CommissionUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class CommissionResponse(BaseModel):
    id: str
    technician_id: str
    technician_name: Optional[str] = None
    payroll_period_id: Optional[str] = None
    work_order_id: Optional[str] = None
    job_total: float
    commission_rate: float
    commission_amount: float
    status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CommissionListResponse(BaseModel):
    commissions: List[CommissionResponse]


# ============ Pay Rate Schemas ============

class PayRateBase(BaseModel):
    technician_id: str
    pay_type: str  # "hourly" or "salary"
    hourly_rate: Optional[float] = None
    overtime_rate: Optional[float] = None
    salary_amount: Optional[float] = None
    commission_rate: float = 0.0
    effective_date: date
    is_active: bool = True


class PayRateCreate(PayRateBase):
    pass


class PayRateUpdate(BaseModel):
    pay_type: Optional[str] = None
    hourly_rate: Optional[float] = None
    overtime_rate: Optional[float] = None
    salary_amount: Optional[float] = None
    commission_rate: Optional[float] = None
    effective_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class PayRateResponse(BaseModel):
    id: str
    technician_id: str
    technician_name: Optional[str] = None
    pay_type: str
    hourly_rate: Optional[float] = None
    overtime_rate: Optional[float] = None
    salary_amount: Optional[float] = None
    commission_rate: float
    effective_date: date
    end_date: Optional[date] = None
    is_active: bool

    class Config:
        from_attributes = True


class PayRateListResponse(BaseModel):
    rates: List[PayRateResponse]


# ============ Payroll Summary Schema ============

class PayrollSummaryResponse(BaseModel):
    technician_id: str
    technician_name: str
    regular_hours: float
    overtime_hours: float
    gross_pay: float
    total_commissions: float
    deductions: float
    net_pay: float
