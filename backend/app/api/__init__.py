"""API package for Cobalt Hub backend."""

from app.api.compression import router as compression_router
from app.api.auth import router as auth_router
from app.api.system import router as system_router

__all__ = [
    "compression_router",
    "auth_router",
    "system_router",
]