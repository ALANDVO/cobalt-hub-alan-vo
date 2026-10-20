/** Settings page */

import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { User, Key, Shield, Database, Bell, Save, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function SettingsPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    theme: 'system',
    autoCompress: false,
    defaultAlgorithm: 'balanced',
    defaultContentType: 'text',
    notifications: true,
    compactMode: false,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      // In a real app, this would call an API
      await new Promise(resolve => setTimeout(resolve, 500));
      success('Settings saved', 'Your preferences have been updated');
    } catch {
      toastError('Save failed', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>Settings</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>Manage your preferences and account settings</p>

      {/* Profile Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={20} />
          Profile
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontSize: '1.5rem', fontWeight: 700 }}>
            {(user?.username || user?.email || 'U')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{user?.username || 'User'}</div>
            <div style={{ color: 'var(--color-text-muted)' }}>{user?.email || 'No email'}</div>
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
              {user?.roles?.map((role) => (
                <span key={role} className="badge badge-secondary" style={{ fontSize: '0.6875rem' }}>{role}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={20} />
          Compression Preferences
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
          <div>
            <label className="form-label">Default Algorithm</label>
            <select
              value={settings.defaultAlgorithm}
              onChange={(e) => setSettings({ ...settings, defaultAlgorithm: e.target.value })}
              className="form-select"
            >
              <option value="conservative">Conservative (trim whitespace)</option>
              <option value="balanced">Balanced (type-aware)</option>
              <option value="aggressive">Aggressive (all transforms)</option>
              <option value="trim_whitespace">Trim Whitespace</option>
              <option value="remove_comments">Remove Comments</option>
              <option value="minify_json">Minify JSON</option>
              <option value="minify_code">Minify Code</option>
              <option value="log_summarize">Log Summarize</option>
              <option value="deduplicate">Deduplicate</option>
              <option value="semantic_merge">Semantic Merge</option>
            </select>
          </div>

          <div>
            <label className="form-label">Default Content Type</label>
            <select
              value={settings.defaultContentType}
              onChange={(e) => setSettings({ ...settings, defaultContentType: e.target.value })}
              className="form-select"
            >
              <option value="text">Plain Text</option>
              <option value="json">JSON</option>
              <option value="code">Source Code</option>
              <option value="log">Logs</option>
              <option value="markdown">Markdown</option>
              <option value="yaml">YAML</option>
            </select>
          </div>

          <div>
            <label className="form-label">Theme</label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
              className="form-select"
            >
              <option value="system">System Default</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.autoCompress}
              onChange={(e) => setSettings({ ...settings, autoCompress: e.target.checked })}
            />
            <span>Auto-compress on paste</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.compactMode}
              onChange={(e) => setSettings({ ...settings, compactMode: e.target.checked })}
            />
            <span>Compact mode</span>
          </label>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={20} />
          Notifications
        </h2>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={settings.notifications}
            onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
          />
          <span>Show toast notifications for compression results</span>
        </label>
      </div>

      {/* Account Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Key size={20} />
          Account
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--color-background)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontWeight: 500 }}>Authentication Method</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>OIDC / Keycloak</div>
            </div>
            <span className="badge badge-success">Connected</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--color-background)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontWeight: 500 }}>User ID</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{user?.sub || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? <Loader2 size={18} className="loading-spinner" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}