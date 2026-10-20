"""Database connection and session management."""

import aiosqlite
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from app.core.config import get_settings


class Database:
    """Manages SQLite database connections."""

    def __init__(self, database_url: str):
        self.database_url = database_url
        # Remove sqlite+aiosqlite:// prefix for aiosqlite
        self.db_path = database_url.replace("sqlite+aiosqlite:///", "").replace("sqlite:///", "")

    async def connect(self) -> None:
        """Initialize database connection and create tables."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("PRAGMA foreign_keys = ON")
            await self._create_tables(db)
            await db.commit()

    async def _create_tables(self, db: aiosqlite.Connection) -> None:
        """Create database tables if they don't exist."""
        # Compression history table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS compression_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                original_content TEXT NOT NULL,
                compressed_content TEXT NOT NULL,
                original_tokens INTEGER NOT NULL,
                compressed_tokens INTEGER NOT NULL,
                compression_ratio REAL NOT NULL,
                content_type TEXT NOT NULL,
                algorithm TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create index for pagination/filtering
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_compression_history_user_created
            ON compression_history(user_id, created_at DESC)
        """)

        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_compression_history_content_type
            ON compression_history(content_type)
        """)

        # Audit log table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                action TEXT NOT NULL,
                resource_type TEXT NOT NULL,
                resource_id TEXT,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_log_user_created
            ON audit_log(user_id, created_at DESC)
        """)

    @asynccontextmanager
    async def session(self) -> AsyncGenerator[aiosqlite.Connection, None]:
        """Get a database session."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            await db.execute("PRAGMA foreign_keys = ON")
            yield db

    async def close(self) -> None:
        """Close database connections (no-op for SQLite)."""
        pass


# Global database instance
_db: Database | None = None


async def get_database() -> Database:
    """Get or create database instance."""
    global _db
    if _db is None:
        settings = get_settings()
        _db = Database(settings.database_url)
        await _db.connect()
    return _db


async def close_database() -> None:
    """Close database connection."""
    global _db
    if _db is not None:
        await _db.close()
        _db = None