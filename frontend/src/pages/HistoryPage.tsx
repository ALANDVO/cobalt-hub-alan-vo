/** History page with pagination and filtering */

import { useState, useEffect } from 'react';
import { useHistory } from '../hooks/useCompression';
import { useToast } from '../hooks/useToast';
import {
  Trash2,
  Trash,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Code,
  Terminal,
  Database,
  MoreHorizontal,
} from 'lucide-react';
import type { ContentType, CompressionAlgorithm, CompressionHistoryItem } from '../types/api';
import { formatDistanceToNow } from 'date-fns';

const CONTENT_TYPE_ICONS: Record<ContentType, React.ReactNode> = {
  text: <FileText size={14} />,
  json: <Database size={14} />,
  code: <Code size={14} />,
  log: <Terminal size={14} />,
  markdown: <FileText size={14} />,
  yaml: <FileText size={14} />,
};

export function HistoryPage() {
  const { history, isLoading, page, fetchHistory, deleteItem, clearAll } = useHistory();
  const { error: toastError, success } = useToast();

  const [contentTypeFilter, setContentTypeFilter] = useState<ContentType | ''>('');
  const [algorithmFilter, setAlgorithmFilter] = useState<CompressionAlgorithm | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch history when filters change
  useEffect(() => {
    fetchHistory(1, 20, contentTypeFilter || undefined, algorithmFilter || undefined);
  }, [contentTypeFilter, algorithmFilter, fetchHistory]);

  const handleDelete = async (item: CompressionHistoryItem) => {
    if (window.confirm(`Delete compression record #${item.id}?`)) {
      await deleteItem(item.id);
      success('Deleted', 'History item removed');
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Clear all compression history? This cannot be undone.')) {
      await clearAll();
      success('Cleared', 'All history items removed');
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  const getContentTypeLabel = (type: ContentType) => {
    const labels: Record<ContentType, string> = {
      text: 'Text',
      json: 'JSON',
      code: 'Code',
      log: 'Log',
      markdown: 'Markdown',
      yaml: 'YAML',
    };
    return labels[type];
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Compression History</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>View and manage your past compressions</p>
        </div>
        {history && history.total > 0 && (
          <button onClick={handleClearAll} className="btn btn-outline btn-sm btn-danger">
            <Trash size={16} />
            Clear All
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label">Search</label>
            <div style={{ position: 'relative' }}>
              <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', size: 16, color: 'var(--color-text-muted)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Search in content..."
              />
            </div>
          </div>

          <div style={{ minWidth: '180px' }}>
            <label className="form-label">Content Type</label>
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value as ContentType | '')}
              className="form-select"
            >
              <option value="">All Types</option>
              <option value="text">Text</option>
              <option value="json">JSON</option>
              <option value="code">Code</option>
              <option value="log">Log</option>
              <option value="markdown">Markdown</option>
              <option value="yaml">YAML</option>
            </select>
          </div>

          <div style={{ minWidth: '180px' }}>
            <label className="form-label">Algorithm</label>
            <select
              value={algorithmFilter}
              onChange={(e) => setAlgorithmFilter(e.target.value as CompressionAlgorithm | '')}
              className="form-select"
            >
              <option value="">All Algorithms</option>
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="aggressive">Aggressive</option>
              <option value="trim_whitespace">Trim Whitespace</option>
              <option value="remove_comments">Remove Comments</option>
              <option value="minify_json">Minify JSON</option>
              <option value="minify_code">Minify Code</option>
              <option value="log_summarize">Log Summarize</option>
              <option value="deduplicate">Deduplicate</option>
              <option value="semantic_merge">Semantic Merge</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="card">
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem' }}>
            <div className="loading-spinner" style={{ width: '2rem', height: '2rem' }} />
            <span style={{ marginLeft: '1rem' }}>Loading history...</span>
          </div>
        ) : history && history.items.length > 0 ? (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    <th>Content</th>
                    <th style={{ width: '140px' }}>Type</th>
                    <th style={{ width: '160px' }}>Algorithm</th>
                    <th style={{ width: '120px' }}>Tokens</th>
                    <th style={{ width: '120px' }}>Reduction</th>
                    <th style={{ width: '140px' }}>Date</th>
                    <th style={{ width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {history.items
                    .filter((item) => {
                      if (searchQuery) {
                        const query = searchQuery.toLowerCase();
                        return (
                          item.original_content.toLowerCase().includes(query) ||
                          item.compressed_content.toLowerCase().includes(query)
                        );
                      }
                      return true;
                    })
                    .map((item) => (
                      <tr key={item.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>{item.id}</td>
                        <td>
                          <div style={{ maxWidth: '300px' }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.original_content.slice(0, 80)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.125rem' }}>
                              {item.original_tokens.toLocaleString()} → {item.compressed_tokens.toLocaleString()} tokens
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${item.content_type === 'json' ? 'primary' : item.content_type === 'code' ? 'success' : item.content_type === 'log' ? 'warning' : 'secondary'}`}>
                            {CONTENT_TYPE_ICONS[item.content_type]}
                            {getContentTypeLabel(item.content_type)}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>
                            {item.algorithm.replace('_', ' ')}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                          {item.original_tokens.toLocaleString()} → {item.compressed_tokens.toLocaleString()}
                        </td>
                        <td>
                          <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>
                            {item.reduction_percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                          {formatDate(item.created_at)}
                        </td>
                        <td>
                          <button
                            onClick={() => handleDelete(item)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '0.25rem' }}
                            aria-label="Delete"
                          >
                            <Trash2 size={16} style={{ color: 'var(--color-danger)' }} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {history.total_pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                <button
                  onClick={() => fetchHistory(page - 1, 20, contentTypeFilter || undefined, algorithmFilter || undefined)}
                  disabled={page === 1}
                  className="btn btn-outline btn-sm"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ padding: '0 1rem', fontSize: '0.875rem' }}>
                  Page {page} of {history.total_pages} ({history.total} total)
                </span>
                <button
                  onClick={() => fetchHistory(page + 1, 20, contentTypeFilter || undefined, algorithmFilter || undefined)}
                  disabled={page === history.total_pages}
                  className="btn btn-outline btn-sm"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <FileText className="empty-state-icon" />
            <h3 style={{ marginBottom: '0.5rem' }}>No compression history</h3>
            <p style={{ marginBottom: '1.5rem' }}>Your compression history will appear here</p>
            <a href="/compress" style={{ textDecoration: 'none' }}>
              <button className="btn btn-primary">
                <Zap size={18} />
                Compress Something
              </button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// Need to import Zap for the empty state button
import { Zap } from 'lucide-react';