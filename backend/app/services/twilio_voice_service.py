"""
Twilio Voice service for browser-based calling.
Generates access tokens for Twilio Voice SDK and builds TwiML for outbound calls.
"""

import logging
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VoiceGrant
from twilio.twiml.voice_response import VoiceResponse

from app.core.config import settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    """Check if all required Twilio env vars are set."""
    return all([
        settings.TWILIO_ACCOUNT_SID,
        settings.TWILIO_AUTH_TOKEN,
        settings.TWILIO_PHONE_NUMBER,
        settings.TWILIO_API_KEY,
        settings.TWILIO_API_SECRET,
        settings.TWILIO_TWIML_APP_SID,
    ])


def generate_access_token(identity: str) -> str:
    """
    Create a Twilio Access Token with VoiceGrant for browser calling.
    TTL = 1 hour.
    """
    token = AccessToken(
        settings.TWILIO_ACCOUNT_SID,
        settings.TWILIO_API_KEY,
        settings.TWILIO_API_SECRET,
        identity=identity,
        ttl=3600,
    )
    voice_grant = VoiceGrant(
        outgoing_application_sid=settings.TWILIO_TWIML_APP_SID,
        incoming_allow=True,
    )
    token.add_grant(voice_grant)
    return token.to_jwt()


def build_outbound_twiml(to_number: str, call_sid: str = "", ws_base_url: str = "") -> str:
    """
    Build TwiML XML for an outbound call.
    Called by Twilio when the browser initiates a call via the TwiML App.

    If Google STT is enabled and ws_base_url is provided, injects a <Stream>
    element so Twilio pipes the inbound audio to our media stream WebSocket.
    """
    from app.services.google_stt_service import is_available as stt_available

    response = VoiceResponse()

    # Inject media stream for real-time transcription if STT is available
    if stt_available() and ws_base_url:
        stream_url = f"{ws_base_url}/ws/twilio-media/{call_sid or 'unknown'}"
        start = response.start()
        start.stream(url=stream_url, track="inbound_track")
        logger.info(f"TwiML: injecting <Stream> → {stream_url}")

    dial = response.dial(caller_id=settings.TWILIO_PHONE_NUMBER)
    dial.number(to_number)
    return str(response)


def get_status() -> dict:
    """Return Twilio connection status for the frontend."""
    configured = is_configured()
    return {
        "connected": configured,
        "phone_number": settings.TWILIO_PHONE_NUMBER if configured else None,
        "message": "Twilio configured" if configured else "Twilio not configured — set TWILIO_API_KEY, TWILIO_API_SECRET, and TWILIO_TWIML_APP_SID",
    }
