/** OIDC callback page */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Zap, Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

export function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useAuth();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    const storedState = sessionStorage.getItem('pkce_state');
    const codeVerifier = sessionStorage.getItem('pkce_verifier');

    if (errorParam) {
      setError(errorDescription || errorParam);
      setStatus('error');
      return;
    }

    if (!code || !state || !codeVerifier) {
      setError('Missing authorization code or PKCE verifier');
      setStatus('error');
      return;
    }

    if (state !== storedState) {
      setError('Invalid state parameter - possible CSRF attack');
      setStatus('error');
      return;
    }

    const processCallback = async () => {
      try {
        await handleCallback(code, codeVerifier, `${window.location.origin}/callback`);
        setStatus('success');
        // Redirect to dashboard after brief success display
        setTimeout(() => navigate('/', { replace: true }), 1500);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Callback processing failed';
        setError(message);
        setStatus('error');
      }
    };

    processCallback();
  }, [searchParams, handleCallback, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)', padding: '2rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        <Zap size={48} style={{ color: 'var(--color-primary)', marginBottom: '1.5rem' }} />

        {status === 'pending' && (
          <>
            <div className="loading-spinner" style={{ width: '3rem', height: '3rem', borderWidth: '3px', margin: '0 auto 1.5rem' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Completing Sign In</h2>
            <p style={{ color: 'var(--color-text-muted)' }}>Please wait while we authenticate you...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ color: 'var(--color-success)', marginBottom: '1rem' }}>
              <CheckCircle size={48} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Welcome Back!</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Redirecting to dashboard...</p>
            <div className="loading-spinner" style={{ margin: '0 auto' }} />
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ color: 'var(--color-danger)', marginBottom: '1rem' }}>
              <AlertCircle size={48} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Authentication Failed</h2>
            {error && <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>{error}</p>}
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="btn btn-primary"
            >
              <ArrowRight size={18} />
              Return to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}