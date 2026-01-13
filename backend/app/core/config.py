"""
Configuration settings for the CRM backend application.
Handles environment variables and app configuration.
"""

import os
from typing import Optional, List
from pydantic import validator
from pydantic_settings import BaseSettings
from cryptography.fernet import Fernet


class Settings(BaseSettings):
    """Application settings from environment variables."""

    # ===== APPLICATION SETTINGS =====
    APP_NAME: str = "ReactCRM API"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    # ===== DATABASE SETTINGS =====
    DATABASE_URL: str

    # ===== SECURITY SETTINGS =====
    SECRET_KEY: str
    ENCRYPTION_KEY: Optional[str] = None  # For encrypting RingCentral tokens
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_ALGORITHM: str = "HS256"

    # ===== CORS SETTINGS =====
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://react.ecbtx.com"
    ]

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    # ===== RINGCENTRAL INTEGRATION =====
    RINGCENTRAL_CLIENT_ID: str
    RINGCENTRAL_CLIENT_SECRET: str
    RINGCENTRAL_SERVER_URL: str = "https://platform.ringcentral.com"
    RINGCENTRAL_REDIRECT_URI: str
    RINGCENTRAL_WEBHOOK_SECRET: str
    RINGCENTRAL_WEBHOOK_URL: str  # Public URL for webhook delivery

    # ===== AI SERVICES =====
    OPENAI_API_KEY: str
    WHISPER_MODEL: str = "gpt-4o-transcribe"
    GPT_MODEL: str = "gpt-4o-mini"
    GPT_ANALYSIS_MODEL: str = "gpt-4o-mini"  # Cost-optimized for analysis

    # ===== LOCAL AI (R730 ML WORKSTATION) =====
    USE_LOCAL_AI: bool = True  # Set to True to use R730 instead of OpenAI
    OLLAMA_BASE_URL: str = "https://localhost-0.tailad2d5f.ts.net/ollama"
    OLLAMA_MODEL: str = "llama3.2:3b"
    WHISPER_BASE_URL: str = "https://localhost-0.tailad2d5f.ts.net/whisper"
    LOCAL_WHISPER_MODEL: str = "medium"

    # ===== ADDITIONAL AI SERVERS =====
    LLAVA_MODEL: str = "llava:13b"  # Vision model for photo/document analysis
    HCTG_AI_URL: str = "https://hctg-ai.tailad2d5f.ts.net"  # RTX 5090 server
    HCTG_AI_MODEL: str = "qwen2.5:32b"  # Heavy analysis tasks

    # ===== BACKGROUND PROCESSING =====
    REDIS_URL: str = "redis://localhost:6379/0"
    RQ_QUEUE_NAME: str = "call-processing"
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None

    # ===== STORAGE SETTINGS =====
    USE_S3: bool = False
    S3_BUCKET: str = ""
    S3_REGION: str = "us-east-1"
    S3_ACCESS_KEY_ID: Optional[str] = None
    S3_SECRET_ACCESS_KEY: Optional[str] = None
    LOCAL_STORAGE_PATH: str = "/var/crm/recordings"

    # ===== FEATURE FLAGS =====
    AUTO_DOWNLOAD_RECORDINGS: bool = True
    AUTO_SYNC_INTERVAL_MINUTES: int = 60
    ENABLE_AUTO_DISPOSITION: bool = True
    ENABLE_REAL_TIME_TRANSCRIPTION: bool = False  # Future feature

    # ===== DISPOSITION AUTOMATION =====
    AUTO_APPLY_CONFIDENCE_THRESHOLD: float = 75.0
    SUGGEST_CONFIDENCE_THRESHOLD: float = 60.0
    MAX_WAIT_FOR_RECORDING_SECONDS: int = 60
    MAX_WAIT_FOR_AI_ANALYSIS_SECONDS: int = 120

    # ===== RATE LIMITING =====
    OPENAI_RATE_LIMIT_RPM: int = 50  # Requests per minute
    RINGCENTRAL_RATE_LIMIT_RPS: int = 10  # Requests per second

    # ===== LOGGING =====
    LOG_LEVEL: str = "INFO"
    LOG_FILE: Optional[str] = None
    SENTRY_DSN: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True


# ===== GLOBAL SETTINGS INSTANCE =====
settings = Settings()


# ===== ENCRYPTION UTILITIES =====
def get_encryption_key() -> bytes:
    """Get or generate encryption key for sensitive data."""
    if settings.ENCRYPTION_KEY:
        return settings.ENCRYPTION_KEY.encode()

    # Generate a new key if not provided
    key = Fernet.generate_key()
    print(f"Generated new encryption key: {key.decode()}")
    print("Save this key to your .env file as ENCRYPTION_KEY")
    return key


def encrypt_sensitive_data(data: str) -> str:
    """Encrypt sensitive data like OAuth tokens."""
    if not data:
        return data

    f = Fernet(get_encryption_key())
    return f.encrypt(data.encode()).decode()


def decrypt_sensitive_data(encrypted_data: str) -> str:
    """Decrypt sensitive data like OAuth tokens."""
    if not encrypted_data:
        return encrypted_data

    f = Fernet(get_encryption_key())
    return f.decrypt(encrypted_data.encode()).decode()


# ===== VALIDATION UTILITIES =====
def validate_required_settings():
    """Validate that all required settings are present."""
    required_settings = [
        "DATABASE_URL",
        "SECRET_KEY",
        "RINGCENTRAL_CLIENT_ID",
        "RINGCENTRAL_CLIENT_SECRET",
        "RINGCENTRAL_REDIRECT_URI",
        "RINGCENTRAL_WEBHOOK_SECRET",
        "OPENAI_API_KEY"
    ]

    missing = []
    for setting in required_settings:
        if not getattr(settings, setting, None):
            missing.append(setting)

    if missing:
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")


# ===== DERIVED SETTINGS =====
def get_database_url() -> str:
    """Get the properly formatted database URL."""
    url = settings.DATABASE_URL

    # Handle Railway PostgreSQL URL format
    if url.startswith("postgresql://"):
        # Railway may use postgresql:// which some drivers don't support
        # Convert to postgres:// if needed
        url = url.replace("postgresql://", "postgres://", 1)

    return url


def get_recording_storage_path() -> str:
    """Get the recording storage path based on configuration."""
    if settings.USE_S3:
        return f"s3://{settings.S3_BUCKET}/recordings"
    return settings.LOCAL_STORAGE_PATH


def get_webhook_validation_url() -> str:
    """Get the webhook validation URL for RingCentral."""
    base_url = settings.RINGCENTRAL_WEBHOOK_URL.rstrip("/")
    return f"{base_url}/api/v2/webhooks/ringcentral"


# ===== LOGGING CONFIGURATION =====
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        },
        "detailed": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(module)s - %(funcName)s - %(message)s",
        },
    },
    "handlers": {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": "ext://sys.stdout",
        },
        "file": {
            "formatter": "detailed",
            "class": "logging.FileHandler",
            "filename": settings.LOG_FILE or "/tmp/crm-api.log",
        },
    },
    "root": {
        "level": settings.LOG_LEVEL,
        "handlers": ["default"] + (["file"] if settings.LOG_FILE else []),
    },
}

# Validate settings on import
try:
    validate_required_settings()
except ValueError as e:
    print(f"Configuration warning: {e}")