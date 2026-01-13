"""
API endpoints for local AI service (R730 ML Workstation).
Provides health checks, testing, and configuration management.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import logging

from app.core.config import settings
from app.services.local_ai_service import local_ai_service, LocalAIError

logger = logging.getLogger(__name__)
router = APIRouter()


class AnalysisRequest(BaseModel):
    """Request model for transcript analysis."""
    transcript: str
    call_metadata: Optional[dict] = None


class TranscriptionRequest(BaseModel):
    """Request model for audio transcription."""
    audio_url: str
    language: str = "en"


class DispositionRequest(BaseModel):
    """Request model for disposition suggestion."""
    transcript: str
    available_dispositions: List[str]


@router.get("/health")
async def local_ai_health():
    """
    Check health of local AI services on R730.
    Returns status of Ollama and Whisper services.
    """
    try:
        health = await local_ai_service.health_check()
        return {
            "status": "healthy" if health["ollama"] else "degraded",
            "use_local_ai": settings.USE_LOCAL_AI,
            "services": health,
            "config": {
                "ollama_url": settings.OLLAMA_BASE_URL,
                "ollama_model": settings.OLLAMA_MODEL,
                "whisper_url": settings.WHISPER_BASE_URL,
                "whisper_model": settings.LOCAL_WHISPER_MODEL
            }
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "use_local_ai": settings.USE_LOCAL_AI
        }


@router.post("/analyze")
async def analyze_transcript(request: AnalysisRequest):
    """
    Analyze a call transcript using local Ollama LLM.

    Returns comprehensive analysis including sentiment, quality scores,
    disposition suggestion, and coaching insights.
    """
    if not settings.USE_LOCAL_AI:
        raise HTTPException(
            status_code=400,
            detail="Local AI is disabled. Set USE_LOCAL_AI=true in config."
        )

    try:
        result = await local_ai_service.analyze_call_transcript(
            transcript=request.transcript,
            call_metadata=request.call_metadata
        )
        return result
    except LocalAIError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/transcribe")
async def transcribe_audio(request: TranscriptionRequest):
    """
    Transcribe audio from URL using local Whisper on R730.

    Returns full transcript with segment-level timestamps.
    """
    if not settings.USE_LOCAL_AI:
        raise HTTPException(
            status_code=400,
            detail="Local AI is disabled. Set USE_LOCAL_AI=true in config."
        )

    try:
        result = await local_ai_service.transcribe_audio(
            audio_url=request.audio_url,
            language=request.language
        )
        return result
    except LocalAIError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@router.post("/suggest-disposition")
async def suggest_disposition(request: DispositionRequest):
    """
    Get AI-suggested disposition for a call transcript.

    Returns the suggested disposition from available options with confidence score.
    """
    if not settings.USE_LOCAL_AI:
        raise HTTPException(
            status_code=400,
            detail="Local AI is disabled. Set USE_LOCAL_AI=true in config."
        )

    try:
        result = await local_ai_service.suggest_disposition(
            transcript=request.transcript,
            available_dispositions=request.available_dispositions
        )
        return result
    except LocalAIError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        logger.error(f"Disposition suggestion error: {e}")
        raise HTTPException(status_code=500, detail=f"Suggestion failed: {str(e)}")


@router.post("/summarize")
async def summarize_call(transcript: str):
    """
    Generate a brief summary of a call transcript.
    """
    if not settings.USE_LOCAL_AI:
        raise HTTPException(
            status_code=400,
            detail="Local AI is disabled. Set USE_LOCAL_AI=true in config."
        )

    try:
        summary = await local_ai_service.generate_call_summary(transcript)
        return {"summary": summary}
    except Exception as e:
        logger.error(f"Summary error: {e}")
        raise HTTPException(status_code=500, detail=f"Summary failed: {str(e)}")


@router.get("/config")
async def get_local_ai_config():
    """
    Get current local AI configuration.
    """
    return {
        "use_local_ai": settings.USE_LOCAL_AI,
        "ollama": {
            "base_url": settings.OLLAMA_BASE_URL,
            "model": settings.OLLAMA_MODEL
        },
        "whisper": {
            "base_url": settings.WHISPER_BASE_URL,
            "model": settings.LOCAL_WHISPER_MODEL
        },
        "fallback_to_openai": not settings.USE_LOCAL_AI,
        "openai_model": settings.GPT_ANALYSIS_MODEL if not settings.USE_LOCAL_AI else None
    }
