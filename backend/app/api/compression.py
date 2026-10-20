"""Compression API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import Optional

from app.core.config import get_settings
from app.core.security import validate_token, has_role, TokenPayload
from app.services.compression import get_compression_engine
from app.services.history import get_history_service
from app.services.audit import get_audit_service
from app.models.compression import (
    CompressionRequest,
    CompressionResponse,
    TokenEstimateRequest,
    TokenEstimateResponse,
    CompressionHistoryResponse,
    ContentType,
    CompressionAlgorithm,
)

router = APIRouter(prefix="/api/compress", tags=["compression"])

def get_test_settings():
    """Dependency to get settings, overridden in tests."""
    return get_settings()
async def get_current_user(
    request: Request,
    authorization: Optional[str] = None,
    settings=Depends(get_test_settings),
) -> TokenPayload:
    """Extract and validate JWT from Authorization header."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        scheme, token = authorization.split(" ", 1)
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = await validate_token(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


def require_role(required_role: str):
    """Dependency factory for role-based access control."""
    async def role_checker(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        if not has_role(user, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {required_role}",
            )
        return user
    return role_checker


@router.post("/compress", response_model=CompressionResponse)
async def compress_content(
    request: CompressionRequest,
    user: TokenPayload = Depends(require_role("viewer")),
    http_request: Request = None,
) -> CompressionResponse:
    """Compress content using specified algorithm."""
    engine = get_compression_engine()
    result = engine.compress(request)

    # Record in history
    history = get_history_service()
    await history.record_compression(
        user_id=user.sub,
        original_content=request.content,
        compressed_content=result.compressed_content,
        original_tokens=result.original_tokens,
        compressed_tokens=result.compressed_tokens,
        compression_ratio=result.compression_ratio,
        content_type=request.content_type,
        algorithm=request.algorithm,
    )

    # Audit log
    audit = get_audit_service()
    await audit.log_event(
        user_id=user.sub,
        action="compress",
        resource_type="compression",
        details=f"Algorithm: {request.algorithm.value}, Content-Type: {request.content_type.value}, Tokens: {result.original_tokens}->{result.compressed_tokens}",
        ip_address=http_request.client.host if http_request and http_request.client else None,
        user_agent=http_request.headers.get("user-agent") if http_request else None,
    )

    return result


@router.post("/estimate", response_model=TokenEstimateResponse)
async def estimate_tokens(
    request: TokenEstimateRequest,
    user: TokenPayload = Depends(require_role("viewer")),
) -> TokenEstimateResponse:
    """Estimate token count for content."""
    engine = get_compression_engine()
    return engine.estimate_tokens(request)


@router.get("/history", response_model=CompressionHistoryResponse)
async def get_compression_history(
    page: int = 1,
    page_size: int = 20,
    content_type: Optional[ContentType] = None,
    algorithm: Optional[CompressionAlgorithm] = None,
    user: TokenPayload = Depends(require_role("viewer")),
) -> CompressionHistoryResponse:
    """Get paginated compression history for current user."""
    history = get_history_service()
    return await history.get_history(
        user_id=user.sub,
        page=page,
        page_size=page_size,
        content_type=content_type,
        algorithm=algorithm,
    )


@router.delete("/history/{item_id}")
async def delete_history_item(
    item_id: int,
    user: TokenPayload = Depends(require_role("viewer")),
) -> dict:
    """Delete a specific history item."""
    history = get_history_service()
    deleted = await history.delete_history_item(user.sub, item_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="History item not found")
    return {"message": "History item deleted"}


@router.delete("/history")
async def clear_history(
    user: TokenPayload = Depends(require_role("operator")),
) -> dict:
    """Clear all compression history for current user."""
    history = get_history_service()
    count = await history.clear_history(user.sub)
    return {"message": f"Cleared {count} history items"}