"""History service for compression operations."""

from typing import Optional
from datetime import datetime, timezone
import aiosqlite

from app.core.database import get_database
from app.models.compression import (
    CompressionHistoryItem,
    CompressionHistoryResponse,
    ContentType,
    CompressionAlgorithm,
)


class HistoryService:
    """Manages compression history persistence."""

    async def record_compression(
        self,
        user_id: str,
        original_content: str,
        compressed_content: str,
        original_tokens: int,
        compressed_tokens: int,
        compression_ratio: float,
        content_type: ContentType,
        algorithm: CompressionAlgorithm,
    ) -> int:
        """Record a compression operation in history."""
        db = await get_database()
        async with db.session() as conn:
            cursor = await conn.execute(
                """
                INSERT INTO compression_history
                (user_id, original_content, compressed_content, original_tokens,
                 compressed_tokens, compression_ratio, content_type, algorithm, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    user_id,
                    original_content,
                    compressed_content,
                    original_tokens,
                    compressed_tokens,
                    compression_ratio,
                    content_type.value,
                    algorithm.value,
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
            await conn.commit()
            return cursor.lastrowid

    async def get_history(
        self,
        user_id: str,
        page: int = 1,
        page_size: int = 20,
        content_type: Optional[ContentType] = None,
        algorithm: Optional[CompressionAlgorithm] = None,
    ) -> CompressionHistoryResponse:
        """Get paginated compression history for a user."""
        db = await get_database()
        offset = (page - 1) * page_size

        # Build query
        where_clauses = ["user_id = ?"]
        params = [user_id]

        if content_type:
            where_clauses.append("content_type = ?")
            params.append(content_type.value)

        if algorithm:
            where_clauses.append("algorithm = ?")
            params.append(algorithm.value)

        where_sql = " AND ".join(where_clauses)

        # Get total count
        async with db.session() as conn:
            count_cursor = await conn.execute(
                f"SELECT COUNT(*) FROM compression_history WHERE {where_sql}",
                params,
            )
            total_row = await count_cursor.fetchone()
            total = total_row[0] if total_row else 0

            # Get paginated items
            params_with_limit = params + [page_size, offset]
            cursor = await conn.execute(
                f"""
                SELECT id, user_id, original_content, compressed_content,
                       original_tokens, compressed_tokens, compression_ratio,
                       content_type, algorithm, created_at
                FROM compression_history
                WHERE {where_sql}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """,
                params_with_limit,
            )
            rows = await cursor.fetchall()

        items = [
            CompressionHistoryItem(
                id=row["id"],
                user_id=row["user_id"],
                original_content=row["original_content"],
                compressed_content=row["compressed_content"],
                original_tokens=row["original_tokens"],
                compressed_tokens=row["compressed_tokens"],
                compression_ratio=row["compression_ratio"],
                content_type=ContentType(row["content_type"]),
                algorithm=CompressionAlgorithm(row["algorithm"]),
                created_at=datetime.fromisoformat(row["created_at"]),
            )
            for row in rows
        ]

        total_pages = (total + page_size - 1) // page_size

        return CompressionHistoryResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

    async def delete_history_item(self, user_id: str, item_id: int) -> bool:
        """Delete a history item (only if owned by user)."""
        db = await get_database()
        async with db.session() as conn:
            cursor = await conn.execute(
                "DELETE FROM compression_history WHERE id = ? AND user_id = ?",
                (item_id, user_id),
            )
            await conn.commit()
            return cursor.rowcount > 0

    async def clear_history(self, user_id: str) -> int:
        """Clear all history for a user."""
        db = await get_database()
        async with db.session() as conn:
            cursor = await conn.execute(
                "DELETE FROM compression_history WHERE user_id = ?",
                (user_id,),
            )
            await conn.commit()
            return cursor.rowcount


# Global service instance
_history_service: HistoryService | None = None


def get_history_service() -> HistoryService:
    """Get or create history service instance."""
    global _history_service
    if _history_service is None:
        _history_service = HistoryService()
    return _history_service