"""
Call transcription service using OpenAI Whisper API.
Handles audio file processing and transcription generation.
"""

import logging
import asyncio
import aiohttp
import time
from typing import Optional, Dict, Any
from pathlib import Path
from datetime import datetime, timedelta

import openai
from openai import AsyncOpenAI
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.ringcentral import CallLog
from app.database.base_class import get_db

logger = logging.getLogger(__name__)


class TranscriptionError(Exception):
    """Custom exception for transcription-related errors."""
    pass


class TranscriptionService:
    """Service for call recording transcription using OpenAI Whisper."""

    def __init__(self):
        """Initialize transcription service with OpenAI client."""
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.WHISPER_MODEL
        self.max_file_size = 25 * 1024 * 1024  # 25MB limit for Whisper API
        self.max_duration_seconds = 3600  # 1 hour limit

    async def transcribe_call_recording(
        self,
        call_log_id: str,
        audio_file_path: Optional[str] = None,
        audio_url: Optional[str] = None,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """
        Transcribe a call recording and update the database.

        Args:
            call_log_id: UUID of the call log
            audio_file_path: Local path to audio file (optional)
            audio_url: URL to download audio file (optional)
            db: Database session (optional)

        Returns:
            Dict with transcription results and metadata

        Raises:
            TranscriptionError: If transcription fails
        """
        start_time = time.time()

        # Get database session
        if db is None:
            db = next(get_db())

        try:
            # Get call log record
            call_log = db.query(CallLog).filter(CallLog.id == call_log_id).first()
            if not call_log:
                raise TranscriptionError(f"Call log {call_log_id} not found")

            # Update status to processing
            call_log.transcription_status = "processing"
            db.commit()

            logger.info(f"Starting transcription for call {call_log.rc_call_id}")

            # Get audio file
            audio_file = None
            if audio_file_path:
                audio_file = Path(audio_file_path)
                if not audio_file.exists():
                    raise TranscriptionError(f"Audio file not found: {audio_file_path}")
            elif audio_url:
                # Download audio file temporarily
                audio_file = await self._download_audio_file(audio_url, call_log.rc_call_id)
            elif call_log.recording_file_path:
                audio_file = Path(call_log.recording_file_path)
                if not audio_file.exists():
                    raise TranscriptionError(f"Stored audio file not found: {call_log.recording_file_path}")
            else:
                raise TranscriptionError(f"No audio source provided for call {call_log.rc_call_id}")

            # Validate audio file
            self._validate_audio_file(audio_file)

            # Perform transcription
            transcription_result = await self._transcribe_audio(audio_file)

            # Process transcription result
            transcript_text = transcription_result.get('text', '')
            transcript_segments = transcription_result.get('segments', [])
            transcript_language = transcription_result.get('language', 'en')

            # Update call log with transcription
            call_log.transcription = transcript_text
            call_log.transcription_status = "completed"

            # Store detailed transcription metadata
            metadata = call_log.metadata or {}
            metadata['transcription'] = {
                'language': transcript_language,
                'segments': transcript_segments,
                'duration': time.time() - start_time,
                'model': self.model,
                'created_at': datetime.utcnow().isoformat(),
                'file_size_bytes': audio_file.stat().st_size if audio_file.exists() else None
            }
            call_log.metadata = metadata

            db.commit()

            # Clean up temporary file if downloaded
            if audio_url and audio_file.exists():
                try:
                    audio_file.unlink()
                except Exception as e:
                    logger.warning(f"Failed to clean up temp file {audio_file}: {e}")

            processing_time = time.time() - start_time
            logger.info(
                f"Transcription completed for call {call_log.rc_call_id} "
                f"in {processing_time:.2f}s. Length: {len(transcript_text)} chars"
            )

            return {
                "status": "success",
                "call_log_id": call_log_id,
                "rc_call_id": call_log.rc_call_id,
                "transcript": transcript_text,
                "language": transcript_language,
                "segments": transcript_segments,
                "processing_time_seconds": processing_time,
                "character_count": len(transcript_text),
                "word_count": len(transcript_text.split()) if transcript_text else 0
            }

        except Exception as e:
            # Update status to failed
            if 'call_log' in locals() and call_log:
                call_log.transcription_status = "failed"

                # Store error details in metadata
                metadata = call_log.metadata or {}
                metadata['transcription_error'] = {
                    'error': str(e),
                    'error_type': type(e).__name__,
                    'occurred_at': datetime.utcnow().isoformat(),
                    'processing_time': time.time() - start_time
                }
                call_log.metadata = metadata

                try:
                    db.commit()
                except Exception as commit_error:
                    logger.error(f"Failed to update call log after transcription error: {commit_error}")

            logger.error(f"Transcription failed for call {call_log_id}: {e}")
            raise TranscriptionError(f"Transcription failed: {str(e)}") from e

    async def _download_audio_file(self, audio_url: str, call_id: str) -> Path:
        """Download audio file from URL to temporary location."""
        temp_dir = Path("/tmp/crm_recordings")
        temp_dir.mkdir(exist_ok=True)

        # Generate temporary filename
        timestamp = int(time.time())
        temp_file = temp_dir / f"call_{call_id}_{timestamp}.mp3"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(audio_url) as response:
                    if response.status != 200:
                        raise TranscriptionError(f"Failed to download audio: HTTP {response.status}")

                    # Check content length
                    content_length = response.headers.get('content-length')
                    if content_length and int(content_length) > self.max_file_size:
                        raise TranscriptionError(f"Audio file too large: {content_length} bytes")

                    # Download in chunks
                    with open(temp_file, 'wb') as f:
                        async for chunk in response.content.iter_chunked(8192):
                            f.write(chunk)

                            # Check file size during download
                            if f.tell() > self.max_file_size:
                                raise TranscriptionError(f"Audio file too large during download")

            logger.info(f"Downloaded audio file for call {call_id}: {temp_file}")
            return temp_file

        except Exception as e:
            # Clean up on failure
            if temp_file.exists():
                try:
                    temp_file.unlink()
                except:
                    pass
            raise TranscriptionError(f"Failed to download audio file: {str(e)}") from e

    def _validate_audio_file(self, audio_file: Path) -> None:
        """Validate audio file before transcription."""
        if not audio_file.exists():
            raise TranscriptionError(f"Audio file does not exist: {audio_file}")

        # Check file size
        file_size = audio_file.stat().st_size
        if file_size > self.max_file_size:
            raise TranscriptionError(
                f"Audio file too large: {file_size} bytes (max: {self.max_file_size})"
            )

        if file_size == 0:
            raise TranscriptionError(f"Audio file is empty: {audio_file}")

        # Check file extension (Whisper supports many formats)
        supported_extensions = {
            '.mp3', '.wav', '.m4a', '.flac', '.ogg', '.wma', '.aac', '.mp4', '.mov', '.avi'
        }
        if audio_file.suffix.lower() not in supported_extensions:
            logger.warning(
                f"Audio file has unsupported extension {audio_file.suffix}. "
                f"Supported: {supported_extensions}"
            )

        logger.debug(f"Audio file validation passed: {audio_file} ({file_size} bytes)")

    async def _transcribe_audio(self, audio_file: Path) -> Dict[str, Any]:
        """Perform the actual transcription using OpenAI Whisper."""
        try:
            logger.debug(f"Starting Whisper transcription: {audio_file}")

            with open(audio_file, 'rb') as f:
                # Create transcription with detailed response format
                response = await self.client.audio.transcriptions.create(
                    model=self.model,
                    file=f,
                    language='en',  # Assume English for now, can be auto-detected
                    response_format='verbose_json',  # Get detailed response with segments
                    timestamp_granularities=['segment']  # Get segment-level timestamps
                )

            # Convert response to dict for consistent handling
            result = {
                'text': response.text,
                'language': getattr(response, 'language', 'en'),
                'duration': getattr(response, 'duration', None),
                'segments': []
            }

            # Extract segments if available
            if hasattr(response, 'segments'):
                result['segments'] = [
                    {
                        'start': segment.start,
                        'end': segment.end,
                        'text': segment.text,
                        'confidence': getattr(segment, 'avg_logprob', None)
                    }
                    for segment in response.segments
                ]

            logger.debug(f"Transcription completed: {len(result['text'])} characters")
            return result

        except openai.OpenAIError as e:
            logger.error(f"OpenAI API error during transcription: {e}")
            raise TranscriptionError(f"OpenAI API error: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected error during transcription: {e}")
            raise TranscriptionError(f"Transcription error: {str(e)}") from e

    async def get_transcription_status(self, call_log_id: str, db: Optional[Session] = None) -> Dict[str, Any]:
        """Get the current transcription status for a call."""
        if db is None:
            db = next(get_db())

        call_log = db.query(CallLog).filter(CallLog.id == call_log_id).first()
        if not call_log:
            raise TranscriptionError(f"Call log {call_log_id} not found")

        metadata = call_log.metadata or {}
        transcription_meta = metadata.get('transcription', {})
        error_meta = metadata.get('transcription_error', {})

        return {
            "call_log_id": call_log_id,
            "rc_call_id": call_log.rc_call_id,
            "status": call_log.transcription_status,
            "has_transcript": bool(call_log.transcription),
            "transcript_preview": call_log.transcription[:200] + "..." if call_log.transcription and len(call_log.transcription) > 200 else call_log.transcription,
            "language": transcription_meta.get('language'),
            "character_count": len(call_log.transcription) if call_log.transcription else 0,
            "word_count": len(call_log.transcription.split()) if call_log.transcription else 0,
            "created_at": transcription_meta.get('created_at'),
            "processing_duration": transcription_meta.get('duration'),
            "error_message": error_meta.get('error'),
            "error_occurred_at": error_meta.get('occurred_at')
        }

    async def batch_transcribe_calls(
        self,
        call_log_ids: list[str],
        max_concurrent: int = 3,
        db: Optional[Session] = None
    ) -> Dict[str, Any]:
        """Transcribe multiple calls concurrently with rate limiting."""
        if db is None:
            db = next(get_db())

        # Create semaphore to limit concurrent transcriptions
        semaphore = asyncio.Semaphore(max_concurrent)

        async def transcribe_with_semaphore(call_id: str):
            async with semaphore:
                try:
                    return await self.transcribe_call_recording(call_id, db=db)
                except Exception as e:
                    logger.error(f"Batch transcription failed for call {call_id}: {e}")
                    return {"status": "error", "call_log_id": call_id, "error": str(e)}

        # Start all transcriptions
        start_time = time.time()
        tasks = [transcribe_with_semaphore(call_id) for call_id in call_log_ids]
        results = await asyncio.gather(*tasks)

        # Compile results
        successful = [r for r in results if r.get("status") == "success"]
        failed = [r for r in results if r.get("status") == "error"]

        total_time = time.time() - start_time

        logger.info(
            f"Batch transcription completed: {len(successful)} successful, "
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