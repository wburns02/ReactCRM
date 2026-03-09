"""
Twilio Voice endpoints for browser-based calling.
"""

import logging
from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response

from app.api.deps import get_current_active_user, User
from app.services import twilio_voice_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/status")
async def twilio_status(
    current_user: User = Depends(get_current_active_user),
):
    """Get Twilio connection status."""
    return twilio_voice_service.get_status()


@router.get("/token")
async def twilio_token(
    current_user: User = Depends(get_current_active_user),
):
    """Generate a Twilio Access Token for browser Voice SDK."""
    if not twilio_voice_service.is_configured():
        return {"error": "Twilio not configured", "token": None}

    identity = current_user.email or current_user.id
    token = twilio_voice_service.generate_access_token(identity)
    return {"token": token}


@router.post("/voice")
async def twilio_voice_webhook(request: Request):
    """
    TwiML webhook — Twilio calls this when the browser initiates a call.
    No auth (Twilio calls this directly).
    Reads 'To' and 'CallSid' from form data, returns TwiML XML.
    Injects <Stream> for real-time transcription when Google STT is enabled.
    """
    form = await request.form()
    to_number = form.get("To", "")
    call_sid = form.get("CallSid", "")

    if not to_number:
        logger.warning("Twilio voice webhook called without To number")
        return Response(
            content="<Response><Say>No destination number provided.</Say></Response>",
            media_type="application/xml",
        )

    # Build WebSocket base URL from the incoming request
    # Twilio calls our HTTPS endpoint; derive wss:// from that
    scheme = request.headers.get("x-forwarded-proto", "https")
    host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
    ws_scheme = "wss" if scheme == "https" else "ws"
    ws_base_url = f"{ws_scheme}://{host}"

    logger.info(f"Twilio voice webhook: dialing {to_number}, CallSid={call_sid}, stream_base={ws_base_url}")
    twiml = twilio_voice_service.build_outbound_twiml(
        to_number=str(to_number),
        call_sid=str(call_sid),
        ws_base_url=ws_base_url,
    )
    return Response(content=twiml, media_type="application/xml")
