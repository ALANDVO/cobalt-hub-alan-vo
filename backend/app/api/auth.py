"""Authentication API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import Optional
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.security import validate_token, TokenPayload
from app.services.auth import get_auth_service
from app.services.audit import get_audit_service
from app.models.auth import (
    AuthUrlResponse,
    TokenExchangeRequest,
    TokenResponse,
    UserInfo,
    LogoutResponse,
)

router = APIRouter(prefix="/api/auth", tags=["authentication"])

def get_test_settings():
    """Dependency to get settings, overridden in tests."""
    return get_settings()


class DemoLoginRequest(BaseModel):
    """Demo mode login request."""
    username: str = "demo"
    password: str = "demo"


@router.get("/login", response_model=AuthUrlResponse)
async def get_login_url(
    redirect_uri: str,
    request: Request,
    settings=Depends(get_test_settings),
) -> AuthUrlResponse:
    """Get OIDC authorization URL with PKCE challenge."""
    auth_service = get_auth_service(settings)
    auth_url_response = auth_service.get_authorization_url(redirect_uri)

    # Audit log
    audit = get_audit_service()
    await audit.log_event(
        user_id="anonymous",
        action="login_initiated",
        resource_type="auth",
        details=f"Redirect URI: {redirect_uri}",
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return auth_url_response


@router.post("/callback", response_model=TokenResponse)
async def exchange_code(
    request: TokenExchangeRequest,
    http_request: Request,
    settings=Depends(get_test_settings),
) -> TokenResponse:
    """Exchange authorization code for tokens."""
    auth_service = get_auth_service(settings)




@router.post("/demo-login", response_model=TokenResponse)
async def demo_login(
    request: DemoLoginRequest,
    http_request: Request,
    settings=Depends(get_test_settings),
) -> TokenResponse:
    """Demo mode login (only works when demo_mode is enabled)."""
    if not settings.demo_mode:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo mode is not enabled",
        )

    # In demo mode, return a mock token
    auth_service = get_auth_service(settings)
    token_response = await auth_service.exchange_code_for_tokens(
        TokenExchangeRequest(
            code="demo-code",
            code_verifier="demo-verifier",
            redirect_uri="http://127.0.0.1:5173/callback",
        )
    )

    audit = get_audit_service()
    await audit.log_event(
        user_id=settings.demo_user_id,
        action="demo_login",
        resource_type="auth",
        details="Demo mode login",
        ip_address=http_request.client.host if http_request.client else None,
        user_agent=http_request.headers.get("user-agent"),
    )

    return token_response


@router.get("/me", response_model=UserInfo)
async def get_current_user(
    authorization: Optional[str] = None,
    settings=Depends(get_test_settings),
) -> UserInfo:
    """Get current user info from access token."""
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

    auth_service = get_auth_service(settings)
    try:
        return await auth_service.get_user_info(token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    authorization: Optional[str] = None,
    http_request: Request = None,
    settings=Depends(get_test_settings),
) -> LogoutResponse:
    """Logout and get Keycloak logout URL."""
    auth_service = get_auth_service(settings)

    user_id = "anonymous"
    if authorization:
        try:
            scheme, token = authorization.split(" ", 1)
            if scheme.lower() == "bearer":
                payload = await validate_token(token)
                user_id = payload.sub
        except Exception:
            pass

    audit = get_audit_service()
    await audit.log_event(
        user_id=user_id,
        action="logout",
        resource_type="auth",
        details="User logged out",
        ip_address=http_request.client.host if http_request and http_request.client else None,
        user_agent=http_request.headers.get("user-agent") if http_request else None,
    )

    logout_url = auth_service.get_logout_url(
        redirect_uri="http://127.0.0.1:5173" if settings.environment == "development" else None
    )

    return LogoutResponse(
        message="Logged out successfully",
        logout_url=logout_url,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str,
    settings=Depends(get_test_settings),
) -> TokenResponse:
    """Refresh access token using refresh token."""
    auth_service = get_auth_service(settings)
    return await auth_service.refresh_access_token(refresh_token)