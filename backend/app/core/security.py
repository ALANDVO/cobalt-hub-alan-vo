"""Security utilities: JWT validation, PKCE, token handling."""

import hashlib
import secrets
import base64
from datetime import datetime, timezone, timedelta
from typing import Optional
from urllib.parse import urlencode

import httpx
from jose import jwt, JWTError
from pydantic import BaseModel

from app.core.config import get_settings


class TokenPayload(BaseModel):
    """Decoded JWT payload."""
    sub: str
    email: Optional[str] = None
    preferred_username: Optional[str] = None
    realm_access: Optional[dict] = None
    resource_access: Optional[dict] = None
    exp: int
    iat: int
    iss: str
    aud: str | list[str]
    nonce: Optional[str] = None
    session_state: Optional[str] = None


class PKCEChallenge(BaseModel):
    """PKCE challenge data for OIDC flow."""
    code_verifier: str
    code_challenge: str
    code_challenge_method: str = "S256"
    state: str
    nonce: str


def generate_pkce_challenge() -> PKCEChallenge:
    """Generate PKCE code verifier, challenge, state, and nonce."""
    # Generate code verifier (43-128 chars, URL-safe)
    code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")

    # Generate code challenge (SHA256 of verifier, base64url encoded)
    challenge_bytes = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(challenge_bytes).decode().rstrip("=")

    # Generate state and nonce
    state = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")
    nonce = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")

    return PKCEChallenge(
        code_verifier=code_verifier,
        code_challenge=code_challenge,
        state=state,
        nonce=nonce,
    )


def build_authorization_url(pkce: PKCEChallenge, redirect_uri: str) -> str:
    """Build OIDC authorization URL with PKCE parameters."""
    settings = get_settings()
    params = {
        "client_id": settings.oidc_client_id,
        "response_type": "code",
        "scope": "openid profile email roles",
        "redirect_uri": redirect_uri,
        "code_challenge": pkce.code_challenge,
        "code_challenge_method": pkce.code_challenge_method,
        "state": pkce.state,
        "nonce": pkce.nonce,
    }
    return f"{settings.oidc_issuer_url}/protocol/openid-connect/auth?{urlencode(params)}"


class JWKSClient:
    """Fetches and caches JWKS for JWT validation."""

    def __init__(self, jwks_url: str):
        self.jwks_url = jwks_url
        self._keys: dict = {}
        self._fetched_at: Optional[datetime] = None
        self._cache_ttl = timedelta(hours=1)

    async def get_signing_key(self, kid: str) -> Optional[dict]:
        """Get signing key by key ID, fetching JWKS if needed."""
        if self._should_refresh():
            await self._fetch_jwks()
        return self._keys.get(kid)

    def _should_refresh(self) -> bool:
        if not self._fetched_at:
            return True
        return datetime.now(timezone.utc) - self._fetched_at > self._cache_ttl

    async def _fetch_jwks(self) -> None:
        """Fetch JWKS from Keycloak."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(self.jwks_url)
            response.raise_for_status()
            jwks = response.json()
            self._keys = {key["kid"]: key for key in jwks.get("keys", [])}
            self._fetched_at = datetime.now(timezone.utc)


async def validate_token(token: str) -> TokenPayload:
    """Validate JWT token using JWKS from Keycloak."""
    settings = get_settings()

    # Demo mode: accept demo tokens
    if settings.demo_mode and token.startswith("demo-access-token-"):
        return TokenPayload(
            sub=settings.demo_user_id,
            email="demo@cobalt-hub.local",
            preferred_username="demo-user",
            realm_access={"roles": settings.demo_user_roles},
            exp=int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
            iat=int(datetime.now(timezone.utc).timestamp()),
            iss=settings.oidc_issuer_url,
            aud=settings.oidc_audience,
        )

    if not settings.oidc_enabled:
        # Demo mode: create a mock token payload
        return TokenPayload(
            sub=settings.demo_user_id,
            email="demo@cobalt-hub.local",
            preferred_username="demo-user",
            realm_access={"roles": settings.demo_user_roles},
            exp=int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
            iat=int(datetime.now(timezone.utc).timestamp()),
            iss=settings.oidc_issuer_url,
            aud=settings.oidc_audience,
        )

    # Decode header to get kid
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise ValueError(f"Invalid token header: {e}")
    kid = header.get("kid")
    if not kid:
        raise ValueError("Token missing 'kid' header")

    # Get signing key
    jwks_client = JWKSClient(settings.oidc_jwks_url)
    signing_key = await jwks_client.get_signing_key(kid)
    if not signing_key:
        raise ValueError(f"Signing key not found for kid: {kid}")

    # Validate token
    try:
        payload = jwt.decode(
            token,
            signing_key,
            algorithms=["RS256"],
            audience=settings.oidc_audience,
            issuer=settings.oidc_issuer_url,
            options={"verify_exp": True, "verify_aud": True, "verify_iss": True},
        )
    except JWTError as e:
        raise ValueError(f"Token validation failed: {e}")

    return TokenPayload(**payload)


def get_user_roles(payload: TokenPayload) -> list[str]:
    """Extract roles from token payload."""
    roles = []
    if payload.realm_access and "roles" in payload.realm_access:
        roles.extend(payload.realm_access["roles"])
    if payload.resource_access:
        for client_roles in payload.resource_access.values():
            if "roles" in client_roles:
                roles.extend(client_roles["roles"])
    return roles


def has_role(payload: TokenPayload, required_role: str) -> bool:
    """Check if user has required role."""
    roles = get_user_roles(payload)
    return required_role in roles or "admin" in roles