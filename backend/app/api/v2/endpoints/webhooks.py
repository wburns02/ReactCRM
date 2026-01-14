"""
RingCentral webhook endpoints for real-time call event processing.
Handles secure webhook delivery, signature verification, and event processing.
"""

import logging
import hashlib
import hmac
import json
import time
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import APIRouter, Request, HTTPException, status, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.models.ringcentral import RCWebhookEvent, CallLog, RCAccount
from app.services.webhook_processor import WebhookProcessor, WebhookProcessingError

logger = logging.getLogger(__name__)

router = APIRouter()


# ===== WEBHOOK VALIDATION =====
def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """
    Verify RingCentral webhook signature for security.

    Args:
        payload: Raw request body bytes
        signature: Signature from X-RC-Signature header
        secret: Webhook secret from configuration

    Returns:
        True if signature is valid, False otherwise
    """
    if not signature or not secret:
        return False

    try:
        # RingCentral uses SHA-1 HMAC
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha1
        ).hexdigest()

        return hmac.compare_digest(signature, expected_signature)
    except Exception as e:
        logger.error(f"Signature verification error: {e}")
        return False


async def get_webhook_processor() -> WebhookProcessor:
    """Dependency to get webhook processor instance."""
    return WebhookProcessor()


# ===== WEBHOOK ENDPOINTS =====
@router.post("/ringcentral")
async def handle_ringcentral_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    processor: WebhookProcessor = Depends(get_webhook_processor)
):
    """
    Handle RingCentral webhook notifications.
    Processes call events in real-time for automation pipeline.
    """
    start_time = time.time()

    try:
        # Get request data
        raw_payload = await request.body()
        headers = dict(request.headers)

        # Get signature for verification
        signature = headers.get("x-rc-signature")

        logger.info(f"Received RingCentral webhook: {len(raw_payload)} bytes")

        # Verify webhook signature
        if not verify_webhook_signature(raw_payload, signature, settings.RINGCENTRAL_WEBHOOK_SECRET):
            logger.warning(f"Invalid webhook signature from {request.client.host}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature"
            )

        # Parse JSON payload
        try:
            payload = json.loads(raw_payload.decode('utf-8'))
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in webhook payload: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid JSON payload"
            )

        # Handle webhook validation challenge
        if "validationToken" in payload:
            logger.info("Responding to webhook validation challenge")
            return {"validationToken": payload["validationToken"]}

        # Extract event information
        event_type = payload.get("event", "unknown")
        event_id = payload.get("uuid", f"webhook_{int(time.time())}")

        # Create webhook event record
        webhook_event = RCWebhookEvent(
            event_type=event_type,
            raw_payload=payload,
            headers=headers,
            signature=signature,
            signature_valid=True,
            received_at=datetime.utcnow()
        )

        db.add(webhook_event)
        db.commit()
        db.refresh(webhook_event)

        logger.info(f"Stored webhook event {event_id} (type: {event_type})")

        # Process event in background for fast response
        background_tasks.add_task(
            process_webhook_event_background,
            webhook_event.id,
            processor
        )

        processing_time = time.time() - start_time

        return {
            "status": "received",
            "event_id": str(webhook_event.id),
            "event_type": event_type,
            "processing_time_ms": round(processing_time * 1000, 2),
            "queued_for_processing": True
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed"
        )


@router.post("/ringcentral/test")
async def test_webhook_endpoint(
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    processor: WebhookProcessor = Depends(get_webhook_processor)
):
    """
    Test endpoint for webhook processing (development/testing only).
    Bypasses signature verification for testing purposes.
    """
    if not settings.DEBUG:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Test endpoint only available in debug mode"
        )

    logger.info("Processing test webhook payload")

    # Create test webhook event
    webhook_event = RCWebhookEvent(
        event_type=payload.get("event", "test_event"),
        raw_payload=payload,
        headers={"x-test": "true"},
        signature_valid=True,
        received_at=datetime.utcnow()
    )

    db.add(webhook_event)
    db.commit()
    db.refresh(webhook_event)

    # Process immediately for testing
    try:
        result = await processor.process_webhook_event(str(webhook_event.id))
        return {
            "status": "processed",
            "event_id": str(webhook_event.id),
            "result": result
        }
    except Exception as e:
        logger.error(f"Test webhook processing failed: {e}")
        return {
            "status": "failed",
            "event_id": str(webhook_event.id),
            "error": str(e)
        }


# ===== WEBHOOK STATUS AND MANAGEMENT =====
@router.get("/events")
async def list_webhook_events(
    limit: int = 50,
    offset: int = 0,
    event_type: Optional[str] = None,
    processed: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """List recent webhook events for monitoring."""
    query = db.query(RCWebhookEvent).order_by(RCWebhookEvent.received_at.desc())

    if event_type:
        query = query.filter(RCWebhookEvent.event_type == event_type)

    if processed is not None:
        query = query.filter(RCWebhookEvent.processed == processed)

    events = query.offset(offset).limit(limit).all()

    return {
        "events": [
            {
                "id": str(event.id),
                "event_type": event.event_type,
                "processed": event.processed,
                "processing_status": event.processing_status,
                "received_at": event.received_at.isoformat(),
                "processing_duration_ms": event.processing_duration_ms,
                "error_message": event.error_message,
                "related_call_id": event.related_call_id
            }
            for event in events
        ],
        "total": query.count(),
        "limit": limit,
        "offset": offset
    }


@router.get("/events/{event_id}")
async def get_webhook_event_detail(
    event_id: str,
    db: Session = Depends(get_db)
):
    """Get detailed webhook event information."""
    event = db.query(RCWebhookEvent).filter(RCWebhookEvent.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook event not found"
        )

    return {
        "id": str(event.id),
        "event_type": event.event_type,
        "event_source": event.event_source,
        "processed": event.processed,
        "processing_status": event.processing_status,
        "processing_attempts": event.processing_attempts,
        "received_at": event.received_at.isoformat(),
        "processing_started_at": event.processing_started_at.isoformat() if event.processing_started_at else None,
        "processing_completed_at": event.processing_completed_at.isoformat() if event.processing_completed_at else None,
        "processing_duration_ms": event.processing_duration_ms,
        "signature_valid": event.signature_valid,
        "related_call_id": event.related_call_id,
        "related_user_id": event.related_user_id,
        "result_summary": event.result_summary,
        "error_message": event.error_message,
        "raw_payload": event.raw_payload,
        "headers": event.headers
    }


@router.post("/events/{event_id}/reprocess")
async def reprocess_webhook_event(
    event_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    processor: WebhookProcessor = Depends(get_webhook_processor)
):
    """Reprocess a failed webhook event."""
    event = db.query(RCWebhookEvent).filter(RCWebhookEvent.id == event_id).first()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook event not found"
        )

    # Reset processing status
    event.processed = False
    event.processing_status = "pending"
    event.processing_attempts = 0
    event.processing_started_at = None
    event.processing_completed_at = None
    event.processing_duration_ms = None
    event.error_message = None
    event.error_traceback = None

    db.commit()

    # Queue for reprocessing
    background_tasks.add_task(
        process_webhook_event_background,
        event.id,
        processor
    )

    logger.info(f"Queued webhook event {event_id} for reprocessing")

    return {
        "status": "queued",
        "event_id": event_id,
        "message": "Event queued for reprocessing"
    }


# ===== WEBHOOK STATISTICS =====
@router.get("/stats")
async def get_webhook_statistics(
    hours: int = 24,
    db: Session = Depends(get_db)
):
    """Get webhook processing statistics."""
    from datetime import datetime, timedelta
    from sqlalchemy import func, and_

    since = datetime.utcnow() - timedelta(hours=hours)

    # Basic counts
    total_events = db.query(RCWebhookEvent).filter(
        RCWebhookEvent.received_at >= since
    ).count()

    processed_events = db.query(RCWebhookEvent).filter(
        and_(
            RCWebhookEvent.received_at >= since,
            RCWebhookEvent.processed == True
        )
    ).count()

    failed_events = db.query(RCWebhookEvent).filter(
        and_(
            RCWebhookEvent.received_at >= since,
            RCWebhookEvent.processing_status == "failed"
        )
    ).count()

    # Event type breakdown
    event_types = db.query(
        RCWebhookEvent.event_type,
        func.count(RCWebhookEvent.id).label('count')
    ).filter(
        RCWebhookEvent.received_at >= since
    ).group_by(RCWebhookEvent.event_type).all()

    # Average processing time
    avg_processing_time = db.query(
        func.avg(RCWebhookEvent.processing_duration_ms)
    ).filter(
        and_(
            RCWebhookEvent.received_at >= since,
            RCWebhookEvent.processing_duration_ms.isnot(None)
        )
    ).scalar()

    return {
        "period_hours": hours,
        "total_events": total_events,
        "processed_events": processed_events,
        "failed_events": failed_events,
        "pending_events": total_events - processed_events - failed_events,
        "success_rate": round((processed_events / total_events * 100) if total_events > 0 else 0, 2),
        "average_processing_time_ms": round(avg_processing_time or 0, 2),
        "event_type_breakdown": [
            {"event_type": et[0], "count": et[1]}
            for et in event_types
        ]
    }


# ===== BACKGROUND PROCESSING FUNCTION =====
async def process_webhook_event_background(event_id: str, processor: WebhookProcessor):
    """Background task for processing webhook events."""
    try:
        logger.info(f"Starting background processing for webhook event {event_id}")
        result = await processor.process_webhook_event(event_id)
        logger.info(f"Successfully processed webhook event {event_id}: {result.get('status')}")
    except WebhookProcessingError as e:
        logger.error(f"Webhook processing error for event {event_id}: {e}")
    except Exception as e:
        logger.error(f"Unexpected error processing webhook event {event_id}: {e}")


# ===== HEALTH CHECK =====
@router.get("/health")
async def webhook_health_check(db: Session = Depends(get_db)):
    """Health check for webhook processing system."""
    try:
        from datetime import datetime, timedelta

        # Check recent webhook activity
        since = datetime.utcnow() - timedelta(minutes=30)
        recent_events = db.query(RCWebhookEvent).filter(
            RCWebhookEvent.received_at >= since
        ).count()

        # Check for processing failures
        recent_failures = db.query(RCWebhookEvent).filter(
            and_(
                RCWebhookEvent.received_at >= since,
                RCWebhookEvent.processing_status == "failed"
            )
        ).count()

        # Calculate health score
        if recent_events == 0:
            health_score = 100  # No events is fine
        else:
            failure_rate = recent_failures / recent_events
            health_score = max(0, 100 - (failure_rate * 100))

        status = "healthy" if health_score >= 80 else "degraded" if health_score >= 50 else "unhealthy"

        return {
            "status": status,
            "health_score": round(health_score, 1),
            "recent_events_30min": recent_events,
            "recent_failures_30min": recent_failures,
            "failure_rate": round(failure_rate * 100 if recent_events > 0 else 0, 2),
            "webhook_secret_configured": bool(settings.RINGCENTRAL_WEBHOOK_SECRET),
            "webhook_url_configured": bool(settings.RINGCENTRAL_WEBHOOK_URL)
        }

    except Exception as e:
        logger.error(f"Webhook health check failed: {e}")
        return {
            "status": "error",
            "error": str(e)
        }