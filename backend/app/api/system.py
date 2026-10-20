"""Health check and system endpoints."""

from fastapi import APIRouter, Depends
from app.core.config import get_settings
from app.core.security import validate_token, has_role, TokenPayload
from app.core.database import get_database

router = APIRouter(prefix="/api", tags=["system"])

def get_test_settings():
    """Dependency to get settings, overridden in tests."""
    return get_settings()


@router.get("/health")
async def health_check(settings=Depends(get_test_settings)) -> dict:
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
    }


@router.get("/health/db")
async def database_health() -> dict:
    """Database health check."""
    try:
        db = await get_database()
        async with db.session() as conn:
            await conn.execute("SELECT 1")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


@router.get("/version")
async def version(settings=Depends(get_test_settings)) -> dict:
    """Version information."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
    }