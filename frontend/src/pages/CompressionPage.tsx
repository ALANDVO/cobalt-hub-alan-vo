/** Compression playground page */

import { useState, useCallback, useEffect } from 'react';
import { useCompression } from '../hooks/useCompression';
import { useToast } from '../hooks/useToast';
import {
  Zap,
  Copy,
  Check,
  Download,
  FileText,
  Code,
  Terminal,
  Database,
  RefreshCw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import type { ContentType, CompressionAlgorithm, CompressionRequest } from '../types/api';

const CONTENT_TYPES: { value: ContentType; label: string; icon: React.ReactNode }[] = [
  { value: 'text', label: 'Plain Text', icon: <FileText size={16} /> },
  { value: 'json', label: 'JSON', icon: <Database size={16} /> },
  { value: 'code', label: 'Source Code', icon: <Code size={16} /> },
  { value: 'log', label: 'Logs', icon: <Terminal size={16} /> },
  { value: 'markdown', label: 'Markdown', icon: <FileText size={16} /> },
  { value: 'yaml', label: 'YAML', icon: <FileText size={16} /> },
];

const ALGORITHMS: { value: CompressionAlgorithm; label: string; description: string }[] = [
  { value: 'conservative', label: 'Conservative', description: 'Trim whitespace only' },
  { value: 'balanced', label: 'Balanced', description: 'Type-appropriate optimization' },
  { value: 'aggressive', label: 'Aggressive', description: 'All transformations' },
  { value: 'trim_whitespace', label: 'Trim Whitespace', description: 'Remove excess whitespace' },
  { value: 'remove_comments', label: 'Remove Comments', description: 'Strip code comments' },
  { value: 'minify_json', label: 'Minify JSON', description: 'Compact JSON output' },
  { value: 'minify_code', label: 'Minify Code', description: 'Minify source code' },
  { value: 'log_summarize', label: 'Log Summarize', description: 'Keep errors, trim noise' },
  { value: 'deduplicate', label: 'Deduplicate', description: 'Remove duplicate lines' },
  { value: 'semantic_merge', label: 'Semantic Merge', description: 'Merge similar lines' },
];

const SAMPLE_CONTENT: Record<ContentType, string> = {
  text: `This is a sample text document with multiple paragraphs.

It contains various words and sentences that demonstrate the compression capabilities of Cobalt Hub.

The compression engine can reduce token usage significantly while preserving the semantic meaning of the content.`,
  json: `{
  "users": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "roles": ["admin", "user"],
      "metadata": {
        "created_at": "2024-01-15T10:30:00Z",
        "last_login": "2024-12-20T14:22:00Z",
        "preferences": {
          "theme": "dark",
          "notifications": true,
          "language": "en"
        }
      }
    },
    {
      "id": 2,
      "name": "Jane Smith",
      "email": "jane@example.com",
      "roles": ["user"],
      "metadata": {
        "created_at": "2024-02-20T08:15:00Z",
        "last_login": "2024-12-19T16:45:00Z",
        "preferences": {
          "theme": "light",
          "notifications": false,
          "language": "en"
        }
      }
    }
  ],
  "total": 2,
  "page": 1,
  "page_size": 20
}`,
  code: `// Sample TypeScript function with comments and whitespace
interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
}

interface UserMetadata {
  created_at: string;
  last_login: string;
  preferences: UserPreferences;
}

/**
 * Fetches users from the API with pagination
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Promise resolving to user list
 */
async function fetchUsers(page: number = 1, pageSize: number = 20): Promise<User[]> {
  // Validate inputs
  if (page < 1) {
    throw new Error('Page must be >= 1');
  }
  if (pageSize < 1 || pageSize > 100) {
    throw new Error('Page size must be between 1 and 100');
  }

  // Construct API URL
  const url = \`/api/users?page=\${page}&page_size=\${pageSize}\`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    const data = await response.json();
    return data.users || [];
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
}

// Usage example
const users = await fetchUsers(1, 10);
console.log('Users fetched:', users.length);`,
  log: `2024-12-20 10:30:15 INFO  Starting application server on port 8000
2024-12-20 10:30:16 INFO  Database connection established
2024-12-20 10:30:16 INFO  Loading configuration from /etc/app/config.yaml
2024-12-20 10:30:17 INFO  Registering routes: /api/v1/users, /api/v1/auth, /api/v1/health
2024-12-20 10:30:17 INFO  Server ready to accept connections
2024-12-20 10:30:45 INFO  GET /api/v1/users 200 45ms
2024-12-20 10:30:46 INFO  GET /api/v1/users 200 38ms
2024-12-20 10:30:47 INFO  GET /api/v1/users 200 42ms
2024-12-20 10:31:12 WARN  Slow query detected: SELECT * FROM users WHERE created_at > '2024-01-01' took 1200ms
2024-12-20 10:31:15 INFO  GET /api/v1/users 200 52ms
2024-12-20 10:31:18 INFO  GET /api/v1/users 200 41ms
2024-12-20 10:31:22 ERROR  Database connection timeout after 5000ms
2024-12-20 10:31:22 ERROR  Failed to execute query: SELECT * FROM users
2024-12-20 10:31:23 WARN  Retrying database connection (attempt 1/3)
2024-12-20 10:31:24 INFO  Database connection re-established
2024-12-20 10:31:25 INFO  GET /api/v1/users 200 47ms
2024-12-20 10:31:26 INFO  GET /api/v1/users 200 39ms
2024-12-20 10:31:27 INFO  GET /api/v1/users 200 44ms
2024-12-20 10:31:28 INFO  GET /api/v1/users 200 41ms
2024-12-20 10:31:29 INFO  GET /api/v1/users 200 38ms
2024-12-20 10:31:30 INFO  GET /api/v1/users 200 43ms
2024-12-20 10:31:31 INFO  GET /api/v1/users 200 40ms
2024-12-20 10:31:32 INFO  GET /api/v1/users 200 45ms
2024-12-20 10:31:33 INFO  GET /api/v1/users 200 39ms
2024-12-20 10:31:34 INFO  GET /api/v1/users 200 42ms
2024-12-20 10:31:35 INFO  GET /api/v1/users 200 41ms`,
  markdown: `# Cobalt Hub Documentation

## Overview

Cobalt Hub is a compression tool for AI/ML developers that reduces token usage when sending content to LLMs.

## Features

- **Deterministic compression** - No LLM required for core operations
- **Multiple algorithms** - Choose from 10+ compression strategies
- **Content-aware** - Optimized for JSON, code, logs, and text
- **Token estimation** - Accurate token counting with tiktoken

## Quick Start

\`\`\`bash
# Install
pip install cobalt-hub

# Compress JSON
cobalt-hub compress --type json --algorithm balanced < data.json
\`\`\`

## Algorithms

| Algorithm | Best For | Reduction |
|-----------|----------|-----------|
| Conservative | All types | 10-20% |
| Balanced | JSON, Code, Logs | 30-60% |
| Aggressive | Logs, Large JSON | 60-95% |`,
  yaml: `version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=sqlite+aiosqlite:///./cobalt_hub.db
      - OIDC_ENABLED=true
      - OIDC_ISSUER_URL=http://keycloak:8080/realms/cobalt-hub
    depends_on:
      - db
    healthcheck:
      test: ["CMD", "python", "-c", "import httpx; httpx.get('http://127.0.0.1:8000/api/health')"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend

  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    ports:
      - "8080:8080"
    environment:
      - KEYCLOAK_ADMIN=admin
      - KEYCLOAK_ADMIN_PASSWORD=admin
    command: start-dev --import-realm

volumes:
  db_data:`,
};

export function CompressionPage() {
  const { compress, estimateTokens, isCompressing, isEstimating, lastResult, clearResult } = useCompression();
  const { success, error: toastError } = useToast();

  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<ContentType>('text');
  const [algorithm, setAlgorithm] = useState<CompressionAlgorithm>('balanced');
  const [showOriginal, setShowOriginal] = useState(true);
  const [originalExpanded, setOriginalExpanded] = useState(false);
  const [compressedExpanded, setCompressedExpanded] = useState(false);

  // Load sample content when content type changes
  useEffect(() => {
    setContent(SAMPLE_CONTENT[contentType] || '');
  }, [contentType]);

  const handleCompress = useCallback(async () => {
    if (!content.trim()) {
      toastError('Empty content', 'Please enter content to compress');
      return;
    }

    const request: CompressionRequest = {
      content,
      content_type: contentType,
      algorithm,
      preserve_structure: true,
    };

    await compress(request);
  }, [content, contentType, algorithm, compress, toastError]);

  const handleCopyCompressed = useCallback(async () => {
    if (lastResult) {
      await navigator.clipboard.writeText(lastResult.compressed_content);
      success('Copied', 'Compressed content copied to clipboard');
    }
  }, [lastResult, success]);

  const handleDownload = useCallback(() => {
    if (lastResult) {
      const blob = new Blob([lastResult.compressed_content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compressed-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      success('Downloaded', 'Compressed content saved');
    }
  }, [lastResult, success]);

  const handleLoadSample = useCallback(() => {
    setContent(SAMPLE_CONTENT[contentType] || '');
    clearResult();
  }, [contentType, clearResult]);

  const handleClear = useCallback(() => {
    setContent('');
    clearResult();
  }, [clearResult]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Compression Playground</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Reduce token usage before sending to LLMs</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleLoadSample} className="btn btn-outline btn-sm">
            <RefreshCw size={16} />
            Load Sample
          </button>
          <button onClick={handleClear} className="btn btn-outline btn-sm">
            Clear
          </button>
        </div>
      </div>

      {/* Settings Row */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label">Content Type</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value as ContentType)}
              className="form-select"
            >
              {CONTENT_TYPES.map((ct) => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label">Algorithm</label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as CompressionAlgorithm)}
              className="form-select"
            >
              {ALGORITHMS.map((algo) => (
                <option key={algo.value} value={algo.value}>
                  {algo.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <label className="form-label" style={{ visibility: 'hidden' }}>Compress</label>
            <button
              onClick={handleCompress}
              disabled={isCompressing || !content.trim()}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {isCompressing ? <div className="loading-spinner" /> : <Zap size={18} />}
              {isCompressing ? 'Compressing...' : 'Compress'}
            </button>
          </div>
        </div>

        {/* Algorithm description */}
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
          <strong>{ALGORITHMS.find(a => a.value === algorithm)?.label}:</strong>{' '}
          {ALGORITHMS.find(a => a.value === algorithm)?.description}
        </div>
      </div>

      {/* Input/Output Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Original Content */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Original Content</h3>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                onClick={() => setOriginalExpanded(!originalExpanded)}
                className="btn btn-outline btn-sm"
                aria-label={originalExpanded ? 'Minimize' : 'Maximize'}
              >
                {originalExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="form-textarea"
            style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}
            placeholder="Enter content to compress..."
            spellCheck={false}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span>{content.length} characters</span>
            <span>{content.split('\n').length} lines</span>
          </div>
        </div>

        {/* Compressed Content */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '500px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Compressed Output</h3>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {lastResult && (
                <>
                  <button onClick={handleCopyCompressed} className="btn btn-outline btn-sm" aria-label="Copy">
                    <Copy size={16} />
                  </button>
                  <button onClick={handleDownload} className="btn btn-outline btn-sm" aria-label="Download">
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => setCompressedExpanded(!compressedExpanded)}
                    className="btn btn-outline btn-sm"
                    aria-label={compressedExpanded ? 'Minimize' : 'Maximize'}
                  >
                    {compressedExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </>
              )}
            </div>
          </div>

          {lastResult ? (
            <>
              <textarea
                value={lastResult.compressed_content}
                readOnly
                className="form-textarea"
                style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', background: 'var(--color-background)' }}
                spellCheck={false}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.75rem', fontSize: '0.8125rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={16} style={{ color: 'var(--color-primary)' }} />
                  <span><strong>Original:</strong> {lastResult.original_tokens.toLocaleString()} tokens</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={16} style={{ color: 'var(--color-success)' }} />
                  <span><strong>Compressed:</strong> {lastResult.compressed_tokens.toLocaleString()} tokens</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <TrendingUp size={16} style={{ color: 'var(--color-success)' }} />
                  <span><strong>Saved:</strong> {lastResult.tokens_saved.toLocaleString()} ({lastResult.reduction_percentage.toFixed(1)}%)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-secondary">{lastResult.processing_time_ms.toFixed(1)}ms</span>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ flex: 1 }}>
              <Zap className="empty-state-icon" />
              <h3 style={{ marginBottom: '0.5rem' }}>No output yet</h3>
              <p>Configure settings and click Compress to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Need to import TrendingUp
import { TrendingUp } from 'lucide-react';