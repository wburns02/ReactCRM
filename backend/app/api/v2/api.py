"""
Main API router for v2 endpoints.
"""

from fastapi import APIRouter

from app.api.v2.endpoints import ai_assistant, ringcentral, call_dispositions, webhooks, jobs, local_ai, admin_tools
from app.api.v2.endpoints import deployment_test, permits, properties

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

# Local AI (R730 ML Workstation) endpoints
api_router.include_router(
    local_ai.router,
    prefix="/local-ai",
    tags=["local-ai"]
)

# Admin tools for data management
api_router.include_router(
    admin_tools.router,
    prefix="/admin",
    tags=["admin"]
)
# Deployment test endpoint
api_router.include_router(
    deployment_test.router,
    prefix="/test",
    tags=["deployment-test"]
)

# Septic permit management endpoints (National Septic OCR)
api_router.include_router(
    permits.router,
    prefix="/permits",
    tags=["permits"]
)

# Property data endpoints (assessment data, building details)
api_router.include_router(
    properties.router,
    prefix="/properties",
    tags=["properties"]
)
