"""
SQLAlchemy models for Payroll system.
Includes PayrollPeriod, TimeEntry, Commission, and TechnicianPayRate.
"""
import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, DateTime, Date, Float, Integer, String, Text, Boolean, Index, ForeignKey
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.database.base_class import Base


class PayrollPeriod(Base):
    """Payroll period for tracking pay cycles."""
    __tablename__ = "payroll_periods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    period_type = Column(String(20), nullable=False, default="biweekly")  # weekly, biweekly, monthly
    status = Column(String(20), nullable=False, default="draft")  # draft, processing, approved, paid

    # Totals (calculated)
    total_hours = Column(Float, default=0.0)
    total_regular_hours = Column(Float, default=0.0)
    total_overtime_hours = Column(Float, default=0.0)
    total_gross_pay = Column(Float, default=0.0)
    total_commissions = Column(Float, default=0.0)
    total_deductions = Column(Float, default=0.0)
    total_net_pay = Column(Float, default=0.0)
    technician_count = Column(Integer, default=0)

    # Approval
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(String(255), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_payroll_periods_dates', 'start_date', 'end_date'),
        Index('idx_payroll_periods_status', 'status'),
    )


class TimeEntry(Base):
    """Time entry for tracking technician work hours."""
    __tablename__ = "time_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    technician_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    payroll_period_id = Column(UUID(as_uuid=True), ForeignKey('payroll_periods.id'), nullable=True)
    work_order_id = Column(String(50), nullable=True)

    date = Column(Date, nullable=False)
    clock_in = Column(DateTime(timezone=True), nullable=False)
    clock_out = Column(DateTime(timezone=True), nullable=True)

    regular_hours = Column(Float, default=0.0)
    overtime_hours = Column(Float, default=0.0)
    break_minutes = Column(Integer, default=0)

    status = Column(String(20), default="pending")  # pending, approved, rejected
    notes = Column(Text, nullable=True)

    # GPS coordinates
    clock_in_latitude = Column(Float, nullable=True)
    clock_in_longitude = Column(Float, nullable=True)
    clock_out_latitude = Column(Float, nullable=True)
    clock_out_longitude = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_time_entries_technician_date', 'technician_id', 'date'),
        Index('idx_time_entries_period', 'payroll_period_id'),
    )


class Commission(Base):
    """Commission record for technician earnings."""
    __tablename__ = "commissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    technician_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    payroll_period_id = Column(UUID(as_uuid=True), ForeignKey('payroll_periods.id'), nullable=True)
    work_order_id = Column(String(50), nullable=True)

    job_total = Column(Float, nullable=False)
    commission_rate = Column(Float, nullable=False)  # Decimal 0-1 (e.g., 0.20 = 20%)
    commission_amount = Column(Float, nullable=False)

    status = Column(String(20), default="pending")  # pending, approved, paid
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_commissions_technician', 'technician_id'),
        Index('idx_commissions_period', 'payroll_period_id'),
    )


class TechnicianPayRate(Base):
    """Pay rate configuration for technicians."""
    __tablename__ = "technician_pay_rates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    technician_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    pay_type = Column(String(20), nullable=False)  # hourly, salary
    hourly_rate = Column(Float, nullable=True)
    overtime_rate = Column(Float, nullable=True)
    salary_amount = Column(Float, nullable=True)  # Annual salary
    commission_rate = Column(Float, default=0.0)  # Decimal 0-1

    effective_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)  # Null means currently active
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        Index('idx_pay_rates_technician_active', 'technician_id', 'is_active'),
        Index('idx_pay_rates_effective', 'effective_date'),
    )
