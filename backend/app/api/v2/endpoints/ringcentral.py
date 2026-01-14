"""
RingCentral API endpoints matching frontend expectations exactly.
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.services.ringcentral_service import RingCentralService, RingCentralError
from app.schemas.ringcentral import (
    RCStatusResponse,
    CallRecordResponse,
    CallListResponse,
    ExtensionResponse,
    InitiateCallRequest,
    SyncCallsRequest,
    UpdateCallRequest,
    DispositionResponse,
    ErrorResponse
)
from app.schemas.call_intelligence import (
    CallAnalyticsResponse,
    AgentPerformanceResponse,
    QualityHeatmapResponse,
    CoachingInsightsResponse,
)
from app.services.call_intelligence_service import CallIntelligenceService
from app.models.ringcentral import CallDisposition
from app.core.security import generate_state_token

logger = logging.getLogger(__name__)

router = APIRouter()


# ===== DEPENDENCY HELPERS =====
def get_ringcentral_service(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
) -> RingCentralService:
    """Get RingCentral service instance for current user."""
    return RingCentralService(db=db, user_id=current_user.id)


# ===== CONNECTION STATUS =====
@router.get("/status", response_model=RCStatusResponse)
async def get_ringcentral_status(
    service: RingCentralService = Depends(get_ringcentral_service)
):
    """
    Get RingCentral connection status for current user.
    Matches frontend useRCStatus() hook.
    """
    try:
        return service.get_account_status()
    except Exception as e:
        logger.error(f"Failed to get RingCentral status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get RingCentral status"
        )


# ===== OAUTH ENDPOINTS =====
@router.get("/oauth/authorize")
async def initiate_oauth_authorization(
    service: RingCentralService = Depends(get_ringcentral_service)
):
    """
    Initiate OAuth authorization flow.
    Returns authorization URL for frontend redirect.
    """
    try:
        state = generate_state_token()
        auth_url = service.get_authorization_url(state)

        return {
            "authorization_url": auth_url,
            "state": state
        }
    except Exception as e:
        logger.error(f"Failed to initiate OAuth: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate OAuth authorization"
        )


@router.post("/oauth/callback")
async def handle_oauth_callback(
    code: str,
    state: str,
    service: RingCentralService = Depends(get_ringcentral_service)
):
    """
    Handle OAuth callback from RingCentral.
    Exchange authorization code for access token.
    """
    try:
        account = await service.handle_oauth_callback(code, state)

        return {
            "status": "success",
            "message": "OAuth authorization completed",
            "account_id": account.account_id,
            "extension": account.extension_number
        }
    except RingCentralError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"OAuth callback failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth callback processing failed"
        )


# ===== CALL MANAGEMENT =====
@router.get("/calls", response_model=CallListResponse)
async def get_calls(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    direction: Optional[str] = Query(None, description="Filter by direction (inbound/outbound)"),
    customer_id: Optional[str] = Query(None, description="Filter by customer ID"),
    service: RingCentralService = Depends(get_ringcentral_service)
):
    """
    Get paginated list of calls for current user.
    Matches frontend useCallLog() hook.
    """
    try:
        return await service.get_calls(
            page=page,
            page_size=page_size,
            direction=direction,
            customer_id=customer_id
        )
    except RingCentralError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get calls: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve calls"
        )


@router.post("/call")
async def initiate_call(
    request: InitiateCallRequest,
    service: RingCentralService = Depends(get_ringcentral_service)
):
    """
    Initiate an outbound call.
    Matches frontend useInitiateCall() hook.
    """
    try:
        result = await service.initiate_call(request)
        return result
    except RingCentralError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to initiate call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initiate call"
        )


@router.post("/sync")
async def sync_calls(
    request: SyncCallsRequest = SyncCallsRequest(),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    service: RingCentralService = Depends(get_ringcentral_service)
):
    """
    Sync calls from RingCentral API.
    Matches frontend useSyncCalls() hook.
    Can run in background for better UX.
    """
    try:
        # For faster response, run sync in background
        background_tasks.add_task(
            _background_sync_calls,
            service,
            request.hours_back,
            request.force_refresh
        )

        return {
            "status": "queued",
            "message": "Call sync has been queued for processing"
        }
    except Exception as e:
        logger.error(f"Failed to queue call sync: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue call sync"
        )


async def _background_sync_calls(
    service: RingCentralService,
    hours_back: int,
    force_refresh: bool
):
    """Background task for call synchronization."""
    try:
        result = await service.sync_calls(hours_back, force_refresh)
        logger.info(f"Background sync completed: {result}")
    except Exception as e:
        logger.error(f"Background sync failed: {e}")


@router.patch("/calls/{call_id}", response_model=CallRecordResponse)
async def update_call(
    call_id: str,
    request: UpdateCallRequest,
    service: RingCentralService = Depends(get_ringcentral_service)
):
    """
    Update call information (disposition, notes, etc.).
    Matches frontend useLogDisposition() hook.
    """
    try:
        return await service.update_call(call_id, request)
    except RingCentralError as e:
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update call: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update call"
        )


# ===== EXTENSION MANAGEMENT =====
@router.get("/extensions", response_model=List[ExtensionResponse])
async def get_extensions(
    service: RingCentralService = Depends(get_ringcentral_service)
):
    """
    Get list of available extensions.
    Matches frontend useExtensions() hook.
    """
    try:
        return await service.get_extensions()
    except RingCentralError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get extensions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get extensions"
        )


@router.get("/my-extension", response_model=ExtensionResponse)
async def get_my_extension(
    service: RingCentralService = Depends(get_ringcentral_service)
):
    """
    Get current user's extension information.
    Matches frontend useMyExtension() hook.
    """
    try:
        return await service.get_my_extension()
    except RingCentralError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to get my extension: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get extension"
        )


# ===== RECORDING ENDPOINTS =====
@router.get("/calls/{call_id}/recording")
async def get_call_recording(
    call_id: str,
    service: RingCentralService = Depends(get_ringcentral_service),
    db: Session = Depends(get_db)
):
    """
    Get call recording URL or download recording.
    """
    try:
        # Get call log
        from app.models.ringcentral import CallLog
        call_log = db.query(CallLog).filter(
            CallLog.id == call_id,
            CallLog.user_id == service.user_id
        ).first()

        if not call_log:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Call not found"
            )

        if not call_log.has_recording:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No recording available for this call"
            )

        # Get or generate recording URL
        recording_url = await service.get_recording_url(call_log)

        if not recording_url:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Recording temporarily unavailable"
            )

        return {"recording_url": recording_url}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get recording: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get recording"
        )


# ===== CALL DISPOSITIONS =====
@router.get("/dispositions", response_model=List[DispositionResponse])
async def get_call_dispositions(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Get list of available call dispositions.
    Matches frontend useDispositions() hook.
    """
    try:
        dispositions = db.query(CallDisposition).filter(
            CallDisposition.is_active == True
        ).order_by(CallDisposition.display_order, CallDisposition.name).all()

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
        logger.error(f"Failed to get dispositions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get call dispositions"
        )


# ===== WEBHOOK MANAGEMENT =====
@router.post("/webhook/subscribe")
async def create_webhook_subscription(
    service: RingCentralService = Depends(get_ringcentral_service)
):
    """
    Create webhook subscription for real-time call events.
    """
    try:
        subscription = await service.create_webhook_subscription()
        return {
            "status": "success",
            "subscription_id": subscription.get("id"),
            "expires_at": subscription.get("expirationTime")
        }
    except RingCentralError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to create webhook subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create webhook subscription"
        )


# ===== HEALTH AND DIAGNOSTICS =====
@router.get("/health")
async def ringcentral_health(
    service: RingCentralService = Depends(get_ringcentral_service)
):
    """
    Get health status of RingCentral integration.
    """
    try:
        status_info = service.get_account_status()

        return {
            "status": "healthy" if status_info.connected else "disconnected",
            "connected": status_info.connected,
            "configured": status_info.configured,
            "account_id": status_info.account_id,
            "extension": status_info.extension,
            "last_sync": status_info.last_sync_at,
            "message": status_info.message
        }

    except Exception as e:
        logger.error(f"RingCentral health check failed: {e}")
        return {
            "status": "error",
            "message": str(e)
        }


# ===== ERROR HANDLERS =====
@router.exception_handler(RingCentralError)
async def ringcentral_error_handler(request: Request, exc: RingCentralError):
    """Handle RingCentral-specific errors."""
    return ErrorResponse(
        detail=str(exc),
        status_code=status.HTTP_400_BAD_REQUEST,
        error_code="RINGCENTRAL_ERROR"
    )


# ===== BATCH OPERATIONS (Future) =====
@router.post("/calls/batch-sync")
async def batch_sync_calls(
    background_tasks: BackgroundTasks,
    service: RingCentralService = Depends(get_ringcentral_service)
):
    """
    Batch sync multiple time periods or force refresh all calls.
    For admin/maintenance use.
    """
    # Implementation for batch operations
    background_tasks.add_task(_background_sync_calls, service, 168, True)  # 7 days

    return {
        "status": "queued",
        "message": "Batch sync queued for processing"
    }


# ===== ADMIN ENDPOINTS =====
@router.get("/admin/stats")
async def get_ringcentral_stats(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Get RingCentral integration statistics.
    For admin dashboard use.
    """
    try:
        from app.models.ringcentral import CallLog, RCAccount

        # Basic stats
        total_accounts = db.query(RCAccount).count()
        connected_accounts = db.query(RCAccount).filter(RCAccount.is_connected == True).count()
        total_calls = db.query(CallLog).count()
        calls_with_recordings = db.query(CallLog).filter(CallLog.has_recording == True).count()

        return {
            "total_accounts": total_accounts,
            "connected_accounts": connected_accounts,
            "connection_rate": (connected_accounts / total_accounts * 100) if total_accounts > 0 else 0,
            "total_calls": total_calls,
            "calls_with_recordings": calls_with_recordings,
            "recording_rate": (calls_with_recordings / total_calls * 100) if total_calls > 0 else 0
        }

    except Exception as e:
        logger.error(f"Failed to get RingCentral stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get statistics"
        )


@router.post("/admin/seed-data")
async def seed_sample_data(
    call_count: int = Query(15, description="Number of sample calls to create"),
    user_id: str = Query("demo-user-001", description="User ID to create data for"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Seed sample RingCentral data for testing and demo purposes.
    Creates real data that the analytics endpoints can use.
    """
    try:
        from app.utils.seed_ringcentral_data import seed_ringcentral_data

        result = seed_ringcentral_data(db, user_id=user_id, call_count=call_count)

        if result["success"]:
            logger.info(f"Successfully seeded RingCentral data: {result}")
            return result
        else:
            logger.error(f"Failed to seed data: {result}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"]
            )

    except Exception as e:
        logger.error(f"Failed to seed sample data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to seed sample data: {str(e)}"
        )


# ===== CALL INTELLIGENCE ANALYTICS ENDPOINTS =====

@router.get("/calls/analytics", response_model=CallAnalyticsResponse)
async def get_call_analytics(
    days: int = Query(30, description="Number of days to analyze", ge=1, le=365),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Get comprehensive call analytics metrics for the dashboard.
    Matches frontend useCallAnalytics() hook.
    """
    try:
        service = CallIntelligenceService(db)
        metrics = service.get_dashboard_metrics(days=days)

        from datetime import datetime
        return CallAnalyticsResponse(
            metrics=metrics,
            updated_at=datetime.utcnow().isoformat()
        )
    except Exception as e:
        logger.error(f"Failed to get call analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get call analytics"
        )


@router.get("/agents/performance", response_model=AgentPerformanceResponse)
async def get_agents_performance(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Get performance metrics for all agents.
    Matches frontend useAgentPerformance() hook.
    """
    try:
        service = CallIntelligenceService(db)
        result = service.get_agent_performance()

        return AgentPerformanceResponse(**result)
    except Exception as e:
        logger.error(f"Failed to get agent performance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get agent performance"
        )


@router.get("/quality/heatmap", response_model=QualityHeatmapResponse)
async def get_quality_heatmap(
    days: int = Query(14, description="Number of days to show", ge=7, le=90),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Get quality scores by agent over time for heatmap visualization.
    Matches frontend useQualityHeatmap() hook.
    """
    try:
        service = CallIntelligenceService(db)
        result = service.get_quality_heatmap(days=days)

        return QualityHeatmapResponse(**result)
    except Exception as e:
        logger.error(f"Failed to get quality heatmap: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get quality heatmap"
        )


@router.get("/coaching/insights", response_model=CoachingInsightsResponse)
async def get_coaching_insights(
    days: int = Query(30, description="Number of days to analyze", ge=7, le=365),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Get aggregated coaching insights across all agents.
    Matches frontend useCoachingInsights() hook.
    """
    try:
        service = CallIntelligenceService(db)
        result = service.get_coaching_insights(days=days)

        return CoachingInsightsResponse(**result)
    except Exception as e:
        logger.error(f"Failed to get coaching insights: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get coaching insights"
        )