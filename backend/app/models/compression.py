"""Compression domain models."""

from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class ContentType(str, Enum):
    """Supported content types for compression."""
    TEXT = "text"
    JSON = "json"
    CODE = "code"
    LOG = "log"
    MARKDOWN = "markdown"
    YAML = "yaml"


class CompressionAlgorithm(str, Enum):
    """Available compression algorithms."""
    # Deterministic algorithms (no LLM)
    TRIM_WHITESPACE = "trim_whitespace"
    REMOVE_COMMENTS = "remove_comments"
    MINIFY_JSON = "minify_json"
    MINIFY_CODE = "minify_code"
    LOG_SUMMARIZE = "log_summarize"
    DEDUPLICATE = "deduplicate"
    SEMANTIC_MERGE = "semantic_merge"
    # Combined strategies
    AGGRESSIVE = "aggressive"
    BALANCED = "balanced"
    CONSERVATIVE = "conservative"


class CompressionRequest(BaseModel):
    """Request to compress content."""
    content: str = Field(..., min_length=1, max_length=1_000_000, description="Content to compress")
    content_type: ContentType = Field(default=ContentType.TEXT, description="Type of content")
    algorithm: CompressionAlgorithm = Field(default=CompressionAlgorithm.BALANCED, description="Compression algorithm")
    target_reduction: Optional[float] = Field(default=None, ge=0.0, le=0.99, description="Target reduction ratio (0-0.99)")
    preserve_structure: bool = Field(default=True, description="Preserve semantic structure")


class CompressionResponse(BaseModel):
    """Response from compression operation."""
    original_content: str
    compressed_content: str
    original_tokens: int
    compressed_tokens: int
    compression_ratio: float = Field(..., description="Compressed/original token ratio")
    tokens_saved: int
    reduction_percentage: float
    algorithm_used: CompressionAlgorithm
    content_type: ContentType
    processing_time_ms: float


class TokenEstimateRequest(BaseModel):
    """Request to estimate token count."""
    content: str = Field(..., min_length=1, max_length=1_000_000)
    model: Optional[str] = Field(default="gpt-4o", description="Model for token estimation")


class TokenEstimateResponse(BaseModel):
    """Response with token estimate."""
    estimated_tokens: int
    character_count: int
    model: str


class CompressionHistoryItem(BaseModel):
    """Single compression history record."""
    id: int
    user_id: str
    original_content: str
    compressed_content: str
    original_tokens: int
    compressed_tokens: int
    compression_ratio: float
    content_type: ContentType
    algorithm: CompressionAlgorithm
    created_at: datetime


class CompressionHistoryResponse(BaseModel):
    """Paginated compression history response."""
    items: list[CompressionHistoryItem]
    total: int
    page: int
    page_size: int
    total_pages: int