# Changelog

## 1.0.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-20

### Added
- Initial release of Cobalt Hub
- FastAPI backend with REST API for compression operations
- React + TypeScript + Vite frontend with compression playground
- Deterministic compression engine (10 algorithms, 3 strategies)
- Token estimation using tiktoken
- SQLite persistence for compression history and audit log
- OIDC authentication with Keycloak (PKCE, state, nonce)
- Role-based access control (viewer, operator, admin)
- Demo mode for local development without Keycloak
- Docker Compose with backend, frontend, and Keycloak
- Comprehensive README with API reference and evaluation guide
- Portfolio metadata (portfolio.json)

### Compression Algorithms
- **Conservative**: Trim whitespace only
- **Balanced**: Type-aware optimization (JSON minify, code minify, log summarize)
- **Aggressive**: All transformations combined
- **Individual**: trim_whitespace, remove_comments, minify_json, minify_code, log_summarize, deduplicate, semantic_merge

### Security
- JWT validation via JWKS with RS256
- Issuer, audience, and expiry verification
- PKCE enforcement for SPA flow
- HttpOnly cookie alternative documented
- Demo mode explicitly opt-in, localhost-bound