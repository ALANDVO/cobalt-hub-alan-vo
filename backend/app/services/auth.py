"""Authentication service for OIDC flows."""

import httpx
from typing import Optional
from app.core.config import get_settings
from app.core.security import (
    PKCEChallenge,
    generate_pkce_challenge,
    build_authorization_url,
    validate_token,
    TokenPayload,
)
from app.models.auth import AuthUrlResponse, TokenExchangeRequest, TokenResponse, UserInfo


class AuthService:
    """Handles OIDC authentication flows."""

    def __init__(self, settings=None):
        self.settings = settings or get_settings()

    def get_authorization_url(self, redirect_uri: str) -> AuthUrlResponse:
        """Generate authorization URL with PKCE challenge."""
        pkce = generate_pkce_challenge()
        auth_url = build_authorization_url(pkce, redirect_uri)
        return AuthUrlResponse(
            auth_url=auth_url,
            state=pkce.state,
            nonce=pkce.nonce,
            code_verifier=pkce.code_verifier,
        )

    async def exchange_code_for_tokens(self, request: TokenExchangeRequest) -> TokenResponse:
        """Exchange authorization code for access/refresh tokens."""
        if self.settings.demo_mode:
            # Demo mode: return mock tokens
            return TokenResponse(
                access_token="demo-access-token-" + "0" * 64,
                token_type="Bearer",
                expires_in=3600,
                refresh_token="demo-refresh-token-" + "0" * 64,
                id_token="demo-id-token",
            )

        token_url = f"{self.settings.oidc_issuer_url}/protocol/openid-connect/token"
        data = {
            "grant_type": "authorization_code",
            "client_id": self.settings.oidc_client_id,
            "client_secret": self.settings.oidc_client_secret,
            "code": request.code,
            "code_verifier": request.code_verifier,
            "redirect_uri": request.redirect_uri,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(token_url, data=data)
            response.raise_for_status()
            token_data = response.json()

            return TokenResponse(
                access_token=token_data["access_token"],
                token_type=token_data.get("token_type", "Bearer"),
                expires_in=token_data.get("expires_in", 3600),
                refresh_token=token_data.get("refresh_token"),
                id_token=token_data.get("id_token"),
            )

    async def get_user_info(self, access_token: str) -> UserInfo:
        """Get user info from token (validates token and extracts claims)."""
        payload = await validate_token(access_token)
        roles = []
        if payload.realm_access and "roles" in payload.realm_access:
            roles.extend(payload.realm_access["roles"])
        if payload.resource_access:
            for client_roles in payload.resource_access.values():
                if "roles" in client_roles:
                    roles.extend(client_roles["roles"])

        return UserInfo(
            sub=payload.sub,
            email=payload.email,
            username=payload.preferred_username,
            roles=roles,
        )

    async def refresh_access_token(self, refresh_token: str) -> TokenResponse:
        """Refresh access token using refresh token."""
        if not self.settings.oidc_enabled:
            return TokenResponse(
                access_token="demo-access-token-" + "0" * 64,
                token_type="Bearer",
                expires_in=3600,
                refresh_token=refresh_token,
            )

        token_url = f"{self.settings.oidc_issuer_url}/protocol/openid-connect/token"
        data = {
            "grant_type": "refresh_token",
            "client_id": self.settings.oidc_client_id,
            "client_secret": self.settings.oidc_client_secret,
            "refresh_token": refresh_token,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(token_url, data=data)
            response.raise_for_status()
            token_data = response.json()

            return TokenResponse(
                access_token=token_data["access_token"],
                token_type=token_data.get("token_type", "Bearer"),
                expires_in=token_data.get("expires_in", 3600),
                refresh_token=token_data.get("refresh_token"),
                id_token=token_data.get("id_token"),
            )

    def get_logout_url(self, redirect_uri: Optional[str] = None) -> Optional[str]:
        """Get Keycloak logout URL."""
        if not self.settings.oidc_enabled:
            return None

        logout_url = f"{self.settings.oidc_issuer_url}/protocol/openid-connect/logout"
        if redirect_uri:
            logout_url += f"?post_logout_redirect_uri={redirect_uri}"
        return logout_url


# Global service instance
_auth_service: AuthService | None = None


def get_auth_service(settings=None) -> AuthService:
    """Get or create auth service instance."""
    global _auth_service
    if _auth_service is None:
        _auth_service = AuthService(settings)
    return _auth_service