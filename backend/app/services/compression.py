"""Core compression engine - deterministic, no LLM required."""

import re
import json
import tiktoken
import time
from typing import Optional
from app.models.compression import (
    ContentType,
    CompressionAlgorithm,
    CompressionRequest,
    CompressionResponse,
    TokenEstimateRequest,
    TokenEstimateResponse,
)


class TokenCounter:
    """Token counting using tiktoken."""

    def __init__(self, model: str = "gpt-4o"):
        self.model = model
        try:
            self.encoding = tiktoken.encoding_for_model(model)
        except KeyError:
            # Fallback to cl100k_base for unknown models
            self.encoding = tiktoken.get_encoding("cl100k_base")

    def count(self, text: str) -> int:
        """Count tokens in text."""
        return len(self.encoding.encode(text))


class CompressionEngine:
    """Deterministic compression algorithms for various content types."""

    def __init__(self):
        self.token_counter = TokenCounter()

    def estimate_tokens(self, request: TokenEstimateRequest) -> TokenEstimateResponse:
        """Estimate token count for content."""
        tokens = self.token_counter.count(request.content)
        return TokenEstimateResponse(
            estimated_tokens=tokens,
            character_count=len(request.content),
            model=request.model or "gpt-4o",
        )

    def compress(self, request: CompressionRequest) -> CompressionResponse:
        """Compress content using specified algorithm."""
        start_time = time.perf_counter()

        original_tokens = self.token_counter.count(request.content)
        compressed_content = self._apply_algorithm(request.content, request.content_type, request.algorithm)
        compressed_tokens = self.token_counter.count(compressed_content)

        processing_time_ms = (time.perf_counter() - start_time) * 1000

        compression_ratio = compressed_tokens / original_tokens if original_tokens > 0 else 1.0
        tokens_saved = original_tokens - compressed_tokens
        reduction_percentage = (tokens_saved / original_tokens * 100) if original_tokens > 0 else 0.0

        return CompressionResponse(
            original_content=request.content,
            compressed_content=compressed_content,
            original_tokens=original_tokens,
            compressed_tokens=compressed_tokens,
            compression_ratio=compression_ratio,
            tokens_saved=tokens_saved,
            reduction_percentage=reduction_percentage,
            algorithm_used=request.algorithm,
            content_type=request.content_type,
            processing_time_ms=processing_time_ms,
        )

    def _apply_algorithm(
        self,
        content: str,
        content_type: ContentType,
        algorithm: CompressionAlgorithm,
    ) -> str:
        """Apply the selected compression algorithm."""
        # Combined strategies
        if algorithm == CompressionAlgorithm.AGGRESSIVE:
            return self._compress_aggressive(content, content_type)
        elif algorithm == CompressionAlgorithm.BALANCED:
            return self._compress_balanced(content, content_type)
        elif algorithm == CompressionAlgorithm.CONSERVATIVE:
            return self._compress_conservative(content, content_type)

        # Individual algorithms
        if algorithm == CompressionAlgorithm.TRIM_WHITESPACE:
            return self._trim_whitespace(content)
        elif algorithm == CompressionAlgorithm.REMOVE_COMMENTS:
            return self._remove_comments(content, content_type)
        elif algorithm == CompressionAlgorithm.MINIFY_JSON:
            return self._minify_json(content)
        elif algorithm == CompressionAlgorithm.MINIFY_CODE:
            return self._minify_code(content)
        elif algorithm == CompressionAlgorithm.LOG_SUMMARIZE:
            return self._log_summarize(content)
        elif algorithm == CompressionAlgorithm.DEDUPLICATE:
            return self._deduplicate(content)
        elif algorithm == CompressionAlgorithm.SEMANTIC_MERGE:
            return self._semantic_merge(content)

        # Default: return original
        return content

    def _trim_whitespace(self, content: str) -> str:
        """Remove excessive whitespace while preserving structure."""
        # Replace multiple spaces with single space
        content = re.sub(r'[ \t]+', ' ', content)
        # Replace multiple newlines with double newline
        content = re.sub(r'\n{3,}', '\n\n', content)
        # Trim lines
        lines = [line.strip() for line in content.split('\n')]
        return '\n'.join(lines)

    def _remove_comments(self, content: str, content_type: ContentType) -> str:
        """Remove comments based on content type."""
        if content_type == ContentType.CODE:
            # Remove single-line comments (//, #, --)
            content = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
            content = re.sub(r'#.*$', '', content, flags=re.MULTILINE)
            content = re.sub(r'--.*$', '', content, flags=re.MULTILINE)
            # Remove multi-line comments (/* */)
            content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        elif content_type == ContentType.JSON:
            # JSON doesn't officially support comments, but some parsers do
            content = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
            content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        elif content_type == ContentType.YAML:
            content = re.sub(r'#.*$', '', content, flags=re.MULTILINE)
        return content

    def _minify_json(self, content: str) -> str:
        """Minify JSON content."""
        try:
            parsed = json.loads(content)
            return json.dumps(parsed, separators=(',', ':'), ensure_ascii=False)
        except json.JSONDecodeError:
            # If not valid JSON, return original
            return content

    def _minify_code(self, content: str) -> str:
        """Basic code minification."""
        # Remove comments
        content = self._remove_comments(content, ContentType.CODE)
        # Trim whitespace
        content = self._trim_whitespace(content)
        return content

    def _log_summarize(self, content: str) -> str:
        """Summarize log content by keeping unique/error lines."""
        lines = content.split('\n')
        if len(lines) <= 50:
            return content

        # Keep first 10 lines (context)
        # Keep lines with ERROR, WARN, FATAL, CRITICAL, EXCEPTION
        # Keep last 10 lines
        important_keywords = ['ERROR', 'WARN', 'WARNING', 'FATAL', 'CRITICAL', 'EXCEPTION', 'FAIL', 'FAILED']
        important_lines = []
        for i, line in enumerate(lines):
            if i < 10 or i >= len(lines) - 10:
                important_lines.append(line)
            elif any(kw in line.upper() for kw in important_keywords):
                important_lines.append(line)

        # Deduplicate consecutive identical lines
        deduped = []
        prev = None
        for line in important_lines:
            if line != prev:
                deduped.append(line)
                prev = line

        if len(deduped) < len(lines):
            header = f"[Log summarized: {len(lines)} lines → {len(deduped)} lines]\n"
            return header + '\n'.join(deduped)
        return content

    def _deduplicate(self, content: str) -> str:
        """Remove duplicate consecutive lines."""
        lines = content.split('\n')
        if len(lines) <= 1:
            return content

        deduped = []
        prev = None
        count = 0
        for line in lines:
            if line == prev:
                count += 1
            else:
                if count > 1:
                    deduped.append(f"{prev} (×{count + 1})")
                elif prev is not None:
                    deduped.append(prev)
                prev = line
                count = 0
        # Handle last line
        if count > 1:
            deduped.append(f"{prev} (×{count + 1})")
        elif prev is not None:
            deduped.append(prev)

        return '\n'.join(deduped)

    def _semantic_merge(self, content: str) -> str:
        """Merge semantically similar lines (basic implementation)."""
        lines = content.split('\n')
        if len(lines) <= 10:
            return content

        # Group similar lines by first few words
        merged = []
        i = 0
        while i < len(lines):
            current = lines[i].strip()
            if not current:
                merged.append("")
                i += 1
                continue

            # Look ahead for similar lines
            similar = [current]
            j = i + 1
            while j < len(lines) and len(similar) < 5:
                next_line = lines[j].strip()
                if next_line and self._similar_prefix(current, next_line, 3):
                    similar.append(next_line)
                    j += 1
                else:
                    break

            if len(similar) > 1:
                merged.append(f"{similar[0]} ... (+{len(similar)-1} similar)")
            else:
                merged.append(current)
            i = j

        return '\n'.join(merged)

    def _similar_prefix(self, a: str, b: str, word_count: int) -> bool:
        """Check if two lines have similar prefix."""
        a_words = a.split()[:word_count]
        b_words = b.split()[:word_count]
        return a_words == b_words and len(a_words) == word_count

    def _compress_conservative(self, content: str, content_type: ContentType) -> str:
        """Conservative compression: trim whitespace only."""
        return self._trim_whitespace(content)

    def _compress_balanced(self, content: str, content_type: ContentType) -> str:
        """Balanced compression: type-appropriate optimization."""
        if content_type == ContentType.JSON:
            content = self._minify_json(content)
        elif content_type == ContentType.CODE:
            content = self._minify_code(content)
        elif content_type == ContentType.LOG:
            content = self._log_summarize(content)
        content = self._trim_whitespace(content)
        return content

    def _compress_aggressive(self, content: str, content_type: ContentType) -> str:
        """Aggressive compression: all applicable transformations."""
        content = self._remove_comments(content, content_type)
        if content_type == ContentType.JSON:
            content = self._minify_json(content)
        elif content_type == ContentType.CODE:
            content = self._minify_code(content)
        elif content_type == ContentType.LOG:
            content = self._log_summarize(content)
        content = self._deduplicate(content)
        content = self._semantic_merge(content)
        content = self._trim_whitespace(content)
        return content


# Global engine instance
_engine: CompressionEngine | None = None


def get_compression_engine() -> CompressionEngine:
    """Get or create compression engine instance."""
    global _engine
    if _engine is None:
        _engine = CompressionEngine()
    return _engine