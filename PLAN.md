# Product development plan

Each round completes one feature or repair. Future items are planned, not implemented claims.

## Current round

project-skeleton

## Roadmap

### project-skeleton — Project Skeleton with FastAPI and React/Vite

Status: done

Acceptance:
- FastAPI app runs with health endpoint
- React/Vite frontend builds and serves
- Docker compose with backend, frontend, and Keycloak
- Basic project structure matches contract

Implementation: `backend/app/main.py`, `backend/app/api/system.py`, `backend/app/api/auth.py`, `backend/app/api/compression.py`, `backend/app/core/config.py`, `backend/app/core/security.py`, `backend/app/core/database.py`, `backend/app/services/compression.py`, `backend/app/services/history.py`, `backend/app/services/audit.py`, `backend/app/models/compression.py`, `frontend/src/App.tsx`, `frontend/src/main.tsx`, `frontend/src/hooks/useAuth.tsx`, `frontend/src/hooks/useCompression.ts`, `frontend/src/hooks/useToast.tsx`, `frontend/src/api/client.ts`, `frontend/src/pages/CompressionPage.tsx`, `frontend/src/pages/DashboardPage.tsx`, `frontend/src/pages/HistoryPage.tsx`, `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/SettingsPage.tsx`, `frontend/src/pages/CallbackPage.tsx`, `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `keycloak/realm.json`

Tests: `backend/tests/test_main.py`, `frontend/src/test/app.test.tsx`

### compression-core — Core Compression Engine

Status: planned

Acceptance:
- Deterministic compression algorithms for text, JSON, logs, code
- Token estimation and reduction metrics
- No LLM dependency for core compression

### api-endpoints — REST API for Compression Operations

Status: planned

Acceptance:
- POST /api/compress - compress content
- POST /api/estimate - estimate tokens
- GET /api/history - compression history with pagination
- Authentication required for all endpoints

### auth-oidc — OIDC Authentication with Keycloak

Status: planned

Acceptance:
- SPA PKCE flow with access tokens in memory
- Backend validates JWT with JWKS
- Role-based access control (viewer/operator/admin)
- Login/logout flows work end-to-end

### frontend-dashboard — Frontend Dashboard with Compression Workflows

Status: planned

Acceptance:
- Compression playground with live preview
- History view with search/filter
- Batch compression workflow
- Export results as JSON/CSV

### mcp-server — MCP Server for Tool Integration

Status: planned

Acceptance:
- MCP server exposes compression tools
- Works with Claude Desktop and other MCP clients
- Tools: compress, estimate_tokens, batch_compress

### docs-and-ci — Documentation, CI/CD, and Portfolio Metadata

Status: planned

Acceptance:
- README with architecture diagram and install steps
- CI workflow runs backend/frontend tests and Docker builds
- portfolio.json with correct metadata
- CHANGELOG.md tracking changes

---

Alan Vo · [alanvo.net](https://alanvo.net) · [X: @alanvoasi](https://x.com/alanvoasi)
