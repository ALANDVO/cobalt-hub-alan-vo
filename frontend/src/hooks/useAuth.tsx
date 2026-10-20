/** Authentication state management */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserInfo, TokenResponse } from '../types/api';
import { apiClient } from '../api/client';

interface AuthState {
  user: UserInfo | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAuth: (tokens: TokenResponse, user: UserInfo) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  checkAuth: () => Promise<void>;
  login: (redirectUri: string) => Promise<string>;
  handleCallback: (code: string, codeVerifier: string, redirectUri: string) => Promise<void>;
  demoLogin: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setAuth: (tokens: TokenResponse, user: UserInfo) => {
        apiClient.setToken(tokens.access_token);
        set({
          user,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token ?? null,
          isAuthenticated: true,
          error: null,
        });
      },

      clearAuth: () => {
        apiClient.clearToken();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      setError: (error: string | null) => set({ error }),

      checkAuth: async () => {
        const { accessToken } = get();
        if (!accessToken) {
          set({ isAuthenticated: false, isLoading: false });
          return;
        }

        set({ isLoading: true });
        try {
          const user = await apiClient.getUserInfo();
          set({ user, isAuthenticated: true, isLoading: false, error: null });
        } catch {
          get().clearAuth();
          set({ isLoading: false });
        }
      },

      login: async (redirectUri: string) => {
        const authUrlResponse = await apiClient.getAuthUrl(redirectUri);
        // Store PKCE verifier and state in sessionStorage for callback
        sessionStorage.setItem('pkce_verifier', authUrlResponse.code_verifier);
        sessionStorage.setItem('pkce_state', authUrlResponse.state);
        sessionStorage.setItem('pkce_nonce', authUrlResponse.nonce);
        return authUrlResponse.auth_url;
      },

      handleCallback: async (code: string, codeVerifier: string, redirectUri: string) => {
        set({ isLoading: true, error: null });
        try {
          const tokens = await apiClient.exchangeCode({ code, code_verifier: codeVerifier, redirect_uri: redirectUri });
          const user = await apiClient.getUserInfo();
          get().setAuth(tokens, user);
          // Clear PKCE values
          sessionStorage.removeItem('pkce_verifier');
          sessionStorage.removeItem('pkce_state');
          sessionStorage.removeItem('pkce_nonce');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Authentication failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      demoLogin: async (username: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const tokens = await apiClient.demoLogin(username, password);
          const user = await apiClient.getUserInfo();
          get().setAuth(tokens, user);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Demo login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { accessToken } = get();
        if (accessToken) {
          try {
            await apiClient.logout();
          } catch {
            // Ignore logout errors
          }
        }
        get().clearAuth();
      },
    }),
    {
      name: 'cobalt-hub-auth',
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage, not localStorage
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/** React hook for auth provider */
import { useEffect, createContext, useContext, ReactNode } from 'react';

interface AuthContextType {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (redirectUri: string) => Promise<void>;
  demoLogin: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading, error, login, demoLogin, logout, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogin = async (redirectUri: string) => {
    const authUrl = await login(redirectUri);
    window.location.href = authUrl;
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, error, login: handleLogin, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}