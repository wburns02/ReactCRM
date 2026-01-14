"""
Main FastAPI application for ReactCRM backend.
"""

from fastapi import FastAPI, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
import time
import traceback

from app.core.config import settings, LOGGING_CONFIG
from app.database.base_class import test_database_connection, get_database_info
from app.api.v2.api import api_router

# Configure logging
logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)

# ===== APPLICATION SETUP =====
def create_application() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.VERSION,
        description="Backend API for ReactCRM with RingCentral integration and AI features",
        openapi_url="/api/v2/openapi.json",
        docs_url="/api/v2/docs",
        redoc_url="/api/v2/redoc"
    )

    # ===== MIDDLEWARE =====
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Trusted host middleware (security)
    if not settings.DEBUG:
        app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=["*.ecbtx.com", "*.railway.app", "localhost"]
        )

    # ===== CUSTOM MIDDLEWARE =====
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """Log all HTTP requests."""
        start_time = time.time()

        # Get basic request info
        method = request.method
        url = str(request.url)

        try:
            response = await call_next(request)
            process_time = time.time() - start_time

            logger.info(
                f"{method} {url} - {response.status_code} - {process_time:.3f}s"
            )

            # Add timing header
            response.headers["X-Process-Time"] = str(process_time)
            return response

        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"{method} {url} - ERROR - {process_time:.3f}s - {str(e)}"
            )
            raise

    @app.middleware("http")
    async def catch_exceptions(request: Request, call_next):
        """Global exception handler."""
        try:
            return await call_next(request)
        except Exception as exc:
            logger.error(f"Unhandled exception: {exc}")
            if settings.DEBUG:
                logger.error(traceback.format_exc())

            return JSONResponse(
                status_code=500,
                content={
                    "detail": "Internal server error",
                    "error": str(exc) if settings.DEBUG else "Something went wrong"
                }
            )

    # ===== EXCEPTION HANDLERS =====
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        """Handle HTTP exceptions."""
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail,
                "status_code": exc.status_code
            }
        )

    @app.exception_handler(HTTPException)
    async def fastapi_exception_handler(request: Request, exc: HTTPException):
        """Handle FastAPI HTTP exceptions."""
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail,
                "status_code": exc.status_code
            }
        )

    # ===== STARTUP AND SHUTDOWN EVENTS =====
    @app.on_event("startup")
    async def startup_event():
        """Initialize application on startup."""
        logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION}")

        # Test database connection
        if test_database_connection():
            logger.info("Database connection successful")
        else:
            logger.error("Database connection failed!")

        # Log configuration
        logger.info(f"Debug mode: {settings.DEBUG}")
        logger.info(f"CORS origins: {settings.BACKEND_CORS_ORIGINS}")
        logger.info(f"RingCentral server: {settings.RINGCENTRAL_SERVER_URL}")
        logger.info(f"Auto-disposition enabled: {settings.ENABLE_AUTO_DISPOSITION}")

    @app.on_event("shutdown")
    async def shutdown_event():
        """Cleanup on application shutdown."""
        logger.info(f"Shutting down {settings.APP_NAME}")

    # ===== HEALTH CHECK ENDPOINTS =====
    @app.get("/health")
    async def health_check():
        """Basic health check endpoint."""
        return {
            "status": "healthy",
            "application": settings.APP_NAME,
            "version": settings.VERSION,
            "timestamp": time.time()
        }

    @app.get("/health/detailed")
    async def detailed_health_check():
        """Detailed health check with database and service status."""
        db_info = get_database_info()

        return {
            "status": "healthy",
            "application": settings.APP_NAME,
            "version": settings.VERSION,
            "timestamp": time.time(),
            "database": db_info,
            "features": {
                "auto_disposition": settings.ENABLE_AUTO_DISPOSITION,
                "auto_download_recordings": settings.AUTO_DOWNLOAD_RECORDINGS,
                "real_time_transcription": settings.ENABLE_REAL_TIME_TRANSCRIPTION
            },
            "integrations": {
                "ringcentral_configured": bool(settings.RINGCENTRAL_CLIENT_ID),
                "openai_configured": bool(settings.OPENAI_API_KEY),
                "redis_configured": bool(settings.REDIS_URL),
                "s3_configured": settings.USE_S3
            }
        }

    # ===== API ROUTES =====
    app.include_router(api_router, prefix="/api/v2")

    # ===== ROOT ENDPOINT =====
    @app.get("/")
    async def root():
        """Root endpoint with API information."""
        return {
            "message": f"Welcome to {settings.APP_NAME} API",
            "version": settings.VERSION,
            "docs_url": "/api/v2/docs",
            "openapi_url": "/api/v2/openapi.json",
            "health_url": "/health"
        }

    return app


# ===== APPLICATION INSTANCE =====
app = create_application()


# ===== ADDITIONAL ROUTES =====
@app.get("/api/v2/info")
async def api_info():
    """Get API information and capabilities."""
    return {
        "name": settings.APP_NAME,
        "version": settings.VERSION,
        "features": {
            "ringcentral_integration": True,
            "ai_transcription": True,
            "auto_disposition": True,
            "call_analytics": True,
            "webhook_support": True
        },
        "endpoints": {
            "ringcentral": "/api/v2/ringcentral/*",
            "calls": "/api/v2/calls/*",
            "dispositions": "/api/v2/call-dispositions/*",
            "webhooks": "/api/v2/webhooks/*",
            "ai_assistant": "/api/v2/ai-assistant/*"
        }
    }


# ===== DEVELOPMENT HELPERS =====
if settings.DEBUG:
    @app.get("/api/v2/debug/config")
    async def debug_config():
        """Debug endpoint to view configuration (only in debug mode)."""
        return {
            "database_url": settings.DATABASE_URL.split("@")[-1] if "@" in settings.DATABASE_URL else "***",
            "ringcentral_server": settings.RINGCENTRAL_SERVER_URL,
            "auto_disposition_threshold": settings.AUTO_APPLY_CONFIDENCE_THRESHOLD,
            "openai_model": settings.GPT_MODEL,
            "whisper_model": settings.WHISPER_MODEL,
            "redis_url": settings.REDIS_URL.split("@")[-1] if "@" in settings.REDIS_URL else settings.REDIS_URL,
            "cors_origins": settings.BACKEND_CORS_ORIGINS
        }


# ===== ENTRYPOINT =====
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )