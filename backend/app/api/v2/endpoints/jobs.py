"""
Background job management API endpoints.
Provides monitoring, control, and status endpoints for the job processing system.
"""

import logging
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.services.background_jobs import background_job_manager, JobPriority

logger = logging.getLogger(__name__)

router = APIRouter()


# ===== JOB QUEUING ENDPOINTS =====

@router.post("/queue/call-processing")
async def queue_call_processing_job(
    call_log_id: str,
    priority: str = "high",
    recording_url: Optional[str] = None,
    current_user = Depends(get_current_active_user)
):
    """Queue a full call processing pipeline job."""
    try:
        # Convert priority string to enum
        priority_map = {
            "low": JobPriority.LOW,
            "medium": JobPriority.MEDIUM,
            "high": JobPriority.HIGH,
            "urgent": JobPriority.URGENT
        }
        job_priority = priority_map.get(priority.lower(), JobPriority.MEDIUM)

        job_id = await background_job_manager.queue_call_processing(
            call_log_id=call_log_id,
            priority=job_priority,
            recording_url=recording_url
        )

        return {
            "status": "queued",
            "job_id": job_id,
            "call_log_id": call_log_id,
            "priority": priority,
            "message": "Call processing job queued successfully"
        }

    except Exception as e:
        logger.error(f"Failed to queue call processing job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue job: {str(e)}"
        )


@router.post("/queue/transcription")
async def queue_transcription_job(
    call_log_id: str,
    audio_url: Optional[str] = None,
    priority: str = "medium",
    current_user = Depends(get_current_active_user)
):
    """Queue a call transcription job."""
    try:
        priority_map = {
            "low": JobPriority.LOW,
            "medium": JobPriority.MEDIUM,
            "high": JobPriority.HIGH,
            "urgent": JobPriority.URGENT
        }
        job_priority = priority_map.get(priority.lower(), JobPriority.MEDIUM)

        job_id = await background_job_manager.queue_transcription(
            call_log_id=call_log_id,
            audio_url=audio_url,
            priority=job_priority
        )

        return {
            "status": "queued",
            "job_id": job_id,
            "call_log_id": call_log_id,
            "priority": priority,
            "message": "Transcription job queued successfully"
        }

    except Exception as e:
        logger.error(f"Failed to queue transcription job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue job: {str(e)}"
        )


@router.post("/queue/analysis")
async def queue_analysis_job(
    call_log_id: str,
    analysis_modules: Optional[List[str]] = None,
    priority: str = "medium",
    current_user = Depends(get_current_active_user)
):
    """Queue a call analysis job."""
    try:
        priority_map = {
            "low": JobPriority.LOW,
            "medium": JobPriority.MEDIUM,
            "high": JobPriority.HIGH,
            "urgent": JobPriority.URGENT
        }
        job_priority = priority_map.get(priority.lower(), JobPriority.MEDIUM)

        job_id = await background_job_manager.queue_analysis(
            call_log_id=call_log_id,
            analysis_modules=analysis_modules,
            priority=job_priority
        )

        return {
            "status": "queued",
            "job_id": job_id,
            "call_log_id": call_log_id,
            "priority": priority,
            "message": "Analysis job queued successfully"
        }

    except Exception as e:
        logger.error(f"Failed to queue analysis job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue job: {str(e)}"
        )


@router.post("/queue/disposition")
async def queue_disposition_job(
    call_log_id: str,
    priority: str = "high",
    current_user = Depends(get_current_active_user)
):
    """Queue a call disposition evaluation job."""
    try:
        priority_map = {
            "low": JobPriority.LOW,
            "medium": JobPriority.MEDIUM,
            "high": JobPriority.HIGH,
            "urgent": JobPriority.URGENT
        }
        job_priority = priority_map.get(priority.lower(), JobPriority.HIGH)

        job_id = await background_job_manager.queue_disposition(
            call_log_id=call_log_id,
            priority=job_priority
        )

        return {
            "status": "queued",
            "job_id": job_id,
            "call_log_id": call_log_id,
            "priority": priority,
            "message": "Disposition job queued successfully"
        }

    except Exception as e:
        logger.error(f"Failed to queue disposition job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue job: {str(e)}"
        )


# ===== JOB MONITORING ENDPOINTS =====

@router.get("/status/{job_id}")
async def get_job_status(
    job_id: str,
    current_user = Depends(get_current_active_user)
):
    """Get status of a specific job."""
    try:
        status_info = await background_job_manager.get_job_status(job_id)

        if status_info.get("status") == "not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job {job_id} not found"
            )

        return status_info

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status for {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get job status"
        )


@router.get("/queue/stats")
async def get_queue_statistics(
    current_user = Depends(get_current_active_user)
):
    """Get queue statistics and health information."""
    try:
        stats = await background_job_manager.get_queue_stats()
        return stats

    except Exception as e:
        logger.error(f"Failed to get queue stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get queue statistics"
        )


@router.post("/cancel/{job_id}")
async def cancel_job(
    job_id: str,
    current_user = Depends(get_current_active_user)
):
    """Cancel a queued job."""
    try:
        cancelled = await background_job_manager.cancel_job(job_id)

        if not cancelled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Job cannot be cancelled (not found or already processing)"
            )

        return {
            "status": "cancelled",
            "job_id": job_id,
            "message": "Job cancelled successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel job"
        )


# ===== BATCH OPERATIONS =====

@router.post("/queue/batch-calls")
async def queue_batch_call_processing(
    call_log_ids: List[str],
    priority: str = "medium",
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_active_user)
):
    """Queue multiple call processing jobs."""
    try:
        priority_map = {
            "low": JobPriority.LOW,
            "medium": JobPriority.MEDIUM,
            "high": JobPriority.HIGH,
            "urgent": JobPriority.URGENT
        }
        job_priority = priority_map.get(priority.lower(), JobPriority.MEDIUM)

        # Queue jobs in background
        job_ids = []
        for call_log_id in call_log_ids:
            job_id = await background_job_manager.queue_call_processing(
                call_log_id=call_log_id,
                priority=job_priority
            )
            job_ids.append(job_id)

        return {
            "status": "queued",
            "job_count": len(job_ids),
            "job_ids": job_ids,
            "call_log_ids": call_log_ids,
            "priority": priority,
            "message": f"Queued {len(job_ids)} call processing jobs"
        }

    except Exception as e:
        logger.error(f"Failed to queue batch jobs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to queue batch jobs: {str(e)}"
        )


# ===== MAINTENANCE ENDPOINTS =====

@router.post("/maintenance/cleanup")
async def cleanup_old_jobs(
    days_old: int = 7,
    current_user = Depends(get_current_active_user)
):
    """Clean up old completed jobs."""
    try:
        job_id = await background_job_manager.queue_job(
            job_type="cleanup_old_jobs",
            job_data={"days_old": days_old},
            priority=JobPriority.LOW
        )

        return {
            "status": "queued",
            "cleanup_job_id": job_id,
            "days_old": days_old,
            "message": f"Cleanup job queued to remove jobs older than {days_old} days"
        }

    except Exception as e:
        logger.error(f"Failed to queue cleanup job: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to queue cleanup job"
        )


@router.get("/health")
async def job_system_health():
    """Health check for the job processing system."""
    try:
        # Get queue stats
        stats = await background_job_manager.get_queue_stats()

        # Calculate health score
        total_jobs = stats.get("total_jobs", 0)
        failed_jobs = stats.get("status_breakdown", {}).get("failed", 0)
        processing_jobs = stats.get("status_breakdown", {}).get("processing", 0)

        # Health indicators
        redis_connected = stats.get("redis_connected", False)
        queue_length = stats.get("queue_length", 0)

        # Calculate health score
        health_score = 100

        if not redis_connected:
            health_score = 0
        else:
            if total_jobs > 0:
                failure_rate = failed_jobs / total_jobs
                health_score -= failure_rate * 30

            if queue_length > 100:  # High queue backlog
                health_score -= 20

            if processing_jobs == 0 and queue_length > 0:  # No workers
                health_score -= 30

        health_score = max(0, health_score)

        # Determine status
        if health_score >= 80:
            health_status = "healthy"
        elif health_score >= 50:
            health_status = "degraded"
        else:
            health_status = "unhealthy"

        return {
            "status": health_status,
            "health_score": round(health_score, 1),
            "redis_connected": redis_connected,
            "queue_length": queue_length,
            "total_jobs": total_jobs,
            "failed_jobs": failed_jobs,
            "processing_jobs": processing_jobs,
            "details": stats
        }

    except Exception as e:
        logger.error(f"Job system health check failed: {e}")
        return {
            "status": "error",
            "health_score": 0,
            "error": str(e)
        }


# ===== ADMIN ENDPOINTS =====

@router.get("/admin/all-jobs")
async def list_all_jobs(
    limit: int = 100,
    status_filter: Optional[str] = None,
    current_user = Depends(get_current_active_user)
):
    """List all jobs for admin monitoring (admin only)."""
    try:
        # This would require additional implementation in background_job_manager
        # For now, return queue stats
        stats = await background_job_manager.get_queue_stats()

        return {
            "message": "Full job listing requires additional implementation",
            "queue_stats": stats,
            "note": "Use /queue/stats for current queue information"
        }

    except Exception as e:
        logger.error(f"Failed to list jobs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list jobs"
        )


@router.post("/admin/restart-failed")
async def restart_failed_jobs(
    max_jobs: int = 50,
    current_user = Depends(get_current_active_user)
):
    """Restart failed jobs (admin only)."""
    try:
        # This would require additional implementation
        return {
            "status": "not_implemented",
            "message": "Failed job restart functionality requires additional implementation"
        }

    except Exception as e:
        logger.error(f"Failed to restart failed jobs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restart jobs"
        )