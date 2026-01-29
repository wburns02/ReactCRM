"""
Payroll API endpoints.
Full CRUD for payroll periods, time entries, commissions, and pay rates.
"""
import logging
from typing import Optional
from uuid import UUID, uuid4
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query

from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.api.deps import get_db, get_current_active_user, User
from app.models.payroll import PayrollPeriod, TimeEntry, Commission, TechnicianPayRate
from app.schemas.payroll import (
    PayrollPeriodCreate, PayrollPeriodUpdate, PayrollPeriodResponse, PayrollPeriodListResponse,
    TimeEntryCreate, TimeEntryUpdate, TimeEntryResponse, TimeEntryListResponse,
    CommissionCreate, CommissionUpdate, CommissionResponse, CommissionListResponse,
    PayRateCreate, PayRateUpdate, PayRateResponse, PayRateListResponse,
    PayrollSummaryResponse
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ============ Helper to get technician name ============
# In a real app, this would query a technicians table
TECHNICIAN_NAMES = {
    "cf9dd4d5-2a75-44cd-8dd3-d8a13416b65c": "Chris Williams",
    "fe2440c6-2308-4625-ad38-b1933aa0034c": "David Martinez",
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890": "Jake Thompson",
    "b2c3d4e5-f6a7-8901-bcde-f12345678901": "Marcus Rodriguez",
    "c3d4e5f6-a7b8-9012-cdef-123456789012": "Sarah Chen",
}

def get_technician_name(technician_id: str) -> str:
    """Get technician name from ID."""
    return TECHNICIAN_NAMES.get(technician_id, f"Technician {technician_id[:8]}")


# ============ Payroll Periods ============

@router.get("/periods", response_model=PayrollPeriodListResponse)
async def list_periods(
    status: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List all payroll periods."""
    try:
        query = db.query(PayrollPeriod)
        if status:
            query = query.filter(PayrollPeriod.status == status)
        if year:
            query = query.filter(
                PayrollPeriod.start_date >= date(year, 1, 1),
                PayrollPeriod.start_date <= date(year, 12, 31)
            )
        periods = query.order_by(PayrollPeriod.start_date.desc()).all()

        return PayrollPeriodListResponse(periods=[
            PayrollPeriodResponse(
                id=str(p.id),
                start_date=p.start_date,
                end_date=p.end_date,
                period_type=p.period_type,
                status=p.status,
                total_hours=p.total_hours or 0,
                total_regular_hours=p.total_regular_hours or 0,
                total_overtime_hours=p.total_overtime_hours or 0,
                total_gross_pay=p.total_gross_pay or 0,
                total_commissions=p.total_commissions or 0,
                total_deductions=p.total_deductions or 0,
                total_net_pay=p.total_net_pay or 0,
                technician_count=p.technician_count or 0,
                created_at=p.created_at,
                approved_at=p.approved_at,
                approved_by=p.approved_by
            ) for p in periods
        ])
    except Exception as e:
        logger.error(f"Error listing periods: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/periods/{period_id}", response_model=PayrollPeriodResponse)
async def get_period(
    period_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific payroll period."""
    try:
        period = db.query(PayrollPeriod).filter(PayrollPeriod.id == UUID(period_id)).first()
        if not period:
            raise HTTPException(status_code=404, detail="Period not found")

        return PayrollPeriodResponse(
            id=str(period.id),
            start_date=period.start_date,
            end_date=period.end_date,
            period_type=period.period_type,
            status=period.status,
            total_hours=period.total_hours or 0,
            total_regular_hours=period.total_regular_hours or 0,
            total_overtime_hours=period.total_overtime_hours or 0,
            total_gross_pay=period.total_gross_pay or 0,
            total_commissions=period.total_commissions or 0,
            total_deductions=period.total_deductions or 0,
            total_net_pay=period.total_net_pay or 0,
            technician_count=period.technician_count or 0,
            created_at=period.created_at,
            approved_at=period.approved_at,
            approved_by=period.approved_by
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting period: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/periods", response_model=PayrollPeriodResponse, status_code=status.HTTP_201_CREATED)
async def create_period(
    data: PayrollPeriodCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new payroll period."""
    try:
        # Check for overlapping periods
        overlapping = db.query(PayrollPeriod).filter(
            and_(
                PayrollPeriod.start_date <= data.end_date,
                PayrollPeriod.end_date >= data.start_date
            )
        ).first()
        if overlapping:
            raise HTTPException(status_code=400, detail="Period overlaps with existing period")

        period = PayrollPeriod(
            start_date=data.start_date,
            end_date=data.end_date,
            period_type=data.period_type,
            status="draft"
        )
        db.add(period)
        db.commit()
        db.refresh(period)

        return PayrollPeriodResponse(
            id=str(period.id),
            start_date=period.start_date,
            end_date=period.end_date,
            period_type=period.period_type,
            status=period.status,
            total_hours=0,
            total_regular_hours=0,
            total_overtime_hours=0,
            total_gross_pay=0,
            total_commissions=0,
            total_deductions=0,
            total_net_pay=0,
            technician_count=0,
            created_at=period.created_at,
            approved_at=None,
            approved_by=None
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating period: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/periods/{period_id}", response_model=PayrollPeriodResponse)
async def update_period(
    period_id: str,
    data: PayrollPeriodUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a payroll period."""
    try:
        period = db.query(PayrollPeriod).filter(PayrollPeriod.id == UUID(period_id)).first()
        if not period:
            raise HTTPException(status_code=404, detail="Period not found")

        if data.start_date:
            period.start_date = data.start_date
        if data.end_date:
            period.end_date = data.end_date
        if data.status:
            period.status = data.status

        db.commit()
        db.refresh(period)

        return PayrollPeriodResponse(
            id=str(period.id),
            start_date=period.start_date,
            end_date=period.end_date,
            period_type=period.period_type,
            status=period.status,
            total_hours=period.total_hours or 0,
            total_regular_hours=period.total_regular_hours or 0,
            total_overtime_hours=period.total_overtime_hours or 0,
            total_gross_pay=period.total_gross_pay or 0,
            total_commissions=period.total_commissions or 0,
            total_deductions=period.total_deductions or 0,
            total_net_pay=period.total_net_pay or 0,
            technician_count=period.technician_count or 0,
            created_at=period.created_at,
            approved_at=period.approved_at,
            approved_by=period.approved_by
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating period: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/periods/{period_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_period(
    period_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a payroll period."""
    try:
        period = db.query(PayrollPeriod).filter(PayrollPeriod.id == UUID(period_id)).first()
        if not period:
            raise HTTPException(status_code=404, detail="Period not found")

        db.delete(period)
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting period: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


# ============ Time Entries ============

@router.get("/time-entries", response_model=TimeEntryListResponse)
async def list_time_entries(
    technician_id: Optional[str] = Query(None),
    payroll_period_id: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List time entries with optional filters."""
    try:
        query = db.query(TimeEntry)
        if technician_id:
            query = query.filter(TimeEntry.technician_id == UUID(technician_id))
        if payroll_period_id:
            query = query.filter(TimeEntry.payroll_period_id == UUID(payroll_period_id))
        if start_date:
            query = query.filter(TimeEntry.date >= start_date)
        if end_date:
            query = query.filter(TimeEntry.date <= end_date)
        if status:
            query = query.filter(TimeEntry.status == status)

        entries = query.order_by(TimeEntry.date.desc()).all()

        return TimeEntryListResponse(entries=[
            TimeEntryResponse(
                id=str(e.id),
                technician_id=str(e.technician_id),
                technician_name=get_technician_name(str(e.technician_id)),
                payroll_period_id=str(e.payroll_period_id) if e.payroll_period_id else None,
                work_order_id=e.work_order_id,
                date=e.date,
                clock_in=e.clock_in,
                clock_out=e.clock_out,
                regular_hours=e.regular_hours or 0,
                overtime_hours=e.overtime_hours or 0,
                break_minutes=e.break_minutes or 0,
                status=e.status,
                notes=e.notes,
                created_at=e.created_at
            ) for e in entries
        ])
    except Exception as e:
        logger.error(f"Error listing time entries: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/time-entries", response_model=TimeEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_time_entry(
    data: TimeEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new time entry."""
    try:
        # Calculate hours
        regular_hours = 0.0
        overtime_hours = 0.0
        if data.clock_out:
            total_hours = (data.clock_out - data.clock_in).total_seconds() / 3600
            regular_hours = min(total_hours, 8.0)
            overtime_hours = max(total_hours - 8.0, 0.0)

        entry = TimeEntry(
            technician_id=UUID(data.technician_id),
            payroll_period_id=UUID(data.payroll_period_id) if data.payroll_period_id else None,
            date=data.entry_date or data.clock_in.date(),
            clock_in=data.clock_in,
            clock_out=data.clock_out,
            regular_hours=regular_hours,
            overtime_hours=overtime_hours,
            status="pending",
            notes=data.notes
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)

        return TimeEntryResponse(
            id=str(entry.id),
            technician_id=str(entry.technician_id),
            technician_name=get_technician_name(str(entry.technician_id)),
            payroll_period_id=str(entry.payroll_period_id) if entry.payroll_period_id else None,
            work_order_id=entry.work_order_id,
            date=entry.date,
            clock_in=entry.clock_in,
            clock_out=entry.clock_out,
            regular_hours=entry.regular_hours or 0,
            overtime_hours=entry.overtime_hours or 0,
            break_minutes=entry.break_minutes or 0,
            status=entry.status,
            notes=entry.notes,
            created_at=entry.created_at
        )
    except Exception as e:
        logger.error(f"Error creating time entry: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/time-entries/{entry_id}", response_model=TimeEntryResponse)
async def update_time_entry(
    entry_id: str,
    data: TimeEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a time entry."""
    try:
        entry = db.query(TimeEntry).filter(TimeEntry.id == UUID(entry_id)).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Time entry not found")

        if data.clock_in:
            entry.clock_in = data.clock_in
        if data.clock_out:
            entry.clock_out = data.clock_out
        if data.notes is not None:
            entry.notes = data.notes
        if data.status:
            entry.status = data.status

        # Recalculate hours
        if entry.clock_out and entry.clock_in:
            total_hours = (entry.clock_out - entry.clock_in).total_seconds() / 3600
            entry.regular_hours = min(total_hours, 8.0)
            entry.overtime_hours = max(total_hours - 8.0, 0.0)

        db.commit()
        db.refresh(entry)

        return TimeEntryResponse(
            id=str(entry.id),
            technician_id=str(entry.technician_id),
            technician_name=get_technician_name(str(entry.technician_id)),
            payroll_period_id=str(entry.payroll_period_id) if entry.payroll_period_id else None,
            work_order_id=entry.work_order_id,
            date=entry.date,
            clock_in=entry.clock_in,
            clock_out=entry.clock_out,
            regular_hours=entry.regular_hours or 0,
            overtime_hours=entry.overtime_hours or 0,
            break_minutes=entry.break_minutes or 0,
            status=entry.status,
            notes=entry.notes,
            created_at=entry.created_at
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating time entry: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/time-entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_time_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a time entry."""
    try:
        entry = db.query(TimeEntry).filter(TimeEntry.id == UUID(entry_id)).first()
        if not entry:
            raise HTTPException(status_code=404, detail="Time entry not found")
        if entry.status != "pending":
            raise HTTPException(status_code=400, detail="Can only delete pending entries")

        db.delete(entry)
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting time entry: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


# ============ Commissions ============

@router.get("/commissions", response_model=CommissionListResponse)
async def list_commissions(
    technician_id: Optional[str] = Query(None),
    payroll_period_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List commissions with optional filters."""
    try:
        query = db.query(Commission)
        if technician_id:
            query = query.filter(Commission.technician_id == UUID(technician_id))
        if payroll_period_id:
            query = query.filter(Commission.payroll_period_id == UUID(payroll_period_id))
        if status:
            query = query.filter(Commission.status == status)

        commissions = query.order_by(Commission.created_at.desc()).all()

        return CommissionListResponse(commissions=[
            CommissionResponse(
                id=str(c.id),
                technician_id=str(c.technician_id),
                technician_name=get_technician_name(str(c.technician_id)),
                payroll_period_id=str(c.payroll_period_id) if c.payroll_period_id else None,
                work_order_id=c.work_order_id,
                job_total=c.job_total,
                commission_rate=c.commission_rate,
                commission_amount=c.commission_amount,
                status=c.status,
                notes=c.notes,
                created_at=c.created_at
            ) for c in commissions
        ])
    except Exception as e:
        logger.error(f"Error listing commissions: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/commissions", response_model=CommissionResponse, status_code=status.HTTP_201_CREATED)
async def create_commission(
    data: CommissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new commission."""
    try:
        commission_amount = data.job_total * data.commission_rate

        commission = Commission(
            technician_id=UUID(data.technician_id),
            payroll_period_id=UUID(data.payroll_period_id) if data.payroll_period_id else None,
            work_order_id=data.work_order_id,
            job_total=data.job_total,
            commission_rate=data.commission_rate,
            commission_amount=commission_amount,
            status="pending"
        )
        db.add(commission)
        db.commit()
        db.refresh(commission)

        return CommissionResponse(
            id=str(commission.id),
            technician_id=str(commission.technician_id),
            technician_name=get_technician_name(str(commission.technician_id)),
            payroll_period_id=str(commission.payroll_period_id) if commission.payroll_period_id else None,
            work_order_id=commission.work_order_id,
            job_total=commission.job_total,
            commission_rate=commission.commission_rate,
            commission_amount=commission.commission_amount,
            status=commission.status,
            notes=commission.notes,
            created_at=commission.created_at
        )
    except Exception as e:
        logger.error(f"Error creating commission: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/commissions/{commission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_commission(
    commission_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a commission."""
    try:
        commission = db.query(Commission).filter(Commission.id == UUID(commission_id)).first()
        if not commission:
            raise HTTPException(status_code=404, detail="Commission not found")

        db.delete(commission)
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting commission: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


# ============ Pay Rates ============

@router.get("/pay-rates", response_model=PayRateListResponse)
async def list_pay_rates(
    technician_id: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """List pay rates with optional filters."""
    try:
        query = db.query(TechnicianPayRate)
        if technician_id:
            query = query.filter(TechnicianPayRate.technician_id == UUID(technician_id))
        if is_active is not None:
            query = query.filter(TechnicianPayRate.is_active == is_active)

        rates = query.order_by(TechnicianPayRate.effective_date.desc()).all()

        return PayRateListResponse(rates=[
            PayRateResponse(
                id=str(r.id),
                technician_id=str(r.technician_id),
                technician_name=get_technician_name(str(r.technician_id)),
                pay_type=r.pay_type,
                hourly_rate=r.hourly_rate,
                overtime_rate=r.overtime_rate,
                salary_amount=r.salary_amount,
                commission_rate=r.commission_rate or 0,
                effective_date=r.effective_date,
                end_date=r.end_date,
                is_active=r.is_active
            ) for r in rates
        ])
    except Exception as e:
        logger.error(f"Error listing pay rates: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/pay-rates", response_model=PayRateResponse, status_code=status.HTTP_201_CREATED)
async def create_pay_rate(
    data: PayRateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new pay rate for a technician."""
    try:
        logger.info(f"Creating pay rate: {data}")

        # Validate pay type and required fields
        if data.pay_type not in ["hourly", "salary"]:
            raise HTTPException(status_code=400, detail="pay_type must be 'hourly' or 'salary'")

        if data.pay_type == "hourly" and not data.hourly_rate:
            raise HTTPException(status_code=400, detail="hourly_rate is required for hourly pay type")

        if data.pay_type == "salary" and not data.salary_amount:
            raise HTTPException(status_code=400, detail="salary_amount is required for salary pay type")

        # Deactivate any existing active pay rate for this technician
        existing = db.query(TechnicianPayRate).filter(
            TechnicianPayRate.technician_id == UUID(data.technician_id),
            TechnicianPayRate.is_active == True
        ).all()
        for rate in existing:
            rate.is_active = False
            rate.end_date = data.effective_date

        # Create new pay rate
        pay_rate = TechnicianPayRate(
            technician_id=UUID(data.technician_id),
            pay_type=data.pay_type,
            hourly_rate=data.hourly_rate,
            overtime_rate=data.overtime_rate,
            salary_amount=data.salary_amount,
            commission_rate=data.commission_rate or 0,
            effective_date=data.effective_date,
            is_active=data.is_active
        )
        db.add(pay_rate)
        db.commit()
        db.refresh(pay_rate)

        logger.info(f"Created pay rate {pay_rate.id} for technician {data.technician_id}")

        return PayRateResponse(
            id=str(pay_rate.id),
            technician_id=str(pay_rate.technician_id),
            technician_name=get_technician_name(str(pay_rate.technician_id)),
            pay_type=pay_rate.pay_type,
            hourly_rate=pay_rate.hourly_rate,
            overtime_rate=pay_rate.overtime_rate,
            salary_amount=pay_rate.salary_amount,
            commission_rate=pay_rate.commission_rate or 0,
            effective_date=pay_rate.effective_date,
            end_date=pay_rate.end_date,
            is_active=pay_rate.is_active
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating pay rate: {e}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create pay rate: {str(e)}")


@router.patch("/pay-rates/{rate_id}", response_model=PayRateResponse)
async def update_pay_rate(
    rate_id: str,
    data: PayRateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a pay rate."""
    try:
        rate = db.query(TechnicianPayRate).filter(TechnicianPayRate.id == UUID(rate_id)).first()
        if not rate:
            raise HTTPException(status_code=404, detail="Pay rate not found")

        if data.pay_type is not None:
            rate.pay_type = data.pay_type
        if data.hourly_rate is not None:
            rate.hourly_rate = data.hourly_rate
        if data.overtime_rate is not None:
            rate.overtime_rate = data.overtime_rate
        if data.salary_amount is not None:
            rate.salary_amount = data.salary_amount
        if data.commission_rate is not None:
            rate.commission_rate = data.commission_rate
        if data.effective_date is not None:
            rate.effective_date = data.effective_date
        if data.end_date is not None:
            rate.end_date = data.end_date
        if data.is_active is not None:
            rate.is_active = data.is_active

        db.commit()
        db.refresh(rate)

        return PayRateResponse(
            id=str(rate.id),
            technician_id=str(rate.technician_id),
            technician_name=get_technician_name(str(rate.technician_id)),
            pay_type=rate.pay_type,
            hourly_rate=rate.hourly_rate,
            overtime_rate=rate.overtime_rate,
            salary_amount=rate.salary_amount,
            commission_rate=rate.commission_rate or 0,
            effective_date=rate.effective_date,
            end_date=rate.end_date,
            is_active=rate.is_active
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating pay rate: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/pay-rates/{rate_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pay_rate(
    rate_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a pay rate."""
    try:
        rate = db.query(TechnicianPayRate).filter(TechnicianPayRate.id == UUID(rate_id)).first()
        if not rate:
            raise HTTPException(status_code=404, detail="Pay rate not found")

        db.delete(rate)
        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting pay rate: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


# ============ Period Actions ============

@router.post("/periods/{period_id}/approve", response_model=PayrollPeriodResponse)
async def approve_period(
    period_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Approve a payroll period."""
    try:
        period = db.query(PayrollPeriod).filter(PayrollPeriod.id == UUID(period_id)).first()
        if not period:
            raise HTTPException(status_code=404, detail="Period not found")

        period.status = "approved"
        period.approved_at = datetime.utcnow()
        period.approved_by = current_user.email if hasattr(current_user, 'email') else str(current_user.id)

        db.commit()
        db.refresh(period)

        return PayrollPeriodResponse(
            id=str(period.id),
            start_date=period.start_date,
            end_date=period.end_date,
            period_type=period.period_type,
            status=period.status,
            total_hours=period.total_hours or 0,
            total_regular_hours=period.total_regular_hours or 0,
            total_overtime_hours=period.total_overtime_hours or 0,
            total_gross_pay=period.total_gross_pay or 0,
            total_commissions=period.total_commissions or 0,
            total_deductions=period.total_deductions or 0,
            total_net_pay=period.total_net_pay or 0,
            technician_count=period.technician_count or 0,
            created_at=period.created_at,
            approved_at=period.approved_at,
            approved_by=period.approved_by
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving period: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/periods/{period_id}/process", response_model=PayrollPeriodResponse)
async def process_period(
    period_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Process a payroll period."""
    try:
        period = db.query(PayrollPeriod).filter(PayrollPeriod.id == UUID(period_id)).first()
        if not period:
            raise HTTPException(status_code=404, detail="Period not found")

        period.status = "processing"
        db.commit()
        db.refresh(period)

        return PayrollPeriodResponse(
            id=str(period.id),
            start_date=period.start_date,
            end_date=period.end_date,
            period_type=period.period_type,
            status=period.status,
            total_hours=period.total_hours or 0,
            total_regular_hours=period.total_regular_hours or 0,
            total_overtime_hours=period.total_overtime_hours or 0,
            total_gross_pay=period.total_gross_pay or 0,
            total_commissions=period.total_commissions or 0,
            total_deductions=period.total_deductions or 0,
            total_net_pay=period.total_net_pay or 0,
            technician_count=period.technician_count or 0,
            created_at=period.created_at,
            approved_at=period.approved_at,
            approved_by=period.approved_by
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing period: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/periods/{period_id}/summary")
async def get_period_summary(
    period_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get payroll summary for a period."""
    try:
        # For now, return empty summaries - in production this would aggregate data
        return {"summaries": []}
    except Exception as e:
        logger.error(f"Error getting period summary: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
