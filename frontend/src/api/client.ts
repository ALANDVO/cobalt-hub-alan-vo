/** Typed API client for Cobalt Hub backend */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  CompressionRequest,
  CompressionResponse,
  TokenEstimateRequest,
  TokenEstimateResponse,
  CompressionHistoryResponse,
  CompressionHistoryItem,
  ContentType,
  CompressionAlgorithm,
  AuthUrlResponse,
  TokenExchangeRequest,
  TokenResponse,
  UserInfo,
  LogoutResponse,
  HealthResponse,
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Request interceptor to add auth header
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.clearToken();
          // Could trigger logout flow here
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string | null) {
    this.accessToken = token;
  }

  getToken(): string | null {
    return this.accessToken;
  }

  clearToken() {
    this.accessToken = null;
  }

  // Health
  async health(): Promise<HealthResponse> {
    const response = await this.client.get<HealthResponse>('/health');
    return response.data;
  }

  // Authentication
  async getAuthUrl(redirectUri: string): Promise<AuthUrlResponse> {
    const response = await this.client.get<AuthUrlResponse>('/auth/login', {
      params: { redirect_uri: redirectUri },
    });
    return response.data;
  }

  async exchangeCode(request: TokenExchangeRequest): Promise<TokenResponse> {
    const response = await this.client.post<TokenResponse>('/auth/callback', request);
    return response.data;
  }

  async demoLogin(username: string, password: string): Promise<TokenResponse> {
    const response = await this.client.post<TokenResponse>('/auth/demo-login', { username, password });
    return response.data;
  }

  async getUserInfo(): Promise<UserInfo> {
    const response = await this.client.get<UserInfo>('/auth/me');
    return response.data;
  }

  async logout(): Promise<LogoutResponse> {
    const response = await this.client.post<LogoutResponse>('/auth/logout');
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await this.client.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  }

  // Compression
  async compress(request: CompressionRequest): Promise<CompressionResponse> {
    const response = await this.client.post<CompressionResponse>('/compress/compress', request);
    return response.data;
  }

  async estimateTokens(request: TokenEstimateRequest): Promise<TokenEstimateResponse> {
    const response = await this.client.post<TokenEstimateResponse>('/compress/estimate', request);
    return response.data;
  }

  async getHistory(
    page: number = 1,
    pageSize: number = 20,
    contentType?: ContentType,
    algorithm?: CompressionAlgorithm
  ): Promise<CompressionHistoryResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (contentType) params.append('content_type', contentType);
    if (algorithm) params.append('algorithm', algorithm);

    const response = await this.client.get<CompressionHistoryResponse>(`/compress/history?${params}`);
    return response.data;
  }

  async deleteHistoryItem(itemId: number): Promise<void> {
    await this.client.delete(`/compress/history/${itemId}`);
  }

  async clearHistory(): Promise<{ message: string }> {
    const response = await this.client.delete<{ message: string }>('/compress/history');
    return response.data;
  }
}

export const apiClient = new ApiClient();