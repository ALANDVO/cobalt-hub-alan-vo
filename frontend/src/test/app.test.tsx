/** Frontend tests */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuthStore } from '../hooks/useAuth';
import { useCompression } from '../hooks/useCompression';
import { useToastStore } from '../hooks/useToast';
import CompressionPage from '../pages/CompressionPage';
import DashboardPage from '../pages/DashboardPage';

// Mock apiClient
vi.mock('../api/client', () => ({
  apiClient: {
    compress: vi.fn(),
    estimateTokens: vi.fn(),
    getHistory: vi.fn(),
    deleteHistoryItem: vi.fn(),
    clearHistory: vi.fn(),
    getAuthUrl: vi.fn(),
    exchangeCode: vi.fn(),
    demoLogin: vi.fn(),
    getUserInfo: vi.fn(),
    logout: vi.fn(),
    health: vi.fn(),
  },
}));

import { apiClient } from '../api/client';

// Test wrapper with providers
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('Auth Hook', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('initializes with unauthenticated state', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('sets auth state on login', () => {
    const { result } = renderHook(() => useAuthStore());
    const mockTokens = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'test-refresh-token',
    };
    const mockUser = { sub: 'user-1', email: 'test@example.com', username: 'testuser', roles: ['viewer'] };

    act(() => {
      result.current.setAuth(mockTokens, mockUser);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.accessToken).toBe('test-access-token');
  });

  it('clears auth state on logout', () => {
    const { result } = renderHook(() => useAuthStore());
    const mockTokens = {
      access_token: 'test-access-token',
      token_type: 'Bearer',
      expires_in: 3600,
    };
    const mockUser = { sub: 'user-1', email: 'test@example.com', username: 'testuser', roles: ['viewer'] };

    act(() => {
      result.current.setAuth(mockTokens, mockUser);
      result.current.clearAuth();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
  });
});

describe('Compression Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('compresses content successfully', async () => {
    const mockResponse = {
      original_content: 'test',
      compressed_content: 'test',
      original_tokens: 10,
      compressed_tokens: 5,
      compression_ratio: 0.5,
      tokens_saved: 5,
      reduction_percentage: 50,
      algorithm_used: 'balanced',
      content_type: 'text',
      processing_time_ms: 1.0,
    };
    apiClient.compress.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useCompression());
    const request = {
      content: 'test content',
      content_type: 'text' as const,
      algorithm: 'balanced' as const,
      preserve_structure: true,
    };

    const response = await act(async () => {
      return await result.current.compress(request);
    });

    expect(response).toEqual(mockResponse);
    expect(apiClient.compress).toHaveBeenCalledWith(request);
  });

  it('handles compression error', async () => {
    apiClient.compress.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useCompression());
    const request = {
      content: 'test',
      content_type: 'text' as const,
      algorithm: 'balanced' as const,
      preserve_structure: true,
    };

    const response = await act(async () => {
      return await result.current.compress(request);
    });

    expect(response).toBeNull();
  });
});

describe('Toast Hook', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('adds and removes toasts', () => {
    const { result } = renderHook(() => useToastStore());
    const id = act(() => result.current.addToast({ type: 'success', title: 'Test' }));
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Test');

    act(() => result.current.removeToast(id));
    expect(result.current.toasts).toHaveLength(0);
  });

  it('useToast provides convenience methods', () => {
    const { result } = renderHook(() => useToast());
    act(() => result.current.success('Success!'));
    const store = useToastStore.getState();
    expect(store.toasts).toHaveLength(1);
    expect(store.toasts[0].type).toBe('success');
  });
});

// Need to import renderHook and act
import { renderHook, act } from '@testing-library/react';