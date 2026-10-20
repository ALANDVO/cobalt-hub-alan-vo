/** Dashboard page with stats and quick actions */

import { useAuth } from '../hooks/useAuth';
import { useCompression } from '../hooks/useCompression';
import { Zap, TrendingUp, Clock, FileText, ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const { user } = useAuth();
  const { lastResult, isCompressing } = useCompression();

  const stats = [
    {
      label: 'Last Compression',
      value: lastResult ? `${lastResult.reduction_percentage.toFixed(1)}%` : '—',
      icon: TrendingUp,
      color: 'var(--color-success)',
    },
    {
      label: 'Tokens Saved',
      value: lastResult ? lastResult.tokens_saved.toLocaleString() : '—',
      icon: Zap,
      color: 'var(--color-primary)',
    },
    {
      label: 'Processing Time',
      value: lastResult ? `${lastResult.processing_time_ms.toFixed(1)}ms` : '—',
      icon: Clock,
      color: 'var(--color-warning)',
    },
    {
      label: 'Algorithm Used',
      value: lastResult ? lastResult.algorithm_used.replace('_', ' ') : '—',
      icon: FileText,
      color: 'var(--color-secondary)',
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Welcome back, {user?.username || user?.email || 'User'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)' }}>
          Compress tool outputs, logs, and RAG chunks before sending to LLMs.
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <stat.icon size={20} style={{ color: stat.color }} />
            </div>
            <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <Link to="/compress" className="btn btn-primary" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem', padding: '1.25rem', textDecoration: 'none' }}>
            <Zap size={24} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>Compress Content</div>
              <div style={{ fontSize: '0.8125rem', opacity: 0.8 }}>Reduce tokens by 20-95%</div>
            </div>
            <ArrowRight size={20} style={{ marginLeft: 'auto', marginTop: 'auto' }} />
          </Link>

          <Link to="/history" className="btn btn-outline" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem', padding: '1.25rem', textDecoration: 'none' }}>
            <FileText size={24} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>View History</div>
              <div style={{ fontSize: '0.8125rem', opacity: 0.8 }}>Past compressions</div>
            </div>
            <ArrowRight size={20} style={{ marginLeft: 'auto', marginTop: 'auto' }} />
          </Link>

          <Link to="/settings" className="btn btn-outline" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem', padding: '1.25rem', textDecoration: 'none' }}>
            <ExternalLink size={24} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem' }}>Settings</div>
              <div style={{ fontSize: '0.8125rem', opacity: 0.8 }}>Configure preferences</div>
            </div>
            <ArrowRight size={20} style={{ marginLeft: 'auto', marginTop: 'auto' }} />
          </Link>
        </div>
      </div>

      {/* Last Compression Detail */}
      {lastResult && (
        <div className="card">
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Last Compression Result</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div className="stat-label">Original Tokens</div>
              <div className="stat-value">{lastResult.original_tokens.toLocaleString()}</div>
            </div>
            <div>
              <div className="stat-label">Compressed Tokens</div>
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>{lastResult.compressed_tokens.toLocaleString()}</div>
            </div>
            <div>
              <div className="stat-label">Reduction</div>
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>{lastResult.reduction_percentage.toFixed(1)}%</div>
            </div>
            <div>
              <div className="stat-label">Ratio</div>
              <div className="stat-value">{lastResult.compression_ratio.toFixed(2)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className={`badge badge-${lastResult.content_type === 'json' ? 'primary' : lastResult.content_type === 'code' ? 'success' : 'secondary'}`}>
              {lastResult.content_type}
            </span>
            <span className="badge badge-secondary">{lastResult.algorithm_used}</span>
          </div>
          <Link to="/compress" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            <ArrowRight size={16} />
            Compress More
          </Link>
        </div>
      )}

      {!lastResult && (
        <div className="card empty-state">
          <Zap className="empty-state-icon" />
          <h3 style={{ marginBottom: '0.5rem' }}>No compressions yet</h3>
          <p style={{ marginBottom: '1.5rem' }}>Start by compressing your first piece of content</p>
          <Link to="/compress" className="btn btn-primary">
            <Zap size={18} />
            Compress Content
          </Link>
        </div>
      )}
    </div>
  );
}