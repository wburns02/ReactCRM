"""
Simple deployment test endpoint to verify new deployments work.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/deployment-test")
async def deployment_test():
    """Test endpoint to verify deployment is working."""
    return {
        "status": "success",
        "message": "Deployment test endpoint working",
        "timestamp": "2026-01-14T15:00:00Z"
    }
