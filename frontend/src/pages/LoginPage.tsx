/** Login page with OIDC and demo mode */

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Zap, Github, Key, AlertCircle, CheckCircle } from 'lucide-react';

export function LoginPage() {
  const { login, demoLogin, isLoading: authLoading } = useAuth();
  const { error: toastError } = useToast();
  const [isDemoLogin, setIsDemoLogin] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [oidcLoading, setOidcLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUri = `${window.location.origin}/callback`;

  const handleOidcLogin = async () => {
    setError(null);
    setOidcLoading(true);
    try {
      await login(redirectUri);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    } finally {
      setOidcLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setDemoLoading(true);
    try {
      await demoLogin('demo', 'demo');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Demo login failed';
      setError(message);
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)', padding: '2rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Zap size={48} style={{ color: 'var(--color-primary)', marginBottom: '1rem' }} />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Cobalt Hub</h1>
          <p style={{ color: 'var(--color-text-muted)' }}>Compress Before You Prompt</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={handleOidcLogin}
            disabled={oidcLoading || authLoading}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {oidcLoading ? <div className="loading-spinner" /> : <Key size={18} />}
            {oidcLoading ? 'Redirecting...' : 'Sign in with Keycloak'}
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
            Secure OIDC authentication with PKCE
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <button
            onClick={handleDemoLogin}
            disabled={demoLoading || authLoading}
            className="btn btn-outline"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {demoLoading ? <div className="loading-spinner" /> : <CheckCircle size={18} />}
            {demoLoading ? 'Signing in...' : 'Demo Mode (Local Only)'}
          </button>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '0.5rem' }}>
            No Keycloak required &mdash; binds to localhost only
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Cobalt Hub reduces token usage by 20-95% for coding agents.
          </p>
          <a href="https://github.com/headroomlabs-ai/headroom" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem' }}>
            <Github size={16} />
            Reference: headroomlabs-ai/headroom
          </a>
        </div>
      </div>
    </div>
  );
}