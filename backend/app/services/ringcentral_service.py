"""
RingCentral service for managing OAuth, API calls, and business logic.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from urllib.parse import urlencode
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ringcentral import SDK

from app.core.config import settings
from app.core.security import encrypt_token, decrypt_token
from app.models.ringcentral import RCAccount, CallLog, CallDisposition, RCWebhookEvent
from app.schemas.ringcentral import (
    RCStatusResponse, CallRecordResponse, CallListResponse,
    ExtensionResponse, InitiateCallRequest, SyncCallsRequest, UpdateCallRequest
)

logger = logging.getLogger(__name__)


class RingCentralError(Exception):
    """Custom exception for RingCentral-related errors."""
    pass


class RingCentralService:
    """
    Core service for RingCentral integration.
    Handles OAuth, API calls, and data synchronization.
    """

    def __init__(self, db: Session, user_id: str):
        self.db = db
        self.user_id = user_id
        self.rc_account = self._get_or_create_account()
        self._sdk = None

    # ===== ACCOUNT MANAGEMENT =====

    def _get_or_create_account(self) -> RCAccount:
        """Get or create RingCentral account for user."""
        account = self.db.query(RCAccount).filter(
            RCAccount.user_id == self.user_id
        ).first()

        if not account:
            account = RCAccount(user_id=self.user_id)
            self.db.add(account)
            self.db.commit()
            self.db.refresh(account)

        return account

    def get_account_status(self) -> RCStatusResponse:
        """Get current account connection status."""
        return RCStatusResponse(
            connected=self.rc_account.is_connected,
            configured=bool(self.rc_account.access_token),
            account_id=self.rc_account.account_id,
            account_name=self.rc_account.account_name,
            extension=self.rc_account.extension_number,
            user_name=self.rc_account.user_name,
            message=self.rc_account.last_error,
            last_sync_at=self.rc_account.last_sync_at.isoformat() if self.rc_account.last_sync_at else None
        )

    # ===== OAUTH FLOW =====

    def get_authorization_url(self, state: str) -> str:
        """Generate OAuth authorization URL."""
        params = {
            "response_type": "code",
            "client_id": settings.RINGCENTRAL_CLIENT_ID,
            "redirect_uri": settings.RINGCENTRAL_REDIRECT_URI,
            "state": state,
            "scope": "CallLog ReadCallLog ReadCallRecording"
        }

        base_url = f"{settings.RINGCENTRAL_SERVER_URL}/restapi/oauth/authorize"
        return f"{base_url}?{urlencode(params)}"

    async def handle_oauth_callback(self, code: str, state: str) -> RCAccount:
        """Handle OAuth callback and exchange code for tokens."""
        try:
            sdk = self._get_sdk()
            platform = sdk.platform()

            # Exchange code for tokens
            auth_response = platform.login(
                code=code,
                redirect_uri=settings.RINGCENTRAL_REDIRECT_URI
            )

            # Get token data
            token_data = platform.auth().data()

            # Update account with tokens and info
            await self._update_account_tokens(token_data)
            await self._fetch_account_info()

            # Mark as connected
            self.rc_account.is_connected = True
            self.rc_account.last_error = None
            self.db.commit()

            logger.info(f"OAuth successful for user {self.user_id}")
            return self.rc_account

        except Exception as e:
            error_msg = f"OAuth callback failed: {str(e)}"
            self.rc_account.last_error = error_msg
            self.rc_account.is_connected = False
            self.db.commit()
            logger.error(error_msg)
            raise RingCentralError(error_msg)

    async def _update_account_tokens(self, token_data: dict):
        """Update account with encrypted token data."""
        self.rc_account.access_token = encrypt_token(token_data.get("access_token", ""))
        self.rc_account.refresh_token = encrypt_token(token_data.get("refresh_token", ""))

        # Calculate expiration
        expires_in = token_data.get("expires_in", 3600)
        self.rc_account.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)

    async def _fetch_account_info(self):
        """Fetch and store account information from RingCentral."""
        try:
            sdk = await self._get_authenticated_sdk()
            platform = sdk.platform()

            # Get account info
            account_response = platform.get("/restapi/v1.0/account/~")
            account_data = account_response.json()

            self.rc_account.account_id = str(account_data.get("id"))
            self.rc_account.account_name = account_data.get("name")

            # Get extension info
            extension_response = platform.get("/restapi/v1.0/account/~/extension/~")
            extension_data = extension_response.json()

            self.rc_account.extension_id = str(extension_data.get("id"))
            self.rc_account.extension_number = extension_data.get("extensionNumber")
            self.rc_account.user_name = extension_data.get("name")
            self.rc_account.email = extension_data.get("contact", {}).get("email")

        except Exception as e:
            logger.error(f"Failed to fetch account info: {e}")
            raise

    # ===== SDK MANAGEMENT =====

    def _get_sdk(self) -> SDK:
        """Get uninitialized SDK instance."""
        return SDK(
            client_id=settings.RINGCENTRAL_CLIENT_ID,
            client_secret=settings.RINGCENTRAL_CLIENT_SECRET,
            server=settings.RINGCENTRAL_SERVER_URL
        )

    async def _get_authenticated_sdk(self) -> SDK:
        """Get SDK instance with valid authentication."""
        if self._sdk is None:
            self._sdk = self._get_sdk()
            platform = self._sdk.platform()

            if not self.rc_account.access_token:
                raise RingCentralError("No access token available")

            # Check if token needs refresh
            if self._token_needs_refresh():
                await self._refresh_token()

            # Set auth data
            platform.auth().set_data({
                "access_token": decrypt_token(self.rc_account.access_token),
                "refresh_token": decrypt_token(self.rc_account.refresh_token),
                "expires_in": int((self.rc_account.token_expires_at - datetime.utcnow()).total_seconds())
            })

        return self._sdk

    def _token_needs_refresh(self) -> bool:
        """Check if token needs refresh (within 5 minutes of expiry)."""
        if not self.rc_account.token_expires_at:
            return True
        return datetime.utcnow() + timedelta(minutes=5) >= self.rc_account.token_expires_at

    async def _refresh_token(self):
        """Refresh the access token using refresh token."""
        try:
            sdk = self._get_sdk()
            platform = sdk.platform()

            # Use refresh token
            auth_response = platform.refresh({
                "refresh_token": decrypt_token(self.rc_account.refresh_token)
            })

            # Update tokens
            token_data = platform.auth().data()
            await self._update_account_tokens(token_data)

            logger.info(f"Token refreshed for user {self.user_id}")
            self.db.commit()

        except Exception as e:
            error_msg = f"Token refresh failed: {str(e)}"
            self.rc_account.last_error = error_msg
            self.rc_account.is_connected = False
            self.db.commit()
            logger.error(error_msg)
            raise RingCentralError(error_msg)

    # ===== CALL MANAGEMENT =====

    async def get_calls(
        self,
        page: int = 1,
        page_size: int = 20,
        direction: Optional[str] = None,
        customer_id: Optional[str] = None
    ) -> CallListResponse:
        """Get paginated list of calls."""
        query = self.db.query(CallLog).filter(
            CallLog.user_id == self.user_id
        )

        # Apply filters
        if direction:
            query = query.filter(CallLog.direction == direction)
        if customer_id:
            query = query.filter(CallLog.customer_id == customer_id)

        # Get total count
        total = query.count()

        # Apply pagination
        offset = (page - 1) * page_size
        calls = query.order_by(desc(CallLog.start_time)).offset(offset).limit(page_size).all()

        # Convert to response format
        items = [self._call_to_response(call) for call in calls]

        return CallListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            has_next=offset + page_size < total,
            has_previous=page > 1
        )

    async def sync_calls(self, hours_back: int = 24, force_refresh: bool = False) -> dict:
        """Sync calls from RingCentral API."""
        try:
            # Check if recently synced
            if not force_refresh and self.rc_account.last_sync_at:
                time_since_sync = datetime.utcnow() - self.rc_account.last_sync_at
                if time_since_sync < timedelta(minutes=5):
                    return {"message": "Recently synced", "calls_imported": 0}

            sdk = await self._get_authenticated_sdk()
            platform = sdk.platform()

            # Calculate date range
            date_from = datetime.utcnow() - timedelta(hours=hours_back)

            # Request parameters
            params = {
                "dateFrom": date_from.isoformat(),
                "dateTo": datetime.utcnow().isoformat(),
                "view": "Detailed",
                "showBlocked": False,
                "withRecording": True,
                "perPage": 1000
            }

            # Fetch call log
            response = platform.get("/restapi/v1.0/account/~/extension/~/call-log", params)
            call_data = response.json()

            # Process calls
            imported_count = 0
            for call_record in call_data.get("records", []):
                if await self._import_call_record(call_record):
                    imported_count += 1

            # Update sync timestamp
            self.rc_account.last_sync_at = datetime.utcnow()
            self.rc_account.last_error = None
            self.db.commit()

            logger.info(f"Synced {imported_count} calls for user {self.user_id}")
            return {"message": "Sync completed", "calls_imported": imported_count}

        except Exception as e:
            error_msg = f"Call sync failed: {str(e)}"
            self.rc_account.last_error = error_msg
            self.db.commit()
            logger.error(error_msg)
            raise RingCentralError(error_msg)

    async def _import_call_record(self, rc_call_data: dict) -> bool:
        """Import a single call record from RingCentral."""
        rc_call_id = str(rc_call_data.get("id"))

        # Check if already exists
        existing = self.db.query(CallLog).filter(
            CallLog.rc_call_id == rc_call_id
        ).first()

        if existing:
            return False  # Already imported

        # Extract call information
        call_log = CallLog(
            rc_account_id=self.rc_account.id,
            user_id=self.user_id,
            rc_call_id=rc_call_id,
            rc_session_id=rc_call_data.get("sessionId"),

            # Participants
            from_number=rc_call_data.get("from", {}).get("phoneNumber", ""),
            to_number=rc_call_data.get("to", {}).get("phoneNumber", ""),
            from_name=rc_call_data.get("from", {}).get("name"),
            to_name=rc_call_data.get("to", {}).get("name"),

            # Metadata
            direction=rc_call_data.get("direction", "").lower(),
            status=rc_call_data.get("result"),
            call_type=rc_call_data.get("type"),

            # Timing
            start_time=self._parse_rc_datetime(rc_call_data.get("startTime")),
            duration_seconds=rc_call_data.get("duration"),

            # Recording
            has_recording=len(rc_call_data.get("recording", {}).get("recordings", [])) > 0,

            # Raw data
            metadata=rc_call_data
        )

        # Handle recordings
        recordings = rc_call_data.get("recording", {}).get("recordings", [])
        if recordings:
            first_recording = recordings[0]
            call_log.recording_id = str(first_recording.get("id"))
            call_log.recording_content_uri = first_recording.get("contentUri")
            call_log.recording_duration_seconds = first_recording.get("duration")

        self.db.add(call_log)
        self.db.commit()

        # Queue for background processing if has recording
        if call_log.has_recording:
            await self._queue_recording_processing(call_log.id)

        return True

    async def _queue_recording_processing(self, call_log_id: str):
        """Queue call for recording download and AI processing."""
        # This will be implemented when we add background job processing
        logger.info(f"Queued call {call_log_id} for recording processing")

    def _parse_rc_datetime(self, dt_string: Optional[str]) -> Optional[datetime]:
        """Parse RingCentral datetime string."""
        if not dt_string:
            return None
        try:
            return datetime.fromisoformat(dt_string.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return None

    # ===== CALL ACTIONS =====

    async def initiate_call(self, request: InitiateCallRequest) -> dict:
        """Initiate an outbound call."""
        try:
            sdk = await self._get_authenticated_sdk()
            platform = sdk.platform()

            # Prepare call request
            call_request = {
                "from": {"deviceId": self.rc_account.extension_id},
                "to": {"phoneNumber": request.to_number}
            }

            if request.from_number:
                call_request["from"]["phoneNumber"] = request.from_number

            # Make call
            response = platform.post("/restapi/v1.0/account/~/extension/~/ring-out", call_request)
            call_data = response.json()

            logger.info(f"Call initiated: {request.to_number}")
            return {
                "status": "initiated",
                "call_id": call_data.get("id"),
                "session_id": call_data.get("sessionId")
            }

        except Exception as e:
            error_msg = f"Call initiation failed: {str(e)}"
            logger.error(error_msg)
            raise RingCentralError(error_msg)

    async def update_call(self, call_id: str, request: UpdateCallRequest) -> CallRecordResponse:
        """Update call information."""
        call_log = self.db.query(CallLog).filter(
            CallLog.id == call_id,
            CallLog.user_id == self.user_id
        ).first()

        if not call_log:
            raise RingCentralError("Call not found")

        # Update fields
        if request.notes is not None:
            call_log.notes = request.notes
        if request.customer_id is not None:
            call_log.customer_id = request.customer_id
        if request.prospect_id is not None:
            call_log.prospect_id = request.prospect_id

        # Handle disposition
        if request.disposition:
            disposition = self.db.query(CallDisposition).filter(
                CallDisposition.name == request.disposition
            ).first()
            if disposition:
                call_log.disposition_id = disposition.id
                call_log.disposition_applied_by = "manual"
                call_log.disposition_applied_at = datetime.utcnow()

        self.db.commit()
        return self._call_to_response(call_log)

    # ===== EXTENSIONS =====

    async def get_extensions(self) -> List[ExtensionResponse]:
        """Get list of extensions."""
        try:
            sdk = await self._get_authenticated_sdk()
            platform = sdk.platform()

            response = platform.get("/restapi/v1.0/account/~/extension")
            extensions_data = response.json()

            extensions = []
            for ext in extensions_data.get("records", []):
                extensions.append(ExtensionResponse(
                    id=str(ext.get("id")),
                    extension_number=ext.get("extensionNumber", ""),
                    name=ext.get("name", ""),
                    email=ext.get("contact", {}).get("email"),
                    status=ext.get("status")
                ))

            return extensions

        except Exception as e:
            logger.error(f"Failed to get extensions: {e}")
            raise RingCentralError(f"Failed to get extensions: {e}")

    async def get_my_extension(self) -> ExtensionResponse:
        """Get current user's extension."""
        try:
            sdk = await self._get_authenticated_sdk()
            platform = sdk.platform()

            response = platform.get("/restapi/v1.0/account/~/extension/~")
            ext_data = response.json()

            return ExtensionResponse(
                id=str(ext_data.get("id")),
                extension_number=ext_data.get("extensionNumber", ""),
                name=ext_data.get("name", ""),
                email=ext_data.get("contact", {}).get("email"),
                status=ext_data.get("status")
            )

        except Exception as e:
            logger.error(f"Failed to get my extension: {e}")
            raise RingCentralError(f"Failed to get my extension: {e}")

    # ===== RECORDING MANAGEMENT =====

    async def get_recording_url(self, call_log: CallLog) -> Optional[str]:
        """Get public URL for recording playback."""
        if not call_log.recording_content_uri:
            return None

        try:
            sdk = await self._get_authenticated_sdk()
            platform = sdk.platform()

            # Get recording metadata
            response = platform.get(call_log.recording_content_uri)
            # This would typically return a temporary download URL
            # Implementation depends on how you want to serve recordings

            return call_log.recording_url  # Return stored URL for now

        except Exception as e:
            logger.error(f"Failed to get recording URL: {e}")
            return None

    async def download_recording(self, call_log: CallLog) -> Optional[str]:
        """Download recording file and return local path."""
        if not call_log.recording_content_uri or call_log.recording_downloaded:
            return call_log.recording_file_path

        try:
            sdk = await self._get_authenticated_sdk()
            platform = sdk.platform()

            # Download recording
            response = platform.get(call_log.recording_content_uri)
            audio_data = response.response().content

            # Generate file path
            filename = f"{call_log.rc_call_id}.mp3"
            file_path = f"/recordings/{self.user_id}/{filename}"

            # Save file (implementation depends on storage strategy)
            # For now, just mark as downloaded
            call_log.recording_downloaded = True
            call_log.recording_file_path = file_path
            self.db.commit()

            logger.info(f"Downloaded recording for call {call_log.rc_call_id}")
            return file_path

        except Exception as e:
            logger.error(f"Failed to download recording: {e}")
            return None

    # ===== WEBHOOK MANAGEMENT =====

    async def create_webhook_subscription(self) -> dict:
        """Create webhook subscription for real-time events."""
        try:
            sdk = await self._get_authenticated_sdk()
            platform = sdk.platform()

            webhook_request = {
                "eventFilters": [
                    "/restapi/v1.0/account/~/extension/~/telephony/sessions"
                ],
                "deliveryMode": {
                    "transportType": "WebHook",
                    "address": settings.RINGCENTRAL_WEBHOOK_URL,
                    "verificationToken": settings.RINGCENTRAL_WEBHOOK_SECRET
                },
                "expiresIn": 604800  # 7 days
            }

            response = platform.post("/restapi/v1.0/subscription", webhook_request)
            subscription_data = response.json()

            # Update account with subscription info
            self.rc_account.webhook_subscription_id = subscription_data.get("id")
            self.rc_account.webhook_expires_at = self._parse_rc_datetime(
                subscription_data.get("expirationTime")
            )
            self.db.commit()

            logger.info(f"Created webhook subscription for user {self.user_id}")
            return subscription_data

        except Exception as e:
            logger.error(f"Failed to create webhook subscription: {e}")
            raise RingCentralError(f"Failed to create webhook subscription: {e}")

    # ===== UTILITY METHODS =====

    def _call_to_response(self, call_log: CallLog) -> CallRecordResponse:
        """Convert CallLog model to response schema."""
        disposition_name = None
        if call_log.disposition:
            disposition_name = call_log.disposition.name

        return CallRecordResponse(
            id=str(call_log.id),
            rc_call_id=call_log.rc_call_id,
            from_number=call_log.from_number,
            to_number=call_log.to_number,
            from_name=call_log.from_name,
            to_name=call_log.to_name,
            direction=call_log.direction,
            status=call_log.status,
            start_time=call_log.start_time.isoformat() if call_log.start_time else None,
            end_time=call_log.end_time.isoformat() if call_log.end_time else None,
            duration_seconds=call_log.duration_seconds,
            has_recording=call_log.has_recording,
            recording_url=call_log.recording_url,
            transcription=call_log.transcription,
            ai_summary=call_log.ai_summary,
            sentiment=call_log.sentiment,
            sentiment_score=call_log.sentiment_score,
            customer_id=call_log.customer_id,
            contact_name=call_log.contact_name,
            notes=call_log.notes,
            disposition=disposition_name,
            disposition_confidence=call_log.disposition_confidence,
            created_at=call_log.created_at.isoformat()
        )


# ===== UTILITY FUNCTIONS =====

def get_ringcentral_sdk_for_account(rc_account: RCAccount) -> SDK:
    """Get initialized RingCentral SDK for a specific account."""
    sdk = SDK(
        client_id=settings.RINGCENTRAL_CLIENT_ID,
        client_secret=settings.RINGCENTRAL_CLIENT_SECRET,
        server=settings.RINGCENTRAL_SERVER_URL
    )

    if rc_account.access_token:
        platform = sdk.platform()
        platform.auth().set_data({
            "access_token": decrypt_token(rc_account.access_token),
            "refresh_token": decrypt_token(rc_account.refresh_token),
            "expires_in": int((rc_account.token_expires_at - datetime.utcnow()).total_seconds())
        })

    return sdk