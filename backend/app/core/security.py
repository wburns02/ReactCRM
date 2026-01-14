"""
Security utilities for authentication and token management.
"""

from datetime import datetime, timedelta
from typing import Any, Union, Optional
from jose import jwt
from passlib.context import CryptContext
from cryptography.fernet import Fernet

from app.core.config import settings, get_encryption_key

# ===== PASSWORD HASHING =====
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(
    subject: Union[str, Any], expires_delta: timedelta = None
) -> str:
    """Create a JWT access token."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT access token."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.JWTError:
        return {}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)


# ===== TOKEN ENCRYPTION =====
def encrypt_token(token: str) -> str:
    """Encrypt a sensitive token for database storage."""
    if not token:
        return token

    f = Fernet(get_encryption_key())
    return f.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    """Decrypt a sensitive token from database storage."""
    if not encrypted_token:
        return encrypted_token

    f = Fernet(get_encryption_key())
    return f.decrypt(encrypted_token.encode()).decode()


# ===== WEBHOOK SIGNATURE VALIDATION =====
import hmac
import hashlib


def generate_webhook_signature(payload: bytes, secret: str) -> str:
    """Generate webhook signature for validation."""
    return hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()


def validate_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Validate webhook signature."""
    expected_signature = generate_webhook_signature(payload, secret)
    return hmac.compare_digest(expected_signature, signature)


# ===== RINGCENTRAL SPECIFIC SECURITY =====
def validate_ringcentral_webhook(
    payload: bytes,
    signature: str,
    validation_token: Optional[str] = None
) -> bool:
    """
    Validate RingCentral webhook signature.

    Args:
        payload: Request body as bytes
        signature: X-RingCentral-Signature header value
        validation_token: Validation-Token header for subscription validation

    Returns:
        True if signature is valid, False otherwise
    """
    if validation_token:
        # Initial webhook validation - echo back the validation token
        return True

    if not signature:
        return False

    # Remove 'sha256=' prefix if present
    if signature.startswith("sha256="):
        signature = signature[7:]

    return validate_webhook_signature(
        payload,
        signature,
        settings.RINGCENTRAL_WEBHOOK_SECRET
    )


# ===== STATE TOKEN GENERATION =====
import secrets


def generate_state_token() -> str:
    """Generate a secure state token for OAuth flows."""
    return secrets.token_urlsafe(32)


def generate_api_key() -> str:
    """Generate a secure API key."""
    return secrets.token_urlsafe(32)


# ===== SESSION UTILITIES =====
def generate_session_id() -> str:
    """Generate a secure session ID."""
    return secrets.token_urlsafe(16)


# ===== CORS UTILITIES =====
def validate_origin(origin: str, allowed_origins: list) -> bool:
    """Validate if origin is allowed for CORS."""
    if "*" in allowed_origins:
        return True
    return origin in allowed_origins


# ===== PII DETECTION AND REDACTION =====
import re


def detect_phone_numbers(text: str) -> list:
    """Detect phone numbers in text."""
    # Simple phone number pattern - can be enhanced
    pattern = r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b'
    return re.findall(pattern, text)


def detect_email_addresses(text: str) -> list:
    """Detect email addresses in text."""
    pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    return re.findall(pattern, text)


def redact_sensitive_info(text: str, replacement: str = "[REDACTED]") -> str:
    """Redact potentially sensitive information from text."""
    if not text:
        return text

    # Redact phone numbers
    text = re.sub(
        r'\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b',
        replacement,
        text
    )

    # Redact email addresses
    text = re.sub(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        replacement,
        text
    )

    # Redact potential SSNs
    text = re.sub(
        r'\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b',
        replacement,
        text
    )

    # Redact potential credit card numbers
    text = re.sub(
        r'\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b',
        replacement,
        text
    )

    return text