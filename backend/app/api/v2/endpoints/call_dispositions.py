"""
Call disposition management API endpoints.
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.api.deps import get_db, get_current_active_user
from app.models.ringcentral import CallDisposition, CallDispositionHistory
from app.schemas.ringcentral import (
    DispositionResponse,
    CreateDispositionRequest,
    UpdateDispositionRequest,
    ErrorResponse
)
from app.schemas.call_intelligence import DispositionStatsResponse
from app.services.call_intelligence_service import CallIntelligenceService

logger = logging.getLogger(__name__)

router = APIRouter()


# ===== DISPOSITION ANALYTICS =====
@router.get("/analytics", response_model=DispositionStatsResponse)
async def get_disposition_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Get aggregated disposition statistics for the dashboard.
    Matches frontend useDispositionStats() hook.
    """
    try:
        service = CallIntelligenceService(db)
        result = service.get_disposition_stats()

        return DispositionStatsResponse(**result)
    except Exception as e:
        logger.error(f"Failed to get disposition stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get disposition statistics"
        )


# ===== GET DISPOSITIONS =====
@router.get("/", response_model=List[DispositionResponse])
async def list_dispositions(
    include_inactive: bool = Query(False, description="Include inactive dispositions"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    List all available call dispositions.
    Matches frontend useDispositions() hook.
    """
    try:
        query = db.query(CallDisposition)

        # Filter by active status
        if not include_inactive:
            query = query.filter(CallDisposition.is_active == True)

        # Filter by category
        if category:
            query = query.filter(CallDisposition.category == category)

        # Order by display order and name
        dispositions = query.order_by(
            CallDisposition.display_order,
            CallDisposition.name
        ).all()

        return [
            DispositionResponse(
                id=str(disposition.id),
                name=disposition.name,
                description=disposition.description,
                category=disposition.category,
                color=disposition.color,
                is_active=disposition.is_active,
                is_default=disposition.is_default,
                icon=disposition.icon,
                auto_apply_enabled=disposition.auto_apply_enabled
            )
            for disposition in dispositions
        ]

    except Exception as e:
        logger.error(f"Failed to list dispositions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve call dispositions"
        )


# ===== CREATE DISPOSITION =====
@router.post("/", response_model=DispositionResponse)
async def create_disposition(
    request: CreateDispositionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Create a new call disposition.
    Admin functionality for customizing disposition options.
    """
    try:
        # Check if name already exists
        existing = db.query(CallDisposition).filter(
            CallDisposition.name == request.name
        ).first()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Disposition with this name already exists"
            )

        # Create new disposition
        disposition = CallDisposition(
            name=request.name,
            description=request.description,
            category=request.category,
            color=request.color,
            auto_apply_enabled=request.auto_apply_enabled,
            auto_apply_conditions=request.auto_apply_conditions,
            is_active=True,
            display_order=100  # Default order
        )

        db.add(disposition)
        db.commit()
        db.refresh(disposition)

        logger.info(f"Created new disposition: {disposition.name}")

        return DispositionResponse(
            id=str(disposition.id),
            name=disposition.name,
            description=disposition.description,
            category=disposition.category,
            color=disposition.color,
            is_active=disposition.is_active,
            is_default=disposition.is_default,
            icon=disposition.icon,
            auto_apply_enabled=disposition.auto_apply_enabled
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create disposition: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create disposition"
        )


# ===== GET SINGLE DISPOSITION =====
@router.get("/{disposition_id}", response_model=DispositionResponse)
async def get_disposition(
    disposition_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """Get a specific disposition by ID."""
    try:
        disposition = db.query(CallDisposition).filter(
            CallDisposition.id == disposition_id
        ).first()

        if not disposition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Disposition not found"
            )

        return DispositionResponse(
            id=str(disposition.id),
            name=disposition.name,
            description=disposition.description,
            category=disposition.category,
            color=disposition.color,
            is_active=disposition.is_active,
            is_default=disposition.is_default,
            icon=disposition.icon,
            auto_apply_enabled=disposition.auto_apply_enabled
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get disposition: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve disposition"
        )


# ===== UPDATE DISPOSITION =====
@router.patch("/{disposition_id}", response_model=DispositionResponse)
async def update_disposition(
    disposition_id: str,
    request: UpdateDispositionRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Update an existing call disposition.
    Admin functionality for customizing disposition options.
    """
    try:
        disposition = db.query(CallDisposition).filter(
            CallDisposition.id == disposition_id
        ).first()

        if not disposition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Disposition not found"
            )

        # Check for name conflicts
        if request.name and request.name != disposition.name:
            existing = db.query(CallDisposition).filter(
                CallDisposition.name == request.name,
                CallDisposition.id != disposition_id
            ).first()

            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Disposition with this name already exists"
                )

        # Update fields
        update_data = request.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(disposition, field, value)

        db.commit()
        db.refresh(disposition)

        logger.info(f"Updated disposition: {disposition.name}")

        return DispositionResponse(
            id=str(disposition.id),
            name=disposition.name,
            description=disposition.description,
            category=disposition.category,
            color=disposition.color,
            is_active=disposition.is_active,
            is_default=disposition.is_default,
            icon=disposition.icon,
            auto_apply_enabled=disposition.auto_apply_enabled
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update disposition: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update disposition"
        )


# ===== DELETE DISPOSITION =====
@router.delete("/{disposition_id}")
async def delete_disposition(
    disposition_id: str,
    force: bool = Query(False, description="Force delete even if in use"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Delete (deactivate) a call disposition.
    Admin functionality with safety checks.
    """
    try:
        disposition = db.query(CallDisposition).filter(
            CallDisposition.id == disposition_id
        ).first()

        if not disposition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Disposition not found"
            )

        # Check if disposition is in use
        from app.models.ringcentral import CallLog
        calls_using = db.query(CallLog).filter(
            CallLog.disposition_id == disposition_id
        ).count()

        if calls_using > 0 and not force:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete disposition: used by {calls_using} calls. Use force=true to deactivate."
            )

        # Soft delete by deactivating
        disposition.is_active = False
        db.commit()

        logger.info(f"Deactivated disposition: {disposition.name}")

        return {
            "status": "success",
            "message": f"Disposition '{disposition.name}' has been deactivated",
            "calls_affected": calls_using
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete disposition: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete disposition"
        )


# ===== DISPOSITION ANALYTICS =====
@router.get("/{disposition_id}/analytics")
async def get_disposition_analytics(
    disposition_id: str,
    days: int = Query(30, description="Number of days to analyze"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Get analytics for a specific disposition.
    Shows usage patterns, success rates, etc.
    """
    try:
        disposition = db.query(CallDisposition).filter(
            CallDisposition.id == disposition_id
        ).first()

        if not disposition:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Disposition not found"
            )

        # Calculate analytics
        from app.models.ringcentral import CallLog, CallDispositionHistory
        from datetime import datetime, timedelta

        since_date = datetime.utcnow() - timedelta(days=days)

        # Total usage
        total_usage = db.query(CallLog).filter(
            CallLog.disposition_id == disposition_id,
            CallLog.created_at >= since_date
        ).count()

        # Auto-applied vs manual
        auto_applied = db.query(CallDispositionHistory).filter(
            CallDispositionHistory.disposition_id == disposition_id,
            CallDispositionHistory.applied_at >= since_date,
            CallDispositionHistory.action_type == "auto_applied"
        ).count()

        # Override rate
        overrides = db.query(CallDispositionHistory).filter(
            CallDispositionHistory.disposition_id == disposition_id,
            CallDispositionHistory.applied_at >= since_date,
            CallDispositionHistory.action_type == "user_override"
        ).count()

        # Average confidence when auto-applied
        avg_confidence = db.query(CallDispositionHistory.confidence_score).filter(
            CallDispositionHistory.disposition_id == disposition_id,
            CallDispositionHistory.applied_at >= since_date,
            CallDispositionHistory.action_type == "auto_applied"
        ).all()

        avg_confidence_score = None
        if avg_confidence:
            scores = [score[0] for score in avg_confidence if score[0] is not None]
            avg_confidence_score = sum(scores) / len(scores) if scores else None

        return {
            "disposition_id": disposition_id,
            "disposition_name": disposition.name,
            "period_days": days,
            "total_usage": total_usage,
            "auto_applied": auto_applied,
            "manual_applied": total_usage - auto_applied,
            "override_count": overrides,
            "auto_apply_rate": (auto_applied / total_usage * 100) if total_usage > 0 else 0,
            "override_rate": (overrides / auto_applied * 100) if auto_applied > 0 else 0,
            "average_confidence": avg_confidence_score
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get disposition analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get disposition analytics"
        )


# ===== BULK OPERATIONS =====
@router.post("/bulk-update")
async def bulk_update_dispositions(
    updates: List[dict],
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Bulk update multiple dispositions.
    Useful for admin operations like reordering.
    """
    try:
        updated_count = 0

        for update in updates:
            disposition_id = update.get("id")
            if not disposition_id:
                continue

            disposition = db.query(CallDisposition).filter(
                CallDisposition.id == disposition_id
            ).first()

            if disposition:
                # Update allowed fields
                for field in ["display_order", "color", "is_active"]:
                    if field in update:
                        setattr(disposition, field, update[field])
                updated_count += 1

        db.commit()

        logger.info(f"Bulk updated {updated_count} dispositions")

        return {
            "status": "success",
            "updated_count": updated_count,
            "message": f"Successfully updated {updated_count} dispositions"
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Bulk update failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Bulk update failed"
        )


# ===== DEFAULT DISPOSITIONS SETUP =====
@router.post("/setup-defaults")
async def setup_default_dispositions(
    force: bool = Query(False, description="Force recreate if defaults exist"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Set up default call dispositions for new installations.
    """
    try:
        # Check if defaults already exist
        existing_count = db.query(CallDisposition).count()
        if existing_count > 0 and not force:
            return {
                "status": "skipped",
                "message": f"Default dispositions already exist ({existing_count} found). Use force=true to recreate."
            }

        # Default dispositions
        default_dispositions = [
            {
                "name": "Resolved - Customer Satisfied",
                "category": "positive",
                "color": "#10B981",
                "description": "Call resolved, customer satisfied with outcome",
                "auto_apply_enabled": True,
                "auto_apply_conditions": {
                    "sentiment_score": 70,
                    "keywords": ["resolved", "satisfied", "thank you", "perfect"]
                }
            },
            {
                "name": "Sale Made",
                "category": "positive",
                "color": "#059669",
                "description": "Successful sale or contract signed",
                "auto_apply_enabled": True,
                "auto_apply_conditions": {
                    "sentiment_score": 80,
                    "keywords": ["purchase", "buy", "order", "contract", "signed"]
                }
            },
            {
                "name": "Follow-up Required",
                "category": "neutral",
                "color": "#F59E0B",
                "description": "Customer needs follow-up contact",
                "auto_apply_enabled": True,
                "auto_apply_conditions": {
                    "escalation_risk": "medium",
                    "keywords": ["follow up", "call back", "schedule"]
                }
            },
            {
                "name": "Information Provided",
                "category": "neutral",
                "color": "#6B7280",
                "description": "Provided information, no further action needed",
                "auto_apply_enabled": True,
                "auto_apply_conditions": {
                    "sentiment": "neutral",
                    "quality_score": 60
                }
            },
            {
                "name": "Escalation Required",
                "category": "negative",
                "color": "#EF4444",
                "description": "Issue requires manager or supervisor attention",
                "auto_apply_enabled": True,
                "auto_apply_conditions": {
                    "escalation_risk": "high"
                }
            },
            {
                "name": "Customer Complaint",
                "category": "negative",
                "color": "#DC2626",
                "description": "Customer complaint or service issue",
                "auto_apply_enabled": True,
                "auto_apply_conditions": {
                    "sentiment": "negative",
                    "customer_satisfaction": 3
                }
            },
            {
                "name": "No Answer",
                "category": "neutral",
                "color": "#9CA3AF",
                "description": "Call was not answered",
                "auto_apply_enabled": True,
                "auto_apply_conditions": {
                    "duration_max_seconds": 30,
                    "status": "no_answer"
                }
            },
            {
                "name": "Not Interested",
                "category": "negative",
                "color": "#6B7280",
                "description": "Customer not interested in service",
                "auto_apply_enabled": False
            }
        ]

        created_count = 0

        for i, default in enumerate(default_dispositions):
            # Check if exists (by name)
            existing = db.query(CallDisposition).filter(
                CallDisposition.name == default["name"]
            ).first()

            if existing and not force:
                continue

            if existing and force:
                # Update existing
                for key, value in default.items():
                    if key != "name":
                        setattr(existing, key, value)
                existing.display_order = (i + 1) * 10
            else:
                # Create new
                disposition = CallDisposition(
                    display_order=(i + 1) * 10,
                    is_default=i == 0,  # First one is default
                    **default
                )
                db.add(disposition)

            created_count += 1

        db.commit()

        logger.info(f"Set up {created_count} default dispositions")

        return {
            "status": "success",
            "created_count": created_count,
            "message": f"Successfully set up {created_count} default dispositions"
        }

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to setup default dispositions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to setup default dispositions"
        )