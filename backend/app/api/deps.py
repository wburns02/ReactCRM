"""
Dependency injection utilities for FastAPI endpoints.
"""

from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from ringcentral import SDK

from app.database.base_class import get_db
from app.core.config import settings
from app.models.ringcentral import RCAccount
from app.core.security import decode_access_token

# ===== SECURITY DEPENDENCIES =====
security = HTTPBearer()


class User:
    """Simplified user model for authentication."""

    def __init__(self, user_id: str, email: str, is_active: bool = True):
        self.id = user_id
        self.email = email
        self.is_active = is_active


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Get the current authenticated user from JWT token.
    This is a simplified implementation - integrate with your existing auth system.
    """
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # In a real implementation, you'd fetch user from database
    # For now, create a simple user object
    user = User(user_id=user_id, email=f"{user_id}@example.com")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


# ===== RINGCENTRAL DEPENDENCIES =====
def get_ringcentral_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Optional[RCAccount]:
    """Get the RingCentral account for the current user."""
    return db.query(RCAccount).filter(
        RCAccount.user_id == current_user.id
    ).first()


def get_ringcentral_account_or_404(
    rc_account: Optional[RCAccount] = Depends(get_ringcentral_account)
) -> RCAccount:
    """Get RingCentral account or raise 404 if not found."""
    if not rc_account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="RingCentral account not configured for user"
        )
    return rc_account


def get_ringcentral_sdk(
    rc_account: RCAccount = Depends(get_ringcentral_account_or_404)
) -> SDK:
    """Get initialized RingCentral SDK for the current user."""
    from app.services.ringcentral_service import get_ringcentral_sdk_for_account
    return get_ringcentral_sdk_for_account(rc_account)


# ===== DATABASE DEPENDENCIES =====
def get_database_session() -> Generator:
    """Get database session - alias for get_db for clarity."""
    yield from get_db()


# ===== VALIDATION DEPENDENCIES =====
def validate_webhook_signature():
    """Dependency to validate webhook signatures."""
    # This will be implemented in the webhook handler
    # Left as placeholder for now
    pass


# ===== PAGINATION DEPENDENCIES =====
class PaginationParams:
    """Pagination parameters for list endpoints."""

    def __init__(self, page: int = 1, page_size: int = 20):
        self.page = max(1, page)
        self.page_size = min(100, max(1, page_size))  # Limit to 100 items per page
        self.offset = (self.page - 1) * self.page_size


def get_pagination_params(page: int = 1, page_size: int = 20) -> PaginationParams:
    """Get pagination parameters for list endpoints."""
    return PaginationParams(page=page, page_size=page_size)


# ===== FEATURE FLAGS =====
def require_feature_enabled(feature_name: str):
    """Dependency factory to require a feature flag to be enabled."""

    def _require_feature():
        feature_enabled = getattr(settings, feature_name.upper(), False)
        if not feature_enabled:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Feature '{feature_name}' is currently disabled"
            )

    return _require_feature


# ===== RATE LIMITING DEPENDENCIES =====
class RateLimitParams:
    """Rate limiting parameters."""

    def __init__(self, limit: int, window: int):
        self.limit = limit
        self.window = window


def get_openai_rate_limit() -> RateLimitParams:
    """Get OpenAI API rate limiting parameters."""
    return RateLimitParams(
        limit=settings.OPENAI_RATE_LIMIT_RPM,
        window=60  # 1 minute
    )


def get_ringcentral_rate_limit() -> RateLimitParams:
    """Get RingCentral API rate limiting parameters."""
    return RateLimitParams(
        limit=settings.RINGCENTRAL_RATE_LIMIT_RPS,
        window=1  # 1 second
    )


# ===== BACKGROUND JOB DEPENDENCIES =====
def get_background_queue():
    """Get background job queue for async processing."""
    # This will be implemented when we add Celery/RQ
    # Left as placeholder for now
    pass


# ===== OPTIONAL USER DEPENDENCY =====
def get_current_user_optional(
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(
        HTTPBearer(auto_error=False)
    )
) -> Optional[User]:
    """Get current user if authenticated, None otherwise."""
    if not credentials:
        return None

    try:
        return get_current_user(db, credentials)
    except HTTPException:
        return None