"""Authentication models."""

from typing import Optional
from pydantic import BaseModel, HttpUrl
from datetime import datetime


class AuthUrlResponse(BaseModel):
    """Response with authorization URL for OIDC login."""
    auth_url: HttpUrl
    state: str
    nonce: str
    code_verifier: str  # Client must store this for token exchange


class TokenExchangeRequest(BaseModel):
    """Request to exchange authorization code for tokens."""
    code: str
    code_verifier: str
    redirect_uri: str


class TokenResponse(BaseModel):
    """Response with access token."""
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    refresh_token: Optional[str] = None
    id_token: Optional[str] = None


class UserInfo(BaseModel):
    """Current user information."""
    sub: str
    email: Optional[str] = None
    username: Optional[str] = None
    roles: list[str] = []


class LoginRequest(BaseModel):
    """Login request (for demo mode)."""
    username: str
    password: str


class LogoutResponse(BaseModel):
    """Logout response."""
    message: str
    logout_url: Optional[HttpUrl] = None