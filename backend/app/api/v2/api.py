"""
Main API router for v2 endpoints.
"""

from fastapi import APIRouter

from app.api.v2.endpoints import ai_assistant, ringcentral, call_dispositions, webhooks, jobs

# Create main API router
api_router = APIRouter()

# Include existing endpoints
api_router.include_router(
    ai_assistant.router,
    prefix="/ai-assistant",
    tags=["ai-assistant"]
)

# RingCentral integration endpoints
api_router.include_router(
    ringcentral.router,
    prefix="/ringcentral",
    tags=["ringcentral"]
)

# Call disposition management endpoints
api_router.include_router(
    call_dispositions.router,
    prefix="/call-dispositions",
    tags=["call-dispositions"]
)

# Webhook endpoints for real-time event processing
api_router.include_router(
    webhooks.router,
    prefix="/webhooks",
    tags=["webhooks"]
)

# Background job management endpoints
api_router.include_router(
    jobs.router,
    prefix="/jobs",
    tags=["jobs"]
)