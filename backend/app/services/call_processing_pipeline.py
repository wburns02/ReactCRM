"""
End-to-end call processing pipeline.
Orchestrates transcription, AI analysis, and auto-disposition workflow.
"""

import logging
import asyncio
import time
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ringcentral import CallLog
from app.models.call_transcript import CallTranscript, TranscriptionJob
from app.models.call_analysis import CallAnalysis, AnalysisJob
from app.services.transcription_service import TranscriptionService, TranscriptionError
from app.services.call_analysis_service import CallAnalysisService, CallAnalysisError
from app.database.base_class import get_db

logger = logging.getLogger(__name__)


class CallProcessingError(Exception):
    """Custom exception for call processing pipeline errors."""
    pass


class CallProcessingPipeline:
    """
    End-to-end call processing pipeline.
    Handles transcription, analysis, and disposition workflow.
    """

    def __init__(self):
        """Initialize processing services."""
        self.transcription_service = TranscriptionService()
        self.analysis_service = CallAnalysisService()
        self.max_processing_time = 600  # 10 minutes timeout
        self.max_concurrent_jobs = settings.MAX_CONCURRENT_TRANSCRIPTIONS

    async def process_call_complete(
        self,
        call_log_id: str,
        recording_url: Optional[str] = None,
        priority: int = 100,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Process a completed call through the full pipeline.

        Args:
            call_log_id: UUID of the call log
            recording_url: URL to download recording (optional)
            priority: Processing priority (lower = higher priority)
            db: Database session (optional)

        Returns:
            Dict with processing results

        Raises:
            CallProcessingError: If processing fails
        """
        start_time = time.time()

        # Get database session
        if db is None:
            db = next(get_db())

        try:
            # Get call log
            call_log = db.query(CallLog).filter(CallLog.id == call_log_id).first()
            if not call_log:
                raise CallProcessingError(f"Call log {call_log_id} not found")

            logger.info(f"Starting full processing pipeline for call {call_log.rc_call_id}")

            # Check if call has recording
            if not call_log.has_recording and not recording_url:
                logger.warning(f"Call {call_log.rc_call_id} has no recording - skipping transcription")
                return await self._process_without_recording(call_log_id, db)

            # Step 1: Transcription
            transcription_result = await self._process_transcription(
                call_log_id, recording_url, db
            )

            if transcription_result["status"] != "success":
                logger.error(f"Transcription failed for call {call_log.rc_call_id}")
                return transcription_result

            # Step 2: AI Analysis
            analysis_result = await self._process_analysis(call_log_id, db)

            if analysis_result["status"] != "success":
                logger.error(f"Analysis failed for call {call_log.rc_call_id}")
                return analysis_result

            # Step 3: Auto-disposition (if enabled)
            disposition_result = None
            if settings.ENABLE_AUTO_DISPOSITION:
                disposition_result = await self._process_auto_disposition(
                    call_log_id, analysis_result.get("results", {}), db
                )

            # Compile final results
            processing_time = time.time() - start_time

            # Update call log with final status
            call_log.transcription_status = "completed"
            call_log.analysis_status = "completed"
            if disposition_result and disposition_result.get("applied"):
                call_log.disposition_status = "auto_applied"
            elif disposition_result and disposition_result.get("suggested"):
                call_log.disposition_status = "suggested"
            else:
                call_log.disposition_status = "manual_required"

            db.commit()

            logger.info(
                f"Pipeline completed for call {call_log.rc_call_id} in {processing_time:.2f}s"
            )

            return {
                "status": "success",
                "call_log_id": call_log_id,
                "rc_call_id": call_log.rc_call_id,
                "processing_time_seconds": processing_time,
                "transcription": transcription_result,
                "analysis": analysis_result,
                "disposition": disposition_result,
                "pipeline_version": "1.0"
            }

        except Exception as e:
            logger.error(f"Pipeline failed for call {call_log_id}: {e}")

            # Update call log with error status
            if 'call_log' in locals() and call_log:
                if not call_log.transcription_status == "completed":
                    call_log.transcription_status = "failed"
                if not call_log.analysis_status == "completed":
                    call_log.analysis_status = "failed"
                if not call_log.disposition_status in ["auto_applied", "suggested"]:
                    call_log.disposition_status = "failed"

                # Store error in metadata
                metadata = call_log.metadata or {}
                metadata['pipeline_error'] = {
                    'error': str(e),
                    'error_type': type(e).__name__,
                    'occurred_at': datetime.utcnow().isoformat(),
                    'processing_time': time.time() - start_time
                }
                call_log.metadata = metadata

                try:
                    db.commit()
                except Exception as commit_error:
                    logger.error(f"Failed to update call log after pipeline error: {commit_error}")

            raise CallProcessingError(f"Pipeline processing failed: {str(e)}") from e

    async def _process_transcription(
        self,
        call_log_id: str,
        recording_url: Optional[str],
        db: Session
    ) -> Dict[str, Any]:
        """Process call transcription step."""
        try:
            logger.debug(f"Starting transcription for call {call_log_id}")

            # Check if transcription already exists
            existing_transcript = db.query(CallTranscript).filter(
                CallTranscript.call_log_id == call_log_id
            ).first()

            if existing_transcript and existing_transcript.status == "completed":
                logger.info(f"Transcription already exists for call {call_log_id}")
                return {
                    "status": "success",
                    "message": "Transcription already exists",
                    "transcript_id": str(existing_transcript.id),
                    "character_count": existing_transcript.character_count,
                    "word_count": existing_transcript.word_count
                }

            # Perform transcription
            result = await self.transcription_service.transcribe_call_recording(
                call_log_id=call_log_id,
                audio_url=recording_url,
                db=db
            )

            logger.info(f"Transcription completed for call {call_log_id}")
            return result

        except TranscriptionError as e:
            logger.error(f"Transcription error for call {call_log_id}: {e}")
            return {
                "status": "error",
                "error": str(e),
                "step": "transcription"
            }

    async def _process_analysis(self, call_log_id: str, db: Session) -> Dict[str, Any]:
        """Process AI analysis step."""
        try:
            logger.debug(f"Starting analysis for call {call_log_id}")

            # Check if analysis already exists
            existing_analysis = db.query(CallAnalysis).filter(
                CallAnalysis.call_log_id == call_log_id
            ).first()

            if existing_analysis and existing_analysis.status == "completed":
                logger.info(f"Analysis already exists for call {call_log_id}")
                return {
                    "status": "success",
                    "message": "Analysis already exists",
                    "analysis_id": str(existing_analysis.id),
                    "results": existing_analysis.summary_scores
                }

            # Perform analysis
            result = await self.analysis_service.analyze_call(
                call_log_id=call_log_id,
                db=db
            )

            logger.info(f"Analysis completed for call {call_log_id}")
            return result

        except CallAnalysisError as e:
            logger.error(f"Analysis error for call {call_log_id}: {e}")
            return {
                "status": "error",
                "error": str(e),
                "step": "analysis"
            }

    async def _process_auto_disposition(
        self,
        call_log_id: str,
        analysis_results: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Process auto-disposition step."""
        try:
            logger.debug(f"Starting auto-disposition for call {call_log_id}")

            # Get predicted disposition from analysis
            predicted_disposition = analysis_results.get("predicted_disposition")
            disposition_confidence = analysis_results.get("disposition_confidence", 0)

            if not predicted_disposition:
                logger.warning(f"No disposition prediction available for call {call_log_id}")
                return {
                    "status": "skipped",
                    "reason": "No disposition prediction available"
                }

            # Apply confidence-based logic
            auto_apply_threshold = settings.AUTO_APPLY_CONFIDENCE_THRESHOLD
            suggest_threshold = settings.SUGGEST_CONFIDENCE_THRESHOLD

            call_log = db.query(CallLog).filter(CallLog.id == call_log_id).first()

            if disposition_confidence >= auto_apply_threshold:
                # Auto-apply disposition
                return await self._apply_disposition(
                    call_log, predicted_disposition, disposition_confidence,
                    "auto_applied", analysis_results, db
                )
            elif disposition_confidence >= suggest_threshold:
                # Suggest disposition for manual review
                return await self._suggest_disposition(
                    call_log, predicted_disposition, disposition_confidence,
                    analysis_results, db
                )
            else:
                # Manual disposition required
                logger.info(
                    f"Low confidence ({disposition_confidence}%) for call {call_log_id} - "
                    "manual disposition required"
                )
                return {
                    "status": "manual_required",
                    "confidence": disposition_confidence,
                    "predicted_disposition": predicted_disposition,
                    "reason": f"Confidence {disposition_confidence}% below threshold {suggest_threshold}%"
                }

        except Exception as e:
            logger.error(f"Auto-disposition error for call {call_log_id}: {e}")
            return {
                "status": "error",
                "error": str(e),
                "step": "auto_disposition"
            }

    async def _apply_disposition(
        self,
        call_log: CallLog,
        disposition_name: str,
        confidence: float,
        applied_by: str,
        analysis_results: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Apply disposition automatically."""
        try:
            # Find disposition by name
            from app.models.ringcentral import CallDisposition, CallDispositionHistory

            disposition = db.query(CallDisposition).filter(
                CallDisposition.name == disposition_name,
                CallDisposition.is_active == True
            ).first()

            if not disposition:
                logger.warning(f"Disposition '{disposition_name}' not found")
                return {
                    "status": "error",
                    "error": f"Disposition '{disposition_name}' not found"
                }

            # Update call log
            call_log.disposition_id = disposition.id
            call_log.disposition_confidence = confidence
            call_log.disposition_applied_by = applied_by
            call_log.disposition_applied_at = datetime.utcnow()
            call_log.disposition_status = "auto_applied"

            # Create history record
            history = CallDispositionHistory(
                call_log_id=call_log.id,
                disposition_id=disposition.id,
                action_type=applied_by,
                applied_by_type="system",
                disposition_name=disposition_name,
                confidence_score=confidence,
                reasoning=analysis_results.get("disposition_reasoning"),
                alternative_suggestions=analysis_results.get("alternative_dispositions"),
                applied_at=datetime.utcnow()
            )

            db.add(history)
            db.commit()

            logger.info(
                f"Auto-applied disposition '{disposition_name}' to call {call_log.rc_call_id} "
                f"with {confidence}% confidence"
            )

            return {
                "status": "success",
                "applied": True,
                "disposition": disposition_name,
                "confidence": confidence,
                "action": applied_by,
                "disposition_id": str(disposition.id),
                "history_id": str(history.id)
            }

        except Exception as e:
            logger.error(f"Failed to apply disposition: {e}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def _suggest_disposition(
        self,
        call_log: CallLog,
        disposition_name: str,
        confidence: float,
        analysis_results: Dict[str, Any],
        db: Session
    ) -> Dict[str, Any]:
        """Suggest disposition for manual review."""
        try:
            # Store suggestion in call log metadata
            metadata = call_log.metadata or {}
            metadata['suggested_disposition'] = {
                'disposition_name': disposition_name,
                'confidence': confidence,
                'reasoning': analysis_results.get("disposition_reasoning"),
                'alternatives': analysis_results.get("alternative_dispositions"),
                'suggested_at': datetime.utcnow().isoformat()
            }
            call_log.metadata = metadata
            call_log.disposition_status = "suggested"

            db.commit()

            logger.info(
                f"Suggested disposition '{disposition_name}' for call {call_log.rc_call_id} "
                f"with {confidence}% confidence"
            )

            return {
                "status": "success",
                "suggested": True,
                "disposition": disposition_name,
                "confidence": confidence,
                "action": "suggested",
                "alternatives": analysis_results.get("alternative_dispositions", [])
            }

        except Exception as e:
            logger.error(f"Failed to suggest disposition: {e}")
            return {
                "status": "error",
                "error": str(e)
            }

    async def _process_without_recording(self, call_log_id: str, db: Session) -> Dict[str, Any]:
        """Process call without recording (basic disposition only)."""
        try:
            call_log = db.query(CallLog).filter(CallLog.id == call_log_id).first()

            # Basic disposition based on call metadata
            basic_disposition = self._determine_basic_disposition(call_log)

            if basic_disposition:
                disposition_result = await self._apply_disposition(
                    call_log, basic_disposition, 90.0, "auto_applied",
                    {"disposition_reasoning": ["No recording available", "Based on call metadata"]}, db
                )
            else:
                disposition_result = {
                    "status": "manual_required",
                    "reason": "No recording available and unable to determine basic disposition"
                }

            call_log.transcription_status = "skipped"
            call_log.analysis_status = "skipped"
            db.commit()

            return {
                "status": "success",
                "call_log_id": call_log_id,
                "rc_call_id": call_log.rc_call_id,
                "transcription": {"status": "skipped", "reason": "No recording"},
                "analysis": {"status": "skipped", "reason": "No recording"},
                "disposition": disposition_result
            }

        except Exception as e:
            logger.error(f"Failed to process call without recording: {e}")
            raise CallProcessingError(f"Failed to process call without recording: {str(e)}")

    def _determine_basic_disposition(self, call_log: CallLog) -> Optional[str]:
        """Determine basic disposition based on call metadata when no recording is available."""
        # Basic disposition logic based on call status and duration
        if call_log.status == "No Answer":
            return "No Answer"
        elif call_log.status == "Busy":
            return "No Answer"
        elif call_log.duration_seconds and call_log.duration_seconds < 30:
            return "No Answer"
        elif call_log.status == "Completed" and call_log.duration_seconds and call_log.duration_seconds > 60:
            return "Information Provided"
        else:
            return None  # Manual disposition required

    async def batch_process_calls(
        self,
        call_log_ids: List[str],
        max_concurrent: Optional[int] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Process multiple calls concurrently."""
        if db is None:
            db = next(get_db())

        if max_concurrent is None:
            max_concurrent = self.max_concurrent_jobs

        # Create semaphore to limit concurrent processing
        semaphore = asyncio.Semaphore(max_concurrent)

        async def process_with_semaphore(call_id: str):
            async with semaphore:
                try:
                    return await self.process_call_complete(call_id, db=db)
                except Exception as e:
                    logger.error(f"Batch processing failed for call {call_id}: {e}")
                    return {"status": "error", "call_log_id": call_id, "error": str(e)}

        # Start all processing jobs
        start_time = time.time()
        tasks = [process_with_semaphore(call_id) for call_id in call_log_ids]
        results = await asyncio.gather(*tasks)

        # Compile batch results
        successful = [r for r in results if r.get("status") == "success"]
        failed = [r for r in results if r.get("status") == "error"]

        total_time = time.time() - start_time

        logger.info(
            f"Batch processing completed: {len(successful)} successful, "
            f"{len(failed)} failed, {total_time:.2f}s total"
        )

        return {
            "status": "completed",
            "total_calls": len(call_log_ids),
            "successful": len(successful),
            "failed": len(failed),
            "processing_time_seconds": total_time,
            "results": results
        }

    async def get_processing_status(self, call_log_id: str, db: Optional[Session] = None) -> Dict[str, Any]:
        """Get current processing status for a call."""
        if db is None:
            db = next(get_db())

        call_log = db.query(CallLog).filter(CallLog.id == call_log_id).first()
        if not call_log:
            raise CallProcessingError(f"Call log {call_log_id} not found")

        transcript = db.query(CallTranscript).filter(
            CallTranscript.call_log_id == call_log_id
        ).first()

        analysis = db.query(CallAnalysis).filter(
            CallAnalysis.call_log_id == call_log_id
        ).first()

        return {
            "call_log_id": call_log_id,
            "rc_call_id": call_log.rc_call_id,
            "transcription": {
                "status": call_log.transcription_status,
                "has_transcript": bool(transcript and transcript.full_transcript),
                "word_count": transcript.word_count if transcript else 0
            },
            "analysis": {
                "status": call_log.analysis_status,
                "has_analysis": bool(analysis),
                "quality_score": analysis.overall_quality_score if analysis else None,
                "sentiment": analysis.overall_sentiment if analysis else None,
                "escalation_risk": analysis.escalation_risk if analysis else None
            },
            "disposition": {
                "status": call_log.disposition_status,
                "current_disposition": call_log.disposition.name if call_log.disposition else None,
                "confidence": call_log.disposition_confidence,
                "applied_by": call_log.disposition_applied_by,
                "applied_at": call_log.disposition_applied_at.isoformat() if call_log.disposition_applied_at else None
            },
            "overall_status": self._determine_overall_status(call_log)
        }

    def _determine_overall_status(self, call_log: CallLog) -> str:
        """Determine overall processing status."""
        statuses = [
            call_log.transcription_status,
            call_log.analysis_status,
            call_log.disposition_status
        ]

        if any(status == "processing" for status in statuses):
            return "processing"
        elif any(status == "failed" for status in statuses):
            return "failed"
        elif all(status in ["completed", "auto_applied", "suggested", "skipped"] for status in statuses):
            return "completed"
        else:
            return "pending"