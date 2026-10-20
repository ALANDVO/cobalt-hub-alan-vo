"""Audit logging service."""

from typing import Optional
from datetime import datetime, timezone
import aiosqlite

from app.core.database import get_database


class AuditService:
    """Logs security-relevant events for audit trail."""

    async def log_event(
        self,
        user_id: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> int:
        """Log an audit event."""
        db = await get_database()
        async with db.session() as conn:
            cursor = await conn.execute(
                """
                INSERT INTO audit_log
                (user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    action,
                    resource_type,
                    resource_id,
                    details,
                    ip_address,
                    user_agent,
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
            await conn.commit()
            return cursor.lastrowid

    async def get_audit_log(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 50,
    ) -> list[dict]:
        """Get audit log for a user (admin only in practice)."""
        db = await get_database()
        offset = (page - 1) * page_size

        async with db.session() as conn:
            cursor = await conn.execute(
                """
                SELECT id, user_id, action, resource_type, resource_id,
                       details, ip_address, user_agent, created_at
                FROM audit_log
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """,
                (user_id, page_size, offset),
            )
            rows = await cursor.fetchall()

        return [
            {
                "id": row["id"],
                "user_id": row["user_id"],
                "action": row["action"],
                "resource_type": row["resource_type"],
                "resource_id": row["resource_id"],
                "details": row["details"],
                "ip_address": row["ip_address"],
                "user_agent": row["user_agent"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]


# Global service instance
_audit_service: AuditService | None = None


def get_audit_service() -> AuditService:
    """Get or create audit service instance."""
    global _audit_service
    if _audit_service is None:
        _audit_service = AuditService()
    return _audit_service