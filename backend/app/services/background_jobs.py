"""
Background job processing system for call automation pipeline.
Handles async processing of transcription, analysis, and disposition tasks.
"""

import logging
import asyncio
import time
import json
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timedelta
from enum import Enum

import redis
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.call_transcript import TranscriptionJob
from app.models.call_analysis import AnalysisJob
from app.models.ringcentral import CallLog
from app.services.transcription_service import TranscriptionService, TranscriptionError
from app.services.call_analysis_service import CallAnalysisService, CallAnalysisError
from app.services.call_disposition_engine import CallDispositionEngine, DispositionEngineError
from app.database.base_class import get_db

logger = logging.getLogger(__name__)


class JobStatus(Enum):
    """Job status enumeration."""
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"


class JobPriority(Enum):
    """Job priority levels."""
    LOW = 100
    MEDIUM = 50
    HIGH = 25
    URGENT = 10


class BackgroundJobError(Exception):
    """Custom exception for background job errors."""
    pass


class BackgroundJobManager:
    """
    Background job processing manager using Redis for queue management.
    Handles job queuing, processing, monitoring, and retry logic.
    """

    def __init__(self):
        """Initialize background job manager."""
        self.redis_client = redis.from_url(settings.REDIS_URL)
        self.queue_name = settings.RQ_QUEUE_NAME

        # Services for processing
        self.transcription_service = TranscriptionService()
        self.analysis_service = CallAnalysisService()
        self.disposition_engine = CallDispositionEngine()

        # Job configuration
        self.max_retries = 3
        self.retry_delays = [60, 300, 900]  # 1 min, 5 min, 15 min
        self.default_timeout = 600  # 10 minutes

        # Job type registry
        self.job_handlers = {
            "transcribe_call": self._handle_transcription_job,
            "analyze_call": self._handle_analysis_job,
            "evaluate_disposition": self._handle_disposition_job,
            "process_full_pipeline": self._handle_full_pipeline_job,
            "sync_calls": self._handle_sync_calls_job,
            "cleanup_old_jobs": self._handle_cleanup_job
        }

    async def queue_job(
        self,
        job_type: str,
        job_data: Dict[str, Any],
        priority: JobPriority = JobPriority.MEDIUM,
        delay_seconds: int = 0,
        timeout: Optional[int] = None,
        max_retries: Optional[int] = None
    ) -> str:
        """
        Queue a background job for processing.

        Args:
            job_type: Type of job to process
            job_data: Job parameters and data
            priority: Job priority level
            delay_seconds: Delay before processing (optional)
            timeout: Job timeout in seconds (optional)
            max_retries: Maximum retry attempts (optional)

        Returns:
            Job ID for tracking

        Raises:
            BackgroundJobError: If job queuing fails
        """
        try:
            # Generate job ID
            job_id = f"{job_type}_{int(time.time() * 1000)}"

            # Prepare job payload
            job_payload = {
                "job_id": job_id,
                "job_type": job_type,
                "job_data": job_data,
                "priority": priority.value,
                "queued_at": datetime.utcnow().isoformat(),
                "timeout": timeout or self.default_timeout,
                "max_retries": max_retries or self.max_retries,
                "retry_count": 0,
                "status": JobStatus.QUEUED.value
            }

            # Add to priority queue
            queue_key = f"{self.queue_name}:queue"

            if delay_seconds > 0:
                # Delayed job - use sorted set with timestamp
                execute_at = time.time() + delay_seconds
                delayed_key = f"{self.queue_name}:delayed"
                self.redis_client.zadd(delayed_key, {json.dumps(job_payload): execute_at})
            else:
                # Immediate job - use priority queue
                self.redis_client.lpush(queue_key, json.dumps(job_payload))

            # Store job details
            job_key = f"{self.queue_name}:jobs:{job_id}"
            self.redis_client.setex(job_key, 86400, json.dumps(job_payload))  # 24 hour TTL

            logger.info(f"Queued {job_type} job {job_id} with priority {priority.name}")

            return job_id

        except Exception as e:
            logger.error(f"Failed to queue job {job_type}: {e}")
            raise BackgroundJobError(f"Job queuing failed: {str(e)}")

    async def queue_call_processing(
        self,
        call_log_id: str,
        priority: JobPriority = JobPriority.HIGH,
        recording_url: Optional[str] = None
    ) -> str:
        """Queue full call processing pipeline job."""
        job_data = {
            "call_log_id": call_log_id,
            "recording_url": recording_url,
            "processing_modules": ["transcription", "analysis", "disposition"]
        }

        return await self.queue_job(
            job_type="process_full_pipeline",
            job_data=job_data,
            priority=priority,
            timeout=900  # 15 minutes for full pipeline
        )

    async def queue_transcription(
        self,
        call_log_id: str,
        audio_url: Optional[str] = None,
        priority: JobPriority = JobPriority.MEDIUM
    ) -> str:
        """Queue call transcription job."""
        job_data = {
            "call_log_id": call_log_id,
            "audio_url": audio_url
        }

        return await self.queue_job(
            job_type="transcribe_call",
            job_data=job_data,
            priority=priority,
            timeout=600  # 10 minutes
        )

    async def queue_analysis(
        self,
        call_log_id: str,
        analysis_modules: Optional[List[str]] = None,
        priority: JobPriority = JobPriority.MEDIUM
    ) -> str:
        """Queue call analysis job."""
        job_data = {
            "call_log_id": call_log_id,
            "analysis_modules": analysis_modules
        }

        return await self.queue_job(
            job_type="analyze_call",
            job_data=job_data,
            priority=priority,
            timeout=300  # 5 minutes
        )

    async def queue_disposition(
        self,
        call_log_id: str,
        priority: JobPriority = JobPriority.HIGH
    ) -> str:
        """Queue call disposition evaluation job."""
        job_data = {
            "call_log_id": call_log_id
        }

        return await self.queue_job(
            job_type="evaluate_disposition",
            job_data=job_data,
            priority=priority,
            timeout=60  # 1 minute
        )

    async def process_jobs(self, worker_id: str = "worker_1", batch_size: int = 1):
        """
        Process jobs from the queue.
        This runs continuously as a worker process.
        """
        logger.info(f"Starting background job worker {worker_id}")

        while True:
            try:
                # Process delayed jobs first
                await self._process_delayed_jobs()

                # Get jobs from queue
                queue_key = f"{self.queue_name}:queue"
                job_data = self.redis_client.brpop(queue_key, timeout=5)

                if not job_data:
                    continue  # No jobs available, wait

                # Parse job
                job_payload = json.loads(job_data[1].decode('utf-8'))
                job_id = job_payload["job_id"]

                logger.info(f"Worker {worker_id} processing job {job_id}")

                # Process the job
                await self._process_job(job_payload, worker_id)

            except KeyboardInterrupt:
                logger.info(f"Worker {worker_id} shutting down")
                break
            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}")
                # Continue processing other jobs
                continue

    async def _process_delayed_jobs(self):
        """Move delayed jobs to active queue when their time comes."""
        try:
            delayed_key = f"{self.queue_name}:delayed"
            queue_key = f"{self.queue_name}:queue"
            current_time = time.time()

            # Get jobs ready for processing
            ready_jobs = self.redis_client.zrangebyscore(delayed_key, 0, current_time)

            for job_data in ready_jobs:
                # Move to active queue
                self.redis_client.lpush(queue_key, job_data)
                self.redis_client.zrem(delayed_key, job_data)

        except Exception as e:
            logger.error(f"Error processing delayed jobs: {e}")

    async def _process_job(self, job_payload: Dict[str, Any], worker_id: str):
        """Process an individual job."""
        job_id = job_payload["job_id"]
        job_type = job_payload["job_type"]

        try:
            # Update job status
            job_payload["status"] = JobStatus.PROCESSING.value
            job_payload["worker_id"] = worker_id
            job_payload["started_at"] = datetime.utcnow().isoformat()

            # Store updated status
            job_key = f"{self.queue_name}:jobs:{job_id}"
            self.redis_client.setex(job_key, 86400, json.dumps(job_payload))

            # Get job handler
            handler = self.job_handlers.get(job_type)
            if not handler:
                raise BackgroundJobError(f"No handler for job type: {job_type}")

            # Execute job with timeout
            start_time = time.time()
            timeout = job_payload.get("timeout", self.default_timeout)

            try:
                result = await asyncio.wait_for(
                    handler(job_payload["job_data"]),
                    timeout=timeout
                )
            except asyncio.TimeoutError:
                raise BackgroundJobError(f"Job timed out after {timeout} seconds")

            # Job completed successfully
            processing_time = time.time() - start_time
            job_payload["status"] = JobStatus.COMPLETED.value
            job_payload["completed_at"] = datetime.utcnow().isoformat()
            job_payload["processing_time"] = processing_time
            job_payload["result"] = result

            logger.info(f"Job {job_id} completed in {processing_time:.2f}s")

        except Exception as e:
            # Job failed
            logger.error(f"Job {job_id} failed: {e}")

            retry_count = job_payload.get("retry_count", 0)
            max_retries = job_payload.get("max_retries", self.max_retries)

            if retry_count < max_retries:
                # Queue for retry with delay
                await self._queue_retry(job_payload, str(e))
            else:
                # Mark as permanently failed
                job_payload["status"] = JobStatus.FAILED.value
                job_payload["failed_at"] = datetime.utcnow().isoformat()
                job_payload["error"] = str(e)

        finally:
            # Update final job status
            job_key = f"{self.queue_name}:jobs:{job_id}"
            self.redis_client.setex(job_key, 86400, json.dumps(job_payload))

    async def _queue_retry(self, job_payload: Dict[str, Any], error: str):
        """Queue job for retry with exponential backoff."""
        retry_count = job_payload.get("retry_count", 0)
        retry_delay = self.retry_delays[min(retry_count, len(self.retry_delays) - 1)]

        job_payload["retry_count"] = retry_count + 1
        job_payload["status"] = JobStatus.RETRYING.value
        job_payload["last_error"] = error

        # Add to delayed queue
        execute_at = time.time() + retry_delay
        delayed_key = f"{self.queue_name}:delayed"
        self.redis_client.zadd(delayed_key, {json.dumps(job_payload): execute_at})

        logger.info(
            f"Queued job {job_payload['job_id']} for retry {retry_count + 1} "
            f"in {retry_delay} seconds"
        )

    # ===== JOB HANDLERS =====

    async def _handle_transcription_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle call transcription job."""
        call_log_id = job_data["call_log_id"]
        audio_url = job_data.get("audio_url")

        try:
            result = await self.transcription_service.transcribe_call_recording(
                call_log_id=call_log_id,
                audio_url=audio_url
            )
            return result
        except TranscriptionError as e:
            raise BackgroundJobError(f"Transcription failed: {str(e)}")

    async def _handle_analysis_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle call analysis job."""
        call_log_id = job_data["call_log_id"]
        analysis_modules = job_data.get("analysis_modules")

        try:
            result = await self.analysis_service.analyze_call(
                call_log_id=call_log_id,
                analysis_modules=analysis_modules
            )
            return result
        except CallAnalysisError as e:
            raise BackgroundJobError(f"Analysis failed: {str(e)}")

    async def _handle_disposition_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle disposition evaluation job."""
        call_log_id = job_data["call_log_id"]

        try:
            result = await self.disposition_engine.evaluate_disposition(
                call_log_id=call_log_id
            )
            return result
        except DispositionEngineError as e:
            raise BackgroundJobError(f"Disposition evaluation failed: {str(e)}")

    async def _handle_full_pipeline_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle full call processing pipeline job."""
        call_log_id = job_data["call_log_id"]
        recording_url = job_data.get("recording_url")
        modules = job_data.get("processing_modules", ["transcription", "analysis", "disposition"])

        results = {}

        # Run modules in sequence
        if "transcription" in modules:
            transcription_result = await self._handle_transcription_job({
                "call_log_id": call_log_id,
                "audio_url": recording_url
            })
            results["transcription"] = transcription_result

        if "analysis" in modules and results.get("transcription", {}).get("status") == "success":
            analysis_result = await self._handle_analysis_job({
                "call_log_id": call_log_id
            })
            results["analysis"] = analysis_result

        if "disposition" in modules and results.get("analysis", {}).get("status") == "success":
            disposition_result = await self._handle_disposition_job({
                "call_log_id": call_log_id
            })
            results["disposition"] = disposition_result

        return {
            "status": "completed",
            "pipeline_results": results,
            "modules_processed": list(results.keys())
        }

    async def _handle_sync_calls_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle RingCentral calls sync job."""
        from app.services.ringcentral_service import RingCentralService

        user_id = job_data["user_id"]
        hours_back = job_data.get("hours_back", 24)
        force_refresh = job_data.get("force_refresh", False)

        try:
            db = next(get_db())
            rc_service = RingCentralService(db=db, user_id=user_id)
            result = await rc_service.sync_calls(
                hours_back=hours_back,
                force_refresh=force_refresh
            )
            return result
        except Exception as e:
            raise BackgroundJobError(f"Call sync failed: {str(e)}")

    async def _handle_cleanup_job(self, job_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handle cleanup of old jobs and data."""
        days_old = job_data.get("days_old", 7)

        try:
            # Clean up old job records
            cutoff_time = time.time() - (days_old * 86400)

            # Remove old completed jobs
            pattern = f"{self.queue_name}:jobs:*"
            keys = self.redis_client.keys(pattern)

            cleaned_count = 0
            for key in keys:
                job_data = self.redis_client.get(key)
                if job_data:
                    job_info = json.loads(job_data)
                    if (job_info.get("status") in ["completed", "failed"] and
                        job_info.get("completed_at") and
                        time.mktime(datetime.fromisoformat(job_info["completed_at"]).timetuple()) < cutoff_time):
                        self.redis_client.delete(key)
                        cleaned_count += 1

            return {
                "status": "completed",
                "cleaned_jobs": cleaned_count
            }
        except Exception as e:
            raise BackgroundJobError(f"Cleanup failed: {str(e)}")

    # ===== JOB MONITORING =====

    async def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """Get status of a specific job."""
        job_key = f"{self.queue_name}:jobs:{job_id}"
        job_data = self.redis_client.get(job_key)

        if not job_data:
            return {"status": "not_found"}

        job_info = json.loads(job_data)
        return {
            "job_id": job_id,
            "status": job_info.get("status"),
            "job_type": job_info.get("job_type"),
            "queued_at": job_info.get("queued_at"),
            "started_at": job_info.get("started_at"),
            "completed_at": job_info.get("completed_at"),
            "processing_time": job_info.get("processing_time"),
            "retry_count": job_info.get("retry_count", 0),
            "error": job_info.get("error"),
            "result": job_info.get("result")
        }

    async def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics and health information."""
        queue_key = f"{self.queue_name}:queue"
        delayed_key = f"{self.queue_name}:delayed"

        # Queue lengths
        queue_length = self.redis_client.llen(queue_key)
        delayed_count = self.redis_client.zcard(delayed_key)

        # Job status counts
        job_pattern = f"{self.queue_name}:jobs:*"
        job_keys = self.redis_client.keys(job_pattern)

        status_counts = {}
        for key in job_keys:
            job_data = self.redis_client.get(key)
            if job_data:
                job_info = json.loads(job_data)
                status = job_info.get("status", "unknown")
                status_counts[status] = status_counts.get(status, 0) + 1

        return {
            "queue_length": queue_length,
            "delayed_jobs": delayed_count,
            "total_jobs": len(job_keys),
            "status_breakdown": status_counts,
            "redis_connected": self.redis_client.ping(),
            "queue_name": self.queue_name
        }

    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a queued or processing job."""
        job_key = f"{self.queue_name}:jobs:{job_id}"
        job_data = self.redis_client.get(job_key)

        if not job_data:
            return False

        job_info = json.loads(job_data)

        # Can only cancel queued or retrying jobs
        if job_info.get("status") in ["queued", "retrying"]:
            job_info["status"] = JobStatus.CANCELLED.value
            job_info["cancelled_at"] = datetime.utcnow().isoformat()

            self.redis_client.setex(job_key, 86400, json.dumps(job_info))

            # Remove from queues if present
            queue_key = f"{self.queue_name}:queue"
            delayed_key = f"{self.queue_name}:delayed"

            # This is best-effort removal
            try:
                self.redis_client.lrem(queue_key, 0, json.dumps(job_info))
                self.redis_client.zrem(delayed_key, json.dumps(job_info))
            except:
                pass

            return True

        return False


# ===== GLOBAL INSTANCE =====
background_job_manager = BackgroundJobManager()