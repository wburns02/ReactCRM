"""
Webhook event processor for RingCentral call events.
Handles event processing, deduplication, and automation pipeline triggers.
"""

import logging
import asyncio
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.config import settings
from app.models.ringcentral import RCWebhookEvent, CallLog, RCAccount
from app.services.call_processing_pipeline import CallProcessingPipeline, CallProcessingError
from app.services.ringcentral_service import RingCentralService
from app.services.background_jobs import background_job_manager, JobPriority
from app.database.base_class import get_db

logger = logging.getLogger(__name__)


class WebhookProcessingError(Exception):
    """Custom exception for webhook processing errors."""
    pass


class WebhookProcessor:
    """
    Processes RingCentral webhook events and triggers automation workflows.
    Handles deduplication, error recovery, and pipeline orchestration.
    """

    def __init__(self):
        """Initialize webhook processor."""
        self.processing_pipeline = CallProcessingPipeline()
        self.max_processing_attempts = 3
        self.processing_timeout = 300  # 5 minutes

        # Supported event types for processing
        self.supported_events = {
            "/restapi/v1.0/account/~/extension/~/telephony/sessions": self._process_call_session_event,
            "/restapi/v1.0/account/~/extension/~/recording": self._process_recording_event,
            "/restapi/v1.0/account/~/extension/~/call-log": self._process_call_log_event
        }

    async def process_webhook_event(
        self,
        event_id: str,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Process a webhook event and trigger appropriate automation workflows.

        Args:
            event_id: UUID of the webhook event to process
            db: Database session (optional)

        Returns:
            Dict with processing results

        Raises:
            WebhookProcessingError: If processing fails
        """
        start_time = time.time()

        if db is None:
            db = next(get_db())

        try:
            # Get webhook event
            webhook_event = db.query(RCWebhookEvent).filter(
                RCWebhookEvent.id == event_id
            ).first()

            if not webhook_event:
                raise WebhookProcessingError(f"Webhook event {event_id} not found")

            # Check if already processed
            if webhook_event.processed:
                logger.info(f"Webhook event {event_id} already processed")
                return {
                    "status": "already_processed",
                    "event_id": event_id,
                    "processing_status": webhook_event.processing_status
                }

            # Update processing status
            webhook_event.processing_status = "processing"
            webhook_event.processing_attempts += 1
            webhook_event.processing_started_at = datetime.utcnow()
            db.commit()

            logger.info(f"Processing webhook event {event_id} (attempt {webhook_event.processing_attempts})")

            # Check for duplicate events
            duplicate_check = await self._check_for_duplicates(webhook_event, db)
            if duplicate_check["is_duplicate"]:
                result = await self._handle_duplicate_event(webhook_event, duplicate_check, db)
                return result

            # Extract event information
            event_data = webhook_event.raw_payload
            event_type = webhook_event.event_type

            # Determine processing strategy
            processor_result = await self._route_event_processing(webhook_event, event_data, db)

            # Update webhook event with results
            processing_time = time.time() - start_time
            webhook_event.processed = True
            webhook_event.processing_status = processor_result["status"]
            webhook_event.processing_completed_at = datetime.utcnow()
            webhook_event.processing_duration_ms = round(processing_time * 1000)
            webhook_event.result_summary = processor_result.get("summary")

            # Store related entity IDs for tracking
            if "call_log_id" in processor_result:
                webhook_event.related_call_id = processor_result.get("rc_call_id")
                webhook_event.related_user_id = processor_result.get("user_id")

            db.commit()

            logger.info(
                f"Webhook event {event_id} processed successfully in {processing_time:.2f}s: "
                f"{processor_result['status']}"
            )

            return {
                "status": "completed",
                "event_id": event_id,
                "processing_time_seconds": processing_time,
                "event_type": event_type,
                "processor_result": processor_result
            }

        except Exception as e:
            # Update webhook event with error
            processing_time = time.time() - start_time

            if 'webhook_event' in locals():
                webhook_event.processing_status = "failed"
                webhook_event.processing_completed_at = datetime.utcnow()
                webhook_event.processing_duration_ms = round(processing_time * 1000)
                webhook_event.error_message = str(e)

                # Store error traceback for debugging
                import traceback
                webhook_event.error_traceback = traceback.format_exc()

                try:
                    db.commit()
                except Exception as commit_error:
                    logger.error(f"Failed to update webhook event after error: {commit_error}")

            logger.error(f"Webhook processing failed for event {event_id}: {e}")
            raise WebhookProcessingError(f"Webhook processing failed: {str(e)}") from e

    async def _check_for_duplicates(
        self,
        current_event: RCWebhookEvent,
        db: Session
    ) -> Dict[str, Any]:
        """Check for duplicate webhook events within a time window."""
        try:
            # Look for similar events in the last 10 minutes
            time_window = datetime.utcnow() - timedelta(minutes=10)

            similar_events = db.query(RCWebhookEvent).filter(
                and_(
                    RCWebhookEvent.event_type == current_event.event_type,
                    RCWebhookEvent.received_at >= time_window,
                    RCWebhookEvent.id != current_event.id,
                    RCWebhookEvent.processed == True
                )
            ).all()

            # Check for payload similarity (for call events, compare session IDs)
            current_payload = current_event.raw_payload
            for similar_event in similar_events:
                if self._are_events_duplicate(current_payload, similar_event.raw_payload):
                    return {
                        "is_duplicate": True,
                        "original_event_id": str(similar_event.id),
                        "original_processed_at": similar_event.processing_completed_at.isoformat()
                    }

            return {"is_duplicate": False}

        except Exception as e:
            logger.warning(f"Error checking for duplicates: {e}")
            return {"is_duplicate": False}

    def _are_events_duplicate(self, payload1: Dict[str, Any], payload2: Dict[str, Any]) -> bool:
        """Check if two webhook payloads represent the same event."""
        try:
            # For call events, compare session IDs
            if "body" in payload1 and "body" in payload2:
                body1 = payload1["body"]
                body2 = payload2["body"]

                # Check session ID
                session1 = body1.get("telephonySessionId")
                session2 = body2.get("telephonySessionId")

                if session1 and session2 and session1 == session2:
                    # Also check timestamp to ensure they're close
                    time1 = payload1.get("timestamp")
                    time2 = payload2.get("timestamp")

                    if time1 and time2:
                        # Consider events duplicate if within 30 seconds
                        time_diff = abs(int(time1) - int(time2))
                        return time_diff < 30000  # 30 seconds in milliseconds

                    return True

            return False

        except Exception as e:
            logger.warning(f"Error comparing event payloads: {e}")
            return False

    async def _handle_duplicate_event(
        self,
        webhook_event: RCWebhookEvent,
        duplicate_info: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Handle duplicate webhook event."""
        webhook_event.processed = True
        webhook_event.processing_status = "duplicate"
        webhook_event.processing_completed_at = datetime.utcnow()
        webhook_event.result_summary = f"Duplicate of event {duplicate_info['original_event_id']}"

        db.commit()

        logger.info(
            f"Webhook event {webhook_event.id} marked as duplicate of "
            f"{duplicate_info['original_event_id']}"
        )

        return {
            "status": "duplicate",
            "event_id": str(webhook_event.id),
            "original_event_id": duplicate_info["original_event_id"],
            "message": "Event identified as duplicate and skipped"
        }

    async def _route_event_processing(
        self,
        webhook_event: RCWebhookEvent,
        event_data: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Route webhook event to appropriate processor based on event type."""
        try:
            event_filter = event_data.get("subscriptionId", "")
            event_type = webhook_event.event_type

            logger.debug(f"Routing event type: {event_type}, filter: {event_filter}")

            # Check for call session events (call started, ended, etc.)
            if "telephony/sessions" in event_filter or "call-log" in event_filter:
                return await self._process_call_event(webhook_event, event_data, db)

            # Check for recording events
            elif "recording" in event_filter:
                return await self._process_recording_event(webhook_event, event_data, db)

            # Handle other event types
            else:
                logger.info(f"Unsupported event type: {event_type}")
                return {
                    "status": "unsupported",
                    "event_type": event_type,
                    "message": f"Event type {event_type} not supported for automation processing"
                }

        except Exception as e:
            logger.error(f"Error routing event {webhook_event.id}: {e}")
            return {
                "status": "routing_error",
                "error": str(e)
            }

    async def _process_call_event(
        self,
        webhook_event: RCWebhookEvent,
        event_data: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Process call session and call log events."""
        try:
            body = event_data.get("body", {})
            session_id = body.get("telephonySessionId")

            if not session_id:
                logger.warning(f"No session ID in call event {webhook_event.id}")
                return {
                    "status": "invalid",
                    "message": "No telephony session ID found in event"
                }

            # Determine the specific event type
            event_subtype = body.get("eventType", "unknown")

            logger.info(f"Processing call event: {event_subtype} for session {session_id}")

            # Handle different call event types
            if event_subtype in ["CallEnded", "CallDisconnected"]:
                return await self._handle_call_ended(webhook_event, body, db)

            elif event_subtype in ["CallStarted", "CallConnected"]:
                return await self._handle_call_started(webhook_event, body, db)

            elif event_subtype == "RecordingReady":
                return await self._handle_recording_ready(webhook_event, body, db)

            else:
                logger.debug(f"Call event {event_subtype} does not trigger automation")
                return {
                    "status": "no_action",
                    "event_subtype": event_subtype,
                    "message": f"Event {event_subtype} does not require automated processing"
                }

        except Exception as e:
            logger.error(f"Error processing call event {webhook_event.id}: {e}")
            return {
                "status": "processing_error",
                "error": str(e)
            }

    async def _handle_call_ended(
        self,
        webhook_event: RCWebhookEvent,
        event_body: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Handle call ended event - trigger automation pipeline."""
        try:
            session_id = event_body.get("telephonySessionId")
            account_id = event_body.get("accountId")
            extension_id = event_body.get("extensionId")

            # Find the corresponding call log
            call_log = db.query(CallLog).filter(
                CallLog.rc_session_id == session_id
            ).first()

            if not call_log:
                logger.warning(f"Call log not found for session {session_id}")

                # Try to sync this specific call from RingCentral
                sync_result = await self._sync_missing_call(session_id, account_id, extension_id, db)
                if sync_result["found"]:
                    call_log = sync_result["call_log"]
                else:
                    return {
                        "status": "call_not_found",
                        "session_id": session_id,
                        "message": "Call log not found and could not be synced"
                    }

            # Check if call has recording
            has_recording = event_body.get("hasRecording", call_log.has_recording)
            recording_url = event_body.get("recordingUrl")

            # Update call log with latest information
            call_log.has_recording = has_recording
            if recording_url:
                call_log.recording_url = recording_url

            db.commit()

            logger.info(f"Call ended for {call_log.rc_call_id}, has recording: {has_recording}")

            # Trigger automation pipeline for calls with recordings
            if has_recording:
                return await self._trigger_automation_pipeline(call_log, recording_url, db)
            else:
                # For calls without recordings, use basic disposition logic
                return await self._process_call_without_recording(call_log, db)

        except Exception as e:
            logger.error(f"Error handling call ended event: {e}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def _handle_call_started(
        self,
        webhook_event: RCWebhookEvent,
        event_body: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Handle call started event - basic tracking."""
        session_id = event_body.get("telephonySessionId")

        logger.info(f"Call started for session {session_id}")

        # Just log the call start - main processing happens on call end
        return {
            "status": "tracked",
            "session_id": session_id,
            "message": "Call start tracked, waiting for call end"
        }

    async def _handle_recording_ready(
        self,
        webhook_event: RCWebhookEvent,
        event_body: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Handle recording ready event - trigger processing if call ended."""
        try:
            session_id = event_body.get("telephonySessionId")
            recording_url = event_body.get("recordingUrl")
            recording_id = event_body.get("recordingId")

            # Find call log
            call_log = db.query(CallLog).filter(
                CallLog.rc_session_id == session_id
            ).first()

            if not call_log:
                logger.warning(f"Call log not found for recording ready event: session {session_id}")
                return {
                    "status": "call_not_found",
                    "session_id": session_id,
                    "message": "Call log not found for recording"
                }

            # Update recording information
            call_log.has_recording = True
            call_log.recording_url = recording_url
            call_log.recording_id = recording_id
            db.commit()

            logger.info(f"Recording ready for call {call_log.rc_call_id}")

            # If call is already ended, trigger processing
            if call_log.status in ["Completed", "No Answer", "Busy", "Failed"]:
                return await self._trigger_automation_pipeline(call_log, recording_url, db)
            else:
                return {
                    "status": "recording_ready",
                    "call_log_id": str(call_log.id),
                    "message": "Recording ready, waiting for call to end"
                }

        except Exception as e:
            logger.error(f"Error handling recording ready event: {e}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def _process_recording_event(
        self,
        webhook_event: RCWebhookEvent,
        event_data: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Process standalone recording events."""
        # Similar to _handle_recording_ready but for different event structure
        try:
            body = event_data.get("body", {})
            recording_id = body.get("recordingId")

            if not recording_id:
                return {
                    "status": "invalid",
                    "message": "No recording ID in event"
                }

            logger.info(f"Processing recording event for recording {recording_id}")

            # Find call log by recording ID
            call_log = db.query(CallLog).filter(
                CallLog.recording_id == recording_id
            ).first()

            if call_log:
                return await self._trigger_automation_pipeline(call_log, None, db)
            else:
                return {
                    "status": "call_not_found",
                    "recording_id": recording_id,
                    "message": "Call log not found for recording"
                }

        except Exception as e:
            logger.error(f"Error processing recording event: {e}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def _trigger_automation_pipeline(
        self,
        call_log: CallLog,
        recording_url: Optional[str],
        db: Session
    ) -> Dict[str, Any]:
        """Queue the full automation pipeline for a completed call."""
        try:
            logger.info(f"Queueing automation pipeline for call {call_log.rc_call_id}")

            # Check if already processed or queued
            if call_log.disposition_status in ["auto_applied", "manual", "processing"]:
                logger.info(f"Call {call_log.rc_call_id} already processed or processing")
                return {
                    "status": "already_processed",
                    "call_log_id": str(call_log.id),
                    "disposition_status": call_log.disposition_status
                }

            # Update call log status to indicate processing has started
            call_log.disposition_status = "processing"
            db.commit()

            # Queue the full pipeline job with high priority for webhook-triggered processing
            job_id = await background_job_manager.queue_call_processing(
                call_log_id=str(call_log.id),
                priority=JobPriority.HIGH,
                recording_url=recording_url
            )

            logger.info(f"Queued automation job {job_id} for call {call_log.rc_call_id}")

            return {
                "status": "pipeline_queued",
                "call_log_id": str(call_log.id),
                "rc_call_id": call_log.rc_call_id,
                "job_id": job_id,
                "priority": "high",
                "automation_triggered": True,
                "message": "Call processing job queued for automation pipeline"
            }

        except Exception as e:
            # Reset status on error
            call_log.disposition_status = "pending"
            db.commit()

            logger.error(f"Failed to queue automation pipeline for call {call_log.rc_call_id}: {e}")
            return {
                "status": "pipeline_queue_failed",
                "call_log_id": str(call_log.id),
                "error": str(e)
            }

    async def _process_call_without_recording(
        self,
        call_log: CallLog,
        db: Session
    ) -> Dict[str, Any]:
        """Process call without recording using basic disposition logic."""
        try:
            # Use the pipeline's no-recording handler
            result = await self.processing_pipeline._process_without_recording(
                str(call_log.id), db
            )

            return {
                "status": "processed_without_recording",
                "call_log_id": str(call_log.id),
                "rc_call_id": call_log.rc_call_id,
                "result": result
            }

        except Exception as e:
            logger.error(f"Error processing call without recording: {e}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def _sync_missing_call(
        self,
        session_id: str,
        account_id: str,
        extension_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """Try to sync a missing call from RingCentral API."""
        try:
            # Find user with this account/extension
            rc_account = db.query(RCAccount).filter(
                and_(
                    RCAccount.account_id == account_id,
                    RCAccount.extension_id == extension_id,
                    RCAccount.is_active == True
                )
            ).first()

            if not rc_account:
                logger.warning(f"No RC account found for account {account_id}, extension {extension_id}")
                return {"found": False, "reason": "No RC account found"}

            # Try to sync recent calls
            rc_service = RingCentralService(db=db, user_id=rc_account.user_id)
            sync_result = await rc_service.sync_calls(hours_back=1, force_refresh=True)

            # Check if the call was synced
            call_log = db.query(CallLog).filter(
                CallLog.rc_session_id == session_id
            ).first()

            if call_log:
                logger.info(f"Successfully synced missing call for session {session_id}")
                return {"found": True, "call_log": call_log}
            else:
                return {"found": False, "reason": "Call not found after sync"}

        except Exception as e:
            logger.error(f"Error syncing missing call: {e}")
            return {"found": False, "reason": f"Sync error: {str(e)}"}

    async def batch_process_failed_events(
        self,
        hours_back: int = 24,
        max_events: int = 100,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Batch process failed webhook events for recovery."""
        if db is None:
            db = next(get_db())

        try:
            since = datetime.utcnow() - timedelta(hours=hours_back)

            # Get failed events
            failed_events = db.query(RCWebhookEvent).filter(
                and_(
                    RCWebhookEvent.processing_status == "failed",
                    RCWebhookEvent.received_at >= since,
                    RCWebhookEvent.processing_attempts < self.max_processing_attempts
                )
            ).order_by(RCWebhookEvent.received_at.desc()).limit(max_events).all()

            if not failed_events:
                return {
                    "status": "no_failed_events",
                    "processed": 0,
                    "message": f"No failed events found in last {hours_back} hours"
                }

            logger.info(f"Reprocessing {len(failed_events)} failed webhook events")

            # Process events with concurrency limit
            semaphore = asyncio.Semaphore(3)  # Max 3 concurrent reprocessing

            async def reprocess_with_semaphore(event_id: str):
                async with semaphore:
                    try:
                        return await self.process_webhook_event(event_id, db)
                    except Exception as e:
                        logger.error(f"Reprocessing failed for event {event_id}: {e}")
                        return {"status": "reprocessing_failed", "error": str(e)}

            tasks = [reprocess_with_semaphore(str(event.id)) for event in failed_events]
            results = await asyncio.gather(*tasks)

            # Compile results
            successful = len([r for r in results if r.get("status") == "completed"])
            failed = len(results) - successful

            return {
                "status": "batch_completed",
                "total_events": len(failed_events),
                "successful": successful,
                "failed": failed,
                "results": results
            }

        except Exception as e:
            logger.error(f"Batch reprocessing failed: {e}")
            raise WebhookProcessingError(f"Batch processing failed: {str(e)}")