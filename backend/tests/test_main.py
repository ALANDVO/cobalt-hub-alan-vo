# Cobalt Hub - Backend Tests

import pytest
import asyncio
import sys
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from faker import Faker

# Patch config BEFORE importing other modules
import app.core.config as config
from app.core.config import Settings

TEST_SETTINGS = Settings(
    app_name="Cobalt Hub Test",
    app_version="1.0.0-test",
    debug=True,
    environment="test",
    database_url="sqlite+aiosqlite:///./test_cobalt_hub.db",
    oidc_enabled=True,
    demo_mode=True,
    demo_user_id="test-user",
    demo_user_roles=["viewer", "operator"],
    cors_origins=["http://127.0.0.1:5173"],
)

# Apply patch at module load time
config.get_settings = lambda: TEST_SETTINGS

# Now import modules that depend on config
from app.main import create_app
from app.core.database import Database, get_database, close_database
from app.core.security import generate_pkce_challenge, build_authorization_url, validate_token, TokenPayload
from app.services.compression import get_compression_engine, CompressionEngine
from app.services.history import get_history_service, HistoryService
from app.services.auth import get_auth_service, AuthService
from app.models.compression import (
    ContentType,
    CompressionAlgorithm,
    CompressionRequest,
    CompressionResponse,
)


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def test_db() -> AsyncGenerator[Database, None]:
    """Create a test database."""
    db = Database(TEST_SETTINGS.database_url)
    await db.connect()
    yield db
    # Cleanup
    import os
    db_path = TEST_SETTINGS.database_url.replace("sqlite+aiosqlite:///", "")
    if os.path.exists(db_path):
        os.remove(db_path)


@pytest.fixture(scope="function")
async def client(test_db: Database) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with overridden dependencies."""
    import importlib
    import app.core.security as security_mod
    import app.services.auth as auth_service_mod
    import app.api.auth as auth_api_mod
    import app.api.compression as compress_api_mod
    import app.api.system as system_api_mod
    import app.core.database as database_mod
    import app.core.config as config_mod
    from app.core.config import get_settings
    from app.api.system import get_test_settings as system_get_test_settings
    from app.api.auth import get_test_settings as auth_get_test_settings
    from app.api.compression import get_test_settings as compress_get_test_settings

    fastapi_app = create_app()

    # Override database dependency
    async def override_get_database():
        return test_db

    # Override settings dependency
    def override_get_settings():
        return TEST_SETTINGS

    fastapi_app.dependency_overrides[get_database] = override_get_database
    fastapi_app.dependency_overrides[get_settings] = override_get_settings
    
    # Reset global database instance
    database_mod._db = None
    # Patch get_settings in database module
    database_mod.get_settings = override_get_settings
    fastapi_app.dependency_overrides[system_get_test_settings] = override_get_settings
    fastapi_app.dependency_overrides[auth_get_test_settings] = override_get_settings
    fastapi_app.dependency_overrides[compress_get_test_settings] = override_get_settings

    # Reload modules to pick up patched get_settings
    importlib.reload(security_mod)
    importlib.reload(auth_service_mod)
    importlib.reload(auth_api_mod)
    importlib.reload(compress_api_mod)
    importlib.reload(system_api_mod)

    async with AsyncClient(transport=ASGITransport(app=fastapi_app), base_url="http://test") as ac:
        yield ac

    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def auth_headers() -> dict:
    """Demo mode auth headers."""
    return {"Authorization": "Bearer demo-access-token-" + "0" * 64}


class TestHealthEndpoints:
    """Test health and system endpoints."""

    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient):
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["app"] == "Cobalt Hub Test"

    @pytest.mark.asyncio
    async def test_database_health(self, client: AsyncClient):
        response = await client.get("/api/health/db")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "connected"

    @pytest.mark.asyncio
    async def test_version(self, client: AsyncClient):
        response = await client.get("/api/version")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Cobalt Hub Test"
        assert data["version"] == "1.0.0-test"


class TestAuthentication:
    """Test authentication endpoints."""

    @pytest.mark.asyncio
    async def test_get_auth_url(self, client: AsyncClient):
        response = await client.get("/api/auth/login", params={"redirect_uri": "http://127.0.0.1:5173/callback"})
        assert response.status_code == 200
        data = response.json()
        assert "auth_url" in data
        assert "state" in data
        assert "nonce" in data
        assert "code_verifier" in data

    @pytest.mark.asyncio
    async def test_demo_login(self, client: AsyncClient):
        response = await client.post("/api/auth/demo-login", json={"username": "demo", "password": "demo"})
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "Bearer"
        assert "refresh_token" in data

    @pytest.mark.asyncio
    async def test_get_user_info(self, client: AsyncClient, auth_headers: dict):
        response = await client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["sub"] == "test-user"
        assert "viewer" in data["roles"]
        assert "operator" in data["roles"]

    @pytest.mark.asyncio
    async def test_unauthorized_without_token(self, client: AsyncClient):
        response = await client.get("/api/auth/me")
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_logout(self, client: AsyncClient, auth_headers: dict):
        response = await client.post("/api/auth/logout", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Logged out successfully"


class TestCompressionEngine:
    """Test core compression engine (unit tests)."""

    def test_token_counting(self):
        engine = CompressionEngine()
        text = "Hello, world! This is a test."
        tokens = engine.token_counter.count(text)
        assert tokens > 0
        assert isinstance(tokens, int)

    def test_estimate_tokens(self):
        engine = CompressionEngine()
        from app.models.compression import TokenEstimateRequest
        request = TokenEstimateRequest(content="Hello world", model="gpt-4o")
        result = engine.estimate_tokens(request)
        assert result.estimated_tokens > 0
        assert result.character_count == 11
        assert result.model == "gpt-4o"

    def test_trim_whitespace(self):
        engine = CompressionEngine()
        content = "  Hello    world  \n\n\n  This   is   a   test  "
        result = engine._trim_whitespace(content)
        assert "  " not in result  # No double spaces
        assert "\n\n\n" not in result  # No triple newlines

    def test_minify_json(self):
        engine = CompressionEngine()
        content = '{\n  "key": "value",\n  "nested": {\n    "a": 1\n  }\n}'
        result = engine._minify_json(content)
        assert result == '{"key":"value","nested":{"a":1}}'

    def test_minify_json_invalid(self):
        engine = CompressionEngine()
        content = '{"key": "value",}'  # Invalid JSON
        result = engine._minify_json(content)
        assert result == content  # Returns original on parse error

    def test_remove_comments_code(self):
        engine = CompressionEngine()
        content = "// comment\ncode();\n/* block */\nmore();"
        result = engine._remove_comments(content, ContentType.CODE)
        assert "// comment" not in result
        assert "/* block */" not in result
        assert "code();" in result
        assert "more();" in result

    def test_log_summarize(self):
        engine = CompressionEngine()
        # Create log with many lines
        lines = [f"2024-01-01 INFO  Line {i}" for i in range(100)]
        lines[50] = "2024-01-01 ERROR  Something failed"
        lines[75] = "2024-01-01 WARN  Warning here"
        content = "\n".join(lines)
        result = engine._log_summarize(content)
        assert "ERROR" in result
        assert "WARN" in result
        assert "Line 50" in result or "Line 75" in result
        # Should be shorter than original
        assert len(result) < len(content)

    def test_deduplicate(self):
        engine = CompressionEngine()
        content = "line 1\nline 2\nline 2\nline 2\nline 3"
        result = engine._deduplicate(content)
        assert "line 2 (×3)" in result

    def test_semantic_merge(self):
        engine = CompressionEngine()
        content = "error: connection timeout\nerror: connection refused\nerror: connection reset\ninfo: starting up"
        result = engine._semantic_merge(content)
        assert "error: connection timeout ... (+2 similar)" in result or "+2 similar" in result
    
    def test_markdown_compression(self):
        """Test markdown content type compression."""
        engine = CompressionEngine()
        from app.models.compression import ContentType, CompressionRequest, CompressionAlgorithm
        
        # Test content with markdown headers
        markdown_content = "# Title\n\n## Section 1\n\nSome content here.\n\n### Subsection\n\nMore content.\n\n# Another title\n\nList item 1\n* bullet\n- another"
        
        # Test BALANCED algorithm
        request = CompressionRequest(
            content=markdown_content,
            content_type=ContentType.MARKDOWN,
            algorithm=CompressionAlgorithm.BALANCED,
        )
        result = engine.compress(request)
        assert result.content_type == ContentType.MARKDOWN
        assert result.compressed_tokens < result.original_tokens
        assert result.reduction_percentage > 0
        # Headers should be removed (no leading #)
        assert not any(line.startswith("#") for line in result.compressed_content.split("\n") if line.strip())
        
        # Test AGGRESSIVE algorithm
        request2 = CompressionRequest(
            content=markdown_content,
            content_type=ContentType.MARKDOWN,
            algorithm=CompressionAlgorithm.AGGRESSIVE,
        )
        result2 = engine.compress(request2)
        assert result2.content_type == ContentType.MARKDOWN
        assert result2.compressed_tokens < result2.original_tokens
        assert result2.reduction_percentage > 0
        # Headers should be removed
        assert not any(line.startswith("#") for line in result2.compressed_content.split("\n") if line.strip())
        
        # Test CONSERVATIVE algorithm (just trim whitespace)
        request3 = CompressionRequest(
            content=markdown_content,
            content_type=ContentType.MARKDOWN,
            algorithm=CompressionAlgorithm.CONSERVATIVE,
        )
        result3 = engine.compress(request3)
        assert result3.content_type == ContentType.MARKDOWN
        # Conservative should still reduce some whitespace
        assert len(result3.compressed_content) <= len(markdown_content)
        
# Conservative just trims whitespace, verify content type and no increase in size
        assert result3.content_type == ContentType.MARKDOWN
        # Conservative should not increase content length
        assert len(result3.compressed_content) <= len(markdown_content)